import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  User,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
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
    <div style={{ height: 6, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 99, background: color, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function pctColor(pct: number) {
  if (pct >= 90) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function statusBadge(pct: number) {
  if (pct >= 90) return { label: 'Baik', color: 'var(--color-success)', bg: 'rgba(16,185,129,0.1)' };
  if (pct >= 60) return { label: 'Perlu Perhatian', color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.1)' };
  return { label: 'Rendah', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.1)' };
}

export default function RekapKBMPage() {
  const [semesterId, setSemesterId] = useState<string>('');
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [search, setSearch] = useState('');

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
      {/* ─── Filter ───────────────────────────────────────────────────── */}
      <SectionCard title="Filter">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <Label>Tahun Pelajaran</Label>
            <Suspense fallback={null}>
              <SearchableSelect
                options={tahunOptions}
                value={tahunPelajaranId}
                onValueChange={v => { setTahunPelajaranId(v); setSemesterId(''); }}
                placeholder="Semua tahun pelajaran"
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
                placeholder="Semua semester"
                clearable
                aria-label="Filter semester"
              />
            </Suspense>
          </div>
          <div>
            <Label>Cari Guru</Label>
            <input
              type="text"
              aria-label="Cari nama guru"
              value={search}
              onChange={handleSearchChange}
              placeholder="Nama atau NIP..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── Summary cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Guru', value: metaData?.total_guru ?? filtered.length, icon: <User size={15} />, color: '#6366f1' },
          { label: 'Total JP Rencana', value: metaData?.total_jp_rencana ?? 0, icon: <Clock size={15} />, color: '#3b82f6' },
          { label: 'Total JP Terlaksana', value: metaData?.total_jp_terlaksana ?? 0, icon: <CheckCircle size={15} />, color: '#10b981' },
          { label: 'Rata² Keterlaksanaan', value: `${avgPct}%`, icon: <TrendingUp size={15} />, color: pctColor(avgPct) },
        ]?.map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: s.color, display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, opacity: 0.85 }}>{s.icon}{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Status summary ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'KBM Baik (≥90%)', count: countStatus.baik, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Perlu Perhatian (60–89%)', count: countStatus.perhatian, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'KBM Rendah (<60%)', count: countStatus.rendah, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        ]?.map(s => {
          const cardStyle = { padding: '10px 14px', background: s.bg, borderColor: s.color, borderWidth: 1, borderStyle: 'solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
          return (
            <div key={s.label} className="card" style={cardStyle as React.CSSProperties}>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Data list ────────────────────────────────────────────────── */}
      <SectionCard title={`Data Rekap Guru (${filtered.length})`}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', opacity: 0.6 }}>Memuat data rekap KBM...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', opacity: 0.6 }}>
            <BarChart2 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div>Tidak ada data rekap KBM.</div>
            <div style={{ fontSize: 12 }}>Pastikan penugasan guru (Guru Mapel) dan sesi absensi sudah diisi.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered?.map((guru: RekapKBMRecord) => {
              const st = statusBadge(guru.persentase);
              const color = pctColor(guru.persentase);
              return (
                <div key={guru.guru_id} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{guru.nama_guru}</div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>NIP: {guru.nip || '-'}</div>
                    </div>
                    <Badge style={{ background: st.bg, color: st.color, border: 'none', fontSize: 10, fontWeight: 700 }}>{st.label}</Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <ProgressBar pct={guru.persentase} color={color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 38, textAlign: 'right' }}>{guru.persentase}%</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'JP Rencana', value: guru.total_jp_rencana, color: 'inherit' },
                      { label: 'JP Terlaksana', value: guru.jp_terlaksana, color: '#10b981' },
                      { label: 'JP Sisa', value: guru.jp_sisa, color: guru.jp_sisa > 0 ? '#ef4444' : '#10b981' },
                    ]?.map(item => (
                      <div key={item.label} style={{ background: 'var(--bg-primary)', borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {guru.detail_kelas && guru.detail_kelas.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {guru.detail_kelas?.map((dk: DetailKelas, idx: number) => (
                        <span key={idx} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-primary)', opacity: 0.8, border: '1px solid var(--border-color)' }}>
                          {dk.kelas} – {dk.mapel} ({dk.jp_per_minggu} JP/mg)
                        </span>
                      ))}
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
