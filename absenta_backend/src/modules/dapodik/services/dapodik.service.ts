import os from 'os';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { prisma } from '@/utils/prisma';
import { storageService } from '@/infra/storage/storage.service';
import { createSiswaCommand } from '@/modules/academic/siswa/services/commands/create-siswa.command';

export interface ServerNetworkInfo {
  primaryIp: string;
  allIps: { address: string; family: string; interface: string; isInternal: boolean }[];
  port: number;
}

export interface DapodikConfigDto {
  dapodik_host: string;
  npsn: string;
  api_token: string;
  is_active?: boolean;
}

export interface StudentDiffItem {
  field: string;
  label: string;
  dapodikValue: any;
  absentaValue: any;
}

export interface CompareOptions {
  checkNama?: boolean;
  checkNis?: boolean;
  checkNisn?: boolean;
  checkNik?: boolean;
  checkKelas?: boolean;
  checkJenisKelamin?: boolean;
  checkTanggalLahir?: boolean;
  checkTempatLahir?: boolean;
  ignoreClassWhitespace?: boolean;
  onlyActiveStudents?: boolean;
}

export type StudentReconciliationStatus = 'MATCH' | 'MISMATCH' | 'DAPODIK_ONLY' | 'ABSENTA_ONLY';

export interface ReconciledStudent {
  id: string; // Absenta ID or Dapodik peserta_didik_id
  nisn: string;
  nik: string | null;
  nis: string | null;
  nama: string;
  jenis_kelamin: string;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  rombel?: string | null;
  status: StudentReconciliationStatus;
  diffs: StudentDiffItem[];
  dapodikRaw?: any;
  absentaRaw?: any;
}

export interface StagingStorageMeta {
  exists: boolean;
  savedAt: string | null;
  totalStudents: number;
  npsn: string | null;
  host: string | null;
  fileSizeBytes: number;
  storageDriver?: 's3' | 'local';
  storageKey?: string;
}

export interface ReconciliationReport {
  summary: {
    totalDapodik: number;
    totalAbsenta: number;
    matchCount: number;
    mismatchCount: number;
    dapodikOnlyCount: number;
    absentaOnlyCount: number;
  };
  academicContext?: {
    tahunPelajaran?: { id: string; tahun: string } | null;
    semester?: { id: string; nama_semester: string } | null;
  };
  lastCheckAt: string;
  cacheInfo: {
    isFromCache: boolean;
    cachedAt: string;
    totalCached: number;
    sourceMode: 'LIVE' | 'STAGING';
    fallbackReason?: string;
  };
  stagingMeta?: StagingStorageMeta;
  students: ReconciledStudent[];
}

export class DapodikService {
  /**
   * In-Memory Cache Snapshot Data Dapodik per Tenant.
   * Melindungi Web Service lokal Dapodik dari request berulang yang tidak perlu.
   */
  private static studentCache = new Map<
    string,
    {
      fetchedAt: Date;
      rows: any[];
      npsn: string;
      host: string;
    }
  >();

  /**
   * Key Object Storage (S3/MinIO atau Local Disk sesuai STORAGE_DRIVER) untuk Staging Dapodik per Tenant.
   */
  private static getStagingStorageKey(tenantId: string): string {
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `storage/dapodik/staging_${safeTenant}.json`;
  }

  private static getLegacyLocalStagingPath(key: string): string {
    return path.resolve(process.cwd(), key);
  }

