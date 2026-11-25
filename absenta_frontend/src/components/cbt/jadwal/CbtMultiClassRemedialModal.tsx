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
  Check,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  ChevronRight,
  GraduationCap,
  Info,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtPesertaUjian, CbtBankSoal } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { localDateTimeInputToISO } from '@/utils/attendance/time';

export type RemedialScorePolicy = 'max_kktp' | 'murni' | 'highest';

export interface CbtMultiClassRemedialModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoal: CbtBankSoal | null;
  initialJadwalId?: string;
  onSuccess?: (createdJadwalId?: string) => void;
}

interface AggregatedStudentItem {
  pesertaId: string;
  jadwalId: string;
  siswaId: string;
  nis: string;
  namaSiswa: string;
  kelasId: string;
  namaKelas: string;
  nilaiAwal: number | null;
  statusUjian: string;
  isFinished: boolean;
  isSusulan: boolean;
}

export const CbtMultiClassRemedialModal: React.FC<CbtMultiClassRemedialModalProps> = ({
  isOpen,
  onClose,
  bankSoal,
  initialJadwalId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // 1. Fetch seluruh sesi jadwal yang menggunakan Bank Soal ini
  const { data: jadwalData, isLoading: isLoadingJadwal } = useQuery({
    queryKey: ['cbt-jadwals-for-bank', bankSoal?.id],
    queryFn: async () => {
      if (!bankSoal?.id) return [];
      const res = await cbtApi.getJadwalList({
        bank_soal_id: bankSoal.id,
        limit: 100,
      });
      // Hanya ambil sesi reguler (bukan sesi remedial rekursif)
      const list = res.items || [];
      return list.filter((j) => !j.setting_keamanan?.is_remedial);
    },
    enabled: Boolean(isOpen && bankSoal?.id),
  });

  const sourceJadwals: CbtJadwalUjian[] = useMemo(() => jadwalData || [], [jadwalData]);

  // 2. Fetch seluruh peserta dari seluruh sesi yang terdeteksi
  const { data: allPeserta = [], isLoading: isLoadingPeserta } = useQuery({
    queryKey: ['cbt-multi-peserta', bankSoal?.id, sourceJadwals.map((j) => j.id).join(',')],
    queryFn: async () => {
      if (sourceJadwals.length === 0) return [];
      const promises = sourceJadwals.map((j) =>
        cbtApi.getPesertaList(j.id).catch(() => [] as CbtPesertaUjian[])
      );
      const results = await Promise.all(promises);
      const flattened: CbtPesertaUjian[] = [];
      results.forEach((pList) => {
        if (Array.isArray(pList)) flattened.push(...pList);
      });
      return flattened;
    },
    enabled: Boolean(isOpen && sourceJadwals.length > 0),
  });

  // 3. States Form Remedial
  const [kktpThreshold, setKktpThreshold] = useState<number>(75);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [studentTabFilter, setStudentTabFilter] = useState<'action' | 'below' | 'susulan' | 'all' | 'above'>('action');
  const [searchStudent, setSearchStudent] = useState<string>('');

  const [sessionName, setSessionName] = useState<string>('');
  const [durasiMenit, setDurasiMenit] = useState<number>(bankSoal?.alokasi_menit || 60);
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [scorePolicy, setScorePolicy] = useState<RemedialScorePolicy>('max_kktp');
  const [isTokenless, setIsTokenless] = useState<boolean>(true);

  // Generator Token 6 Karakter Acak (misal: RM8K2X)
  const generateRemedialToken = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = 'RM';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // 4. Agregasi & Deduplikasi Siswa dari Seluruh Sesi
  const aggregatedStudents: AggregatedStudentItem[] = useMemo(() => {
    const map = new Map<string, AggregatedStudentItem>();

    allPeserta.forEach((p) => {
      if (!p.siswa_id || !p.Siswa) return;
      const isSus =
        p.status === 'STANDBY' ||
        p.status === 'IN_PROGRESS' ||
        String(p.id).startsWith('standby-');
      const isFin = !isSus && (p.status === 'FINISHED' || p.status === 'DISQUALIFIED');
      const currentVal: AggregatedStudentItem = {
        pesertaId: p.id,
        jadwalId: p.jadwal_ujian_id,
        siswaId: p.siswa_id,
        nis: p.Siswa.nis || '',
        namaSiswa: p.Siswa.nama_lengkap || p.Siswa.nama_siswa || 'Siswa',
        kelasId: p.Siswa.Kelas?.id || 'UNKNOWN',
        namaKelas: p.Siswa.Kelas?.nama_kelas || 'Kelas Binaan',
        nilaiAwal: !isSus && p.nilai_akhir != null ? Number(p.nilai_akhir) : null,
        statusUjian: p.status,
        isFinished: isFin,
        isSusulan: isSus,
      };

      // Jika siswa tercatat di beberapa sesi, simpan data terbaru/tervalid
      if (!map.has(p.siswa_id)) {
        map.set(p.siswa_id, currentVal);
      } else {
        const existing = map.get(p.siswa_id)!;
        if (currentVal.isFinished && !existing.isFinished) {
          map.set(p.siswa_id, currentVal);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const classCompare = a.namaKelas.localeCompare(b.namaKelas);
      if (classCompare !== 0) return classCompare;
      return a.namaSiswa.localeCompare(b.namaSiswa);
    });
  }, [allPeserta]);

  // Kategorisasi Siswa berdasarkan Ambang KKTP & Status Susulan
  const { finishedStudents, belowKktpStudents, aboveKktpStudents, susulanStudents, actionRequiredStudents } = useMemo(() => {
    const finished = aggregatedStudents.filter((st) => st.isFinished);
    const below = finished.filter((st) => st.nilaiAwal !== null && st.nilaiAwal < kktpThreshold);
    const above = finished.filter((st) => st.nilaiAwal !== null && st.nilaiAwal >= kktpThreshold);
    const susulan = aggregatedStudents.filter((st) => st.isSusulan);
    const actionRequired = [...below, ...susulan];
    return {
      finishedStudents: finished,
      belowKktpStudents: below,
      aboveKktpStudents: above,
      susulanStudents: susulan,
      actionRequiredStudents: actionRequired,
    };
  }, [aggregatedStudents, kktpThreshold]);

  // Reset & Inisialisasi Default Form Saat Modal Dibuka
  useEffect(() => {
    if (isOpen && bankSoal) {
      setDurasiMenit(bankSoal.alokasi_menit || 60);
      setCustomToken(generateRemedialToken());

      const cleanJudul = bankSoal.judul.replace(/^\[(REMEDIAL|SUSULAN|REMEDIAL & SUSULAN)[^\]]*\]\s*/i, '');
      const prefix =
        susulanStudents.length > 0 && belowKktpStudents.length > 0
          ? '[REMEDIAL & SUSULAN AKBAR]'
          : susulanStudents.length > 0
          ? '[SUSULAN AKBAR]'
          : '[REMEDIAL AKBAR]';
      setSessionName(`${prefix} ${cleanJudul}`);

      // Default waktu: mulai sekarang, berakhir 3 hari kemudian (toleransi 7 hari)
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatInputDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      setStartDateInput(formatInputDate(now));
      setEndDateInput(formatInputDate(threeDaysLater));
    }
  }, [isOpen, bankSoal, susulanStudents.length, belowKktpStudents.length]);

  // Daftar Kelas yang Terdeteksi
  const detectedClasses = useMemo(() => {
    const classMap = new Map<string, { id: string; name: string; total: number; belowKktp: number; susulan: number }>();

    aggregatedStudents.forEach((st) => {
      const isBelow = st.isFinished && st.nilaiAwal !== null && st.nilaiAwal < kktpThreshold;
      if (!classMap.has(st.kelasId)) {
        classMap.set(st.kelasId, {
          id: st.kelasId,
          name: st.namaKelas,
          total: 1,
          belowKktp: isBelow ? 1 : 0,
          susulan: st.isSusulan ? 1 : 0,
        });
      } else {
        const existing = classMap.get(st.kelasId)!;
        existing.total += 1;
        if (isBelow) existing.belowKktp += 1;
        if (st.isSusulan) existing.susulan += 1;
      }
    });

    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [aggregatedStudents, kktpThreshold]);

  // Otomatis centang seluruh siswa yang membutuhkan tindakan (Remedial + Susulan) saat modal dibuka
  useEffect(() => {
    if (isOpen && actionRequiredStudents.length > 0) {
      setSelectedSiswaIds(actionRequiredStudents.map((st) => st.siswaId));
    }
  }, [isOpen, actionRequiredStudents.length, kktpThreshold]);

  // Siswa yang Ditampilkan Sesuai Filter Kelas & Tab
  const displayedStudents = useMemo(() => {
    let list = actionRequiredStudents;
    if (studentTabFilter === 'below') list = belowKktpStudents;
    if (studentTabFilter === 'susulan') list = susulanStudents;
    if (studentTabFilter === 'above') list = aboveKktpStudents;
    if (studentTabFilter === 'all') list = aggregatedStudents;

    if (selectedClassFilter !== 'ALL') {
      list = list.filter((st) => st.kelasId === selectedClassFilter);
    }

    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase().trim();
      list = list.filter(
        (st) =>
          st.namaSiswa.toLowerCase().includes(q) ||
          st.nis.toLowerCase().includes(q) ||
          st.namaKelas.toLowerCase().includes(q)
      );
    }

    return list;
  }, [actionRequiredStudents, belowKktpStudents, susulanStudents, aboveKktpStudents, aggregatedStudents, studentTabFilter, selectedClassFilter, searchStudent]);

  // Toggle Siswa Satuan
  const toggleSelectSiswa = (siswaId: string) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  // Pilih Seluruh Siswa yang Membutuhkan Tindakan (Remedial + Susulan)
  const handleSelectAllAction = () => {
    const list = selectedClassFilter === 'ALL'
      ? actionRequiredStudents
      : actionRequiredStudents.filter((st) => st.kelasId === selectedClassFilter);
    const ids = list.map((st) => st.siswaId);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  // Pilih Seluruh Siswa di Bawah KKTP
  const handleSelectAllBelow = () => {
    const list = selectedClassFilter === 'ALL'
      ? belowKktpStudents
      : belowKktpStudents.filter((st) => st.kelasId === selectedClassFilter);
    const belowIds = list.map((st) => st.siswaId);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...belowIds])));
  };

  // Pilih Seluruh Siswa Susulan (Belum Ujian)
  const handleSelectAllSusulan = () => {
    const list = selectedClassFilter === 'ALL'
      ? susulanStudents
      : susulanStudents.filter((st) => st.kelasId === selectedClassFilter);
    const susulanIds = list.map((st) => st.siswaId);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...susulanIds])));
  };

  // Pilih Semua Siswa di Tampilan Saat Ini
  const handleSelectAllInView = () => {
    const viewIds = displayedStudents.map((st) => st.siswaId);
    setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...viewIds])));
  };

  // Kosongkan Pilihan
  const handleDeselectAll = () => {
    setSelectedSiswaIds([]);
  };

  // Toggle Seluruh Siswa di Satu Rombel
  const handleToggleWholeClass = (kelasId: string) => {
    const classStudentIds = aggregatedStudents
      .filter((st) => st.kelasId === kelasId)
      .map((st) => st.siswaId);

    const allSelected = classStudentIds.every((id) => selectedSiswaIds.includes(id));
    if (allSelected) {
      setSelectedSiswaIds((prev) => prev.filter((id) => !classStudentIds.includes(id)));
    } else {
      setSelectedSiswaIds((prev) => Array.from(new Set([...prev, ...classStudentIds])));
    }
  };

  // Rombel yang Memiliki Minimal 1 Siswa Terpilih
  const activeSelectedKelasIds = useMemo(() => {
    const selectedSet = new Set(selectedSiswaIds);
    const kelasSet = new Set<string>();
    aggregatedStudents.forEach((st) => {
      if (selectedSet.has(st.siswaId) && st.kelasId && st.kelasId !== 'UNKNOWN') {
        kelasSet.add(st.kelasId);
      }
    });
    return Array.from(kelasSet);
  }, [selectedSiswaIds, aggregatedStudents]);

  // Mutasi Pembuatan Sesi Remedial Akbar Multi-Rombel
  const createMultiRemedialMutation = useMutation({
    mutationFn: async () => {
      if (!bankSoal) throw new Error('Bank Soal tidak ditemukan');
      if (selectedSiswaIds.length === 0) {
        throw new Error('Pilih minimal 1 siswa yang akan mengikuti sesi remedial ini');
      }
      if (!sessionName.trim()) {
        throw new Error('Nama sesi remedial wajib diisi');
      }

      const guruMapelId = bankSoal.guru_id || null;
      const guruMapelNama = (bankSoal as any)?.Guru?.nama_guru || 'Guru Mata Pelajaran';
      const guruMapelNip = (bankSoal as any)?.Guru?.nip || '';

      const startIso = localDateTimeInputToISO(startDateInput);
      const endIso = localDateTimeInputToISO(endDateInput);

      // Gunakan seluruh ID kelas yang siswa-siswanya terpilih
      const targetKelas = activeSelectedKelasIds.length > 0 ? activeSelectedKelasIds : (bankSoal.jurusan ? [] : []);

      const payload = {
        bank_soal_id: bankSoal.id,
        tahun_pelajaran_id: bankSoal.tahun_pelajaran_id || sourceJadwals[0]?.tahun_pelajaran_id,
        semester_id: bankSoal.semester_id || sourceJadwals[0]?.semester_id,
        nama_sesi: sessionName.trim(),
        token_ujian: customToken.trim().toUpperCase(),
        tanggal_mulai: startIso,
        tanggal_selesai: endIso,
        durasi_menit: Number(durasiMenit) || 60,
        toleransi_terlambat_menit: 120, // Fleksibel 120 menit (maksimal batas validasi skema)
        target_kelas_ids: targetKelas,
        bypass_overlap_guard: true,
        status: 'ACTIVE' as const,
        setting_keamanan: {
          is_remedial: true,
          parent_bank_soal_id: bankSoal.id,
          kktp_threshold: kktpThreshold,
          remedial_policy: scorePolicy,
          target_siswa_ids: selectedSiswaIds,
          tokenless: isTokenless,
          ruang_ujian: 'Ruang Remedial & Susulan Akbar',
          ruang_ujian_nama: 'Ruang Remedial & Susulan Akbar (Multi-Rombel)',
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
          shuffle_questions: true,
          shuffle_options: true,
          lock_device: true,
          block_tab_switching: true,
        },
      };

      return cbtApi.createJadwal(payload);
    },
    onSuccess: async (res) => {
      const modeText = isTokenless ? 'Bebas Token (Langsung Masuk)' : `Token: ${res.token_ujian}`;
      toast.success(
        `Sesi Remedial & Susulan Akbar Terpadu Aktif! ${modeText} untuk ${selectedSiswaIds.length} Siswa di ${activeSelectedKelasIds.length} Rombel`,
        { duration: 6000 }
      );
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      if (onSuccess) onSuccess(res.id);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan sesi remedial akbar');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMultiRemedialMutation.mutate();
  };

  if (!bankSoal) return null;

  const mapelTitle = bankSoal.Mapel?.nama_mapel || bankSoal.judul || 'Mata Pelajaran';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sesi Remedial & Susulan Terpadu Multi-Rombel (1-Click)"
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Header Hero Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 dark:border-amber-500/20">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                  Remedial Hub
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {mapelTitle}
                </span>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                  Tingkat {bankSoal.tingkat}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                Aktivasi Remedial Serentak Seluruh Rombel Binaan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Sistem otomatis mengagregasi seluruh siswa di bawah KKTP dari seluruh sesi ujian reguler binaan Anda ke dalam 1 sesi remedial yang sama.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 dark:border-amber-900/40">
              <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                {isLoadingPeserta || isLoadingJadwal ? '...' : belowKktpStudents.length}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">
                Siswa Perlu Remedial
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(isLoadingJadwal || isLoadingPeserta) ? (
          <div className="py-12 sm:py-16 text-center space-y-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <RotateCw size={24} className="animate-spin mx-auto text-indigo-600" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Menganalisis Riwayat Ujian & Hasil Siswa...
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto px-4">
                Sistem sedang memindai seluruh sesi rombel binaan untuk mengidentifikasi siswa yang belum tuntas KKTP.
              </p>
            </div>
          </div>
        ) : sourceJadwals.length === 0 ? (
          /* Empty State: Belum Ada Ujian Reguler yang Berjalan */
          <div className="p-5 sm:p-7 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
              <Info size={26} />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto px-2">
              <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                Belum Ada Sesi Ujian Utama yang Selesai
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Fitur <strong>Remedial Akbar</strong> bekerja dengan mendeteksi dan mengumpulkan siswa yang nilainya di bawah ambang KKTP dari <strong>sesi ujian utama yang telah diselenggarakan</strong>.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-900/40 text-left max-w-lg mx-auto space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                Alur Kerja Remedial:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 text-[11.5px] leading-relaxed">
                <li>Jadwalkan dan laksanakan ujian reguler untuk kelas binaan Anda melalui tombol <strong>"Aktifkan"</strong> atau tab <strong>"Sesi Ujian Kelas Binaan"</strong>.</li>
                <li>Setelah siswa selesai mengerjakan dan nilai keluar, buka kembali menu ini.</li>
                <li>Sistem akan otomatis menyeleksi siswa yang belum tuntas KKTP dari seluruh rombel untuk digabungkan ke 1 sesi remedial terpadu.</li>
              </ol>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs font-bold px-6 h-9 rounded-xl cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* Main Remedial Interface (Tampil saat ada Sesi Ujian Terdata) */
          <>
            {/* Bento Grid 3 Kolom Ringkasan Deteksi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Box 1: Ambang KKTP */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-amber-500" />
                    Ambang KKTP
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{kktpThreshold} Poin</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={kktpThreshold}
                    onChange={(e) => setKktpThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Siswa nilai &lt; {kktpThreshold} otomatis terpilih.
                </p>
              </div>

              {/* Box 2: Rombel Terdeteksi */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-500" />
                    Rombel Terlibat
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {detectedClasses.length} Kelas
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                  {detectedClasses.map((c) => c.name).join(', ') || 'Belum ada rombel'}
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Tergabung dalam 1 Meja Pengawas
                </p>
              </div>

              {/* Box 3: Total Terpilih */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-emerald-500" />
                    Siswa Terpilih
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {selectedSiswaIds.length} Siswa
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  {belowKktpStudents.length} Remedial (&lt;KKTP) • {susulanStudents.length} Susulan
                </div>
                <p className="text-[10px] text-slate-500">
                  Dari {aggregatedStudents.length} total peserta di {detectedClasses.length} rombel
                </p>
              </div>
            </div>

            {/* Pemilihan Siswa & Rombel */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
                {/* Filter Rombel Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                    <Filter size={12} />
                    Kelas:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassFilter('ALL')}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                      selectedClassFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    )}
                  >
                    Semua Rombel ({aggregatedStudents.length})
                  </button>
                  {detectedClasses.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassFilter(cls.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                        selectedClassFilter === cls.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      )}
                    >
                      <span>{cls.name}</span>
                      {(cls.belowKktp > 0 || cls.susulan > 0) && (
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                            selectedClassFilter === cls.id
                              ? 'bg-white text-indigo-700'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          )}
                        >
                          {cls.belowKktp + cls.susulan}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Sub-toolbar: Search & Tab Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setStudentTabFilter('action')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                        studentTabFilter === 'action'
                          ? 'bg-indigo-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      Perlu Tindakan ({actionRequiredStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentTabFilter('below')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                        studentTabFilter === 'below'
                          ? 'bg-rose-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      Remedial (&lt;KKTP) ({belowKktpStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentTabFilter('susulan')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                        studentTabFilter === 'susulan'
                          ? 'bg-amber-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      Susulan ({susulanStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentTabFilter('all')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                        studentTabFilter === 'all'
                          ? 'bg-slate-700 text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      Semua ({aggregatedStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentTabFilter('above')}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                        studentTabFilter === 'above'
                          ? 'bg-emerald-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      Tuntas ({aboveKktpStudents.length})
                    </button>
                  </div>

                  {/* Quick Select Actions */}
                  <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllAction}
                      className="px-2 py-1 rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 font-bold hover:bg-indigo-100 transition-colors cursor-pointer text-[11px]"
                    >
                      Pilih Semua Tindakan
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllSusulan}
                      className="px-2 py-1 rounded-lg text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-bold hover:bg-amber-100 transition-colors cursor-pointer text-[11px]"
                    >
                      Susulan Saja
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer text-[11px]"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari siswa berdasarkan nama, NIS, atau rombel..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Student List View */}
              <div className="max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                {displayedStudents.length === 0 ? (
                  <div className="py-8 sm:py-10 text-center text-xs text-slate-500">
                    Tidak ada siswa yang sesuai dengan filter kriteria.
                  </div>
                ) : (
                  displayedStudents.map((st) => {
                    const isSelected = selectedSiswaIds.includes(st.siswaId);
                    const isBelow = st.isFinished && st.nilaiAwal !== null && st.nilaiAwal < kktpThreshold;

                    return (
                      <div
                        key={st.siswaId}
                        onClick={() => toggleSelectSiswa(st.siswaId)}
                        className={cn(
                          'p-2 sm:p-2.5 px-3 sm:px-3.5 flex items-center justify-between gap-2 sm:gap-3 text-xs transition-colors cursor-pointer select-none',
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        )}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled via parent onClick
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs sm:text-[13px]">
                              {st.namaSiswa}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-slate-500">
                              <span className="font-mono">{st.nis || '-'}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {st.namaKelas}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {st.isSusulan ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1.5">
                              <Clock size={11} className="stroke-[2.5]" />
                              <span>Susulan</span>
                            </span>
                          ) : isBelow ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 flex items-center gap-1.5">
                              <span className="font-mono font-black">{st.nilaiAwal !== null ? st.nilaiAwal : '-'}</span>
                              <span className="text-[10px] text-rose-500 font-medium">· Remedial</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5">
                              <span className="font-mono font-black">{st.nilaiAwal !== null ? st.nilaiAwal : '-'}</span>
                              <span className="text-[10px] text-emerald-600 font-medium">· Tuntas</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pengaturan Parameter Remedial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
              {/* Kolom Kiri: Kebijakan Nilai Akhir */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kebijakan Nilai Akhir (Remedial Policy)
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="remedial_policy"
                      value="max_kktp"
                      checked={scorePolicy === 'max_kktp'}
                      onChange={() => setScorePolicy('max_kktp')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Tuntas Nilai KKTP ({kktpThreshold}) (Rekomendasi Kurikulum)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Siswa yang menuntaskan sesi remedial langsung mendapat nilai {kktpThreshold} (besar/kecil skor tes).
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="remedial_policy"
                      value="highest"
                      checked={scorePolicy === 'highest'}
                      onChange={() => setScorePolicy('highest')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Nilai Tertinggi (Awal vs Remedial)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mengambil skor terbaik yang dicapai siswa.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="remedial_policy"
                      value="murni"
                      checked={scorePolicy === 'murni'}
                      onChange={() => setScorePolicy('murni')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Nilai Murni Hasil Remedial
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Nilai remedial dicatat apa adanya tanpa batas atas.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Kolom Kanan: Durasi, Waktu & Mode Masuk */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Sesi Remedial
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    placeholder="Contoh: [REMEDIAL AKBAR] MPP AK Tingkat XI"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Durasi Pengerjaan
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={durasiMenit}
                        onChange={(e) => setDurasiMenit(Number(e.target.value) || 60)}
                        className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <span className="text-xs text-slate-500">Menit</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Akses Masuk Siswa
                    </label>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTokenless}
                        onChange={(e) => setIsTokenless(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Bebas Token (Langsung Masuk)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      Mulai
                    </label>
                    <input
                      type="datetime-local"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      Berakhir
                    </label>
                    <input
                      type="datetime-local"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs font-bold cursor-pointer"
              >
                Batal
              </Button>

              <Button
                type="submit"
                variant="default"
                disabled={selectedSiswaIds.length === 0 || createMultiRemedialMutation.isPending}
                className="bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {createMultiRemedialMutation.isPending ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Menerbitkan Sesi Remedial Akbar...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>
                      Aktifkan Sesi Remedial ({selectedSiswaIds.length} Siswa, {activeSelectedKelasIds.length} Rombel)
                    </span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
