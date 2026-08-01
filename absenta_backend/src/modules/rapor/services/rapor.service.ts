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

    // 3. Ambil seluruh nilai siswa semester ini
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

    // 4. Ambil KKM/KKTP mapel untuk tingkat ini
    const listKkm = await prisma.kkmp.findMany({
      where: {
        tenant_id: tenantId,
        tingkat: siswa.Kelas.tingkat,
      },
    });

    const kkmMap = new Map<string, number>();
    listKkm.forEach((k) => kkmMap.set(k.mapel_id, k.kkm_nilai));

    // 5. Agregasi Nilai per Mata Pelajaran (Menghitung rata-rata tertimbang berdasarkan bobot jenis nilai)
    const mapelGrades: Record<string, {
      mapel_name: string;
      mapel_code: string;
      kkm: number;
      nilai_components: Array<{ jenis: string; nilai: number; bobot: number }>;
      nilai_akhir: number;
      predikat: string;
    }> = {};

    listNilai.forEach((n) => {
      if (!mapelGrades[n.mapel_id]) {
        mapelGrades[n.mapel_id] = {
          mapel_name: n.Mapel.nama_mapel,
          mapel_code: n.Mapel.kode_mapel || 'N/A',
          kkm: kkmMap.get(n.mapel_id) || 75,
          nilai_components: [],
          nilai_akhir: 0,
          predikat: 'D',
        };
      }

      mapelGrades[n.mapel_id].nilai_components.push({
        jenis: n.JenisNilai.nama,
        nilai: n.nilai,
        bobot: n.JenisNilai.bobot,
      });
    });

    // Hitung Nilai Akhir & Predikat
    Object.keys(mapelGrades).forEach((mapelId) => {
      const g = mapelGrades[mapelId];
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

    const studentGradesRaw: Record<string, Record<string, Array<{ nilai: number; bobot: number }>>> = {};
    listSiswa.forEach((s) => {
      studentGradesRaw[s.id] = {};
      mapelList.forEach((m) => {
        studentGradesRaw[s.id][m.id] = [];
      });
    });

    listNilai.forEach((n) => {
      if (studentGradesRaw[n.siswa_id] && studentGradesRaw[n.siswa_id][n.mapel_id]) {
        studentGradesRaw[n.siswa_id][n.mapel_id].push({
          nilai: n.nilai,
          bobot: n.JenisNilai.bobot,
        });
      }
    });

    const studentsData = listSiswa.map((siswa) => {
      const grades: Record<string, number> = {};
      let totalScore = 0;
      let mapelCount = 0;

      mapelList.forEach((m) => {
        const components = studentGradesRaw[siswa.id][m.id];
        let weightedSum = 0;
        let totalBobot = 0;

        components.forEach((c) => {
          weightedSum += c.nilai * c.bobot;
          totalBobot += c.bobot;
        });

        const score = totalBobot > 0 ? Math.round(weightedSum / totalBobot) : 0;
        grades[m.id] = score;

        if (score > 0) {
          totalScore += score;
          mapelCount++;
        }
      });

      const averageScore = mapelCount > 0 ? Number((totalScore / mapelCount).toFixed(2)) : 0;

      return {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '',
        grades,
        total: totalScore,
        rata_rata: averageScore,
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
}
