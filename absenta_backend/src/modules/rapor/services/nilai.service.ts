import { prisma } from '../../../utils/prisma';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export class NilaiService {
  // === JENIS PENILAIAN MASTER ===
  static async getAllJenis(tenantId: string) {
    return prisma.jenisNilaiMaster.findMany({
      where: { tenant_id: tenantId },
      orderBy: { kode: 'asc' },
    });
  }

  static async createJenis(tenantId: string, data: { nama: string; kode: string; bobot: number; is_active?: boolean }) {
    return prisma.jenisNilaiMaster.create({
      data: {
        tenant_id: tenantId,
        ...data,
      },
    });
  }

  static async updateJenis(tenantId: string, id: string, data: Partial<{ nama: string; kode: string; bobot: number; is_active: boolean }>) {
    // Pastikan kepemilikan tenant
    const existing = await prisma.jenisNilaiMaster.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Jenis penilaian tidak ditemukan atau bukan milik tenant Anda');
    }

    return prisma.jenisNilaiMaster.update({
      where: { id },
      data,
    });
  }

  static async deleteJenis(tenantId: string, id: string) {
    const existing = await prisma.jenisNilaiMaster.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Jenis penilaian tidak ditemukan atau bukan milik tenant Anda');
    }

    return prisma.jenisNilaiMaster.delete({
      where: { id },
    });
  }

  // === NILAI SISWA ===
  static async getNilai(
    tenantId: string,
    filter: {
      siswa_id?: string;
      mapel_id?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      jenis_nilai_id?: string;
      kelas_id?: string; // Filter berdasarkan siswa di kelas tertentu
    }
  ) {
    return prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(filter.mapel_id ? { mapel_id: filter.mapel_id } : {}),
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.semester_id ? { semester_id: filter.semester_id } : {}),
        ...(filter.jenis_nilai_id ? { jenis_nilai_id: filter.jenis_nilai_id } : {}),
        ...(filter.kelas_id
          ? {
              Siswa: {
                kelas_id: filter.kelas_id,
              },
            }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nama_siswa: true,
          },
        },
        Mapel: true,
        JenisNilai: true,
      },
      orderBy: [
        { Siswa: { nama_siswa: 'asc' } },
        { Mapel: { nama_mapel: 'asc' } },
      ],
    });
  }

  static async upsertNilai(
    tenantId: string,
    data: {
      siswa_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id: string;
      nilai: number;
      catatan_deskripsi?: string | null;
      sesi_absensi_id?: string | null;
    }
  ) {
    const result = await prisma.nilaiSiswa.upsert({
      where: {
        siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
        },
      },
      update: {
        nilai: data.nilai,
        catatan_deskripsi: data.catatan_deskripsi || null,
        sesi_absensi_id: data.sesi_absensi_id || null,
        ...(data.jenis_nilai_id ? { jenis_nilai_id: data.jenis_nilai_id } : {}),
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        jenis_nilai_id: data.jenis_nilai_id || null,
        nilai: data.nilai,
        catatan_deskripsi: data.catatan_deskripsi || null,
        sesi_absensi_id: data.sesi_absensi_id || null,
      },
    });

    // Invalidate leger cache — nilai berubah, leger harus direcalculate
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return result;
  }

  static async upsertBulkNilai(
    tenantId: string,
    data: {
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id?: string | null;
      sesi_absensi_id?: string | null;
      scores: Array<{
        siswa_id: string;
        nilai: number;
        catatan_deskripsi?: string | null;
      }>;
    }
  ) {
    const operations = data.scores.map((score) => {
      return prisma.nilaiSiswa.upsert({
        where: {
          siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
            siswa_id: score.siswa_id,
            mapel_id: data.mapel_id,
            tahun_pelajaran_id: data.tahun_pelajaran_id,
            semester_id: data.semester_id,
          },
        },
        update: {
          nilai: score.nilai,
          catatan_deskripsi: score.catatan_deskripsi || null,
          sesi_absensi_id: data.sesi_absensi_id || null,
          ...(data.jenis_nilai_id ? { jenis_nilai_id: data.jenis_nilai_id } : {}),
        },
        create: {
          tenant_id: tenantId,
          siswa_id: score.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          jenis_nilai_id: data.jenis_nilai_id || null,
          nilai: score.nilai,
          catatan_deskripsi: score.catatan_deskripsi || null,
          sesi_absensi_id: data.sesi_absensi_id || null,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    // Invalidate leger cache — batch nilai berubah, leger harus direcalculate
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return results;
  }

  /**
   * 📊 BATCH UPSERT SUMATIF (S1, S2, S3, NILAI AKHIR, CP NARASI)
   * Formula: Nilai Rapor Final = (Rata-rata(S1, S2, S3) + Nilai Akhir) / 2
   */
  static async upsertBatchSumatifNilai(
    tenantId: string,
    data: {
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      scores: Array<{
        siswa_id: string;
        sumatif_1?: number | null;
        sumatif_2?: number | null;
        sumatif_3?: number | null;
        nilai_akhir_sumatif?: number | null;
        capaian_kompetensi?: string | null;
      }>;
    }
  ) {
    const operations = data.scores.map((item) => {
      // Calculate Rata-rata Sumatif
      const sumatifList = [item.sumatif_1, item.sumatif_2, item.sumatif_3].filter(
        (v): v is number => v !== undefined && v !== null && !isNaN(v)
      );

      let rataRataSumatif: number | null = null;
      if (sumatifList.length > 0) {
        const total = sumatifList.reduce((acc, curr) => acc + curr, 0);
        rataRataSumatif = Number((total / sumatifList.length).toFixed(2));
      }

      // Calculate Nilai Rapor Final = (Rata-rata Sumatif + Nilai Akhir) / 2
      let nilaiRaporFinal: number | null = null;
      const nilaiAkhir = item.nilai_akhir_sumatif;

      if (rataRataSumatif !== null && nilaiAkhir !== undefined && nilaiAkhir !== null) {
        nilaiRaporFinal = Number(((rataRataSumatif + nilaiAkhir) / 2).toFixed(2));
      } else if (nilaiAkhir !== undefined && nilaiAkhir !== null) {
        nilaiRaporFinal = nilaiAkhir;
      } else if (rataRataSumatif !== null) {
        nilaiRaporFinal = rataRataSumatif;
      }

      const mainNilai = nilaiRaporFinal ?? 0;

      return prisma.nilaiSiswa.upsert({
        where: {
          siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
            siswa_id: item.siswa_id,
            mapel_id: data.mapel_id,
            tahun_pelajaran_id: data.tahun_pelajaran_id,
            semester_id: data.semester_id,
          },
        },
        update: {
          sumatif_1: item.sumatif_1 ?? null,
          sumatif_2: item.sumatif_2 ?? null,
          sumatif_3: item.sumatif_3 ?? null,
          rata_rata_sumatif: rataRataSumatif,
          nilai_akhir_sumatif: item.nilai_akhir_sumatif ?? null,
          nilai_rapor_final: nilaiRaporFinal,
          nilai: mainNilai,
          ...(item.capaian_kompetensi !== undefined
            ? { capaian_kompetensi: item.capaian_kompetensi }
            : {}),
        },
        create: {
          tenant_id: tenantId,
          siswa_id: item.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          sumatif_1: item.sumatif_1 ?? null,
          sumatif_2: item.sumatif_2 ?? null,
          sumatif_3: item.sumatif_3 ?? null,
          rata_rata_sumatif: rataRataSumatif,
          nilai_akhir_sumatif: item.nilai_akhir_sumatif ?? null,
          nilai_rapor_final: nilaiRaporFinal,
          nilai: mainNilai,
          capaian_kompetensi: item.capaian_kompetensi ?? null,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    // Invalidate leger cache
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return results;
  }

  static async exportErafor(
    tenantId: string,
    params: {
      kelas_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id: string;
    }
  ) {
    const XLSX = require('xlsx');

    // 1. Ambil data Kelas, Mapel, JenisNilai, TP, Semester untuk metadata
    const kelas = await prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } });
    const mapel = await prisma.mapel.findFirst({ where: { id: params.mapel_id, tenant_id: tenantId } });
    const jenis = await prisma.jenisNilaiMaster.findFirst({ where: { id: params.jenis_nilai_id, tenant_id: tenantId } });
    const tp = await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } });
    const sem = await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } });

    if (!kelas || !mapel || !jenis || !tp || !sem) {
      throw new Error('Data parameter tidak valid atau tidak lengkap');
    }

    // 2. Ambil list siswa aktif di kelas tersebut
    const listSiswa = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        status: 'AKTIF',
      },
      orderBy: { nama_siswa: 'asc' },
    });

    // 3. Ambil KKM Mapel untuk tingkat ini
    const kkmRecord = await prisma.kkmp.findFirst({
      where: {
        tenant_id: tenantId,
        mapel_id: params.mapel_id,
        tingkat: kelas.tingkat,
      },
    });
    const kkm = kkmRecord?.kkm_nilai || 75;

    // 4. Ambil seluruh nilai siswa yang bersangkutan
    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        mapel_id: params.mapel_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        jenis_nilai_id: params.jenis_nilai_id,
        siswa_id: {
          in: listSiswa.map((s) => s.id),
        },
      },
    });

    const nilaiMap = new Map<string, { nilai: number; catatan: string | null }>();
    listNilai.forEach((n) => {
      nilaiMap.set(n.siswa_id, { nilai: n.nilai, catatan: n.catatan_deskripsi });
    });

    // 5. Susun data untuk Sheet Excel e-Rapor
    const rows = listSiswa.map((siswa) => {
      const record = nilaiMap.get(siswa.id);
      const score = record ? record.nilai : 0;
      
      let deskripsi = record?.catatan || '';
      if (!deskripsi && score > 0) {
        if (score >= kkm) {
          deskripsi = `Menunjukkan penguasaan yang sangat baik dalam memahami kompetensi dasar mata pelajaran ${mapel.nama_mapel}.`;
        } else {
          deskripsi = `Perlu bimbingan dan pendampingan lebih lanjut dalam meningkatkan pemahaman materi ${mapel.nama_mapel}.`;
        }
      }

      return {
        'NISN': siswa.nisn || '',
        'NIS': siswa.nis,
        'Nama Siswa': siswa.nama_siswa,
        'Nilai': score,
        'Capaian Kompetensi': deskripsi,
      };
    });

    // 6. Buat Workbook & Sheet menggunakan SheetJS (xlsx)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb, ws, 'Nilai');

    // 7. Write to Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      filename: `erafor_${kelas.nama_kelas}_${mapel.nama_mapel}_${jenis.kode}.xlsx`.replace(/\s+/g, '_'),
      buffer,
    };
  }

  /**
   * 📤 EXPORT TEMPLATE ERAFOR KEMENDIKBUD (FORMAT DINAS)
   * Meng-export file Excel siap impor ke aplikasi e-Rapor resmi Kemendikbud
   */
  static async exportEraporKemendikbud(
    tenantId: string,
    params: {
      kelas_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const XLSX = require('xlsx');

    const kelas = await prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } });
    const mapel = await prisma.mapel.findFirst({ where: { id: params.mapel_id, tenant_id: tenantId } });
    const tp = await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } });
    const sem = await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } });

    if (!kelas || !mapel || !tp || !sem) {
      throw new Error('Data parameter kelas, mapel, tahun pelajaran, atau semester tidak ditemukan');
    }

    const listSiswa = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] },
      },
      orderBy: { nama_siswa: 'asc' },
    });

    const listNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        mapel_id: params.mapel_id,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        siswa_id: { in: listSiswa.map((s) => s.id) },
      },
    });

    const nilaiMap = new Map<string, { finalVal: number; cp: string; s1?: number | null; s2?: number | null; s3?: number | null; sAkhir?: number | null }>();
    listNilai.forEach((n) => {
      nilaiMap.set(n.siswa_id, {
        finalVal: n.nilai_rapor_final ?? n.nilai ?? 0,
        cp: n.capaian_kompetensi || n.catatan_deskripsi || '',
        s1: n.sumatif_1,
        s2: n.sumatif_2,
        s3: n.sumatif_3,
        sAkhir: n.nilai_akhir_sumatif,
      });
    });

    // Sheet 1: F_Nilai_Akademik
    const rowsNilai = listSiswa.map((s, idx) => {
      const rec = nilaiMap.get(s.id);
      return {
        'NO': idx + 1,
        'PD_ID': s.id,
        'NISN': s.nisn || s.nis,
        'NAMA SISWA': s.nama_siswa,
        'NILAI RAPOR': rec ? rec.finalVal : 0,
      };
    });

    // Sheet 2: F_Capaian_Kompetensi
    const rowsCP = listSiswa.map((s, idx) => {
      const rec = nilaiMap.get(s.id);
      return {
        'NO': idx + 1,
        'PD_ID': s.id,
        'NISN': s.nisn || s.nis,
        'NAMA SISWA': s.nama_siswa,
        'CAPAIAN KOMPETENSI': rec ? rec.cp : '',
      };
    });

    // Sheet 3: F_Nilai_Sumatif (Breakdown Rinci)
    const rowsSumatif = listSiswa.map((s, idx) => {
      const rec = nilaiMap.get(s.id);
      return {
        'NO': idx + 1,
        'PD_ID': s.id,
        'NISN': s.nisn || s.nis,
        'NAMA SISWA': s.nama_siswa,
        'SUMATIF 1': rec?.s1 ?? '',
        'SUMATIF 2': rec?.s2 ?? '',
        'SUMATIF 3': rec?.s3 ?? '',
        'SUMATIF AKHIR': rec?.sAkhir ?? '',
        'NILAI RAPOR': rec?.finalVal ?? 0,
      };
    });

    const wb = XLSX.utils.book_new();
    const wsNilai = XLSX.utils.json_to_sheet(rowsNilai);
    const wsCP = XLSX.utils.json_to_sheet(rowsCP);
    const wsSumatif = XLSX.utils.json_to_sheet(rowsSumatif);

    XLSX.utils.book_append_sheet(wb, wsNilai, 'F_Nilai_Akademik');
    XLSX.utils.book_append_sheet(wb, wsCP, 'F_Capaian_Kompetensi');
    XLSX.utils.book_append_sheet(wb, wsSumatif, 'F_Nilai_Sumatif');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `eRapor_${kelas.nama_kelas}_${mapel.nama_mapel}_${sem.nama_semester}.xlsx`.replace(/\s+/g, '_');

    return {
      filename,
      buffer,
    };
  }

  static async importNilaiExcel(
    tenantId: string,
    buffer: Buffer,
    metadata: {
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id: string;
      sesi_absensi_id?: string | null;
    }
  ) {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      throw new Error('File Excel kosong atau tidak terbaca');
    }

    const students = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, status: 'AKTIF' }
    });
    
    const studentMap = new Map<string, string>();
    students.forEach((s) => {
      studentMap.set(s.nis, s.id);
      if (s.nisn) {
        studentMap.set(s.nisn, s.id);
      }
    });

    const operations: any[] = [];
    const skippedRows: any[] = [];

    rawData.forEach((row: any, index: number) => {
      const nis = String(row['NIS'] || row['nis'] || '').trim();
      const nisn = String(row['NISN'] || row['nisn'] || '').trim();
      const scoreRaw = row['Nilai'] || row['nilai'];
      const notes = String(row['Capaian Kompetensi'] || row['capaian_kompetensi'] || row['Catatan'] || row['catatan'] || '').trim();

      let siswaId = '';
      if (nis && studentMap.has(nis)) {
        siswaId = studentMap.get(nis)!;
      } else if (nisn && studentMap.has(nisn)) {
        siswaId = studentMap.get(nisn)!;
      }

      if (!siswaId) {
        skippedRows.push({ row: index + 2, reason: 'NIS/NISN tidak cocok dengan siswa aktif di sistem' });
        return;
      }

      const score = Number(scoreRaw);
      if (isNaN(score) || score < 0 || score > 100) {
        skippedRows.push({ row: index + 2, name: row['Nama Siswa'] || row['Nama'] || 'Unknown', reason: `Nilai '${scoreRaw}' tidak valid (harus angka 0 s.d 100)` });
        return;
      }

      operations.push(
        prisma.nilaiSiswa.upsert({
          where: {
            siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
              siswa_id: siswaId,
              mapel_id: metadata.mapel_id,
              tahun_pelajaran_id: metadata.tahun_pelajaran_id,
              semester_id: metadata.semester_id,
            },
          },
          update: {
            nilai: score,
            catatan_deskripsi: notes || null,
            sesi_absensi_id: metadata.sesi_absensi_id || null,
          },
          create: {
            tenant_id: tenantId,
            siswa_id: siswaId,
            mapel_id: metadata.mapel_id,
            tahun_pelajaran_id: metadata.tahun_pelajaran_id,
            semester_id: metadata.semester_id,
            jenis_nilai_id: metadata.jenis_nilai_id,
            nilai: score,
            catatan_deskripsi: notes || null,
            sesi_absensi_id: metadata.sesi_absensi_id || null,
          },
        })
      );
    });

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return {
      success_count: operations.length,
      skipped: skippedRows,
    };
  }

  static async generateImportTemplateExcel(
    tenantId: string,
    params: {
      kelas_id: string;
      mapel_id: string;
      jenis_nilai_id?: string;
      mode?: string;
    }
  ) {
    const XLSX = require('xlsx');

    const kelas = await prisma.kelas.findFirst({ where: { id: params.kelas_id, tenant_id: tenantId } });
    const mapel = await prisma.mapel.findFirst({ where: { id: params.mapel_id, tenant_id: tenantId } });
    const jenis = params.jenis_nilai_id 
      ? await prisma.jenisNilaiMaster.findFirst({ where: { id: params.jenis_nilai_id, tenant_id: tenantId } })
      : null;

    if (!kelas || !mapel) {
      throw new Error('Kelas dan Mata Pelajaran tidak ditemukan');
    }

    const listSiswa = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: params.kelas_id,
        status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] },
      },
      orderBy: { nama_siswa: 'asc' },
    });

    const isSumatifMode = params.mode === 'sumatif' || !jenis;

    const rows = listSiswa.map((siswa) => {
      if (isSumatifMode) {
        return {
          'NIS': siswa.nis,
          'NISN': siswa.nisn || '',
          'Nama Siswa': siswa.nama_siswa,
          'Sumatif 1': '',
          'Sumatif 2': '',
          'Sumatif 3': '',
          'Nilai Akhir Sumatif': '',
          'Capaian Kompetensi': '',
        };
      } else {
        return {
          'NIS': siswa.nis,
          'NISN': siswa.nisn || '',
          'Nama Siswa': siswa.nama_siswa,
          'Nilai': '',
          'Capaian Kompetensi': '',
        };
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    const sheetName = isSumatifMode ? 'Nilai Sumatif' : `Nilai ${jenis?.kode || 'Kategori'}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const rawFilename = isSumatifMode
      ? `Template_Nilai_Sumatif_${kelas.nama_kelas}_${mapel.nama_mapel}.xlsx`
      : `Template_Nilai_${jenis?.kode || 'Kategori'}_${kelas.nama_kelas}_${mapel.nama_mapel}.xlsx`;
    const filename = rawFilename.replace(/[\s\/]+/g, '_');

    return {
      filename,
      buffer,
    };
  }

  /**
   * 📊 PROGRES PENGISIAN NILAI GURU (DASHBOARD PROGRESS BAR)
   */
  static async getTeacherProgress(
    tenantId: string,
    user: { id: string; roleName: string },
    params: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    const tp = params.tahun_pelajaran_id 
      ? await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } })
      : await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    const sem = params.semester_id
      ? await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } })
      : await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tp || !sem) {
      return {
        total_tasks: 0,
        completed_tasks: 0,
        partial_tasks: 0,
        empty_tasks: 0,
        percentage: 0,
        tasks: []
      };
    }

    let guruId: string | undefined;
    if (user.roleName === 'GURU') {
      const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, user_id: user.id } });
      if (guru) guruId = guru.id;
    }

    const whereJadwal: any = { tenant_id: tenantId };
    if (guruId) {
      whereJadwal.guru_id = guruId;
    }

    const schedules = await prisma.jadwalKBM.findMany({
      where: whereJadwal,
      include: {
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } }
      }
    });

    const taskMap = new Map<string, { kelas_id: string; nama_kelas: string; mapel_id: string; nama_mapel: string; kode_mapel: string | null }>();
    schedules.forEach((s) => {
      if (s.kelas_id && s.mapel_id && s.Kelas && s.Mapel) {
        const key = `${s.kelas_id}_${s.mapel_id}`;
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            kelas_id: s.kelas_id,
            nama_kelas: s.Kelas.nama_kelas,
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
            kode_mapel: s.Mapel.kode_mapel
          });
        }
      }
    });

    const uniqueTasks = Array.from(taskMap.values());

    if (uniqueTasks.length === 0) {
      return {
        total_tasks: 0,
        completed_tasks: 0,
        partial_tasks: 0,
        empty_tasks: 0,
        percentage: 0,
        tasks: []
      };
    }

    const classIds = Array.from(new Set(uniqueTasks.map(t => t.kelas_id)));
    const students = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: { in: classIds }, status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] } },
      select: { id: true, kelas_id: true }
    });

    const studentClassMap = new Map<string, string>();
    const studentsPerClass = new Map<string, number>();
    students.forEach(s => {
      if (s.kelas_id) {
        studentClassMap.set(s.id, s.kelas_id);
        studentsPerClass.set(s.kelas_id, (studentsPerClass.get(s.kelas_id) || 0) + 1);
      }
    });

    const existingNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
        siswa_id: { in: students.map(s => s.id) }
      },
      select: { siswa_id: true, mapel_id: true, nilai: true, sumatif_1: true, nilai_akhir_sumatif: true }
    });

    const filledMap = new Map<string, Set<string>>();
    existingNilai.forEach(n => {
      const isFilled = (n.nilai !== null && n.nilai !== undefined && n.nilai > 0) ||
                       (n.sumatif_1 !== null && n.sumatif_1 !== undefined) ||
                       (n.nilai_akhir_sumatif !== null && n.nilai_akhir_sumatif !== undefined);
      const kelasId = studentClassMap.get(n.siswa_id);
      if (isFilled && kelasId && n.mapel_id && n.siswa_id) {
        const key = `${kelasId}_${n.mapel_id}`;
        if (!filledMap.has(key)) filledMap.set(key, new Set());
        filledMap.get(key)!.add(n.siswa_id);
      }
    });

    let completedTasks = 0;
    let partialTasks = 0;
    let emptyTasks = 0;

    const detailedTasks = uniqueTasks.map(t => {
      const key = `${t.kelas_id}_${t.mapel_id}`;
      const totalStudents = studentsPerClass.get(t.kelas_id) || 0;
      const filledSet = filledMap.get(key);
      const filledStudents = filledSet ? filledSet.size : 0;

      let status: 'completed' | 'partial' | 'empty' = 'empty';
      if (filledStudents >= totalStudents && totalStudents > 0) {
        status = 'completed';
        completedTasks++;
      } else if (filledStudents > 0) {
        status = 'partial';
        partialTasks++;
      } else {
        emptyTasks++;
      }

      return {
        ...t,
        total_siswa: totalStudents,
        siswa_terisi: filledStudents,
        status
      };
    });

    const totalTasks = uniqueTasks.length;
    const percentage = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      partial_tasks: partialTasks,
      empty_tasks: emptyTasks,
      percentage,
      tasks: detailedTasks
    };
  }
}
