import type { GuruMapel } from '@/types/academic';
import type { JadwalKBM } from '@/api/attendance/jadwalKBM.api';

export type SlotAllocationStatus = 'UNSCHEDULED' | 'PARTIAL' | 'COMPLETE' | 'OVERALLOCATED';

export interface UnslottedDutyItem {
  id: string; // `${guruId}_${mapelId}_${kelasId}`
  guruId: string;
  guruNama: string;
  guruNip?: string;
  mapelId: string;
  mapelNama: string;
  mapelKode?: string;
  kelasId: string;
  kelasNama: string;
  tingkat?: number | string;
  jurusanKode?: string;
  targetJp: number; // Alokasi JP dari ploting / struktur kurikulum
  placedJp: number; // Slot JP yang sudah dibuat di jadwal pelajaran
  remainingJp: number; // Sisa JP yang belum dibuatkan slotnya
  status: SlotAllocationStatus;
}

export interface UnslottedAuditSummary {
  totalAssignments: number;
  unscheduledCount: number; // 0 slot terpasang sama sekali
  partialCount: number; // < target JP
  completeCount: number; // == target JP
  overallocatedCount: number; // > target JP
  overallPlacedJp: number;
  overallTargetJp: number;
  overallRemainingJp: number;
  completionPercentage: number;
  items: UnslottedDutyItem[];
}

/**
 * Engine Inti untuk mengaudit dan memfilter penugasan Ploting Guru-Mapel
 * yang belum memiliki slot jadwal atau slotnya belum lengkap.
 */
export function auditUnslottedSchedules(params: {
  allGuruMapel: GuruMapel[];
  allJadwal: JadwalKBM[];
  targetJpMap?: Map<string, number>;
  defaultTargetJp?: number;
}): UnslottedAuditSummary {
  const { allGuruMapel = [], allJadwal = [], targetJpMap, defaultTargetJp = 2 } = params;

  // 1. Buat index cepat untuk jadwal yang sudah ada: Map key `${guruId}_${mapelId}_${kelasId}` -> count
  const placedCountMap = new Map<string, number>();
  allJadwal.forEach((j) => {
    const gId = j.guru_id;
    const mId = j.mapel_id;
    const kId = j.kelas_id;
    if (!gId || !mId || !kId) return;

    const key = `${gId}_${mId}_${kId}`;
    placedCountMap.set(key, (placedCountMap.get(key) || 0) + 1);
  });

  const items: UnslottedDutyItem[] = [];
  let unscheduledCount = 0;
  let partialCount = 0;
  let completeCount = 0;
  let overallocatedCount = 0;
  let overallPlacedJp = 0;
  let overallTargetJp = 0;

  // Set untuk mendeduplikasi kombinasi jika ada row duplikat di DB
  const processedKeys = new Set<string>();

  allGuruMapel.forEach((gm) => {
    const gId = gm.guru_id;
    const mId = gm.mapel_id;
    const kId = gm.kelas_id;
    if (!gId || !mId || !kId) return;

    const key = `${gId}_${mId}_${kId}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const guruNama = gm.Guru?.nama_guru || 'Guru Pengampu';
    const guruNip = (gm.Guru as any)?.nip || undefined;
    const mapelNama = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
    const mapelKode = gm.Mapel?.kode_mapel || undefined;
    const kelasNama = gm.Kelas?.nama_kelas || 'Kelas';

    // Deteksi tingkat kelas
    const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
    let tNum = Number(rawTingkat);
    if (!tNum && kelasNama) {
      const match = kelasNama.match(/\b(X|XI|XII|10|11|12)\b/i);
      if (match) {
        const roman = match[1].toUpperCase();
        tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
      }
    }

    // Ekstraksi kode jurusan
    let jurKode =
      (gm.Jurusan as any)?.kode ||
      (gm.Jurusan as any)?.singkatan ||
      (gm.Kelas as any)?.Jurusan?.kode;
    if (!jurKode && kelasNama) {
      const tokens = kelasNama.split(/\s+/);
      if (tokens.length >= 2) {
        jurKode = tokens[1].toUpperCase();
      }
    }

    // Hitung target JP
    const targetJp =
      (gm as any).alokasi_jam ||
      (gm as any).jp_per_minggu ||
      (targetJpMap && targetJpMap.get(mId)) ||
      gm.Mapel?.jp_per_minggu ||
      defaultTargetJp;

    // Hitung actual JP yang terpasang di grid jadwal
    const placedJp = placedCountMap.get(key) || 0;
    const remainingJp = Math.max(0, targetJp - placedJp);

    let status: SlotAllocationStatus;
    if (placedJp === 0) {
      status = 'UNSCHEDULED';
      unscheduledCount++;
    } else if (placedJp < targetJp) {
      status = 'PARTIAL';
      partialCount++;
    } else if (placedJp === targetJp) {
      status = 'COMPLETE';
      completeCount++;
    } else {
      status = 'OVERALLOCATED';
      overallocatedCount++;
    }

    overallPlacedJp += placedJp;
    overallTargetJp += targetJp;

    items.push({
      id: key,
      guruId: gId,
      guruNama,
      guruNip,
      mapelId: mId,
      mapelNama,
      mapelKode,
      kelasId: kId,
      kelasNama,
      tingkat: tNum || rawTingkat || undefined,
      jurusanKode: jurKode || undefined,
      targetJp,
      placedJp,
      remainingJp,
      status,
    });
  });

  // Urutkan item secara natural: yang UNSCHEDULED paling atas, lalu PARTIAL, lalu nama guru
  items.sort((a, b) => {
    const priority = { UNSCHEDULED: 0, PARTIAL: 1, OVERALLOCATED: 2, COMPLETE: 3 };
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }
    return a.guruNama.localeCompare(b.guruNama) || a.kelasNama.localeCompare(b.kelasNama);
  });

  const totalAssignments = items.length;
  const overallRemainingJp = Math.max(0, overallTargetJp - overallPlacedJp);
  const completionPercentage =
    overallTargetJp > 0 ? Math.round((overallPlacedJp / overallTargetJp) * 100) : 100;

  return {
    totalAssignments,
    unscheduledCount,
    partialCount,
    completeCount,
    overallocatedCount,
    overallPlacedJp,
    overallTargetJp,
    overallRemainingJp,
    completionPercentage,
    items,
  };
}
