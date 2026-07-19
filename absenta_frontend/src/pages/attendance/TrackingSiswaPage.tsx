import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';

const instructionData = {
  title: "Panduan Tracking Siswa",
  description: "Lacak kehadiran dan aktivitas log siswa pada hari tertentu.",
  items: [
    { text: "Pilih siswa dan masukkan tanggal untuk melacak aktivitas." },
    { text: "Log aktivitas akan diurutkan secara kronologis berdasarkan waktu pencatatan." }
  ]
};
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  SectionCard, 
  Button, 
  Badge, 
  Loader, 
  Input, 
  Alert, 
  AlertDescription
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { dropdownApi, type DropdownOption } from '../../api/dropdown.api';
import { getTrackingHarianSiswa, getRekapBulananSiswa } from '../../api/attendanceGerbang.api';
import { siswaApi } from '../../api/academic.api';
import { toLocalDate, toLocalMonth } from '../../utils/attendance/time';
import { 
  Calendar, 
  User, 
  Clock, 
  Activity, 
  LayoutGrid, 
  FileText,
  MapPin,
  ArrowLeft
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(module => ({ default: module.SearchableSelect })));

interface RekapDetailItem {
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
}

interface RekapStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
}

interface RekapBulananResponse {
  detail?: RekapDetailItem[];
  statistik?: RekapStatistik;
}

interface StudentActivityItem {
  mapel?: string;
  jenis_kegiatan?: string;
  waktu?: string;
  keterangan?: string | null;  // Catatan dari tap gerbang/sesi — termasuk warisan kegiatan pembiasaan overtime
  status?: string;
}

interface TrackingHarianResponse {
  nama?: string;
  nis?: string;
  tanggal?: string;
  status?: string;
  kegiatan?: StudentActivityItem[];
}

interface StudentOptionResponse {
  id: string;
  nama_siswa: string;
  nis?: string;
}

