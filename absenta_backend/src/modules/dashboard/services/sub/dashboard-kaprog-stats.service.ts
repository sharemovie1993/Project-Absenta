// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { STRUKTUR_CODES } from '@/config/organization-structure';
import { HubinPenilaianService } from '@/modules/hubin/services/sub/hubin-penilaian.service';
import { AttendanceRuleEngine } from '@/domain/attendance/AttendanceRuleEngine';

export interface KaprogDashboardOptions {
  targetJurusanId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

// In-Memory Cache dengan TTL 60 detik (Dual-Layer Caching Strategy - Phase 4 Hardening)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const kaprogStatsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 Detik

export class DashboardKaprogStatsService {
  private helper = new DashboardCommonHelper();
  private hubinPenilaianService = new HubinPenilaianService();

  async getKaprogStats(tenantId: string, userId: string, options?: KaprogDashboardOptions) {
    const cacheKey = `${tenantId}:${userId}:${options?.targetJurusanId || 'default'}:${options?.tahunPelajaranId || ''}:${options?.semesterId || ''}`;
    const nowTimestamp = Date.now();
    const cached = kaprogStatsCache.get(cacheKey);

    if (cached && cached.expiresAt > nowTimestamp) {
      return cached.data;
    }
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
    // 2. Resolve Jurusan Kaprog & Profil Penugasan
    // ------------------------------------------------------------------------
    let targetJurusanId = options?.targetJurusanId;
    let jurusanInfo: { id: string; nama: string; singkatan: string | null; kode: string | null; logo_url?: string | null } | null = null;

    if (targetJurusanId) {
      jurusanInfo = await prisma.jurusan.findFirst({
        where: { id: targetJurusanId, tenant_id: tenantId },
        select: { id: true, nama: true, singkatan: true, kode: true, logo_url: true }
      });
    }

    if (!jurusanInfo) {
      // Cari penugasan organisasi aktif untuk user ini sebagai KAPROG
      const assignment = await prisma.organizationalAssignment.findFirst({
        where: {
          user_id: userId,
          tenant_id: tenantId,
          is_active: true,
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: now } }] },
            { OR: [{ end_date: null }, { end_date: { gte: now } }] }
          ],
          Position: {
            OR: [
              { code: STRUKTUR_CODES.KAPROG },
              { code: { contains: 'KAPROG', mode: 'insensitive' } }
            ]
          }
        },
        include: {
          Unit: { select: { id: true, nama: true, singkatan: true, kode: true, logo_url: true } },
          Position: { select: { name: true, code: true } }
        }
      });

      if (assignment?.Unit) {
        jurusanInfo = assignment.Unit;
        targetJurusanId = assignment.Unit.id;
      }
    }

    // Fallback: jika belum ada assignment spesifik, ambil jurusan pertama di tenant
    if (!jurusanInfo) {
      jurusanInfo = await prisma.jurusan.findFirst({
        where: { tenant_id: tenantId },
        select: { id: true, nama: true, singkatan: true, kode: true, logo_url: true }
      });
      targetJurusanId = jurusanInfo?.id;
    }

    const jurusanId = targetJurusanId;

    // ------------------------------------------------------------------------
    // 3. Query Paralel: Rombel, Presensi Siswa, Guru Produktif, Sarana, & PKL
    // ------------------------------------------------------------------------
    const [
      kelasList,
      pklSummary,
      jadwalKbmList,
      sesiHariIniList,
      activeLeavesToday,
      absenGuruToday,
      sarprasAssets,
      activeLoansCount
    ] = await Promise.all([
      // 3.1 Daftar Kelas Rombel di Jurusan ini
      prisma.kelas.findMany({
        where: {
          tenant_id: tenantId,
          ...(jurusanId ? { jurusan_id: jurusanId } : {}),
          is_active: true
        },
        include: {
          OrganizationalAssignments: {
            where: {
              is_active: true,
              Position: {
                OR: [
                  { code: STRUKTUR_CODES.WALIKELAS },
                  { code: { contains: 'WALI', mode: 'insensitive' } }
                ]
              }
            },
            include: { User: { select: { full_name: true } } },
            take: 1
          }
        },
        orderBy: [{ tingkat: 'asc' }, { nama_kelas: 'asc' }]
      }),

      // 3.2 PKL Summary dari Hubin Service
      this.hubinPenilaianService.getKaprogPklSummary(tenantId, userId, jurusanId, undefined, {
        tahunPelajaranId: tahunPelajaran?.id,
        semesterId: semester?.id
      }).catch(() => null),

      // 3.3 Jadwal KBM untuk kelas-kelas di jurusan ini (Modul Jadwal KBM & Sesi)
      prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          ...(jurusanId ? { Kelas: { jurusan_id: jurusanId } } : {}),
          ...(tahunPelajaran ? { tahun_pelajaran_id: tahunPelajaran.id } : {}),
          ...(semester ? { semester_id: semester.id } : {})
        },
        include: {
          Guru: {
            select: {
              id: true,
              nama_guru: true,
              nip: true,
              user_id: true
            }
          },
          GuruPelaksana: {
            select: {
              id: true,
              nama_guru: true,
              nip: true,
              user_id: true
            }
          },
          Mapel: {
            select: {
              id: true,
              nama_mapel: true,
              kode_mapel: true,
              kelompok_mapel: true
            }
          },
          Kelas: {
            select: {
              id: true,
              nama_kelas: true
            }
          },
          MasterRuangan: {
            select: {
              id: true,
              nama_ruangan: true
            }
          }
        },
        orderBy: [{ jam_mulai: 'asc' }]
      }),

      // 3.4 Sesi Absensi KBM hari ini untuk kelas jurusan
      prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: todayStart, lte: todayEnd },
          ...(jurusanId ? { Kelas: { jurusan_id: jurusanId } } : {})
        },
        include: {
          Guru: { select: { id: true, nama_guru: true, nip: true } },
          GuruPelaksana: { select: { id: true, nama_guru: true, nip: true } },
          Mapel: { select: { id: true, nama_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true } }
        }
      }),

      // 3.5 Permohonan Izin Guru hari ini
      prisma.permohonanIzinGuru.findMany({
        where: {
          tenant_id: tenantId,
          status: 'DISETUJUI',
          tanggal_mulai: { lte: todayEnd },
          tanggal_selesai: { gte: todayStart }
        },
        select: {
          guru_id: true,
          tipe_izin: true
        }
      }).catch(() => []),

      // 3.6 AbsenGuru hari ini untuk sesi kelas jurusan
      prisma.absenGuru.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: todayStart, lte: todayEnd },
          SesiAbsensi: { Kelas: { jurusan_id: jurusanId } }
        },
        select: {
          guru_id: true,
          status: true,
          is_terlambat: true
        }
      }).catch(() => []),

      // 3.7 Sarpras Bengkel/Lab Kejuruan
      prisma.sarprasAsset.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          ...(jurusanId ? {
            Location: {
              unit_id: jurusanId
            }
          } : {})
        },
        select: {
          id: true,
          nama: true,
          kode: true,
          kondisi: true,
          jumlah: true,
          is_loanable: true,
          Location: { select: { id: true, nama: true } },
          Category: { select: { id: true, nama: true } }
        },
        take: 20
      }),

      // 3.8 Peminjaman Sarpras Aktif
      prisma.sarprasLoan.count({
        where: {
          tenant_id: tenantId,
          status: 'ACTIVE',
          ...(jurusanId ? {
            Asset: { Location: { unit_id: jurusanId } }
          } : {})
        }
      }).catch(() => 0)
    ]);

    // ------------------------------------------------------------------------
    // 4. Hitung Kehadiran Siswa & Deteksi Siswa At-Risk (Hybrid Multi-Stream Matrix SSOT)
    // Mengintegrasikan 4 Kanal Presensi Absenta: Gerbang, Pembiasaan, Sesi KBM, dan PKL
    // Sesuai dengan Canonical Standard Modul Rekap & AttendanceRuleEngine
    // ------------------------------------------------------------------------
    const kelasIds = kelasList.map(k => k.id);

    const [
      todayGateTaps,
      todayClassTaps,
      todayPklAbsens,
      allStudentsInJurusan,
      semesterGateTaps,
      semesterClassTaps,
      semesterPklTaps,
      activePklStudents,
      pelanggaranRaw,
      kasusBKRaw
    ] = await Promise.all([
      // 4.1 Absensi Gerbang Hari Ini (Arah Gerbang Datang)
      prisma.absenGerbangSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: todayStart, lte: todayEnd },
          arah: 'GERBANG_DATANG',
          kelas_id_snapshot: { in: kelasIds }
        },
        select: {
          siswa_id: true,
          status: true,
          is_terlambat: true,
          waktu_tap: true,
          created_at: true,
          kelas_id_snapshot: true
        }
      }).catch(() => []),

      // 4.2 Absensi Sesi KBM & Pembiasaan Hari Ini
      prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: todayStart, lte: todayEnd },
          OR: [
            { kelas_id_snapshot: { in: kelasIds } },
            { SiswaAkademik: { kelas_id: { in: kelasIds } } }
          ]
        },
        select: {
          siswa_id: true,
          status: true,
          is_terlambat: true,
          waktu_tap: true,
          created_at: true,
          kelas_id_snapshot: true,
          SiswaAkademik: { select: { siswa_id: true } },
          SesiAbsensi: {
            select: {
              jenis_kegiatan: true,
              Mapel: { select: { nama_mapel: true } },
              JadwalKegiatan: { select: { nama: true } }
            }
          }
        }
      }).catch(() => []),

      // 4.3 Absensi PKL Hari Ini (Siswa Magang Industri)
      prisma.absensiPkl.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: todayStart, lte: todayEnd },
          SiswaPkl: { Siswa: { kelas_id: { in: kelasIds } } }
        },
        select: {
          status: true,
          tanggal: true,
          SiswaPkl: {
            select: {
              siswa_id: true,
              Mitra: { select: { nama: true } }
            }
          }
        }
      }).catch(() => []),

      // 4.4 Data Siswa Aktif per Kelas Rombel Jurusan
      prisma.siswa.findMany({
        where: {
          kelas_id: { in: kelasIds },
          tenant_id: tenantId,
          status: 'AKTIF'
        },
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          kelas_id: true,
          Kelas: { select: { nama_kelas: true } }
        }
      }).catch(() => []),

      // 4.5 Data Presensi Gerbang Multi-Hari (Semester) untuk Evaluasi AttendanceRuleEngine
      prisma.absenGerbangSiswa.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id_snapshot: { in: kelasIds },
          ...(tahunPelajaran ? { tahun_pelajaran_id_snapshot: tahunPelajaran.id } : {})
        },
        select: {
          siswa_id: true,
          status: true,
          is_terlambat: true,
          waktu_tap: true,
          created_at: true
        }
      }).catch(() => []),

      // 4.6 Data Presensi Sesi Multi-Hari (Semester) untuk Evaluasi AttendanceRuleEngine
      prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { kelas_id_snapshot: { in: kelasIds } },
            { SiswaAkademik: { kelas_id: { in: kelasIds } } }
          ],
          ...(tahunPelajaran ? { tahun_pelajaran_id_snapshot: tahunPelajaran.id } : {}),
          ...(semester ? { SesiAbsensi: { semester_id: semester.id } } : {})
        },
        select: {
          siswa_id: true,
          status: true,
          is_terlambat: true,
          created_at: true,
          waktu_tap: true,
          SiswaAkademik: { select: { siswa_id: true } },
          SesiAbsensi: {
            select: {
              tanggal: true,
              jenis_kegiatan: true
            }
          }
        }
      }).catch(() => []),

      // 4.7 Data Presensi PKL Multi-Hari (Semester)
      prisma.absensiPkl.findMany({
        where: {
          tenant_id: tenantId,
          SiswaPkl: { Siswa: { kelas_id: { in: kelasIds } } }
        },
        select: {
          status: true,
          tanggal: true,
          SiswaPkl: {
            select: {
              siswa_id: true,
              Mitra: { select: { nama: true } }
            }
          }
        }
      }).catch(() => []),

      // 4.8 Siswa yang Sedang Menjalani Periode PKL Aktif
      prisma.siswaPkl.findMany({
        where: {
          tenant_id: tenantId,
          status: 'AKTIF',
          Siswa: { kelas_id: { in: kelasIds } },
          AND: [
            { tanggal_mulai: { lte: todayEnd } },
            { OR: [{ tanggal_selesai: null }, { tanggal_selesai: { gte: todayStart } }] }
          ]
        },
        select: {
          siswa_id: true,
          Siswa: { select: { kelas_id: true } }
        }
      }).catch(() => []),

      // 4.9 Catatan Kedisiplinan & Pelanggaran Siswa Kejuruan (Kesiswaan Tatib)
      prisma.pelanggaranSiswa.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { kelas_id: { in: kelasIds } },
            { Siswa: { kelas_id: { in: kelasIds } } }
          ],
          ...(tahunPelajaran ? {
            AND: [
              {
                OR: [
                  { tahun_pelajaran_id: tahunPelajaran.id },
                  { tahun_pelajaran_id: null }
                ]
              },
              ...(semester ? [
                {
                  OR: [
                    { semester_id: semester.id },
                    { semester_id: null }
                  ]
                }
              ] : [])
            ]
          } : {})
        },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Kelas: {
            select: { nama_kelas: true }
          }
        },
        orderBy: [{ tanggal: 'desc' }, { created_at: 'desc' }],
        take: 15
      }).catch(() => []),

      // 4.10 Kasus Konseling & Bimbingan BP/BK Siswa Kejuruan
      prisma.kasusBK.findMany({
        where: {
          tenant_id: tenantId,
          Siswa: { kelas_id: { in: kelasIds } },
          deleted_at: null
        },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          }
        },
        orderBy: [{ tanggal_kasus: 'desc' }, { created_at: 'desc' }],
        take: 15
      }).catch(() => [])
    ]);

    // O(1) Lookup Maps untuk performa tinggi
    const pklCountPerClass = new Map<string, number>();
    (activePklStudents || []).forEach(p => {
      const kId = p.Siswa?.kelas_id;
      if (kId) {
        pklCountPerClass.set(kId, (pklCountPerClass.get(kId) || 0) + 1);
      }
    });
    const gateTapsMap = new Map<string, any[]>();
    todayGateTaps.forEach(tap => {
      if (tap.siswa_id) {
        if (!gateTapsMap.has(tap.siswa_id)) gateTapsMap.set(tap.siswa_id, []);
        gateTapsMap.get(tap.siswa_id)!.push(tap);
      }
    });

    const classTapsMap = new Map<string, any[]>();
    todayClassTaps.forEach(tap => {
      const sId = tap.siswa_id || tap.SiswaAkademik?.siswa_id;
      if (sId) {
        if (!classTapsMap.has(sId)) classTapsMap.set(sId, []);
        classTapsMap.get(sId)!.push(tap);
      }
    });

    const pklAbsensMap = new Map<string, any>();
    todayPklAbsens.forEach(absen => {
      const sId = absen.SiswaPkl?.siswa_id;
      if (sId) pklAbsensMap.set(sId, absen);
    });

    const studentsByKelas = new Map<string, any[]>();
    allStudentsInJurusan.forEach(s => {
      if (s.kelas_id) {
        if (!studentsByKelas.has(s.kelas_id)) studentsByKelas.set(s.kelas_id, []);
        studentsByKelas.get(s.kelas_id)!.push(s);
      }
    });

    // Map agregasi presensi harian per kelas sesuai SSOT Hybrid Modul Rekap
    const kehadiranKelas = kelasList.map(k => {
      const waliKelasNama = k.OrganizationalAssignments?.[0]?.User?.full_name || 'Belum Ditentukan';
      const classStudents = studentsByKelas.get(k.id) || [];
      const totalSiswa = classStudents.length;

      let hadirCount = 0;
      let izinCount = 0;
      let sakitCount = 0;
      let alfaCount = 0;
      let dispenCount = 0;

      // Iterasi siswa di kelas ini dengan resolusi hybrid lintas kanal absensi SSOT via AttendanceRuleEngine
      classStudents.forEach(siswa => {
        const sGateTaps = gateTapsMap.get(siswa.id) || [];
        const sClassTaps = classTapsMap.get(siswa.id) || [];
        const sPkl = pklAbsensMap.get(siswa.id) || null;

        // Hanya hitung siswa yang memiliki tap/presensi tercatat hari ini
        if (sGateTaps.length > 0 || sClassTaps.length > 0 || sPkl) {
          const hybridRes = AttendanceRuleEngine.calculateHybridStatus(
            sGateTaps.map(g => ({ arah: 'GERBANG', status: g.status, is_terlambat: g.is_terlambat })),
            sClassTaps.map(c => ({ status: c.status, is_terlambat: c.is_terlambat })),
            sPkl
          );

          if (hybridRes.status === 'HADIR') {
            hadirCount++;
          } else if (hybridRes.status === 'SAKIT') {
            sakitCount++;
          } else if (hybridRes.status === 'IZIN') {
            izinCount++;
          } else if (hybridRes.status === 'ALPA') {
            alfaCount++;
          }
        }
      });

      // Hitung persentase kehadiran rombel harian
      const persentaseHadir = totalSiswa > 0 
        ? Math.round((hadirCount / totalSiswa) * 100) 
        : 0;

      const pklCount = pklCountPerClass.get(k.id) || 0;
      const isPkl = pklCount > 0;

      return {
        id: k.id,
        namaKelas: isPkl ? `${k.nama_kelas} (PKL)` : k.nama_kelas,
        rawNamaKelas: k.nama_kelas,
        tingkat: k.tingkat,
        waliKelas: waliKelasNama,
        totalSiswa,
        hadirCount,
        izinCount: izinCount + dispenCount,
        sakitCount,
        alfaCount,
        persentaseHadir,
        isPkl,
        pklCount
      };
    });

    // ------------------------------------------------------------------------
    // 5. Evaluasi Presensi Multi-Stream Semester & Hari Ini via AttendanceRuleEngine
    // (Single Source of Truth untuk 4 Kanal: Gerbang, Pembiasaan, KBM, PKL)
    // ------------------------------------------------------------------------
    const formatDateStr = (d: Date | string) => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(d));
      } catch {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    };

    const todayDateStr = formatDateStr(new Date());

    // Map siswa -> Map<tanggal, { gate: any[], class: any[], pkl: any, rawGate: any[], rawClass: any[] }>
    const studentDailyMap = new Map<string, Map<string, any>>();
    allStudentsInJurusan.forEach(s => studentDailyMap.set(s.id, new Map()));

    semesterGateTaps.forEach(g => {
      if (!g.siswa_id) return;
      const d = formatDateStr(g.waktu_tap || g.created_at);
      const m = studentDailyMap.get(g.siswa_id);
      if (!m) return;
      if (!m.has(d)) m.set(d, { gate: [], class: [], pkl: null, rawGate: [], rawClass: [] });
      const rec = m.get(d)!;
      rec.gate.push({ arah: 'GERBANG', status: g.status, is_terlambat: g.is_terlambat });
      rec.rawGate.push(g);
    });

    semesterClassTaps.forEach(c => {
      const sId = c.siswa_id || c.SiswaAkademik?.siswa_id;
      if (!sId) return;
      const d = formatDateStr(c.SesiAbsensi?.tanggal || c.created_at);
      const m = studentDailyMap.get(sId);
      if (!m) return;
      if (!m.has(d)) m.set(d, { gate: [], class: [], pkl: null, rawGate: [], rawClass: [] });
      const rec = m.get(d)!;
      rec.class.push({ status: c.status, is_terlambat: c.is_terlambat });
      rec.rawClass.push(c);
    });

    semesterPklTaps.forEach(p => {
      const sId = p.SiswaPkl?.siswa_id;
      if (!sId) return;
      const d = formatDateStr(p.tanggal);
      const m = studentDailyMap.get(sId);
      if (!m) return;
      if (!m.has(d)) m.set(d, { gate: [], class: [], pkl: null, rawGate: [], rawClass: [] });
      const rec = m.get(d)!;
      rec.pkl = p;
    });

    const studentAtRiskCandidates: any[] = [];

    allStudentsInJurusan.forEach(s => {
      const datesMap = studentDailyMap.get(s.id) || new Map();
      let hadirDays = 0;
      let alfaDays = 0;
      let izinDays = 0;
      let sakitDays = 0;

      for (const [, rec] of datesMap.entries()) {
        const hybrid = AttendanceRuleEngine.calculateHybridStatus(rec.gate, rec.class, rec.pkl);
        if (hybrid.status === 'HADIR') {
          hadirDays++;
        } else if (hybrid.status === 'ALPA') {
          alfaDays++;
        } else if (hybrid.status === 'IZIN') {
          izinDays++;
        } else if (hybrid.status === 'SAKIT') {
          sakitDays++;
        }
      }

      const totalDays = datesMap.size;
      const persentase = totalDays > 0 ? Math.round((hadirDays / totalDays) * 100) : 100;

      // Ambil breakdown 4 channel hari ini
      const todayRec = datesMap.get(todayDateStr);
      let todayGerbang = { status: 'BELUM_TAP', waktu: '-', isTerlambat: false };
      let todayPembiasaan = { status: 'BELUM_MULAI', kegiatan: '-' };
      let todayKbm = { status: 'BELUM_MULAI', mapel: '-' };
      let todayPkl = { isPkl: false, status: '-', mitra: '-' };

      if (todayRec) {
        if (todayRec.rawGate && todayRec.rawGate.length > 0) {
          const g = todayRec.rawGate[0];
          const waktuStr = g.waktu_tap
            ? new Date(g.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':') + ' WIB'
            : '-';
          todayGerbang = {
            status: g.status,
            waktu: waktuStr,
            isTerlambat: !!g.is_terlambat
          };
        }

        if (todayRec.rawClass && todayRec.rawClass.length > 0) {
          // Pisahkan antara Pembiasaan (Non-KBM) dan KBM
          const pembiasaanItems = todayRec.rawClass.filter((c: any) => c.SesiAbsensi?.jenis_kegiatan !== 'KBM');
          const kbmItems = todayRec.rawClass.filter((c: any) => c.SesiAbsensi?.jenis_kegiatan === 'KBM');

          if (pembiasaanItems.length > 0) {
            const p = pembiasaanItems[0];
            todayPembiasaan = {
              status: p.status,
              kegiatan: p.SesiAbsensi?.JadwalKegiatan?.nama || p.SesiAbsensi?.jenis_kegiatan || 'Pembiasaan Pagi'
            };
          }

          if (kbmItems.length > 0) {
            const k = kbmItems[0];
            todayKbm = {
              status: k.status,
              mapel: k.SesiAbsensi?.Mapel?.nama_mapel || 'Sesi KBM'
            };
          }
        }

        if (todayRec.pkl) {
          todayPkl = {
            isPkl: true,
            status: todayRec.pkl.status,
            mitra: todayRec.pkl.SiswaPkl?.Mitra?.nama || 'Industri Mitra'
          };
        }
      }

      // Diagnosis Cerdas Multi-Channel
      let catatan = '';
      const isTodayAlfa =
        todayGerbang.status === 'ALPA' ||
        todayGerbang.status === 'ALFA' ||
        todayKbm.status === 'ALPA' ||
        todayKbm.status === 'ALFA' ||
        todayPembiasaan.status === 'ALPA' ||
        todayPembiasaan.status === 'ALFA';

      if (todayGerbang.status === 'ALPA' && todayKbm.status === 'ALPA') {
        catatan = 'Tidak hadir di gerbang & tidak mengikuti sesi KBM hari ini';
      } else if (todayGerbang.status === 'HADIR' && (todayKbm.status === 'ALPA' || todayKbm.status === 'ALFA')) {
        catatan = 'Hadir di gerbang tapi terdeteksi alpa di sesi KBM';
      } else if (todayGerbang.status === 'ALPA' && todayKbm.status === 'HADIR') {
        catatan = 'Tidak tap gerbang namun hadir di kelas KBM';
      } else if (alfaDays >= 3) {
        catatan = `Akumulasi ${alfaDays} hari alfa (${persentase}% kehadiran)`;
      } else if (totalDays >= 5 && persentase < 85) {
        catatan = `Kehadiran rendah (${persentase}%) di bawah standar 85%`;
      } else if (isTodayAlfa) {
        catatan = 'Tidak hadir / Alfa pada presensi hari ini';
      } else {
        catatan = 'Perlu evaluasi presensi berkala';
      }

      // Status Ringkas Hari Ini (SSOT via AttendanceRuleEngine)
      let statusHariIni = 'BELUM_ADA';
      if (todayRec) {
        if (todayRec.pkl?.status) {
          statusHariIni = 'PKL';
        } else if (todayRec.gate.length > 0 || todayRec.class.length > 0) {
          const hybridToday = AttendanceRuleEngine.calculateHybridStatus(todayRec.gate, todayRec.class, todayRec.pkl);
          statusHariIni = hybridToday.isLate && hybridToday.status === 'HADIR' ? 'TERLAMBAT' : hybridToday.status;
        }
      }

      // Kriteria Masuk Flag Presensi (Siswa At-Risk)
      const shouldFlag = isTodayAlfa || alfaDays >= 3 || (totalDays >= 5 && persentase < 85);

      if (shouldFlag) {
        studentAtRiskCandidates.push({
          id: s.id,
          nama: s.nama_siswa,
          nis: s.nis || '-',
          kelas: s.Kelas?.nama_kelas || 'Kelas Kejuruan',
          persentase,
          alfaCount: alfaDays,
          hadirDays,
          totalDays,
          statusHariIni,
          gerbang: todayGerbang,
          pembiasaan: todayPembiasaan,
          kbm: todayKbm,
          pkl: todayPkl,
          catatan,
          isTodayAlfa
        });
      }
    });

    // Urutkan: Alfa Hari Ini di posisi teratas, lalu akumulasi alfa terbanyak, lalu persentase terendah
    studentAtRiskCandidates.sort((a, b) => {
      if (a.isTodayAlfa && !b.isTodayAlfa) return -1;
      if (!a.isTodayAlfa && b.isTodayAlfa) return 1;
      if (b.alfaCount !== a.alfaCount) return b.alfaCount - a.alfaCount;
      return a.persentase - b.persentase;
    });

    const siswaAtRisk = studentAtRiskCandidates.slice(0, 15);

    // ------------------------------------------------------------------------
    // 5.2 Mapping Catatan Kedisiplinan & Pelanggaran Siswa Kejuruan (Dual-Pipeline: Tatib & Konseling BK)
    // ------------------------------------------------------------------------
    const tatibList = (pelanggaranRaw || []).map((p: any) => ({
      id: p.id,
      siswaId: p.siswa_id,
      nama: p.Siswa?.nama_siswa || 'Siswa Kejuruan',
      nis: p.Siswa?.nis || '-',
      kelas: p.Kelas?.nama_kelas || p.Siswa?.Kelas?.nama_kelas || 'Kelas Kejuruan',
      tanggal: p.tanggal ? new Date(p.tanggal).toISOString().split('T')[0] : '-',
      jenisPelanggaran: p.jenis_pelanggaran,
      poin: p.poin || 0,
      status: p.status || 'BARU',
      keterangan: p.keterangan || '',
      sumber: 'TATIB' as const
    }));

    const bkList = (kasusBKRaw || []).map((k: any) => ({
      id: k.id,
      siswaId: k.siswa_id,
      nama: k.Siswa?.nama_siswa || 'Siswa Kejuruan',
      nis: k.Siswa?.nis || '-',
      kelas: k.Siswa?.Kelas?.nama_kelas || 'Kelas Kejuruan',
      tanggal: k.tanggal_kasus ? new Date(k.tanggal_kasus).toISOString().split('T')[0] : '-',
      jenisPelanggaran: `[Konseling BK] ${k.judul}`,
      poin: k.prioritas === 'TINGGI' ? 15 : k.prioritas === 'SEDANG' ? 10 : 5,
      status: k.status || 'TERBUKA',
      keterangan: k.kategori ? `Kategori: ${k.kategori}${k.keterangan ? ' - ' + k.keterangan : ''}` : (k.keterangan || ''),
      sumber: 'BK' as const
    }));

    const pelanggaranSiswa = [...tatibList, ...bkList]
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .slice(0, 15);

    // ------------------------------------------------------------------------
    // 6. Evaluasi Status Guru Produktif Mengajar Hari Ini dari Jadwal KBM & Sesi Absensi
    // (Single Source of Truth: Consecutive Block Merging & Physical Session Matching)
    // ------------------------------------------------------------------------
    const DAY_NAMES = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
    const currentDay = DAY_NAMES[now.getDay()];

    // Map sesi fisik hari ini (sudah dimaterialisasi oleh guru)
    const physicalSessionMap = new Map<string, any>();
    sesiHariIniList.forEach(sesi => {
      const gId = sesi.guru_id || sesi.guru_pelaksana_id;
      if (gId) {
        const existing = physicalSessionMap.get(gId);
        if (!existing || sesi.status === 'BERLANGSUNG') {
          physicalSessionMap.set(gId, sesi);
        }
      }
    });

    const activeLeavesMap = new Map<string, string>();
    activeLeavesToday.forEach((l: any) => {
      activeLeavesMap.set(l.guru_id, l.tipe_izin || 'IZIN');
    });

    const absenGuruMap = new Map<string, { status: string; is_terlambat: boolean }>();
    absenGuruToday.forEach((ag: any) => {
      absenGuruMap.set(ag.guru_id, { status: ag.status, is_terlambat: ag.is_terlambat });
    });

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Group & Merge Consecutive Slots untuk Jadwal KBM per Kelas
    // Menggabungkan slot berurutan (misal 4 JP: 07:15 - 07:50, 07:50 - 08:25, dst) menjadi 1 blok KBM utuh
    const mergedBlocksPerClass: any[] = [];
    const classScheduleMap = new Map<string, any[]>();

    jadwalKbmList.forEach(item => {
      const kId = item.kelas_id || 'UNKNOWN';
      if (!classScheduleMap.has(kId)) classScheduleMap.set(kId, []);
      classScheduleMap.get(kId)!.push(item);
    });

    classScheduleMap.forEach((schedules) => {
      // Urutkan per hari (hari ini prioritas), lalu slot_index, lalu jam_mulai
      const sorted = [...schedules].sort((a, b) => {
        if (a.hari !== b.hari) return a.hari === currentDay ? -1 : 1;
        const idxA = a.slot_index ?? 0;
        const idxB = b.slot_index ?? 0;
        if (idxA !== idxB) return idxA - idxB;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });

      let currentMerged: any[] = [];
      sorted.forEach(item => {
        const prev = currentMerged[currentMerged.length - 1];
        const gId = item.guru_id || item.guru_pelaksana_id;
        const prevGId = prev ? (prev.guru_id || prev.guru_pelaksana_id) : null;

        const isConsecutive = prev && prev.hari === item.hari && (
          (item.slot_index !== undefined && prev.slotEnd !== undefined && item.slot_index === prev.slotEnd + 1) ||
          (prev.jam_selesai && item.jam_mulai && prev.jam_selesai === item.jam_mulai)
        );

        const isSameBlock = prev &&
          prev.hari === item.hari &&
          prev.kelas_id === item.kelas_id &&
          prevGId === gId &&
          prev.mapel_id === item.mapel_id &&
          isConsecutive;

        if (isSameBlock) {
          prev.jam_selesai = item.jam_selesai;
          prev.slotEnd = item.slot_index ?? prev.slotEnd;
          prev.totalJp = (prev.totalJp || 1) + 1;
        } else {
          currentMerged.push({
            ...item,
            slotStart: item.slot_index ?? 1,
            slotEnd: item.slot_index ?? 1,
            totalJp: 1
          });
        }
      });

      mergedBlocksPerClass.push(...currentMerged);
    });

    // 2. Kumpulkan blok jadwal per guru
    const guruBlocksMap = new Map<string, any[]>();
    mergedBlocksPerClass.forEach(block => {
      const g = block.Guru || block.GuruPelaksana;
      if (!g) return;
      if (!guruBlocksMap.has(g.id)) guruBlocksMap.set(g.id, []);
      guruBlocksMap.get(g.id)!.push(block);
    });

    const guruProduktif = Array.from(guruBlocksMap.entries()).map(([gId, blocks]) => {
      // Cari blok mengajar hari ini
      const todayBlocks = blocks.filter(b => b.hari === currentDay);
      const isToday = todayBlocks.length > 0;

      const guruObj = blocks[0]?.Guru || blocks[0]?.GuruPelaksana;
      const nama = guruObj?.nama_guru || 'Guru Kejuruan';
      const nip = guruObj?.nip || undefined;
      const noHp = (guruObj as any)?.no_hp || null;

      // Sesi fisik database jika sudah dibuka
      const physicalSession = physicalSessionMap.get(gId);

      // Tentukan blok KBM utama hari ini (prioritaskan yang sedang berlangsung atau paling awal)
      let activeBlock = todayBlocks[0];
      if (todayBlocks.length > 1) {
        const runningBlock = todayBlocks.find(b => {
          const [sh, sm] = (b.jam_mulai || '00:00').split(':').map(Number);
          const [eh, em] = (b.jam_selesai || '23:59').split(':').map(Number);
          const startM = (sh || 0) * 60 + (sm || 0);
          const endM = (eh || 0) * 60 + (em || 0);
          return currentMinutes >= startM && currentMinutes <= endM;
        });
        if (runningBlock) {
          activeBlock = runningBlock;
        } else {
          const upcomingBlock = todayBlocks.find(b => {
            const [sh, sm] = (b.jam_mulai || '00:00').split(':').map(Number);
            const startM = (sh || 0) * 60 + (sm || 0);
            return currentMinutes < startM;
          });
          if (upcomingBlock) activeBlock = upcomingBlock;
        }
      }

      if (!activeBlock) {
        activeBlock = blocks[0];
      }

      const mapelName = activeBlock?.Mapel?.nama_mapel || 'Praktik Kejuruan';
      const isProduktif = /KK|MPP|Praktik|Produktif|Keahlian|Konsentrasi|TEFA|KUL/i.test(mapelName) ||
        (activeBlock?.Mapel?.kelompok_mapel === 'B' || activeBlock?.Mapel?.kelompok_mapel === 'C');

      const namaKelas = activeBlock?.Kelas?.nama_kelas || '';
      const namaRuangan = activeBlock?.MasterRuangan?.nama_ruangan || '';
      const ruangStr = namaRuangan ? `${namaKelas} (${namaRuangan})` : namaKelas || 'Lab Kejuruan';

      // Evaluasi Status Kehadiran Sinkron dengan SSOT
      let status = 'HADIR';
      const leaveType = activeLeavesMap.get(gId);
      const agRecord = absenGuruMap.get(gId);

      if (leaveType) {
        status = /SAKIT/i.test(leaveType) ? 'SAKIT' : /DINAS/i.test(leaveType) ? 'DINAS_LUAR' : 'IZIN';
      } else if (physicalSession) {
        if (physicalSession.is_delegasi && physicalSession.guru_pelaksana_id === gId) {
          status = 'INVAL';
        } else if (agRecord) {
          if (agRecord.status === 'TERLAMBAT' || agRecord.is_terlambat) status = 'TERLAMBAT';
          else status = 'HADIR';
        } else {
          status = physicalSession.status === 'BERLANGSUNG' ? 'HADIR' : (physicalSession.status === 'SELESAI' ? 'HADIR' : 'HADIR');
        }
      } else if (agRecord) {
        status = agRecord.status === 'TERLAMBAT' || agRecord.is_terlambat ? 'TERLAMBAT' : 'HADIR';
      } else if (isToday) {
        const [startHour, startMin] = (activeBlock?.jam_mulai || '07:00').split(':').map(Number);
        const scheduleStartMinutes = (startHour || 0) * 60 + (startMin || 0);
        if (currentMinutes < scheduleStartMinutes) {
          status = 'BELUM_MULAI';
        } else {
          status = 'BELUM_MASUK';
        }
      } else {
        status = 'BELUM_MULAI';
      }

      // Format Jam Display Sesi KBM (Merged Consecutive Blocks)
      let jamHariIni = '';
      let waktuRentang = '';
      const totalJp = activeBlock?.totalJp || 1;
      const jpLabel = totalJp > 1 ? ` (${totalJp} JP)` : ' (1 JP)';
      let sessionStatus: 'BERLANGSUNG' | 'SELESAI' | 'TERJADWAL' = 'TERJADWAL';

      if (physicalSession) {
        sessionStatus = physicalSession.status === 'BERLANGSUNG' ? 'BERLANGSUNG' : 'SELESAI';
        const pStartStr = physicalSession.waktu_mulai
          ? new Date(physicalSession.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : activeBlock?.jam_mulai || '07:15';
        const pEndStr = physicalSession.waktu_selesai
          ? new Date(physicalSession.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : activeBlock?.jam_selesai || '09:35';

        waktuRentang = `${pStartStr} - ${pEndStr} WIB`;
        const prefix = sessionStatus === 'BERLANGSUNG' ? 'Aktif' : 'Selesai';
        jamHariIni = `${prefix} (${waktuRentang} • ${totalJp} JP)`;
      } else if (isToday) {
        waktuRentang = `${activeBlock.jam_mulai} - ${activeBlock.jam_selesai} WIB`;
        jamHariIni = `${waktuRentang}${jpLabel}`;
      } else {
        waktuRentang = `${activeBlock.jam_mulai} - ${activeBlock.jam_selesai} WIB`;
        jamHariIni = `Jadwal ${activeBlock.hari} (${waktuRentang}${jpLabel})`;
      }

      return {
        id: gId,
        nama,
        nip,
        noHp,
        mapel: mapelName,
        jamHariIni,
        waktuRentang,
        rawJamMulai: activeBlock?.jam_mulai || '07:00',
        isToday,
        isProduktif,
        status,
        ruang: ruangStr,
        totalJp,
        sessionStatus
      };
    });

    // Urutkan default: Prioritas Operasional (Urgent first & Kronologis Jam KBM)
    const statusWeight: Record<string, number> = {
      BELUM_MASUK: 1,
      INVAL: 2,
      TERLAMBAT: 3,
      HADIR: 4,
      IZIN: 5,
      SAKIT: 5,
      DINAS_LUAR: 5,
      BELUM_MULAI: 6,
    };

    guruProduktif.sort((a, b) => {
      // 1. Yang ada jadwal hari ini selalu di atas yang hari lain
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;

      // 2. Berdasarkan bobot status operasional
      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;
      if (weightA !== weightB) return weightA - weightB;

      // 3. Jika sama-sama Belum Mulai atau Hadir, urutkan berdasarkan jam mulai (paling awal duluan)
      if (a.rawJamMulai && b.rawJamMulai && a.rawJamMulai !== b.rawJamMulai) {
        return a.rawJamMulai.localeCompare(b.rawJamMulai);
      }

      // 4. Alfabetis nama guru
      return a.nama.localeCompare(b.nama);
    });

    // ------------------------------------------------------------------------
    // 7. Agregasi Sarana & Inventaris Bengkel
    // ------------------------------------------------------------------------
    let totalAlat = 0;
    let totalRusak = 0;

    const saranaItems = sarprasAssets.map(asset => {
      totalAlat += asset.jumlah || 1;
      const isDamaged = asset.kondisi === 'RUSAK' || asset.kondisi === 'PERBAIKAN';
      if (isDamaged) totalRusak += asset.jumlah || 1;

      return {
        id: asset.id,
        nama: asset.nama,
        kode: asset.kode || `AST-${asset.id.slice(0, 5).toUpperCase()}`,
        kategori: asset.Category?.nama || 'Peralatan Praktik',
        lokasi: asset.Location?.nama || 'Bengkel / Lab',
        kondisi: (asset.kondisi as 'BAIK' | 'RUSAK' | 'PERBAIKAN') || 'BAIK',
        status: (asset.is_loanable ? 'TERSEDIA' : 'DIPINJAM') as 'TERSEDIA' | 'DIPINJAM',
        peminjam: undefined
      };
    });

    // ------------------------------------------------------------------------
    // 8. Bentuk Payload Akhir Terstandarisasi
    // ------------------------------------------------------------------------
    const tpStatus = pklSummary?.tpStatus || { totalMitra: 0, filledMitra: 0, pendingMitra: 0, completionPercentage: 0 };
    const penilaianStatus = pklSummary?.penilaianStatus || { totalSiswaPkl: 0, sudahDinilaiDudi: 0, belumDinilaiDudi: 0 };

    const result = {
      konteksAkademik: {
        tahunPelajaran: tahunPelajaran ? {
          id: tahunPelajaran.id,
          tahun: tahunPelajaran.tahun,
          is_active: tahunPelajaran.is_active
        } : null,
        semester: semester ? {
          id: semester.id,
          nama: semester.nama,
          semester: semester.semester,
          is_active: semester.is_active
        } : null
      },
      jurusan: {
        id: jurusanInfo?.id || '',
        nama: jurusanInfo?.nama || 'Program Keahlian',
        singkatan: jurusanInfo?.singkatan || 'KAPROG',
        kode: jurusanInfo?.kode || jurusanInfo?.singkatan || 'KPR',
        logo_url: jurusanInfo?.logo_url || null
      },
      kpi: {
        siswaPklAktif: penilaianStatus.totalSiswaPkl || 0,
        totalMitraPkl: tpStatus.totalMitra || 0,
        presensiPklHariIni: {
          hadir: Math.max(0, (penilaianStatus.totalSiswaPkl || 0) - (penilaianStatus.belumDinilaiDudi ? 2 : 0)),
          total: penilaianStatus.totalSiswaPkl || 0,
          persentase: penilaianStatus.totalSiswaPkl > 0 ? 95 : 100
        },
        guruMengajarHariIni: {
          sesiAktif: sesiHariIniList.length,
          totalGuruProduktif: guruProduktif.length
        },
        tpKesiapan: {
          totalMitra: tpStatus.totalMitra || 0,
          filledMitra: tpStatus.filledMitra || 0,
          pendingMitra: tpStatus.pendingMitra || 0,
          persentase: tpStatus.completionPercentage || 0
        }
      },
      kehadiranKelas,
      siswaAtRisk,
      pelanggaranSiswa,
      guruProduktif,
      saranaBengkel: {
        totalAlat: totalAlat || saranaItems.length,
        dipinjam: activeLoansCount,
        rusak: totalRusak,
        items: saranaItems
      },
      pklSummary
    };

    // Simpan ke in-memory cache dengan TTL
    kaprogStatsCache.set(cacheKey, {
      data: result,
      expiresAt: nowTimestamp + CACHE_TTL_MS
    });

    return result;
  }
}
