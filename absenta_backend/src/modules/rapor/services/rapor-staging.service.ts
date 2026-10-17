import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { GoogleSheetRaporParserService, ParsedRaporClassData } from './google-sheet-rapor-parser.service';

// Rapor Staging Hub Service - Maps to rapor_staging_sheets PostgreSQL table
export interface StagingFilter {
  tahunPelajaran?: string;
  semester?: string;
  kelas?: string;
}

export class RaporStagingService {
  /**
   * Mengambil dan memproses Google Sheet dari URL, lalu menyimpannya ke tabel staging.
   */
  static async fetchAndStageSheets(
    tenantId: string,
    urls: string[]
  ): Promise<{ results: any[]; errors: Array<{ url: string; error: string }> }> {
    const results: any[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const rawUrl of urls) {
      const url = rawUrl.trim();
      if (!url) continue;

      try {
        appLogger.info({ url, tenantId }, 'Memulai ekstraksi Google Sheet Rapor');
        const parsed: ParsedRaporClassData = await GoogleSheetRaporParserService.parseGoogleSheet(url);

        const tahunPelajaranNama = parsed.metadata.tahunPelajaran.replace(/\s+/g, ' ').trim() || '2024 / 2025';
        const semesterNama = parsed.metadata.semester.trim() || 'Ganjil';
        const namaKelas = parsed.metadata.kelas.trim() || 'Kelas Belum Ditentukan';

        // Auto-match master IDs jika sudah ada di DB
        const [matchedTp, matchedSem, matchedKelas] = await Promise.all([
          prisma.tahunPelajaran.findFirst({
            where: {
              tenant_id: tenantId,
              tahun: { contains: tahunPelajaranNama.split('/')[0].trim(), mode: 'insensitive' },
            },
          }),
          prisma.semester.findFirst({
            where: {
              tenant_id: tenantId,
              nama_semester: { equals: semesterNama, mode: 'insensitive' },
            },
          }),
          prisma.kelas.findFirst({
            where: {
              tenant_id: tenantId,
              nama_kelas: { equals: namaKelas, mode: 'insensitive' },
            },
          }),
        ]);

        // Cek apakah sheet dengan URL atau kelas + TP + semester yang sama sudah ada di staging
        const existing = await prisma.raporStagingSheet.findFirst({
          where: {
            tenant_id: tenantId,
            nama_kelas: namaKelas,
            tahun_pelajaran_nama: tahunPelajaranNama,
            semester: semesterNama,
          },
        });

        const stagingData = {
          tenant_id: tenantId,
          source_url: url,
          file_title: `RAPOR ${tahunPelajaranNama} ${semesterNama} ${namaKelas}`,
          tahun_pelajaran_id: matchedTp?.id || null,
          tahun_pelajaran_nama: tahunPelajaranNama,
          semester: semesterNama,
          kelas_id: matchedKelas?.id || null,
          nama_kelas: namaKelas,
          wali_kelas_nama: parsed.metadata.walas || null,
          jurusan_nama: parsed.metadata.konsentrasiKeahlian || parsed.metadata.programKeahlian || null,
          total_siswa: parsed.totalSiswa,
          total_mapel: parsed.detectedSubjects.length,
          metadata_json: parsed.metadata as any,
          sumatif_sheet_data: parsed.sumatifStudents as any,
          cp_sheet_data: parsed.cpStudents as any,
          status: 'READY',
          sync_logs: {
            detectedSubjects: parsed.detectedSubjects,
            matchedMaster: {
              tp: matchedTp ? matchedTp.tahun : null,
              semester: matchedSem ? matchedSem.nama_semester : null,
              kelas: matchedKelas ? matchedKelas.nama_kelas : null,
            },
          } as any,
        };

        let savedRecord;
        if (existing) {
          savedRecord = await prisma.raporStagingSheet.update({
            where: { id: existing.id },
            data: stagingData,
          });
        } else {
          savedRecord = await prisma.raporStagingSheet.create({
            data: stagingData,
          });
        }

        results.push({
          id: savedRecord.id,
          nama_kelas: savedRecord.nama_kelas,
          tahun_pelajaran: savedRecord.tahun_pelajaran_nama,
          semester: savedRecord.semester,
          wali_kelas: savedRecord.wali_kelas_nama,
          total_siswa: savedRecord.total_siswa,
          total_mapel: savedRecord.total_mapel,
          status: savedRecord.status,
          source_url: savedRecord.source_url,
        });
      } catch (err: any) {
        appLogger.error({ err, url }, 'Gagal mengimpor Google Sheet');
        errors.push({
          url,
          error: err.message || 'Gagal memproses file Google Sheet',
        });
      }
    }

    return { results, errors };
  }

