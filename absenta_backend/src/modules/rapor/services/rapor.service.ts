import { prisma } from '../../../utils/prisma';
import { cacheService } from '../../../utils/cache.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';

export class RaporService {
  static async upsertRapor(
    tenantId: string,
    data: {
      siswa_id: string;
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      sakit?: number;
      izin?: number;
      alpa?: number;
      catatan_wali?: string | null;
      keputusan_transisi?: string | null;
    }
  ) {
    const result = await prisma.raporSiswa.upsert({
      where: {
        siswa_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
        },
      },
      update: {
        sakit: data.sakit,
        izin: data.izin,
        alpa: data.alpa,
        catatan_wali: data.catatan_wali,
        keputusan_transisi: data.keputusan_transisi,
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        kelas_id: data.kelas_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        sakit: data.sakit || 0,
        izin: data.izin || 0,
        alpa: data.alpa || 0,
        catatan_wali: data.catatan_wali,
        keputusan_transisi: data.keputusan_transisi,
      },
    });

    // Invalidate leger cache for this class
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return result;
  }

  static async getRaporDetail(
    tenantId: string,
    filter: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    // 1. Ambil data siswa & kelas
    const siswa = await prisma.siswa.findFirst({
      where: { id: filter.siswa_id, tenant_id: tenantId },
      include: {
        Kelas: true,
      },
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan');
    }
    if (!siswa.Kelas) {
      throw new Error('Siswa belum memiliki kelas');
    }

    // 2. Ambil catatan & kehadiran rapor
    const raporSummary = await prisma.raporSiswa.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: filter.siswa_id,
        tahun_pelajaran_id: filter.tahun_pelajaran_id,
        semester_id: filter.semester_id,
      },
    });

    // 3. Ambil Struktur Kurikulum untuk tingkat & jurusan siswa
    const strukturList = await prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: filter.tahun_pelajaran_id,
        tingkat: siswa.Kelas.tingkat,
        OR: [
          { jurusan_id: null },
          { jurusan_id: siswa.Kelas.jurusan_id || undefined },
        ],
      },
      include: {
        Mapel: true,
      },
    });

    // 4. Ambil seluruh nilai siswa semester ini
    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: filter.siswa_id,
        tahun_pelajaran_id: filter.tahun_pelajaran_id,
        semester_id: filter.semester_id,
      },
      include: {
        Mapel: true,
        JenisNilai: true,
      },
    });

    // 5. Ambil KKM/KKTP mapel untuk tingkat ini
    const listKkm = await prisma.kkmp.findMany({
      where: {
        tenant_id: tenantId,
        tingkat: siswa.Kelas.tingkat,
      },
    });

    const kkmMap = new Map<string, number>();
    listKkm.forEach((k) => kkmMap.set(k.mapel_id, k.kkm_nilai));

    // 6. Inisialisasi daftar mapel dari StrukturKurikulum (fallback ke allMapel jika belum di-set)
    const mapelGrades: Record<string, {
      mapel_id: string;
      mapel_name: string;
      mapel_code: string;
      kelompok_mapel: string;
      kkm: number;
      nilai_components: Array<{ jenis: string; nilai: number; bobot: number }>;
      nilai_akhir: number;
      predikat: string;
      catatan_kompetensi?: string;
    }> = {};

    if (strukturList.length > 0) {
      strukturList.forEach((sk) => {
        if (sk.Mapel) {
          const grp = sk.kelompok || sk.Mapel.kelompok_mapel || 'Mata Pelajaran Umum';
          mapelGrades[sk.mapel_id] = {
            mapel_id: sk.mapel_id,
            mapel_name: sk.Mapel.nama_mapel,
            mapel_code: sk.Mapel.kode_mapel || 'N/A',
            kelompok_mapel: grp,
            kkm: kkmMap.get(sk.mapel_id) || 75,
            nilai_components: [],
            nilai_akhir: 0,
            predikat: '-',
            catatan_kompetensi: '',
          };
        }
      });
    } else {
      const allMapel = await prisma.mapel.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ kelompok_mapel: 'asc' }, { nama_mapel: 'asc' }],
      });
      allMapel.forEach((m) => {
        mapelGrades[m.id] = {
          mapel_id: m.id,
          mapel_name: m.nama_mapel,
          mapel_code: m.kode_mapel || 'N/A',
          kelompok_mapel: m.kelompok_mapel || 'Mata Pelajaran Umum',
          kkm: kkmMap.get(m.id) || 75,
          nilai_components: [],
          nilai_akhir: 0,
          predikat: '-',
          catatan_kompetensi: '',
        };
      });
    }

    listNilai.forEach((n) => {
      if (mapelGrades[n.mapel_id]) {
        mapelGrades[n.mapel_id].nilai_components.push({
          jenis: n.JenisNilai?.nama || 'Sumatif',
          nilai: n.nilai_rapor_final ?? n.nilai,
          bobot: n.JenisNilai?.bobot || 1,
        });
        const note = n.capaian_kompetensi || n.catatan_deskripsi;
        if (note) {
          mapelGrades[n.mapel_id].catatan_kompetensi = note;
        }
      }
    });

    // Hitung Nilai Akhir & Predikat
    Object.keys(mapelGrades).forEach((mapelId) => {
      const g = mapelGrades[mapelId];
      if (g.nilai_components.length > 0) {
        let totalWeightedScore = 0;
        let totalBobot = 0;

        g.nilai_components.forEach((c) => {
          totalWeightedScore += c.nilai * c.bobot;
          totalBobot += c.bobot;
        });

        g.nilai_akhir = totalBobot > 0 ? Math.round(totalWeightedScore / totalBobot) : 0;

        const kkm = g.kkm;
        const interval = (100 - kkm) / 3;

        if (g.nilai_akhir >= 100 - interval) {
          g.predikat = 'A';
        } else if (g.nilai_akhir >= 100 - 2 * interval) {
          g.predikat = 'B';
        } else if (g.nilai_akhir >= kkm) {
          g.predikat = 'C';
        } else {
          g.predikat = 'D';
        }
      } else {
        g.nilai_akhir = 0;
        g.predikat = '-';
      }
    });

    // Calculate 1-semester daily attendance reference from SesiAbsensi
    let referensiAbsensiHarian = { sakit: 0, izin: 0, alpa: 0 };
    const dailyLogs = await prisma.absenSiswa.groupBy({
      by: ['status'],
      where: {
        tenant_id: tenantId,
        siswa_id: filter.siswa_id,
        SesiAbsensi: {
          semester_id: filter.semester_id,
          tahun_pelajaran_id: filter.tahun_pelajaran_id,
        },
      },
      _count: { id: true },
    });
    dailyLogs.forEach((item) => {
      const count = typeof item._count === 'number' ? item._count : (item._count?.id || 0);
      const st = (item.status || '').toUpperCase();
      if (st === 'SAKIT' || st === 'S') referensiAbsensiHarian.sakit += count;
      else if (st === 'IZIN' || st === 'I') referensiAbsensiHarian.izin += count;
      else if (st === 'ALPA' || st === 'A') referensiAbsensiHarian.alpa += count;
    });

    return {
      siswa: {
        id: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nama_siswa: siswa.nama_siswa,
        kelas: siswa.Kelas.nama_kelas,
        tingkat: siswa.Kelas.tingkat,
      },
      absensi: {
        sakit: raporSummary?.sakit || 0,
        izin: raporSummary?.izin || 0,
        alpa: raporSummary?.alpa || 0,
      },
      referensi_absensi_harian: referensiAbsensiHarian,
      catatan_wali: raporSummary?.catatan_wali || '',
      keputusan_transisi: raporSummary?.keputusan_transisi || '',
      nilai_akademik: Object.values(mapelGrades),
    };
  }

  static async getLegerData(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const cacheKey = CACHE_KEYS.ACADEMIC.LEGER(tenantId, params.kelas_id, params.tahun_pelajaran_id, params.semester_id);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
    const kelas = await prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } });
    const tp = await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } });
    const sem = await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } });

    if (!kelas || !tp || !sem) {
      throw new Error('Data parameter kelas, tahun pelajaran, atau semester tidak ditemukan');
    }

    const listSiswa = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: params.kelas_id, status: 'AKTIF' },
      orderBy: { nama_siswa: 'asc' },
    });

    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        siswa_id: { in: listSiswa.map((s) => s.id) },
      },
      include: {
        Mapel: true,
        JenisNilai: true,
      },
    });

    const listRaporSummary = await prisma.raporSiswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
      },
    });
    const raporSummaryMap = new Map<string, any>();
    listRaporSummary.forEach((r) => raporSummaryMap.set(r.siswa_id, r));

    // Daily attendance reference map (1 semester)
    const referensiMap = new Map<string, { sakit: number; izin: number; alpa: number }>();
    const safeStudentIds = listSiswa.map((s) => s.id).filter((id): id is string => !!id);

    if (safeStudentIds.length > 0) {
      const dailyAttendance = await prisma.absenSiswa.groupBy({
        by: ['siswa_id', 'status'],
        where: {
          tenant_id: tenantId,
          siswa_id: { in: safeStudentIds },
          SesiAbsensi: {
            semester_id: params.semester_id,
            tahun_pelajaran_id: params.tahun_pelajaran_id,
          },
        },
        _count: { id: true },
      });

      dailyAttendance.forEach((item) => {
        if (item.siswa_id) {
          if (!referensiMap.has(item.siswa_id)) {
            referensiMap.set(item.siswa_id, { sakit: 0, izin: 0, alpa: 0 });
          }
          const ref = referensiMap.get(item.siswa_id)!;
          const count = typeof item._count === 'number' ? item._count : (item._count?.id || 0);
          const st = (item.status || '').toUpperCase();
          if (st === 'SAKIT' || st === 'S') ref.sakit += count;
          else if (st === 'IZIN' || st === 'I') ref.izin += count;
          else if (st === 'ALPA' || st === 'A') ref.alpa += count;
        }
      });
    }

    const listKkm = await prisma.kkmp.findMany({
      where: { tenant_id: tenantId, tingkat: kelas.tingkat },
    });
    const kkmMap = new Map<string, number>();
    listKkm.forEach((k) => kkmMap.set(k.mapel_id, k.kkm_nilai));

    const mapelMap = new Map<string, { id: string; nama_mapel: string; kode_mapel: string; kkm: number }>();
    listNilai.forEach((n) => {
      if (!mapelMap.has(n.mapel_id)) {
        mapelMap.set(n.mapel_id, {
          id: n.mapel_id,
          nama_mapel: n.Mapel.nama_mapel,
          kode_mapel: n.Mapel.kode_mapel || 'N/A',
          kkm: kkmMap.get(n.mapel_id) || 75,
        });
      }
    });
    const mapelList = Array.from(mapelMap.values()).sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel));

    const studentGradesRaw: Record<
      string,
      Record<string, { finalScore: number; sumatif1?: number; sumatif2?: number; sumatif3?: number; rataSumatif?: number; nilaiAkhir?: number; CP?: string }>
    > = {};

    listSiswa.forEach((s) => {
      studentGradesRaw[s.id] = {};
      mapelList.forEach((m) => {
        studentGradesRaw[s.id][m.id] = { finalScore: 0 };
      });
    });

    listNilai.forEach((n) => {
      if (studentGradesRaw[n.siswa_id] && studentGradesRaw[n.siswa_id][n.mapel_id]) {
        const finalVal = n.nilai_rapor_final ?? n.nilai ?? 0;
        studentGradesRaw[n.siswa_id][n.mapel_id] = {
          finalScore: finalVal,
          sumatif1: n.sumatif_1 ?? undefined,
          sumatif2: n.sumatif_2 ?? undefined,
          sumatif3: n.sumatif_3 ?? undefined,
          rataSumatif: n.rata_rata_sumatif ?? undefined,
          nilaiAkhir: n.nilai_akhir_sumatif ?? undefined,
          CP: n.capaian_kompetensi ?? undefined,
        };
      }
    });

    const studentsData = listSiswa.map((siswa) => {
      const grades: Record<string, number> = {};
      const gradeDetails: Record<string, any> = {};
      let totalScore = 0;
      let mapelCount = 0;

      mapelList.forEach((m) => {
        const details = studentGradesRaw[siswa.id][m.id];
        const score = details ? details.finalScore : 0;
        grades[m.id] = score;
        gradeDetails[m.id] = details;

        if (score > 0) {
          totalScore += score;
          mapelCount++;
        }
      });

      const averageScore = mapelCount > 0 ? Number((totalScore / mapelCount).toFixed(2)) : 0;
      const raporRec = raporSummaryMap.get(siswa.id);
      const refPresensi = referensiMap.get(siswa.id) || { sakit: 0, izin: 0, alpa: 0 };

      return {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '',
        grades,
        gradeDetails,
        total: totalScore,
        rata_rata: averageScore,
        sakit: raporRec?.sakit || 0,
        izin: raporRec?.izin || 0,
        alpa: raporRec?.alpa || 0,
        catatan_wali: raporRec?.catatan_wali || '',
        keputusan_transisi: raporRec?.keputusan_transisi || '',
        referensi_absensi_harian: refPresensi,
        rank: 0,
      };
    });

    studentsData.sort((a, b) => b.total - a.total);
    studentsData.forEach((student, index) => {
      student.rank = index + 1;
    });

    const studentsSortedByName = [...studentsData].sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

    return {
      kelas: { id: kelas.id, nama_kelas: kelas.nama_kelas },
      tahun_pelajaran: { id: tp.id, tahun: tp.tahun },
      semester: { id: sem.id, nama_semester: sem.nama_semester },
      mapel_list: mapelList,
      students: studentsSortedByName,
    };
      },
      CACHE_TTL.DASHBOARD
    );
  }

  static async exportLegerExcel(
    tenantId: string,
    params: {
      kelas_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const XLSX = require('xlsx');
    const data = await this.getLegerData(tenantId, params);

    const headers = ['No', 'NIS', 'NISN', 'Nama Siswa'];
    data.mapel_list.forEach((m) => {
      headers.push(`${m.nama_mapel} (KKM: ${m.kkm})`);
    });
    headers.push('Total', 'Rata-rata', 'Ranking');

    const rows = data.students.map((student, index) => {
      const rowData: Record<string, any> = {
        'No': index + 1,
        'NIS': student.nis,
        'NISN': student.nisn,
        'Nama Siswa': student.nama_siswa,
      };

      data.mapel_list.forEach((m) => {
        const score = student.grades[m.id] || 0;
        rowData[`${m.nama_mapel} (KKM: ${m.kkm})`] = score > 0 ? score : '-';
      });

      rowData['Total'] = student.total;
      rowData['Rata-rata'] = student.rata_rata;
      rowData['Ranking'] = student.rank;

      return rowData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    XLSX.utils.book_append_sheet(wb, ws, 'Leger Nilai');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `leger_${data.kelas.nama_kelas}_${data.tahun_pelajaran.tahun.replace('/', '-')}_semester_${data.semester.nama_semester}.xlsx`.replace(/\s+/g, '_');

    return {
      filename,
      buffer,
    };
  }

  static async getTranskripNilaiSiswa(tenantId: string, siswaId: string) {
    const cacheKey = CACHE_KEYS.ACADEMIC.TRANSKRIP(tenantId, siswaId);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const siswa = await prisma.siswa.findFirst({
          where: { id: siswaId, tenant_id: tenantId },
          include: { Kelas: true },
        });

        if (!siswa) {
          throw new Error('Siswa tidak ditemukan atau akses lintas tenant ditolak');
        }

        // Fetch all historical grades for this student across all semesters
        const listNilai = await prisma.nilaiSiswa.findMany({
          where: { tenant_id: tenantId, siswa_id: siswaId },
          include: {
            Mapel: true,
            TahunPelajaran: true,
            Semester: true,
          },
          orderBy: [{ Semester: { nama_semester: 'asc' } }],
        });

        // Group by Mapel across all semesters
        const mapelTranskripMap = new Map<
          string,
          {
            mapel_id: string;
            nama_mapel: string;
            kode_mapel: string;
            nilai_per_semester: Record<string, number>;
            rata_rata_kumulatif: number;
          }
        >();

        listNilai.forEach((n) => {
          if (!mapelTranskripMap.has(n.mapel_id)) {
            mapelTranskripMap.set(n.mapel_id, {
              mapel_id: n.mapel_id,
              nama_mapel: n.Mapel.nama_mapel,
              kode_mapel: n.Mapel.kode_mapel || 'N/A',
              nilai_per_semester: {},
              rata_rata_kumulatif: 0,
            });
          }
          const item = mapelTranskripMap.get(n.mapel_id)!;
          const semLabel = `${n.TahunPelajaran.tahun} - ${n.Semester.nama_semester}`;
          const finalVal = n.nilai_rapor_final ?? n.nilai ?? 0;
          item.nilai_per_semester[semLabel] = finalVal;
        });

        // Calculate cumulative average per subject and overall GPA
        let grandTotal = 0;
        let totalSubjects = 0;

        const transkripMapelList = Array.from(mapelTranskripMap.values()).map((m) => {
          const scores = Object.values(m.nilai_per_semester).filter((s) => s > 0);
          const sum = scores.reduce((acc, curr) => acc + curr, 0);
          const avg = scores.length > 0 ? Number((sum / scores.length).toFixed(2)) : 0;
          m.rata_rata_kumulatif = avg;

          if (avg > 0) {
            grandTotal += avg;
            totalSubjects++;
          }
          return m;
        });

        const gpaKumulatif = totalSubjects > 0 ? Number((grandTotal / totalSubjects).toFixed(2)) : 0;

        // Fetch SKL & UKK summary if available
        const skl = await prisma.kelulusanSiswa.findFirst({ where: { tenant_id: tenantId, siswa_id: siswaId } });
        const ukk = await prisma.sertifikatUkk.findFirst({ where: { tenant_id: tenantId, siswa_id: siswaId } });

        return {
          siswa: {
            id: siswa.id,
            nama_siswa: siswa.nama_siswa,
            nis: siswa.nis,
            nisn: siswa.nisn || '',
            kelas: siswa.Kelas?.nama_kelas || '—',
          },
          mata_pelajaran: transkripMapelList,
          rata_rata_ijazah_kumulatif: gpaKumulatif,
          skl_summary: skl ? { nomor_skl: skl.nomor_skl, status: skl.status_kelulusan, rata_rata: skl.rata_rata_nilai } : null,
          ukk_summary: ukk ? { nomor_sertifikat: ukk.nomor_sertifikat, predikat: ukk.predikat, nilai_praktik: ukk.nilai_praktik } : null,
        };
      },
      CACHE_TTL.DASHBOARD
    );
  }
}
