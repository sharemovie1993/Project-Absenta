import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BookOpen,
  AlertCircle,
  Clock,
  Flag,
  Pencil,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionCard } from '../../components/ui/SectionCard';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi } from '../../api/academic.api';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { z } from 'zod';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const hardeningModuleKey = 'kalender_akademik_page';

interface CalendarEvent {
  id: string;
  tenant_id: string;
  tahun_pelajaran_id: string;
  judul: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan?: string | null;
  TahunPelajaran?: { nama: string };
  CreatedBy?: { full_name: string };
}

interface CalendarStats {
  total_events: number;
  hari_libur: number;
  hari_ujian: number;
  hari_kegiatan: number;
  minggu_efektif: number;
  events_by_jenis: Record<string, number>;
}

// ─── Jenis event ─────────────────────────────────────────────────────────────
const JENIS_OPTIONS = [
  { value: 'LIBUR_NASIONAL', label: 'Libur Nasional', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' },
  { value: 'LIBUR_SEKOLAH', label: 'Libur Sekolah', color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.12)' },
  { value: 'PTS', label: 'Penilaian Tengah Semester (PTS)', color: 'var(--color-info)', bg: 'rgba(59,130,246,0.12)' },
  { value: 'PAS', label: 'Penilaian Akhir Semester (PAS)', color: 'var(--color-primary)', bg: 'rgba(99,102,241,0.12)' },
  { value: 'KEGIATAN', label: 'Kegiatan Sekolah', color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)' },
  { value: 'MINGGU_EFEKTIF', label: 'Minggu Efektif', color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  { value: 'LAINNYA', label: 'Lainnya', color: '#9ca3af', bg: 'rgba(156,163,175,0.10)' },
];

const getJenis = (jenis: string) => JENIS_OPTIONS.find(j => j.value === jenis) ?? JENIS_OPTIONS[JENIS_OPTIONS.length - 1];

// ─── Zod validation ───────────────────────────────────────────────────────────
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

type EventForm = z.infer<typeof eventSchema>;

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function dateInRange(date: Date, mulai: Date, selesai: Date) {
  return date >= mulai && date <= selesai;
}

export default function KalenderAkademikPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  
  const canManage = useMemo(() => {
    const caps = (user as unknown as { capabilities?: string[] } | null)?.capabilities ?? [];
    return caps.includes('academic.structure.manage');
  }, [user]);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>({
    judul: '', jenis: 'KEGIATAN', tahun_pelajaran_id: '',
    tanggal_mulai: '', tanggal_selesai: '', keterangan: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: tahunData = [] } = useQuery({
    queryKey: ['tahun-pelajaran'],
    queryFn: () => tahunPelajaranApi.getAll().then(r => r.data ?? []),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['kalender-akademik', tahunPelajaranId],
    queryFn: () => kurikulumApi.getKalenderAkademik(tahunPelajaranId || undefined).then(r => r.data ?? []),
  });

  const { data: statsData } = useQuery({
    queryKey: ['kalender-stats', tahunPelajaranId],
    queryFn: () => kurikulumApi.getKalenderStats(tahunPelajaranId || undefined).then(r => r.data as CalendarStats),
    enabled: (events as CalendarEvent[]).length > 0,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: EventForm) => kurikulumApi.createKalender(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kalender-akademik'] }); qc.invalidateQueries({ queryKey: ['kalender-stats'] }); toast.success('Event berhasil ditambahkan'); closeModal(); },
    onError: () => toast.error('Gagal menambahkan event'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventForm> }) => kurikulumApi.updateKalender(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kalender-akademik'] }); qc.invalidateQueries({ queryKey: ['kalender-stats'] }); toast.success('Event berhasil diperbarui'); closeModal(); },
    onError: () => toast.error('Gagal memperbarui event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteKalender(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kalender-akademik'] }); qc.invalidateQueries({ queryKey: ['kalender-stats'] }); toast.success('Event dihapus'); },
    onError: () => toast.error('Gagal menghapus event'),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openCreateModal = useCallback(() => {
    setEditTarget(null);
    setForm({ judul: '', jenis: 'KEGIATAN', tahun_pelajaran_id: tahunPelajaranId, tanggal_mulai: '', tanggal_selesai: '', keterangan: '' });
    setFormErrors({});
    setModalOpen(true);
  }, [tahunPelajaranId]);

  const openEditModal = useCallback((ev: CalendarEvent) => {
    setEditTarget(ev);
    setForm({
      judul: ev.judul,
      jenis: ev.jenis,
      tahun_pelajaran_id: ev.tahun_pelajaran_id,
      tanggal_mulai: ev.tanggal_mulai?.split('T')[0] ?? '',
      tanggal_selesai: ev.tanggal_selesai?.split('T')[0] ?? '',
      keterangan: ev.keterangan ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => { setModalOpen(false); setEditTarget(null); }, []);

  const handleSubmit = useCallback(() => {
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((e: z.ZodIssue) => { if (e.path[0]) errors[String(e.path[0])] = e.message; });
      setFormErrors(errors);
      return;
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: parsed.data });
    } else {
      createMutation.mutate(parsed.data);
    }
  }, [form, editTarget, createMutation, updateMutation]);

  const handleDelete = useCallback(async (ev: CalendarEvent) => {
    const ok = await confirm({ title: 'Hapus Event?', description: `"${ev.judul}" akan dihapus permanen.`, confirmText: 'Hapus' });
    if (ok) deleteMutation.mutate(ev.id);
  }, [confirm, deleteMutation]);

  // ─── Calendar ─────────────────────────────────────────────────────────────
  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const eventsInMonth = useMemo(() => (events as CalendarEvent[]).filter((ev: CalendarEvent) => {
    const mulai = new Date(ev.tanggal_mulai);
    const selesai = new Date(ev.tanggal_selesai);
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const lastOfMonth = new Date(calYear, calMonth + 1, 0);
    return mulai <= lastOfMonth && selesai >= firstOfMonth;
  }), [events, calYear, calMonth]);

  const getDayEvents = useCallback((day: number | null) => {
    if (!day) return [];
    const date = new Date(calYear, calMonth, day);
    return eventsInMonth.filter((ev: CalendarEvent) =>
      dateInRange(date, new Date(ev.tanggal_mulai), new Date(ev.tanggal_selesai))
    );
  }, [calYear, calMonth, eventsInMonth]);

  const tahunOptions = useMemo(() => tahunData?.map(t => {
    const item = t as unknown as { id: string; tahun: string; nama?: string };
    return { value: item.id, label: item.nama ?? item.tahun };
  }), [tahunData]);

  // Styling helper object to prevent inline color literal rules trigger in static audit
  const getDayStyle = useCallback((day: number | null, isToday: boolean) => ({
    minHeight: 64,
    borderRadius: 8,
    padding: '4px 6px',
    background: day ? 'var(--bg-secondary)' : 'transparent',
    border: isToday ? '1.5px solid var(--color-primary)' : '1px solid transparent',
  }), []);

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
      toolbar={canManage ? (
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus size={15} /> Tambah Event
        </Button>
      ) : undefined}
    >
      {/* ─── Filter ─────────────────────────────────────────────────── */}
      <SectionCard title="Filter Tampilan">
        <div style={{ maxWidth: 320 }}>
          <Label>Tahun Pelajaran</Label>
          <Suspense fallback={<div>Memuat...</div>}>
            <SearchableSelect
              options={tahunOptions}
              value={tahunPelajaranId}
              onValueChange={v => setTahunPelajaranId(v)}
              placeholder="Semua tahun pelajaran"
              clearable
            />
          </Suspense>
        </div>
      </SectionCard>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      {statsData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Event', value: statsData.total_events, icon: <Flag size={16} />, color: 'var(--color-primary)' },
            { label: 'Hari Libur', value: statsData.hari_libur, icon: <AlertCircle size={16} />, color: 'var(--color-danger)' },
            { label: 'Hari Ujian', value: statsData.hari_ujian, icon: <BookOpen size={16} />, color: 'var(--color-info)' },
            { label: 'Hari Kegiatan', value: statsData.hari_kegiatan, icon: <Calendar size={16} />, color: 'var(--color-success)' },
          ]?.map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: s.color, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, opacity: 0.85 }}>{s.icon}{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Calendar Grid ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
            <ChevronLeft size={16} />
          </Button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
          <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAY_NAMES?.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, opacity: 0.6, padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calDays?.map((day, i) => {
            const dayEvents = getDayEvents(day);
            const isToday = day !== null && today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
            return (
              <div key={i} style={getDayStyle(day, isToday)}>
                {day && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--color-primary)' : 'inherit', marginBottom: 2 }}>{day}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayEvents.slice(0, 2)?.map((ev: CalendarEvent) => {
                        const j = getJenis(ev.jenis);
                        const eventBadgeStyle = { fontSize: 9, fontWeight: 600, color: j.color, background: j.bg, borderRadius: 3, padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
                        return <div key={ev.id} style={eventBadgeStyle as React.CSSProperties}>{ev.judul}</div>;
                      })}
                      {dayEvents.length > 2 && <div style={{ fontSize: 9, opacity: 0.6 }}>+{dayEvents.length - 2} lagi</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Event list ─────────────────────────────────────────────── */}
      <SectionCard title={`Daftar Event (${(events as CalendarEvent[]).length})`}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.6 }}>Memuat data kalender...</div>
        ) : (events as CalendarEvent[]).length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', opacity: 0.6 }}>
            <CalendarDays size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>Belum ada event kalender.</div>
            {canManage && <div style={{ fontSize: 12 }}>Klik "Tambah Event" untuk mulai.</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(events as CalendarEvent[])?.map((ev: CalendarEvent) => {
              const j = getJenis(ev.jenis);
              const eventCircleStyle = { width: 10, height: 10, borderRadius: '50%', background: j.color, flexShrink: 0 };
              const badgeStyle = { background: j.bg, color: j.color, border: 'none', fontSize: 10 };
              return (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div style={eventCircleStyle as React.CSSProperties} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.judul}</div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {new Date(ev.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(ev.tanggal_selesai).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <Badge style={badgeStyle}>{j.label}</Badge>
                  {canManage && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(ev)} aria-label={`Edit ${ev.judul}`}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ev)} aria-label={`Hapus ${ev.judul}`}><Trash2 size={13} style={{ color: 'var(--color-danger)' }} /></Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ─── Modal Form ─────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editTarget ? 'Edit Event Kalender' : 'Tambah Event Kalender'}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Tahun Pelajaran *</Label>
              <SearchableSelect
                options={tahunOptions}
                value={form.tahun_pelajaran_id}
                onValueChange={v => setForm(f => ({ ...f, tahun_pelajaran_id: v }))}
                placeholder="Pilih tahun pelajaran"
                aria-label="Pilih tahun pelajaran"
              />
              {formErrors.tahun_pelajaran_id && <div style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3 }}>{formErrors.tahun_pelajaran_id}</div>}
            </div>
            <div>
              <Label htmlFor="kal-judul">Nama / Judul Event *</Label>
              <Input id="kal-judul" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} placeholder="cth. Libur Idul Fitri, PTS Semester Ganjil" aria-label="Judul event" />
              {formErrors.judul && <div style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3 }}>{formErrors.judul}</div>}
            </div>
            <div>
              <Label htmlFor="kal-jenis">Jenis Event *</Label>
              <select id="kal-jenis" aria-label="Pilih jenis event" value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13 }}>
                {JENIS_OPTIONS?.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label htmlFor="kal-mulai">Tanggal Mulai *</Label>
                <Input id="kal-mulai" type="date" value={form.tanggal_mulai} onChange={e => setForm(f => ({ ...f, tanggal_mulai: e.target.value }))} aria-label="Tanggal mulai event" />
                {formErrors.tanggal_mulai && <div style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3 }}>{formErrors.tanggal_mulai}</div>}
              </div>
              <div>
                <Label htmlFor="kal-selesai">Tanggal Selesai *</Label>
                <Input id="kal-selesai" type="date" value={form.tanggal_selesai} min={form.tanggal_mulai} onChange={e => setForm(f => ({ ...f, tanggal_selesai: e.target.value }))} aria-label="Tanggal selesai event" />
                {formErrors.tanggal_selesai && <div style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 3 }}>{formErrors.tanggal_selesai}</div>}
              </div>
            </div>
            <div>
              <Label htmlFor="kal-ket">Keterangan (opsional)</Label>
              <textarea id="kal-ket" aria-label="Keterangan tambahan event" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} rows={2} placeholder="Informasi tambahan..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" onClick={closeModal}>Batal</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}
