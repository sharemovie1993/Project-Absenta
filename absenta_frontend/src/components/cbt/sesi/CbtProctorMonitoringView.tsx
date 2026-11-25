import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Table,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  RotateCcw,
  ShieldAlert,
  Search,
  ArrowRightLeft,
  ArrowLeft,
  Copy,
  Check,
  RotateCw,
  Play,
  Pause,
  CheckCircle,
  Printer,
  MapPin,
  Clock,
  FileText,
  PenTool,
  DoorOpen,
  Trash2,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtPesertaUjian } from '@/types/cbt.types';
import { CbtTransferNilaiModal } from '../jadwal/CbtTransferNilaiModal';
import { CbtBeritaAcaraPrintModal } from '../jadwal/CbtBeritaAcaraPrintModal';
import { CbtDaftarHadirPrintModal } from '../jadwal/CbtDaftarHadirPrintModal';
import { CbtDenahModal } from '../jadwal/CbtDenahModal';
import { CbtBuktiPelanggaranModal } from './CbtBuktiPelanggaranModal';
import { DigitalSignaturePadModal } from '@/components/ui/DigitalSignaturePadModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatLocalTimeFromISO } from '@/utils/attendance/time';

export interface ParsedSessionInfo {
  roomCode: string;
  rombel: string;
  mapel: string;
}

export const parseSessionLabel = (j: any): ParsedSessionInfo => {
  if (!j) return { roomCode: 'Ruang Ujian', rombel: '', mapel: 'Mata Pelajaran' };
  const rawRoom = (j.setting_keamanan?.ruang_ujian || '').trim();
  const namaSesi = j.nama_sesi || '';

  let rombel = '';
  let roomCode = rawRoom;

  // Ambil kurung TERAKHIR agar tidak salah membaca singkatan event seperti (ASAS)/(PSAS)
  const allMatches = Array.from(namaSesi.matchAll(/\(([^()]+)\)/g));
  if (allMatches.length > 0) {
    const inner = allMatches[allMatches.length - 1][1];
    const parts = inner.split(' - ');
    if (parts.length >= 2) {
      rombel = parts[0].trim();
      if (!roomCode) roomCode = parts[1].trim();
    } else {
      const cleaned = inner.trim();
      if (!['ASAS', 'PSAS', 'PSTS', 'SAS', 'SAT', 'STS'].includes(cleaned.toUpperCase())) {
        rombel = cleaned;
      }
    }
  }

  if (!roomCode) {
    roomCode = j.setting_keamanan?.ruang_ujian_nama || 'R.XX';
  }

  const mapel =
    j.BankSoal?.MataPelajaran?.nama_mapel ||
    j.BankSoal?.Mapel?.nama_mapel ||
    j.BankSoal?.judul ||
    'Mata Pelajaran';

  return {
    roomCode,
    rombel,
    mapel,
  };
};

interface CbtProctorMonitoringViewProps {
  initialJadwalId?: string;
  guruId?: string;
  onBack?: () => void;
  myPengawasData?: any[];
  schedulesList?: any[];
  isPanitiaView?: boolean;
  kelasList?: any[];
}

