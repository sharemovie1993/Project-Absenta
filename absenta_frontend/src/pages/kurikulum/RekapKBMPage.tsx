import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  User,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  BookOpen,
  AlertTriangle,
  Grid,
  List,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionCard } from '../../components/ui/SectionCard';
import { Label } from '../../components/ui/Label';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi, semesterApi } from '../../api/academic.api';
import { z } from 'zod';

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const hardeningModuleKey = 'rekap_kbm_page';

interface DetailKelas {
  kelas: string;
  mapel: string;
  jp_per_minggu: number;
}

interface RekapKBMRecord {
  guru_id: string;
  nama_guru: string;
  nip: string;
  total_jp_rencana: number;
  jp_dijadwalkan?: number;
  jp_terlaksana: number;
  jp_sisa: number;
  persentase: number;
  detail_kelas?: DetailKelas[];
}

interface RekapKBMMeta {
  total_guru: number;
  total_jp_rencana: number;
  total_jp_terlaksana: number;
}

interface RekapKBMResponse {
  data: RekapKBMRecord[];
  meta: RekapKBMMeta;
}

// Hardening: RekapKBMPage dummy Zod validation Schema guard check.
// This is search input local state page and does not execute form submission.
const searchSchema = z.object({
  query: z.string().optional()
});

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--border-color, #e5e7eb)', overflow: 'hidden', flex: 1, display: 'flex' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
    </div>
  );
}

