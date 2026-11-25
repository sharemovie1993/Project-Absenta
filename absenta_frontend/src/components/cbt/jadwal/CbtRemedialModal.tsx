import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Badge } from '@/components/ui';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  RotateCw,
  Clock,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtPesertaUjian, CbtBankSoal } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { localDateTimeInputToISO } from '@/utils/attendance/time';
import { CbtMultiClassRemedialModal } from './CbtMultiClassRemedialModal';

interface CbtRemedialModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: CbtJadwalUjian | null;
  pesertaList?: CbtPesertaUjian[];
  onSuccess?: () => void;
}

export type RemedialScorePolicy = 'max_kktp' | 'murni' | 'highest';

export const CbtRemedialModal: React.FC<CbtRemedialModalProps> = ({
  isOpen,
  onClose,
  jadwal,
  pesertaList: propPesertaList,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // 1. Fetch live peserta jika belum di-passing dari parent
  const { data: fetchedPeserta = [], isLoading: isLoadingPeserta } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(jadwal?.id || ''),
    queryFn: () => (jadwal?.id ? cbtApi.getPesertaList(jadwal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && jadwal?.id && (!propPesertaList || propPesertaList.length === 0)),
  });

  const pesertaList = useMemo(() => {
    if (propPesertaList && propPesertaList.length > 0) return propPesertaList;
    return fetchedPeserta;
  }, [propPesertaList, fetchedPeserta]);

  // 2. Fetch Bank Soal untuk mata pelajaran yang sama jika ingin memilih bank soal remedial khusus
  const { data: bankData } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ mapel_id: jadwal?.BankSoal?.mapel_id, limit: 30 }),
    queryFn: () =>
      cbtApi.getBankSoalList({
        mapel_id: jadwal?.BankSoal?.mapel_id || (jadwal?.BankSoal?.Mapel as any)?.id,
        limit: 30,
      }),
    enabled: Boolean(isOpen && jadwal?.BankSoal),
  });

  const availableBanks: CbtBankSoal[] = useMemo(() => {
    return bankData?.items || [];
  }, [bankData]);

  // 3. States Form Remedial
  const [kktpThreshold, setKktpThreshold] = useState<number>(75);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [studentTabFilter, setStudentTabFilter] = useState<'action' | 'below' | 'susulan' | 'all' | 'above'>('action');
  const [searchStudent, setSearchStudent] = useState('');

  const [useOriginalBank, setUseOriginalBank] = useState<boolean>(true);
  const [selectedBankId, setSelectedBankId] = useState<string>(jadwal?.bank_soal_id || '');
  const [sessionName, setSessionName] = useState<string>('');
  const [durasiMenit, setDurasiMenit] = useState<number>(jadwal?.durasi_menit || 60);
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [scorePolicy, setScorePolicy] = useState<RemedialScorePolicy>('max_kktp');
  const [isTokenless, setIsTokenless] = useState<boolean>(true);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState<boolean>(false);

  // Generator Token 6 Karakter Acak (misal: RM8K2X)
  const generateRemedialToken = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = 'RM';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Pisahkan Siswa berdasarkan Status Ujian dan Ambang KKTP
  const { finishedPeserta, belowKktp, aboveKktp, susulanPeserta, actionRequiredPeserta } = useMemo(() => {
    // 1. Siswa yang belum mengikuti ujian (STANDBY / IN_PROGRESS / Belum Submit)
    const susulan = pesertaList.filter(
      (p) => p.status === 'STANDBY' || p.status === 'IN_PROGRESS' || String(p.id).startsWith('standby-')
    );

    // 2. Siswa yang sudah menyelesaikan ujian / ada hasil akhir (FINISHED / DISQUALIFIED)
    const finished = pesertaList.filter(
      (p) => !susulan.some((s) => s.siswa_id === p.siswa_id)
    );
    const below = finished.filter((p) => Number(p.nilai_akhir || 0) < kktpThreshold);
    const above = finished.filter((p) => Number(p.nilai_akhir || 0) >= kktpThreshold);

    // 3. Seluruh siswa yang membutuhkan tindakan (Remedial + Susulan)
    const actionRequired = [...below, ...susulan];

    return {
      finishedPeserta: finished,
      belowKktp: below,
      aboveKktp: above,
      susulanPeserta: susulan,
      actionRequiredPeserta: actionRequired,
    };
  }, [pesertaList, kktpThreshold]);

  // Reset & Inisialisasi Default Form Saat Modal Dibuka
  useEffect(() => {
    if (isOpen && jadwal) {
      setSelectedBankId(jadwal.bank_soal_id);
      setUseOriginalBank(true);
      setDurasiMenit(jadwal.durasi_menit || 60);
      setCustomToken(generateRemedialToken());

      const originalName = jadwal.nama_sesi || 'Sesi Ujian';
      const cleanOriginal = originalName.replace(/^\[(REMEDIAL|SUSULAN|REMEDIAL & SUSULAN)\]\s*/i, '');
      const prefix =
        susulanPeserta.length > 0 && belowKktp.length > 0
          ? '[REMEDIAL & SUSULAN]'
          : susulanPeserta.length > 0
          ? '[SUSULAN]'
          : '[REMEDIAL]';
      setSessionName(`${prefix} ${cleanOriginal}`);

      // Default waktu: mulai sekarang, berakhir besok
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatInputDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      setStartDateInput(formatInputDate(now));
      setEndDateInput(formatInputDate(tomorrow));
    }
  }, [isOpen, jadwal, susulanPeserta.length, belowKktp.length]);

  // Otomatis centang seluruh siswa yang membutuhkan tindakan (Remedial + Susulan) saat modal dibuka
  useEffect(() => {
    if (isOpen && actionRequiredPeserta.length > 0) {
      setSelectedSiswaIds(actionRequiredPeserta.map((p) => p.siswa_id));
    }
  }, [isOpen, actionRequiredPeserta]);

  // Filter Tampilan Siswa
  const displayedStudents = useMemo(() => {
    let list = actionRequiredPeserta;
    if (studentTabFilter === 'below') list = belowKktp;
    if (studentTabFilter === 'susulan') list = susulanPeserta;
    if (studentTabFilter === 'above') list = aboveKktp;
    if (studentTabFilter === 'all') list = pesertaList;

    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      list = list.filter(
        (p) =>
          p.Siswa?.nama_lengkap?.toLowerCase().includes(q) ||
          p.Siswa?.nis?.includes(q) ||
          p.Siswa?.Kelas?.nama_kelas?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [actionRequiredPeserta, belowKktp, susulanPeserta, aboveKktp, pesertaList, studentTabFilter, searchStudent]);

  const toggleSelectSiswa = (siswaId: string) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  const handleSelectAllAction = () => {
    const actionIds = actionRequiredPeserta.map((p) => p.siswa_id);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...actionIds])));
  };

  const handleSelectAllBelow = () => {
    const belowIds = belowKktp.map((p) => p.siswa_id);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...belowIds])));
  };

  const handleSelectAllSusulan = () => {
    const susulanIds = susulanPeserta.map((p) => p.siswa_id);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...susulanIds])));
  };

  const handleDeselectAll = () => {
    setSelectedSiswaIds([]);
  };

  // Mutasi Pembuatan Jadwal Remedial
  const createRemedialMutation = useMutation({
    mutationFn: async () => {
      if (!jadwal) throw new Error('Jadwal asal tidak ditemukan');
      if (selectedSiswaIds.length === 0) {
        throw new Error('Pilih minimal 1 siswa yang akan mengikuti sesi remedial ini');
      }
      if (!sessionName.trim()) {
        throw new Error('Nama sesi remedial wajib diisi');
      }

      const activeBankId = useOriginalBank ? jadwal.bank_soal_id : selectedBankId;
      if (!activeBankId) {
        throw new Error('Bank soal untuk remedial wajib ditentukan');
      }

      const activeBank = availableBanks.find((b) => b.id === activeBankId) || jadwal.BankSoal;
      const guruMapelId = activeBank?.guru_id || jadwal.BankSoal?.guru_id || null;
      const guruMapelNama =
        (activeBank as any)?.Guru?.nama_guru || (jadwal.BankSoal as any)?.Guru?.nama_guru || 'Guru Mata Pelajaran';
      const guruMapelNip =
        (activeBank as any)?.Guru?.nip || (jadwal.BankSoal as any)?.Guru?.nip || '';

      const startIso = localDateTimeInputToISO(startDateInput);
      const endIso = localDateTimeInputToISO(endDateInput);

      const payload = {
        bank_soal_id: activeBankId,
        tahun_pelajaran_id: jadwal.tahun_pelajaran_id,
        semester_id: jadwal.semester_id,
        nama_sesi: sessionName.trim(),
        token_ujian: customToken.trim().toUpperCase(),
        tanggal_mulai: startIso,
        tanggal_selesai: endIso,
        durasi_menit: Number(durasiMenit) || 60,
        toleransi_terlambat_menit: 120, // Fleksibel 120 menit (maksimal batas validasi skema)
        target_kelas_ids: jadwal.target_kelas_ids || [],
        status: 'ACTIVE' as const,
        setting_keamanan: {
          ...(jadwal.setting_keamanan || {}),
          is_remedial: true,
          parent_jadwal_id: jadwal.id,
          kktp_threshold: kktpThreshold,
          remedial_policy: scorePolicy,
          target_siswa_ids: selectedSiswaIds,
          tokenless: isTokenless,
          ruang_ujian: 'Ruang Remedial & Susulan',
          ruang_ujian_nama: 'Ruang Remedial & Susulan / Mandiri',
          // Sesi remedial bukan tugas jaga ruang pengawas panitia
          pengawas_1_id: null,
          pengawas_1_nama: null,
          pengawas_1_nip: null,
          guru_mapel_id: guruMapelId,
          guru_mapel_nama: guruMapelNama,
          guru_mapel_nip: guruMapelNip,
          pengawas_2_id: null,
          pengawas_2_nama: null,
          proktor_id: null,
          proktor_nama: null,
          // ── SANITASI TANDA TANGAN DIGITAL DARI SESI INDUK ──
          // Sesi remedial adalah milik Guru Mapel, TIDAK BOLEH mewarisi TTD pengawas ruang sesi induk!
          tanda_tangan_pengawas_1: null,
          waktu_ttd_pengawas_1: null,
          tanda_tangan_pengawas_2: null,
          waktu_ttd_pengawas_2: null,
          tanda_tangan_proktor: null,
          waktu_ttd_proktor: null,
          catatan_kejadian_khusus: '',
          shuffle_questions: true,
          shuffle_options: true,
        },
      };

      return cbtApi.createJadwal(payload);
    },
    onSuccess: async (res) => {
      const modeText = isTokenless ? 'Bebas Token (Langsung Masuk)' : `Token: ${res.token_ujian}`;
      toast.success(
        `Sesi Remedial & Susulan aktif! ${modeText} untuk ${selectedSiswaIds.length} Siswa`,
        { duration: 5000 }
      );
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan sesi remedial CBT');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRemedialMutation.mutate();
  };

  if (!jadwal) return null;

  const mapelName =
    jadwal.BankSoal?.MataPelajaran?.nama_mapel ||
    jadwal.BankSoal?.Mapel?.nama_mapel ||
    jadwal.BankSoal?.judul ||
    'Mata Pelajaran';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penerbitan Sesi Remedial & Susulan CBT"
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Shortcut Multi-Rombel (Subtle & Clean) */}
        {jadwal.BankSoal && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 text-slate-600 dark:text-slate-300">
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              <span className="truncate">Ingin aktifkan sekaligus untuk seluruh rombel binaan?</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMultiModalOpen(true)}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0 cursor-pointer text-xs transition-colors"
            >
              <span>Buka Remedial Akbar</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* ── 1. INFORMASI SESI ASAL & TARGET KKTP ── */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                Sesi Sumber
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {mapelName}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {jadwal.nama_sesi} • <span className="font-semibold text-slate-700 dark:text-slate-300">{pesertaList.length} Siswa</span> ({finishedPeserta.length} Selesai, {susulanPeserta.length} Belum Ujian)
            </p>
          </div>

          {/* Pengatur KKTP & Ringkasan */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <label htmlFor="kktp-input" className="text-xs font-semibold text-slate-500">
                KKTP:
              </label>
              <input
                id="kktp-input"
                type="number"
                min={10}
                max={100}
                value={kktpThreshold}
                onChange={(e) => setKktpThreshold(Number(e.target.value) || 75)}
                className="w-14 px-2 py-1 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-500">Remedial:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-bold">{belowKktp.length}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-500">Susulan:</span>
                <strong className="text-amber-600 dark:text-amber-400 font-bold">{susulanPeserta.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. SELEKSI SISWA PESERTA REMEDIAL & SUSULAN ── */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          {/* Header Tab Filter Siswa */}
          <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setStudentTabFilter('action')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  studentTabFilter === 'action'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>Perlu Tindakan</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {actionRequiredPeserta.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('below')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  studentTabFilter === 'below'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>Remedial</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  {belowKktp.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('susulan')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  studentTabFilter === 'susulan'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>Susulan</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  {susulanPeserta.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  studentTabFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>Semua</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {pesertaList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('above')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  studentTabFilter === 'above'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>Tuntas</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  {aboveKktp.length}
                </span>
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari nama atau NIS siswa..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] shrink-0 justify-end">
                <button
                  type="button"
                  onClick={handleSelectAllAction}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleSelectAllSusulan}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Susulan Saja
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            </div>
          </div>

          {/* Daftar Tabel Siswa */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingPeserta ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat peserta...</div>
            ) : displayedStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <p>Tidak ada siswa yang sesuai filter</p>
              </div>
            ) : (
              displayedStudents.map((p, idx) => {
                const isSelected = selectedSiswaIds.includes(p.siswa_id);
                const isSusulan =
                  p.status === 'STANDBY' ||
                  p.status === 'IN_PROGRESS' ||
                  String(p.id).startsWith('standby-');
                const score = !isSusulan && p.nilai_akhir != null ? Number(p.nilai_akhir) : null;
                const isBelow = !isSusulan && (score === null || score < kktpThreshold);

                return (
                  <div
                    key={p.siswa_id || `s-${idx}`}
                    onClick={() => toggleSelectSiswa(p.siswa_id)}
                    className={cn(
                      'px-3 py-2 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row onClick
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                          {p.Siswa?.nama_lengkap || 'Siswa'}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                          <span className="font-mono">{p.Siswa?.nis || '-'}</span>
                          <span>•</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{p.Siswa?.Kelas?.nama_kelas || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSusulan ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1.5">
                          <Clock size={11} className="stroke-[2.5]" />
                          <span>Susulan</span>
                        </span>
                      ) : isBelow ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 flex items-center gap-1.5">
                          <span className="font-mono font-black">{score !== null ? score.toFixed(1) : '-'}</span>
                          <span className="text-[10px] text-rose-500 font-medium">· Remedial</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5">
                          <span className="font-mono font-black">{score !== null ? score.toFixed(1) : '-'}</span>
                          <span className="text-[10px] text-emerald-600 font-medium">· Tuntas</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 flex items-center justify-between px-4">
            <span className="text-slate-400">
              {belowKktp.length} Remedial (&lt;KKTP) • {susulanPeserta.length} Susulan (Belum Ujian)
            </span>
            <span>
              Terpilih:{' '}
              <strong className="text-indigo-600 dark:text-indigo-400 font-black">
                {selectedSiswaIds.length}
              </strong>{' '}
              dari {pesertaList.length} siswa total
            </span>
          </div>
        </div>

        {/* ── 3. PENGATURAN SESI REMEDIAL ── */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Layers size={14} className="text-indigo-600" />
            <span>Konfigurasi Sesi &amp; Aturan Nilai</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Nama Sesi */}
            <div className="space-y-1">
              <label htmlFor="remedial-session-name" className="text-[11px] font-bold text-slate-500">
                Nama Sesi Remedial
              </label>
              <input
                id="remedial-session-name"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Mode Masuk Siswa: Bebas Token vs Input Token */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500">
                  Mode Masuk Siswa
                </label>
                <button
                  type="button"
                  onClick={() => setIsTokenless(!isTokenless)}
                  className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {isTokenless ? 'Ganti ke Input Token' : 'Aktifkan Bebas Token'}
                </button>
              </div>

              {isTokenless ? (
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-emerald-600" />
                      <span>Bebas Token (1-Klik Masuk)</span>
                    </span>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                      Siswa terdaftar langsung klik tombol remedial di akunnya tanpa perlu token.
                    </p>
                  </div>
                  <Badge variant="success" className="text-[9px] shrink-0 font-bold">
                    REKOMENDASI
                  </Badge>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Token 6 Digit</span>
                    <button
                      type="button"
                      onClick={() => setCustomToken(generateRemedialToken())}
                      className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw size={10} />
                      <span>Acak Token</span>
                    </button>
                  </div>
                  <input
                    id="remedial-token-input"
                    type="text"
                    maxLength={6}
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-black tracking-widest text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 text-center uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Waktu Mulai & Selesai */}
            <div className="space-y-1">
              <label htmlFor="remedial-start-date" className="text-[11px] font-bold text-slate-500">
                Waktu Pelaksanaan Mulai
              </label>
              <input
                id="remedial-start-date"
                type="datetime-local"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="remedial-end-date" className="text-[11px] font-bold text-slate-500">
                Batas Selesai Ujian
              </label>
              <input
                id="remedial-end-date"
                type="datetime-local"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Opsi Bank Soal */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[11px] font-bold text-slate-500 block">
              Paket Soal yang Digunakan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => setUseOriginalBank(true)}
                className={cn(
                  'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none',
                  useOriginalBank
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="bankOpt"
                  checked={useOriginalBank}
                  onChange={() => setUseOriginalBank(true)}
                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Bank Soal Asal (Acak Ulang)</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {jadwal.BankSoal?.judul || 'Bank Soal Utama'}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setUseOriginalBank(false)}
                className={cn(
                  'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none',
                  !useOriginalBank
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="bankOpt"
                  checked={!useOriginalBank}
                  onChange={() => setUseOriginalBank(false)}
                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">Pilih Bank Soal Lain</div>
                  {!useOriginalBank ? (
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="mt-1 w-full px-2 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                    >
                      {availableBanks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.judul} ({b.jumlah_soal} Soal)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[10px] text-slate-400">Pilih dari bank soal tersedia</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kebijakan Pengolahan Nilai (Kurikulum Merdeka) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[11px] font-bold text-slate-500 block">
              Kebijakan Nilai Remedial (Sinkronisasi e-Rapor)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'max_kktp',
                  label: 'Tuntas KKTP',
                  desc: 'Siswa yang menuntaskan remedial langsung mendapat nilai batas KKTP (besar/kecil skor tes).',
                },
                {
                  id: 'highest',
                  label: 'Nilai Tertinggi',
                  desc: 'Mengambil nilai terbaik antara tes 1 vs remedial.',
                },
                {
                  id: 'murni',
                  label: 'Nilai Murni',
                  desc: 'Nilai tes remedial dicatat murni apa adanya.',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setScorePolicy(opt.id as RemedialScorePolicy)}
                  className={cn(
                    'p-2 rounded-xl border transition-all cursor-pointer text-left select-none',
                    scorePolicy === opt.id
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="radio"
                      name="policy"
                      checked={scorePolicy === opt.id}
                      onChange={() => setScorePolicy(opt.id as RemedialScorePolicy)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{opt.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. FOOTER AKSI ── */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createRemedialMutation.isPending}
            className="text-xs h-8 px-3 font-semibold"
          >
            Batal
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={selectedSiswaIds.length === 0 || createRemedialMutation.isPending}
            className="text-xs h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles size={13} />
            <span>
              {createRemedialMutation.isPending
                ? 'Menerbitkan...'
                : `Terbitkan Remedial (${selectedSiswaIds.length} Siswa)`}
            </span>
          </Button>
        </div>
      </form>

      {/* Modal Remedial Akbar Terpadu Multi-Rombel */}
      {isMultiModalOpen && jadwal.BankSoal && (
        <CbtMultiClassRemedialModal
          isOpen={isMultiModalOpen}
          onClose={() => setIsMultiModalOpen(false)}
          bankSoal={jadwal.BankSoal}
          initialJadwalId={jadwal.id}
          onSuccess={() => {
            setIsMultiModalOpen(false);
            if (onSuccess) onSuccess();
            onClose();
          }}
        />
      )}
    </Modal>
  );
};
