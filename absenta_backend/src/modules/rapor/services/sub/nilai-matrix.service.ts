// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';

export interface MultiSemesterMatrixParams {
  siswa_id: string;
  kkm?: number;
}

export interface DynamicSemesterHeader {
  index: number;
  label: string;
  sublabel: string;
  tingkat: number;
  semester_nama: string;
  is_current?: boolean;
  is_future?: boolean;
}

export interface SubjectScoreDetail {
  nilai: number | null;
  status: 'red' | 'green' | 'unassessed' | 'future';
  kkm: number;
  semester_id?: string;
  tahun_pelajaran_id?: string;
}

export interface SubjectMatrixRow {
  mapel_id: string;
  kode_mapel?: string;
  nama_mapel: string;
  kkm: number;
  scores: Record<number, SubjectScoreDetail>;
  rata_rata: number | null;
  has_red: boolean;
  red_semesters: number[];
}

export class NilaiMatrixService {
  /**
   * Menghasilkan Matriks Nilai Lintas Semester untuk Siswa Tertentu
   * Mendukung Multi-Tenant & Multi-Jenjang (SD, SMP, SMA, SMK 3 Tahun, SMK 4 Tahun)
   */
  async getStudentMultiSemesterMatrix(
    tenantId: string,
    params: MultiSemesterMatrixParams
  ) {
    const kkmThreshold = Number(params.kkm) || 70;
    const { siswa_id } = params;

    if (!siswa_id) {
      throw new Error('siswa_id wajib disertakan');
    }

    // 1. Ambil Profil Sekolah Tenant (Multi-Tenant & Multi-Jenjang Context)
    const sekolahProfile = await prisma.sekolahProfile.findFirst({
      where: { tenant_id: tenantId },
      select: {
        jenjang: true,
        durasi_smk: true,
        kurikulum: true,
      },
    });

    // 2. Ambil Profil Siswa dan Kelas Binaan Saat Ini
    const student = await prisma.siswa.findFirst({
      where: {
        id: siswa_id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        nis: true,
        nisn: true,
        nama_siswa: true,
        kelas_id: true,
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
          },
        },
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
          },
        },
        Semester: {
          select: {
            id: true,
            nama_semester: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Data siswa tidak ditemukan di tenant ini');
    }

    // 3. Tentukan Rentang Tingkat Berdasarkan Jenjang Sekolah
    const jenjang = (sekolahProfile?.jenjang || 'SMK').toUpperCase();
    const durasiSmk = sekolahProfile?.durasi_smk || '3_TAHUN';
    const isSmk4Tahun = durasiSmk === '4_TAHUN' && (jenjang === 'SMK' || jenjang === 'MAK');

    let tingkatMin = 10;
    let tingkatMax = isSmk4Tahun ? 13 : 12;
    let baseTingkatOffset = 10;

    if (jenjang === 'SD' || jenjang === 'MI') {
      tingkatMin = 1;
      tingkatMax = 6;
      baseTingkatOffset = 1;
    } else if (jenjang === 'SMP' || jenjang === 'MTS') {
      tingkatMin = 7;
      tingkatMax = 9;
      baseTingkatOffset = 7;
    } else {
      // SMA, MA, SMK, MAK
      tingkatMin = 10;
      tingkatMax = isSmk4Tahun ? 13 : 12;
      baseTingkatOffset = 10;
    }

    const currentTingkat = student.Kelas?.tingkat || tingkatMin;
    const currentSemesterNama = (student.Semester?.nama_semester || 'GANJIL').toUpperCase();
    const isCurrentGenap = currentSemesterNama.includes('GENAP');
    const currentSemesterIndex = (currentTingkat - baseTingkatOffset) * 2 + (isCurrentGenap ? 2 : 1);

    // 4. Bangkitkan Daftar Kolom Semester Dinamis (Dynamic Headers)
    const headers: DynamicSemesterHeader[] = [];
    let semIdx = 1;

    for (let t = tingkatMin; t <= tingkatMax; t++) {
      // Semester Ganjil
      const ganjilSublabel = jenjang === 'SD' || jenjang === 'MI'
        ? `Kelas ${t} Ganjil`
        : jenjang === 'SMP' || jenjang === 'MTS'
        ? `Kelas ${t === 7 ? 'VII' : t === 8 ? 'VIII' : 'IX'} Ganjil`
        : `Kelas ${t === 10 ? 'X' : t === 11 ? 'XI' : t === 12 ? 'XII' : 'XIII'} Ganjil`;

      headers.push({
        index: semIdx,
        label: `Smt ${semIdx}`,
        sublabel: ganjilSublabel,
        tingkat: t,
        semester_nama: 'Ganjil',
        is_current: semIdx === currentSemesterIndex,
        is_future: semIdx > currentSemesterIndex,
      });
      semIdx++;

      // Semester Genap
      const genapSublabel = jenjang === 'SD' || jenjang === 'MI'
        ? `Kelas ${t} Genap`
        : jenjang === 'SMP' || jenjang === 'MTS'
        ? `Kelas ${t === 7 ? 'VII' : t === 8 ? 'VIII' : 'IX'} Genap`
        : `Kelas ${t === 10 ? 'X' : t === 11 ? 'XI' : t === 12 ? 'XII' : 'XIII'} Genap`;

      headers.push({
        index: semIdx,
        label: `Smt ${semIdx}`,
        sublabel: genapSublabel,
        tingkat: t,
        semester_nama: 'Genap',
        is_current: semIdx === currentSemesterIndex,
        is_future: semIdx > currentSemesterIndex,
      });
      semIdx++;
    }

    // 5. Ambil Jejak Historis SiswaAkademik untuk pemetaan pasti tingkat per semester
    const academicHistory = await prisma.siswaAkademik.findMany({
      where: {
        siswa_id: student.id,
      },
      select: {
        tahun_pelajaran_id: true,
        semester_id: true,
        kelas_id: true,
        kelas: {
          select: { tingkat: true, nama_kelas: true },
        },
        semester: {
          select: { id: true, nama_semester: true },
        },
        tahunPelajaran: {
          select: { id: true, tahun: true },
        },
      },
    });

    // Peta Lookup Cepat: `${tahun_pelajaran_id}_${semester_id}` ➔ Semester Index
    const periodToSemesterIndexMap = new Map<string, number>();
    academicHistory.forEach((ah) => {
      const t = ah.kelas?.tingkat;
      if (t) {
        const isGenap = (ah.semester?.nama_semester || '').toUpperCase().includes('GENAP');
        const calculatedIdx = (t - baseTingkatOffset) * 2 + (isGenap ? 2 : 1);
        periodToSemesterIndexMap.set(`${ah.tahun_pelajaran_id}_${ah.semester_id}`, calculatedIdx);
      }
    });

    // 6. Ambil Seluruh Nilai Siswa (Query Terindeks B-Tree: @@index([tenant_id, siswa_id]))
    const allGrades = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: student.id,
      },
      select: {
        id: true,
        mapel_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        nilai: true,
        nilai_akhir_sumatif: true,
        nilai_rapor_final: true,
        Mapel: {
          select: {
            id: true,
            nama_mapel: true,
            kode_mapel: true,
          },
        },
        Semester: {
          select: {
            id: true,
            nama_semester: true,
          },
        },
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
          },
        },
      },
    });

    // 7. In-Memory Pivot: Bentuk Matriks per Mata Pelajaran (O(N) Single-Pass)
    const mapelMap = new Map<string, SubjectMatrixRow>();

    allGrades.forEach((g) => {
      const mapelId = g.mapel_id;
      let row = mapelMap.get(mapelId);

      if (!row) {
        row = {
          mapel_id: mapelId,
          kode_mapel: g.Mapel?.kode_mapel || undefined,
          nama_mapel: g.Mapel?.nama_mapel || 'Mata Pelajaran',
          kkm: kkmThreshold,
          scores: {},
          rata_rata: null,
          has_red: false,
          red_semesters: [],
        };

        // Inisialisasi sel untuk setiap header semester
        headers.forEach((h) => {
          row!.scores[h.index] = {
            nilai: null,
            status: h.is_future ? 'future' : 'unassessed',
            kkm: kkmThreshold,
          };
        });

        mapelMap.set(mapelId, row);
      }

      // Tentukan nomor semester dari lookup historis atau fallback estimasi
      const periodKey = `${g.tahun_pelajaran_id}_${g.semester_id}`;
      let semNum = periodToSemesterIndexMap.get(periodKey);

      if (!semNum) {
        // Fallback jika tidak tercatat di SiswaAkademik: gunakan semester aktif siswa jika sama
        if (g.tahun_pelajaran_id === student.TahunPelajaran?.id && g.semester_id === student.Semester?.id) {
          semNum = currentSemesterIndex;
        } else {
          // Fallback parsing nama semester
          const isGenap = (g.Semester?.nama_semester || '').toUpperCase().includes('GENAP');
          semNum = (currentTingkat - baseTingkatOffset) * 2 + (isGenap ? 2 : 1);
        }
      }

      if (semNum && row.scores[semNum]) {
        const finalScore = g.nilai_rapor_final ?? g.nilai_akhir_sumatif ?? (g.nilai > 0 ? g.nilai : null);

        if (finalScore !== null && finalScore !== undefined) {
          const isRed = finalScore < kkmThreshold;
          row.scores[semNum] = {
            nilai: finalScore,
            status: isRed ? 'red' : 'green',
            kkm: kkmThreshold,
            semester_id: g.semester_id,
            tahun_pelajaran_id: g.tahun_pelajaran_id,
          };

          if (isRed) {
            row.has_red = true;
            if (!row.red_semesters.includes(semNum)) {
              row.red_semesters.push(semNum);
              row.red_semesters.sort((a, b) => a - b);
            }
          }
        }
      }
    });

    // 8. Hitung Rata-Rata Kumulatif & Urutkan Baris Matriks
    const matrixRows = Array.from(mapelMap.values());
    let totalMapelMerah = 0;
    const redSummaryList: string[] = [];

    matrixRows.forEach((row) => {
      const validScores = Object.values(row.scores)
        .map((s) => s.nilai)
        .filter((n): n is number => n !== null && n !== undefined);

      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, curr) => acc + curr, 0);
        row.rata_rata = Number((sum / validScores.length).toFixed(1));
      }

      if (row.has_red) {
        totalMapelMerah++;
        const semLabels = row.red_semesters.map((s) => `Smt ${s}`).join(', ');
        redSummaryList.push(`${row.nama_mapel} (${semLabels})`);
      }
    });

    // Prioritaskan mapel yang memiliki nilai merah di urutan teratas agar langsung tertangkap mata walas
    matrixRows.sort((a, b) => {
      if (a.has_red && !b.has_red) return -1;
      if (!a.has_red && b.has_red) return 1;
      return a.nama_mapel.localeCompare(b.nama_mapel);
    });

    return {
      tenant_jenjang: jenjang,
      durasi_studi: durasiSmk,
      kkm_standar: kkmThreshold,
      siswa: {
        id: student.id,
        nis: student.nis,
        nisn: student.nisn,
        nama_siswa: student.nama_siswa,
        kelas_id: student.kelas_id,
        kelas_sekarang: student.Kelas?.nama_kelas || 'Kelas Binaan',
        tingkat_sekarang: currentTingkat,
        semester_sekarang_index: currentSemesterIndex,
      },
      headers,
      matrix: matrixRows,
      diagnostics: {
        total_mapel: matrixRows.length,
        total_mapel_merah: totalMapelMerah,
        daftar_mapel_merah: redSummaryList,
        is_clean: totalMapelMerah === 0,
        kesimpulan: totalMapelMerah === 0
          ? 'Luar biasa! Seluruh mata pelajaran tuntas di atas KKM di setiap semester.'
          : `Perhatian: Terdapat ${totalMapelMerah} mata pelajaran dengan nilai di bawah KKM (${kkmThreshold}) pada semester lampau/berjalan.`,
      },
    };
  }
}

export const nilaiMatrixService = new NilaiMatrixService();
