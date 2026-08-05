import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { useJadwalKegiatan } from './useJadwalKegiatan';
import { useKelasOptions } from '../../components/common';

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
 */
export function useUnifiedScheduleData(params: UseUnifiedScheduleParams) {
  const { tahunPelajaranId, semesterId, kelasId, guruId, enabled = true } = params;

  // 1. Query KBM Schedules
  const { data: schedulesRes, isLoading: loadingKbm, refetch: fetchSchedules } = useQuery({
    queryKey: ['unified-jadwal-kbm-all', tahunPelajaranId, semesterId, guruId, kelasId],
    queryFn: () => {
      if (!tahunPelajaranId || !semesterId) return null;
      const apiParams: any = {
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      };
      if (guruId && guruId !== 'all') {
        apiParams.guru_id = guruId;
      }
      if (kelasId && kelasId !== 'all') {
        apiParams.kelas_id = kelasId;
      }
      return getJadwalKBM(apiParams).catch(() => null);
    },
    enabled: enabled && !!tahunPelajaranId && !!semesterId,
    staleTime: 0,
  });

  // 2. Query Routine Activities (Pembiasaan / Jam 0)
  const { pembiasaanList, isLoading: loadingKegiatan } = useJadwalKegiatan({ aktif: true });
  const { rawList: kelasRawList } = useKelasOptions();

  // 3. Transform Routine Activities into JadwalKBM items
  const pembiasaanJadwalItems = useMemo(() => {
    if (!pembiasaanList || pembiasaanList.length === 0) return [];

    const items: JadwalKBM[] = [];

    pembiasaanList.forEach((keg: any) => {
      const days = parseDaysArray(keg.hari);
      const targetKelasIds = parseDaysArray(keg.target_kelas_ids);
      const isTargetAll = keg.target_semua_kelas || !targetKelasIds || targetKelasIds.length === 0;

      const activeClassIds = isTargetAll
        ? (kelasRawList && kelasRawList.length > 0 ? kelasRawList.map(k => k.id) : (kelasId && kelasId !== 'all' ? [kelasId] : []))
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

  // 4. Raw KBM list
  const kbmList = useMemo(() => {
    return Array.isArray(schedulesRes)
      ? schedulesRes
      : (Array.isArray((schedulesRes as any)?.data) ? (schedulesRes as any).data : []);
  }, [schedulesRes]);

  // 5. Unified Single Source of Truth List (KBM + Routine Activities)
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
