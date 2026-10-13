import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Medal,
  Users,
  BarChart2,
  FileText,
  LayoutList,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  ExternalLink,
  RefreshCw,
  UserCheck,
  AlertCircle,
  BookOpen,
  Printer,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import {
  getKetarunaanGuardStatus,
  getKetarunaanPendamping,
  getKetarunaanStats,
  getKetarunaanLaporanTim,
  getKetarunaanLaporanKelas,
  getKetarunaanSesiHariIni,
  tapKetarunaanPendamping,
  type KetarunaanPendamping,
  type KetarunaanTrendItem,
} from '../../api/kesiswaan/programKetarunaan.api';

// Lazy-load berat
const TahunPelajaranSelect = lazy(() =>
  import('../../components/common/TahunPelajaranSelect').then(m => ({ default: m.TahunPelajaranSelect }))
);

// ─── Helper ────────────────────────────────────────────────────────────────────

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis',
  JUMAT: "Jum'at", SABTU: 'Sabtu', AHAD: 'Ahad', MINGGU: 'Minggu',
};

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

function formatTanggal(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function deltaIcon(v?: number) {
  if (!v) return <Minus className="w-3 h-3 text-slate-400" />;
  if (v > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  return <TrendingDown className="w-3 h-3 text-rose-500" />;
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN')  return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA')  return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum</Badge>;
}

function jabatanLabel(kode: string) {
  const map: Record<string, string> = {
    KETUA_PEMBINA_TARUNA: '🎖️ Ketua Pembina Taruna',
    KETARUNAAN_DOKUMEN: '📋 Bid. Dokumen',
    KETARUNAAN_KEDISIPLINAN: '⚖️ Bid. Kedisiplinan',
    KETARUNAAN_PENDIDIKAN: '🎓 Bid. Pendidikan',
    KETARUNAAN_ADM_OPERASI: '⚙️ Bid. Adm & Operasi',
    KETARUNAAN_KEBERSIHAN_KES: '🏥 Bid. Kebersihan',
    KAPROG: '🏛️ Kaprog',
    WALIKELAS: '🏫 Wali Kelas',
    GURU_MAPEL: '📚 Guru Mapel (Beririsan)',
    KEPALA_SEKOLAH: '👑 Kepala Sekolah',
    KESISWAAN: '🧑‍🎓 Waka Kesiswaan',
    KURIKULUM: '📖 Waka Kurikulum',
    HUBIN: '🤝 Waka Hubinmas',
    SARPRAS: '🏗️ Waka Sarpras',
    PEMBINA_ESKUL: '🚩 Pembina OSIS',
  };
  return map[kode] || kode;
}

// ─── GUARD STATE ───────────────────────────────────────────────────────────────

const GuardState: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center">
      <Lock className="w-10 h-10 text-amber-500" />
    </div>
    <div className="space-y-2">
      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
        Program Ketarunaan Belum Aktif
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        Jadwal Kegiatan Ketarunaan belum dibuat atau belum diaktifkan.
        Aktifkan terlebih dahulu di halaman <strong>Agenda Kesiswaan</strong> untuk membuka modul ini.
      </p>
    </div>
    <Button
      variant="default"
      onClick={() => navigate('/kesiswaan/jadwal-kegiatan')}
      className="gap-2"
    >
      <ExternalLink className="w-4 h-4" />
      Buka Agenda Kesiswaan
    </Button>
  </div>
);

// ─── TAB 1: KEPANITIAAN & TERMINAL ─────────────────────────────────────────────

