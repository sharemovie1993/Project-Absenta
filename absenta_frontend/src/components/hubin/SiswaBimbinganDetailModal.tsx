import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Send, 
  MessageSquare,
  ChevronRight,
  ClipboardList,
  LogIn,
  LogOut,
  Sparkles,
  Camera,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Badge, Loader } from '../ui';
import { hubinApi, type AbsensiPkl } from '../../api/hubin.api';
import { resolveAttachmentUrl, getDriveThumbnailUrl } from '../../utils/hubinUtils';
import { formatDate } from '../../utils/layoutUtils';
import { formatLocalTimeFromISO, formatLocalDateTime, getTimezoneLabel, getVirtualDate } from '../../utils/attendance/time';

const formatWaktu = (raw?: string | null) => {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();
  const tzLabel = getTimezoneLabel();
  if (str.includes('T') || str.includes('Z')) {
    const formatted = formatLocalTimeFromISO(str);
    if (formatted) return `${formatted} ${tzLabel}`;
  }
  const clean = str.replace(/(WIB|WITA|WIT)/gi, '').trim();
  return clean ? `${clean} ${tzLabel}` : '-';
};

interface SiswaBimbinganDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaPkl: any;
  initialTab?: 'presensi' | 'logbook';
}

export const SiswaBimbinganDetailModal: React.FC<SiswaBimbinganDetailModalProps> = ({
  isOpen,
  onClose,
  siswaPkl,
  initialTab = 'presensi',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'presensi' | 'logbook'>(initialTab);
  const [selectedAbsensiId, setSelectedAbsensiId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Sync initialTab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedAbsensiId(null);
      setFeedbackText('');
      setPreviewPhotoUrl(null);
    }
  }, [isOpen, initialTab]);

  // Query Riwayat Presensi & Logbook Siswa
  const { data: absensiRes, isLoading, refetch } = useQuery({
    queryKey: ['absensi-pkl-history', siswaPkl?.id],
    queryFn: () => hubinApi.getAbsensi(siswaPkl?.id, { limit: 100 }),
    enabled: isOpen && !!siswaPkl?.id,
    staleTime: 30 * 1000,
  });

  const absensiList = useMemo(() => {
    const raw = (absensiRes as any)?.data?.data || (absensiRes as any)?.data;
    if (Array.isArray(raw) && raw.length > 0) return raw as AbsensiPkl[];
    if (Array.isArray(absensiRes) && absensiRes.length > 0) return absensiRes as AbsensiPkl[];
    // Gunakan jalur data yang sudah ada di record siswaPkl jika query history belum selesai / kosong
    if (Array.isArray(siswaPkl?.AbsensiPkl) && siswaPkl.AbsensiPkl.length > 0) {
      return siswaPkl.AbsensiPkl as AbsensiPkl[];
    }
    return [];
  }, [absensiRes, siswaPkl]);

  // Default select the latest absensi with logbook
  const activeAbsensi = useMemo(() => {
    if (!absensiList.length) return null;
    if (selectedAbsensiId) {
      return absensiList.find(a => a.id === selectedAbsensiId) || absensiList[0];
    }
    return absensiList[0];
  }, [absensiList, selectedAbsensiId]);

  // Mutation Verifikasi Presensi
  const verifyMutation = useMutation({
    mutationFn: (id: string) => hubinApi.verifyAbsensi(id),
    onSuccess: () => {
      toast.success('Presensi berhasil diverifikasi!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-tab'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-widget'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memverifikasi presensi.');
    }
  });

  // Mutation Tambah Feedback Pembimbing ke Logbook
  const feedbackMutation = useMutation({
    mutationFn: async ({ abs, text }: { abs: AbsensiPkl; text: string }) => {
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(abs.kegiatan || '[]');
      } catch (e) {
        parsed = [];
      }
      const newEntry = {
        time: formatLocalDateTime(getVirtualDate()).split('T')[1] || '08:00',
        text: `[Feedback Pembimbing]: ${text.trim()}`,
        type: 'FEEDBACK'
      };
      const updated = [...(Array.isArray(parsed) ? parsed : []), newEntry];
      return hubinApi.updateLogbook(siswaPkl.id, JSON.stringify(updated), abs.id);
    },
    onSuccess: () => {
      toast.success('Catatan pembimbing berhasil dikirim!');
      setFeedbackText('');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengirim feedback.');
    }
  });

  // Parsed Logbook Activities for Active Absensi
  const parsedActivities = useMemo(() => {
    if (!activeAbsensi || !activeAbsensi.kegiatan) return [];
    try {
      const parsed = JSON.parse(activeAbsensi.kegiatan);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [{ time: activeAbsensi.jam_masuk || '-', text: activeAbsensi.kegiatan }];
    }
  }, [activeAbsensi]);

  // Attendance Statistics
  const stats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let unverified = 0;

    absensiList.forEach(a => {
      const st = (a.status || '').toUpperCase();
      if (st === 'HADIR' || st === 'TERLAMBAT' || a.jam_masuk) hadir++;
      else if (st === 'SAKIT') sakit++;
      else if (st === 'IZIN') izin++;

      if (!a.is_verified && (a.jam_masuk || st === 'HADIR')) {
        unverified++;
      }
    });

    return { hadir, sakit, izin, unverified, total: absensiList.length };
  }, [absensiList]);

  if (!siswaPkl) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        contentClassName="p-3 sm:p-5 pt-2 sm:pt-3"
        title={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs sm:text-sm shrink-0">
              {(siswaPkl.Siswa?.nama_siswa || 'S')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                  {siswaPkl.Siswa?.nama_siswa}
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {siswaPkl.Siswa?.Kelas?.nama_kelas || 'Kelas'}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  NIS: {siswaPkl.Siswa?.nis}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                <Building2 size={12} className="text-indigo-500 shrink-0" />
                <span className="truncate">{siswaPkl.Mitra?.nama}</span>
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Tab Navigation Controls (Responsive Mobile & Desktop) */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('presensi')}
                className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'presensi'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock size={13} className="shrink-0" />
                <span className="sm:hidden">Presensi ({absensiList.length})</span>
                <span className="hidden sm:inline">Riwayat Presensi ({absensiList.length})</span>
                {stats.unverified > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shrink-0">
                    {stats.unverified}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logbook')}
                className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'logbook'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText size={13} className="shrink-0" />
                <span className="sm:hidden">Logbook</span>
                <span className="hidden sm:inline">Jurnal & Logbook</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0"
              title="Muat ulang data"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5">
              <Loader size="md" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mengambil riwayat bimbingan...
              </span>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB 1: RIWAYAT PRESENSI                                        */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'presensi' && (
                <div className="space-y-3">
                  {/* Summary Metric Strip (Single Row 4 Columns Ultra-Compact) */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total</span>
                      <span className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 leading-tight">{stats.total}</span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block truncate">Hadir</span>
                      <span className="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">{stats.hadir}</span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block truncate">Izin/Sakit</span>
                      <span className="text-xs sm:text-base font-black text-blue-600 dark:text-blue-400 leading-tight">{stats.izin + stats.sakit}</span>
                    </div>
                    <div className={`p-2 sm:p-2.5 rounded-xl border text-center transition-colors ${
                      stats.unverified > 0 
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60' 
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800'
                    }`}>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block truncate ${
                        stats.unverified > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                      }`}>Pending</span>
                      <span className={`text-xs sm:text-base font-black leading-tight ${
                        stats.unverified > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {stats.unverified}
                      </span>
                    </div>
                  </div>

                  {/* List / Table of Attendance Records */}
                  {absensiList.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                      <Clock size={28} className="mx-auto opacity-30" />
                      <p className="text-xs font-bold">Belum ada riwayat absensi untuk siswa ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                      {absensiList.map((abs) => {
                        const dateFormatted = formatDate(abs.tanggal, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });

                        const isHadir = abs.jam_masuk || abs.status === 'HADIR' || abs.status === 'TERLAMBAT';
                        const photoIn = resolveAttachmentUrl(abs.image_url);
                        const photoOut = resolveAttachmentUrl(abs.image_url_out);

                        return (
                          <div
                            key={abs.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              !abs.is_verified && isHadir
                                ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-300/60 dark:border-amber-900/50'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {/* Row 1: Tanggal & Badge Status & Lokasi */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                  {dateFormatted}
                                </span>
                                <Badge
                                  variant={isHadir ? 'success' : 'secondary'}
                                  className="text-[9px] font-black uppercase px-1.5 py-0.2"
                                >
                                  {abs.status || 'HADIR'}
                                </Badge>
                                {abs.is_outside_radius ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                                    ⚠️ Luar Radius ({Math.round(abs.distance_meters || 0)}m)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                    📍 Lokasi DUDI
                                  </span>
                                )}
                              </div>

                              {/* Verifikasi Status / Tombol */}
                              <div className="shrink-0">
                                {abs.is_verified ? (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    <span>Terverifikasi</span>
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => verifyMutation.mutate(abs.id)}
                                    disabled={verifyMutation.isPending}
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <ShieldCheck size={12} />
                                    <span>Verifikasi</span>
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Row 2: Jam Masuk/Pulang & Thumbnail Foto */}
                            <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                              <div className="flex items-center gap-3 sm:gap-4 font-medium">
                                <span className="flex items-center gap-1">
                                  <LogIn size={12} className="text-emerald-500" />
                                  <span>Masuk: <strong className="text-slate-800 dark:text-slate-200">{formatWaktu(abs.jam_masuk)}</strong></span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <LogOut size={12} className="text-rose-500" />
                                  <span>Pulang: <strong className="text-slate-800 dark:text-slate-200">{formatWaktu(abs.jam_pulang)}</strong></span>
                                </span>
                              </div>

                              {/* Thumbnail Foto Masuk */}
                              {photoIn && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(photoIn)}
                                  className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform group cursor-pointer shrink-0"
                                  title="Lihat foto selfie check-in"
                                >
                                  <img
                                    src={photoIn}
                                    alt="Selfie"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Camera size={11} className="text-white" />
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB 2: JURNAL & LOGBOOK (Ultra-Clean & Compact Layout)         */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'logbook' && (
                <div className="space-y-3">
                  {/* 1. Date Selector (Sleek Horizontal Scroll Pills) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pilih Tanggal:
                    </span>
                    {absensiList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada riwayat tanggal</p>
                    ) : (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {absensiList.map((a) => {
                          const isSelected = activeAbsensi?.id === a.id;
                          const dateShort = formatDate(a.tanggal, { day: 'numeric', month: 'short' });

                          let hasKegiatan = false;
                          try {
                            const parsed = JSON.parse(a.kegiatan || '[]');
                            hasKegiatan = Array.isArray(parsed) && parsed.length > 0;
                          } catch {
                            hasKegiatan = !!a.kegiatan;
                          }

                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setSelectedAbsensiId(a.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              <span>{dateShort}</span>
                              {hasKegiatan ? (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} title="Ada catatan jurnal" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Timeline Aktivitas & Catatan Harian */}
                  {activeAbsensi ? (
                    <div className="space-y-2.5">
                      {/* Timeline Card */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <ClipboardList size={13} className="text-indigo-500" />
                            <span>
                              Aktivitas: {activeAbsensi.tanggal ? formatDate(activeAbsensi.tanggal, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                          </span>
                          {activeAbsensi.is_verified && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Disetujui
                            </span>
                          )}
                        </div>

                        {/* Render Timeline Items */}
                        {parsedActivities.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 space-y-1.5">
                            <Clock size={24} className="mx-auto opacity-30" />
                            <p className="text-xs font-semibold">Siswa belum menuliskan catatan aktivitas pada tanggal ini.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                            {parsedActivities.map((act: any, idx: number) => {
                              const isFeedback = act.type === 'FEEDBACK' || (typeof act.text === 'string' && act.text.startsWith('[Feedback Pembimbing]'));
                              return (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                                    isFeedback
                                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/40 text-purple-900 dark:text-purple-200'
                                      : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/80'
                                  }`}
                                >
                                  <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shrink-0">
                                    {act.time || '-'}
                                  </span>
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                      {act.text}
                                    </p>
                                    {act.image_url && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewPhotoUrl(resolveAttachmentUrl(act.image_url))}
                                        className="mt-1 block w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                                        title="Lihat foto kegiatan"
                                      >
                                        <img
                                          src={resolveAttachmentUrl(act.image_url)}
                                          alt="Bukti kegiatan"
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. Pembimbing Feedback Input Form (Compact & Clean Strip) */}
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={13} />
                            <span>Beri Catatan / Instruksi Pembimbing</span>
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Ketik feedback atau arahan pekerjaan..."
                            className="flex-1 px-3 py-1.5 h-8 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && feedbackText.trim() && activeAbsensi) {
                                e.preventDefault();
                                feedbackMutation.mutate({ abs: activeAbsensi, text: feedbackText });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={!feedbackText.trim() || feedbackMutation.isPending}
                            onClick={() => {
                              if (activeAbsensi && feedbackText.trim()) {
                                feedbackMutation.mutate({ abs: activeAbsensi, text: feedbackText });
                              }
                            }}
                            className="h-8 px-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={11} />
                            <span>Kirim</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Pilih salah satu tanggal di atas untuk memeriksa logbook.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Lightbox / Preview Foto Modal */}
      {previewPhotoUrl && (
        <Modal
          isOpen={!!previewPhotoUrl}
          onClose={() => setPreviewPhotoUrl(null)}
          size="md"
          title="Bukti Foto Presensi / Kegiatan PKL"
        >
          <div className="p-2 flex flex-col items-center">
            <img
              src={previewPhotoUrl}
              alt="Preview Foto"
              className="max-h-[70vh] rounded-xl object-contain shadow-lg"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewPhotoUrl(null)}
              className="mt-3 rounded-xl text-xs font-bold"
            >
              Tutup Foto
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};
