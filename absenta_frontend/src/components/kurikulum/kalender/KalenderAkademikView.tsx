import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  Plus,
  Clock,
  Flag,
  AlertCircle,
  BookOpen,
  Calendar,
  Info,
  Printer,
  CalendarDays,
  RotateCcw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button, SectionCard, Label } from '@/components/ui';
import { kurikulumApi } from '@/api/kurikulum.api';
import { getMyTenant } from '@/api/tenants.api';
import toast from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useJenjang } from '@/hooks/useJenjang';
import { formatDate } from '@/utils/layoutUtils';
import { TahunPelajaranSelect, useTahunPelajaranOptions } from '@/components/common';
import { 
  CalendarEvent, 
  CalendarPreset, 
  CalendarStats 
} from './EventFormModal';
import { AcademicCalendarMini } from './AcademicCalendarMini';
import { KalenderAkademikPrintModal } from './KalenderAkademikPrintModal';
import { getJenisOption } from './constants';

// Lazy load subcomponents
const EventFormModal = lazy(() => import('./EventFormModal'));

const hardeningModuleKey = 'kalender_akademik_page';

interface TenantResponse {
  hari_sekolah: string[];
}

interface UserAuth {
  capabilities?: string[];
  tenant_id?: string;
  tenantId?: string;
}

interface TahunPelajaran {
  id: string;
  tahun: string;
  nama?: string;
  is_active: boolean;
}

interface BulkSeedResponse {
  message?: string;
}

interface BulkDeleteResponse {
  message?: string;
}

interface MutationError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const eventSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter'),
  jenis: z.string().min(1, 'Jenis event wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  keterangan: z.string().optional(),
}).refine(d => d.tanggal_selesai >= d.tanggal_mulai, {
  message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
  path: ['tanggal_selesai'],
});

function formatDateToYYYYMMDD(d: Date | string): string {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const adjFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < adjFirstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function dateInRange(date: Date, mulai: Date | string, selesai: Date | string): boolean {
  const dateFormatted = formatDateToYYYYMMDD(date);
  const mulaiStr = formatDateToYYYYMMDD(mulai);
  const selesaiStr = formatDateToYYYYMMDD(selesai);
  return dateFormatted >= mulaiStr && dateFormatted <= selesaiStr;
}

function eventInMonth(ev: CalendarEvent, year: number, month: number): boolean {
  const monthStart = formatDateToYYYYMMDD(new Date(year, month, 1));
  const monthEnd = formatDateToYYYYMMDD(new Date(year, month + 1, 0));
  const mulaiStr = formatDateToYYYYMMDD(ev.tanggal_mulai);
  const selesaiStr = formatDateToYYYYMMDD(ev.tanggal_selesai);
  return selesaiStr >= monthStart && mulaiStr <= monthEnd;
}

export interface UniversalKalenderAkademikViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  propTahunPelajaranId?: string;
  propTahunPelajaranNama?: string;
  onClose?: () => void;
}