  /**
   * Mengambil daftar lembar staging untuk tenant tertentu
   */
  static async getStagedSheets(tenantId: string, filter?: StagingFilter) {
    const where: any = { tenant_id: tenantId };

    if (filter?.tahunPelajaran) {
      where.tahun_pelajaran_nama = { contains: filter.tahunPelajaran, mode: 'insensitive' };
    }
    if (filter?.semester) {
      where.semester = { equals: filter.semester, mode: 'insensitive' };
    }
    if (filter?.kelas) {
      where.nama_kelas = { contains: filter.kelas, mode: 'insensitive' };
    }

    return await prisma.raporStagingSheet.findMany({
      where,
      orderBy: [{ tahun_pelajaran_nama: 'desc' }, { nama_kelas: 'asc' }],
      select: {
        id: true,
        file_title: true,
        source_url: true,
        tahun_pelajaran_nama: true,
        semester: true,
        nama_kelas: true,
        wali_kelas_nama: true,
        jurusan_nama: true,
        total_siswa: true,
        total_mapel: true,
        status: true,
        last_synced_at: true,
        created_at: true,
        updated_at: true,
        sync_logs: true,
      },
    });
  }

  /**
   * Mengambil detail lengkap isi staging sheet (untuk preview interaktif di UI)
   */
  static async getStagedSheetDetail(tenantId: string, id: string) {
    const sheet = await prisma.raporStagingSheet.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!sheet) {
      throw new Error('Data staging tidak ditemukan');
    }