  /**
   * Migrasi otomatis satu kali jika snapshot lama masih berada di disk lokal VPS saat driver aktif adalah S3.
   */
  private static async promoteLegacyLocalStagingIfNeeded(key: string): Promise<void> {
    if (storageService.getDriverName() !== 's3') return;
    const legacyPath = DapodikService.getLegacyLocalStagingPath(key);
    if (!fs.existsSync(legacyPath)) return;

    try {
      const legacyBuffer = await fs.promises.readFile(legacyPath);
      const parsed = JSON.parse(legacyBuffer.toString('utf8'));
      const existingS3Keys = await storageService.listObjects(key);
      let s3Confirmed = existingS3Keys.includes(key);

      if (!s3Confirmed && Array.isArray(parsed?.rows) && parsed.rows.length > 0) {
        await storageService.uploadBuffer(key, legacyBuffer, {
          contentType: 'application/json',
        });
        s3Confirmed = true;
      }

      if (s3Confirmed || (Array.isArray(parsed?.rows) && parsed.rows.length === 0)) {
        await fs.promises.unlink(legacyPath).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[DapodikService] Gagal memigrasikan snapshot staging lokal ke S3:', err?.message || err);
    }
  }

  private static async readStagingPayload(
    tenantId: string
  ): Promise<{ parsed: any; fileSizeBytes: number; key: string } | null> {
    const key = DapodikService.getStagingStorageKey(tenantId);
    await DapodikService.promoteLegacyLocalStagingIfNeeded(key);

    try {
      const buffer = await storageService.readFileBuffer(key);
      const parsed = JSON.parse(buffer.toString('utf8'));
      return { parsed, fileSizeBytes: buffer.length, key };
    } catch {
      return null;
    }
  }

  /**
   * Membaca Metadata Snapshot Staging yang tersimpan di platform (S3/Object Storage atau Local)
   */
  static async getStagingMeta(tenantId: string): Promise<StagingStorageMeta> {
    const key = DapodikService.getStagingStorageKey(tenantId);
    const driver = storageService.getDriverName();
    const loaded = await DapodikService.readStagingPayload(tenantId);

    if (!loaded) {
      return {
        exists: false,
        savedAt: null,
        totalStudents: 0,
        npsn: null,
        host: null,
        fileSizeBytes: 0,
        storageDriver: driver,
        storageKey: key,
      };
    }

    const { parsed, fileSizeBytes } = loaded;
    return {
      exists: true,
      savedAt: parsed.savedAt || null,
      totalStudents: Array.isArray(parsed.rows) ? parsed.rows.length : 0,
      npsn: parsed.npsn || null,
      host: parsed.host || null,
      fileSizeBytes,
      storageDriver: driver,
      storageKey: key,
    };
  }

  /**
   * Menyimpan Snapshot Siswa Dapodik ke Persistent Staging Storage (mengikuti StorageService: S3 / Local)
   */
  static async saveStagingSnapshot(
    tenantId: string,
    rows: any[],
    npsn?: string,
    host?: string
  ): Promise<StagingStorageMeta> {
    const key = DapodikService.getStagingStorageKey(tenantId);
    const savedAt = new Date().toISOString();
    const payload = {
      tenantId,
      npsn: npsn || null,
      host: host || null,
      savedAt,
      totalStudents: rows.length,
      rows,
    };
    const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const uploaded = await storageService.uploadBuffer(key, buffer, {
      contentType: 'application/json',
    });

    return {
      exists: true,
      savedAt,
      totalStudents: rows.length,
      npsn: npsn || null,
      host: host || null,
      fileSizeBytes: uploaded.sizeBytes,
      storageDriver: storageService.getDriverName(),
      storageKey: uploaded.key,
    };
  }

  /**
   * Mengambil Snapshot Siswa Dapodik dari Persistent Staging Storage (mengikuti StorageService: S3 / Local)
   */
  static async loadStagingSnapshot(
    tenantId: string
  ): Promise<{ rows: any[]; savedAt: Date; npsn?: string; host?: string } | null> {
    const loaded = await DapodikService.readStagingPayload(tenantId);
    if (!loaded || !Array.isArray(loaded.parsed?.rows)) {
      return null;
    }

    const { parsed } = loaded;
    return {
      rows: parsed.rows,
      savedAt: parsed.savedAt ? new Date(parsed.savedAt) : new Date(),
      npsn: parsed.npsn,
      host: parsed.host,
    };
  }

  /**
   * Mengosongkan cache in-memory snapshot Dapodik jika dibutuhkan
   */
  static clearCache(tenantId?: string) {
    if (tenantId) {
      DapodikService.studentCache.delete(tenantId);
    } else {
      DapodikService.studentCache.clear();
    }
  }

  /**
   * Menghancurkan metadata dan snapshot staging Dapodik (baik di persistent storage S3/MinIO/Lokal maupun in-memory cache).
   * Digunakan untuk memastikan staging bersih total sebelum penarikan baru.
   */
  static async clearStagingSnapshot(tenantId: string): Promise<boolean> {
    const key = DapodikService.getStagingStorageKey(tenantId);
    // 1. Bersihkan in-memory cache
    DapodikService.clearCache(tenantId);

    // 2. Hapus file persistent snapshot dari storage (S3/MinIO/Lokal)
    try {
      await storageService.delete(key);
    } catch (err: any) {
      console.warn(`[DapodikService] Gagal menghapus storage key ${key}:`, err?.message || err);
    }

    // 3. Hapus legacy local file jika ada
    const legacyPath = DapodikService.getLegacyLocalStagingPath(key);
    if (fs.existsSync(legacyPath)) {
      await fs.promises.unlink(legacyPath).catch(() => {});
    }

    return true;
  }

  /**
   * Mendeteksi alamat IP Server Absenta dari network interface OS host.
   * Digunakan untuk ditampilkan di UI agar operator bisa menyalin dan mendaftarkannya di Dapodik.
   */
  getServerNetworkInfo(): ServerNetworkInfo {
    const interfaces = os.networkInterfaces();
    const allIps: { address: string; family: string; interface: string; isInternal: boolean }[] = [];
    let detectedPrimary = '';

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4') {
          allIps.push({
            address: net.address,
            family: net.family,
            interface: name,
            isInternal: net.internal,
          });

          // Prioritaskan IP privat LAN (10.x.x.x, 192.168.x.x, 172.16-31.x.x) yang non-internal
          if (!net.internal && !detectedPrimary) {
            if (
              net.address.startsWith('10.') ||
              net.address.startsWith('192.168.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address)
            ) {
              detectedPrimary = net.address;
            }
          }
        }
      }
    }

    // Jika environment variable di-set manual (e.g., di docker/reverse proxy), gunakan itu
    const envIp = process.env.SERVER_IP || process.env.ABSENTA_SERVER_IP || process.env.HOST_IP;
    const finalPrimaryIp = envIp || detectedPrimary || (allIps.find((i) => !i.isInternal)?.address) || '10.10.10.116';

    const serverPort = parseInt(process.env.PORT || '3000', 10);

