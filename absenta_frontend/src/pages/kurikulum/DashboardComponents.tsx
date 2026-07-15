import React from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie } from 'recharts';
import { cn } from '@/lib/utils';

/* ── Core Logic Helpers ── */
export const safeArr = <T = unknown>(v: unknown): T[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v as T[];
  const o = v as { data?: unknown };
  if (Array.isArray(o?.data)) return o.data as T[];
  const od = o?.data as { data?: unknown; list?: unknown };
  if (Array.isArray(od?.data)) return od.data as T[];
  if (Array.isArray(od?.list)) return od.list as T[];
  return [];
};


export const safeTotal = (v: unknown): number => {
  if (!v) return 0;
  const o = v as { total?: unknown; pagination?: { total?: unknown }; data?: { total?: unknown; pagination?: { total?: unknown }; data?: unknown; list?: unknown } };
  if (typeof o?.total === 'number') return o.total;
  if (typeof o?.pagination?.total === 'number') return o.pagination.total;
  if (typeof o?.data?.total === 'number') return o.data.total;
  if (typeof o?.data?.pagination?.total === 'number') return o.data.pagination.total;
  if (Array.isArray(o?.data?.data)) return o.data.data.length;
  if (Array.isArray(o?.data?.list)) return o.data.list.length;
  if (Array.isArray(o?.data)) return o.data.length;
  if (Array.isArray(v)) return v.length;
  return 0;
};

export const getKelompokLabel = (kel: string | undefined, options: { value: string; label: string }[]) => {
  if (!kel) return 'MAPEL UMUM';
  const kUpper = kel.toUpperCase();
  const matched = options.find(opt => 
    opt.value.toUpperCase() === kUpper || 
    (kUpper === 'NASIONAL' && opt.value === 'MATA PELAJARAN UMUM') ||
    (kUpper === 'UMUM' && opt.value === 'MATA PELAJARAN UMUM') ||
    (kUpper === 'LOKAL' && opt.value === 'MUATAN LOKAL') ||
    (kUpper === 'MUATAN_LOKAL' && opt.value === 'MUATAN LOKAL') ||
    (kUpper === 'KEJURUAN' && opt.value === 'MATA PELAJARAN KEJURUAN') ||
    (kUpper === 'PILIHAN' && opt.value === 'MATA PELAJARAN PILIHAN')
  );
  return matched ? matched.label : kel;
};

export interface RowItem {
  Jurusan?: { nama?: string };
  kelompok?: string;
  jp_per_minggu?: number;
  tingkat?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export function buildDistribusi(rows: RowItem[], options: SelectOption[], isVocational: boolean) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    let key = 'MAPEL UMUM';
    if (isVocational) {
      key = r.Jurusan?.nama || 'Umum';
    } else {
      key = `Kelas ${r.tingkat}`;
    }
    map[key] = (map[key] || 0) + (r.jp_per_minggu || 0);
  }
  return Object.entries(map)?.map(([name, jp]) => ({ name, jp })).sort((a, b) => {
    if (!isVocational) {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
      const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
      return numA - numB;
    }
    return b[1] - a[1];
  });
}

export function buildBeban(rows: RowItem[], options: SelectOption[]) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = getKelompokLabel(r.kelompok, options);
    map[key] = (map[key] || 0) + (r.jp_per_minggu || 0);
  }
  return Object.entries(map)?.map(([nama, jp]) => ({ nama, jp })).sort((a, b) => b.jp - a.jp);
}

export const PALETTE = ['#0f766e','#0284c7','#7c3aed','#d97706','#be123c','#0369a1','#059669','#9333ea'];

export const STATUS_COLORS: Record<string, string> = {
  SELESAI: '#10b981', 
  TERJADWAL: '#f59e0b', 
  BELUM: '#cbd5e1',
};

export function EmptyState({ text, small }: { text: string; small?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center gap-2', small ? 'py-4' : 'h-full min-h-[160px]')}>
      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <ClipboardList size={15} className="text-slate-400" />
      </div>
      <p className="text-xs text-slate-400 italic">{text}</p>
    </div>
  );
}