const TabKepanitiaan: React.FC<{
  jadwalKegiatanId: string | null;
  sesiId: string | null;
  refetchSesi: () => void;
}> = ({ jadwalKegiatanId, sesiId, refetchSesi }) => {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ketarunaan-pendamping', sesiId, jadwalKegiatanId],
    queryFn: () => getKetarunaanPendamping({
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    enabled: true,
    staleTime: 30_000,
  });

  const pendamping = data?.data ?? [];
  const realSesiId = data?.sesi_id ?? sesiId;

  const tapMutation = useMutation({
    mutationFn: (payload: { guru_id: string; status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' }) =>
      tapKetarunaanPendamping({
        guru_id: payload.guru_id,
        sesi_id: realSesiId!,
        status: payload.status,
        catatan: payload.status === 'HADIR' ? 'Hadir via Terminal Khusus Ketarunaan' : undefined,
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Presensi dicatat');
      if (res?.synced_kbm) {
        toast.success('✅ Otomatis tersinkronisasi ke Sesi KBM Reguler', { duration: 4000 });
      }
      refetch();
      qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
    },
    onError: () => toast.error('Gagal mencatat presensi'),
  });

  const groups = useMemo(() => {
    const g: Record<string, KetarunaanPendamping[]> = {};
    pendamping.forEach(p => {
      const key = p.jabatan_kode;
      if (!g[key]) g[key] = [];
      g[key].push(p);
    });
    return g;
  }, [pendamping]);

  const hadirCount = pendamping.filter(p => p.status === 'HADIR').length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!realSesiId && pendamping.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold">Belum ada sesi Ketarunaan hari ini</p>
        <p className="text-xs mt-1">Sesi otomatis terbuka saat jam Ketarunaan berlangsung</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header ringkasan */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Daftar Pendamping Hari Ini</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{hadirCount} / {pendamping.length} hadir</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { refetch(); refetchSesi(); }} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Tabel per kelompok jabatan */}
      {Object.entries(groups).map(([kode, list]) => (
        <div key={kode} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {jabatanLabel(kode)}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map(p => (
              <div key={p.guru_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.nama_guru}</p>
                    {p.kelas_nama && <p className="text-[11px] text-slate-400">{p.kelas_nama}</p>}
                    {p.catatan && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic truncate">
                        {p.catatan}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(p.status)}
                  {p.status === 'BELUM_TAP' && realSesiId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[11px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                      disabled={tapMutation.isPending}
                      onClick={() => tapMutation.mutate({ guru_id: p.guru_id, status: 'HADIR' })}
                    >
                      {tapMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── TAB 2: STATISTIK & TREN ───────────────────────────────────────────────────

const TabStatistik: React.FC<{ jadwalKegiatanId: string | null }> = ({ jadwalKegiatanId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId],
    queryFn: () => getKetarunaanStats({ jadwal_kegiatan_id: jadwalKegiatanId ?? undefined }),
    staleTime: 2 * 60 * 1000,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (!stats || stats.trend.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold">Belum ada data statistik</p>
        <p className="text-xs mt-1">Data akan muncul setelah ada sesi kegiatan Ketarunaan yang berlangsung</p>
      </div>
    );
  }

  const latest = stats.latest;

  return (
    <div className="space-y-6">
      {/* Ringkasan Hari Ini */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Siswa Hadir</p>
          <p className="text-2xl font-black text-emerald-600">{latest.persen_hadir_siswa.toFixed(0)}%</p>
          <p className="text-[11px] text-slate-500">{latest.hadir_siswa} / {latest.total_siswa}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pendamping Hadir</p>
          <p className="text-2xl font-black text-amber-600">{latest.persen_hadir_pendamping.toFixed(0)}%</p>
          <p className="text-[11px] text-slate-500">{latest.hadir_pendamping} / {latest.total_pendamping}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pertemuan</p>
          <p className="text-2xl font-black text-blue-600">{stats.trend.length}</p>
          <p className="text-[11px] text-slate-500">sesi terdata</p>
        </div>
      </div>

      {/* Tren Hari ke Hari */}
      <div>
        <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">
          Tren Kehadiran Pertemuan ke Pertemuan
        </h4>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Pertemuan</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Siswa %</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Δ Siswa</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Guru %</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Δ Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.trend.map((item: KetarunaanTrendItem) => (
                  <tr key={item.tanggal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">#{item.sesi_ke}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatTanggal(item.tanggal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-sm font-black",
                        item.persen_hadir_siswa >= 80 ? "text-emerald-600" :
                        item.persen_hadir_siswa >= 60 ? "text-amber-600" : "text-rose-600"
                      )}>
                        {item.persen_hadir_siswa.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs font-bold">
                        {deltaIcon(item.delta_siswa)}
                        {item.delta_siswa !== undefined ? `${item.delta_siswa > 0 ? '+' : ''}${item.delta_siswa.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-sm font-black",
                        item.persen_hadir_guru >= 80 ? "text-emerald-600" :
                        item.persen_hadir_guru >= 60 ? "text-amber-600" : "text-rose-600"
                      )}>
                        {item.persen_hadir_guru.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs font-bold">
                        {deltaIcon(item.delta_guru)}
                        {item.delta_guru !== undefined ? `${item.delta_guru > 0 ? '+' : ''}${item.delta_guru.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per Kelas */}
      {stats.by_kelas && stats.by_kelas.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">
            Rekap per Kelas (Kumulatif)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.by_kelas.map(k => (
              <div key={k.kelas_id} className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{k.kelas_nama}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", k.persen >= 80 ? "bg-emerald-500" : k.persen >= 60 ? "bg-amber-500" : "bg-rose-500")}
                      style={{ width: `${Math.min(k.persen, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 w-10 text-right">
                    {k.persen.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB 3: LAPORAN TIM ────────────────────────────────────────────────────────

const TabLaporanTim: React.FC<{ jadwalKegiatanId: string | null; sesiId: string | null }> = ({ jadwalKegiatanId, sesiId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-laporan-tim', selectedDate, sesiId],
    queryFn: () => getKetarunaanLaporanTim({
      tanggal: selectedDate,
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const tanggalDisplay = formatTanggal(data?.tanggal || selectedDate);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Laporan Tim Ketarunaan</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Daftar hadir pendamping sekolah scope sekolah</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Tidak ada data untuk tanggal ini</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden print:border-none">
          {/* Print header */}
          <div className="hidden print:block text-center py-4 border-b border-slate-200">
            <h2 className="text-lg font-black uppercase">Daftar Hadir Tim Ketarunaan</h2>
            <p className="text-sm">{tanggalDisplay}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100">
                  <th className="text-center px-3 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider w-10">No</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Jabatan / Bidang</th>
                  <th className="text-center px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">Waktu Tap</th>
                  <th className="text-left px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider print:block">Tanda Tangan / Ket.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map(row => (
                  <tr key={row.no} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-500 font-bold">{row.no}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{row.nama_guru}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.jabatan}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {row.waktu_tap ? formatWaktu(row.waktu_tap) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 print:border-b print:border-slate-200 print:h-10">
                      {row.keterangan || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB 4: LAPORAN PER KELAS ──────────────────────────────────────────────────

const TabLaporanKelas: React.FC<{ jadwalKegiatanId: string | null; sesiId: string | null }> = ({ jadwalKegiatanId, sesiId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedKelas, setExpandedKelas] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-laporan-kelas', selectedDate, jadwalKegiatanId],
    queryFn: () => getKetarunaanLaporanKelas({
      tanggal: selectedDate,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      sesi_id: sesiId ?? undefined,
    }),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];

  const toggleKelas = useCallback((kelasId: string) => {
    setExpandedKelas(prev => {
      const next = new Set(prev);
      next.has(kelasId) ? next.delete(kelasId) : next.add(kelasId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Laporan Per Kelas</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kehadiran siswa per rombel pada sesi Ketarunaan</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <LayoutList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Tidak ada data untuk tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(kelas => {
            const isExpanded = expandedKelas.has(kelas.kelas_id);
            const persen = kelas.rekap.total > 0
              ? Math.round((kelas.rekap.hadir / kelas.rekap.total) * 100)
              : 0;
            return (
              <div key={kelas.kelas_id} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header kelas */}
                <button
                  onClick={() => toggleKelas(kelas.kelas_id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{kelas.kelas_nama}</span>
                    <Badge
                      variant={persen >= 80 ? "success" : persen >= 60 ? "warning" : "error"}
                      className="text-[10px]"
                    >
                      {persen}% ({kelas.rekap.hadir}/{kelas.rekap.total})
                    </Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Daftar siswa */}
                {isExpanded && (
                  <div>
                    {/* Rekap singkat guru */}
                    {(kelas.kaprog || kelas.wali_kelas || kelas.guru_mapel_beririsan?.length > 0) && (
                      <div className="px-4 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs">
                        {kelas.kaprog && (
                          <span className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">Kaprog:</span> {kelas.kaprog.nama_guru} — {kelas.kaprog.status}
                          </span>
                        )}
                        {kelas.wali_kelas && (
                          <span className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">Wali Kelas:</span> {kelas.wali_kelas.nama_guru} — {kelas.wali_kelas.status}
                          </span>
                        )}
                        {kelas.guru_mapel_beririsan?.map((g, i) => (
                          <span key={i} className="text-slate-600 dark:text-slate-300">
                            <span className="font-bold">{g.mapel}:</span> {g.nama_guru} — {g.status}
                          </span>
                        ))}
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                          <th className="text-center px-3 py-2 text-[10px] font-black text-slate-400 uppercase w-8">No</th>
                          <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Nama Siswa</th>
                          <th className="text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase">NIS</th>
                          <th className="text-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Status</th>
                          <th className="text-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {kelas.siswa.map(s => (
                          <tr key={s.no} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="px-3 py-2 text-center text-slate-400 text-xs">{s.no}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-200 text-xs font-medium">
                              {s.nama_siswa}
                              {s.catatan && (
                                <span className="ml-1 text-[10px] text-emerald-500 italic">({s.catatan})</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-400 text-xs">{s.nis}</td>
                            <td className="px-4 py-2 text-center">{statusBadge(s.status)}</td>
                            <td className="px-4 py-2 text-center text-xs text-slate-400">
                              {s.waktu_tap ? formatWaktu(s.waktu_tap) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Rekap */}
                    <div className="flex gap-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                      <span className="text-emerald-600">Hadir: {kelas.rekap.hadir}</span>
                      <span className="text-amber-600">Sakit: {kelas.rekap.sakit}</span>
                      <span className="text-blue-600">Izin: {kelas.rekap.izin}</span>
                      <span className="text-rose-600">Alpa: {kelas.rekap.alpa}</span>
                      <span className="text-slate-500">Total: {kelas.rekap.total}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── PAGE ROOT ─────────────────────────────────────────────────────────────────

const TAB_OPTIONS = [
  { id: 'kepanitiaan', label: 'Kepanitiaan & Terminal', icon: Users },
  { id: 'statistik',   label: 'Progres & Statistik',    icon: BarChart2 },
  { id: 'laporan_tim', label: 'Laporan Pendamping',      icon: FileText },
  { id: 'laporan_kelas', label: 'Laporan Per Kelas',     icon: LayoutList },
];

const ProgramKetarunaanPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kepanitiaan');

  // Guard check
  const { data: guard, isLoading: isGuardLoading } = useQuery({
    queryKey: ['ketarunaan-guard'],
    queryFn: getKetarunaanGuardStatus,
    staleTime: 60_000,
  });

  // Sesi hari ini
  const { data: sesiData, refetch: refetchSesi } = useQuery({
    queryKey: ['ketarunaan-sesi-hari-ini', guard?.jadwal_kegiatan_id],
    queryFn: () => getKetarunaanSesiHariIni({
      jadwal_kegiatan_id: guard?.jadwal_kegiatan_id ?? undefined,
    }),
    enabled: Boolean(guard?.is_active),
    staleTime: 30_000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id ?? null;
  const sesiId = sesiData?.data?.id ?? null;

  const hariAktifLabel = useMemo(() => {
    if (!guard?.hari_aktif?.length) return '';
    return guard.hari_aktif.map(h => HARI_LABEL[h] || h).join(', ');
  }, [guard?.hari_aktif]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kesiswaan' },
    { label: 'Program Ketarunaan' },
  ], []);

  if (isGuardLoading) {
    return (
      <AcademicPageLayout
        title="Program Ketarunaan"
        description="Kelola kepanitiaan, presensi, statistik, dan laporan kegiatan Ketarunaan."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="program_ketarunaan"
      >
        <SectionCard fullWidth>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}
          </div>
        </SectionCard>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Program Ketarunaan"
      description="Kelola kepanitiaan, presensi terminal, statistik kehadiran, dan cetak laporan resmi kegiatan Ketarunaan."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="program_ketarunaan"
      instruction={{
        title: 'Panduan Program Ketarunaan',
        description: (
          <div className="space-y-2 text-sm">
            <p>Modul ini mengelola seluruh operasional kegiatan <strong>Program Ketarunaan</strong> sekolah.</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong>Kepanitiaan & Terminal</strong>: Catat kehadiran tim pendamping hari ini.</li>
              <li><strong>Progres & Statistik</strong>: Pantau tren kehadiran siswa dan pendamping dari pertemuan ke pertemuan.</li>
              <li><strong>Laporan Pendamping</strong>: Cetak daftar hadir tim Ketarunaan per tanggal.</li>
              <li><strong>Laporan Per Kelas</strong>: Cetak rekap kehadiran siswa per rombel.</li>
            </ul>
          </div>
        ),
        items: [
          { text: 'Tap/ceklis tombol hijau untuk mencatat kehadiran pendamping.' },
          { text: 'Guru yang beririsan jam KBM otomatis tersinkronisasi ke 2 sesi sekaligus.' },
        ],
      }}
    >
      <SectionCard fullWidth className="bg-transparent border-none p-0 shadow-none dark:bg-transparent min-w-0">
        {!guard?.is_active ? (
          /* ─── GUARD STATE ─── */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <GuardState navigate={navigate} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info strip jadwal aktif */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
                  <Medal className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-800 dark:text-amber-200">
                    {guard?.jadwal_nama || 'Program Ketarunaan'} — Aktif
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {hariAktifLabel && `${hariAktifLabel} • `}
                    {formatWaktu(guard?.jadwal_waktu_mulai)} – {formatWaktu(guard?.jadwal_waktu_selesai)}
                    {sesiId && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">● Sesi Hari Ini Aktif</span>}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto">
                <Badge variant="success" className="text-[10px] font-black">Jadwal Aktif</Badge>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-4 pt-4 overflow-x-auto no-scrollbar">
                <TabSwitcher
                  options={TAB_OPTIONS}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              <div className="p-4 sm:p-6">
                <Suspense fallback={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>}>
                  {activeTab === 'kepanitiaan' && (
                    <TabKepanitiaan
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                    />
                  )}
                  {activeTab === 'statistik' && (
                    <TabStatistik jadwalKegiatanId={jadwalKegiatanId} />
                  )}
                  {activeTab === 'laporan_tim' && (
                    <TabLaporanTim jadwalKegiatanId={jadwalKegiatanId} sesiId={sesiId} />
                  )}
                  {activeTab === 'laporan_kelas' && (
                    <TabLaporanKelas jadwalKegiatanId={jadwalKegiatanId} sesiId={sesiId} />
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default ProgramKetarunaanPage;