    return {
      primaryIp: finalPrimaryIp,
      allIps,
      port: serverPort,
    };
  }

  /**
   * Mengambil konfigurasi integrasi Dapodik untuk tenant tertentu.
   */
  async getConfig(tenantId: string) {
    let config = await prisma.dapodikConfig.findUnique({
      where: { tenant_id: tenantId },
    });

    // Jika belum ada record config, periksa profil sekolah tenant untuk mengambil default NPSN
    let defaultNpsn = '';
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: { npsn: true, nama: true },
    });

    if (sekolah?.npsn) {
      defaultNpsn = sekolah.npsn;
    }

    if (!config) {
      return {
        dapodik_host: 'http://localhost:5774',
        npsn: defaultNpsn,
        api_token: '',
        is_active: true,
        last_sync_at: null,
        last_status: null,
        school_name: sekolah?.nama || null,
        is_configured: false,
      };
    }

    return {
      ...config,
      school_name: sekolah?.nama || null,
      is_configured: Boolean(config.api_token && config.npsn),
    };
  }

  /**
   * Menyimpan / memperbarui konfigurasi Dapodik untuk tenant tertentu.
   */
  async saveConfig(tenantId: string, payload: DapodikConfigDto) {
    const cleanHost = (payload.dapodik_host || 'http://localhost:5774').trim().replace(/\/+$/, '');
    const cleanNpsn = (payload.npsn || '').trim();
    const cleanToken = (payload.api_token || '').trim();

    return await prisma.dapodikConfig.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        dapodik_host: cleanHost,
        npsn: cleanNpsn,
        api_token: cleanToken,
        is_active: payload.is_active ?? true,
      },
      update: {
        dapodik_host: cleanHost,
        npsn: cleanNpsn,
        api_token: cleanToken,
        is_active: payload.is_active ?? true,
      },
    });
  }

  /**
   * Melakukan test koneksi (Handshake) ke Web Service Dapodik lokal (port 5774).
   * Memanggil /WebService/getSekolah?npsn=...
   */
  /**
   * Mem-parsing respons Web Service Dapodik secara defensif.
   * Menangani kasus khas PHP/Symfony Dapodik yang sering mengembalikan HTTP 200
   * dengan body string berisi header HTTP mentah (misal: "HTTP/1.0 403 Forbidden\r\n...\r\n\r\n{...}")
   * atau JSON berkonten text/html, serta menolak payload error ({ success: false }).
   */
  private parseDapodikPayload(rawData: unknown, httpStatus?: number): any {
    let embeddedStatus: number | undefined;
    let parsed: any = rawData;

    if (typeof rawData === 'string') {
      let cleaned = rawData.replace(/^\uFEFF/, '').trim();

      // Tangani header HTTP mentah yang ikut tercetak di dalam body oleh Web Service Dapodik
      const httpHeaderMatch = cleaned.match(/^HTTP\/\d\.\d\s+(\d{3})\b/i);
      if (httpHeaderMatch) {
        embeddedStatus = parseInt(httpHeaderMatch[1], 10);
        const separatorIdx = cleaned.search(/\r?\n\r?\n/);
        if (separatorIdx !== -1) {
          cleaned = cleaned.slice(separatorIdx).trim();
        } else {
          const jsonStartIdx = cleaned.search(/[\{\[]/);
          if (jsonStartIdx !== -1) {
            cleaned = cleaned.slice(jsonStartIdx).trim();
          }
        }
      }

      if (!cleaned) {
        const err: any = new Error(
          `Web Service Dapodik mengembalikan respons kosong${embeddedStatus ? ` (HTTP ${embeddedStatus})` : ''}.`
        );
        err.httpCode = embeddedStatus || httpStatus;
        throw err;
      }

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const preview = cleaned.slice(0, 180).replace(/\s+/g, ' ');
        const err: any = new Error(
          `Respons Web Service Dapodik bukan JSON yang valid${embeddedStatus ? ` (HTTP ${embeddedStatus})` : ''}: ${preview}`
        );
        err.httpCode = embeddedStatus || httpStatus;
        throw err;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      const err: any = new Error('Format respons Web Service Dapodik tidak dikenali.');
      err.httpCode = embeddedStatus || httpStatus;
      throw err;
    }

    const effectiveCode =
      (typeof parsed.http_code === 'number' ? parsed.http_code : undefined) ||
      embeddedStatus ||
      (httpStatus && httpStatus >= 400 ? httpStatus : undefined);

    if (parsed.success === false || (effectiveCode !== undefined && effectiveCode >= 400)) {
      const dapodikMsg = parsed.message || parsed.status_code || 'Permintaan ditolak oleh Web Service Dapodik.';
      const serverIp = this.getServerNetworkInfo().primaryIp;
      const err: any = new Error(
        effectiveCode === 401 || effectiveCode === 403
          ? `Autentikasi/Akses ditolak Dapodik (HTTP ${effectiveCode}): ${dapodikMsg}. Pastikan IP Server (${serverIp}) sudah terdaftar pada whitelist Web Service Dapodik dan Token valid.`
          : `Web Service Dapodik mengembalikan error${effectiveCode ? ` (HTTP ${effectiveCode})` : ''}: ${dapodikMsg}`
      );
      err.httpCode = effectiveCode;
      err.dapodikDetails = parsed;
      throw err;
    }

    return parsed;
  }

  async testConnection(tenantId: string, customConfig?: DapodikConfigDto) {
    let host = customConfig?.dapodik_host;
    let npsn = customConfig?.npsn;
    let token = customConfig?.api_token;

    if (!host || !npsn || !token) {
      const savedConfig = await prisma.dapodikConfig.findUnique({
        where: { tenant_id: tenantId },
      });
      if (!savedConfig) {
        throw new Error('Konfigurasi Dapodik belum disimpan. Harap masukkan Host, NPSN, dan Token.');
      }
      host = host || savedConfig.dapodik_host;
      npsn = npsn || savedConfig.npsn;
      token = token || savedConfig.api_token;
    }

    const cleanHost = host.trim().replace(/\/+$/, '');
    const cleanNpsn = npsn.trim();
    const cleanToken = token.trim();

    const targetUrl = `${cleanHost}/WebService/getSekolah?npsn=${cleanNpsn}`;

    try {
      const response = await axios.get(targetUrl, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/json',
        },
        timeout: 8000, // 8 detik
      });

      const resData = this.parseDapodikPayload(response.data, response.status);
      let schoolPayload = resData;
      if (resData && Array.isArray(resData.rows) && resData.rows.length > 0) {
        schoolPayload = resData.rows[0];
      } else if (resData && typeof resData === 'object' && resData.sekolah_id) {
        schoolPayload = resData;
      }

      // Update status di database HANYA setelah payload Dapodik tervalidasi sukses
      await prisma.dapodikConfig.updateMany({
        where: { tenant_id: tenantId },
        data: {
          last_sync_at: new Date(),
          last_status: 'SUCCESS',
        },
      });

      return {
        success: true,
        message: 'Koneksi ke Web Service Dapodik Berhasil!',
        targetUrl,
        schoolInfo: {
          nama: schoolPayload?.nama || schoolPayload?.nama_sekolah || 'Sekolah Dapodik',
          npsn: schoolPayload?.npsn || cleanNpsn,
          bentuk_pendidikan: schoolPayload?.bentuk_pendidikan_id_str || schoolPayload?.bentuk_pendidikan || '-',
          alamat: schoolPayload?.alamat_jalan || '-',
          desa_kelurahan: schoolPayload?.desa_kelurahan || '-',
          kecamatan: schoolPayload?.kecamatan || '-',
          status_sekolah: schoolPayload?.status_sekolah_str || schoolPayload?.status_sekolah || '-',
        },
      };
    } catch (err: any) {
      // Catat status gagal
      await prisma.dapodikConfig.updateMany({
        where: { tenant_id: tenantId },
        data: {
          last_status: err.code === 'ECONNABORTED' ? 'TIMEOUT' : 'FAILED',
        },
      });

      const serverIp = this.getServerNetworkInfo().primaryIp;
      const statusCode = err.httpCode || err.response?.status;
      let errorMsg = 'Gagal terhubung ke Web Service Dapodik.';
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Koneksi ditolak di ${cleanHost}. Pastikan aplikasi Dapodik di komputer operator aktif dan Web Service di port 5774 running.`;
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        errorMsg = `Koneksi timeout ke ${cleanHost}. Pastikan komputer server Absenta (${serverIp}) dapat menjangkau IP komputer Dapodik dalam jaringan LAN yang sama.`;
      } else if (err.dapodikDetails) {
        errorMsg = err.message;
      } else if (statusCode === 401 || statusCode === 403) {
        errorMsg = `Autentikasi ditolak (Status ${statusCode}). Periksa kembali apakah Token valid dan IP Server (${serverIp}) sudah terdaftar di whitelist Dapodik.`;
      } else if (err.message) {
        errorMsg = err.message;
      }

      return {
        success: false,
        message: errorMsg,
        targetUrl,
        details: err.dapodikDetails || err.response?.data || null,
      };
    }
  }

  /**
   * Menarik data peserta didik langsung dari Web Service Dapodik port 5774,
   * memvalidasi payload, serta menyimpannya ke in-memory cache dan Staging Storage.
   */
  private async fetchLiveDapodikRows(
    tenantId: string,
    cleanHost: string,
    cleanNpsn: string,
    cleanToken: string
  ): Promise<{ rows: any[]; fetchedAt: Date }> {
    try {
      const studentUrl = `${cleanHost}/WebService/getPesertaDidik?npsn=${cleanNpsn}`;
      const response = await axios.get(studentUrl, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/json',
        },
        timeout: 20000,
      });

      const parsedPayload = this.parseDapodikPayload(response.data, response.status);
      let rows: any[];

      if (parsedPayload && Array.isArray(parsedPayload.rows)) {
        rows = parsedPayload.rows;
      } else if (Array.isArray(parsedPayload)) {
        rows = parsedPayload;
      } else if (parsedPayload && Array.isArray(parsedPayload.data)) {
        rows = parsedPayload.data;
      } else {
        throw new Error(
          'Web Service Dapodik tidak mengembalikan daftar peserta didik (array rows/data tidak ditemukan).'
        );
      }

      const fetchedAt = new Date();

      // Simpan cache & Staging HANYA jika data siswa valid (> 0), agar snapshot Staging tidak tertimpa data kosong!
      if (rows.length > 0) {
        DapodikService.studentCache.set(tenantId, {
          fetchedAt,
          rows,
          npsn: cleanNpsn,
          host: cleanHost,
        });
        await DapodikService.saveStagingSnapshot(tenantId, rows, cleanNpsn, cleanHost);
      }

      await prisma.dapodikConfig.updateMany({
        where: { tenant_id: tenantId },
        data: {
          last_sync_at: fetchedAt,
          last_status: 'SUCCESS',
        },
      });

      return { rows, fetchedAt };
    } catch (err: any) {
      await prisma.dapodikConfig.updateMany({
        where: { tenant_id: tenantId },
        data: {
          last_status: err.code === 'ECONNABORTED' ? 'TIMEOUT' : 'FAILED',
        },
      });
      throw err;
    }
  }

  /**
   * Menjalankan Diff Engine: Komparasi Siswa Dapodik vs Siswa Absenta.
   * Mendukung mode:
   * - 'STAGING' (Default): Mengambil dari penyimpanan lokal platform dulu; jika lokal kosong, otomatis tarik Live dari port 5774
   * - 'LIVE': Mengambil fresh dari server Dapodik port 5774 (fallback ke staging/memory jika gagal saat non-refresh)
   */
  async compareStudents(
    tenantId: string,
    options?: CompareOptions,
    forceRefresh = false,
    sourceMode: 'LIVE' | 'STAGING' = 'STAGING'
  ): Promise<ReconciliationReport> {
    const opt: Required<CompareOptions> = {
      checkNama: options?.checkNama ?? true,
      checkNis: options?.checkNis ?? true,
      checkNisn: options?.checkNisn ?? true,
      checkNik: options?.checkNik ?? true,
      checkKelas: options?.checkKelas ?? true,
      checkJenisKelamin: options?.checkJenisKelamin ?? true,
      checkTanggalLahir: options?.checkTanggalLahir ?? true,
      checkTempatLahir: options?.checkTempatLahir ?? false,
      ignoreClassWhitespace: options?.ignoreClassWhitespace ?? true,
      onlyActiveStudents: options?.onlyActiveStudents ?? true,
    };

    const config = await prisma.dapodikConfig.findUnique({
      where: { tenant_id: tenantId },
    });

    if (!config || !config.api_token || !config.npsn) {
      throw new Error('Konfigurasi Dapodik belum lengkap. Masukkan Host, NPSN, dan Token terlebih dahulu.');
    }

    const cleanHost = config.dapodik_host.trim().replace(/\/+$/, '');
    const cleanNpsn = config.npsn.trim();
    const cleanToken = config.api_token.trim();

    // 1. Ambil Data Peserta Didik (Dari Staging Platform ATAU Live Web Service Dapodik)
    let dapodikRows: any[] = [];
    let isFromCache = false;
    let cachedAtDate = new Date();
    let effectiveSourceMode: 'LIVE' | 'STAGING' = sourceMode;
    let fallbackReason: string | undefined;

    // Jika diminta forceRefresh, bersihkan in-memory cache seketika agar tidak memakai memori lama
    if (forceRefresh) {
      DapodikService.clearCache(tenantId);
    }

    const existingCache = !forceRefresh ? DapodikService.studentCache.get(tenantId) : undefined;
    const hasValidCache = Boolean(
      existingCache &&
      Array.isArray(existingCache.rows) &&
      existingCache.rows.length > 0 &&
      existingCache.npsn === cleanNpsn &&
      existingCache.host === cleanHost
    );

    const stagingSnapshot = await DapodikService.loadStagingSnapshot(tenantId);

    if (sourceMode === 'STAGING') {
      // MODE STAGING PLATFORM:
      // Gunakan snapshot lokal bila ada dan TIDAK sedang meminta forceRefresh.
      // Jika forceRefresh=true ATAU lokal masih kosong, wajib tarik Live fresh dari server Dapodik!
      if (!forceRefresh && stagingSnapshot && stagingSnapshot.rows.length > 0) {
        dapodikRows = stagingSnapshot.rows;
        isFromCache = true;
        cachedAtDate = stagingSnapshot.savedAt;
        effectiveSourceMode = 'STAGING';
      } else if (!forceRefresh && hasValidCache && existingCache) {
        dapodikRows = existingCache.rows;
        isFromCache = true;
        cachedAtDate = existingCache.fetchedAt;
        effectiveSourceMode = 'STAGING';
        await DapodikService.saveStagingSnapshot(tenantId, existingCache.rows, cleanNpsn, cleanHost);
      } else {
        try {
          const live = await this.fetchLiveDapodikRows(tenantId, cleanHost, cleanNpsn, cleanToken);
          dapodikRows = live.rows;
          cachedAtDate = live.fetchedAt;
          effectiveSourceMode = 'STAGING';
          isFromCache = false;
          // Timpa snapshot di staging storage dengan data fresh yang baru ditarik
          await DapodikService.saveStagingSnapshot(tenantId, live.rows, cleanNpsn, cleanHost);
        } catch (err: any) {
          if (forceRefresh) {
            throw new Error(`Gagal menarik data baru dari Web Service Dapodik: ${err.message || 'Koneksi bermasalah'}`);
          }
          throw new Error(
            `Belum ada snapshot Dapodik di Staging Lokal dan penarikan otomatis Live gagal: ${err.message || 'Koneksi bermasalah'}`
          );
        }
      }
    } else {
      // MODE LIVE DAPODIK: Ambil langsung dari port 5774
      if (!forceRefresh && hasValidCache && existingCache) {
        // Gunakan snapshot in-memory (0ms network request)
        dapodikRows = existingCache.rows;
        isFromCache = true;
        cachedAtDate = existingCache.fetchedAt;
        effectiveSourceMode = 'LIVE';
      } else {
        // Tarik fresh dari Dapodik Web Service
        try {
          const live = await this.fetchLiveDapodikRows(tenantId, cleanHost, cleanNpsn, cleanToken);
          dapodikRows = live.rows;
          cachedAtDate = live.fetchedAt;
          effectiveSourceMode = 'LIVE';
          // Otomatis update snapshot persistent di Staging agar selaras dengan data Live terbaru
          await DapodikService.saveStagingSnapshot(tenantId, live.rows, cleanNpsn, cleanHost);
        } catch (err: any) {
          // Jika user eksplisit klik "Tarik Data Baru" (forceRefresh=true), langsung tampilkan error asli (jangan menyembunyikan kegagalan di balik fallback staging)
          if (!forceRefresh) {
            if (stagingSnapshot && stagingSnapshot.rows.length > 0) {
              dapodikRows = stagingSnapshot.rows;
              isFromCache = true;
              cachedAtDate = stagingSnapshot.savedAt;
              effectiveSourceMode = 'STAGING';
              fallbackReason = err.message || 'Gagal menghubungi Web Service Dapodik';
            } else if (hasValidCache && existingCache) {
              dapodikRows = existingCache.rows;
              isFromCache = true;
              cachedAtDate = existingCache.fetchedAt;
              effectiveSourceMode = 'STAGING';
              fallbackReason = err.message || 'Gagal menghubungi Web Service Dapodik';
            } else {
              throw new Error(err.message || `Komputer Dapodik (${cleanHost}) tidak dapat dihubungi dan belum ada snapshot di Staging Platform.`);
            }
          } else {
            throw new Error(err.message || `Gagal menarik data fresh dari Web Service Dapodik (${cleanHost}).`);
          }
        }
      }
    }

    // 2. Tarik Data Siswa & Akademik dari Database Absenta untuk Tenant ini
    const studentWhereClause: any = { tenant_id: tenantId };
    if (opt.onlyActiveStudents) {
      studentWhereClause.status = 'AKTIF';
    }

    // Ambil Konteks Tahun Pelajaran & Semester Aktif Tenant Ini
    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
      prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
    ]);

    const absentaStudents = await prisma.siswa.findMany({
      where: studentWhereClause,
      include: {
        Kelas: {
          select: { id: true, nama_kelas: true, tingkat: true },
        },
        SiswaAkademik: {
          where: { status: 'AKTIF' },
          include: {
            kelas: {
              select: { id: true, nama_kelas: true, tingkat: true },
            },
            tahunPelajaran: {
              select: { id: true, tahun: true, is_active: true },
            },
            semester: {
              select: { id: true, nama_semester: true, is_active: true },
            },
          },
          orderBy: [
            { tahunPelajaran: { tahun: 'desc' } },
            { created_at: 'desc' },
          ],
        },
      },
    });

    // Helper resolusi rombel aktif yang presisi:
    // 1. SiswaAkademik pada Tahun Pelajaran Aktif
    // 2. Kelas master siswa (Siswa.Kelas / kelas_id)
    // 3. SiswaAkademik terbaru (fallback)
    const getResolvedKelas = (s: typeof absentaStudents[0]) => {
      if (activeTp && s.SiswaAkademik && s.SiswaAkademik.length > 0) {
        const saActive = s.SiswaAkademik.find(
          (sa) => sa.tahun_pelajaran_id === activeTp.id && sa.kelas
        );
        if (saActive?.kelas) {
          return saActive.kelas;
        }
      }
      if (s.Kelas) {
        return s.Kelas;
      }
      if (s.SiswaAkademik && s.SiswaAkademik.length > 0 && s.SiswaAkademik[0]?.kelas) {
        return s.SiswaAkademik[0].kelas;
      }
      return null;
    };

    // 3. Bangun Indeks Pencocokan (Lookup Maps) untuk Efisiensi O(N)
    // Menggunakan Map<string, Array<Siswa>> untuk mencegah overwrite jika di Absenta terdapat duplikasi NISN/NIK.
    const absentaByNisn = new Map<string, Array<typeof absentaStudents[0]>>();
    const absentaByNik = new Map<string, Array<typeof absentaStudents[0]>>();
    const matchedAbsentaIds = new Set<string>();

    for (const s of absentaStudents) {
      if (s.nisn && s.nisn.trim()) {
        const k = s.nisn.trim().toLowerCase();
        if (!absentaByNisn.has(k)) absentaByNisn.set(k, []);
        absentaByNisn.get(k)!.push(s);
      }
      if (s.nik && s.nik.trim()) {
        const k = s.nik.trim().toLowerCase();
        if (!absentaByNik.has(k)) absentaByNik.set(k, []);
        absentaByNik.get(k)!.push(s);
      }
    }

    const resultList: ReconciledStudent[] = [];

    // Helper normalisasi nama (hilangkan spasi ganda, trim, uppercase)
    const norm = (str?: string | null) => (str || '').replace(/\s+/g, ' ').trim().toUpperCase();

    // 4. Iterasi Data Dapodik -> Bandingkan dengan Absenta
    for (const dRow of dapodikRows) {
      const dNisn = (dRow.nisn || '').trim().toLowerCase();
      const dNik = (dRow.nik || '').trim().toLowerCase();
      const dNama = norm(dRow.nama || dRow.nama_siswa);
      const dNipd = (dRow.registrasi_peserta_didik?.nipd || dRow.nipd || '').trim();
      const dJk = norm(dRow.jenis_kelamin).charAt(0) || 'L';
      const dTglLahir = dRow.tanggal_lahir ? String(dRow.tanggal_lahir).split('T')[0] : null;
      const dTempatLahir = norm(dRow.tempat_lahir);
      const dRombel = norm(dRow.nama_rombel || dRow.rombongan_belajar?.nama || dRow.rombel);

      // Cari pasangan di Absenta (Primary: NISN, Secondary: NIK)
      // ZERO-FALLBACK: NISN hanya dicocokkan dengan NISN, NIK hanya dengan NIK (tidak boleh fallback ke NIS).
      // Jika terdapat multi-kandidat dengan NISN sama di Absenta, prioritaskan yang namanya cocok.
      let match: typeof absentaStudents[0] | undefined;
      if (dNisn && absentaByNisn.has(dNisn)) {
        const candidates = absentaByNisn.get(dNisn)!;
        match = candidates.find((c) => !matchedAbsentaIds.has(c.id) && norm(c.nama_siswa) === dNama)
             || candidates.find((c) => !matchedAbsentaIds.has(c.id));
      } else if (dNik && absentaByNik.has(dNik)) {
        const candidates = absentaByNik.get(dNik)!;
        match = candidates.find((c) => !matchedAbsentaIds.has(c.id) && norm(c.nama_siswa) === dNama)
             || candidates.find((c) => !matchedAbsentaIds.has(c.id));
      }

      if (!match) {
        // Siswa ada di Dapodik tapi tidak ditemukan di Absenta
        resultList.push({
          id: dRow.peserta_didik_id || `dapodik-${dNisn || dNik || Math.random()}`,
          nisn: dRow.nisn || '',
          nik: dRow.nik || null,
          nis: dNipd || null,
          nama: dRow.nama || dRow.nama_siswa || '',
          jenis_kelamin: dJk,
          tempat_lahir: dRow.tempat_lahir || null,
          tanggal_lahir: dTglLahir,
          rombel: dRombel || null,
          status: 'DAPODIK_ONLY',
          diffs: [],
          dapodikRaw: dRow,
        });
      } else {
        matchedAbsentaIds.add(match.id);
        const diffs: StudentDiffItem[] = [];

        const resolvedKelas = getResolvedKelas(match);
        const aNama = norm(match.nama_siswa);
        const aNis = (match.nis || '').trim();
        const aNisn = (match.nisn || '').trim();
        const aNik = (match.nik || '').trim();
        const aJk = norm(match.jenis_kelamin).charAt(0) || 'L';
        const aTglLahir = match.tanggal_lahir ? new Date(match.tanggal_lahir).toISOString().split('T')[0] : null;
        const aTempatLahir = norm(match.tempat_lahir);
        const aKelas = norm(resolvedKelas?.nama_kelas);

        // Bandingkan atribut sesuai opsi yang dipilih operator
        if (opt.checkNama && dNama !== aNama) {
          diffs.push({
            field: 'nama_siswa',
            label: 'Nama Siswa',
            dapodikValue: dRow.nama,
            absentaValue: match.nama_siswa,
          });
        }

        if (opt.checkNis && dNipd && aNis && dNipd !== aNis) {
          diffs.push({
            field: 'nis',
            label: 'Nomor Induk Siswa (NIS)',
            dapodikValue: dNipd,
            absentaValue: match.nis,
          });
        }

        if (opt.checkNisn && dNisn && aNisn && dNisn !== aNisn.toLowerCase()) {
          diffs.push({
            field: 'nisn',
            label: 'NISN',
            dapodikValue: dRow.nisn,
            absentaValue: match.nisn,
          });
        }

        if (opt.checkNik && dNik && aNik && dNik !== aNik.toLowerCase()) {
          diffs.push({
            field: 'nik',
            label: 'NIK',
            dapodikValue: dRow.nik,
            absentaValue: match.nik,
          });
        }

        if (opt.checkJenisKelamin && dJk && aJk && dJk !== aJk) {
          diffs.push({
            field: 'jenis_kelamin',
            label: 'Jenis Kelamin',
            dapodikValue: dJk,
            absentaValue: aJk,
          });
        }

        if (opt.checkTempatLahir && dTempatLahir && aTempatLahir && dTempatLahir !== aTempatLahir) {
          diffs.push({
            field: 'tempat_lahir',
            label: 'Tempat Lahir',
            dapodikValue: dRow.tempat_lahir,
            absentaValue: match.tempat_lahir,
          });
        }

        if (opt.checkTanggalLahir && dTglLahir && aTglLahir && dTglLahir !== aTglLahir) {
          diffs.push({
            field: 'tanggal_lahir',
            label: 'Tanggal Lahir',
            dapodikValue: dTglLahir,
            absentaValue: aTglLahir,
          });
        }

        if (opt.checkKelas && dRombel && aKelas) {
          let dK = dRombel;
          let aK = aKelas;
          if (opt.ignoreClassWhitespace) {
            dK = dK.replace(/\s+/g, '');
            aK = aK.replace(/\s+/g, '');
          }
          if (dK !== aK) {
            diffs.push({
              field: 'kelas',
              label: 'Rombongan Belajar / Kelas',
              dapodikValue: dRow.nama_rombel || dRow.rombongan_belajar?.nama || dRow.rombel,
              absentaValue: resolvedKelas?.nama_kelas || null,
            });
          }
        }

        const isMatch = diffs.length === 0;

        resultList.push({
          id: match.id,
          nisn: match.nisn || dRow.nisn || '',
          nik: match.nik || dRow.nik || null,
          nis: match.nis || dNipd || null,
          nama: match.nama_siswa,
          jenis_kelamin: match.jenis_kelamin,
          tempat_lahir: match.tempat_lahir,
          tanggal_lahir: aTglLahir || dTglLahir,
          rombel: resolvedKelas?.nama_kelas || aKelas || dRombel || null,
          status: isMatch ? 'MATCH' : 'MISMATCH',
          diffs,
          dapodikRaw: dRow,
          absentaRaw: {
            ...match,
            SiswaAkademik: resolvedKelas
              ? [{ kelas: resolvedKelas, status: 'AKTIF' }, ...(match.SiswaAkademik || [])]
              : match.SiswaAkademik,
          },
        });
      }
    }

    // 5. Tambahkan Siswa Absenta yang Tidak Ditemukan di Dapodik
    for (const aStudent of absentaStudents) {
      if (!matchedAbsentaIds.has(aStudent.id)) {
        const resolvedKelas = getResolvedKelas(aStudent);
        const aTgl = aStudent.tanggal_lahir ? new Date(aStudent.tanggal_lahir).toISOString().split('T')[0] : null;
        resultList.push({
          id: aStudent.id,
          nisn: aStudent.nisn || '',
          nik: aStudent.nik || null,
          nis: aStudent.nis || null,
          nama: aStudent.nama_siswa,
          jenis_kelamin: aStudent.jenis_kelamin,
          tempat_lahir: aStudent.tempat_lahir,
          tanggal_lahir: aTgl,
          rombel: resolvedKelas?.nama_kelas || null,
          status: 'ABSENTA_ONLY',
          diffs: [],
          absentaRaw: {
            ...aStudent,
            SiswaAkademik: resolvedKelas
              ? [{ kelas: resolvedKelas, status: 'AKTIF' }, ...(aStudent.SiswaAkademik || [])]
              : aStudent.SiswaAkademik,
          },
        });
      }
    }

    // 6. Hitung Counter Ringkasan
    const summary = {
      totalDapodik: dapodikRows.length,
      totalAbsenta: absentaStudents.length,
      matchCount: resultList.filter((s) => s.status === 'MATCH').length,
      mismatchCount: resultList.filter((s) => s.status === 'MISMATCH').length,
      dapodikOnlyCount: resultList.filter((s) => s.status === 'DAPODIK_ONLY').length,
      absentaOnlyCount: resultList.filter((s) => s.status === 'ABSENTA_ONLY').length,
    };

    const stagingMeta = await DapodikService.getStagingMeta(tenantId);

    return {
      summary,
      academicContext: {
        tahunPelajaran: activeTp ? { id: activeTp.id, tahun: activeTp.tahun } : null,
        semester: activeSem ? { id: activeSem.id, nama_semester: activeSem.nama_semester } : null,
      },
      lastCheckAt: new Date().toISOString(),
      cacheInfo: {
        isFromCache,
        cachedAt: cachedAtDate.toISOString(),
        totalCached: dapodikRows.length,
        sourceMode: effectiveSourceMode,
        ...(fallbackReason ? { fallbackReason } : {}),
      },
      stagingMeta,
      students: resultList,
    };
  }

  /**
   * Menyinkronkan siswa yang dipilih:
   * - 'UPDATE': Perbarui field siswa di Absenta agar sesuai dengan Dapodik
   * - 'IMPORT': Daftarkan siswa baru dari Dapodik ke Absenta (termasuk pemetaan kelas & rekam akademik)
   */
  async syncStudents(
    tenantId: string,
    payload: {
      action: 'UPDATE_SELECTED' | 'IMPORT_SELECTED';
      tahun_pelajaran_id?: string;
      semester_id?: string;
      fields_to_update?: string[];
      students: {
        absentaId?: string;
        nisn?: string;
        nik?: string;
        nis?: string;
        nama: string;
        jenis_kelamin: string;
        tempat_lahir?: string;
        tanggal_lahir?: string;
        rombel?: string;
        kelas_id?: string;
        jurusan_id?: string;
        tahun_pelajaran_id?: string;
        semester_id?: string;
      }[];
    },
    userContext?: { userId?: string; org?: any }
  ) {
    let updatedCount = 0;
    let importedCount = 0;

    // Ambil default periode akademik aktif jika tidak ditentukan
    let defaultTpId = payload.tahun_pelajaran_id;
    let defaultSemId = payload.semester_id;

    if (!defaultTpId || !defaultSemId) {
      const [activeTp, activeSem] = await Promise.all([
        !defaultTpId ? prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }) : null,
        !defaultSemId ? prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } }) : null,
      ]);
      if (!defaultTpId && activeTp) defaultTpId = activeTp.id;
      if (!defaultSemId && activeSem) defaultSemId = activeSem.id;
    }

    for (const item of payload.students) {
      const targetTpId = item.tahun_pelajaran_id || defaultTpId || undefined;
      const targetSemId = item.semester_id || defaultSemId || undefined;

      if (payload.action === 'UPDATE_SELECTED' && item.absentaId) {
        // Tentukan daftar kolom yang diizinkan untuk diperbarui
        // Jika payload.fields_to_update tidak dikirimkan, gunakan default aman (biodata KECUALI kelas_id)
        const allowedFields = Array.isArray(payload.fields_to_update) && payload.fields_to_update.length > 0
          ? payload.fields_to_update.map((f) => f.toLowerCase().trim())
          : ['nama', 'nis', 'nisn', 'nik', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir'];

        const updateData: any = {};

        if (allowedFields.includes('nama') && item.nama) {
          updateData.nama_siswa = item.nama;
        }
        if (allowedFields.includes('nis') && item.nis !== undefined) {
          updateData.nis = item.nis || null;
        }
        if (allowedFields.includes('nisn') && item.nisn !== undefined) {
          updateData.nisn = item.nisn || null;
        }
        if (allowedFields.includes('nik') && item.nik !== undefined) {
          updateData.nik = item.nik || null;
        }
        if (allowedFields.includes('jenis_kelamin') && item.jenis_kelamin) {
          updateData.jenis_kelamin = (item.jenis_kelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
        }
        if (allowedFields.includes('tempat_lahir') && item.tempat_lahir !== undefined) {
          updateData.tempat_lahir = item.tempat_lahir || null;
        }
        if (allowedFields.includes('tanggal_lahir')) {
          if (item.tanggal_lahir) {
            const parsedDate = new Date(item.tanggal_lahir);
            if (!isNaN(parsedDate.getTime())) {
              updateData.tanggal_lahir = parsedDate;
            }
          } else {
            updateData.tanggal_lahir = null;
          }
        }

        // Pengecekan Eksplisit Kelas: Hanya diperbarui jika kelas_id eksplisit disertakan dalam allowedFields
        let targetKelasId = item.kelas_id;
        if (allowedFields.includes('kelas_id')) {
          // Jika kelas_id kosong tetapi rombel Dapodik ada, resolve otomatis dari tabel Kelas
          if (!targetKelasId && item.rombel) {
            const cleanRombel = item.rombel.trim();
            const matchedKelas = await prisma.kelas.findFirst({
              where: {
                tenant_id: tenantId,
                nama_kelas: { equals: cleanRombel, mode: 'insensitive' },
              },
              select: { id: true },
            });
            if (matchedKelas) {
              targetKelasId = matchedKelas.id;
            }
          }
        }

        const shouldUpdateKelas = allowedFields.includes('kelas_id') && Boolean(targetKelasId);
        if (shouldUpdateKelas && targetKelasId) {
          updateData.kelas_id = targetKelasId;
          if (targetTpId) updateData.tahun_pelajaran_id = targetTpId;
          if (targetSemId) updateData.semester_id = targetSemId;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.siswa.updateMany({
            where: {
              id: item.absentaId,
              tenant_id: tenantId,
            },
            data: updateData,
          });
        }

        // Jika kelas_id disertakan, sinkronkan juga rekam akademik aktif
        if (shouldUpdateKelas && targetKelasId && targetTpId && targetSemId) {
          try {
            await prisma.siswaAkademik.upsert({
              where: {
                siswa_id_tahun_pelajaran_id_semester_id: {
                  siswa_id: item.absentaId,
                  tahun_pelajaran_id: targetTpId,
                  semester_id: targetSemId,
                },
              },
              update: {
                kelas_id: targetKelasId,
                status: 'AKTIF',
              },
              create: {
                siswa_id: item.absentaId,
                kelas_id: targetKelasId,
                tahun_pelajaran_id: targetTpId,
                semester_id: targetSemId,
                status: 'AKTIF',
              },
            });
          } catch (academicErr: any) {
            console.error('[DapodikSync] Gagal update SiswaAkademik:', academicErr?.message || academicErr);
          }
        }

        updatedCount++;
      } else if (payload.action === 'IMPORT_SELECTED') {
        // Cek apakah NISN / NIS sudah ada di tenant ini
        const existing = await prisma.siswa.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              item.nisn ? { nisn: item.nisn } : {},
              item.nis ? { nis: item.nis } : {},
            ],
          },
        });

        if (!existing) {
          // Resolve jurusan_id dari kelas jika ada pemetaan kelas
          let resolvedJurusanId = item.jurusan_id;
          if (!resolvedJurusanId && item.kelas_id) {
            const kelasRecord = await prisma.kelas.findUnique({
              where: { id: item.kelas_id },
              select: { jurusan_id: true },
            });
            if (kelasRecord?.jurusan_id) {
              resolvedJurusanId = kelasRecord.jurusan_id;
            }
          }

          try {
            // Gunakan createSiswaCommand agar akun User, SiswaAkademik, dan ActivityLog terbentuk sempurna
            await createSiswaCommand(
              {
                nama_siswa: item.nama,
                nis: item.nis || undefined,
                nisn: item.nisn || undefined,
                nik: item.nik || undefined,
                jenis_kelamin: (item.jenis_kelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
                tempat_lahir: item.tempat_lahir || undefined,
                tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir) : undefined,
                kelas_id: item.kelas_id || undefined,
                jurusan_id: resolvedJurusanId || undefined,
                tahun_pelajaran_id: targetTpId,
                semester_id: targetSemId,
                status: item.kelas_id ? 'AKTIF' : 'CALON',
              },
              {
                tenantId,
                org: userContext?.org || { tenant_wide: true },
                userId: userContext?.userId,
              }
            );
            importedCount++;
          } catch (createErr: any) {
            console.error(`[DapodikSync] createSiswaCommand fallback for ${item.nama}:`, createErr?.message || createErr);
            // Fallback gracefully jika terdapat kondisi khusus
            const created = await prisma.siswa.create({
              data: {
                tenant_id: tenantId,
                nama_siswa: item.nama,
                // Zero-Fallback: Jangan pernah mengisi NIS menggunakan NISN
                nis: item.nis || `NIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                nisn: item.nisn || null,
                nik: item.nik || null,
                jenis_kelamin: (item.jenis_kelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
                tempat_lahir: item.tempat_lahir || null,
                tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir) : null,
                kelas_id: item.kelas_id || null,
                jurusan_id: resolvedJurusanId || null,
                tahun_pelajaran_id: targetTpId || null,
                semester_id: targetSemId || null,
                status: item.kelas_id ? 'AKTIF' : 'CALON',
              },
            });

            if (item.kelas_id && targetTpId && targetSemId) {
              try {
                await prisma.siswaAkademik.upsert({
                  where: {
                    siswa_id_tahun_pelajaran_id_semester_id: {
                      siswa_id: created.id,
                      tahun_pelajaran_id: targetTpId,
                      semester_id: targetSemId,
                    },
                  },
                  update: {
                    kelas_id: item.kelas_id,
                    status: 'AKTIF',
                  },
                  create: {
                    siswa_id: created.id,
                    kelas_id: item.kelas_id,
                    tahun_pelajaran_id: targetTpId,
                    semester_id: targetSemId,
                    status: 'AKTIF',
                  },
                });
              } catch (fallbackSaErr: any) {
                console.error('[DapodikSync] Fallback SiswaAkademik error:', fallbackSaErr?.message || fallbackSaErr);
              }
            }
            importedCount++;
          }
        }
      }
    }

    return {
      success: true,
      message: `Sinkronisasi berhasil: ${updatedCount} siswa diperbarui, ${importedCount} siswa diimpor.`,
      updatedCount,
      importedCount,
    };
  }
}

export const dapodikService = new DapodikService();
