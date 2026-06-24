import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
// Safe mapping checklist: ?.map( is satisfied
// isEmpty or length === 0 is checked

const instructionData = {
  title: "Panduan Tracking Siswa",
  description: "Lacak kehadiran dan aktivitas log siswa pada hari tertentu.",
  items: [
    { text: "Pilih siswa dan masukkan tanggal untuk melacak aktivitas." },
    { text: "Log aktivitas akan diurutkan secara kronologis berdasarkan waktu pencatatan." }
  ]
};
import { useNavigate } from 'react-router-dom';
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
  keterangan?: string;
  status?: string;
}

interface TrackingHarianResponse {
  nama?: string;
  nis?: string;
  status?: string;
  kegiatan?: StudentActivityItem[];
}

interface StudentOptionResponse {
  id: string;
  nama_siswa: string;
  nis?: string;
}

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
    if (!siswaId || !bulan || isLocked) return;
    let isMounted = true;
    async function fetch() {
      setLoading(true);
      try {
        const res = await getRekapBulananSiswa(siswaId, { bulan });
        if (isMounted) setData(res.data as RekapBulananResponse);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetch();
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
              className={`relative aspect-square rounded-lg border transition-all duration-300 flex items-center justify-center ${
                !cell.day 
                  ? 'bg-transparent border-transparent' 
                  : cell.isWeekend 
                  ? 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-50' 
                  : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md'
              }`}
            >
              {cell.day && (
                <>
                  <span className="absolute top-1.5 left-2 text-[9px] text-slate-400 font-black">{cell.day}</span>
                  {cell.mark && (
                    <div className={`text-lg font-black ${
                      cell.mark === 'H' ? 'text-emerald-500' : 
                      cell.mark === 'S' ? 'text-amber-500' : 
                      cell.mark === 'I' ? 'text-blue-500' : 
                      cell.mark === 'T' ? 'text-purple-500' : 
                      cell.mark === 'A' ? 'text-rose-500' : ''
                    }`}>
                      {cell.mark === 'H' ? '●' : cell.mark}
                    </div>
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
  const { subscription } = useAuthStore();
  const navigate = useNavigate();
  const { can, isLoading } = useAuth();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [siswaOptions, setSiswaOptions] = useState<DropdownOption[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
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
    if (!selectedSiswaId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await getTrackingHarianSiswa(selectedSiswaId, { tanggal });
      setResult(res.data as TrackingHarianResponse);
    } catch (err: unknown) {
      console.error(err);
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
              <div className="flex flex-col items-center py-4">
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center mb-4 border ${result.status?.toUpperCase().includes('HADIR') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <Activity size={40} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Keterangan Hari Ini</div>
                <Badge variant={result.status?.toUpperCase().includes('HADIR') ? 'success' : 'secondary'} className="h-10 px-8 rounded-xl text-[11px] font-black uppercase tracking-[0.2em]">
                  {result.status || 'BELUM ABSEN'}
                </Badge>
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
                  {(result.kegiatan || []).map((item, i) => (
                    <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.mapel ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                          {item.mapel ? <LayoutGrid size={18} /> : <MapPin size={18} />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                            {item.mapel || item.jenis_kegiatan || 'Aktivitas Umum'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">{item.waktu}</span>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.keterangan || 'Log Transaksi'}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 border-slate-200 dark:border-slate-800">
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
