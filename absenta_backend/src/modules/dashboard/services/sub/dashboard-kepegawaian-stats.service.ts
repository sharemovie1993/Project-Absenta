// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { STRUKTUR_CODES } from '@/config/organization-structure';

export interface KepegawaianDashboardOptions {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export class DashboardKepegawaianStatsService {
  private helper = new DashboardCommonHelper();

  async getKepegawaianStats(tenantId: string, userId: string, options?: KepegawaianDashboardOptions) {
    const now = new Date();
    const { startOfDay: todayStart, endOfDay: todayEnd } = await this.helper.resolveDayRange(tenantId);

    // ------------------------------------------------------------------------
    // 1. Resolve Konteks Akademik (Tahun Pelajaran & Semester Aktif)
    // ------------------------------------------------------------------------
    let tahunPelajaran = null;
    if (options?.tahunPelajaranId) {
      tahunPelajaran = await prisma.tahunPelajaran.findFirst({
        where: { id: options.tahunPelajaranId, tenant_id: tenantId }
      });
    }
    if (!tahunPelajaran) {
      tahunPelajaran = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    let semester = null;
    if (options?.semesterId) {
      semester = await prisma.semester.findFirst({
        where: { id: options.semesterId, tenant_id: tenantId }
      });
    }
    if (!semester) {
      semester = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    // ------------------------------------------------------------------------
    // 2. Query Seluruh Guru & Tenaga Kependidikan (PTK)
    // ------------------------------------------------------------------------
    const [allGuru, allAssignments, todayAbsen, todayIzin, recentIzinRequests] = await Promise.all([
      prisma.guru.findMany({
        where: { tenant_id: tenantId },
        include: {
          User: {
            select: { id: true, email: true, full_name: true, is_active: true, role: true }
          },
          GuruMapel: {
            include: {
              Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } }
            }
          },
          JadwalKBM: {
            where: {
              tenant_id: tenantId,
              is_active: true,
              ...(tahunPelajaran?.id ? { tahun_pelajaran_id: tahunPelajaran.id } : {}),
              ...(semester?.id ? { semester_id: semester.id } : {})
            },
            select: { id: true, alokasi_jp: true, mapel_id: true }
          },
          GuruDocument: {
            select: { id: true, judul: true, kategori: true, created_at: true }
          }
        }
      }),

      // Ambil seluruh tugas tambahan organisasi aktif (Kaprog, Kabeng, Walas, Waka, etc.)
      prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: now } }] },
            { OR: [{ end_date: null }, { end_date: { gte: now } }] }
          ]
        },
        include: {
          Position: { select: { id: true, name: true, code: true } },
          Unit: { select: { id: true, nama: true, singkatan: true } },
          Kelas: { select: { id: true, nama_kelas: true } }
        }
      }),

      // Presensi Guru Hari Ini (Finger/Gerbang/Mobile)
      prisma.absenGuru.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, guru_id: true, status: true, jam_masuk: true, jam_pulang: true }
      }),

      // Izin/Cuti Aktif Hari Ini
      prisma.permohonanIzinGuru.findMany({
        where: {
          tenant_id: tenantId,
          status: 'DISETUJUI',
          tanggal_mulai: { lte: todayEnd },
          tanggal_selesai: { gte: todayStart }
        },
        select: { id: true, guru_id: true, tipe_izin: true, alasan: true }
      }),

      // Permohonan Cuti/Izin Menunggu Verifikasi
      prisma.permohonanIzinGuru.findMany({
        where: {
          tenant_id: tenantId,
          status: 'MENUNGGU'
        },
        take: 5,
        orderBy: { tanggal_mulai: 'desc' },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true, foto: true } }
        }
      })
    ]);

    // Map user_id -> assignments
    const assignmentsByUserId = new Map<string, any[]>();
    for (const a of allAssignments) {
      const list = assignmentsByUserId.get(a.user_id) || [];
      list.push(a);
      assignmentsByUserId.set(a.user_id, list);
    }

    // Map guru_id -> today absen
    const absenByGuruId = new Map<string, any>();
    for (const ab of todayAbsen) {
      absenByGuruId.set(ab.guru_id, ab);
    }

    // Map guru_id -> today izin
    const izinByGuruId = new Map<string, any>();
    for (const iz of todayIzin) {
      izinByGuruId.set(iz.guru_id, iz);
    }

    // ------------------------------------------------------------------------
    // 3. Kalkulasi Metrik & Breakdown
    // ------------------------------------------------------------------------
    let totalPtk = allGuru.length;
    let guruPendidikCount = 0;
    let tenagaKependidikanCount = 0;

    let pnsCount = 0;
    let pppkCount = 0;
    let gtyCount = 0;
    let honorerCount = 0;
    let lainCount = 0;

    let sertifikasiCount = 0;
    let asesorCount = 0;
    let nuptkCount = 0;

    // Beban Mengajar & Audit Dapodik
    let memenuhiJamCount = 0;
    let kurangJamCount = 0;
    const kurangJamList: any[] = [];
    const ptkListFormatted: any[] = [];

    // Presensi counts
    let hadirCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let cutiCount = 0;
    let dinasLuarCount = 0;
    let belumPresensiCount = 0;

    // Tracker KGB & Pensiun
    const mendekatiKgbList: any[] = [];
    const mendekatiPensiunList: any[] = [];

    const currentYear = now.getFullYear();

    for (const g of allGuru) {
      const isTendik = (g.jenis_ptk || '').toUpperCase() === 'TENAGA_KEPENDIDIKAN';
      if (isTendik) {
        tenagaKependidikanCount++;
      } else {
        guruPendidikCount++;
      }

      // Status Kepegawaian
      const statusRaw = (g.status_kepegawaian || '').toUpperCase();
      if (statusRaw.includes('PNS')) {
        pnsCount++;
      } else if (statusRaw.includes('PPPK') || statusRaw.includes('P3K')) {
        pppkCount++;
      } else if (statusRaw.includes('TETAP') || statusRaw.includes('GTY') || statusRaw.includes('YAYASAN')) {
        gtyCount++;
      } else if (statusRaw.includes('HONOR') || statusRaw.includes('GTT') || statusRaw.includes('KONTRAK')) {
        honorerCount++;
      } else {
        lainCount++;
      }

      // Sertifikasi & Asesor
      const hasNuptk = Boolean(g.nuptk && g.nuptk.trim().length > 5);
      if (hasNuptk) nuptkCount++;

      // Cek dokumen sertifikat pendidik atau asesor
      const docs = g.GuruDocument || [];
      const hasSertifikasi = docs.some(d => (d.kategori || '').toLowerCase().includes('sertifikasi') || (d.judul || '').toLowerCase().includes('pendidik'));
      const isAsesor = docs.some(d => (d.kategori || '').toLowerCase().includes('asesor') || (d.judul || '').toLowerCase().includes('asesor') || (d.judul || '').toLowerCase().includes('lsp'));

      if (hasSertifikasi) sertifikasiCount++;
      if (isAsesor) asesorCount++;

      // Hitung total jam tatap muka KBM
      let totalJp = (g.JadwalKBM || []).reduce((acc: number, j: any) => acc + (j.alokasi_jp || 2), 0);

      // Hitung ekuivalensi tugas tambahan
      const assignments = assignmentsByUserId.get(g.user_id) || [];
      let ekuivalensiJp = 0;
      const tugasTambahanNames: string[] = [];

      for (const a of assignments) {
        const code = (a.Position?.code || '').toUpperCase();
        tugasTambahanNames.push(a.Position?.name || 'Tugas Tambahan');
        if (code === STRUKTUR_CODES.KAPROG || code.includes('KAPROG')) {
          ekuivalensiJp += 12;
        } else if (code === STRUKTUR_CODES.KEPALA_BENGKEL || code.includes('BENGKEL') || code.includes('LAB')) {
          ekuivalensiJp += 12;
        } else if (code.includes('WAKA')) {
          ekuivalensiJp += 12;
        } else if (code === STRUKTUR_CODES.WALIKELAS || code.includes('WALI')) {
          ekuivalensiJp += 2;
        } else if (code.includes('PIKET')) {
          ekuivalensiJp += 1;
        }
      }

      const totalJamKumulatif = totalJp + ekuivalensiJp;
      const targetMinJp = g.max_jp || 24;

      if (!isTendik) {
        if (totalJamKumulatif >= targetMinJp) {
          memenuhiJamCount++;
        } else {
          kurangJamCount++;
          kurangJamList.push({
            id: g.id,
            nama: g.nama_guru,
            nip: g.nip,
            nuptk: g.nuptk,
            status: g.status_kepegawaian || 'GTT',
            mapel: g.GuruMapel?.map(m => m.Mapel?.nama_mapel).filter(Boolean).join(', ') || 'Belum diplot',
            totalJp,
            ekuivalensiJp,
            totalJamKumulatif,
            selisihKurang: targetMinJp - totalJamKumulatif,
            tugasTambahan: tugasTambahanNames
          });
        }
      }

      // Presensi Hari Ini
      const ab = absenByGuruId.get(g.id);
      const iz = izinByGuruId.get(g.id);

      let statusPresensi = 'BELUM';
      if (iz) {
        const tipe = (iz.tipe_izin || '').toUpperCase();
        if (tipe === 'CUTI') {
          cutiCount++;
          statusPresensi = 'CUTI';
        } else if (tipe === 'SAKIT') {
          sakitCount++;
          statusPresensi = 'SAKIT';
        } else if (tipe === 'DINAS_LUAR') {
          dinasLuarCount++;
          statusPresensi = 'DINAS_LUAR';
        } else {
          izinCount++;
          statusPresensi = 'IZIN';
        }
      } else if (ab) {
        hadirCount++;
        statusPresensi = 'HADIR';
      } else {
        belumPresensiCount++;
      }

      // Evaluasi Usia Pensiun (BUP) jika tanggal_lahir ada
      if (g.tanggal_lahir) {
        const birthDate = new Date(g.tanggal_lahir);
        const age = currentYear - birthDate.getFullYear();
        const bupLimit = isTendik ? 58 : 60;
        if (age >= bupLimit - 1) {
          mendekatiPensiunList.push({
            id: g.id,
            nama: g.nama_guru,
            nip: g.nip,
            usia: age,
            bupLimit,
            sisaTahun: Math.max(0, bupLimit - age),
            jabatan: g.jabatan || (isTendik ? 'Tenaga Administrasi' : 'Guru'),
            status: g.status_kepegawaian
          });
        }
      }

      // Format Item untuk daftar PTK
      ptkListFormatted.push({
        id: g.id,
        nama: g.nama_guru,
        nip: g.nip || '-',
        nuptk: g.nuptk || '-',
        nik: g.nik ? '***' + g.nik.slice(-4) : '-',
        jenisPtk: isTendik ? 'TENAGA_KEPENDIDIKAN' : 'PENDIDIK',
        statusKepegawaian: g.status_kepegawaian || 'HONORER',
        pendidikan: g.pendidikan_terakhir || 'S1',
        pangkatGolongan: g.pangkat_golongan || '-',
        jabatan: g.jabatan || (isTendik ? 'Staf Administrasi' : 'Guru Mata Pelajaran'),
        totalJamKumulatif,
        hasSertifikasi,
        isAsesor,
        statusPresensiHariIni: statusPresensi,
        foto: g.foto || null,
        noHp: g.no_hp || '-'
      });
    }

    // Urutkan kurang jam dari selisih terbesar
    kurangJamList.sort((a, b) => b.selisihKurang - a.selisihKurang);

    // Hitung persentase kehadiran hari ini
    const totalHariIni = hadirCount + izinCount + sakitCount + cutiCount + dinasLuarCount + belumPresensiCount;
    const persenKehadiran = totalHariIni > 0 ? Math.round(((hadirCount + dinasLuarCount) / totalHariIni) * 100) : 0;

    return {
      academicContext: {
        tahunPelajaran: tahunPelajaran ? { id: tahunPelajaran.id, nama: tahunPelajaran.nama, is_active: tahunPelajaran.is_active } : null,
        semester: semester ? { id: semester.id, nama: semester.nama, semester: semester.semester } : null,
      },
      summary: {
        totalPtk,
        guruPendidikCount,
        tenagaKependidikanCount,
        pnsCount,
        pppkCount,
        gtyCount,
        honorerCount: honorerCount + lainCount,
        sertifikasiCount,
        asesorCount,
        nuptkCount,
        persenKehadiran
      },
      presensiHariIni: {
        hadir: hadirCount,
        izin: izinCount,
        sakit: sakitCount,
        cuti: cutiCount,
        dinasLuar: dinasLuarCount,
        belumPresensi: belumPresensiCount,
        total: totalHariIni
      },
      bebanAjarDapodik: {
        memenuhiJamCount,
        kurangJamCount,
        kurangJamList: kurangJamList.slice(0, 10),
        totalGuruEvaluated: guruPendidikCount
      },
      urgentAlerts: {
        pendingIzinCount: recentIzinRequests.length,
        kurangJamCount,
        mendekatiPensiunCount: mendekatiPensiunList.length,
        tanpaNuptkCount: totalPtk - nuptkCount
      },
      recentIzinRequests: recentIzinRequests.map((r: any) => ({
        id: r.id,
        guruNama: r.Guru?.nama_guru || 'Pegawai',
        nip: r.Guru?.nip || '-',
        foto: r.Guru?.foto || null,
        tipeIzin: r.tipe_izin,
        alasan: r.alasan,
        tanggalMulai: r.tanggal_mulai,
        tanggalSelesai: r.tanggal_selesai
      })),
      mendekatiPensiunList,
      ptkList: ptkListFormatted
    };
  }
}
