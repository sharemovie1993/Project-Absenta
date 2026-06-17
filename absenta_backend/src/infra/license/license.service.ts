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
        // Decode tanpa verifikasi signature dulu untuk ambil info (verifikasi signature butuh public key)
        this.cachedDecoded = jwt.decode(result.token);
        
        console.log(`[License] ✅ Lisensi aktif untuk: ${result.school_name || 'Instansi'}`);
        console.log(`[License] 📅 Berlaku hingga: ${result.expires_at || 'Selamanya'}`);
        
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
      console.error(`[License] ❌ Gagal sinkronisasi lisensi: ${msg}`);
      
      // Fallback: Jika server offline, coba gunakan cached token jika ada di DB/File
      // Untuk saat ini kita return error agar user tahu server lisensi harus bisa dijangkau saat startup pertama
      return { 
        success: false, 
        message: `Koneksi ke server lisensi gagal: ${msg}` 
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
}
