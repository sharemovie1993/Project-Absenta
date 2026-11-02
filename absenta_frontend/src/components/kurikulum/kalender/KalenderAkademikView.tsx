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
import { SharedAcademicCalendarGrid } from './SharedAcademicCalendarGrid';
import { KalenderAkademikPrintModal } from './KalenderAkademikPrintModal';

// Lazy load subcomponents
const EventFormModal = lazy(() => import('./EventFormModal'));
const EventListCard = lazy(() => import('./EventListCard'));

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

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['kalender-akademik', tahunPelajaranId],
    queryFn: () => kurikulumApi.getCalendar(tahunPelajaranId || undefined),
    staleTime: 1000 * 60 * 2,
  });

  const { data: statsData } = useQuery<CalendarStats | null>({
    queryKey: ['kalender-stats', tahunPelajaranId],
    queryFn: () => kurikulumApi.getCalendarStats(tahunPelajaranId || undefined),
    staleTime: 1000 * 60 * 2,
  });

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

  const content = (
    <div className="space-y-4 w-full min-w-0">
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
              className="flex items-center gap-1.5 rounded-xl text-xs px-3 hidden sm:flex"
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
                  className="rounded-xl text-xs px-3 hidden md:flex"
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

      {/* Legenda Warna */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 mr-1 uppercase text-[10px] tracking-wider flex items-center gap-1">
          <Info size={13} className="text-emerald-500" /> Keterangan:
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>Libur Nasional</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Libur Sekolah</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Ujian (STS / SAS)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Kegiatan Sekolah</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>Libur Rutin</span>
        </div>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Event', value: statsData.total_events, icon: <Flag size={14} />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50' },
            { label: 'Hari Libur', value: statsData.hari_libur, icon: <AlertCircle size={14} />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' },
            { label: 'Hari Ujian', value: statsData.hari_ujian, icon: <BookOpen size={14} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' },
            { label: 'Kegiatan', value: statsData.hari_kegiatan, icon: <Calendar size={14} />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
            { 
              label: 'Minggu Efektif', 
              value: statsData.calculated_minggu_efektif !== undefined ? statsData.calculated_minggu_efektif : statsData.minggu_efektif, 
              icon: <Clock size={14} />, 
              color: 'text-amber-600 dark:text-amber-400', 
              bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
              subtitle: statsData.calculated_minggu_efektif_s1 !== undefined && statsData.calculated_minggu_efektif_s2 !== undefined
                ? `S1: ${statsData.calculated_minggu_efektif_s1} | S2: ${statsData.calculated_minggu_efektif_s2}`
                : undefined
            },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{s.label}</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${s.bg} ${s.color} shrink-0`}>
                  {s.icon}
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {s.value}
                </div>
                {s.subtitle && (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider truncate">
                    {s.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared Calendar Grid */}
      <SharedAcademicCalendarGrid
        calYear={calYear}
        calMonth={calMonth}
        onPrevMonth={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
        onNextMonth={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
        events={events}
        hariSekolah={tenantRes?.hari_sekolah}
        canManage={canManage}
        onAddEventOnDate={(day) => openCreateModalWithDate(day)}
        showLegend={false}
        showMonthHeaderNav={true}
      />

      {/* Event List Card */}
      <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Memuat daftar event...</div>}>
        <EventListCard
          events={events}
          isLoading={isLoading}
          canManage={canManage}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkDelete={handleBulkDelete}
          onClearAll={handleClearAll}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onEventClick={handleEventClick}
        />
      </Suspense>

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
        <div className="flex items-center gap-2">
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
