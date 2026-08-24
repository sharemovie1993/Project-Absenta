import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { cn } from '../../lib/utils';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  AlertCircle,
  BookOpen,
  Calendar,
  Info,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button, SectionCard, Label, Tooltip } from '../../components/ui';
import { kurikulumApi } from '../../api/kurikulum.api';
import { getMyTenant } from '../../api/tenants.api';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useJenjang } from '../../hooks/useJenjang';
import { formatDate } from '../../utils/layoutUtils';
import { TahunPelajaranSelect, useTahunPelajaranOptions } from '../../components/common';
import { 
  CalendarEvent, 
  CalendarPreset, 
  CalendarStats 
} from '../../components/kurikulum/kalender/EventFormModal';
import { SharedAcademicCalendarGrid } from '../../components/kurikulum/kalender/SharedAcademicCalendarGrid';
import { getJenisOption } from '../../components/kurikulum/kalender/constants';

// Lazy load subcomponents
const EventFormModal = lazy(() => import('../../components/kurikulum/kalender/EventFormModal'));
const EventListCard = lazy(() => import('../../components/kurikulum/kalender/EventListCard'));
const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

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

export default function KalenderAkademikPage() {
  const { user, isKurikulum, isAdmin, can } = useCapabilities();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const typedUser = user as unknown as UserAuth | null;

  const canManage = useMemo(() => {
    return isAdmin || isKurikulum || can('academic.manage.academic');
  }, [isAdmin, isKurikulum, can]);

  const today = new Date();
  const [calYear, setCalYear] = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(today.getMonth());
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [defaultDateValue, setDefaultDateValue] = useState<string>('');
  const [hasInitializedActiveYear, setHasInitializedActiveYear] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { jenjang } = useJenjang();

  // Dynamic Indonesian month and day name generators using native Intl API
  const activeMonthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('id-ID', { month: 'long' });
  }, [calYear, calMonth]);

  const localizedDayNames = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => 
      new Date(2020, 0, 6 + i).toLocaleDateString('id-ID', { weekday: 'short' })
    );
  }, []);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: dbPresets = [] } = useQuery<CalendarPreset[]>({
    queryKey: ['calendar-presets', jenjang],
    queryFn: () => kurikulumApi.getCalendarPresets(jenjang).then(r => (r.data ?? []) as CalendarPreset[]),
  });

  const { rawList: tahunData, activeTahunPelajaran, options: tahunOptions } = useTahunPelajaranOptions();

  const { data: tenantRes } = useQuery<TenantResponse | null>({
    queryKey: ['my-tenant'],
    queryFn: () => getMyTenant().then(r => r.data as TenantResponse),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Auto-select active academic year
  useEffect(() => {
    if (activeTahunPelajaran && !hasInitializedActiveYear) {
      setTahunPelajaranId(activeTahunPelajaran.id);
      setHasInitializedActiveYear(true);
    }
  }, [activeTahunPelajaran, hasInitializedActiveYear]);

  // Auto-sync calendar year (calYear) to match the selected academic year start
  useEffect(() => {
    if (tahunPelajaranId && tahunData && tahunData.length > 0) {
      const selectedYearObj = tahunData.find(t => t.id === tahunPelajaranId);
      if (selectedYearObj && selectedYearObj.tahun) {
        const parts = selectedYearObj.tahun.split(/[\/\-]/);
        const y1 = parseInt(parts[0]);
        if (!isNaN(y1)) {
          setCalYear(y1);
          setCalMonth(7); // August (Agustus)
        }
      }
    }
  }, [tahunPelajaranId, tahunData]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['kalender-akademik', tahunPelajaranId],
    queryFn: () => kurikulumApi.getKalenderAkademik(tahunPelajaranId || undefined).then(r => (r.data ?? []) as CalendarEvent[]),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: statsData } = useQuery<CalendarStats | null>({
    queryKey: ['kalender-stats', tahunPelajaranId],
    queryFn: () => kurikulumApi.getKalenderStats(tahunPelajaranId || undefined).then(r => r.data as CalendarStats),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof eventSchema>) => kurikulumApi.createKalender(data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] }); 
      qc.invalidateQueries({ queryKey: ['kalender-stats'] }); 
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      toast.success('Event berhasil ditambahkan'); 
      closeModal(); 
    },
    onError: () => toast.error('Gagal menambahkan event'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof eventSchema> }) => kurikulumApi.updateKalender(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] }); 
      qc.invalidateQueries({ queryKey: ['kalender-stats'] }); 
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      toast.success('Event berhasil diperbarui'); 
      closeModal(); 
    },
    onError: () => toast.error('Gagal memperbarui event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteKalender(id),
    onSuccess: (_, id: string) => {
      qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
      qc.invalidateQueries({ queryKey: ['kalender-stats'] });
      qc.invalidateQueries({ queryKey: ['attendance-config'] });
      qc.invalidateQueries({ queryKey: ['academic-stats'] });
      setSelectedIds(prev => prev.filter(x => x !== id));
      toast.success('Event dihapus');
    },
    onError: () => toast.error('Gagal menghapus event'),
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

  // Auto-seed typical Indonesian holidays
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
      link.setAttribute('download', 'kalender-akademik.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('File kalender (.ics) berhasil diunduh!', { id: 'ical-export' });
    } catch (err: unknown) {
      console.error('Failed to export iCal:', err);
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

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.length === events.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(events?.map(ev => ev.id) ?? []);
    }
  }, [events, selectedIds]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleDelete = useCallback((ev: CalendarEvent) => {
    confirm({
      title: 'Hapus Event',
      message: `Apakah Anda yakin ingin menghapus event "${ev.judul}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal'
    }).then(ok => {
      if (ok) deleteMutation.mutate(ev.id);
    });
  }, [confirm, deleteMutation]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openCreateModal = useCallback(() => {
    setEditTarget(null);
    setDefaultDateValue('');
    setModalOpen(true);
  }, []);

  const openCreateModalWithDate = useCallback((day: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateFormatted = `${calYear}-${mm}-${dd}`;

    setEditTarget(null);
    setDefaultDateValue(dateFormatted);
    setModalOpen(true);
  }, [calYear, calMonth]);

  const openEditModal = useCallback((ev: CalendarEvent) => {
    setEditTarget(ev);
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

  // ─── Calendar ─────────────────────────────────────────────────────────────
  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const eventsInMonth = useMemo(() => events?.filter(ev => {
    const mulaiStr = formatDateToYYYYMMDD(ev.tanggal_mulai);
    const selesaiStr = formatDateToYYYYMMDD(ev.tanggal_selesai);
    const firstOfMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const lastOfMonth = new Date(calYear, calMonth + 1, 0);
    const lastOfMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastOfMonth.getDate()).padStart(2, '0')}`;
    return mulaiStr <= lastOfMonthStr && selesaiStr >= firstOfMonthStr;
  }) ?? [], [events, calYear, calMonth]);

  const getDayEvents = useCallback((day: number | null) => {
    if (!day) return [];
    const date = new Date(calYear, calMonth, day);
    return eventsInMonth.filter(ev =>
      dateInRange(date, ev.tanggal_mulai, ev.tanggal_selesai)
    );
  }, [calYear, calMonth, eventsInMonth]);


  const renderDayTooltip = (dayEvs: CalendarEvent[]) => {
    return (
      <div className="flex flex-col gap-2 p-1 max-w-[260px] max-w-full">
        {dayEvs?.map(ev => {
          const j = getJenisOption(ev.jenis);
          return (
            <div key={ev.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-1.5 last:pb-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("w-1.5 h-1.5 rounded-full", j.dotColorClass)} />
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 leading-tight">{ev.judul}</span>
              </div>
              <span 
                className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", j.bgColorClass, j.textColorClass)}
              >
                {j.label}
              </span>
              {ev.keterangan && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic leading-normal">
                  "{ev.keterangan}"
                </p>
              )}
              <div className="text-[8px] text-slate-400 dark:text-slate-500 mt-1 flex justify-between gap-2">
                <span>Pembuat: {ev.CreatedBy?.full_name || 'System'}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Kalender Akademik"
      description="Rencanakan minggu efektif, jadwal ujian, libur, dan kegiatan sekolah."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
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
                Auto-Seed Hari Libur
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
      {/* ─── Filter ─────────────────────────────────────────────────── */}
      <SectionCard title="Filter Tampilan">
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

      {/* ─── Legenda Warna ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 mb-6 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm">
        <span className="font-bold text-slate-700 dark:text-slate-300 mr-1 uppercase text-[10px] tracking-wider flex items-center gap-1">
          <Info size={13} className="text-indigo-500" /> Keterangan Warna:
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>Libur Nasional</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Libur Sekolah</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Ujian (STS / SAS)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Kegiatan Sekolah</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-semibold">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>Libur Rutin Mingguan</span>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      {statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Event', value: statsData.total_events, icon: <Flag size={15} />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50' },
            { label: 'Hari Libur', value: statsData.hari_libur, icon: <AlertCircle size={15} />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' },
            { label: 'Hari Ujian', value: statsData.hari_ujian, icon: <BookOpen size={15} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' },
            { label: 'Hari Kegiatan', value: statsData.hari_kegiatan, icon: <Calendar size={15} />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
            { 
              label: 'Minggu Efektif', 
              value: statsData.calculated_minggu_efektif !== undefined ? statsData.calculated_minggu_efektif : statsData.minggu_efektif, 
              icon: <Clock size={15} />, 
              color: 'text-amber-600 dark:text-amber-400', 
              bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
              subtitle: statsData.calculated_minggu_efektif_s1 !== undefined && statsData.calculated_minggu_efektif_s2 !== undefined
                ? `S1: ${statsData.calculated_minggu_efektif_s1} | S2: ${statsData.calculated_minggu_efektif_s2}`
                : undefined
            },
          ]?.map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</span>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${s.bg} ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {s.value}
                </div>
                {s.subtitle && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                    {s.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Shared Calendar Grid ───────────────────────────────────────── */}
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
        className="mb-6"
      />

      {/* ─── Event list ─────────────────────────────────────────────── */}
      <Suspense fallback={<div>Memuat daftar event...</div>}>
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

      {/* ─── Modal Form ─────────────────────────────────────────────── */}
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
    </AcademicPageLayout>
  );
}