export const CbtProctorMonitoringView: React.FC<CbtProctorMonitoringViewProps> = ({
  initialJadwalId,
  guruId,
  onBack,
  myPengawasData,
  schedulesList,
  isPanitiaView = false,
  kelasList = [],
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);
  const [isDaftarHadirOpen, setIsDaftarHadirOpen] = useState(false);
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [selectedForensicPeserta, setSelectedForensicPeserta] = useState<CbtPesertaUjian | null>(null);
  const [isForensicModalOpen, setIsForensicModalOpen] = useState(false);

  const { user } = useAuthStore();
  const currentGuruId = guruId || (user as any)?.guru_profile?.id || (user as any)?.guru_id;
  const currentUserId = user?.id;
  const roleName = String(user?.role?.name || '').toUpperCase();

  // 1. Panitia / Admin: Memiliki otoritas penuh lintas ruang
  const isPrivilegedPanitia = [
    'ADMIN',
    'SUPERADMIN',
    'KEPALA_SEKOLAH',
    'WAKIL_KURIKULUM',
    'KURIKULUM',
    'PANITIA_CBT',
    'ADMIN_CBT',
  ].includes(roleName);

  // Jika user ber-role GURU murni, isPanitiaView dari parent tidak boleh menjadikannya panitia
  const isPanitia = isPrivilegedPanitia || (isPanitiaView && roleName !== 'GURU');

  // Sync bila initialJadwalId berubah dari luar
  useEffect(() => {
    if (initialJadwalId) {
      setSelectedJadwalId(initialJadwalId);
    }
  }, [initialJadwalId]);

  // Fetch jadwal list hanya jika myPengawasData / schedulesList tidak disediakan
  const { data: jadwalData } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 50, guru_id: guruId }),
    queryFn: () => cbtApi.getJadwalList({ limit: 50, guru_id: guruId }),
    enabled: (!myPengawasData || myPengawasData.length === 0) && (!schedulesList || schedulesList.length === 0),
  });

  const availableSchedules = useMemo(() => {
    if (schedulesList && schedulesList.length > 0) return schedulesList;
    if (myPengawasData && myPengawasData.length > 0) return myPengawasData;
    return jadwalData?.items || [];
  }, [schedulesList, myPengawasData, jadwalData]);

  // SSOT: Ruang yang dapat diakses oleh user saat ini
  // Jika Panitia / Admin: dapat melihat seluruh ruang
  // Jika Pengawas Ruang murni: HANYA tampilkan ruang di mana ia ditugaskan
  const filteredSchedulesForViewer = useMemo(() => {
    if (isPanitia) return availableSchedules;
    return availableSchedules.filter((j) => {
      const sec = (j.setting_keamanan as any) || {};
      const p1 = sec.pengawas_1_id || sec.pengawas_1_guru_id;
      const p2 = sec.pengawas_2_id || sec.pengawas_2_guru_id;
      const pr = sec.proktor_id || sec.pengawas_id || sec.pengawas_guru_id;
      const isAssigned = Boolean(
        (currentGuruId && (p1 === currentGuruId || p2 === currentGuruId || pr === currentGuruId)) ||
        (currentUserId && (p1 === currentUserId || p2 === currentUserId || pr === currentUserId)) ||
        (myPengawasData && myPengawasData.some((p: any) => p.id === j.id))
      );
      // Jika sesi ini adalah initialJadwalId yang sengaja dibuka (misal oleh Guru Mapel mode spectator), tetap izinkan melihat
      if (j.id === initialJadwalId) return true;
      return isAssigned;
    });
  }, [availableSchedules, isPanitia, currentGuruId, currentUserId, myPengawasData, initialJadwalId]);

  // Urutan Ruang Natural (R.01, R.02, dst)
  const sortedSchedules = useMemo(() => {
    return [...filteredSchedulesForViewer].sort((a, b) => {
      const infoA = parseSessionLabel(a);
      const infoB = parseSessionLabel(b);
      const numA = parseInt(infoA.roomCode.replace(/\D/g, ''), 10) || 9999;
      const numB = parseInt(infoB.roomCode.replace(/\D/g, ''), 10) || 9999;
      if (numA !== numB) return numA - numB;
      return infoA.roomCode.localeCompare(infoB.roomCode);
    });
  }, [filteredSchedulesForViewer]);

  // Auto-select jadwal pertama jika belum dipilih
  useEffect(() => {
    if (!selectedJadwalId && filteredSchedulesForViewer.length > 0) {
      setSelectedJadwalId(filteredSchedulesForViewer[0].id);
    }
  }, [filteredSchedulesForViewer, selectedJadwalId]);

  // Query detail jadwal aktif secara reaktif untuk menjamin data setting_keamanan & TTD selalu teranyar
  const { data: activeJadwalDetail } = useQuery({
    queryKey: cbtQueryKeys.jadwalDetail(selectedJadwalId),
    queryFn: () => (selectedJadwalId ? cbtApi.getJadwalById(selectedJadwalId) : Promise.resolve(null)),
    enabled: Boolean(selectedJadwalId),
  });

  const activeJadwal = useMemo(() => {
    if (activeJadwalDetail) return activeJadwalDetail;
    return filteredSchedulesForViewer.find((j) => j.id === selectedJadwalId) || filteredSchedulesForViewer[0] || availableSchedules[0];
  }, [filteredSchedulesForViewer, availableSchedules, selectedJadwalId, activeJadwalDetail]);

  const activeInfo = useMemo(() => parseSessionLabel(activeJadwal), [activeJadwal]);

  // Deteksi environment simulasi / demo / staging / pengujian lokal
  const isSimulationEnv = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = (window.location.hostname || '').toLowerCase();
    return (
      host.includes('simulasi') ||
      host.includes('demo') ||
      host.includes('staging') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1')
    );
  }, []);

  // Deteksi Jendela Waktu Ujian Aktif:
  // Fleksibel: Sesi aktif, atau berada di hari pelaksanaan yang sama (same-day tolerance untuk susulan/kesiangan)
  const isWithinExamWindow = useMemo(() => {
    if (!activeJadwal) return false;
    if (activeJadwal.status === 'ACTIVE') return true;
    const nowTime = Date.now();
    const start = new Date(activeJadwal.tanggal_mulai).getTime();
    const end = new Date(activeJadwal.tanggal_selesai).getTime();
    if (isNaN(start) || isNaN(end)) return true;

    // Fleksibilitas hari yang sama: jika hari ini sama dengan hari pelaksanaan ujian, izinkan akses meja pengawas
    const nowDateStr = new Date(nowTime).toDateString();
    const isSameDay = nowDateStr === new Date(start).toDateString() || nowDateStr === new Date(end).toDateString();
    if (isSameDay) return true;

    return nowTime >= start - 30 * 60 * 1000 && nowTime <= end + 60 * 60 * 1000;
  }, [activeJadwal]);

  // Mode Pra-Ujian Terkunci (Di Luar Jadwal Sesi):
  // Tidak terkunci jika panitia view, environment simulasi/staging/demo/lokal, atau sudah masuk waktu ujian
  const isPraUjianLocked = !isPanitiaView && !isSimulationEnv && !isWithinExamWindow && activeJadwal?.status === 'DRAFT';

  // Fetch live peserta dengan interval 10 detik
  const { data: pesertaList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(selectedJadwalId, { search: searchQuery }),
    queryFn: () =>
      selectedJadwalId ? cbtApi.getPesertaList(selectedJadwalId, { search: searchQuery }) : Promise.resolve([]),
    enabled: Boolean(selectedJadwalId),
    refetchInterval: 10000,
  });

  const kelasMap = useMemo(() => {
    return new Map((kelasList || []).map((k: any) => [k.id, k.nama_kelas || k.nama]));
  }, [kelasList]);

  const activeRombel =
    activeInfo.rombel ||
    (activeJadwal?.target_kelas_ids?.[0] ? kelasMap.get(activeJadwal.target_kelas_ids[0]) : '') ||
    (pesertaList?.[0] as CbtPesertaUjian)?.Siswa?.Kelas?.nama_kelas ||
    '';

  // Resolusi Kode Ruang & Label Sorotan untuk Denah Pengawas
  const activeRoomCode = useMemo(() => {
    if (activeInfo.roomCode && activeInfo.roomCode !== 'R.XX' && activeInfo.roomCode !== 'Ruang Ujian') {
      return activeInfo.roomCode;
    }
    const raw = activeJadwal?.setting_keamanan?.ruang_ujian?.trim();
    if (raw && !raw.toLowerCase().includes('multi') && raw.toLowerCase() !== 'ruang kelas') {
      return raw;
    }
    const firstPeserta = (pesertaList as CbtPesertaUjian[])?.[0];
    if (firstPeserta?.Siswa?.Kelas?.nama_kelas) {
      return firstPeserta.Siswa.Kelas.nama_kelas;
    }
    return raw || null;
  }, [activeInfo, activeJadwal, pesertaList]);

  const activeRoomLabel = useMemo(() => {
    if (activeRoomCode) {
      return `Ruang: ${activeRoomCode}`;
    }
    return 'Ruang Ujian';
  }, [activeRoomCode]);

  // Mutasi Reset / Retake Login Siswa
  const resetMutation = useMutation({
    mutationFn: ({
      jadwalId,
      siswaId,
      mode,
    }: {
      jadwalId: string;
      siswaId: string;
      mode?: 'reconnect' | 'retake';
    }) => cbtApi.resetPeserta(jadwalId, siswaId, mode),
    onSuccess: async (_data, variables) => {
      if (variables.mode === 'retake') {
        toast.success('Ujian berhasil diulang dari nol. Seluruh jawaban sebelumnya telah dibersihkan.');
      } else {
        toast.success('Sesi login dibuka. Siswa dapat login kembali (jawaban tersimpan aman).');
      }
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.pesertaList(selectedJadwalId),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mereset sesi siswa'),
  });

  // Mutasi Kontrol Sesi & Token
  const activateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.activateJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian aktif! Siswa dapat masuk dengan token.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengaktifkan sesi ujian'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => cbtApi.pauseJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian dijeda sementara.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menjeda sesi ujian'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => cbtApi.completeJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian resmi diselesaikan.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyelesaikan sesi ujian'),
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: (id: string) => cbtApi.regenerateToken(id),
    onSuccess: async (res) => {
      toast.success(`Token baru dibuat: ${res.token_ujian}`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membuat ulang token'),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => cbtApi.deleteJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian berhasil dihapus permanen');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      const remaining = sortedSchedules.filter((j) => j.id !== activeJadwal?.id);
      if (remaining.length > 0) {
        setSelectedJadwalId(remaining[0].id);
      } else {
        onBack?.();
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus sesi ujian'),
  });

  const handleDeleteSession = async () => {
    if (!activeJadwal) return;
    const isConfirmed = await confirm({
      title: 'Hapus Sesi Ujian?',
      message: `PERINGATAN: Sesi "${activeJadwal.nama_sesi}" beserta seluruh data peserta (${totalPeserta} siswa) dan hasil jawaban akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isConfirmed) {
      deleteSessionMutation.mutate(activeJadwal.id);
    }
  };

  const pengawasSignature = activeJadwal?.setting_keamanan?.tanda_tangan_pengawas_1;
  const waktuTtdPengawas = activeJadwal?.setting_keamanan?.waktu_ttd_pengawas_1;

  const updatePengawasSignatureMutation = useMutation({
    mutationFn: async (base64Signature: string) => {
      if (!activeJadwal?.id) throw new Error('Jadwal tidak ditemukan');
      const rawSetting = activeJadwal.setting_keamanan || {};
      const currentSetting = typeof rawSetting === 'string' ? JSON.parse(rawSetting) : rawSetting;
      const updatedSetting = {
        ...currentSetting,
        tanda_tangan_pengawas_1: base64Signature,
        waktu_ttd_pengawas_1: new Date().toISOString(),
      };
      return cbtApi.updateJadwal(activeJadwal.id, {
        setting_keamanan: updatedSetting,
      });
    },
    onSuccess: async () => {
      toast.success('Tanda tangan digital pengawas berhasil disimpan');
      setIsSignModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['my-pengawas-cbt-schedules'], exact: false, refetchType: 'all' });
      if (activeJadwal?.id) {
        await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwalDetail(activeJadwal.id) });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan tanda tangan pengawas');
    },
  });

  const handleCopyToken = (token: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success(`Token "${token}" disalin!`);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleActivateSession = async () => {
    if (!activeJadwal) return;
    if (isPraUjianLocked) {
      toast.error('Sesi ujian belum dapat diaktifkan di luar jadwal pelaksanaan!');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Aktifkan Sesi Ujian?',
      style: 'primary',
      confirmText: 'Aktifkan Sekarang',
      cancelText: 'Batal',
      message: (
        <div className="space-y-3 pt-1 text-xs">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
              {activeJadwal.nama_sesi}
            </div>
            <div className="text-[11px] text-slate-500">
              Ruang {activeInfo.roomCode || 'Ujian'} • Durasi: {activeJadwal.durasi_menit || 90} Menit
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Token Masuk Siswa
              </div>
              <div className="font-mono text-base font-black tracking-widest text-emerald-800 dark:text-emerald-200">
                {activeJadwal.token_ujian || '------'}
              </div>
            </div>
            <div className="text-right text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Bagikan token ini ke siswa di ruangan
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            Setelah diaktifkan, siswa di ruangan dapat langsung memasukkan token untuk memulai pengerjaan soal.
          </p>
        </div>
      ),
    });
    if (isConfirmed) {
      activateMutation.mutate(activeJadwal.id);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeJadwal) return;

    // 1. Validasi Tanda Tangan Digital Pengawas Ruang:
    // Pengawas ruang wajib menandatangani Berita Acara sebelum sesi ujian ruangan ini resmi diselesaikan
    const hasSignature = Boolean(
      activeJadwal?.setting_keamanan?.tanda_tangan_pengawas_1 ||
      (activeJadwal?.setting_keamanan as any)?.tanda_tangan_digital
    );

    if (!isPanitia && !hasSignature) {
      const wantToSign = await confirm({
        title: 'Tanda Tangan Pengawas Diperlukan',
        style: 'warning',
        confirmText: 'Tanda Tangani Berita Acara',
        cancelText: 'Kembali',
        message: (
          <div className="space-y-3 pt-1 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Sebagai kepatuhan SOP resmi, Pengawas Ruang wajib membubuhkan <strong>Tanda Tangan Digital</strong> sebelum sesi ujian ruangan ini resmi diselesaikan.
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold text-xs text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <span>Dokumen Berita Acara Pelaksanaan</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Tanda tangan Anda akan langsung tertera pada lembar cetak Berita Acara dan Daftar Hadir resmi untuk arsip kurikulum & panitia.
              </p>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Klik &quot;Tanda Tangani Berita Acara&quot; untuk langsung membuka pad tanda tangan digital.
            </p>
          </div>
        ),
      });
      if (wantToSign) {
        setIsSignModalOpen(true);
      }
      return;
    }

    const finishedCount = pesertaList.filter((p) => p.status === 'FINISHED').length;
    const inProgressCount = pesertaList.filter((p) => p.status === 'IN_PROGRESS').length;
    const standbyCount = pesertaList.filter((p) => p.status === 'STANDBY').length;
    const totalCount = pesertaList.length;

    const isConfirmed = await confirm({
      title: inProgressCount > 0 ? 'Peringatan: Selesaikan Sesi Ujian?' : 'Konfirmasi Selesaikan Sesi',
      style: inProgressCount > 0 ? 'danger' : 'warning',
      confirmText: inProgressCount > 0 ? 'Tetap Selesaikan Sesi' : 'Ya, Selesaikan Sesi',
      cancelText: 'Batal',
      message: (
        <div className="space-y-3 pt-1 text-xs">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
              {activeJadwal.nama_sesi}
            </div>
            <div className="text-[11px] text-slate-500">
              Ruang {activeInfo.roomCode || 'Ujian'} • Token: {activeJadwal.token_ujian || '-'}
            </div>
          </div>

          {/* Stat Cards Ringkas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-center">
              <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                {finishedCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Selesai
              </div>
            </div>

            <div
              className={cn(
                'p-2 rounded-xl border text-center',
                inProgressCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              )}
            >
              <div
                className={cn(
                  'text-base font-black',
                  inProgressCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                )}
              >
                {inProgressCount}
              </div>
              <div
                className={cn(
                  'text-[10px] font-bold',
                  inProgressCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                )}
              >
                Mengerjakan
              </div>
            </div>

            <div
              className={cn(
                'p-2 rounded-xl border text-center',
                standbyCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              )}
            >
              <div
                className={cn(
                  'text-base font-black',
                  standbyCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'
                )}
              >
                {standbyCount}
              </div>
              <div
                className={cn(
                  'text-[10px] font-bold',
                  standbyCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'
                )}
              >
                Belum Hadir
              </div>
            </div>
          </div>

          {/* Conditional Alert Boxes */}
          {inProgressCount > 0 ? (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-bold text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-1">
                <span>⚠️ Perhatian: Siswa Masih Mengerjakan</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                Mengakhiri sesi sekarang akan <strong>mengunci dan mengumpulkan otomatis</strong> lembar jawaban {inProgressCount} siswa yang sedang aktif. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          ) : standbyCount > 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                ℹ️ Catatan Peserta Belum Hadir / Sakit
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                Terdapat <strong>{standbyCount} siswa</strong> yang belum hadir / belum mengerjakan ujian. Siswa yang belum hadir dapat dialihkan ke <strong>Sesi Ujian Susulan</strong>.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-[11px] leading-relaxed">
              Seluruh peserta ({totalCount} siswa) telah selesai mengerjakan. Sesi ujian siap difinalisasi dan ditutup resmi.
            </div>
          )}
        </div>
      ),
    });
    if (isConfirmed) {
      completeMutation.mutate(activeJadwal.id);
    }
  };

  const handleReset = async (peserta: CbtPesertaUjian) => {
    const isDisqualified = peserta.status === 'DISQUALIFIED';
    const jwbCount = Array.isArray(peserta.jawaban_json)
      ? peserta.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
      : 0;

    const isConfirmed = await confirm({
      title: isDisqualified ? 'Buka Blokir & Izinkan Lanjut Ujian?' : 'Izinkan Siswa Masuk Kembali?',
      message: isDisqualified
        ? `Buka blokir ujian untuk "${peserta.Siswa?.nama_lengkap || 'Siswa'}"?\n\n` +
          `• JAWABAN AMAN: ${jwbCount} butir jawaban yang telah dikerjakan TETAP TERSIMPAN dan tidak akan hilang.\n` +
          `• Sisa waktu ujian dilanjutkan saat siswa login kembali.\n` +
          `• Riwayat peringatan pelanggaran dibersihkan agar siswa dapat menyelesaikan ujian.`
        : `Buka sesi login untuk "${peserta.Siswa?.nama_lengkap || 'Siswa'}"?\n\n` +
          `• JAWABAN AMAN: ${jwbCount > 0 ? `${jwbCount} butir jawaban yang sudah diisi` : 'Seluruh jawaban'} TETAP AMAN dan tidak akan hilang.\n` +
          `• Gunakan jika HP siswa mati, baterai habis, koneksi terputus, atau ingin berganti perangkat.\n` +
          `• Sisa waktu ujian akan melanjutkan sisa waktu sebelumnya saat siswa memasukkan token.`,
      confirmText: isDisqualified ? 'Buka Blokir (Jawaban Aman)' : 'Izinkan Masuk (Jawaban Aman)',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (isConfirmed) {
      resetMutation.mutate({ jadwalId: selectedJadwalId, siswaId: peserta.siswa_id, mode: 'reconnect' });
    }
  };

  const handleRetake = async (peserta: CbtPesertaUjian) => {
    const jwbCount = Array.isArray(peserta.jawaban_json)
      ? peserta.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
      : 0;

    const isConfirmed = await confirm({
      title: 'Mulai Ulang Ujian dari Nol (Hapus Jawaban)?',
      message: `PERINGATAN KERAS: Tindakan ini akan MENGHAPUS TOTAL ujian untuk "${peserta.Siswa?.nama_lengkap || 'Siswa'}".\n\n` +
        `• HAPUS JAWABAN: Sebanyak ${jwbCount} butir jawaban yang pernah diisi akan DIHAPUS PERMANEN.\n` +
        `• Nilai di-reset ke 0 dan seluruh riwayat pelanggaran dibersihkan.\n` +
        `• Siswa akan memulai kembali dari nomor 1 dengan durasi penuh baru.\n\n` +
        `Gunakan HANYA jika siswa mendapat remedial resmi atau diizinkan mengulang total!`,
      confirmText: 'Hapus Semua & Ulang dari Nol',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isConfirmed) {
      resetMutation.mutate({ jadwalId: selectedJadwalId, siswaId: peserta.siswa_id, mode: 'retake' });
    }
  };

  const handleGrantDispensasi = async (peserta: CbtPesertaUjian) => {
    try {
      await cbtApi.grantDispensasiTerlambat(selectedJadwalId, peserta.siswa_id);
      toast.success(`Izin keterlambatan diberikan untuk ${peserta.Siswa?.nama_lengkap || 'siswa'}`);
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.all,
        exact: false,
        refetchType: 'all',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memberikan izin dispensasi');
    }
  };

  // Metrik Ringkas
  const totalPeserta = pesertaList.length;
  const inProgress = pesertaList.filter((p) => p.status === 'IN_PROGRESS').length;
  const finished = pesertaList.filter((p) => p.status === 'FINISHED').length;
  const standbyCount = pesertaList.filter((p) => p.status === 'STANDBY').length;
  // Deteksi Seluruh Peserta yang Terindikasi Curang (Baik berstatus DISQUALIFIED maupun memiliki riwayat log pelanggaran)
  const cheatingCount = pesertaList.filter(
    (p) =>
      p.status === 'DISQUALIFIED' ||
      (Array.isArray(p.log_pelanggaran_json) && p.log_pelanggaran_json.length > 0)
  ).length;

  // 2. Pengawas Terjadwal: Memiliki wewenang HANYA jika ia terplot di sesi/ruang ini
  const isAssignedProctor = useMemo(() => {
    if (!activeJadwal) return false;
    // Jika dibuka melalui daftar tugas mengawas pribadi
    if (myPengawasData && myPengawasData.some((p: any) => p.id === activeJadwal.id)) {
      return true;
    }
    const sec = activeJadwal.setting_keamanan as any;
    if (!sec) return false;

    // Cek kecocokan ID pengawas ruang atau proktor
    const p1Id = sec.pengawas_1_id || sec.pengawas_1_guru_id;
    const p2Id = sec.pengawas_2_id || sec.pengawas_2_guru_id;
    const pGenId = sec.pengawas_id || sec.pengawas_guru_id || sec.proktor_id;

    if (currentUserId && (p1Id === currentUserId || p2Id === currentUserId || pGenId === currentUserId)) {
      return true;
    }
    if (currentGuruId && (p1Id === currentGuruId || p2Id === currentGuruId || pGenId === currentGuruId)) {
      return true;
    }
    return false;
  }, [activeJadwal, myPengawasData, currentUserId, currentGuruId]);

  // 3. Hak Kontrol Sesi & Peserta (Proctor Execution Permission)
  const canControlSession = isPanitia || isAssignedProctor;

  // 4. Mode Spectator: Jika bukan Panitia dan bukan Pengawas terplot di sesi ini (Guru Mapel murni)
  const isSpectatorOnly = !canControlSession;

  // 5. Hak Akses Transfer Nilai ke e-Rapor (Khusus Guru Mapel pemilik Bank Soal atau Panitia)
  const isOwnerOrAdmin =
    isPanitia ||
    (currentGuruId && activeJadwal?.BankSoal?.guru_id === currentGuruId) ||
    (currentGuruId && (activeJadwal?.setting_keamanan as any)?.created_by_guru_id === currentGuruId);

  const filteredItems = useMemo(() => {
    return pesertaList.filter((p) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DISQUALIFIED') {
          const isCheating =
            p.status === 'DISQUALIFIED' ||
            (Array.isArray(p.log_pelanggaran_json) && p.log_pelanggaran_json.length > 0);
          if (!isCheating) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.Siswa?.nama_lengkap?.toLowerCase().includes(q);
        const matchNis = p.Siswa?.nis?.includes(q);
        return matchName || matchNis;
      }
      return true;
    });
  }, [pesertaList, statusFilter, searchQuery]);

  const jamMulai = formatLocalTimeFromISO(activeJadwal?.tanggal_mulai);
  const jamSelesai = formatLocalTimeFromISO(activeJadwal?.tanggal_selesai);

  // Kolom Desktop
  const columns: Column[] = [
    {
      key: 'siswa',
      title: 'Siswa',
      label: 'Siswa',
      className: 'min-w-[200px]',
      render: (_val: unknown, row: CbtPesertaUjian) => (
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
            {row.Siswa?.nama_lengkap || '-'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>NIS: {row.Siswa?.nis || '-'}</span>
            <span>•</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {row.Siswa?.Kelas?.nama_kelas || '-'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      label: 'Status',
      className: 'min-w-[120px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status === 'IN_PROGRESS') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>UJIAN</span>
            </span>
          );
        }
        if (row.status === 'FINISHED') {
          return (
            <Badge variant="success" className="text-[10px] font-bold">
              SELESAI
            </Badge>
          );
        }
        if (row.status === 'DISQUALIFIED') {
          return (
            <Badge variant="danger" className="text-[10px] font-bold">
              DISKUALIFIKASI
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-[10px] font-bold text-slate-500">
            STANDBY
          </Badge>
        );
      },
    },
    {
      key: 'waktu',
      title: 'Waktu',
      label: 'Waktu',
      className: 'min-w-[105px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status === 'IN_PROGRESS') {
          const sisa = row.sisa_waktu_detik ?? 0;
          const mins = Math.floor(sisa / 60);
          const secs = sisa % 60;
          const timerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          const isUrgent = sisa < 300;
          const isWarning = sisa < 900;

          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-lg border',
                isUrgent
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 animate-pulse'
                  : isWarning
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              )}
              title={`Sisa waktu: ${mins} menit ${secs} detik`}
            >
              <Clock size={11} className={isUrgent ? 'text-rose-600 animate-spin' : 'text-slate-400'} />
              <span>{timerText}</span>
            </span>
          );
        }

        if (row.status === 'FINISHED') {
          const durasiMenit = row.durasi_pengerjaan_detik ? Math.round(row.durasi_pengerjaan_detik / 60) : null;
          return (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {durasiMenit ? `${durasiMenit} mnt` : 'Selesai'}
            </span>
          );
        }

        return <span className="text-slate-400 text-xs italic">-</span>;
      },
    },
    {
      key: 'progres',
      title: 'Terjawab',
      label: 'Terjawab',
      className: 'min-w-[90px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        const jwbCount = Array.isArray(row.jawaban_json)
          ? row.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
          : 0;
        return (
          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
            {jwbCount} Soal
          </span>
        );
      },
    },
    {
      key: 'pelanggaran',
      title: 'Anti-Curang',
      label: 'Anti-Curang',
      className: 'min-w-[110px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        const vCount = Array.isArray(row.log_pelanggaran_json) ? row.log_pelanggaran_json.length : 0;
        if (vCount === 0) {
          return <span className="text-[11px] text-emerald-600 font-semibold">Tertib (0)</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
            <ShieldAlert size={12} />
            <span>{vCount} Curang</span>
          </span>
        );
      },
    },
    {
      key: 'nilai',
      title: 'Nilai',
      label: 'Nilai',
      className: 'min-w-[80px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status === 'DISQUALIFIED') {
          return (
            <span
              className="font-black text-xs px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              title="Didiskualifikasi karena pelanggaran (Nilai 0.0)"
            >
              0.0
            </span>
          );
        }
        if (row.status !== 'FINISHED') {
          return <span className="text-slate-400 text-xs italic">-</span>;
        }
        const isRemedial = (activeJadwal?.setting_keamanan as any)?.is_remedial;
        const remedialAudit = (row.metadata_perangkat as any)?.remedial_audit;
        const rawScore = remedialAudit?.raw_remedial_score;

        return (
          <div className="inline-flex flex-col items-center gap-1">
            <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {Number(row.nilai_akhir).toFixed(1)}
            </span>
            {(isRemedial || remedialAudit?.is_remedial) && rawScore !== undefined && Number(rawScore) !== Number(row.nilai_akhir) && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                (Murni: {Number(rawScore).toFixed(1)})
              </span>
            )}
            {Array.isArray(row.unit_scores) && row.unit_scores.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 max-w-[200px]">
                {row.unit_scores.map((u) => (
                  <span
                    key={u.unit_pengajaran_id}
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/70 whitespace-nowrap"
                    title={`${u.nama_unit}${u.guru_nama ? ` (${u.guru_nama})` : ''}: ${u.benar}/${u.total_soal} benar`}
                  >
                    {u.nama_unit}: {Number(u.skor).toFixed(0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'aksi',
      title: 'Aksi',
      label: 'Aksi',
      className: 'min-w-[130px] text-right',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        // Tombol Bukti Forensik (Dapat dilihat oleh Guru Mapel, Pengawas, maupun Panitia untuk klarifikasi sanggahan)
        const canViewForensic = row.status !== 'STANDBY';

        const forensicButton = canViewForensic ? (
          <button
            type="button"
            onClick={() => {
              setSelectedForensicPeserta(row);
              setIsForensicModalOpen(true);
            }}
            className="text-[10px] h-6 px-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 font-semibold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
            title="Lihat Bukti Digital Forensik Pelanggaran & Lembar Jawaban Siswa"
          >
            <FileText size={11} />
            <span>Bukti</span>
          </button>
        ) : null;

        if (isSpectatorOnly) {
          return (
            <div className="inline-flex items-center gap-1.5 justify-end">
              {forensicButton}
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60" title="Aksi intervensi peserta hanya dapat dilakukan oleh Pengawas Ruang atau Panitia">
                Pengawas Ruang
              </span>
            </div>
          );
        }

        if (row.status === 'STANDBY') {
          const isDispensasi =
            Array.isArray((activeJadwal?.setting_keamanan as any)?.dispensasi_terlambat_siswa_ids) &&
            (activeJadwal.setting_keamanan as any).dispensasi_terlambat_siswa_ids.includes(row.siswa_id);

          return (
            <div className="inline-flex items-center gap-1 justify-end">
              {isDispensasi ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200">
                  Izin Telat ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGrantDispensasi(row)}
                  className="text-[10px] h-6 px-2 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  title="Beri izin masuk jika siswa terlambat"
                >
                  <Clock size={10} />
                  <span>Izin Telat</span>
                </button>
              )}
            </div>
          );
        }

        // 1. Siswa SUDAH SELESAI (FINISHED): Tampilkan Tuntas dan opsi Ulang kecil jika remedial
        if (row.status === 'FINISHED') {
          return (
            <div className="inline-flex items-center gap-1.5 justify-end">
              {forensicButton}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check size={11} className="text-emerald-600" />
                <span>Tuntas</span>
              </span>
              <button
                type="button"
                onClick={() => handleRetake(row)}
                className="text-[10px] h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/60 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                title="Beri kesempatan remedial / tes ulang (Hapus jawaban & mulai dari awal)"
              >
                <RotateCcw size={10} />
                <span>Ulang</span>
              </button>
            </div>
          );
        }

        // 2. Siswa DIDISKUALIFIKASI (DISQUALIFIED): Tampilkan Buka Blokir atau Ulang dari Nol + Tombol Bukti
        if (row.status === 'DISQUALIFIED') {
          return (
            <div className="inline-flex items-center gap-1.5 justify-end">
              {forensicButton}
              <button
                type="button"
                onClick={() => handleReset(row)}
                className="text-[11px] h-7 px-2.5 rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/60 font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shrink-0"
                title="Buka blokir agar siswa dapat melanjutkan ujian (Jawaban Tersimpan Aman)"
              >
                <Unlock size={11} className="text-emerald-700 dark:text-emerald-400" />
                <span>Buka Blokir</span>
              </button>
              <button
                type="button"
                onClick={() => handleRetake(row)}
                className="text-[11px] h-7 px-2 rounded-lg border border-rose-300 text-rose-700 bg-rose-50/70 hover:bg-rose-100 font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shrink-0"
                title="Hapus seluruh jawaban dan mulai ulang dari nol"
              >
                <RotateCcw size={11} />
                <span>Ulang Nol</span>
              </button>
            </div>
          );
        }

        // 3. Siswa SEDANG UJIAN (IN_PROGRESS): Tombol Bukti + Izinkan Masuk jika HP mati/logout
        return (
          <div className="inline-flex items-center gap-1.5 justify-end">
            {forensicButton}
            <button
              type="button"
              onClick={() => handleReset(row)}
              className="text-[11px] h-7 px-2.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950/60 font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shrink-0"
              title="Izinkan siswa login kembali jika HP mati, baterai habis, atau logout (Jawaban Tersimpan Aman)"
            >
              <RotateCw size={11} className="text-amber-700 dark:text-amber-400" />
              <span>Izinkan Masuk</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
      {/* ── BARIS 1: HEADER INFORMASI SESI & HERO TOKEN (ZERO DUPLICATION) ── */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Kiri: Tombol Back + Room Badge + Mapel/Rombel + Status + Waktu */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Kembali ke Pusat Komando"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
          )}

          {/* Badge Ruang (Cyan) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 font-black text-xs shrink-0 shadow-2xs">
            <DoorOpen size={13} className="text-cyan-600" />
            <span>{activeInfo.roomCode}</span>
          </div>

          {/* Mapel & Rombel */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                {activeInfo.mapel}
              </h3>
              {activeRombel && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  • {activeRombel}
                </span>
              )}

              {/* Status Sesi Badge */}
              {activeJadwal?.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>AKTIF</span>
                </span>
              ) : activeJadwal?.status === 'DRAFT' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  DRAFT
                </span>
              ) : activeJadwal?.status === 'PAUSED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                  DIJEDA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {activeJadwal?.status || 'SELESAI'}
                </span>
              )}
            </div>

            {/* Sub-info: Jam & Pengawas */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {jamMulai && jamSelesai && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} />
                  {jamMulai}–{jamSelesai}
                </span>
              )}
              {activeJadwal?.setting_keamanan?.pengawas_1_nama && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500">
                      Pengawas: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activeJadwal.setting_keamanan.pengawas_1_nama}</strong>
                    </span>
                    {isPanitiaView && (
                      pengawasSignature ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Check size={10} className="text-emerald-600" />
                          <span>Sudah TTD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span>Belum TTD</span>
                        </span>
                      )
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Kanan: Hero Token Box */}
        {activeJadwal && (
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {isPraUjianLocked ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none shadow-xs"
                title="Token ujian terkunci di luar jadwal sesi (akan dirilis saat hari pelaksanaan ujian)"
              >
                <div className="text-left">
                  <div className="text-[9px] uppercase font-black tracking-wider text-slate-400 leading-none flex items-center gap-1">
                    <span>Token Siswa</span>
                    <Lock size={9} />
                  </div>
                  <div className="font-mono text-base sm:text-lg font-black tracking-widest text-slate-400 dark:text-slate-500 leading-tight">
                    ••••••
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Terkunci
                </span>
              </div>
            ) : (
              <>
                <div
                  onClick={() => handleCopyToken(activeJadwal.token_ujian)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/80 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/70 transition-all select-none shadow-xs group"
                  title="Klik untuk menyalin token siswa"
                >
                  <div className="text-left">
                    <div className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                      Token Siswa
                    </div>
                    <div className="font-mono text-base sm:text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-300 leading-tight">
                      {activeJadwal.token_ujian || '------'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 transition-colors cursor-pointer"
                    aria-label="Salin Token"
                  >
                    {copiedToken ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>

                {isPanitiaView && (
                  <button
                    type="button"
                    onClick={() => regenerateTokenMutation.mutate(activeJadwal.id)}
                    disabled={regenerateTokenMutation.isPending}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                    title="Acak Ulang Token"
                    aria-label="Acak Ulang Token"
                  >
                    <RotateCw size={14} className={regenerateTokenMutation.isPending ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── BARIS 2: SWITCHER SESI RUANG (Hanya jika > 1 sesi) ── */}
      {sortedSchedules.length > 1 && (
        <div className="px-3 sm:px-4 py-2 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wider mr-1">
            Ruang:
          </span>
          {sortedSchedules.map((j) => {
            const isSelected = j.id === (activeJadwal?.id || selectedJadwalId);
            const sInfo = parseSessionLabel(j);
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJadwalId(j.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                )}
              >
                <span>{sInfo.roomCode}</span>
                {sInfo.rombel && (
                  <span className={cn('text-[10px]', isSelected ? 'text-white/80' : 'text-slate-400')}>
                    ({sInfo.rombel})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── SECURITY GUARDRAIL BANNER DI LUAR JADWAL SESI (FASE PRA-UJIAN) ── */}
      {isPraUjianLocked && (
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-y border-amber-300 dark:border-amber-800/80 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Lock size={14} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 flex-wrap">
                <span>Mode Pra-Ujian (Di Luar Jadwal Sesi)</span>
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase bg-amber-500 text-white">
                  TERKUNCI
                </span>
              </p>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                Token ujian dan kontrol aktivasi dikunci hingga waktu pelaksanaan demi integritas naskah. Anda dapat memanfaatkan mode ini untuk mengecek daftar peserta, mencetak presensi daftar hadir, dan meninjau denah tempat duduk.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BANNER MODE PEMANTAU GURU MAPEL (SPECTATOR MODE - ZERO DISRUPTION) ── */}
      {isSpectatorOnly && (
        <div className="mx-3 sm:mx-4 my-2 px-3.5 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Eye size={14} />
            </div>
            <p className="truncate sm:whitespace-normal">
              <strong className="font-bold">Mode Pemantau Guru Mapel (Read-Only)</strong>: Anda memantau jalannya ujian kelas ini secara langsung. Kontrol sesi (Jeda, Selesaikan) & aksi peserta dikelola oleh Pengawas Ruang resmi (<strong>{activeJadwal?.setting_keamanan?.pengawas_1_nama || 'Pengawas Ruang'}</strong>) atau Panitia CBT.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-black uppercase tracking-wider bg-sky-200/70 dark:bg-sky-800 text-sky-800 dark:text-sky-200 shrink-0">
            Spectator
          </span>
        </div>
      )}

      {/* ── BARIS 3: TOOLBAR OPERASIONAL & FILTER RINGKAS (ZERO VERTICAL WASTE) ── */}
      <div className="p-2.5 sm:p-3 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2.5">
        {/* Kiri: Filter status tabs & Search */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: 'ALL', label: 'Semua', count: totalPeserta },
              { key: 'IN_PROGRESS', label: 'Ujian', count: inProgress, dot: inProgress > 0 },
              { key: 'STANDBY', label: 'Standby', count: standbyCount },
              { key: 'FINISHED', label: 'Selesai', count: finished },
              { key: 'DISQUALIFIED', label: 'Curang', count: cheatingCount, alert: cheatingCount > 0 },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                  statusFilter === st.key
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {st.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />}
                <span>{st.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                    statusFilter === st.key
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : st.alert
                      ? 'bg-rose-100 text-rose-700 font-black'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[150px] sm:w-44 lg:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa / NIS..."
              className="w-full pl-7 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="Cari siswa pada sesi"
            />
          </div>
        </div>

        {/* Kanan: Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* 1. Kontrol Sesi (Aktifkan / Jeda / Lanjutkan / Selesaikan - HANYA PENGAWAS TERPLOT & PANITIA) */}
          {canControlSession && (activeJadwal?.status === 'DRAFT' || activeJadwal?.status === 'PAUSED') && (
            <button
              type="button"
              onClick={handleActivateSession}
              disabled={activateMutation.isPending || (isPraUjianLocked && !isPanitiaView)}
              className={cn(
                'h-7 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0',
                isPraUjianLocked && !isPanitiaView
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
              )}
              title={
                isPraUjianLocked && !isPanitiaView
                  ? 'Aktivasi dikunci di luar jadwal pelaksanaan ujian'
                  : 'Aktifkan Sesi Ujian'
              }
            >
              {isPraUjianLocked && !isPanitiaView ? (
                <Lock size={11} className="text-slate-400" />
              ) : (
                <Play size={11} className="fill-white" />
              )}
              <span>
                {activeJadwal?.status === 'PAUSED'
                  ? 'Lanjutkan'
                  : isPraUjianLocked && !isPanitiaView
                  ? 'Terkunci (Pra-Ujian)'
                  : 'Aktifkan'}
              </span>
            </button>
          )}

          {/* 1. Kontrol Siklus Sesi (Jeda / Selesaikan Sesi - PENGAWAS RUANG RESMI & PANITIA) */}
          {canControlSession && activeJadwal?.status === 'ACTIVE' && (
            <>
              <button
                type="button"
                onClick={() => pauseMutation.mutate(activeJadwal.id)}
                disabled={pauseMutation.isPending}
                className="h-7 px-2.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                title="Jeda Sesi Ujian"
              >
                <Pause size={12} />
                <span>Jeda</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                disabled={completeMutation.isPending}
                className="h-7 px-2.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs"
                title="Selesaikan Sesi Ujian Ruangan Ini"
              >
                <CheckCircle size={12} />
                <span>Selesaikan</span>
              </button>
            </>
          )}

          {/* 2. TTD Digital Pengawas (Hanya jika dibuka oleh Pengawas Resmi Ruangan, bukan di posko Panitia atau Guru Mapel) */}
          {!isPanitiaView && isAssignedProctor && (
            <button
              type="button"
              onClick={() => setIsSignModalOpen(true)}
              className={cn(
                'h-7 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95',
                pengawasSignature
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
              )}
              title={pengawasSignature ? 'Tanda tangan pengawas tersimpan' : 'Tanda tangan digital pengawas'}
            >
              <PenTool size={12} />
              <span>{pengawasSignature ? 'Sudah TTD' : 'TTD'}</span>
            </button>
          )}

          {/* 3. Daftar Hadir Siswa */}
          <button
            type="button"
            onClick={() => setIsDaftarHadirOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Cetak Lembar Kehadiran Siswa"
          >
            <FileText size={12} />
            <span>Daftar Hadir</span>
          </button>

          {/* 4. Berita Acara Pelaksanaan */}
          <button
            type="button"
            onClick={() => setIsBeritaAcaraOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Cetak Berita Acara Ujian"
          >
            <Printer size={12} />
            <span>Berita Acara</span>
          </button>

          {/* 5. Denah Ruang */}
          <button
            type="button"
            onClick={() => setIsDenahModalOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Lihat Lokasi di Denah Kampus"
          >
            <MapPin size={12} />
            <span>Denah</span>
          </button>

          {/* 6. Transfer Nilai (Jika owner & ada peserta) */}
          {isOwnerOrAdmin && activeJadwal && activeJadwal.status !== 'DRAFT' && totalPeserta > 0 && (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="h-7 px-2.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
              title="Transfer Nilai ke e-Rapor"
            >
              <ArrowRightLeft size={12} />
              <span>Transfer</span>
            </button>
          )}

          {/* 7. Segarkan Data */}
          <button
            type="button"
            onClick={() => refetch()}
            className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
            title="Segarkan Data Peserta"
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden lg:inline text-[11px] font-medium">Segarkan</span>
          </button>

          {/* 8. Hapus Sesi Ujian (HANYA PANITIA YANG BERHAK) */}
          {isPanitia && activeJadwal && (
            <button
              type="button"
              onClick={handleDeleteSession}
              disabled={deleteSessionMutation.isPending}
              className="h-7 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100/80 transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
              title="Hapus Sesi Ujian Ini Permanen"
            >
              <Trash2 size={12} className={deleteSessionMutation.isPending ? 'animate-spin' : ''} />
              <span className="text-[11px] font-bold">Hapus Sesi</span>
            </button>
          )}
        </div>
      </div>

      {/* ── BARIS 4: TABEL MONITORING LIVE (LANGSUNG MUNCUL TANPA SCROLL!) ── */}
      {/* 1. Mobile Cards View */}
      <div className="block sm:hidden p-3 space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            Memuat data peserta ujian...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            Tidak ada peserta yang cocok dengan filter
          </div>
        ) : (
          filteredItems.map((p, idx) => {
            const jwbCount = Array.isArray(p.jawaban_json)
              ? p.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
              : 0;
            const vCount = Array.isArray(p.log_pelanggaran_json) ? p.log_pelanggaran_json.length : 0;

            return (
              <div
                key={p.id || p.siswa_id || `peserta-${idx}`}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {p.Siswa?.nama_lengkap || '-'}
                    </span>
                    {p.status === 'IN_PROGRESS' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                        UJIAN
                      </span>
                    ) : p.status === 'FINISHED' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 shrink-0">
                        SELESAI
                      </span>
                    ) : p.status === 'DISQUALIFIED' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 shrink-0">
                        CURANG
                      </span>
                    ) : p.status === 'STANDBY' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                        STANDBY
                      </span>
                    ) : null}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span>{p.Siswa?.Kelas?.nama_kelas || '-'}</span>
                    {p.status === 'IN_PROGRESS' && p.sisa_waktu_detik != null && (
                      <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">
                        ⏳ {Math.floor(p.sisa_waktu_detik / 60)}m
                      </span>
                    )}
                    {p.status === 'FINISHED' && p.durasi_pengerjaan_detik != null && (
                      <span className="font-mono text-[10px] text-slate-500">
                        ⏱️ {Math.round(p.durasi_pengerjaan_detik / 60)}m
                      </span>
                    )}
                    <span>•</span>
                    <span>{jwbCount} Soal</span>
                    {vCount > 0 && (
                      <span className="text-rose-600 font-bold">• {vCount} Curang</span>
                    )}
                    {p.status === 'FINISHED' && p.nilai_akhir != null && (
                      <span className="font-black text-indigo-600 dark:text-indigo-400">
                        • {Number(p.nilai_akhir).toFixed(1)}
                        {(p.metadata_perangkat as any)?.remedial_audit?.raw_remedial_score !== undefined &&
                          Number((p.metadata_perangkat as any).remedial_audit.raw_remedial_score) !== Number(p.nilai_akhir) && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (Murni: {Number((p.metadata_perangkat as any).remedial_audit.raw_remedial_score).toFixed(1)})
                            </span>
                          )}
                      </span>
                    )}
                    {p.status === 'DISQUALIFIED' && (
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        • 0.0 (Diskualifikasi)
                      </span>
                    )}
                  </div>
                  {p.status === 'FINISHED' && Array.isArray(p.unit_scores) && p.unit_scores.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.unit_scores.map((u) => (
                        <span
                          key={u.unit_pengajaran_id}
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/70"
                        >
                          {u.nama_unit}: {Number(u.skor).toFixed(0)} ({u.benar}/{u.total_soal})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!isSpectatorOnly ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === 'STANDBY' ? (
                      (() => {
                        const isDispensasi =
                          Array.isArray((activeJadwal?.setting_keamanan as any)?.dispensasi_terlambat_siswa_ids) &&
                          (activeJadwal.setting_keamanan as any).dispensasi_terlambat_siswa_ids.includes(p.siswa_id);
                        return isDispensasi ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200">
                            Izin Telat ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrantDispensasi(p)}
                            className="text-[10px] h-6 px-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            title="Beri izin masuk jika siswa terlambat"
                          >
                            <Clock size={10} />
                            <span>Izin Telat</span>
                          </button>
                        );
                      })()
                    ) : p.status === 'FINISHED' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForensicPeserta(p);
                            setIsForensicModalOpen(true);
                          }}
                          className="text-[10px] h-6 px-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-md cursor-pointer flex items-center gap-0.5"
                          title="Lihat Bukti Forensik & Rekap Jawaban"
                        >
                          <FileText size={10} />
                          <span>Bukti</span>
                        </button>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Check size={10} className="text-emerald-600" />
                          <span>Tuntas</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetake(p)}
                          className="text-[10px] h-6 px-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 font-semibold rounded-md cursor-pointer flex items-center gap-0.5"
                          title="Beri kesempatan remedial / tes ulang (Hapus jawaban & mulai dari awal)"
                        >
                          <RotateCcw size={10} />
                          <span>Ulang</span>
                        </button>
                      </div>
                    ) : p.status === 'DISQUALIFIED' ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForensicPeserta(p);
                            setIsForensicModalOpen(true);
                          }}
                          className="text-[10px] h-7 px-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer flex items-center gap-0.5 shrink-0"
                          title="Lihat Bukti Digital Forensik Pelanggaran"
                        >
                          <FileText size={11} />
                          <span>Bukti</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReset(p)}
                          className="text-[11px] h-7 px-2 border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                          title="Buka blokir agar siswa dapat melanjutkan ujian (Jawaban Aman)"
                        >
                          <Unlock size={11} className="text-emerald-700" />
                          <span>Buka Blokir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetake(p)}
                          className="text-[11px] h-7 px-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                          title="Hapus seluruh jawaban dan mulai ulang dari nol"
                        >
                          <RotateCcw size={11} />
                          <span>Ulang Nol</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForensicPeserta(p);
                            setIsForensicModalOpen(true);
                          }}
                          className="text-[10px] h-7 px-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer flex items-center gap-0.5 shrink-0"
                          title="Lihat Rekap Pengerjaan Siswa"
                        >
                          <FileText size={11} />
                          <span>Bukti</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReset(p)}
                          className="text-[11px] h-7 px-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                          title="Izinkan siswa login kembali jika HP mati atau logout (Jawaban Aman)"
                        >
                          <RotateCw size={11} className="text-amber-700" />
                          <span>Izinkan Masuk</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="shrink-0 flex items-center gap-1 justify-end">
                    {p.status !== 'STANDBY' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedForensicPeserta(p);
                          setIsForensicModalOpen(true);
                        }}
                        className="text-[10px] h-6 px-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Lihat Bukti Digital Forensik Siswa"
                      >
                        <FileText size={10} />
                        <span>Bukti</span>
                      </button>
                    )}
                    <span className="text-[10px] font-semibold text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                      Pengawas
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <Table
          data={filteredItems}
          columns={columns}
          loading={isLoading}
          hoverable={true}
          emptyMessage="Tidak ada data peserta ujian pada sesi ini"
          className="border-0"
        />
      </div>

      {/* Modal Transfer Nilai ke e-Rapor */}
      {isTransferModalOpen && activeJadwal && (
        <CbtTransferNilaiModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Cetak Berita Acara Pelaksanaan */}
      {isBeritaAcaraOpen && activeJadwal && (
        <CbtBeritaAcaraPrintModal
          isOpen={isBeritaAcaraOpen}
          onClose={() => setIsBeritaAcaraOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Cetak Lembar Daftar Hadir Siswa */}
      {isDaftarHadirOpen && activeJadwal && (
        <CbtDaftarHadirPrintModal
          isOpen={isDaftarHadirOpen}
          onClose={() => setIsDaftarHadirOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Denah Spasial Kampus (Interaktif Read-Only untuk Pengawas) */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          eventName={activeJadwal?.nama_sesi || 'Ujian CBT'}
          highlightRoomCode={activeRoomCode}
          highlightLabel={activeRoomLabel}
          isReadOnly={true}
        />
      )}

      {/* Modal Tanda Tangan Digital Pengawas Sesi */}
      {activeJadwal && (
        <DigitalSignaturePadModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          title="Tanda Tangan Digital Pengawas Ujian"
          subtitle={`Sesi: ${activeJadwal.nama_sesi || 'Ujian CBT'} • Ruang: ${activeJadwal.setting_keamanan?.ruang_ujian || 'Ruang CBT'}`}
          penName={activeJadwal.setting_keamanan?.pengawas_1_nama || 'Pengawas Ruang'}
          initialSignature={pengawasSignature}
          onSave={(sig) => updatePengawasSignatureMutation.mutate(sig)}
        />
      )}

      {/* Modal Bukti Otentik Forensik Pelanggaran & Lembar Jawaban Siswa */}
      {isForensicModalOpen && selectedForensicPeserta && activeJadwal && (
        <CbtBuktiPelanggaranModal
          isOpen={isForensicModalOpen}
          onClose={() => {
            setIsForensicModalOpen(false);
            setSelectedForensicPeserta(null);
          }}
          peserta={selectedForensicPeserta}
          jadwal={activeJadwal}
        />
      )}
    </div>
  );
};

export default CbtProctorMonitoringView;
