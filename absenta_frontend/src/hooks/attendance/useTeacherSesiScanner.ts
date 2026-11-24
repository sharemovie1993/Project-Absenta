import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { tapSiswaKeSesi } from '@/api/attendanceGerbang.api';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import type { Student } from '@/components/common/SmartStudentPicker';
import type { SesiDetail } from '@/components/attendance/sesi/SesiAttendanceList';

interface UseTeacherSesiScannerOptions {
  onSuccess?: () => void;
}

export function useTeacherSesiScanner(options?: UseTeacherSesiScannerOptions) {
  const queryClient = useQueryClient();
  const { playBeep } = useAudioFeedback();

  const [isOpen, setIsOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<any | null>(null);
  const [scannerInput, setScannerInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const sesiId: string = targetItem?.session?.id || targetItem?.id || '';

  const openScanModal = useCallback((item: any) => {
    const resolvedSesiId = item?.session?.id || item?.id;
    if (!resolvedSesiId) {
      toast.error('Sesi KBM belum dibuka.');
      return;
    }
    setTargetItem(item);
    setScannerInput('');
    setIsOpen(true);
  }, []);

  const closeScanModal = useCallback(() => {
    setIsOpen(false);
    setScannerInput('');
  }, []);

  const submitScan = useCallback(
    async (
      token?: string,
      statusOrMode?: boolean | 'HADIR' | 'MASUK' | 'PULANG' | 'TERLAMBAT',
      directStudentData?: Student | null
    ) => {
      const rawToken = (token ?? scannerInput).trim();
      if (!sesiId || !rawToken) return;

      const finalStatus: 'HADIR' | 'TERLAMBAT' =
        statusOrMode === 'TERLAMBAT' ? 'TERLAMBAT' : 'HADIR';

      setScanLoading(true);
      try {
        const targetSiswaId = directStudentData?.id || rawToken;
        const res = await tapSiswaKeSesi(sesiId, {
          siswa_id: targetSiswaId,
          status: finalStatus,
          rfid: rawToken,
        });
        toast.success(res.message || 'Presensi siswa berhasil dicatat', {
          id: 'guru-sesi-tap-toast',
          duration: 1500,
        });
        playBeep('success').catch(() => {});
        setScannerInput('');
        queryClient.invalidateQueries({ queryKey: ['presensi-terpadu-sesi', sesiId] });
        queryClient.invalidateQueries({ queryKey: ['tracking-harian-guru'] });
        options?.onSuccess?.();
      } catch (e: unknown) {
        playBeep('error').catch(() => {});
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        toast.error(err.response?.data?.message || err.message || 'Gagal scan kehadiran', {
          id: 'guru-sesi-tap-toast',
          duration: 2500,
        });
      } finally {
        setScanLoading(false);
      }
    },
    [sesiId, scannerInput, playBeep, queryClient, options]
  );

  const currentSession: SesiDetail | undefined = targetItem
    ? ({
        id: sesiId,
        mapel_id: targetItem.mapel_id,
        kelas_id: targetItem.kelas_id,
        jenis_kegiatan: targetItem.jenis_kegiatan || 'KBM',
        Mapel: targetItem.Mapel || { nama_mapel: targetItem.mapel_nama || targetItem.kegiatan },
        Kelas: targetItem.Kelas || { nama_kelas: targetItem.kelas_nama },
        ...(targetItem.session || {}),
      } as SesiDetail)
    : undefined;

  return {
    isOpen,
    sesiId,
    targetItem,
    scannerInput,
    setScannerInput,
    scanLoading,
    scannerInputRef,
    currentSession,
    kelasLabel: targetItem?.kelas_nama || targetItem?.Kelas?.nama_kelas || '',
    openScanModal,
    closeScanModal,
    submitScan,
  };
}
