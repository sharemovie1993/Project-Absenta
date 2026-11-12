import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  Printer,
  FileText,
  Camera,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  UserCheck,
  Users,
  Save,
  RotateCcw,
  Sparkles,
  Phone,
  Check,
  AlertCircle,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  sosialisasiApi,
  sosialisasiQueryKeys,
  type RapatSosialisasiSession,
  type RapatAttendeeItem,
} from '@/api/academic/sosialisasi.api';
import { RapatSosialisasiQrPrintModal } from './RapatSosialisasiQrPrintModal';
import { RapatSosialisasiBeritaAcaraPrintModal } from './RapatSosialisasiBeritaAcaraPrintModal';
import { RapatSosialisasiScannerModal } from './RapatSosialisasiScannerModal';
import { RapatManagementView } from '../rapat/RapatManagementView';

export const RapatSosialisasiPanel: React.FC = () => {
  const queryClient = useQueryClient();

  // Tab State: Global Meetings vs Sesi Sosialisasi Hari Ini
  const [activeSubTab, setActiveSubTab] = useState<'GLOBAL_RAPAT' | 'SOSIALISASI_TODAY'>('GLOBAL_RAPAT');

  // Modal States
  const [isQrPrintOpen, setIsQrPrintOpen] = useState(false);
  const [isBapPrintOpen, setIsBapPrintOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedTeacher, setLastScannedTeacher] = useState<{ nama: string; nip: string } | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'HADIR' | 'BELUM'>('ALL');

  // Form State for Notulen & Metadata
  const [formNamaAcara, setFormNamaAcara] = useState('');
  const [formWaktuMulai, setFormWaktuMulai] = useState('');
  const [formWaktuSelesai, setFormWaktuSelesai] = useState('');
  const [formTempat, setFormTempat] = useState('');
  const [formPimpinan, setFormPimpinan] = useState('');
  const [formNotulis, setFormNotulis] = useState('');
  const [formNotulenHasil, setFormNotulenHasil] = useState('');
  const [formAgendaText, setFormAgendaText] = useState('');
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Query: Ambil data sesi aktif & kehadiran
  const { data, isLoading, refetch } = useQuery({
    queryKey: sosialisasiQueryKeys.active(),
    queryFn: () => sosialisasiApi.getActiveSession(),
    staleTime: 5000,
    refetchInterval: 10000, // Polling setiap 10 detik saat acara live
  });

  const session = data?.session;
  const stats = data?.stats || { totalGuru: 0, hadirCount: 0, belumHadirCount: 0, persentaseHadir: 0 };
  const rawAttendees = data?.attendees || [];

  // Sinkronisasi data awal ke form edit
  React.useEffect(() => {
    if (session && !isFormInitialized) {
      setFormNamaAcara(session.nama_acara || '');
      setFormWaktuMulai(session.waktu_mulai || '08:00');
      setFormWaktuSelesai(session.waktu_selesai || '11:30');
      setFormTempat(session.tempat || '');
      setFormPimpinan(session.pimpinan_rapat || '');
      setFormNotulis(session.notulis || '');
      setFormNotulenHasil(session.notulen_hasil || '');
      setFormAgendaText(Array.isArray(session.agenda) ? session.agenda.join('\n') : '');
      setIsFormInitialized(true);
    }
  }, [session, isFormInitialized]);

  // Mutation: Update Session & Notulen
  const updateSessionMutation = useMutation({
    mutationFn: (payload: Partial<RapatSosialisasiSession>) => sosialisasiApi.updateSession(payload),
    onSuccess: (updated) => {
      toast.success('Informasi dan notulen rapat berhasil disimpan!');
      queryClient.setQueryData(sosialisasiQueryKeys.active(), (old: any) => {
        if (!old) return old;
        return { ...old, session: updated };
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data rapat');
    },
  });

  // Mutation: Record Teacher Attendance (Toggle)
  const attendMutation = useMutation({
    mutationFn: (payload: {
      sessionId: string;
      guruId: string;
      isHadir: boolean;
      metodeScan?: 'QR_MANDIRI' | 'SCANNER_PANITIA' | 'MANUAL';
      catatan?: string;
    }) => sosialisasiApi.recordAttendance(payload),
    onSuccess: (updatedAttendee) => {
      toast.success(
        updatedAttendee.is_hadir
          ? `✓ Kehadiran ${updatedAttendee.nama_guru} berhasil dicatat!`
          : `Status ${updatedAttendee.nama_guru} dibatalkan`
      );
      queryClient.invalidateQueries({ queryKey: sosialisasiQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status kehadiran');
    },
  });

  // Mutation: Reset / Buat Sesi Baru
  const resetSessionMutation = useMutation({
    mutationFn: (namaAcara?: string) => sosialisasiApi.resetSession(namaAcara),
    onSuccess: () => {
      toast.success('Sesi baru rapat sosialisasi berhasil dibuat!');
      setIsFormInitialized(false);
      queryClient.invalidateQueries({ queryKey: sosialisasiQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat sesi baru');
    },
  });

  // Handler: Scan Result dari Scanner Modal Panitia
  const handleScannerResult = useCallback(
    (code: string) => {
      if (!session) return;
      const cleanCode = code.trim();

      // Cari guru yang cocok berdasarkan NIP, ID, atau No HP
      const matched = rawAttendees.find(
        (g) =>
          g.guru_id === cleanCode ||
          g.nip === cleanCode ||
          g.no_hp === cleanCode ||
          g.nama_guru.toLowerCase().includes(cleanCode.toLowerCase())
      );

      if (matched) {
        if (matched.is_hadir) {
          toast(`${matched.nama_guru} sudah tercatat hadir sebelumnya.`, { icon: 'ℹ️' });
          setLastScannedTeacher({ nama: matched.nama_guru, nip: matched.nip });
          return;
        }

        attendMutation.mutate({
          sessionId: session.id,
          guruId: matched.guru_id,
          isHadir: true,
          metodeScan: 'SCANNER_PANITIA',
          catatan: 'Scan langsung via Scanner Meja Panitia',
        });
        setLastScannedTeacher({ nama: matched.nama_guru, nip: matched.nip });
      } else {
        toast.error(`Kode atau Kartu "${cleanCode}" tidak cocok dengan data guru sekolah.`);
      }
    },
    [session, rawAttendees, attendMutation]
  );

  // Filter & Search Attendees
  const filteredAttendees = useMemo(() => {
    return rawAttendees.filter((guru) => {
      const matchSearch =
        guru.nama_guru.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guru.nip.includes(searchTerm) ||
        guru.mapel_jabatan.toLowerCase().includes(searchTerm.toLowerCase());

      let matchFilter = true;
      if (attendanceFilter === 'HADIR') matchFilter = guru.is_hadir;
      else if (attendanceFilter === 'BELUM') matchFilter = !guru.is_hadir;

      return matchSearch && matchFilter;
    });
  }, [rawAttendees, searchTerm, attendanceFilter]);

  // Simpan Notulen
  const handleSaveNotulen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const agendaArray = formAgendaText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    updateSessionMutation.mutate({
      nama_acara: formNamaAcara,
      waktu_mulai: formWaktuMulai,
      waktu_selesai: formWaktuSelesai,
      tempat: formTempat,
      pimpinan_rapat: formPimpinan,
      notulis: formNotulis,
      agenda: agendaArray,
      notulen_hasil: formNotulenHasil,
    });
  };

  // Toggle Selesai / Aktif
  const handleToggleSessionStatus = () => {
    if (!session) return;
    const nextStatus = session.status === 'AKTIF' ? 'SELESAI' : 'AKTIF';
    const confirmMsg =
      nextStatus === 'SELESAI'
        ? 'Apakah Anda yakin ingin MENYELESAIKAN dan MENUTUP rapat sosialisasi ini? Scan mandiri akan ditutup.'
        : 'Aktifkan kembali sesi rapat sosialisasi ini?';

    if (window.confirm(confirmMsg)) {
      updateSessionMutation.mutate({ status: nextStatus });
    }
  };

  // Reset Sesi Baru
  const handleResetNewSession = () => {
    const confirmMsg =
      'PERINGATAN: Apakah Anda ingin membuat SESI BARU rapat sosialisasi?\n\n' +
      'Tindakan ini akan mengenerate Kode QR baru dan daftar hadir sesi baru untuk acara berikutnya.';

    if (window.confirm(confirmMsg)) {
      resetSessionMutation.mutate(formNamaAcara);
    }
  };

  const portalLink = React.useMemo(() => {
    if (!session) return '';
    return `${window.location.origin}/portal/sosialisasi-presensi?tenantId=${session.tenant_id}&token=${session.qr_token}`;
  }, [session]);

  return (
    <div className="space-y-4">
      {/* ── SUB-TAB NAVIGATOR ── */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('GLOBAL_RAPAT')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              activeSubTab === 'GLOBAL_RAPAT'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Manajemen Seluruh Rapat & Notulen</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SOSIALISASI_TODAY')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              activeSubTab === 'SOSIALISASI_TODAY'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <QrCode className="w-4 h-4" />
            <span>Rapat Sosialisasi Hari Ini (Live)</span>
            {session?.status === 'AKTIF' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {activeSubTab === 'GLOBAL_RAPAT' ? (
        <RapatManagementView />
      ) : (
        <>
          {/* ── FLIGHT DECK: RINGKASAN STATUS RAPAT SOSIALISASI ── */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5',
                  session?.status === 'AKTIF'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    session?.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-slate-400'
                  )}
                />
                <span>{session?.status === 'AKTIF' ? 'SESI SOSIALISASI AKTIF' : 'RAPAT SELESAI'}</span>
              </span>

              <span className="text-xs text-slate-500 font-mono">
                TOKEN: <strong className="text-slate-800 dark:text-slate-200">{session?.qr_token || '-'}</strong>
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <QrCode className="text-indigo-600 dark:text-indigo-400" size={20} />
              <span>{session?.nama_acara || 'Sosialisasi & Bimtek Penggunaan Platform Absenta'}</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-slate-400" />
                <span>
                  {session?.waktu_mulai} - {session?.waktu_selesai} WIB
                </span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" />
                <span>{session?.tempat || 'Ruang Rapat'}</span>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck size={13} className="text-slate-400" />
                <span>Pimpinan: <strong>{session?.pimpinan_rapat || '-'}</strong></span>
              </span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQrPrintOpen(true)}
              className="font-bold border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 cursor-pointer shadow-2xs"
            >
              <Printer size={14} className="mr-1.5" />
              <span>Cetak QR Cetak</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBapPrintOpen(true)}
              className="font-bold border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer shadow-2xs"
            >
              <FileText size={14} className="mr-1.5" />
              <span>Cetak Berita Acara & Notulen</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsScannerOpen(true)}
              className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs"
            >
              <Camera size={14} className="mr-1.5" />
              <span>Live Scanner Panitia</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* ── STATS PROGRESS BAR ── */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[11px] font-semibold text-slate-500">Total Guru Terdaftar</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.totalGuru}</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Guru Hadir (Tercatat)</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
              {stats.hadirCount} <span className="text-xs font-normal">({stats.persentaseHadir}%)</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Belum Hadir</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-400">{stats.belumHadirCount}</p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">Status Keberjalanan</p>
              <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                {session?.status === 'AKTIF' ? 'Sesi Terbuka' : 'Ditutup'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSessionStatus}
              className="text-[10px] font-bold text-indigo-600 hover:underline text-left cursor-pointer pt-1"
            >
              {session?.status === 'AKTIF' ? 'Tutup Sesi Rapat' : 'Buka Sesi Kembali'}
            </button>
          </div>
        </div>

        {/* Progress Bar Visual */}
        <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, stats.persentaseHadir)}%` }}
          />
        </div>

        {/* Tautan Presensi Mandiri Langsung */}
        {portalLink && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">📱 Link Presensi Guru:</span>
              <a
                href={portalLink}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              >
                {portalLink}
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(portalLink);
                toast.success('Tautan presensi guru disalin ke clipboard!');
              }}
              className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 text-[11px] shrink-0 cursor-pointer"
            >
              Salin Link
            </button>
          </div>
        )}
      </div>

      {/* ── GRID: NOTULEN FORM & LIVE ATTENDEE TABLE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* KOLOM KIRI: FORM NOTULEN & AGENDA (4 Kolom di desktop) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText size={15} className="text-indigo-600" />
              <span>Notulen & Informasi Rapat</span>
            </h3>
            <button
              type="button"
              onClick={handleResetNewSession}
              className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Buat Sesi Baru"
            >
              + Sesi Baru
            </button>
          </div>

          <form onSubmit={handleSaveNotulen} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Acara / Rapat</label>
              <Input
                type="text"
                value={formNamaAcara}
                onChange={(e) => setFormNamaAcara(e.target.value)}
                placeholder="Nama rapat sosialisasi..."
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mulai</label>
                <Input
                  type="text"
                  value={formWaktuMulai}
                  onChange={(e) => setFormWaktuMulai(e.target.value)}
                  placeholder="08:00"
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Selesai</label>
                <Input
                  type="text"
                  value={formWaktuSelesai}
                  onChange={(e) => setFormWaktuSelesai(e.target.value)}
                  placeholder="11:30"
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tempat / Ruangan</label>
              <Input
                type="text"
                value={formTempat}
                onChange={(e) => setFormTempat(e.target.value)}
                placeholder="Aula / Ruang Rapat..."
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pimpinan Rapat</label>
                <Input
                  type="text"
                  value={formPimpinan}
                  onChange={(e) => setFormPimpinan(e.target.value)}
                  placeholder="Nama pimpinan..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notulis</label>
                <Input
                  type="text"
                  value={formNotulis}
                  onChange={(e) => setFormNotulis(e.target.value)}
                  placeholder="Nama notulis..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Agenda Pembahasan <span className="text-[10px] font-normal text-slate-400">(1 baris = 1 poin)</span>
              </label>
              <textarea
                value={formAgendaText}
                onChange={(e) => setFormAgendaText(e.target.value)}
                rows={4}
                placeholder="Poin agenda pembahasan..."
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Notulen Hasil & Kesepakatan Bersama
              </label>
              <textarea
                value={formNotulenHasil}
                onChange={(e) => setFormNotulenHasil(e.target.value)}
                rows={5}
                placeholder="Tuliskan poin-poin kesepakatan rapat sosialisasi..."
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={updateSessionMutation.isPending}
              className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              <Save size={13} className="mr-1.5" />
              <span>{updateSessionMutation.isPending ? 'Menyimpan...' : 'Simpan Notulen Rapat'}</span>
            </Button>
          </form>
        </div>

        {/* KOLOM KANAN: DAFTAR KEHADIRAN LIVE & TOGGLE (8 Kolom di desktop) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Toolbar Filter & Pencarian Peserta */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  placeholder="Cari guru, NIP, atau mapel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                    attendanceFilter === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                >
                  Semua ({rawAttendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('HADIR')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                    attendanceFilter === 'HADIR'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                >
                  Hadir ({stats.hadirCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('BELUM')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                    attendanceFilter === 'BELUM'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                >
                  Belum ({stats.belumHadirCount})
                </button>
              </div>
            </div>

            {/* Tabel Kehadiran Peserta */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-3">Mapel / Tugas</th>
                    <th className="py-2.5 px-3 text-center">Waktu Presensi</th>
                    <th className="py-2.5 px-3 text-center">Metode</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada guru yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((guru, idx) => {
                      const waktuStr = guru.waktu_hadir
                        ? new Date(guru.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : '-';

                      return (
                        <tr
                          key={guru.guru_id}
                          className={cn(
                            'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                            guru.is_hadir ? 'bg-emerald-50/20' : ''
                          )}
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{guru.nama_guru}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NIP: {guru.nip}</p>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                            {guru.mapel_jabatan}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px]">
                            {guru.is_hadir ? (
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{waktuStr} WIB</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {guru.is_hadir ? (
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                  guru.metode_scan === 'QR_MANDIRI'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                    : guru.metode_scan === 'SCANNER_PANITIA'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                {guru.metode_scan === 'QR_MANDIRI'
                                  ? 'Scan QR'
                                  : guru.metode_scan === 'SCANNER_PANITIA'
                                  ? 'Scan Meja'
                                  : 'Manual'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {guru.is_hadir ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={13} />
                                <span>Hadir</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">Belum</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {session && (
                              <button
                                type="button"
                                disabled={attendMutation.isPending}
                                onClick={() =>
                                  attendMutation.mutate({
                                    sessionId: session.id,
                                    guruId: guru.guru_id,
                                    isHadir: !guru.is_hadir,
                                    metodeScan: 'MANUAL',
                                  })
                                }
                                className={cn(
                                  'h-7 px-2 text-[10px] font-bold rounded-lg transition-colors cursor-pointer',
                                  guru.is_hadir
                                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                )}
                              >
                                {guru.is_hadir ? 'Batalkan' : 'Hadirkan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {session && (
        <>
          <RapatSosialisasiQrPrintModal
            isOpen={isQrPrintOpen}
            onClose={() => setIsQrPrintOpen(false)}
            session={session}
          />

          <RapatSosialisasiBeritaAcaraPrintModal
            isOpen={isBapPrintOpen}
            onClose={() => setIsBapPrintOpen(false)}
            session={session}
            attendees={rawAttendees}
            stats={stats}
          />

          <RapatSosialisasiScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanResult={handleScannerResult}
            lastScannedTeacher={lastScannedTeacher}
          />
        </>
      )}
    </>
  )}
</div>
  );
};
