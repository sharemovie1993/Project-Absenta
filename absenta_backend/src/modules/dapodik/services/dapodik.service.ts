import os from 'os';
import axios from 'axios';
import { prisma } from '@/utils/prisma';

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

export interface ReconciliationReport {
  summary: {
    totalDapodik: number;
    totalAbsenta: number;
    matchCount: number;
    mismatchCount: number;
    dapodikOnlyCount: number;
    absentaOnlyCount: number;
  };
  lastCheckAt: string;
  cacheInfo: {
    isFromCache: boolean;
    cachedAt: string;
    totalCached: number;
  };
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
   * Mengosongkan cache snapshot Dapodik jika dibutuhkan
   */
  static clearCache(tenantId?: string) {
    if (tenantId) {
      DapodikService.studentCache.delete(tenantId);
    } else {
      DapodikService.studentCache.clear();
    }
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

      // Update status di database jika konfigurasi tersimpan
      await prisma.dapodikConfig.updateMany({
        where: { tenant_id: tenantId },
        data: {
          last_sync_at: new Date(),
          last_status: 'SUCCESS',
        },
      });

      const resData = response.data;
      let schoolPayload = resData;
      if (resData && Array.isArray(resData.rows) && resData.rows.length > 0) {
        schoolPayload = resData.rows[0];
      } else if (resData && typeof resData === 'object' && resData.sekolah_id) {
        schoolPayload = resData;
      }

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

      let errorMsg = 'Gagal terhubung ke Web Service Dapodik.';
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Koneksi ditolak di ${cleanHost}. Pastikan aplikasi Dapodik di komputer operator aktif dan Web Service di port 5774 running.`;
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        errorMsg = `Koneksi timeout ke ${cleanHost}. Pastikan komputer server Absenta (10.10.10.116) dapat menjangkau IP komputer Dapodik dalam jaringan LAN yang sama.`;
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        errorMsg = `Autentikasi ditolak (Status ${err.response.status}). Periksa kembali apakah Token valid dan IP Server (${this.getServerNetworkInfo().primaryIp}) sudah terdaftar di whitelist Dapodik.`;
      } else if (err.message) {
        errorMsg = err.message;
      }

      return {
        success: false,
        message: errorMsg,
        targetUrl,
        details: err.response?.data || null,
      };
    }
  }

  /**
   * Menjalankan Diff Engine: Komparasi Siswa Dapodik vs Siswa Absenta.
   * Mendukung caching cerdas: hanya nembak ke Dapodik jika cache belum ada atau forceRefresh = true.
   */
  async compareStudents(
    tenantId: string,
    options?: CompareOptions,
    forceRefresh = false
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

    // 1. Ambil Data Peserta Didik (Dari Memory Cache Snapshot ATAU Tarik Fresh dari Web Service Dapodik)
    let dapodikRows: any[] = [];
    let isFromCache = false;
    let cachedAtDate = new Date();

    const existingCache = DapodikService.studentCache.get(tenantId);
    const hasValidCache = Boolean(
      existingCache &&
      Array.isArray(existingCache.rows) &&
      existingCache.rows.length > 0 &&
      existingCache.npsn === cleanNpsn &&
      existingCache.host === cleanHost
    );

    if (!forceRefresh && hasValidCache && existingCache) {
      // Gunakan snapshot in-memory (0ms network request)
      dapodikRows = existingCache.rows;
      isFromCache = true;
      cachedAtDate = existingCache.fetchedAt;
    } else {
      // Tarik fresh dari Dapodik Web Service
      try {
        const studentUrl = `${cleanHost}/WebService/getPesertaDidik?npsn=${cleanNpsn}`;
        const response = await axios.get(studentUrl, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/json',
          },
          timeout: 20000,
        });

        if (response.data && Array.isArray(response.data.rows)) {
          dapodikRows = response.data.rows;
        } else if (Array.isArray(response.data)) {
          dapodikRows = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          dapodikRows = response.data.data;
        }

        // Simpan ke in-memory snapshot cache
        cachedAtDate = new Date();
        DapodikService.studentCache.set(tenantId, {
          fetchedAt: cachedAtDate,
          rows: dapodikRows,
          npsn: cleanNpsn,
          host: cleanHost,
        });

        // Update status di database jika berhasil
        await prisma.dapodikConfig.updateMany({
          where: { tenant_id: tenantId },
          data: {
            last_sync_at: cachedAtDate,
            last_status: 'SUCCESS',
          },
        });
      } catch (err: any) {
        // Jika fetch fresh gagal tapi masih ada cache sebelumnya, fallback ke cache
        if (hasValidCache && existingCache) {
          dapodikRows = existingCache.rows;
          isFromCache = true;
          cachedAtDate = existingCache.fetchedAt;
        } else {
          throw new Error(`Gagal menarik data siswa dari Dapodik: ${err.message || 'Koneksi bermasalah'}`);
        }
      }
    }

    // 2. Tarik Data Siswa & Akademik dari Database Absenta untuk Tenant ini
    const studentWhereClause: any = { tenant_id: tenantId };
    if (opt.onlyActiveStudents) {
      studentWhereClause.status = 'AKTIF';
    }

    const absentaStudents = await prisma.siswa.findMany({
      where: studentWhereClause,
      include: {
        SiswaAkademik: {
          where: { status: 'AKTIF' },
          include: {
            kelas: {
              select: { id: true, nama_kelas: true, tingkat: true },
            },
          },
          take: 1,
        },
      },
    });

    // 3. Bangun Indeks Pencocokan (Lookup Maps) untuk Efisiensi O(N)
    const absentaByNisn = new Map<string, typeof absentaStudents[0]>();
    const absentaByNik = new Map<string, typeof absentaStudents[0]>();
    const matchedAbsentaIds = new Set<string>();

    for (const s of absentaStudents) {
      if (s.nisn && s.nisn.trim()) {
        absentaByNisn.set(s.nisn.trim().toLowerCase(), s);
      }
      if (s.nik && s.nik.trim()) {
        absentaByNik.set(s.nik.trim().toLowerCase(), s);
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
      let match: typeof absentaStudents[0] | undefined;
      if (dNisn && absentaByNisn.has(dNisn)) {
        match = absentaByNisn.get(dNisn);
      } else if (dNik && absentaByNik.has(dNik)) {
        match = absentaByNik.get(dNik);
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

        const aNama = norm(match.nama_siswa);
        const aNis = (match.nis || '').trim();
        const aNisn = (match.nisn || '').trim();
        const aNik = (match.nik || '').trim();
        const aJk = norm(match.jenis_kelamin).charAt(0) || 'L';
        const aTglLahir = match.tanggal_lahir ? new Date(match.tanggal_lahir).toISOString().split('T')[0] : null;
        const aTempatLahir = norm(match.tempat_lahir);
        const aKelas = norm(match.SiswaAkademik[0]?.kelas?.nama_kelas);

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
              absentaValue: match.SiswaAkademik[0]?.kelas?.nama_kelas,
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
          rombel: aKelas || dRombel || null,
          status: isMatch ? 'MATCH' : 'MISMATCH',
          diffs,
          dapodikRaw: dRow,
          absentaRaw: match,
        });
      }
    }

    // 5. Tambahkan Siswa Absenta yang Tidak Ditemukan di Dapodik
    for (const aStudent of absentaStudents) {
      if (!matchedAbsentaIds.has(aStudent.id)) {
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
          rombel: aStudent.SiswaAkademik[0]?.kelas?.nama_kelas || null,
          status: 'ABSENTA_ONLY',
          diffs: [],
          absentaRaw: aStudent,
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

    return {
      summary,
      lastCheckAt: new Date().toISOString(),
      cacheInfo: {
        isFromCache,
        cachedAt: cachedAtDate.toISOString(),
        totalCached: dapodikRows.length,
      },
      students: resultList,
    };
  }

  /**
   * Menyinkronkan siswa yang dipilih:
   * - 'UPDATE': Perbarui field siswa di Absenta agar sesuai dengan Dapodik
   * - 'IMPORT': Daftarkan siswa baru dari Dapodik ke Absenta
   */
  async syncStudents(
    tenantId: string,
    payload: {
      action: 'UPDATE_SELECTED' | 'IMPORT_SELECTED';
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
      }[];
    }
  ) {
    let updatedCount = 0;
    let importedCount = 0;

    for (const item of payload.students) {
      if (payload.action === 'UPDATE_SELECTED' && item.absentaId) {
        await prisma.siswa.updateMany({
          where: {
            id: item.absentaId,
            tenant_id: tenantId,
          },
          data: {
            nama_siswa: item.nama,
            nis: item.nis || undefined,
            nisn: item.nisn || undefined,
            nik: item.nik || undefined,
            jenis_kelamin: item.jenis_kelamin || undefined,
            tempat_lahir: item.tempat_lahir || undefined,
            tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir) : undefined,
          },
        });
        updatedCount++;
      } else if (payload.action === 'IMPORT_SELECTED') {
        // Cek apakah NISN sudah ada di tenant ini
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
          await prisma.siswa.create({
            data: {
              tenant_id: tenantId,
              nama_siswa: item.nama,
              nis: item.nis || item.nisn || `NIS-${Date.now()}`,
              nisn: item.nisn || null,
              nik: item.nik || null,
              jenis_kelamin: item.jenis_kelamin || 'L',
              tempat_lahir: item.tempat_lahir || null,
              tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir) : null,
            },
          });
          importedCount++;
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
