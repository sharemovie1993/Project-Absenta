import { prisma } from '../../utils/prisma';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';

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

    // Jika tidak ada MAC (misal di container tertentu), gunakan hostname + arch sebagai fallback
    const rawId = `${os.hostname()}-${os.platform()}-${os.arch()}-${macs}`;
    return crypto.createHash('sha1').update(rawId).digest('hex').slice(0, 16);
  }

  /**
   * Melakukan sinkronisasi lisensi ke server pusat
   */
  static async syncLicense(): Promise<LicenseInfo> {
    const licenseKey = process.env.LICENSE_KEY;
    
    if (!licenseKey) {
      return { 
        success: false, 
        message: 'Kunci lisensi (LICENSE_KEY) tidak ditemukan di .env. Aplikasi berjalan dalam mode terbatas.' 
      };
    }

    const fingerprint = this.getMachineFingerprint();
    const deviceId = `server-${fingerprint}`;

    try {
      console.log(`[License] Menghubungi server lisensi untuk aktivasi...`);
      const response = await axios.post(`${LICENSE_SERVER_URL}/api/license/activate`, {
        license_key: licenseKey.trim(),
        device_id: deviceId,
        product_id: PRODUCT_ID
      }, { timeout: 10000 });

      const result = response.data;

      if (result.success && result.token) {
        this.cachedToken = result.token;
        this.cachedDecoded = jwt.decode(result.token);
        
        console.log(`[License] ✅ Lisensi aktif untuk: ${result.school_name || 'Instansi'}`);
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
        message: result.message || 'Gagal mengaktifkan lisensi.' 
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      console.warn(`[License] ⚠️ Koneksi ke server lisensi gagal: ${msg}. Mencoba Grace Period offline...`);
      
      // Offline Grace Period Fallback (7 Hari)
      try {
        const SYSTEM_TENANT_ID = 'system';
        const cachedTokenConfig = await prisma.config.findFirst({
          where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_cached_token' }
        });
        const lastSyncedConfig = await prisma.config.findFirst({
          where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_last_synced' }
        });

        if (cachedTokenConfig && cachedTokenConfig.value && lastSyncedConfig && lastSyncedConfig.value) {
          const lastSynced = new Date(lastSyncedConfig.value);
          const daysSinceLastSync = (new Date().getTime() - lastSynced.getTime()) / (24 * 60 * 60 * 1000);
          
          if (daysSinceLastSync <= 7) {
            this.cachedToken = cachedTokenConfig.value;
            this.cachedDecoded = jwt.decode(cachedTokenConfig.value);
            
            const remainingDays = Math.ceil(7 - daysSinceLastSync);
            console.log(`[License] ⚠️ Offline Fallback aktif. Menggunakan cache lisensi lokal (${remainingDays} hari tersisa).`);
            
            return {
              success: true,
              message: `Mode offline aktif. Menggunakan cache lisensi (${remainingDays} hari masa tenggang tersisa).`,
              token: cachedTokenConfig.value,
              school_name: this.cachedDecoded?.school_name,
              expires_at: this.cachedDecoded?.expires_at,
              is_active: true
            };
          } else {
            console.error('[License] ❌ Masa tenggang offline (7 hari) telah berakhir. Lisensi dinonaktifkan.');
            return {
              success: false,
              message: 'Masa tenggang offline (7 hari) telah berakhir. Harap sambungkan server ke internet.',
              is_active: false
            };
          }
        }
      } catch (dbErr: any) {
        console.error('[License] Gagal membaca cache offline dari database:', dbErr.message);
      }

      return { 
        success: false, 
        message: `Koneksi ke server lisensi gagal dan tidak ada cache lokal: ${msg}` 
      };
    }
  }

  /**
   * Mengecek apakah lisensi saat ini valid (bisa dipanggil di middleware atau guard)
   */
  static isLicenseValid(): boolean {
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
    try {
      const SYSTEM_TENANT_ID = 'system';
      const cachedTokenConfig = await prisma.config.findFirst({
        where: { tenant_id: SYSTEM_TENANT_ID, key: 'license_cached_token' }
      });
      if (cachedTokenConfig?.value) {
        this.cachedToken = cachedTokenConfig.value;
        this.cachedDecoded = jwt.decode(cachedTokenConfig.value);
      }
    } catch {
      // Gagal load cache — instance akan berjalan tanpa token lokal (master tetap valid)
    }
  }
}
