import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { getMyJadwalKBM, getJadwalKBM, type JadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { useCbtOperationMode } from '../cbtModeHelper';
import { resolveBankTingkatNumber } from '../jadwal/cbtJadwalHelper';
import { formatTingkatRomawi } from './cbtAsesmenHelper';

export type DutyCoverStatus =
  | 'COVERED_OWN'   // Siap pakai (mandiri & ada butir soal)
  | 'COVERED_MGMP'  // Siap pakai (di-cover master MGMP rekan guru & ada butir soal)
  | 'DRAFT_OWN'     // Draf mandiri (bank soal sudah dibuat, tapi masih 0 butir soal)
  | 'DRAFT_MGMP'    // Draf MGMP (master MGMP sudah ada, tapi masih 0 butir soal)
  | 'PENDING';      // Belum ada bank soal sama sekali

export interface TeacherDutyItem {
  key: string;
  mapelId: string;
  mapelName: string;
  mapelKode?: string;
  tingkat: number;
  tingkatRoman: string;
  targetJurusan?: string;
  teachingJurusans?: string[]; // Daftar jurusan yang riil diampu guru pada mapel & tingkat ini
  rombelNames: string[];
  status: DutyCoverStatus;
  soalCount: number;
  bankSoal?: CbtBankSoal;
  masterAuthorName?: string;
  ownBank?: CbtBankSoal;     // Bank Soal Mandiri Milik Guru Sendiri
  mgmpBank?: CbtBankSoal;    // Bank Soal MGMP / Rekan Berbagi yang Beririsan
}

export interface TeacherCbtDutyStatusResult {
  isLoading: boolean;
  activeEventName?: string;
  hasActiveEvent: boolean;
  teacherName?: string;
  totalDuties: number;
  coveredDuties: number;
  draftDuties: number;
  uncreatedDuties: number;
  pendingDuties: number;
  completionPercentage: number;
  isFullyExempt: boolean;
  hasNoDuties: boolean;
  items: TeacherDutyItem[];
  pendingJurusanSummary?: string;
}

export function useTeacherCbtDutyStatus(guruId?: string): TeacherCbtDutyStatusResult {
  const { activeEvent, eventName, targetTingkat } = useCbtOperationMode();

  // 1. Ambil Penugasan SK Mengajar Guru (GuruMapel)
  const { data: assignedMapelsRes, isLoading: isMapelLoading } = useQuery({
    queryKey: ['guru-assigned-mapels-for-duty', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 1b. Ambil Jadwal KBM Mingguan Riil Guru (untuk melengkapi pemetaan rombel bila SK belum memiliki kelas_id spesifik)
  const { data: jadwalKBMRes, isLoading: isJadwalLoading } = useQuery({
    queryKey: ['guru-jadwal-kbm-for-duty', guruId],
    queryFn: async () => {
      try {
        const res = await getMyJadwalKBM({ weekly: 'true' } as any);
        const list = res?.data || (res as any)?.items;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch {
        // Fallback ke endpoint umum dengan filter guru_id
      }
      if (guruId) {
        try {
          const fallbackRes = await getJadwalKBM({ guru_id: guruId } as any);
          const fList = fallbackRes?.data || fallbackRes?.items;
          if (Array.isArray(fList)) return fList;
        } catch {
          // ignore
        }
      }
      return [];
    },
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 2. Ambil Bank Soal Relevan (milik sendiri + master MGMP yang di-share ke guru ini)
  const { data: bankListRes, isLoading: isBankLoading } = useQuery({
    queryKey: ['cbt-bank-soal-for-teacher-duty', guruId],
    queryFn: () =>
      guruId
        ? cbtApi
            .getBankSoalList({
              guru_id: guruId,
              limit: 200,
            })
            .catch(() => null)
        : null,
    enabled: Boolean(guruId),
    staleTime: 30 * 1000,
  });

  const rawAssignedList: GuruMapel[] = useMemo(() => {
    return assignedMapelsRes?.data || [];
  }, [assignedMapelsRes]);

  const rawJadwalList: JadwalKBM[] = useMemo(() => {
    return Array.isArray(jadwalKBMRes) ? jadwalKBMRes : (jadwalKBMRes as any)?.data || [];
  }, [jadwalKBMRes]);

  const rawBankList: CbtBankSoal[] = useMemo(() => {
    return bankListRes?.items || (bankListRes as any)?.data?.items || [];
  }, [bankListRes]);

  // 3. Evaluasi Penugasan vs Ketercoveran Bank Soal dengan Granularitas Jurusan & Rekonsiliasi Jadwal
  const evaluation = useMemo(() => {
    const hasAssignments = rawAssignedList.length > 0 || rawJadwalList.length > 0;
    if (!guruId || !hasAssignments) {
      return {
        totalDuties: 0,
        coveredDuties: 0,
        draftDuties: 0,
        uncreatedDuties: 0,
        pendingDuties: 0,
        completionPercentage: 100,
        isFullyExempt: false,
        hasNoDuties: true,
        items: [],
        pendingJurusanSummary: undefined,
      };
    }

    // Helper ekstraksi tingkat dari teks / angka
    const resolveTingkatHelper = (raw: any, textRef?: string): number => {
      let tNum = Number(raw);
      if (!tNum && textRef) {
        const match = textRef.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }
      if (!tNum) {
        tNum = raw === 'XI' ? 11 : raw === 'XII' ? 12 : 10;
      }
      return tNum;
    };

    // Helper ekstraksi kode jurusan resmi (HANYA dari relasi database resmi: Kelas.Jurusan atau GM.Jurusan)
    // DILARANG keras melakukan string parsing dari nama rombel/kelas untuk mencegah kesalahan identifikasi
    const resolveJurusanKode = (jurRef?: any, kelasRef?: any): string => {
      const jur = jurRef || kelasRef?.Jurusan;
      if (!jur) return 'UMUM';
      const code = jur.kode || jur.singkatan || (jur.nama ? String(jur.nama).trim() : '');
      if (!code) return 'UMUM';
      const clean = code.toUpperCase().trim();
      return clean === 'SEMUA' || clean === 'UMUM' ? 'UMUM' : clean;
    };

    // Helper filter penugasan non-akademik (Piket, BK, Upacara, Ekskul, dll) yang tidak memerlukan Bank Soal CBT
    const isNonAcademicDuty = (name: string, jenisKegiatan?: string): boolean => {
      if (jenisKegiatan && jenisKegiatan.toUpperCase() !== 'KBM') {
        return true;
      }
      const lower = (name || '').toLowerCase().trim();
      const nonAcademicKeywords = [
        'piket',
        'tugas piket',
        'bimbingan',
        'konseling',
        'bp/bk',
        'bk',
        'upacara',
        'apel',
        'literasi',
        'istirahat',
        'sholat',
        'duha',
        'dzuhur',
        'ekskul',
        'ekstrakurikuler',
        'kokurikuler',
        'wali kelas',
        'p5',
        'projek penguatan',
        'keagamaan',
        'senam',
      ];
      return nonAcademicKeywords.some((kw) => lower.includes(kw));
    };

    // Indexing JadwalKBM riil mingguan guru untuk memperkaya kelas yang null di SK
    interface ScheduleClassItem {
      mapelId?: string;
      mapelName: string;
      kelasId?: string;
      namaKelas: string;
      tingkat: number;
      jurusanKode: string;
    }

    const scheduleByMapelKey = new Map<string, ScheduleClassItem[]>();
    const scheduleByMapelName = new Map<string, ScheduleClassItem[]>();

    rawJadwalList.forEach((j) => {
      const mName = j.Mapel?.nama_mapel || '';
      const kName = j.Kelas?.nama_kelas || '';
      if (!mName || !kName) return;
      if (isNonAcademicDuty(mName, j.jenis_kegiatan)) return;

      const tNum = resolveTingkatHelper(j.Kelas?.tingkat, kName);
      const jurKode = resolveJurusanKode((j as any)?.Jurusan, j.Kelas);

      const item: ScheduleClassItem = {
        mapelId: j.mapel_id,
        mapelName: mName,
        kelasId: j.kelas_id,
        namaKelas: kName,
        tingkat: tNum,
        jurusanKode: jurKode,
      };

      if (j.mapel_id) {
        const mKey = `${j.mapel_id}_${tNum}`;
        if (!scheduleByMapelKey.has(mKey)) scheduleByMapelKey.set(mKey, []);
        scheduleByMapelKey.get(mKey)!.push(item);
      }

      const nameKey = `${mName.trim().toLowerCase()}_${tNum}`;
      if (!scheduleByMapelName.has(nameKey)) scheduleByMapelName.set(nameKey, []);
      scheduleByMapelName.get(nameKey)!.push(item);
    });

    // 0. Registry SSOT Jurusan per rombel/kelas dari sumber database resmi
    const classJurusanMap = new Map<string, string>();
    rawAssignedList.forEach((gm) => {
      const kName = gm.Kelas?.nama_kelas;
      if (kName) {
        const jCode = resolveJurusanKode(gm.Jurusan, gm.Kelas);
        if (jCode && jCode !== 'UMUM') {
          classJurusanMap.set(kName, jCode);
        }
      }
    });
    rawJadwalList.forEach((j) => {
      const kName = j.Kelas?.nama_kelas;
      if (kName) {
        const jCode = resolveJurusanKode((j as any)?.Jurusan, j.Kelas);
        if (jCode && jCode !== 'UMUM') {
          classJurusanMap.set(kName, jCode);
        }
      }
    });

    const resolveClassJurusan = (kName?: string, jurRef?: any, kelasRef?: any): string => {
      let code = resolveJurusanKode(jurRef, kelasRef);
      if (code === 'UMUM' && kName && classJurusanMap.has(kName)) {
        code = classJurusanMap.get(kName)!;
      }
      return code;
    };

    // Kelompokkan penugasan mengajar per Mapel & Tingkat, lalu breakdown per Jurusan
    interface JurusanGroup {
      jurusanKode: string;
      rombelNames: Set<string>;
    }

    const mapelTingkatMap = new Map<
      string,
      {
        mapelId: string;
        mapelName: string;
        mapelKode?: string;
        tingkat: number;
        jurusanMap: Map<string, JurusanGroup>;
      }
    >();

    // 1. Masukkan penugasan dari GuruMapel
    rawAssignedList.forEach((gm) => {
      const mId = gm.mapel_id;
      if (!mId) return;

      const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
      if (isNonAcademicDuty(mapelName)) return;

      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      const kName = gm.Kelas?.nama_kelas || '';
      const tNum = resolveTingkatHelper(rawTingkat, kName);

      // Filter tingkat yang relevan dengan event jika event memiliki sasaran tingkat
      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = `${mId}_${tNum}`;
      if (!mapelTingkatMap.has(mtKey)) {
        mapelTingkatMap.set(mtKey, {
          mapelId: mId,
          mapelName,
          mapelKode: gm.Mapel?.kode_mapel,
          tingkat: tNum,
          jurusanMap: new Map<string, JurusanGroup>(),
        });
      }

      const mtEntry = mapelTingkatMap.get(mtKey)!;

      if (kName) {
        // Jika sudah ada nama kelas eksplisit dari GuruMapel
        const jurKode = resolveClassJurusan(kName, gm.Jurusan, gm.Kelas);
        if (!mtEntry.jurusanMap.has(jurKode)) {
          mtEntry.jurusanMap.set(jurKode, {
            jurusanKode: jurKode,
            rombelNames: new Set<string>(),
          });
        }
        mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(kName);
      } else {
        // Jika kelas_id di GuruMapel kosong, hanya lookup jadwal jika belum ada rombel yang terdaftar
        const totalExistingRombels = Array.from(mtEntry.jurusanMap.values()).reduce(
          (acc, g) => acc + g.rombelNames.size,
          0
        );

        const mKey = `${mId}_${tNum}`;
        const nameKey = `${mapelName.trim().toLowerCase()}_${tNum}`;
        const matchingSchedules = scheduleByMapelKey.get(mKey) || scheduleByMapelName.get(nameKey) || [];

        if (matchingSchedules.length > 0) {
          matchingSchedules.forEach((sch) => {
            const schJurKode = resolveClassJurusan(sch.namaKelas, undefined, undefined) || sch.jurusanKode;
            if (!mtEntry.jurusanMap.has(schJurKode)) {
              mtEntry.jurusanMap.set(schJurKode, {
                jurusanKode: schJurKode,
                rombelNames: new Set<string>(),
              });
            }
            mtEntry.jurusanMap.get(schJurKode)!.rombelNames.add(sch.namaKelas);
          });
        } else if (totalExistingRombels === 0) {
          // Fallback HANYA jika tidak ada penugasan kelas lain sama sekali di mapel tingkat ini
          const jurKode = resolveJurusanKode(gm.Jurusan, undefined);
          if (!mtEntry.jurusanMap.has(jurKode)) {
            mtEntry.jurusanMap.set(jurKode, {
              jurusanKode: jurKode,
              rombelNames: new Set<string>(),
            });
          }
          mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(`Semua Rombel Tingkat ${formatTingkatRomawi(tNum)}`);
        }
      }
    });

    // 2. Masukkan jadwal dari JadwalKBM yang mungkin belum tercatat di GuruMapel
    rawJadwalList.forEach((j) => {
      const mId = j.mapel_id;
      const mName = j.Mapel?.nama_mapel;
      const kName = j.Kelas?.nama_kelas;
      if (!mName || !kName) return;
      if (isNonAcademicDuty(mName, j.jenis_kegiatan)) return;

      const tNum = resolveTingkatHelper(j.Kelas?.tingkat, kName);
      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = mId ? `${mId}_${tNum}` : `${mName.trim().toLowerCase()}_${tNum}`;
      if (!mapelTingkatMap.has(mtKey)) {
        // Cek apakah ada entry dengan nama mapel yang sama
        const existingByName = Array.from(mapelTingkatMap.values()).find(
          (e) => e.tingkat === tNum && e.mapelName.trim().toLowerCase() === mName.trim().toLowerCase()
        );
        if (existingByName) {
          const jurKode = resolveClassJurusan(kName, (j as any)?.Jurusan, j.Kelas);
          if (!existingByName.jurusanMap.has(jurKode)) {
            existingByName.jurusanMap.set(jurKode, {
              jurusanKode: jurKode,
              rombelNames: new Set<string>(),
            });
          }
          existingByName.jurusanMap.get(jurKode)!.rombelNames.add(kName);
          return;
        }

        mapelTingkatMap.set(mtKey, {
          mapelId: mId || mtKey,
          mapelName: mName,
          mapelKode: j.Mapel?.kode_mapel,
          tingkat: tNum,
          jurusanMap: new Map<string, JurusanGroup>(),
        });
      }

      const mtEntry = mapelTingkatMap.get(mtKey)!;
      const jurKode = resolveClassJurusan(kName, (j as any)?.Jurusan, j.Kelas);

      // Jika jurKode adalah UMUM, cek apakah rombel ini sudah tercakup di grup jurusan spesifik
      if (jurKode === 'UMUM') {
        const alreadyInSpecific = Array.from(mtEntry.jurusanMap.entries()).some(
          ([code, group]) => code !== 'UMUM' && group.rombelNames.has(kName)
        );
        if (alreadyInSpecific) {
          return;
        }
      }

      if (!mtEntry.jurusanMap.has(jurKode)) {
        mtEntry.jurusanMap.set(jurKode, {
          jurusanKode: jurKode,
          rombelNames: new Set<string>(),
        });
      }
      mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(kName);
    });

    // 2.5. Sanitasi dan Rekonsiliasi Grup Jurusan (Eliminasi Redundansi UMUM vs Spesifik)
    mapelTingkatMap.forEach((entry) => {
      const specificRombels = new Set<string>();
      let hasSpecificGroupWithRombels = false;

      entry.jurusanMap.forEach((group, jCode) => {
        if (jCode !== 'UMUM') {
          group.rombelNames.forEach((r) => specificRombels.add(r));
          if (group.rombelNames.size > 0) hasSpecificGroupWithRombels = true;
        }
      });

      if (entry.jurusanMap.has('UMUM')) {
        const umumGroup = entry.jurusanMap.get('UMUM')!;
        // Hapus rombel yang sudah tercakup di grup spesifik
        umumGroup.rombelNames.forEach((r) => {
          if (specificRombels.has(r)) {
            umumGroup.rombelNames.delete(r);
          }
        });

        // Jika sudah ada grup jurusan spesifik yang valid, hapus placeholder generic "Semua Rombel"
        if (hasSpecificGroupWithRombels) {
          const genericPlaceholder = `Semua Rombel Tingkat ${formatTingkatRomawi(entry.tingkat)}`;
          umumGroup.rombelNames.delete(genericPlaceholder);
        }

        // Jika grup UMUM kini kosong, hapus grup agar tidak menciptakan duplicate task
        if (umumGroup.rombelNames.size === 0) {
          entry.jurusanMap.delete('UMUM');
        }
      }
    });

    const mapelTingkatList = Array.from(mapelTingkatMap.values());
    if (mapelTingkatList.length === 0) {
      return {
        totalDuties: 0,
        coveredDuties: 0,
        draftDuties: 0,
        uncreatedDuties: 0,
        pendingDuties: 0,
        completionPercentage: 100,
        isFullyExempt: false,
        hasNoDuties: true,
        items: [],
        pendingJurusanSummary: undefined,
      };
    }

    const items: TeacherDutyItem[] = [];
    const draftTargets: string[] = [];
    const uncreatedTargets: string[] = [];
    let totalDuties = 0;
    let coveredDuties = 0;
    let draftDuties = 0;
    let uncreatedDuties = 0;

    mapelTingkatList.forEach((mt) => {
      const { mapelId, mapelName, mapelKode, tingkat, jurusanMap } = mt;
      const romanTingkat = formatTingkatRomawi(tingkat);
      const normMapelName = mapelName.trim().toLowerCase();

      // Kumpulkan bank soal yang relevan (by mapel_id ATAU nama mapel yang cocok)
      const candidateBanks = rawBankList.filter((b) => {
        const bName = (b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul || '').trim().toLowerCase();
        const isMatchMapel = b.mapel_id === mapelId || (bName && bName.includes(normMapelName));
        if (!isMatchMapel) return false;

        const bTingkat = resolveBankTingkatNumber(b);
        return bTingkat === tingkat || bTingkat === undefined;
      });

      // Pisahkan bank milik guru vs bank master MGMP (baik terdaftar di Kontributor maupun Master MGMP yang mencakup jurusan binaan guru)
      const ownBanks = candidateBanks.filter((b) => b.guru_id === guruId);

      const isColleagueMgmpBank = (b: CbtBankSoal) => {
        if (b.guru_id === guruId) return false;
        // Kasus 1: Terdaftar eksplisit di relasi Kontributor
        if (b.Kontributor && b.Kontributor.some((c) => c.guru_id === guruId && c.can_edit_soal !== false)) {
          return true;
        }
        // Kasus 2: Bank soal adalah Master MGMP (is_shared / ber-kode resmi) dan kontributor kosong (mencakup se-jurusan)
        if (b.is_shared && (!b.Kontributor || b.Kontributor.length === 0)) {
          const rawJur = (b.jurusan || '').toUpperCase().trim();
          if (!rawJur || rawJur === 'SEMUA' || rawJur === 'UMUM') return true;
          const tokens = rawJur.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
          const myJurusans = Array.from(jurusanMap.keys()).map((k) => k.toUpperCase().trim());
          return tokens.some((t) => myJurusans.includes(t));
        }
        return false;
      };

      const mgmpBanks = candidateBanks.filter(isColleagueMgmpBank);

      // Helper Bank Soal Umum (mencakup SEMUA jurusan / UMUM / tanpa jurusan)
      const isGeneralBank = (b: CbtBankSoal) => {
        const rawJur = (b.jurusan || '').toUpperCase().trim();
        return !rawJur || rawJur === 'SEMUA' || rawJur === 'UMUM';
      };

      const ownGeneral = ownBanks.find(isGeneralBank);
      const mgmpGeneral = mgmpBanks.find(isGeneralBank);

      // Cek apakah ada varian spesifik per-jurusan
      const hasSpecificBanks = candidateBanks.some(
        (b) => b.jurusan && b.jurusan !== 'SEMUA' && b.jurusan !== 'UMUM'
      );

      const jurusanList = Array.from(jurusanMap.values());

      // KASUS 1: Ada Bank Soal Umum yang mencakup seluruh jurusan, dan tidak ada varian spesifik per-jurusan
      // Seluruh rombel binaan guru (misal TO, TE, KUL) ter-cover rapi dalam 1 target tunggal tanpa redundansi
      if ((ownGeneral || mgmpGeneral) && !hasSpecificBanks) {
        totalDuties++;
        const effectiveBank = ownGeneral || mgmpGeneral;
        const count = effectiveBank?.jumlah_soal || effectiveBank?._count?.Soal || 0;
        const allRombels = Array.from(
          new Set(jurusanList.flatMap((j) => Array.from(j.rombelNames)))
        );

        let status: DutyCoverStatus;
        if (count > 0) {
          status = ownGeneral ? 'COVERED_OWN' : 'COVERED_MGMP';
          coveredDuties++;
        } else {
          status = ownGeneral ? 'DRAFT_OWN' : 'DRAFT_MGMP';
          draftDuties++;
          draftTargets.push(`${mapelName} (Tingkat ${romanTingkat})`);
        }

        const allTeachingJurusans = Array.from(
          new Set(
            jurusanList
              .map((j) => j.jurusanKode)
              .filter((code) => code && code !== 'UMUM')
          )
        );

        items.push({
          key: `${mapelId}_${tingkat}_ALL`,
          mapelId,
          mapelName,
          mapelKode,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: undefined,
          teachingJurusans: allTeachingJurusans,
          rombelNames: allRombels.length > 0 ? allRombels : [`Semua Rombel Tingkat ${romanTingkat}`],
          status,
          soalCount: count,
          bankSoal: effectiveBank,
          masterAuthorName: ownGeneral ? undefined : mgmpGeneral?.Guru?.nama_guru,
          ownBank: ownGeneral,
          mgmpBank: mgmpGeneral,
        });
        return;
      }

      // KASUS 2: Evaluasi granular per-Jurusan
      jurusanList.forEach((jg) => {
        const { jurusanKode, rombelNames } = jg;
        totalDuties++;
        const rombelArr = Array.from(rombelNames);
        const jCode = jurusanKode !== 'UMUM' ? jurusanKode : undefined;

        // Helper matching jurusan (mendukung single jurusan maupun multi-jurusan comma-separated seperti 'KUL, PHT')
        const matchJurusan = (bJurusan?: string | null, targetJurusan?: string) => {
          if (!bJurusan || !targetJurusan) return false;
          const parts = bJurusan.toUpperCase().split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
          return parts.includes(targetJurusan.toUpperCase().trim());
        };

        // Cari bank spesifik jurusan
        const ownSpecific = ownBanks.find((b) => matchJurusan(b.jurusan, jurusanKode));
        const mgmpSpecific = mgmpBanks.find((b) => matchJurusan(b.jurusan, jurusanKode));

        const effectiveOwn = ownSpecific || ownGeneral;
        const effectiveMgmp = mgmpSpecific || mgmpGeneral;
        const matchedBank = effectiveOwn || effectiveMgmp;

        if (matchedBank) {
          const isOwn = matchedBank.guru_id === guruId;
          const count = matchedBank.jumlah_soal || matchedBank._count?.Soal || 0;
          let status: DutyCoverStatus;

          const targetLabel = jCode && !mapelName.toUpperCase().includes(jCode)
            ? `${mapelName} Jurusan ${jCode} (Tingkat ${romanTingkat})`
            : `${mapelName} (Tingkat ${romanTingkat})`;

          if (count > 0) {
            status = isOwn ? 'COVERED_OWN' : 'COVERED_MGMP';
            coveredDuties++;
          } else {
            status = isOwn ? 'DRAFT_OWN' : 'DRAFT_MGMP';
            draftDuties++;
            draftTargets.push(targetLabel);
          }

          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            mapelKode,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jCode,
            teachingJurusans: jCode ? [jCode] : [],
            rombelNames: rombelArr.length > 0 ? rombelArr : [`Semua Rombel Tingkat ${romanTingkat}`],
            status,
            soalCount: count,
            bankSoal: matchedBank,
            masterAuthorName: isOwn ? undefined : matchedBank.Guru?.nama_guru,
            ownBank: effectiveOwn,
            mgmpBank: effectiveMgmp,
          });
        } else {
          // Belum pernah dibuat sama sekali (Mandiri maupun MGMP)
          const targetLabel = jCode && !mapelName.toUpperCase().includes(jCode)
            ? `${mapelName} Jurusan ${jCode} (Tingkat ${romanTingkat})`
            : `${mapelName} (Tingkat ${romanTingkat})`;

          uncreatedDuties++;
          uncreatedTargets.push(targetLabel);

          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            mapelKode,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jCode,
            teachingJurusans: jCode ? [jCode] : [],
            rombelNames: rombelArr.length > 0 ? rombelArr : [`Semua Rombel Tingkat ${romanTingkat}`],
            status: 'PENDING',
            soalCount: 0,
            bankSoal: undefined,
            ownBank: undefined,
            mgmpBank: undefined,
          });
        }
      });
    });

    const pendingDuties = totalDuties - coveredDuties;
    const completionPercentage = totalDuties > 0 ? Math.round((coveredDuties / totalDuties) * 100) : 100;
    const isFullyExempt = totalDuties > 0 && coveredDuties === totalDuties;

    const summaryParts: string[] = [];
    if (uncreatedTargets.length > 0) {
      summaryParts.push(`Belum dibuat: ${uncreatedTargets.join(', ')}`);
    }
    if (draftTargets.length > 0) {
      summaryParts.push(`Masih draf (0 butir soal): ${draftTargets.join(', ')}`);
    }
    const pendingJurusanSummary = summaryParts.length > 0 ? summaryParts.join('; ') : undefined;

    return {
      totalDuties,
      coveredDuties,
      draftDuties,
      uncreatedDuties,
      pendingDuties,
      completionPercentage,
      isFullyExempt,
      hasNoDuties: false,
      items,
      pendingJurusanSummary,
    };
  }, [guruId, rawAssignedList, rawJadwalList, rawBankList, targetTingkat]);

  const detectedTeacherName = useMemo(() => {
    const fromGm = rawAssignedList.find((gm) => gm.Guru?.nama_guru)?.Guru?.nama_guru;
    if (fromGm) return fromGm;
    const fromJk = rawJadwalList.find((j) => (j as any)?.Guru?.nama_guru)?.Guru?.nama_guru;
    if (fromJk) return fromJk;
    return undefined;
  }, [rawAssignedList, rawJadwalList]);

  return {
    isLoading: isMapelLoading || isJadwalLoading || isBankLoading,
    activeEventName: eventName || activeEvent?.nama_event || undefined,
    hasActiveEvent: Boolean(activeEvent),
    teacherName: detectedTeacherName,
    ...evaluation,
  };
}