export function DistribusiChart({ data, loading }: { data: { name: string; jp: number }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-full flex items-end gap-3 animate-pulse px-2">
        {[...Array(5)]?.map((_, i) => (
          <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg" style={{ height: `${30 + i * 14}%` }} />
        ))}
      </div>
    );
  }
  if (data.length === 0) return <EmptyState text="Belum ada data struktur kurikulum" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          formatter={(v: number) => [`${v} JP/minggu`, 'Total JP']}
        />
        <Bar dataKey="jp" radius={[5, 5, 0, 0]} maxBarSize={44}>
          {data?.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

export interface SupervisiRecentItem {
  status?: string;
  Guru?: { nama_guru?: string };
  mapel?: string;
  tanggal: string;
}

export function SupervisiPanel({
  pct, pieData, selesai, terjadwal, belum, total, recent, loading,
}: {
  pct: number;
  pieData: PieDataItem[];
  selesai: number;
  terjadwal: number;
  belum: number;
  total: number;
  recent: SupervisiRecentItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-center"><div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
        {[0,1,2]?.map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
      </div>
    );
  }

  const formatTgl = (s: string) => {
    try { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); } catch { return s; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData.length ? pieData : [{ name: 'Kosong', value: 1, color: '#e2e8f0' }]}
                cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3}
                dataKey="value" strokeWidth={0}>
                {(pieData.length ? pieData : [{ color: '#e2e8f0' }])?.map((e: { color?: string }, i: number) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-black text-slate-800 dark:text-slate-100">{pct}%</span>
            <span className="text-[8px] text-slate-400 uppercase font-black">Selesai</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            { label: 'Selesai', val: selesai, dot: 'bg-emerald-500' },
            { label: 'Terjadwal', val: terjadwal, dot: 'bg-amber-400' },
            { label: 'Belum', val: belum, dot: 'bg-slate-300 dark:bg-slate-600' },
          ]?.map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', row.dot)} />
              <span className="text-[10px] text-slate-500">{row.label}</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 ml-auto">{row.val}</span>
            </div>
          ))}
          <p className="text-[9px] text-slate-400 font-black uppercase pt-1">Total: {total} supervisi</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {recent.length === 0 && <EmptyState text="Belum ada data supervisi" small />}
        {recent?.map((item, i) => {
          const st = item.status?.toUpperCase();
          return (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  {item.Guru?.nama_guru ?? '—'}
                </p>
                <p className="text-[9px] text-slate-400">{item.mapel} · {formatTgl(item.tanggal)}</p>
              </div>
              <span className={cn(
                'ml-2 flex-shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full',
                (st === 'COMPLETED' || st === 'SELESAI') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                (st === 'SCHEDULED' || st === 'TERJADWAL') ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                'bg-slate-100 text-slate-500'
              )}>
                {(st === 'COMPLETED' || st === 'SELESAI') ? 'Selesai' : (st === 'SCHEDULED' || st === 'TERJADWAL') ? 'Antrean' : 'Belum'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface PerangkatStatsItem {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  pctCompleteness: number;
  uniqueApprovedTeachersCount: number;
}

export interface PerangkatRecentItem {
  id: string;
  judul: string;
  jenis: string;
  status: string;
  Guru?: { nama_guru: string };
  Mapel?: { nama_mapel: string };
}

export function PerangkatPanel({
  stats, recent, loading, teachersCount
}: {
  stats: PerangkatStatsItem;
  recent: PerangkatRecentItem[];
  loading: boolean;
  teachersCount: number;
}) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-center"><div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
        {[0,1,2]?.map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
      </div>
    );
  }

  const PIE_COLORS = {
    APPROVED: '#10b981',
    PENDING: '#f59e0b',
    REJECTED: '#ef4444'
  };

  const pieData = [
    { name: 'Disetujui', value: stats.approved, color: PIE_COLORS.APPROVED },
    { name: 'Review', value: stats.pending, color: PIE_COLORS.PENDING },
    { name: 'Ditolak', value: stats.rejected, color: PIE_COLORS.REJECTED },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData.length ? pieData : [{ name: 'Kosong', value: 1, color: '#e2e8f0' }]}
                cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3}
                dataKey="value" strokeWidth={0}>
                {(pieData.length ? pieData : [{ color: '#e2e8f0' }])?.map((e: { color?: string }, i: number) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{stats.pctCompleteness}%</span>
            <span className="text-[7px] text-slate-400 uppercase font-black">Guru Lengkap</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            { label: 'Disetujui', val: stats.approved, dot: 'bg-emerald-500' },
            { label: 'Review', val: stats.pending, dot: 'bg-amber-400' },
            { label: 'Ditolak', val: stats.rejected, dot: 'bg-rose-500' },
          ]?.map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', row.dot)} />
              <span className="text-[10px] text-slate-500">{row.label}</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 ml-auto">{row.val}</span>
            </div>
          ))}
          <p className="text-[9px] text-slate-400 font-black uppercase pt-1">
            Kepatuhan: {stats.uniqueApprovedTeachersCount}/{teachersCount} Guru
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {recent.length === 0 && <EmptyState text="Belum ada perangkat ajar" small />}
        {recent?.map((item, i) => {
          const st = item.status?.toUpperCase();
          return (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  {item.judul}
                </p>
                <p className="text-[9px] text-slate-400">
                  {item.Guru?.nama_guru ?? '—'} · {item.jenis}
                </p>
              </div>
              <span className={cn(
                'ml-2 flex-shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full',
                st === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                st === 'PENDING' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                st === 'REJECTED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' :
                'bg-slate-100 text-slate-500'
              )}>
                {st === 'APPROVED' ? 'Disetujui' : st === 'PENDING' ? 'Review' : st === 'REJECTED' ? 'Ditolak' : 'Proses'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ConflictResult {
  type: 'GURU' | 'KELAS';
  message: string;
  hari: string;
  waktu: string;
  target: string;
}

export interface JadwalEntry {
  guru_id?: string;
  kelas_id?: string;
  hari?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  id?: string;
  Guru?: { 
    nama_guru?: string;
    User?: { full_name?: string };
  };
  Kelas?: { nama_kelas?: string };
  Mapel?: { nama_mapel?: string };
  [key: string]: unknown;
}

export function detectConflicts(jadwalList: JadwalEntry[]): ConflictResult[] {
  if (jadwalList.length === 0) return [];

  const foundConflicts: ConflictResult[] = [];

  const toMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':')?.map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const isOverlap = (startA: string, endA: string, startB: string, endB: string) => {
    const aStart = toMinutes(startA);
    const aEnd = toMinutes(endA);
    const bStart = toMinutes(startB);
    const bEnd = toMinutes(endB);
    return aStart < bEnd && bStart < aEnd;
  };

  for (let i = 0; i < jadwalList.length; i++) {
    const a = jadwalList[i];
    if (!a.guru_id || !a.hari || !a.jam_mulai || !a.jam_selesai) continue;

    for (let j = i + 1; j < jadwalList.length; j++) {
      const b = jadwalList[j];
      if (!b.guru_id || !b.hari || !b.jam_mulai || !b.jam_selesai) continue;

      if (a.hari === b.hari && a.guru_id === b.guru_id && a.id !== b.id) {
        if (isOverlap(a.jam_mulai, a.jam_selesai, b.jam_mulai, b.jam_selesai)) {
          const teacherName = a.Guru?.User?.full_name || 'Guru';
          const classA = a.Kelas?.nama_kelas || 'Kelas A';
          const classB = b.Kelas?.nama_kelas || 'Kelas B';
          foundConflicts.push({
            type: 'GURU',
            hari: a.hari,
            waktu: `${a.jam_mulai}-${a.jam_selesai} vs ${b.jam_mulai}-${b.jam_selesai}`,
            target: teacherName,
            message: `${teacherName} bentrok mengajar di kelas ${classA} dan ${classB} pada hari ${a.hari} jam ${a.jam_mulai} - ${a.jam_selesai}.`
          });
        }
      }
    }
  }

  for (let i = 0; i < jadwalList.length; i++) {
    const a = jadwalList[i];
    if (!a.kelas_id || !a.hari || !a.jam_mulai || !a.jam_selesai) continue;

    for (let j = i + 1; j < jadwalList.length; j++) {
      const b = jadwalList[j];
      if (!b.kelas_id || !b.hari || !b.jam_mulai || !b.jam_selesai) continue;

      if (a.hari === b.hari && a.kelas_id === b.kelas_id && a.id !== b.id) {
        if (isOverlap(a.jam_mulai, a.jam_selesai, b.jam_mulai, b.jam_selesai)) {
          const className = a.Kelas?.nama_kelas || 'Kelas';
          const mapelA = a.Mapel?.nama_mapel || 'Mapel A';
          const mapelB = b.Mapel?.nama_mapel || 'Mapel B';
          foundConflicts.push({
            type: 'KELAS',
            hari: a.hari,
            waktu: `${a.jam_mulai}-${a.jam_selesai} vs ${b.jam_mulai}-${b.jam_selesai}`,
            target: className,
            message: `Kelas ${className} bentrok antara pelajaran ${mapelA} dan ${mapelB} pada hari ${a.hari} jam ${a.jam_mulai} - ${a.jam_selesai}.`
          });
        }
      }
    }
  }

  return foundConflicts;
}
