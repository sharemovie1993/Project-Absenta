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
  const [studentTabFilter, setStudentTabFilter] = useState<'below' | 'all' | 'above'>('below');
  const [searchStudent, setSearchStudent] = useState('');

  const [useOriginalBank, setUseOriginalBank] = useState<boolean>(true);
  const [selectedBankId, setSelectedBankId] = useState<string>(jadwal?.bank_soal_id || '');
  const [sessionName, setSessionName] = useState<string>('');
  const [durasiMenit, setDurasiMenit] = useState<number>(jadwal?.durasi_menit || 60);
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [scorePolicy, setScorePolicy] = useState<RemedialScorePolicy>('max_kktp');

  // Generator Token 6 Karakter Acak (misal: RM8K2X)
  const generateRemedialToken = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = 'RM';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Reset & Inisialisasi Default Form Saat Modal Dibuka
  useEffect(() => {
    if (isOpen && jadwal) {
      setSelectedBankId(jadwal.bank_soal_id);
      setUseOriginalBank(true);
      setDurasiMenit(jadwal.durasi_menit || 60);
      setCustomToken(generateRemedialToken());

      const originalName = jadwal.nama_sesi || 'Sesi Ujian';
      const cleanOriginal = originalName.replace(/^\[REMEDIAL\]\s*/i, '');
      setSessionName(`[REMEDIAL] ${cleanOriginal}`);

      // Default waktu: mulai sekarang, berakhir besok
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatInputDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      setStartDateInput(formatInputDate(now));
      setEndDateInput(formatInputDate(tomorrow));
    }
  }, [isOpen, jadwal]);

  // Pisahkan Siswa Selesai berdasarkan KKTP
  const { finishedPeserta, belowKktp, aboveKktp } = useMemo(() => {
    const finished = pesertaList.filter((p) => p.status === 'FINISHED' || p.nilai_akhir != null);
    const below = finished.filter((p) => Number(p.nilai_akhir || 0) < kktpThreshold);
    const above = finished.filter((p) => Number(p.nilai_akhir || 0) >= kktpThreshold);
    return { finishedPeserta: finished, belowKktp: below, aboveKktp: above };
  }, [pesertaList, kktpThreshold]);

  // Otomatis centang seluruh siswa di bawah KKTP saat modal dibuka atau saat ambang KKTP berubah
  useEffect(() => {
    if (isOpen) {
      setSelectedSiswaIds(belowKktp.map((p) => p.siswa_id));
    }
  }, [isOpen, belowKktp]);

  // Filter Tampilan Siswa
  const displayedStudents = useMemo(() => {
    let list = finishedPeserta;
    if (studentTabFilter === 'below') list = belowKktp;
    if (studentTabFilter === 'above') list = aboveKktp;

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
  }, [finishedPeserta, belowKktp, aboveKktp, studentTabFilter, searchStudent]);

  const toggleSelectSiswa = (siswaId: string) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  const handleSelectAllBelow = () => {
    const belowIds = belowKktp.map((p) => p.siswa_id);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...belowIds])));
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
        toleransi_terlambat_menit: 15,
        target_kelas_ids: jadwal.target_kelas_ids || [],
        setting_keamanan: {
          ...(jadwal.setting_keamanan || {}),
          is_remedial: true,
          parent_jadwal_id: jadwal.id,
          kktp_threshold: kktpThreshold,
          remedial_policy: scorePolicy,
          target_siswa_ids: selectedSiswaIds,
          ruang_ujian: 'Ruang Remedial',
          ruang_ujian_nama: 'Ruang Remedial CBT',
          shuffle_questions: true,
          shuffle_options: true,
        },
      };

      return cbtApi.createJadwal(payload);
    },
    onSuccess: async (res) => {
      toast.success(
        `Sesi Remedial berhasil diterbitkan! Token: ${res.token_ujian} (${selectedSiswaIds.length} Siswa)`,
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
      title="Penerbitan Sesi Remedial CBT"
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── 1. BANNER INFORMASI SESI ASAL & KKTP THRESHOLD ── */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-200/80 dark:border-amber-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-2xs">
                Asesmen Remedial
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {mapelName}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Sumber: {jadwal.nama_sesi} • Total {finishedPeserta.length} Peserta Selesai
            </p>
          </div>

          {/* Pengatur KKTP / KKM */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200/90 dark:border-amber-800/80 shadow-2xs shrink-0">
            <div className="text-left">
              <label htmlFor="kktp-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                Target KKTP / KKM
              </label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  id="kktp-input"
                  type="number"
                  min={10}
                  max={100}
                  value={kktpThreshold}
                  onChange={(e) => setKktpThreshold(Number(e.target.value) || 75)}
                  className="w-16 px-2 py-1 text-sm font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">Poin</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />

            <div className="text-right pl-1">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                Perlu Remedial
              </div>
              <div className="text-sm font-black text-rose-700 dark:text-rose-300">
                {belowKktp.length} Siswa
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. SELEKSI SISWA PESERTA REMEDIAL ── */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          {/* Header Tab Filter Siswa */}
          <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setStudentTabFilter('below')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  studentTabFilter === 'below'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <span>Perlu Remedial</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-black">
                  {belowKktp.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  studentTabFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <span>Semua</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {finishedPeserta.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentTabFilter('above')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  studentTabFilter === 'above'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <span>Tuntas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {aboveKktp.length}
                </span>
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2">
              <div className="relative w-44 sm:w-52">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari nama / NIS..."
                  className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllBelow}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Pilih Semua &lt;KKTP
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer whitespace-nowrap"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Daftar Tabel Siswa */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingPeserta ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat peserta...</div>
            ) : displayedStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Tidak ada siswa yang sesuai filter
              </div>
            ) : (
              displayedStudents.map((p, idx) => {
                const isSelected = selectedSiswaIds.includes(p.siswa_id);
                const score = Number(p.nilai_akhir || 0);
                const isBelow = score < kktpThreshold;

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
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row onClick
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {p.Siswa?.nama_lengkap || 'Siswa'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>NIS: {p.Siswa?.nis || '-'}</span>
                          <span>•</span>
                          <span>{p.Siswa?.Kelas?.nama_kelas || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-black border',
                          isBelow
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                        )}
                      >
                        {score.toFixed(1)}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded',
                          isBelow
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        )}
                      >
                        {isBelow ? 'Remedial' : 'Tuntas'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 text-right pr-4">
            Terpilih:{' '}
            <strong className="text-indigo-600 dark:text-indigo-400 font-black">
              {selectedSiswaIds.length}
            </strong>{' '}
            dari {finishedPeserta.length} siswa selesai
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

            {/* Token Ujian */}
            <div className="space-y-1">
              <label htmlFor="remedial-token-input" className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>Token Siswa Remedial</span>
                <button
                  type="button"
                  onClick={() => setCustomToken(generateRemedialToken())}
                  className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw size={10} />
                  <span>Acak Token</span>
                </button>
              </label>
              <div className="flex items-center gap-2">
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
                  label: 'Maksimal KKTP',
                  desc: 'Standar regulasi, skor maksimal = batas KKTP.',
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
    </Modal>
  );
};
