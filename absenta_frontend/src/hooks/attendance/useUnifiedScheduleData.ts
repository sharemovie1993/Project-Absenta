import { useMemo } from 'react';
import { useJadwalKBM } from './useJadwalKBM';
import { useJadwalKegiatan } from './useJadwalKegiatan';
import { useKelasOptions } from '../../components/common';
import type { JadwalKBM } from '../../api/attendance/jadwalKBM.api';

export interface UseUnifiedScheduleParams {
  tahunPelajaranId?: string;
  semesterId?: string;
  kelasId?: string;
  guruId?: string;
  enabled?: boolean;
}

export function parseDaysArray(field: any): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return field.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Single Source of Truth Hook combining Jadwal KBM (lessons) and Jadwal Kegiatan (routine activities).
 * Ensures Visual Builder, PDF Printer, and Document Previews always receive 100% identical schedule items.
 *
 * Depends on:
 *   - useJadwalKBM    → fetches lesson schedule data
 *   - useJadwalKegiatan → fetches routine activity data (Upacara, Apel, Duha, etc.)
 */
export function useUnifiedScheduleData(params: UseUnifiedScheduleParams) {
  const { tahunPelajaranId, semesterId, kelasId, guruId, enabled = true } = params;

  // 1. Jadwal KBM (lesson schedules)
  const {
    rawList: kbmList,
    isLoading: loadingKbm,
    refetch: fetchSchedules,
  } = useJadwalKBM({
    tahun_pelajaran_id: tahunPelajaranId,
    semester_id: semesterId,
    kelas_id: kelasId,
    guru_id: guruId,
    enabled,
  });

  // 2. Jadwal Kegiatan Rutin (routine activities: Upacara, Apel, Duha, etc.)
  const { pembiasaanList, isLoading: loadingKegiatan } = useJadwalKegiatan({ aktif: true });
  const { rawList: kelasRawList } = useKelasOptions();

  // 3. Transform routine activities into JadwalKBM-shaped items (slot_index: 0)
  const pembiasaanJadwalItems = useMemo(() => {
    if (!pembiasaanList || pembiasaanList.length === 0) return [];

    const items: JadwalKBM[] = [];

    pembiasaanList.forEach((keg: any) => {
      const days = parseDaysArray(keg.hari);
      const targetKelasIds = parseDaysArray(keg.target_kelas_ids);
      const isTargetAll = keg.target_semua_kelas || !targetKelasIds || targetKelasIds.length === 0;

      const activeClassIds = isTargetAll
        ? (kelasRawList && kelasRawList.length > 0
            ? kelasRawList.map(k => k.id)
            : (kelasId && kelasId !== 'all' ? [kelasId] : []))
        : targetKelasIds;

      const rawName = keg.nama || 'PEMBIASAAN';
      const mapelNama = rawName.toUpperCase().startsWith('PEMBIASAAN')
        ? rawName.toUpperCase()
        : `PEMBIASAAN ${rawName.toUpperCase()}`;

      days.forEach(dayStr => {
        const upperDay = dayStr.toUpperCase();
        activeClassIds.forEach(kId => {
          items.push({
            id: `pembiasaan-${keg.id}-${upperDay}-${kId}`,
            tenant_id: keg.tenant_id,
            tahun_pelajaran_id: tahunPelajaranId || '',
            semester_id: semesterId || '',
            kelas_id: kId,
            guru_id: guruId || 'all',
            hari: upperDay as any,
            slot_index: 0,
            jam_mulai: keg.waktu_mulai || '06:30',
            jam_selesai: keg.waktu_selesai || '07:00',
            jenis_kegiatan: 'PEMBIASAAN',
            is_locked: true,
            is_pembiasaan: true,
            target_semua_kelas: keg.target_semua_kelas,
            Mapel: { id: `mapel-pembiasaan-${keg.id}`, nama_mapel: mapelNama, kode_mapel: 'PEMBIASAAN' },
            Kelas: { id: kId, nama_kelas: 'Seluruh Kelas' },
            Guru: undefined,
          } as any);
        });
      });
    });

    return items;
  }, [pembiasaanList, kelasRawList, tahunPelajaranId, semesterId, kelasId, guruId]);

  // 4. Unified Single Source of Truth List (KBM + Routine Activities)
  const allJadwal = useMemo(() => {
    return [...kbmList, ...pembiasaanJadwalItems];
  }, [kbmList, pembiasaanJadwalItems]);

  return {
    allJadwal,
    kbmList,
    pembiasaanJadwalItems,
    isLoading: loadingKbm || loadingKegiatan,
    fetchSchedules,
  };
}