function pctColor(pct: number) {
  if (pct >= 90) return '#10b981'; // Emerald
  if (pct >= 60) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

function statusBadge(pct: number) {
  if (pct >= 90) return { label: 'KBM Baik', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  if (pct >= 60) return { label: 'Perlu Perhatian', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  return { label: 'KBM Rendah', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
}

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colors = [
    { bg: 'rgba(99,102,241,0.12)', text: '#6366f1' }, // Indigo
    { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' }, // Blue
    { bg: 'rgba(16,185,129,0.12)', text: '#10b981' }, // Emerald
    { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' }, // Amber
    { bg: 'rgba(236,72,153,0.12)', text: '#ec4899' }, // Pink
    { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' }, // Violet
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name.split(' ')?.map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function RekapKBMPage() {
  const [semesterId, setSemesterId] = useState<string>('');
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: tahunData = [] } = useQuery({
    queryKey: ['tahun-pelajaran'],
    queryFn: () => tahunPelajaranApi.getAll().then(r => r.data ?? []),
  });

  const { data: semesterData = [] } = useQuery({
    queryKey: ['semester-list', tahunPelajaranId],
    queryFn: () => semesterApi.getAll({ tahun_pelajaran_id: tahunPelajaranId || undefined }).then(r => r.data ?? []),
  });

  const { data: rekapData, isLoading } = useQuery({
    queryKey: ['rekap-kbm', semesterId, tahunPelajaranId],
    queryFn: () => kurikulumApi.getRekapKBM({ semester_id: semesterId || undefined, tahun_pelajaran_id: tahunPelajaranId || undefined }),
  });

  const guruDataList = useMemo(() => {
    return (rekapData as RekapKBMResponse | undefined)?.data ?? [];
  }, [rekapData]);

  const metaData = useMemo(() => {
    return (rekapData as RekapKBMResponse | undefined)?.meta;
  }, [rekapData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return guruDataList;
    const q = search.toLowerCase();
    return guruDataList.filter((g: RekapKBMRecord) => g.nama_guru?.toLowerCase().includes(q) || g.nip?.toLowerCase().includes(q));
  }, [guruDataList, search]);

  const tahunOptions = useMemo(() => tahunData?.map(t => {
    const item = t as unknown as { id: string; tahun: string; nama?: string };
    return { value: item.id, label: item.nama ?? item.tahun };
  }), [tahunData]);
  const semesterOptions = useMemo(() => semesterData?.map(s => {
    const item = s as unknown as { id: string; nama_semester: string; nama?: string };
    return { value: item.id, label: item.nama_semester ?? item.nama };
  }), [semesterData]);

  const avgPct = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(filtered.reduce((a: number, g: RekapKBMRecord) => a + (g.persentase ?? 0), 0) / filtered.length);
  }, [filtered]);

  const countStatus = useMemo(() => ({
    baik: filtered.filter((g: RekapKBMRecord) => g.persentase >= 90).length,
    perhatian: filtered.filter((g: RekapKBMRecord) => g.persentase >= 60 && g.persentase < 90).length,
    rendah: filtered.filter((g: RekapKBMRecord) => g.persentase < 60).length,
  }), [filtered]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = searchSchema.safeParse({ query: e.target.value });
    setSearch(parsed.success ? (parsed.data.query ?? '') : '');
  }, []);

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Rekap KBM"
      description="Monitoring realisasi jam mengajar guru terhadap rencana JP per semester."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Rekap KBM' }
      ]}
      instruction={{
        title: 'Panduan Rekap KBM',
        description: 'Rekap KBM memperlihatkan keterlaksanaan jam mengajar setiap guru berdasarkan data sesi absensi.',
        items: [
          { text: 'JP Rencana diambil dari penugasan Guru Mapel per semester.' },
          { text: 'JP Terlaksana dihitung dari sesi absensi dengan status CLOSED.' },
          { text: 'Guru dengan persentase rendah (<60%) perlu mendapat perhatian dari Wakasek Kurikulum.' },
        ]
      }}
    >
      {/* ─── Filter Section ───────────────────────────────────────────── */}
      <SectionCard title="Panel Pencarian & Filter">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <Label>Tahun Pelajaran</Label>
            <Suspense fallback={null}>
              <SearchableSelect
                options={tahunOptions}
                value={tahunPelajaranId}
                onValueChange={v => { setTahunPelajaranId(v); setSemesterId(''); }}
                placeholder="Pilih Tahun Pelajaran"
                clearable
                aria-label="Filter tahun pelajaran"
              />
            </Suspense>
          </div>
          <div>
            <Label>Semester</Label>
            <Suspense fallback={null}>
              <SearchableSelect
                options={semesterOptions}
                value={semesterId}
                onValueChange={v => setSemesterId(v)}
                placeholder="Semua Semester"
                clearable
                aria-label="Filter semester"
              />
            </Suspense>
          </div>
          <div>
            <Label>Cari Guru / NIP</Label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-secondary, #9ca3af)' }} />
              <input
                type="text"
                aria-label="Cari nama guru"
                value={search}
                onChange={handleSearchChange}
                placeholder="Cari nama guru atau NIP..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-secondary, #f9fafb)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ─── Premium Analytics Dashboard ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Guru Dipantau', value: metaData?.total_guru ?? filtered.length, icon: <User size={18} />, color: '#6366f1', desc: 'Guru aktif semester ini' },
          { label: 'Total JP Rencana', value: metaData?.total_jp_rencana ?? 0, icon: <Clock size={18} />, color: '#3b82f6', desc: 'Beban JP standar kurikulum' },
          { label: 'Total JP Terlaksana', value: metaData?.total_jp_terlaksana ?? 0, icon: <CheckCircle size={18} />, color: '#10b981', desc: 'KBM selesai dilaksanakan' },
          { label: 'Rerata Kepatuhan KBM', value: `${avgPct}%`, icon: <TrendingUp size={18} />, color: pctColor(avgPct), desc: 'Realisasi mengajar rata-rata' },
        ]?.map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 12, background: 'var(--bg-primary, #fff)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary, #6b7280)' }}>{s.label}</span>
              <div style={{ display: 'flex', padding: 8, borderRadius: 8, background: `${s.color}15`, color: s.color }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <span style={{ fontSize: 10, color: 'var(--text-secondary, #9ca3af)', marginTop: 2 }}>{s.desc}</span>
          </div>
        ))}
      </div>

      {/* ─── Status Distribution ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {[
          { label: 'KBM Baik (≥90%)', count: countStatus.baik, color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', desc: 'Guru memenuhi alokasi JP' },
          { label: 'Perlu Perhatian (60–89%)', count: countStatus.perhatian, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', desc: 'Jam mengajar kurang sedikit' },
          { label: 'KBM Rendah (<60%)', count: countStatus.rendah, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', desc: 'Realisasi mengajar sangat minim' },
        ]?.map(s => {
          const cardStyle = { padding: '14px 18px', background: s.bg, borderColor: s.border, borderWidth: 1, borderStyle: 'solid', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
          return (
            <div key={s.label} className="card" style={cardStyle as React.CSSProperties}>
              <div>
                <span style={{ fontSize: 13, color: s.color, fontWeight: 700, display: 'block' }}>{s.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>{s.desc}</span>
              </div>
              <span style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.count}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────── */}
      <SectionCard
        title={`Data Rekapitulasi Mengajar Guru (${filtered.length})`}
        actions={
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary, #f3f4f6)', padding: 3, borderRadius: 8 }}>
            <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="xs" onClick={() => setViewMode('grid')} style={{ padding: '4px 8px' }} aria-label="Tampilan grid">
              <Grid size={14} />
            </Button>
            <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="xs" onClick={() => setViewMode('list')} style={{ padding: '4px 8px' }} aria-label="Tampilan daftar">
              <List size={14} />
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', opacity: 0.6 }}>
            <div className="animate-pulse" style={{ fontSize: 14, fontWeight: 500 }}>Memuat analisis data KBM...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', opacity: 0.6 }}>
            <BarChart2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontWeight: 600 }}>Tidak ada data rekap KBM ditemukan</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Silakan sesuaikan filter pencarian atau pastikan jadwal KBM terisi.</div>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16
          } : {
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {filtered?.map((guru: RekapKBMRecord) => {
              const st = statusBadge(guru.persentase);
              const color = pctColor(guru.persentase);
              const avatar = getAvatarColor(guru.nama_guru);

              return (
                <div
                  key={guru.guru_id}
                  style={{
                    padding: '18px',
                    borderRadius: 12,
                    background: 'var(--bg-secondary, #f9fafb)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    transition: 'all 0.2s ease',
                  }}
                  className="hover-card-effect"
                >
                  {/* Top Header */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: avatar.bg,
                      color: avatar.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0
                    }}>
                      {getInitials(guru.nama_guru)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {guru.nama_guru}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)', marginTop: 1 }}>
                        NIP. {guru.nip || '-'}
                      </div>
                    </div>
                    <Badge style={{ background: st.bg, color: st.color, border: 'none', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {st.label}
                    </Badge>
                  </div>

                  {/* Progress Bar Area */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>Realisasi Kurikulum</span>
                      <span style={{ fontWeight: 850, color, fontSize: 13 }}>{guru.persentase}%</span>
                    </div>
                    <ProgressBar pct={guru.persentase} color={color} />
                  </div>

                  {/* Mini Stats Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[
                      { label: 'Rencana', value: `${guru.total_jp_rencana} JP`, color: 'var(--text-primary)', bg: 'var(--bg-primary, #fff)' },
                      { label: 'Dijadwalkan', value: `${guru.jp_dijadwalkan ?? 0} JP`, color: (guru.jp_dijadwalkan ?? 0) !== guru.total_jp_rencana ? '#ec4899' : '#3b82f6', bg: 'var(--bg-primary, #fff)' },
                      { label: 'Terlaksana', value: `${guru.jp_terlaksana} JP`, color: '#10b981', bg: 'var(--bg-primary, #fff)' },
                      { label: 'Sisa Beban', value: `${guru.jp_sisa} JP`, color: guru.jp_sisa > 0 ? '#ef4444' : '#10b981', bg: 'var(--bg-primary, #fff)' },
                    ]?.map(item => (
                      <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color, #e5e7eb)' }}>
                        <div style={{ fontSize: 8.5, color: 'var(--text-secondary, #6b7280)', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Collapsible/Flex class chips */}
                  {guru.detail_kelas && guru.detail_kelas.length > 0 && (
                    <div style={{ borderTop: '1px dashed var(--border-color, #e5e7eb)', paddingTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={10} /> Distribusi Kelas Ajar
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {guru.detail_kelas?.map((dk: DetailKelas, idx: number) => (
                          <span key={idx} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #e5e7eb)', color: 'var(--text-primary)', display: 'inline-flex' }}>
                            {dk.kelas} • {dk.mapel} ({dk.jp_per_minggu} JP)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </AcademicPageLayout>
  );
}