    return sheet;
  }

  /**
   * ── SINKRONISASI CERDAS KE MODUL RESMI E-RAPOR ──
   * Memindahkan data dari staging ke tabel produksi `NilaiSiswa` dan `RaporSiswa`.
   */
  static async syncStagingToRapor(tenantId: string, stagingId: string) {
    const sheet = await prisma.raporStagingSheet.findFirst({
      where: { id: stagingId, tenant_id: tenantId },
    });

    if (!sheet) {
      throw new Error('Data staging tidak ditemukan');
    }

    // 1. Resolve Target Tahun Pelajaran & Semester
    let tpId = sheet.tahun_pelajaran_id;
    if (!tpId) {
      const tp = await prisma.tahunPelajaran.findFirst({
        where: {
          tenant_id: tenantId,
          tahun: { contains: sheet.tahun_pelajaran_nama.split('/')[0].trim(), mode: 'insensitive' },
        },
      });
      tpId = tp?.id || null;
    }

    let semId: string | null = null;
    const semester = await prisma.semester.findFirst({
      where: {
        tenant_id: tenantId,
        nama_semester: { equals: sheet.semester, mode: 'insensitive' },
      },
    });
    semId = semester?.id || null;

    if (!tpId || !semId) {
      throw new Error(
        `Master Tahun Pelajaran '${sheet.tahun_pelajaran_nama}' atau Semester '${sheet.semester}' belum terdaftar di platform. Pastikan sudah dibuat pada menu Master Akademik.`
      );
    }

    // 2. Resolve Target Kelas
    let kelasId = sheet.kelas_id;
    if (!kelasId) {
      const kelas = await prisma.kelas.findFirst({
        where: {
          tenant_id: tenantId,
          nama_kelas: { equals: sheet.nama_kelas, mode: 'insensitive' },
        },
      });
      kelasId = kelas?.id || null;
    }

    if (!kelasId) {
      throw new Error(
        `Kelas '${sheet.nama_kelas}' belum terdaftar di platform. Silakan buat kelas tersebut terlebih dahulu di menu Data Master Kelas.`
      );
    }

    // 3. Ambil Master Siswa di Tenant
    const siswaList = await prisma.siswa.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, nama_siswa: true, nis: true, nisn: true },
    });

    const siswaByNis = new Map<string, string>();
    const siswaByNisn = new Map<string, string>();
    const siswaByNama = new Map<string, string>();

    for (const s of siswaList) {
      if (s.nis) siswaByNis.set(s.nis.trim(), s.id);
      if (s.nisn) siswaByNisn.set(s.nisn.trim(), s.id);
      siswaByNama.set(s.nama_siswa.trim().toLowerCase(), s.id);
    }

    // 4. Ambil Master Mapel di Tenant
    const mapelList = await prisma.mapel.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, nama_mapel: true, kode_mapel: true },
    });

    const mapelByName = new Map<string, string>();
    for (const m of mapelList) {
      mapelByName.set(m.nama_mapel.trim().toLowerCase(), m.id);
      if (m.kode_mapel) mapelByName.set(m.kode_mapel.trim().toLowerCase(), m.id);
    }

    // Alias mapel umum untuk fleksibilitas ekstra
    const mapelAliases: Record<string, string[]> = {
      pai: ['pendidikan agama islam', 'pendidikan agama', 'pai dan budi pekerti', 'agama'],
      pkn: ['pendidikan pancasila', 'ppkn', 'pancasila'],
      'b. indonesia': ['bahasa indonesia', 'b.indo', 'indonesia'],
      pjok: ['pendidikan jasmani', 'penjas', 'olahraga'],
      sejarah: ['sejarah indonesia'],
      'seni budaya': ['seni musik', 'seni rupa', 'seni'],
      'b. sunda': ['bahasa sunda', 'mulok bahasa sunda'],
      matematika: ['mtk', 'matematika umum'],
      mtk: ['matematika', 'matematika umum'],
      'b. inggris': ['bahasa inggris', 'inggris'],
      informatika: ['tik', 'komputer'],
      'projek ipas': ['ipas', 'ipa dan ips', 'proyek ipas'],
      ddpk: ['dasar-dasar program keahlian', 'dasar keahlian'],
      'kons. keahlian': ['konsentrasi keahlian'],
      kk: ['konsentrasi keahlian'],
      pkk: ['produk kreatif dan kewirausahaan', 'pkwu'],
    };

    const resolveMapelId = (name: string): string | null => {
      const clean = name.trim().toLowerCase();
      if (mapelByName.has(clean)) return mapelByName.get(clean)!;

      for (const [key, aliases] of Object.entries(mapelAliases)) {
        if (clean === key || aliases.includes(clean)) {
          for (const alias of [key, ...aliases]) {
            if (mapelByName.has(alias)) return mapelByName.get(alias)!;
          }
        }
      }
      return null;
    };

    const sumatifStudents = (sheet.sumatif_sheet_data as any[]) || [];
    const cpStudents = (sheet.cp_sheet_data as any[]) || [];

    let totalNilaiSynced = 0;
    let totalRaporSynced = 0;
    const unmappedStudents: string[] = [];
    const unmappedSubjects: Set<string> = new Set();

    // 5. Gabungkan data per siswa berdasarkan NIS atau Nama
    const mergedStudents = new Map<string, { sumatif?: any; cp?: any; nis: string; nama: string; nisn: string }>();

    for (const s of sumatifStudents) {
      const key = s.nis || s.nama.toLowerCase();
      mergedStudents.set(key, { sumatif: s, nis: s.nis, nama: s.nama, nisn: s.nisn });
    }

    for (const c of cpStudents) {
      const key = c.nis || c.nama.toLowerCase();
      if (mergedStudents.has(key)) {
        mergedStudents.get(key)!.cp = c;
      } else {
        mergedStudents.set(key, { cp: c, nis: c.nis, nama: c.nama, nisn: c.nisn });
      }
    }

    // 6. Jalankan Proses Sinkronisasi Siswa demi Siswa
    for (const [, item] of mergedStudents) {
      // Cari ID Siswa
      let siswaId =
        (item.nis && siswaByNis.get(item.nis)) ||
        (item.nisn && siswaByNisn.get(item.nisn)) ||
        siswaByNama.get(item.nama.trim().toLowerCase()) ||
        null;

      if (!siswaId) {
        unmappedStudents.push(`${item.nama} (NIS: ${item.nis || '-'})`);
        continue;
      }

      // A. Sinkronisasi Data Rapor & Kehadiran (RaporSiswa)
      if (item.cp) {
        const kehadiran = item.cp.kehadiran || { sakit: 0, izin: 0, alpa: 0 };
        const catatanWali = item.cp.catatanWali || '';
        const keputusan = item.cp.keputusanTransisi || '';

        await prisma.raporSiswa.upsert({
          where: {
            siswa_id_tahun_pelajaran_id_semester_id: {
              siswa_id: siswaId,
              tahun_pelajaran_id: tpId,
              semester_id: semId,
            },
          },
          create: {
            tenant_id: tenantId,
            siswa_id: siswaId,
            kelas_id: kelasId,
            tahun_pelajaran_id: tpId,
            semester_id: semId,
            sakit: kehadiran.sakit || 0,
            izin: kehadiran.izin || 0,
            alpa: kehadiran.alpa || 0,
            catatan_wali: catatanWali,
            keputusan_transisi: keputusan,
          },
          update: {
            kelas_id: kelasId,
            sakit: kehadiran.sakit || 0,
            izin: kehadiran.izin || 0,
            alpa: kehadiran.alpa || 0,
            catatan_wali: catatanWali || undefined,
            keputusan_transisi: keputusan || undefined,
          },
        });
        totalRaporSynced++;
      }

      // B. Sinkronisasi Nilai Mata Pelajaran (NilaiSiswa)
      // Ambil daftar seluruh mapel dari sumatif & cp
      const allSubjectNames = new Set<string>([
        ...Object.keys(item.sumatif?.scores || {}),
        ...Object.keys(item.cp?.mapelGrades || {}),
      ]);

      for (const subjectName of allSubjectNames) {
        const mapelId = resolveMapelId(subjectName);
        if (!mapelId) {
          unmappedSubjects.add(subjectName);
          continue;
        }

        const sumatifScore = item.sumatif?.scores?.[subjectName];
        const cpGrade = item.cp?.mapelGrades?.[subjectName];

        const s1 = sumatifScore?.sumatif_1 ?? null;
        const s2 = sumatifScore?.sumatif_2 ?? null;
        const s3 = sumatifScore?.sumatif_3 ?? null;
        const avg = sumatifScore?.rata_rata ?? null;
        const sumAkhir = sumatifScore?.nilai_akhir ?? null;

        const nilaiFinal = cpGrade?.nilai_rapor ?? avg ?? s1 ?? 0;
        const cpText = cpGrade?.capaian_kompetensi || '';

        await prisma.nilaiSiswa.upsert({
          where: {
            siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
              siswa_id: siswaId,
              mapel_id: mapelId,
              tahun_pelajaran_id: tpId,
              semester_id: semId,
            },
          },
          create: {
            tenant_id: tenantId,
            siswa_id: siswaId,
            mapel_id: mapelId,
            tahun_pelajaran_id: tpId,
            semester_id: semId,
            nilai: nilaiFinal,
            sumatif_1: s1,
            sumatif_2: s2,
            sumatif_3: s3,
            rata_rata_sumatif: avg,
            nilai_akhir_sumatif: sumAkhir,
            nilai_rapor_final: nilaiFinal,
            capaian_kompetensi: cpText,
          },
          update: {
            nilai: nilaiFinal,
            sumatif_1: s1,
            sumatif_2: s2,
            sumatif_3: s3,
            rata_rata_sumatif: avg,
            nilai_akhir_sumatif: sumAkhir,
            nilai_rapor_final: nilaiFinal,
            capaian_kompetensi: cpText || undefined,
          },
        });
        totalNilaiSynced++;
      }
    }

    // 7. Update status staging
    await prisma.raporStagingSheet.update({
      where: { id: stagingId },
      data: {
        status: 'SYNCED',
        last_synced_at: new Date(),
        sync_logs: {
          totalNilaiSynced,
          totalRaporSynced,
          unmappedStudents,
          unmappedSubjects: Array.from(unmappedSubjects),
          syncedAt: new Date().toISOString(),
        } as any,
      },
    });

    return {
      success: true,
      totalNilaiSynced,
      totalRaporSynced,
      unmappedStudents,
      unmappedSubjects: Array.from(unmappedSubjects),
    };
  }

  /**
   * Menghapus rekaman staging
   */
  static async deleteStagedSheet(tenantId: string, id: string) {
    return await prisma.raporStagingSheet.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }
}
