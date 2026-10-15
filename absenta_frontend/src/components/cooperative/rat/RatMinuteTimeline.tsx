import React, { useState, useMemo } from 'react';
import { Button, Badge } from '../../ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { useConfirm } from '@/hooks/useConfirm';
import {
  BookOpen,
  Plus,
  Printer,
  Clock,
  User,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Scroll,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckSquare
} from 'lucide-react';
import type { CoopAgendaItem, CoopMeetingMinuteItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatMinuteTimelineProps {
  meetingId: string;
  agendas: CoopAgendaItem[];
  canManage: boolean;
  onOpenAddMinute: (agendaId?: string) => void;
  onEditMinute: (minute: CoopMeetingMinuteItem) => void;
  onOpenPrintProceedings: () => void;
}

export const RatMinuteTimeline: React.FC<RatMinuteTimelineProps> = React.memo(({
  meetingId,
  agendas = [],
  canManage,
  onOpenAddMinute,
  onEditMinute,
  onOpenPrintProceedings,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgendaFilter, setSelectedAgendaFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Query Minutes
  const { data: minutes = [], isLoading } = useQuery<CoopMeetingMinuteItem[]>({
    queryKey: ['coop-rat-minutes', meetingId],
    queryFn: async () => {
      const res = await api.get(`/cooperative/rat/${meetingId}/minutes`);
      return res.data?.data || [];
    },
    staleTime: 30 * 1000,
  });

  // Mutation Delete Minute
  const deleteMutation = useMutation({
    mutationFn: async (minuteId: string) => {
      const res = await api.delete(`/cooperative/rat/minutes/${minuteId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coop-rat-minutes', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['coop-rat-proceedings', meetingId] });
      toast.success('Butir notulensi berhasil dihapus');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus notulensi';
      toast.error(errorMsg);
    }
  });

  const handleDelete = async (minute: CoopMeetingMinuteItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Butir Notulensi?',
      message: `Hapus catatan "${minute.topic}" oleh ${minute.speakerName || 'Pembicara'}? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
      variant: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(minute.id);
    }
  };

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'SUGGESTION':
        return { label: 'Usulan / Saran', icon: Lightbulb, badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
      case 'OBJECTION':
        return { label: 'Interupsi / Dinamika', icon: AlertTriangle, badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800' };
      case 'CONCLUSION':
        return { label: 'Kesimpulan / Mufakat', icon: CheckCircle2, badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
      case 'ANNOUNCEMENT':
        return { label: 'Pengumuman', icon: Megaphone, badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
      case 'OPENING':
        return { label: 'Protokoler', icon: Scroll, badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
      default:
        return { label: 'Tanya Jawab / Diskusi', icon: MessageSquare, badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
    }
  };

  // Filtered Minutes
  const filteredMinutes = useMemo(() => {
    return minutes.filter((m) => {
      const matchSearch =
        m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.speakerName && m.speakerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.actionItem && m.actionItem.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchAgenda =
        selectedAgendaFilter === 'ALL' ||
        (selectedAgendaFilter === 'GENERAL' ? !m.agendaId : m.agendaId === selectedAgendaFilter);

      const matchCategory =
        selectedCategoryFilter === 'ALL' || m.category === selectedCategoryFilter;

      return matchSearch && matchAgenda && matchCategory;
    });
  }, [minutes, searchQuery, selectedAgendaFilter, selectedCategoryFilter]);

  // Counts
  const suggestionCount = useMemo(() => minutes.filter(m => m.category === 'SUGGESTION').length, [minutes]);
  const conclusionCount = useMemo(() => minutes.filter(m => m.category === 'CONCLUSION').length, [minutes]);

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & ACTION TOOLBAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-50/90 via-indigo-50/70 to-slate-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
              Risalah & Notulensi Persidangan RAT
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Dokumentasikan jalannya musyawarah, tanya jawab forum, interupsi, serta kesepakatan pimpinan sidang secara kronologis dan terstruktur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarOutline"
            onClick={onOpenPrintProceedings}
            className="gap-1.5 text-xs font-semibold"
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            <span>Cetak Berita Acara & Risalah</span>
          </Button>

          {canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={() => onOpenAddMinute()}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Notulensi Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. METRIC SUMMARY CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Butir Notulensi
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {minutes.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Usulan / Pandangan Anggota
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {suggestionCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kesimpulan / Mufakat
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {conclusionCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTERS BAR ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari topik, isi dinamika, atau nama pembicara..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Agenda Filter Dropdown */}
          <select
            value={selectedAgendaFilter}
            onChange={(e) => setSelectedAgendaFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Butir Acara</option>
            <option value="GENERAL">Pleno Umum (Tanpa Butir)</option>
            {agendas.map((ag) => (
              <option key={ag.id} value={ag.id}>
                Acara {ag.orderIndex}: {ag.title.slice(0, 30)}...
              </option>
            ))}
          </select>

          {/* Category Filter Dropdown */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="DISCUSSION">Tanya Jawab</option>
            <option value="SUGGESTION">Usulan / Saran</option>
            <option value="OBJECTION">Interupsi</option>
            <option value="CONCLUSION">Kesimpulan</option>
            <option value="ANNOUNCEMENT">Pengumuman</option>
            <option value="OPENING">Protokoler</option>
          </select>
        </div>
      </div>

      {/* ── 4. MINUTES TIMELINE LIST ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filteredMinutes.length > 0 ? (
        <div className="space-y-4">
          {filteredMinutes.map((minute, idx) => {
            const meta = getCategoryMeta(minute.category);
            const CatIcon = meta.icon;

            return (
              <div
                key={minute.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Header: Badges & Speaker */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}>
                      <CatIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{meta.label}</span>
                    </span>

                    {minute.agenda ? (
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg truncate max-w-xs">
                        Acara {minute.agenda.order}: {minute.agenda.title}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                        Pleno Umum
                      </span>
                    )}

                    {minute.timeRecord && (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{minute.timeRecord}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions for Manager */}
                  {canManage && (
                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditMinute(minute)}
                        title="Sunting Notulensi"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(minute)}
                        title="Hapus Notulensi"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Speaker Info */}
                {minute.speakerName && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-3 h-3" />
                    </span>
                    <span>{minute.speakerName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      {minute.speakerRole || 'Peserta'}
                    </span>
                  </div>
                )}

                {/* Topic & Full Content */}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {minute.topic}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {minute.content}
                  </p>
                </div>

                {/* Action Item Quote Box */}
                {minute.actionItem && (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <CheckSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Kesepakatan / Tindak Lanjut:
                      </span>
                      <span>{minute.actionItem}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <h4 className="font-bold text-base text-slate-700 dark:text-slate-200">
            Belum Ada Catatan Notulensi Sidang
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Notulis atau Sekretaris Presidium dapat mendokumentasikan setiap dinamika, masukan, dan mufakat sidang di sini.
          </p>
          {canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={() => onOpenAddMinute()}
              className="gap-1.5 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Notulensi Pertama</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

RatMinuteTimeline.displayName = 'RatMinuteTimeline';
