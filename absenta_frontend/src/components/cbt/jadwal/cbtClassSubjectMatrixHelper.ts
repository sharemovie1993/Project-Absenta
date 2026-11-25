import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import { JURUSAN_ALIASES } from './CbtMultiJurusanModal';

export type MatrixCellStatus = 'COVERED' | 'MISSING' | 'NOT_APPLICABLE';

export interface MatrixCellData {
  status: MatrixCellStatus;
  mapelId: string;
  mapelName: string;
  kelasId: string;
  kelasName: string;
  tingkat: number;
  jurusanKode?: string;
  // Jika COVERED
  bankSoal?: CbtBankSoal;
  bankId?: string;
  bankTitle?: string;
  soalCount?: number;
  guruPembuat?: string;
  isJurusanSpecific?: boolean;
  // Guru Pengampu Rombel Kelas (Berlaku untuk COVERED maupun MISSING)
  guruPengampu?: string;
  guruPengampuId?: string;
  guruPengampuPhone?: string;
  targetId?: string;
}

export interface MatrixClassColumn {
  kelasId: string;
  kelasName: string;
  tingkat: number;
  jurusanKode?: string;
  totalRequiredMapel: number;
  coveredMapelCount: number;
  missingMapelCount: number;
  percentage: number;
}

export interface MatrixSubjectRow {
  mapelId: string;
  mapelName: string;
  mapelKode?: string;
  totalClasses: number;
  coveredClassesCount: number;
  missingClassesCount: number;
  percentage: number;
}

export interface ClassSubjectMatrixResult {
  classes: MatrixClassColumn[];
  subjects: MatrixSubjectRow[];
  /** Map key: `${mapelId}_${kelasId}` => MatrixCellData */
  cellMap: Map<string, MatrixCellData>;
  totalCellsRequired: number;
  totalCellsCovered: number;
  totalCellsMissing: number;
  overallPercentage: number;
}

/**
 * Helper Utama: Membangun Matriks Kesiapan Bank Soal (Kelas x Mapel per Tingkat)
 * - Baris (Vertikal): Mata Pelajaran
 * - Kolom (Horizontal): Kelas / Rombel
 * - Sel: Status apakah kelas tersebut pada mapel tersebut sudah ter-cover Bank Soal
 */
