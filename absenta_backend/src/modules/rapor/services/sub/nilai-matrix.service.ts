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
  catatan?: string;
}

export interface SubjectMatrixRow {
  mapel_id: string;
  kode_mapel?: string;
  nama_mapel: string;
  kkm: number;
  scores: Record<number, SubjectScoreDetail>;
  rata_rata: number | null;
  has_red: boolean;
  has_scores: boolean;
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

    // 1. Ambil Profil Sekolah Tenant (Nama model: Sekolah)
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: {
        jenjang: true,
        durasi_smk: true,
        kurikulum: true,
      },
    });

    // 2. Ambil Profil Siswa dan Kelas
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

    // Ambil Periode Aktif Tenant sebagai acuan fallback
    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true, tahun_pelajaran_id: true },
      }),
    ]);

    // 3. Tentukan Rentang Tingkat Berdasarkan Jenjang Sekolah
    const jenjang = (sekolah?.jenjang || 'SMK').toUpperCase();
    const durasiSmk = sekolah?.durasi_smk || '3_TAHUN';
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
    const currentSemesterNama = (student.Semester?.nama_semester || activeSem?.nama_semester || 'GANJIL').toUpperCase();
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

    // 6. Kumpulkan SEMUA Mata Pelajaran yang Relevan untuk Siswa ini
    // A. Dari Jadwal KBM resmi di kelas siswa saat ini
    const classKbmMapels = student.kelas_id ? await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: student.kelas_id,
      },
      select: {
        mapel_id: true,
        Mapel: {
          select: { id: true, nama_mapel: true, kode_mapel: true },
        },
      },
    }) : [];

    // B. Dari NilaiSiswa yang pernah tercatat untuk siswa ini di semester manapun
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
        catatan_deskripsi: true,
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

    // 7. Bentuk Kamus Lengkap Seluruh Mata Pelajaran (SSOT Subject Catalog)
    const masterSubjectMap = new Map<string, { id: string; nama_mapel: string; kode_mapel?: string }>();

    classKbmMapels.forEach((k) => {
      if (k.Mapel) {
        masterSubjectMap.set(k.Mapel.id, {
          id: k.Mapel.id,
          nama_mapel: k.Mapel.nama_mapel,
          kode_mapel: k.Mapel.kode_mapel || undefined,
        });
      }
    });

    allGrades.forEach((g) => {
      if (g.Mapel && !masterSubjectMap.has(g.Mapel.id)) {
        masterSubjectMap.set(g.Mapel.id, {
          id: g.Mapel.id,
          nama_mapel: g.Mapel.nama_mapel,
          kode_mapel: g.Mapel.kode_mapel || undefined,
        });
      }
    });

    // Inisialisasi Seluruh Baris Matriks untuk Semua Mapel
    const matrixMap = new Map<string, SubjectMatrixRow>();

    masterSubjectMap.forEach((subj, mapelId) => {
      const row: SubjectMatrixRow = {
        mapel_id: mapelId,
        kode_mapel: subj.kode_mapel,
        nama_mapel: subj.nama_mapel,
        kkm: kkmThreshold,
        scores: {},
        rata_rata: null,
        has_red: false,
        has_scores: false,
        red_semesters: [],
      };

      headers.forEach((h) => {
        row.scores[h.index] = {
          nilai: null,
          status: h.is_future ? 'future' : 'unassessed',
          kkm: kkmThreshold,
        };
      });

      matrixMap.set(mapelId, row);
    });

    // 8. Petakan Nilai Riil ke Kolom Semester Matriks
    allGrades.forEach((g) => {
      const row = matrixMap.get(g.mapel_id);
      if (!row) return;

      const periodKey = `${g.tahun_pelajaran_id}_${g.semester_id}`;
      let semNum = periodToSemesterIndexMap.get(periodKey);

      if (!semNum) {
        if (activeTp?.id === g.tahun_pelajaran_id && activeSem?.id === g.semester_id) {
          semNum = currentSemesterIndex;
        } else {
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
            catatan: g.catatan_deskripsi || undefined,
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

    // 9. Hitung Rata-Rata Kumulatif & Urutkan
    const matrixRows = Array.from(matrixMap.values());
    let totalMapelMerah = 0;
    let totalMapelDinilai = 0;
    const redSummaryList: string[] = [];

    matrixRows.forEach((row) => {
      const validScores = Object.values(row.scores)
        .map((s) => s.nilai)
        .filter((n): n is number => n !== null && n !== undefined);

      if (validScores.length > 0) {
        totalMapelDinilai++;
        row.has_scores = true;
        const sum = validScores.reduce((acc, curr) => acc + curr, 0);
        row.rata_rata = Number((sum / validScores.length).toFixed(1));
      }

      if (row.has_red) {
        totalMapelMerah++;
        const semLabels = row.red_semesters.map((s) => `Smt ${s}`).join(', ');
        redSummaryList.push(`${row.nama_mapel} (${semLabels})`);
      }
    });

    // Mapel dengan nilai merah selalu di atas agar perhatian wali kelas langsung tertuju ke sana
    matrixRows.sort((a, b) => {
      if (a.has_red && !b.has_red) return -1;
      if (!a.has_red && b.has_red) return 1;
      if (a.has_scores && !b.has_scores) return -1;
      if (!a.has_scores && b.has_scores) return 1;
      return a.nama_mapel.localeCompare(b.nama_mapel);
    });

    const isAllUnassessed = totalMapelDinilai === 0;

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
        total_mapel_dinilai: totalMapelDinilai,
        total_mapel_merah: totalMapelMerah,
        daftar_mapel_merah: redSummaryList,
        is_all_unassessed: isAllUnassessed,
        is_clean: totalMapelMerah === 0 && !isAllUnassessed,
        kesimpulan: isAllUnassessed
          ? `Belum Ada Penilaian: Belum ada catatan nilai yang terbit pada sistem untuk siswa ini.`
          : totalMapelMerah === 0
          ? `Kondisi Akademik Prima: Seluruh ${totalMapelDinilai} mata pelajaran yang terdata tuntas di atas KKM.`
          : `Perhatian: Terdeteksi ${totalMapelMerah} mata pelajaran dengan nilai di bawah KKM (${kkmThreshold}) pada semester lampau/berjalan.`,
      },
    };
  }
}

export const nilaiMatrixService = new NilaiMatrixService();