export const KalenderAkademikView: React.FC<UniversalKalenderAkademikViewProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  propTahunPelajaranId,
  propTahunPelajaranNama,
  onClose,
}) => {
  const { user, isKurikulum, isAdmin, can } = useCapabilities();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const typedUser = user as unknown as UserAuth | null;

  const canManage = !readOnly && (isAdmin || isKurikulum || can('academic.manage.academic'));

  const today = new Date();
  const [calYear, setCalYear] = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(today.getMonth());
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>(propTahunPelajaranId || '');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [defaultDateValue, setDefaultDateValue] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [agendaCategoryFilter, setAgendaCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (propTahunPelajaranId) {
      setTahunPelajaranId(propTahunPelajaranId);
    }
  }, [propTahunPelajaranId]);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: tenantRes } = useQuery<TenantResponse | null>({
    queryKey: ['my-tenant-settings'],
    queryFn: async () => {
      try {
        const res = await getMyTenant();
        return res?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: tpList } = useTahunPelajaranOptions();

  const activeTp = useMemo(() => {
    const list = tpList as unknown as TahunPelajaran[] | undefined;
    return list?.find(t => t.is_active);
  }, [tpList]);

  useEffect(() => {
    if (!tahunPelajaranId && activeTp?.id) {
      setTahunPelajaranId(activeTp.id);
    }
  }, [activeTp, tahunPelajaranId]);

  const { data: rawEvents, isLoading } = useQuery({
    queryKey: ['kalender-akademik', tahunPelajaranId],
    queryFn: () => kurikulumApi.getCalendarEvents(tahunPelajaranId || undefined),
    staleTime: 1000 * 60 * 2,
  });

  const events: CalendarEvent[] = useMemo(() => {
    if (Array.isArray(rawEvents)) return rawEvents;
    if (Array.isArray((rawEvents as any)?.data)) return (rawEvents as any).data;
    return [];
  }, [rawEvents]);

  const { data: rawStatsData } = useQuery({
    queryKey: ['kalender-stats', tahunPelajaranId],
    queryFn: () => kurikulumApi.getCalendarStats(tahunPelajaranId || undefined),
    staleTime: 1000 * 60 * 2,
  });

  const statsData: CalendarStats | null = useMemo(() => {
    if (!rawStatsData) return null;
    if ((rawStatsData as any)?.data) return (rawStatsData as any).data;
    return rawStatsData as CalendarStats;
  }, [rawStatsData]);

  const { data: rawDbPresets } = useQuery({
    queryKey: ['kalender-presets'],
    queryFn: () => kurikulumApi.getCalendarPresets(),
    staleTime: 1000 * 60 * 10,
  });

  const dbPresets: CalendarPreset[] = useMemo(() => {
    if (Array.isArray(rawDbPresets)) return rawDbPresets;
    if (Array.isArray((rawDbPresets as any)?.data)) return (rawDbPresets as any).data;
    return [];
  }, [rawDbPresets]);

  const activeTpObj = useMemo(() => {
    const list = tpList as unknown as TahunPelajaran[] | undefined;
    return list?.find(t => t.id === tahunPelajaranId);
  }, [tpList, tahunPelajaranId]);

  const resolvedTpNama = propTahunPelajaranNama || activeTpObj?.tahun || activeTpObj?.nama || '2026/2027';

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof eventSchema>) => kurikulumApi.createCalendarEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      closeModal();
      toast.success('Event berhasil ditambahkan');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menambahkan event'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof eventSchema> }) =>
      kurikulumApi.updateCalendarEvent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      closeModal();
      toast.success('Event berhasil diperbarui');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteCalendarEvent(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      setSelectedIds(prev => prev.filter(x => x !== id));
      toast.success('Event dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus event'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => kurikulumApi.bulkDeleteCalendar(ids),
    onSuccess: (res: BulkDeleteResponse) => {
      toast.success(res.message || 'Event berhasil dihapus secara massal');
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: () => toast.error('Gagal menghapus event secara massal'),
  });

  const bulkSeedMutation = useMutation({
    mutationFn: (tahunId: string) => kurikulumApi.bulkSeedCalendar(tahunId),
    onSuccess: (res: BulkSeedResponse) => {
      toast.success(res.message || 'Hari libur standar berhasil ditambahkan secara massal!');
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: MutationError) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menambahkan hari libur standar secara massal.';
      toast.error(msg);
    }
  });

  const handleBulkSeed = useCallback(() => {
    if (!tahunPelajaranId) {
      toast.error('Silakan pilih tahun pelajaran terlebih dahulu.');
      return;
    }
    confirm({
      title: 'Auto-Seed Hari Libur',
      message: 'Apakah Anda yakin ingin menambahkan hari libur standar nasional secara otomatis untuk tahun pelajaran ini?',
      confirmText: 'Ya, Seed',
      cancelText: 'Batal'
    }).then(ok => {
      if (ok) bulkSeedMutation.mutate(tahunPelajaranId);
    });
  }, [tahunPelajaranId, confirm, bulkSeedMutation]);

  const handleExportICal = useCallback(async () => {
    try {
      const tenantId = typedUser?.tenant_id || typedUser?.tenantId || localStorage.getItem('tenant_id') || undefined;
      toast.loading('Menyiapkan file kalender...', { id: 'ical-export' });
      const blobData = await kurikulumApi.exportICal(tahunPelajaranId || undefined, tenantId);
      const blob = new Blob([blobData], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kalender-akademik-${tahunPelajaranId || 'semua'}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Kalender iCal berhasil diunduh!', { id: 'ical-export' });
    } catch (err: unknown) {
      const typedErr = err as MutationError;
      let msg = 'Gagal mengunduh file iCal kalender.';
      if (typedErr?.response?.data instanceof Blob) {
        try {
          const text = await typedErr.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) msg = json.message;
        } catch {}
      } else if (typedErr?.response?.data?.message) {
        msg = typedErr.response.data.message;
      } else if (typedErr?.message) {
        msg = typedErr.message;
      }
      toast.error(msg, { id: 'ical-export' });
    }
  }, [typedUser, tahunPelajaranId]);

  const handleClearAll = useCallback(() => {
    if (events.length === 0) return;
    confirm({
      title: 'Hapus Semua Event',
      message: 'Apakah Anda yakin ingin menghapus seluruh event kalender akademik yang ada pada tahun pelajaran ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal'
    }).then(ok => {
      if (ok) {
        const allIds = events?.map(ev => ev.id) ?? [];
        bulkDeleteMutation.mutate(allIds);
      }
    });
  }, [events, confirm, bulkDeleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    confirm({
      title: 'Hapus Event Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} event kalender terpilih secara massal? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal'
    }).then(ok => {
      if (ok) {
        bulkDeleteMutation.mutate(selectedIds);
      }
    });
  }, [selectedIds, confirm, bulkDeleteMutation]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.length === events.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(events.map(ev => ev.id));
    }
  }, [events, selectedIds.length]);

  const handleDelete = useCallback((id: string) => {
    confirm({
      title: 'Hapus Event',
      message: 'Apakah Anda yakin ingin menghapus event kalender ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
    }).then(ok => {
      if (ok) deleteMutation.mutate(id);
    });
  }, [confirm, deleteMutation]);

  const openCreateModal = useCallback(() => {
    setEditTarget(null);
    setDefaultDateValue('');
    setModalOpen(true);
  }, []);

  const openCreateModalWithDate = useCallback((day: number) => {
    setEditTarget(null);
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDefaultDateValue(dateStr);
    setModalOpen(true);
  }, [calYear, calMonth]);

  const openEditModal = useCallback((ev: CalendarEvent) => {
    setEditTarget(ev);
    setDefaultDateValue('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => { 
    setModalOpen(false); 
    setEditTarget(null); 
    setDefaultDateValue('');
  }, []);

  const handleFormSubmit = useCallback((data: z.infer<typeof eventSchema>) => {
    const parsed = eventSchema.safeParse(data);
    if (!parsed.success) {
      toast.error('Data formulir kalender tidak valid');
      return;
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: parsed.data });
    } else {
      createMutation.mutate(parsed.data);
    }
  }, [editTarget, createMutation, updateMutation]);

  const handleEventClick = useCallback((ev: CalendarEvent) => {
    const dateObj = new Date(ev.tanggal_mulai);
    if (!isNaN(dateObj.getTime())) {
      setCalYear(dateObj.getFullYear());
      setCalMonth(dateObj.getMonth());
      
      const calendarGridElement = document.getElementById('calendar-grid');
      if (calendarGridElement) {
        calendarGridElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const targetMonthName = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toLocaleDateString('id-ID', { month: 'long' });
      toast.success(`Menampilkan ${targetMonthName} ${dateObj.getFullYear()}`, { id: 'view-date' });
    }
  }, []);

  const tahunOptions = useMemo(() => {
    const list = tpList as unknown as TahunPelajaran[] | undefined;
    return (list || []).map(t => ({
      value: t.id,
      label: t.nama ? `${t.tahun} - ${t.nama}` : t.tahun,
    }));
  }, [tpList]);

  const handlePrevMonth = useCallback(() => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  }, [calMonth]);

  const handleNextMonth = useCallback(() => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  }, [calMonth]);

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(formatDateToYYYYMMDD(now));
  }, []);

  const activeMonthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('id-ID', { month: 'long' });
  }, [calYear, calMonth]);

  // Events filtered for compact mode (by selectedDate if selected, or by active calMonth & calYear)
  const compactEvents = useMemo(() => {
    if (selectedDate) {
      const targetDate = new Date(selectedDate);
      return events.filter(e => dateInRange(targetDate, e.tanggal_mulai, e.tanggal_selesai));
    }
    return events
      .filter(e => eventInMonth(e, calYear, calMonth))
      .sort((a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime());
  }, [events, selectedDate, calYear, calMonth]);

  const filteredAgendaEvents = useMemo(() => {
    if (agendaCategoryFilter === 'ALL') return compactEvents;
    if (agendaCategoryFilter === 'LIBUR') {
      return compactEvents.filter(e => e.jenis === 'LIBUR_NASIONAL' || e.jenis === 'LIBUR_SEKOLAH');
    }
    if (agendaCategoryFilter === 'UJIAN') {
      return compactEvents.filter(e => e.jenis === 'PTS' || e.jenis === 'PAS');
    }
    if (agendaCategoryFilter === 'KEGIATAN') {
      return compactEvents.filter(e => e.jenis === 'KEGIATAN');
    }
    return compactEvents;
  }, [compactEvents, agendaCategoryFilter]);

  const content = (
    <div className="space-y-3.5 w-full min-w-0">
      {/* Action Bar saat di dalam Dashboard Tab atau Modal (hideLayout = true) */}
      {hideLayout && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Kalender Akademik Sekolah
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Hari efektif KBM, agenda libur nasional/sekolah & jadwal ujian TP {resolvedTpNama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl text-xs px-3"
            >
              <Printer size={13} />
              <span>Cetak Kalender</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportICal}
              className="flex items-center gap-1.5 rounded-xl text-xs px-2.5 hidden sm:flex"
            >
              <span>iCal</span>
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSeed}
                  disabled={bulkSeedMutation.isPending}
                  className="rounded-xl text-xs px-2.5 hidden md:flex"
                >
                  Auto-Seed Libur
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openCreateModal}
                  className="flex items-center gap-1 rounded-xl text-xs px-3"
                >
                  <Plus size={13} /> Tambah Event
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* High-Density Metrics Bento Strip (Shopee-Grade UI Primitives) */}
      {statsData && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 gap-2 sm:gap-0">
            {/* 1. Total Event */}
            <div className="flex items-center gap-2.5 px-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Flag size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Total Event</div>
                <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-none mt-0.5">
                  {statsData.total_events}
                </div>
              </div>
            </div>

            {/* 2. Hari Libur */}
            <div className="flex items-center gap-2.5 px-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Hari Libur</div>
                <div className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 leading-none mt-0.5">
                  {statsData.hari_libur} <span className="text-[10px] font-semibold text-slate-400">Hari</span>
                </div>
              </div>
            </div>

            {/* 3. Hari Ujian */}
            <div className="flex items-center gap-2.5 px-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <BookOpen size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Hari Ujian</div>
                <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 leading-none mt-0.5">
                  {statsData.hari_ujian} <span className="text-[10px] font-semibold text-slate-400">Hari</span>
                </div>
              </div>
            </div>

            {/* 4. Kegiatan Sekolah */}
            <div className="flex items-center gap-2.5 px-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Kegiatan</div>
                <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                  {statsData.hari_kegiatan} <span className="text-[10px] font-semibold text-slate-400">Agenda</span>
                </div>
              </div>
            </div>

            {/* 5. Minggu Efektif */}
            <div className="flex items-center gap-2.5 px-3 py-1">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Minggu Efektif</div>
                <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                  {statsData.calculated_minggu_efektif !== undefined ? statsData.calculated_minggu_efektif : statsData.minggu_efektif}{' '}
                  {statsData.calculated_minggu_efektif_s1 !== undefined && statsData.calculated_minggu_efektif_s2 !== undefined && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-1">
                      (S1: {statsData.calculated_minggu_efektif_s1} · S2: {statsData.calculated_minggu_efektif_s2})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MINI CALENDAR + AGENDA SPLIT VIEW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Kolom Kiri: Mini Calendar Widget */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <AcademicCalendarMini
            calYear={calYear}
            calMonth={calMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onGoToToday={handleGoToToday}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={events}
            hariSekolah={tenantRes?.hari_sekolah}
            canManage={canManage}
            onAddEventOnDate={(day) => openCreateModalWithDate(day)}
          />
        </div>

        {/* Kolom Kanan: Compact Agenda Panel */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-w-0">
          {/* Header Agenda */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 capitalize truncate">
                  {selectedDate ? (
                    <>
                      Agenda: {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </>
                  ) : (
                    <>
                      Agenda {activeMonthName} {calYear}
                    </>
                  )}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  {filteredAgendaEvents.length} Event
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {selectedDate ? 'Menampilkan agenda yang aktif pada tanggal terpilih' : `Seluruh agenda pada bulan ${activeMonthName}`}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors bg-white dark:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Lihat Seluruh Bulan</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20 overflow-x-auto text-[11px]">
            {[
              { id: 'ALL', label: 'Semua Event' },
              { id: 'LIBUR', label: 'Libur' },
              { id: 'UJIAN', label: 'Ujian' },
              { id: 'KEGIATAN', label: 'Kegiatan' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setAgendaCategoryFilter(cat.id)}
                className={cn(
                  "px-2.5 py-0.5 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap cursor-pointer",
                  agendaCategoryFilter === cat.id
                    ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Agenda List Body */}
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto max-h-[420px] space-y-2">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Memuat agenda...</div>
            ) : filteredAgendaEvents.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center text-slate-400">
                <CalendarDays size={28} className="opacity-30 mb-1.5" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {selectedDate ? 'Tidak ada agenda di tanggal ini.' : `Tidak ada agenda pada bulan ${activeMonthName}.`}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {canManage ? 'Klik "+ Tambah Event" pada toolbar di atas untuk membuat event baru.' : 'Pilih tanggal lain di mini kalender.'}
                </p>
              </div>
            ) : (
              filteredAgendaEvents.map(ev => {
                const j = getJenisOption(ev.jenis);
                const isSelected = selectedIds.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-emerald-200 dark:hover:border-emerald-800/60 transition-all"
                  >
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(ev.id)}
                        className="mt-1 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                        aria-label={`Pilih event ${ev.judul}`}
                      />
                    )}
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", j.dotColorClass)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug">
                          {ev.judul}
                        </span>
                        <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-md", j.bgColorClass, j.textColorClass)}>
                          {j.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        <Clock size={10} />
                        <span>
                          {new Date(ev.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          {' — '}
                          {new Date(ev.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {ev.keterangan && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">
                          {ev.keterangan}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(ev)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
                          title="Edit event"
                        >
                          <Pencil size={11} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ev)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 rounded-lg"
                          title="Hapus event"
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bulk Actions */}
          {canManage && selectedIds.length > 0 && (
            <div className="px-4 py-2 bg-rose-50/70 dark:bg-rose-950/30 border-t border-rose-200/60 dark:rose-900/50 flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                {selectedIds.length} event terpilih
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                className="h-6 text-[10px] px-2 rounded-lg"
              >
                Hapus Terpilih
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Event */}
      <Suspense fallback={null}>
        {modalOpen && (
          <EventFormModal
            isOpen={modalOpen}
            onClose={closeModal}
            editTarget={editTarget}
            tahunOptions={tahunOptions}
            dbPresets={dbPresets}
            onSubmit={handleFormSubmit}
            isPending={createMutation.isPending || updateMutation.isPending}
            defaultTahunPelajaranId={tahunPelajaranId}
            defaultDateStr={defaultDateValue}
          />
        )}
      </Suspense>

      {/* Modal Cetak Kalender True WYSIWYG */}
      <KalenderAkademikPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        events={events}
        tahunPelajaranNama={resolvedTpNama}
        tahunPelajaranId={tahunPelajaranId}
      />
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Kalender Akademik"
      description="Rencanakan minggu efektif, jadwal ujian, libur, dan kegiatan sekolah."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/jam-kbm' },
        { label: 'Kalender Akademik' }
      ]}
      instruction={{
        title: 'Panduan Kalender Akademik',
        description: 'Kalender akademik membantu perencanaan dan monitoring kegiatan sekolah selama satu tahun pelajaran.',
        items: [
          { text: 'Tambahkan event libur, ujian, dan kegiatan sekolah untuk setiap tahun pelajaran.' },
          { text: 'Wakasek Kurikulum dapat menentukan minggu efektif berdasarkan kalender ini.' },
          { text: 'Guru dapat melihat kalender untuk merencanakan penyampaian materi.' },
        ]
      }}
      toolbar={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Printer size={14} /> Cetak
          </Button>
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={handleExportICal}
            className="flex items-center gap-1"
          >
            Berlangganan (iCal)
          </Button>
          {canManage && (
            <>
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={handleBulkSeed}
                disabled={bulkSeedMutation.isPending}
              >
                Auto-Seed Libur
              </Button>
              <Button 
                variant="toolbarPrimary" 
                size="toolbar" 
                onClick={openCreateModal}
                className="flex items-center gap-1"
              >
                <Plus size={15} /> Tambah Event
              </Button>
            </>
          )}
        </div>
      }
    >
      <SectionCard title="Filter Tampilan" className="mb-4">
        <div className="max-w-xs">
          <Label>Tahun Pelajaran</Label>
          <TahunPelajaranSelect
            value={tahunPelajaranId}
            onValueChange={v => setTahunPelajaranId(v)}
            placeholder="Semua tahun pelajaran"
            clearable
            autoSelectActive
          />
        </div>
      </SectionCard>

      {content}
    </AcademicPageLayout>
  );
});

KalenderAkademikView.displayName = 'KalenderAkademikView';
