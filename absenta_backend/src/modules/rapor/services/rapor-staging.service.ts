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

    // 1. Pra-ekspansi: deteksi tautan Google Drive Folder dan saring hanya berkas Google Sheet
    const resolvedQueue: Array<{ url: string; originFolder?: string }> = [];

    for (const rawUrl of urls) {
      const trimmed = rawUrl.trim();
      if (!trimmed) continue;

      if (GoogleSheetRaporParserService.isFolderUrl(trimmed)) {
        try {
          appLogger.info({ url: trimmed, tenantId }, 'Mendeteksi folder Google Drive, mengekstrak daftar Google Sheet di dalamnya...');
          const sheetsInFolder = await GoogleSheetRaporParserService.extractGoogleSheetUrlsFromFolder(trimmed);
          sheetsInFolder.forEach((s) => {
            resolvedQueue.push({ url: s.url, originFolder: trimmed });
          });
        } catch (folderErr: any) {
          appLogger.error({ err: folderErr, url: trimmed }, 'Gagal mengekstrak berkas dari folder Google Drive');
          errors.push({
            url: trimmed,
            error: folderErr.message || 'Gagal memindai folder Google Drive',
          });
        }
      } else {
        resolvedQueue.push({ url: trimmed });
      }
    }

    // 2. Proses ekstraksi setiap berkas Google Sheet kelas secara paralel ber-batch (concurrency = 3)
    // agar waktu tunggu terpangkas 3x lipat tanpa terkena rate-limit
    const CHUNK_SIZE = 3;
    for (let i = 0; i < resolvedQueue.length; i += CHUNK_SIZE) {
      const chunk = resolvedQueue.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (item) => {
          const url = item.url;
          try {
            appLogger.info({ url, tenantId, originFolder: item.originFolder }, 'Memulai ekstraksi Google Sheet Rapor');
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
        })
      );
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
   * Helper pencocokan cerdas mata pelajaran berdasarkan nama spreadsheet, data master sekolah, dan rombel kejuruan
   */
  static resolveMapelForClass(
    rawName: string,
    mapelList: Array<{ id: string; nama_mapel: string; kode_mapel?: string | null }>,
    namaKelas: string
  ): { id: string; nama_mapel: string; kode_mapel?: string | null } | null {
    const clean = rawName.trim().toLowerCase();

    // 1. Direct match (nama_mapel atau kode_mapel)
    for (const m of mapelList) {
      if (
        m.nama_mapel.trim().toLowerCase() === clean ||
        (m.kode_mapel && m.kode_mapel.trim().toLowerCase() === clean)
      ) {
        return m;
      }
    }

    // Ekstraksi jurusan dari nama kelas (misal: "X AKL 1" -> "AKL", "XI TKJ 2" -> "TKJ")
    const classJurusanMatch = (namaKelas || '').match(/\b(AKL|AK|KUL|PHT|HTL|TAV|TKJ|TKR|TOI|TP|TSM)\b/i);
    const detectedJurusan = classJurusanMatch ? classJurusanMatch[1].toUpperCase() : '';

    // 2. Pencocokan Cerdas & Kontekstual per Mapel
    // A. PAI / Agama / Budi Pekerti
    if (clean === 'pai' || clean.includes('agama') || clean.includes('budi pekerti')) {
      const found = mapelList.find(
        (m) =>
          m.nama_mapel.toLowerCase().includes('agama') ||
          m.nama_mapel.toLowerCase().includes('budi pekerti') ||
          (m.kode_mapel && m.kode_mapel.toLowerCase().includes('pai'))
      );
      if (found) return found;
    }

    // B. PJOK / Olahraga / Penjas
    if (clean === 'pjok' || clean.includes('jasmani') || clean.includes('olahraga') || clean.includes('penjas')) {
      const found = mapelList.find(
        (m) =>
          m.nama_mapel.toLowerCase().includes('jasmani') ||
          m.nama_mapel.toLowerCase().includes('pjok') ||
          (m.kode_mapel && m.kode_mapel.toLowerCase().includes('pjok'))
      );
      if (found) return found;
    }

    // C. IPAS / Projek IPAS
    if (clean.includes('ipas') || clean.includes('ilmu pengetahuan alam dan sosial')) {
      const found = mapelList.find(
        (m) =>
          m.nama_mapel.toLowerCase().includes('ipas') ||
          (m.kode_mapel && m.kode_mapel.toLowerCase().includes('ipas'))
      );
      if (found) return found;
    }

    // D. KK / Konsentrasi Keahlian (Contextual by Jurusan)
    if (clean === 'kk' || clean.includes('kons. keahlian') || clean.includes('konsentrasi keahlian')) {
      if (detectedJurusan) {
        const found = mapelList.find((m) => {
          const nm = m.nama_mapel.toUpperCase();
          const kd = (m.kode_mapel || '').toUpperCase();
          return nm === `KK ${detectedJurusan}` || kd === `KK${detectedJurusan}` || nm.includes(`KK ${detectedJurusan}`);
        });
        if (found) return found;
      }
    }

    // E. Mapel Pilihan / MPP (Contextual by Jurusan)
    if (clean.includes('pilihan') || clean.startsWith('mpp')) {
      if (detectedJurusan) {
        const altJurusan = detectedJurusan === 'AKL' ? 'AK' : detectedJurusan === 'PHT' ? 'HTL' : detectedJurusan;
        const found = mapelList.find((m) => {
          const nm = m.nama_mapel.toUpperCase();
          const kd = (m.kode_mapel || '').toUpperCase();
          return (
            nm.includes(`MPP ${detectedJurusan}`) ||
            nm.includes(`MPP ${altJurusan}`) ||
            kd.includes(`MPP${detectedJurusan}`) ||
            kd.includes(`MPP${altJurusan}`) ||
            nm.includes(`PILIHAN ${detectedJurusan}`)
          );
        });
        if (found) return found;
      }
    }

    // F. DDPK (Contextual by Jurusan)
    if (
      clean.startsWith('ddpk') ||
      clean.includes('dasar program keahlian') ||
      clean.includes('dasar-dasar program keahlian')
    ) {
      if (detectedJurusan) {
        const found = mapelList.find((m) => {
          const nm = m.nama_mapel.toUpperCase();
          const kd = (m.kode_mapel || '').toUpperCase();
          return (
            nm === `DDPK ${detectedJurusan}` ||
            kd === `DDPK${detectedJurusan}` ||
            nm.includes(`DDPK ${detectedJurusan}`)
          );
        });
        if (found) return found;
      }
    }

    // G. PKK / Kewirausahaan
    if (clean === 'pkk' || clean.includes('kewirausahaan') || clean.includes('kreatif')) {
      const found = mapelList.find(
        (m) =>
          m.nama_mapel.toLowerCase().includes('kewirausahaan') ||
          m.nama_mapel.toLowerCase().includes('kreatif')
      );
      if (found) return found;
    }

    // H. PKN / Pancasila
    if (clean === 'pkn' || clean.includes('pancasila')) {
      const found = mapelList.find(
        (m) =>
          m.nama_mapel.toLowerCase().includes('pancasila') ||
          (m.kode_mapel && m.kode_mapel.toLowerCase().includes('pp'))
      );
      if (found) return found;
    }

    // I. Bahasa Indonesia
    if (clean.includes('indonesia') || clean === 'b. indo' || clean === 'b. indonesia') {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('indonesia'));
      if (found) return found;
    }

    // J. Bahasa Inggris
    if (clean.includes('inggris') || clean === 'b. inggris' || clean === 'bing') {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('inggris'));
      if (found) return found;
    }

    // K. Matematika / MTK
    if (clean.includes('matematika') || clean === 'mtk') {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('matematika'));
      if (found) return found;
    }

    // L. Bahasa Sunda
    if (clean.includes('sunda')) {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('sunda'));
      if (found) return found;
    }

    // M. Sejarah
    if (clean.includes('sejarah')) {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('sejarah'));
      if (found) return found;
    }

    // N. Seni Budaya
    if (clean.includes('seni')) {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('seni'));
      if (found) return found;
    }

    // O. Informatika
    if (clean.includes('informatika') || clean.includes('komputer') || clean === 'tik') {
      const found = mapelList.find((m) => m.nama_mapel.toLowerCase().includes('informatika'));
      if (found) return found;
    }

    return null;
  }

  /**
   * ── PRE-SYNC CHECK: PEMERIKSAAN KESIAPAN SLOT ──
   * Memvalidasi ketersediaan slot Tahun Pelajaran, Semester, Kelas, Siswa, dan Mapel
   * sebelum sinkronisasi permanen dieksekusi ke database produksi.
   */
  static async checkPreSyncReadiness(tenantId: string, stagingId: string) {
    const sheet = await prisma.raporStagingSheet.findFirst({
      where: { id: stagingId, tenant_id: tenantId },
    });

    if (!sheet) {
      throw new Error('Data staging tidak ditemukan');
    }

    // 1. Cek Slot Tahun Pelajaran
    const tpRaw = sheet.tahun_pelajaran_nama;
    const tp = await prisma.tahunPelajaran.findFirst({
      where: {
        tenant_id: tenantId,
        tahun: { contains: tpRaw.split('/')[0].trim(), mode: 'insensitive' },
      },
      select: { id: true, tahun: true },
    });

    // 2. Cek Slot Semester
    const semRaw = sheet.semester;
    const sem = await prisma.semester.findFirst({
      where: {
        tenant_id: tenantId,
        nama_semester: { equals: semRaw, mode: 'insensitive' },
      },
      select: { id: true, nama_semester: true },
    });

    // 3. Cek Slot Kelas
    const kelasRaw = sheet.nama_kelas;
    const kelas = await prisma.kelas.findFirst({
      where: {
        tenant_id: tenantId,
        nama_kelas: { equals: kelasRaw, mode: 'insensitive' },
      },
      select: { id: true, nama_kelas: true, tingkat: true },
    });

    // 4. Kumpulkan Seluruh Siswa di Lembar Staging
    const sumatifStudents = (sheet.sumatif_sheet_data as any[]) || [];
    const cpStudents = (sheet.cp_sheet_data as any[]) || [];
    const mergedStudents = new Map<string, { nis: string; nama: string; nisn: string }>();

    for (const s of sumatifStudents) {
      const key = (s.nis || s.nama || '').trim().toLowerCase();
      if (key) mergedStudents.set(key, { nis: (s.nis || '').trim(), nama: (s.nama || '').trim(), nisn: (s.nisn || '').trim() });
    }
    for (const c of cpStudents) {
      const key = (c.nis || c.nama || '').trim().toLowerCase();
      if (key && !mergedStudents.has(key)) {
        mergedStudents.set(key, { nis: (c.nis || '').trim(), nama: (c.nama || '').trim(), nisn: (c.nisn || '').trim() });
      }
    }

    // Cek Siswa terhadap Master Siswa Tenant
    const siswaList = await prisma.siswa.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, nama_siswa: true, nis: true, nisn: true },
    });

    const siswaByNis = new Set(siswaList.map((s) => s.nis?.trim()).filter(Boolean));
    const siswaByNisn = new Set(siswaList.map((s) => s.nisn?.trim()).filter(Boolean));
    const siswaByNama = new Set(siswaList.map((s) => s.nama_siswa?.trim().toLowerCase()).filter(Boolean));

    const matchedStudents: Array<{ nis: string; nama: string; nisn?: string }> = [];
    const unmatchedStudents: Array<{ nis: string; nama: string; nisn?: string }> = [];

    for (const [, item] of mergedStudents) {
      const isMatched =
        (item.nis && siswaByNis.has(item.nis)) ||
        (item.nisn && siswaByNisn.has(item.nisn)) ||
        siswaByNama.has(item.nama.toLowerCase());

      if (isMatched) {
        matchedStudents.push(item);
      } else {
        unmatchedStudents.push(item);
      }
    }

    // 5. Cek Pemetaan Mata Pelajaran (Semua master mapel sekolah)
    const mapelList = await prisma.mapel.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, nama_mapel: true, kode_mapel: true },
      orderBy: { nama_mapel: 'asc' },
    });
    // Kumpulkan hanya mata pelajaran yang nyata memiliki nilai / CP pada data siswa di sheet ini
    const activeSubjectsSet = new Set<string>();

    for (const s of sumatifStudents) {
      if (s.scores && typeof s.scores === 'object') {
        for (const [subName, sc] of Object.entries(s.scores as Record<string, any>)) {
          if (
            sc &&
            (sc.rata_rata !== null ||
              sc.nilai_akhir !== null ||
              sc.sumatif_1 !== null ||
              sc.sumatif_2 !== null ||
              sc.sumatif_3 !== null)
          ) {
            activeSubjectsSet.add(subName);
          }
        }
      }
    }

    for (const c of cpStudents) {
      const grades = c.mapelGrades || c.scores || {};
      if (grades && typeof grades === 'object') {
        for (const [subName, g] of Object.entries(grades as Record<string, any>)) {
          if (g && (g.nilai_rapor !== null || (g.capaian_kompetensi && g.capaian_kompetensi.trim() !== ''))) {
            activeSubjectsSet.add(subName);
          }
        }
      }
    }

    // Patokan mapel: Utamakan mata pelajaran yang nyata muncul & memiliki nilai pada siswa
    const detectedSubjects: string[] =
      activeSubjectsSet.size > 0
        ? Array.from(activeSubjectsSet)
        : ((sheet.sync_logs as any)?.detectedSubjects || []);
    const matchedSubjects: Array<{ raw: string; matchedName: string; matchedId: string }> = [];
    const unmatchedSubjects: string[] = [];
    const suggestedMapping: Record<string, string> = {};

    for (const sub of detectedSubjects) {
      const matched = RaporStagingService.resolveMapelForClass(sub, mapelList, sheet.nama_kelas);
      if (matched) {
        matchedSubjects.push({ raw: sub, matchedName: matched.nama_mapel, matchedId: matched.id });
        suggestedMapping[sub] = matched.id;
      } else {
        unmatchedSubjects.push(sub);
      }
    }

    const canSync = !!tp && !!sem && !!kelas;

    // 6. Cek Pengaturan Sumber Nilai Rapor (Formula Sumatif vs Murni CP Manual)
    const [tpSumberCfg, globalSumberCfg] = await Promise.all([
      tp?.id ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_SUMBER_NILAI_${tp.id}` } }) : null,
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_SUMBER_NILAI' } }),
    ]);
    const startYear = parseInt(sheet.tahun_pelajaran_nama.split('/')[0].trim(), 10) || 2024;
    const defaultMode = startYear <= 2023 ? 'MURNI_CP_MANUAL' : 'FORMULA_SUMATIF';
    const resolvedSumberNilai = (tpSumberCfg?.value || globalSumberCfg?.value || defaultMode) as 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL';

    return {
      stagingId,
      namaKelas: sheet.nama_kelas,
      tahunPelajaranNama: sheet.tahun_pelajaran_nama,
      semester: sheet.semester,
      academicSlots: {
        tahunPelajaran: { raw: tpRaw, isReady: !!tp, matchedName: tp?.tahun || null, id: tp?.id || null },
        semester: { raw: semRaw, isReady: !!sem, matchedName: sem?.nama_semester || null, id: sem?.id || null },
        kelas: { raw: kelasRaw, isReady: !!kelas, matchedName: kelas?.nama_kelas || null, id: kelas?.id || null },
      },
      studentSlots: {
        totalInSheet: mergedStudents.size,
        matchedCount: matchedStudents.length,
        unmatchedCount: unmatchedStudents.length,
        matched: matchedStudents,
        unmatched: unmatchedStudents,
      },
      subjectSlots: {
        totalInSheet: detectedSubjects.length,
        matchedCount: matchedSubjects.length,
        unmatchedCount: unmatchedSubjects.length,
        matched: matchedSubjects,
        unmatched: unmatchedSubjects,
      },
      allTenantSubjects: mapelList,
      suggestedMapping,
      canSync,
      sumberNilaiRapor: resolvedSumberNilai,
      readinessStatus: !canSync
        ? 'BLOCKED_ACADEMIC'
        : unmatchedStudents.length > 0
        ? 'NEED_STUDENT_PROVISION'
        : 'READY_TO_SYNC',
    };
  }

  /**
   * ── SINKRONISASI CERDAS KE MODUL RESMI E-RAPOR ──
   * Memindahkan data dari staging ke tabel produksi `NilaiSiswa` dan `RaporSiswa`.
   */
  static async syncStagingToRapor(
    tenantId: string,
    stagingId: string,
    options?: {
      autoProvisionStudents?: boolean;
      customMapelMapping?: Record<string, string>;
      sumberNilaiRapor?: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL';
    }
  ) {
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

    // Resolve Otoritas Sumber Nilai Rapor
    const [tpSumberCfg, globalSumberCfg] = await Promise.all([
      tpId ? prisma.config.findFirst({ where: { tenant_id: tenantId, key: `RAPOR_SUMBER_NILAI_${tpId}` } }) : null,
      prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'RAPOR_SUMBER_NILAI' } }),
    ]);
    const startYear = parseInt(sheet.tahun_pelajaran_nama.split('/')[0].trim(), 10) || 2024;
    const defaultMode = startYear <= 2023 ? 'MURNI_CP_MANUAL' : 'FORMULA_SUMATIF';
    const activeSumberNilai: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL' =
      options?.sumberNilaiRapor ||
      (tpSumberCfg?.value as any) ||
      (globalSumberCfg?.value as any) ||
      defaultMode;

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
    let autoProvisionedCount = 0;
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

      // Auto-Provisioning jika opsi diaktifkan dan siswa belum terdaftar
      if (!siswaId && options?.autoProvisionStudents) {
        try {
          const autoNis = item.nis || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const createdSiswa = await prisma.siswa.create({
            data: {
              tenant_id: tenantId,
              nis: autoNis,
              nisn: item.nisn || null,
              nama_siswa: item.nama.trim(),
              jenis_kelamin: 'L', // default L
            },
          });
          siswaId = createdSiswa.id;
          autoProvisionedCount++;

          // Tautkan juga riwayat kelas ke SiswaAkademik
          await prisma.siswaAkademik.upsert({
            where: {
              siswa_id_tahun_pelajaran_id_semester_id: {
                siswa_id: siswaId,
                tahun_pelajaran_id: tpId,
                semester_id: semId,
              },
            },
            create: {
              siswa_id: siswaId,
              kelas_id: kelasId,
              tahun_pelajaran_id: tpId,
              semester_id: semId,
              status: 'AKTIF',
            },
            update: {
              kelas_id: kelasId,
              status: 'AKTIF',
            },
          });

          // Daftarkan ke lookup map lokal
          if (item.nis) siswaByNis.set(item.nis.trim(), siswaId);
          if (item.nisn) siswaByNisn.set(item.nisn.trim(), siswaId);
          siswaByNama.set(item.nama.trim().toLowerCase(), siswaId);
        } catch (provErr) {
          appLogger.error({ err: provErr, student: item }, 'Gagal auto-provision siswa baru');
        }
      }

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
        let mapelId: string | null = null;
        if (options?.customMapelMapping && options.customMapelMapping[subjectName] !== undefined) {
          const customVal = options.customMapelMapping[subjectName];
          if (customVal === 'IGNORE') continue; // Sengaja dilewati pengguna
          mapelId = customVal;
        } else {
          const autoMatch = RaporStagingService.resolveMapelForClass(subjectName, mapelList, sheet.nama_kelas);
          mapelId = autoMatch?.id || resolveMapelId(subjectName);
        }

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
        const cpText = cpGrade?.capaian_kompetensi || '';

        // Abaikan jika mapel ini tidak memiliki data nilai maupun teks CP pada siswa ini
        const hasScore =
          (cpGrade && cpGrade.nilai_rapor !== null) ||
          avg !== null ||
          sumAkhir !== null ||
          s1 !== null ||
          s2 !== null ||
          s3 !== null ||
          Boolean(cpText && cpText.trim() !== '');

        if (!hasScore) {
          continue;
        }

        let nilaiFinal: number;
        if (activeSumberNilai === 'MURNI_CP_MANUAL') {
          // MURNI LEMBAR CP: Nilai rapor diambil 100% dari kolom nilai lembar CP (versi cetak fisik asli / manual guru tanpa rumus)
          nilaiFinal = cpGrade?.nilai_rapor ?? avg ?? sumAkhir ?? s1 ?? 0;
        } else {
          // FORMULA SUMATIF: Nilai rapor dihitung dari rangkaian asesmen sumatif (nilai akhir / rata-rata sumatif)
          const sumatifComputed =
            sumAkhir ??
            avg ??
            ([s1, s2, s3].some((v) => v !== null)
              ? Math.round(
                  ([s1, s2, s3].filter((v): v is number => v !== null)).reduce((a, b) => a + b, 0) /
                    [s1, s2, s3].filter((v) => v !== null).length
                )
              : null);
          nilaiFinal = sumatifComputed ?? cpGrade?.nilai_rapor ?? 0;
        }

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
          autoProvisionedCount,
          unmappedStudents,
          unmappedSubjects: Array.from(unmappedSubjects),
          sumberNilaiRapor: activeSumberNilai,
          syncedAt: new Date().toISOString(),
        } as any,
      },
    });

    return {
      success: true,
      totalNilaiSynced,
      totalRaporSynced,
      autoProvisionedCount,
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
