import { prisma } from '../../utils/prisma';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { isSaasScenario, getDeployScenario } from '../../utils/deployScenario';

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
const PRODUCT_ID = 'platform-absenta';

export interface LicenseInfo {
  success: boolean;
  message: string;
  token?: string;
  school_name?: string;
  expires_at?: string;
  is_active?: boolean;
}

export class LicenseService {
  private static cachedToken: string | null = null;
  private static cachedDecoded: any = null;
  private static cachedPublicKey: string | null = null;

  /**
   * Menghasilkan fingerprint unik untuk mesin ini guna mencegah duplikasi folder aplikasi (piracy)
   */
  static getMachineFingerprint(): string {
    const interfaces = os.networkInterfaces();
    let macs = '';

    // Kumpulkan semua MAC Address non-internal
    for (const name of Object.keys(interfaces)) {
      const networkInterface = interfaces[name];
      if (networkInterface) {
        for (const net of networkInterface) {
          if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
            macs += net.mac;
          }
        }
      }
    }

    // Jika tidak ada MAC (misal di container tertentu), gunakan hostname + platform + arch sebagai fallback
    const rawId = `${os.hostname()}-${os.platform()}-${os.arch()}-${macs}`;
    return crypto.createHash('sha1').update(rawId).digest('hex').slice(0, 16);
  }

  /**
   * Mengambil dan memverifikasi public key dari Server Lisensi
   */
  private static async getPublicKey(): Promise<string | null> {
    if (this.cachedPublicKey) return this.cachedPublicKey;

    const SYSTEM_TENANT_ID = 'system';
    const pubKeyConfig = await prisma.config.findFirst({
      where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_public_key' }
    }).catch(() => null);

    if (pubKeyConfig?.value) {
      this.cachedPublicKey = pubKeyConfig.value;
    }

    try {
      const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/public-key`, { timeout: 5000 });
      if (response.data?.success && response.data?.public_key) {
        const key = response.data.public_key;
        this.cachedPublicKey = key;

        // Simpan cache ke DB
        if (pubKeyConfig) {
          await prisma.config.update({ where: { id: pubKeyConfig.id }, data: { value: key } }).catch(() => {});
        } else {
          await prisma.config.create({ data: { tenant_id: SYSTEM_TENANT_ID, key: 'license_public_key', value: key } }).catch(() => {});
        }
        return key;
      }
    } catch {
      // Offline fallback: gunakan cached key dari DB
    }

    return this.cachedPublicKey;
  }

  /**
   * Melakukan verifikasi token JWT menggunakan Public Key RS256
   */
  private static async verifyToken(token: string): Promise<any | null> {
    try {
      const pubKey = await this.getPublicKey();
      if (pubKey) {
        return jwt.verify(token, pubKey, { algorithms: ['RS256'] });
      }
      return jwt.decode(token);
    } catch (err: any) {
      console.warn('[License] Verifikasi kriptografi token gagal:', err.message);
      return null;
    }
  }

  /**
   * Melakukan sinkronisasi lisensi ke server pusat
   */
  static async syncLicense(): Promise<LicenseInfo> {
    const scenario = getDeployScenario();

    // Skenario SaaS (saas-public & saas-local): Server adalah host platform pusat
    if (isSaasScenario()) {
      console.log(`[License] ☁️ Mode SaaS (${scenario.toUpperCase()}) aktif. Pengecekan hardware lock server dilewati.`);
      return {
        success: true,
        message: `Platform beroperasi dalam mode multi-tenant (${scenario}).`,
        is_active: true
      };
    }

    // Skenario onpremise: Wajib memiliki LICENSE_KEY dan terkunci ke hardware mesin
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      console.warn('[License] ⚠️ Kunci lisensi (LICENSE_KEY) tidak ditemukan di .env untuk mode onpremise.');
      return {
        success: false,
        message: 'Kunci lisensi (LICENSE_KEY) wajib diisi untuk instalasi onpremise.',
        is_active: false
      };
    }

    const fingerprint = this.getMachineFingerprint();
    const deviceId = `server-${fingerprint}`;

    try {
      console.log(`[License] Menghubungi server lisensi untuk aktivasi onpremise (Device: ${deviceId})...`);
      const response = await axios.post(`${LICENSE_SERVER_URL}/api/license/activate`, {
        license_key: licenseKey.trim(),
        device_id: deviceId,
        product_id: PRODUCT_ID
      }, { timeout: 10000 });

      const result = response.data;

      if (result.success && result.token) {
        const decoded = await this.verifyToken(result.token);
        this.cachedToken = result.token;
        this.cachedDecoded = decoded || jwt.decode(result.token);

        console.log(`[License] ✅ Lisensi aktif untuk: ${result.school_name || 'Instansi Sekolah'}`);
        console.log(`[License] 📅 Berlaku hingga: ${result.expires_at || 'Selamanya'}`);

        // Cache token dan tanggal sinkronisasi terakhir ke database lokal
        try {
          const tokenKey = 'license_cached_token';
          const syncKey = 'license_last_synced';
          const SYSTEM_TENANT_ID = 'system';

          const existingToken = await prisma.config.findFirst({ where: { tenant_id: SYSTEM_TENANT_ID, key: tokenKey } });
          if (existingToken) {
            await prisma.config.update({ where: { id: existingToken.id }, data: { value: result.token } });
          } else {
            await prisma.config.create({ data: { tenant_id: SYSTEM_TENANT_ID, key: tokenKey, value: result.token } }).catch(() => {});
          }

          const existingSync = await prisma.config.findFirst({ where: { tenant_id: SYSTEM_TENANT_ID, key: syncKey } });
          if (existingSync) {
            await prisma.config.update({ where: { id: existingSync.id }, data: { value: new Date().toISOString() } });
          } else {
            await prisma.config.create({ data: { tenant_id: SYSTEM_TENANT_ID, key: syncKey, value: new Date().toISOString() } }).catch(() => {});
          }
        } catch (dbErr: any) {
          console.warn('[License] Gagal menyimpan cache lisensi ke database:', dbErr.message);
        }

        return {
          success: true,
          message: 'Lisensi berhasil diverifikasi.',
          token: result.token,
          school_name: result.school_name,
          expires_at: result.expires_at,
          is_active: true
        };
      }

      if (result.message && result.message.toLowerCase().includes('belum disetujui')) {
        console.log(`[License] ⏳ Lisensi ditemukan tetapi MENUNGGU PERSETUJUAN admin.`);
        return {
          success: false,
          message: 'Lisensi Anda sedang menunggu persetujuan administrator. Fitur premium akan aktif setelah disetujui.',
          is_active: false
        };
      }

      return {
        success: false,
        message: result.message || 'Gagal mengaktifkan lisensi.',
        is_active: false
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      console.warn(`[License] ⚠️ Koneksi ke server lisensi gagal (${msg}). Mencoba Grace Period offline 7 hari...`);

      // Offline Grace Period Fallback (7 Hari)
      try {
        const SYSTEM_TENANT_ID = 'system';
        const cachedTokenConfig = await prisma.config.findFirst({
          where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_cached_token' }
        });
        const lastSyncedConfig = await prisma.config.findFirst({
          where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_last_synced' }
        });

        if (cachedTokenConfig?.value && lastSyncedConfig?.value) {
          const lastSynced = new Date(lastSyncedConfig.value);
          const daysSinceLastSync = (new Date().getTime() - lastSynced.getTime()) / (24 * 60 * 60 * 1000);

          if (daysSinceLastSync <= 7) {
            const decoded = await this.verifyToken(cachedTokenConfig.value);
            this.cachedToken = cachedTokenConfig.value;
            this.cachedDecoded = decoded || jwt.decode(cachedTokenConfig.value);

            const remainingDays = Math.ceil(7 - daysSinceLastSync);
            console.log(`[License] ⚠️ Offline Fallback aktif. Menggunakan cache lisensi lokal (${remainingDays} hari masa tenggang tersisa).`);

            return {
              success: true,
              message: `Mode offline aktif. Menggunakan cache lisensi (${remainingDays} hari masa tenggang tersisa).`,
              token: cachedTokenConfig.value,
              school_name: this.cachedDecoded?.school_name,
              expires_at: this.cachedDecoded?.expires_at,
              is_active: true
            };
          } else {
            console.error('[License] ❌ Masa tenggang offline (7 hari) telah berakhir. Lisensi server onpremise kedaluwarsa.');
            return {
              success: false,
              message: 'Masa tenggang offline (7 hari) telah berakhir. Harap hubungkan server ke internet atau perbarui lisensi.',
              is_active: false
            };
          }
        }
      } catch (dbErr: any) {
        console.error('[License] Gagal membaca cache offline dari database:', dbErr.message);
      }

      return {
        success: false,
        message: `Koneksi ke server lisensi gagal dan tidak ada cache lokal: ${msg}`,
        is_active: false
      };
    }
  }

  /**
   * Mengecek apakah lisensi saat ini valid (bisa dipanggil di middleware atau guard)
   */
  static isLicenseValid(): boolean {
    if (isSaasScenario()) {
      return true;
    }

    if (process.env.NODE_ENV !== 'production' && process.env.LICENSE_FORCE_ENFORCE !== 'true') {
      return true;
    }

    if (!this.cachedToken || !this.cachedDecoded) return false;

    const today = new Date().toISOString().slice(0, 10);
    if (this.cachedDecoded.expires_at && this.cachedDecoded.expires_at < today) {
      return false;
    }

    return true;
  }

  static getSchoolName(): string {
    return this.cachedDecoded?.school_name || 'Absenta Tenant';
  }

  /**
   * Memuat token lisensi dari cache DB lokal tanpa hit API license server.
   * Digunakan oleh non-master instance agar tidak duplikasi API call.
   */
  static async loadFromCache(): Promise<void> {
    if (isSaasScenario()) return;

    try {
      const SYSTEM_TENANT_ID = 'system';
      const cachedTokenConfig = await prisma.config.findFirst({
        where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_cached_token' }
      });
      if (cachedTokenConfig?.value) {
        this.cachedToken = cachedTokenConfig.value;
        const decoded = await this.verifyToken(cachedTokenConfig.value);
        this.cachedDecoded = decoded || jwt.decode(cachedTokenConfig.value);
      }
    } catch {
      // Gagal load cache
    }
  }
}