export function buildClassSubjectMatrix(params: {
  rawGuruMapel: GuruMapel[];
  bankList: CbtBankSoal[];
  tingkat: number; // 10, 11, atau 12
  guruPhoneMap?: Map<string, string>;
}): ClassSubjectMatrixResult {
  const { rawGuruMapel, bankList, tingkat, guruPhoneMap } = params;

  // 1. Kumpulkan seluruh kelas yang sah pada tingkat ini dari rawGuruMapel
  const classMap = new Map<string, { id: string; name: string; tingkat: number; jurusanKode?: string; jurusanId?: string }>();
  // 2. Kumpulkan seluruh mapel kurikulum yang diajarkan pada tingkat ini
  const subjectMap = new Map<string, { id: string; name: string; kode?: string }>();
  // 3. Catat penugasan resmi: Set of `${mapelId}_${kelasId}` dan info gurunya
  const assignmentMap = new Map<string, { guruId: string; guruName: string }>();

  // Pass 1: Kumpulkan seluruh rombel kelas dan mapel yang memiliki kelas_id eksplisit
  rawGuruMapel.forEach((gm) => {
    const kId = gm.kelas_id;
    const mId = gm.mapel_id;
    if (!kId || !mId) return;

    const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
    const lowerName = mapelName.toLowerCase();
    // Abaikan BK / Bimbingan Konseling yang tidak membutuhkan tes CBT tertulis
    if (
      lowerName.includes('bimbingan') ||
      lowerName.includes('konseling') ||
      lowerName.includes('bp/bk') ||
      lowerName.includes('bk')
    ) {
      return;
    }

    // Deteksi tingkat kelas
    const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
    let tNum = Number(rawTingkat);
    if (!tNum && gm.Kelas?.nama_kelas) {
      const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
      if (match) {
        const roman = match[1].toUpperCase();
        tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
      }
    }
    if (!tNum) {
      tNum = rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10;
    }

    // Hanya proses yang sesuai dengan tingkat target
    if (tNum !== tingkat) return;

    const kName = gm.Kelas?.nama_kelas || 'Kelas';
    // Ekstrak kode jurusan dari nama kelas (misal X AKL 1 => AKL, X PHT 2 => PHT)
    let jurKode = (gm.Jurusan as any)?.kode || (gm.Jurusan as any)?.singkatan || (gm.Kelas as any)?.Jurusan?.kode;
    if (!jurKode && kName) {
      const tokens = kName.split(/\s+/);
      if (tokens.length >= 2) {
        jurKode = tokens[1].toUpperCase();
      }
    }

    if (!classMap.has(kId)) {
      classMap.set(kId, {
        id: kId,
        name: kName,
        tingkat: tNum,
        jurusanKode: jurKode,
        jurusanId: gm.Kelas?.jurusan_id || undefined,
      });
    }

    if (!subjectMap.has(mId)) {
      subjectMap.set(mId, { id: mId, name: mapelName, kode: gm.Mapel?.kode_mapel });
    }

    const cellKey = `${mId}_${kId}`;
    if (!assignmentMap.has(cellKey)) {
      assignmentMap.set(cellKey, {
        guruId: gm.guru_id,
        guruName: gm.Guru?.nama_guru || 'Guru Pengampu',
      });
    }
  });

  // Pass 2: Evaluasi penugasan tanpa kelas_id (Ploting berbasis Jurusan atau Ploting Terpusat)
  // Menjamin seluruh mapel kejuruan seperti DDPK Fase E (Tingkat 10) atau Konsentrasi Keahlian (Tingkat 11/12)
  // yang di-assign berbasis jurusan tetap tampil lengkap di matriks kelas panitia.
  rawGuruMapel.forEach((gm) => {
    const kId = gm.kelas_id;
    const mId = gm.mapel_id;
    if (kId || !mId) return; // Hanya proses penugasan yang kelas_id === null / undefined

    const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
    const lowerName = mapelName.toLowerCase();
    if (
      lowerName.includes('bimbingan') ||
      lowerName.includes('konseling') ||
      lowerName.includes('bp/bk') ||
      lowerName.includes('bk')
    ) {
      return;
    }

    // Evaluasi tingkat sasaran penugasan
    const rawTingkat = gm.Mapel?.tingkat;
    let tNum = Number(rawTingkat);
    if (!tNum && typeof rawTingkat === 'string') {
      const match = (rawTingkat as string).match(/\b(X|XI|XII|10|11|12)\b/i);
      if (match) {
        const roman = match[1].toUpperCase();
        tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
      }
    }

    if (!tNum) {
      const upper = mapelName.toUpperCase();
      if (upper.includes('DDPK') || upper.includes('DASAR') || upper.includes('FASE E')) {
        tNum = 10;
      } else if (
        upper.includes('KONSENTRASI') ||
        upper.includes('FASE F') ||
        upper.startsWith('KK ') ||
        upper.startsWith('MPP ')
      ) {
        tNum = tingkat >= 11 ? tingkat : 11;
      } else {
        tNum = tingkat;
      }
    }

    if (tNum !== tingkat) return;

    const gmJurusanId = gm.jurusan_id;
    const gmJurusanKode = (gm.Jurusan?.kode || gm.Jurusan?.singkatan || '').toUpperCase().trim();
    const upperMapel = mapelName.toUpperCase();

    // Cocokkan ke rombel-rombel tingkat ini berdasarkan ID mutlak (kelas_id / jurusan_id)
    const matchedClasses = Array.from(classMap.values()).filter((cls) => {
      if (gm.kelas_id) return cls.id === gm.kelas_id;
      if (gmJurusanId && cls.jurusanId) return gmJurusanId === cls.jurusanId;

      const clsJur = (cls.jurusanKode || '').toUpperCase().trim();
      if (gmJurusanKode && clsJur) {
        return gmJurusanKode === clsJur;
      }

      if (clsJur && upperMapel.includes(clsJur)) return true;

      // Jika plotting umum tanpa batasan kelas/jurusan sama sekali
      if (!gmJurusanId && !gmJurusanKode) return true;

      return false;
    });

    if (matchedClasses.length > 0) {
      if (!subjectMap.has(mId)) {
        subjectMap.set(mId, { id: mId, name: mapelName, kode: gm.Mapel?.kode_mapel });
      }

      matchedClasses.forEach((cls) => {
        const cellKey = `${mId}_${cls.id}`;
        if (!assignmentMap.has(cellKey)) {
          assignmentMap.set(cellKey, {
            guruId: gm.guru_id,
            guruName: gm.Guru?.nama_guru || 'Guru Pengampu',
          });
        }
      });
    }
  });

  // Urutkan kelas berdasarkan nama secara alami (Natural Sort: X AKL 1, X AKL 2, dst)
  const sortedClasses = Array.from(classMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Urutkan mapel secara abjad
  const sortedSubjects = Array.from(subjectMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  // 4. Kumpulkan Bank Soal yang relevan pada tingkat ini
  const relevantBanks = bankList.filter((b) => {
    const bTingkat = resolveBankTingkatNumber(b);
    return bTingkat === tingkat || bTingkat === undefined;
  });

  // 5. Evaluasi Setiap Sel Matrix: `${mapelId}_${kelasId}`
  const cellMap = new Map<string, MatrixCellData>();
  let totalCellsRequired = 0;
  let totalCellsCovered = 0;

  sortedSubjects.forEach((sub) => {
    sortedClasses.forEach((cls) => {
      const cellKey = `${sub.id}_${cls.id}`;
      const assignment = assignmentMap.get(cellKey);

      // Jika mapel ini tidak ada di kurikulum kelas ini
      if (!assignment) {
        cellMap.set(cellKey, {
          status: 'NOT_APPLICABLE',
          mapelId: sub.id,
          mapelName: sub.name,
          kelasId: cls.id,
          kelasName: cls.name,
          tingkat,
          jurusanKode: cls.jurusanKode,
        });
        return;
      }

      totalCellsRequired++;

      // Cari apakah ada bank soal yang mencakup kelas ini pada mapel ini
      const matchingBanks = relevantBanks.filter((b) => b.mapel_id === sub.id);

      // Prioritas 1: Bank Soal spesifik untuk jurusan kelas ini (misal b.jurusan === 'KUL')
      const clsJur = (cls.jurusanKode || '').toUpperCase().trim();
      const clsNameUpper = cls.name.toUpperCase();

      const specificJurusanBank = matchingBanks.find((b) => {
        if (!b.jurusan) return false;
        const bJurUpper = b.jurusan.toUpperCase().trim();
        const tokens = bJurUpper.split(/[,\s/|]+/).map((s) => s.trim());
        if (clsJur && tokens.includes(clsJur)) return true;
        if (clsJur) {
          const aliases = JURUSAN_ALIASES[clsJur] || [];
          if (aliases.some((a) => tokens.includes(a.toUpperCase()))) return true;
        }
        return tokens.some((tok) => {
          if (!tok) return false;
          const reg = new RegExp(`\\b${tok}\\b`, 'i');
          return reg.test(clsNameUpper);
        });
      });

      // Prioritas 2: Bank Soal umum (tanpa jurusan / 'SEMUA')
      const generalBank = matchingBanks.find((b) => {
        const rawJur = (b.jurusan || '').trim().toUpperCase();
        return !rawJur || rawJur === 'SEMUA' || rawJur === 'UMUM';
      });

      // Prioritas 3: Bank Soal yang dibuat langsung oleh guru pengampu kelas ini
      const teacherDirectBank = matchingBanks.find((b) => b.guru_id === assignment.guruId);

      const resolvedBank = specificJurusanBank || generalBank || teacherDirectBank;

      const phone = assignment?.guruId ? guruPhoneMap?.get(assignment.guruId) : undefined;
      const targetKey = assignment?.guruId ? `${assignment.guruId}_${sub.id}_${tingkat}` : undefined;

      if (resolvedBank) {
        totalCellsCovered++;
        const count = resolvedBank.jumlah_soal || resolvedBank._count?.Soal || 0;
        cellMap.set(cellKey, {
          status: 'COVERED',
          mapelId: sub.id,
          mapelName: sub.name,
          kelasId: cls.id,
          kelasName: cls.name,
          tingkat,
          jurusanKode: cls.jurusanKode,
          bankSoal: resolvedBank,
          bankId: resolvedBank.id,
          bankTitle: resolvedBank.judul || resolvedBank.kode_bank,
          soalCount: count,
          guruPembuat: resolvedBank.Guru?.nama_guru || 'Guru Penyusun',
          isJurusanSpecific: Boolean(specificJurusanBank),
          guruPengampu: assignment.guruName,
          guruPengampuId: assignment.guruId,
          guruPengampuPhone: phone,
          targetId: targetKey,
        });
      } else {
        cellMap.set(cellKey, {
          status: 'MISSING',
          mapelId: sub.id,
          mapelName: sub.name,
          kelasId: cls.id,
          kelasName: cls.name,
          tingkat,
          jurusanKode: cls.jurusanKode,
          guruPengampu: assignment.guruName,
          guruPengampuId: assignment.guruId,
          guruPengampuPhone: phone,
          targetId: targetKey,
        });
      }
    });
  });

  // 6. Hitung statistik ringkasan per Kolom Kelas
  const classesSummary: MatrixClassColumn[] = sortedClasses.map((cls) => {
    let req = 0;
    let cov = 0;
    sortedSubjects.forEach((sub) => {
      const cell = cellMap.get(`${sub.id}_${cls.id}`);
      if (cell && cell.status !== 'NOT_APPLICABLE') {
        req++;
        if (cell.status === 'COVERED') cov++;
      }
    });
    const miss = req - cov;
    const pct = req > 0 ? Math.round((cov / req) * 100) : 100;
    return {
      kelasId: cls.id,
      kelasName: cls.name,
      tingkat: cls.tingkat,
      jurusanKode: cls.jurusanKode,
      totalRequiredMapel: req,
      coveredMapelCount: cov,
      missingMapelCount: miss,
      percentage: pct,
    };
  });

  // 7. Hitung statistik ringkasan per Baris Mapel
  const subjectsSummary: MatrixSubjectRow[] = sortedSubjects.map((sub) => {
    let total = 0;
    let cov = 0;
    sortedClasses.forEach((cls) => {
      const cell = cellMap.get(`${sub.id}_${cls.id}`);
      if (cell && cell.status !== 'NOT_APPLICABLE') {
        total++;
        if (cell.status === 'COVERED') cov++;
      }
    });
    const miss = total - cov;
    const pct = total > 0 ? Math.round((cov / total) * 100) : 100;
    return {
      mapelId: sub.id,
      mapelName: sub.name,
      mapelKode: sub.kode,
      totalClasses: total,
      coveredClassesCount: cov,
      missingClassesCount: miss,
      percentage: pct,
    };
  });

  const totalCellsMissing = totalCellsRequired - totalCellsCovered;
  const overallPercentage =
    totalCellsRequired > 0 ? Math.round((totalCellsCovered / totalCellsRequired) * 100) : 100;

  return {
    classes: classesSummary,
    subjects: subjectsSummary,
    cellMap,
    totalCellsRequired,
    totalCellsCovered,
    totalCellsMissing,
    overallPercentage,
  };
}