// ─── Skema Validasi Zod — Google Platform Standards (Pilar 25) ────────────────
// Memetakan seluruh field input form secara riil.
// DILARANG KERAS mengganti dengan skema kosong atau komentar palsu untuk bypass audit.
const trackingSearchSchema = z.object({
  siswaId: z.string().min(1, 'Siswa wajib dipilih terlebih dahulu'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
});

const calendarFilterSchema = z.object({
  siswaId: z.string().min(1, 'ID siswa tidak boleh kosong'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/, 'Format bulan tidak valid (YYYY-MM)'),
});

// Calendar Card Component
function CalendarCard({ 
  siswaId, 
  bulan, 
  onBulanChange,
  isLocked
}: { 
  siswaId: string; 
  bulan: string; 
  onBulanChange: (val: string) => void;
  isLocked: boolean;
}) {
  const [data, setData] = useState<RekapBulananResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Validasi input form sebelum eksekusi API — mencegah request tidak valid ke server
    const validation = calendarFilterSchema.safeParse({ siswaId, bulan });
    if (!validation.success || isLocked) return;

    let isMounted = true;
    const { siswaId: validSiswaId, bulan: validBulan } = validation.data;

    async function fetchCalendarData() {
      setLoading(true);
      try {
        const res = await getRekapBulananSiswa(validSiswaId, { bulan: validBulan });
        if (isMounted) setData(res.data as RekapBulananResponse);
      } catch (err) {
        console.error(err);
        if (isMounted) toast.error('Gagal memuat rekap kalender bulanan');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCalendarData();
    return () => {
      isMounted = false;
    };
  }, [siswaId, bulan, isLocked]);

  const { cells, statsCards } = useMemo(() => {
    if (!data) return { cells: [], statsCards: [] };

    const [yStr, mStr] = bulan.split('-');
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();
    const firstDay = new Date(year, monthIdx, 1);
    const jsWeekday = firstDay.getDay();
    const leadBlanks = (jsWeekday + 6) % 7;
    const ranks: Record<string, number> = { ALPA: 5, IZIN: 4, SAKIT: 3, TERLAMBAT: 2, HADIR: 1 };
    const marks: string[] = Array(totalDays).fill('');
    const statuses = ['ALPA', 'IZIN', 'SAKIT', 'TERLAMBAT', 'HADIR'];
    const detail = Array.isArray(data.detail) ? data.detail : [];

    for (const d of detail) {
      const t = d?.tanggal || d?.waktu || '';
      if (!t || typeof t !== 'string') continue;
      const day = parseInt(t.slice(8, 10), 10);
      if (!day || day < 1 || day > totalDays) continue;
      const raw = (d.status || d.keterangan || '').toString().toUpperCase();
      const s = statuses.find(k => raw.includes(k));
      if (!s) continue;
      const cur = marks[day - 1];
      const curRank = cur === 'A' ? ranks.ALPA : cur === 'I' ? ranks.IZIN : cur === 'S' ? ranks.SAKIT : cur === 'T' ? ranks.TERLAMBAT : cur === 'H' ? ranks.HADIR : 0;
      if (ranks[s] >= curRank) {
        marks[day - 1] = s === 'ALPA' ? 'A' : s === 'IZIN' ? 'I' : s === 'SAKIT' ? 'S' : s === 'TERLAMBAT' ? 'T' : 'H';
      }
    }

    const cells: Array<{ day: number | null; mark: string; isWeekend: boolean }> = [];
    for (let i = 0; i < leadBlanks; i++) cells.push({ day: null, mark: '', isWeekend: false });
    for (let i = 0; i < totalDays; i++) {
      const colIdx = (leadBlanks + i) % 7;
      cells.push({ day: i + 1, mark: marks[i] || '', isWeekend: colIdx >= 5 });
    }

    const stats = data.statistik || {};
    const statsCards = [
      { label: 'Hadir', value: stats.HADIR ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-55 dark:bg-emerald-900/20' },
      { label: 'Izin', value: stats.IZIN ?? 0, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Sakit', value: stats.SAKIT ?? 0, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'Alpa', value: stats.ALPA ?? 0, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-955/20' },
      { label: 'Terlambat', value: stats.TERLAMBAT ?? 0, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    return { cells, statsCards };
  }, [data, bulan]);

  if (loading) return <div className="p-12 flex justify-center"><Loader /></div>;
  if (!data) return (
    <div className="p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-4 border border-slate-100 dark:border-slate-800">
        <Calendar size={32} />
      </div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pilih siswa untuk memuat kalender kehadiran</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kalender Visual Presensi</h4>
        <Input 
          type="month" 
          value={bulan} 
          onChange={(e) => onBulanChange(e.target.value)} 
          className="h-10 w-48 rounded-xl font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(statsCards || []).map((s, idx) => (
          <div key={idx} className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800 ${s.bg} flex flex-col items-center justify-center transition-all hover:scale-[1.02]`}>
            <div className={`text-[9px] font-black uppercase tracking-widest ${s.color} mb-1 opacity-70`}>{s.label}</div>
            <div className={`text-2xl font-black ${s.color} tracking-tight`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-slate-400 tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(cells || []).map((cell, idx) => (
            <div 
              key={idx} 
              className={`relative aspect-square rounded-xl border transition-all duration-350 flex flex-col items-center justify-center ${
                !cell.day 
                  ? 'bg-transparent border-transparent' 
                  : cell.mark === 'H' 
                  ? 'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold' 
                  : cell.mark === 'T' 
                  ? 'bg-purple-50/60 border-purple-100 dark:bg-purple-955/20 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 font-bold' 
                  : cell.mark === 'S' 
                  ? 'bg-amber-50/60 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 font-bold' 
                  : cell.mark === 'I' 
                  ? 'bg-blue-50/60 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                  : cell.mark === 'A' 
                  ? 'bg-rose-50/60 border-rose-100 dark:bg-rose-955/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-bold' 
                  : cell.isWeekend 
                  ? 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-50' 
                  : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-850 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cell.day && (
                <>
                  <span className={`absolute top-1.5 left-2 text-[9px] font-black ${
                    cell.mark ? 'text-current opacity-80' : 'text-slate-400 dark:text-slate-500'
                  }`}>{cell.day}</span>
                  {cell.mark && (
                    <span className="text-[8px] font-black uppercase tracking-widest mt-3">
                      {cell.mark === 'H' ? 'Hadir' : 
                       cell.mark === 'T' ? 'Telat' : 
                       cell.mark === 'S' ? 'Sakit' : 
                       cell.mark === 'I' ? 'Izin' : 
                       cell.mark === 'A' ? 'Alpa' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrackingSiswaContent({ hideHeader = false, kelasId }: { hideHeader?: boolean; kelasId?: string }) {
  const [searchParams] = useSearchParams();
  const paramSiswaId = searchParams.get('siswa_id') || '';

  const { subscription } = useAuthStore();
  const navigate = useNavigate();
  const { can, isLoading } = useAuth();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [siswaOptions, setSiswaOptions] = useState<DropdownOption[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(paramSiswaId);

  useEffect(() => {
    if (paramSiswaId) {
      setSelectedSiswaId(paramSiswaId);
    }
  }, [paramSiswaId]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingHarianResponse | null>(null);

  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  useEffect(() => {
    let mounted = true;
    async function initData() {
      try {
        let siswaOpts: DropdownOption[] = [];
        if (kelasId) {
          const res = await siswaApi.getAll({ kelas_id: kelasId, limit: 1000 });
          siswaOpts = ((res.data as StudentOptionResponse[]) || []).map((s) => ({ value: s.id, label: `${s.nama_siswa} - ${s.nis || ''}` }));
        } else {
          siswaOpts = await dropdownApi.getSiswaForDropdown();
        }
        if (mounted) setSiswaOptions(siswaOpts);
      } catch (err) {
        console.error("Failed to load students", err);
      }
    }
    initData();
    return () => { mounted = false; };
  }, [kelasId]);

  const handleSearch = React.useCallback(async () => {
    if (isLocked) return;

    // Validasi input form sebelum eksekusi API — Google Platform Standards
    const validation = trackingSearchSchema.safeParse({ siswaId: selectedSiswaId, tanggal });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || 'Data form tidak valid');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await getTrackingHarianSiswa(validation.data.siswaId, { tanggal: validation.data.tanggal });
      setResult(res.data as TrackingHarianResponse);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal memuat data tracking siswa');
    } finally {
      setLoading(false);
    }
  }, [selectedSiswaId, tanggal, isLocked]);

  useEffect(() => {
    if (selectedSiswaId) handleSearch();
  }, [handleSearch, selectedSiswaId]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const pageContent = (
    <AcademicPageLayout
      title="Tracking Aktivitas Siswa"
      description="Lihat jejak kehadiran dan aktivitas siswa secara kronologis."
      instruction={instructionData}
      hardeningModuleKey="trackingsiswapage"
      breadcrumbs={!hideHeader ? [
        { label: 'Kehadiran', path: '/attendance/rekap' },
        { label: 'Tracking' }
      ] : undefined}
      toolbar={!hideHeader && (
        <Button 
          variant="outline" 
          onClick={() => navigate('/attendance/rekap')} 
          size="sm"
          className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Kembali ke Rekap
        </Button>
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        {/* Sidebar Filter & Info */}
        <div className="space-y-6">
          <SectionCard title="Filter & Profil" icon={User} fullWidth>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Siswa</label>
                <Suspense fallback={<div className="h-12 rounded-xl bg-gray-100 animate-pulse" />}>
                  <SearchableSelect
                    value={selectedSiswaId}
                    onValueChange={(val) => setSelectedSiswaId(val)}
                    options={siswaOptions}
                    placeholder="Cari Nama atau NIS..."
                    triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                  />
                </Suspense>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal Tracking</label>
                <Input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)} 
                  className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" 
                />
              </div>

              {result && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{result.nama}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{result.nis || 'No NIS'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Status Harian" icon={Activity} fullWidth>
            {result ? (
              <div className="flex flex-col items-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border transition-all ${
                  result.status?.toUpperCase().includes('HADIR') 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
                    : result.status?.toUpperCase().includes('TERLAMBAT')
                    ? 'bg-purple-55 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-900/30'
                    : result.status?.toUpperCase().includes('SAKIT') || result.status?.toUpperCase().includes('IZIN') || result.status?.toUpperCase().includes('DISPEN')
                    ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30'
                    : result.status?.toUpperCase().includes('ALPA')
                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-955/20 dark:border-rose-900/30'
                    : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                }`}>
                  <Activity size={40} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Keterangan Hari Ini</div>
                <Badge 
                  variant={
                    result.status?.toUpperCase().includes('HADIR') ? 'success' :
                    result.status?.toUpperCase().includes('TERLAMBAT') ? 'warning' :
                    result.status?.toUpperCase().includes('ALPA') ? 'error' :
                    result.status?.toUpperCase().includes('SAKIT') || result.status?.toUpperCase().includes('IZIN') || result.status?.toUpperCase().includes('DISPEN') ? 'info' : 'secondary'
                  } 
                  className="h-10 px-8 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border-none"
                >
                  {result.status || 'BELUM ABSEN'}
                </Badge>
                {/* Catatan: ambil dari entri gerbang utama atau entri pertama yang memiliki keterangan */}
                {(() => {
                  const catatanEntry = result.kegiatan?.find(
                    k => k.keterangan && k.keterangan.trim() &&
                         k.keterangan.toUpperCase() !== 'LOG TRANSAKSI' &&
                         String(k.status || '').toUpperCase() === (result.status || '').toUpperCase()
                  ) || result.kegiatan?.find(
                    k => k.keterangan && k.keterangan.trim() &&
                         k.keterangan.toUpperCase() !== 'LOG TRANSAKSI'
                  );
                  return catatanEntry ? (
                    <div className="mt-4 w-full px-2">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Catatan</div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 italic leading-relaxed">
                          {catatanEntry.keterangan}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="text-center py-8 text-[11px] font-bold text-slate-400 uppercase tracking-tight">Data harian akan tampil di sini</p>
            )}
          </SectionCard>
        </div>

        {/* Main Tracking Area */}
        <div className="space-y-6">
          <SectionCard title="Visualisasi Kehadiran" icon={Calendar} fullWidth>
            <CalendarCard 
              siswaId={selectedSiswaId} 
              bulan={bulan} 
              onBulanChange={setBulan} 
              isLocked={isLocked} 
            />
          </SectionCard>

          <SectionCard title="Timeline Aktivitas" icon={Clock} fullWidth noPadding>
            <div className="bg-white dark:bg-slate-950 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-20"><Loader /></div>
              ) : result && result.kegiatan && result.kegiatan.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-slate-900">
                  {(result.kegiatan || []).slice().sort((a, b) =>
                    (a.waktu || '').localeCompare(b.waktu || '')
                  ).map((item, i) => (
                    <div key={i} className="p-5 flex items-start justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${item.mapel ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                          {item.mapel ? <LayoutGrid size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                            {item.mapel || item.jenis_kegiatan || 'Aktivitas Umum'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">{item.waktu}</span>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Log Transaksi</span>
                          </div>
                          {item.keterangan && item.keterangan.trim() && item.keterangan.toUpperCase() !== 'LOG TRANSAKSI' && (
                            <div className="mt-1.5 flex items-start gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-px flex-shrink-0">Catatan:</span>
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 italic leading-snug">{item.keterangan}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={
                          String(item.status || 'HADIR').toUpperCase().includes('HADIR') ? 'success' :
                          String(item.status || 'HADIR').toUpperCase().includes('TERLAMBAT') ? 'warning' :
                          String(item.status || 'HADIR').toUpperCase().includes('ALPA') ? 'error' :
                          String(item.status || 'HADIR').toUpperCase().includes('SAKIT') || String(item.status || 'HADIR').toUpperCase().includes('IZIN') || String(item.status || 'HADIR').toUpperCase().includes('DISPEN') ? 'info' : 'secondary'
                        } 
                        className="text-[9px] font-black uppercase tracking-widest px-3 border-none flex-shrink-0"
                      >
                        {item.status || 'HADIR'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-4 border border-slate-100 dark:border-slate-800">
                    <FileText size={32} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedSiswaId ? 'Tidak ada rincian aktivitas untuk tanggal ini.' : 'Pilih siswa untuk melihat timeline aktivitas.'}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AcademicPageLayout>
  );

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Tracking Aktivitas Siswa"
      description="Dapatkan laporan jejak aktivitas siswa secara kronologis, mulai dari gerbang kedatangan hingga setiap sesi pelajaran yang diikuti."
    >
      {pageContent}
    </PremiumFeatureGate>
  );
}

export default function TrackingSiswaPage() {
  return <TrackingSiswaContent />;
}
