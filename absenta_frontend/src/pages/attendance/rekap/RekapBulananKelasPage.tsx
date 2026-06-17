import React, { useEffect, useMemo, useState } from 'react';
import { 
  SectionCard, 
  Button, 
  Input, 
  Badge, 
  Loader, 
  Alert, 
  AlertDescription,
  Table
} from '../../../components/ui';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapBulananKelas } from '../../../api/attendanceGerbang.api';
import { siswaApi } from '../../../api/academic.api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { toLocalMonth } from '../../../utils/attendance/time';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  Users, 
  FileText, 
  Filter, 
  LayoutGrid, 
  List, 
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';

export function RekapBulananKelasContent({ 
  hideHeader = false, 
  initialTab, 
  initialKelasId 
}: { 
  hideHeader?: boolean;
  initialTab?: string;
  initialKelasId?: string;
}) {
  const { subscription } = useAuthStore();
  const { can, isLoading } = useAuth();
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [kelasId, setKelasId] = useState(initialKelasId || '');
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[] | null>(null);
  const [tab, setTab] = useState(initialTab || 'TABLE');

  const canView = useMemo(
    () => can('attendance.reports.view') && can('academic.structures.view.list'),
    [can],
  );

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  useEffect(() => {
    if (initialKelasId) setKelasId(initialKelasId);
  }, [initialKelasId]);

  useEffect(() => {
    const loadDropdowns = async () => {
      const tahun = await dropdownApi.getTahunPelajaranForDropdown();
      setTahunOptions(tahun);
      const active = await dropdownApi.getActiveTahunPelajaran();
      if (active?.id) setTahunPelajaranId(active.id);
      const kelas = await dropdownApi.getKelasForDropdown();
      setKelasOptions(kelas);
    };
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (kelasId && bulan) fetchData();
  }, [kelasId, bulan, tahunPelajaranId]);

  const fetchData = async () => {
    if (isLocked) return;
    if (!kelasId || !bulan) return;
    setLoading(true);
    try {
      const res = await getRekapBulananKelas(kelasId, { bulan, tahun_pelajaran_id: tahunPelajaranId || undefined });
      setRows(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const columns = [
    { 
      label: 'Nama Siswa', 
      key: 'nama_siswa', 
      render: (v: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{v}</span>
    },
    { 
      label: 'Hadir', 
      key: 'HADIR', 
      render: (v: any) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-bold text-emerald-600">{v || 0}</span>
        </div>
      )
    },
    { 
      label: 'Izin', 
      key: 'IZIN',
      render: (v: any) => <span className="font-bold text-blue-600">{v || 0}</span>
    },
    { 
      label: 'Sakit', 
      key: 'SAKIT',
      render: (v: any) => <span className="font-bold text-amber-600">{v || 0}</span>
    },
    { 
      label: 'Alpa', 
      key: 'ALPA',
      render: (v: any) => <span className="font-bold text-rose-600">{v || 0}</span>
    },
    { 
      label: 'Terlambat', 
      key: 'TERLAMBAT',
      render: (v: any) => <span className="font-bold text-purple-600">{v || 0}</span>
    }
  ];

  const pageContent = (
    <div className="space-y-6">
      <SectionCard title="Filter Laporan Kelas" icon={Filter} fullWidth>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Kelas</label>
            {!initialKelasId && (
              <SearchableSelect 
                value={kelasId} 
                onValueChange={setKelasId} 
                options={kelasOptions} 
                placeholder="Pilih Kelas..." 
                triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" 
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bulan Laporan</label>
            <Input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
            <SearchableSelect value={tahunPelajaranId} onValueChange={setTahunPelajaranId} options={tahunOptions} placeholder="Pilih Tahun..." triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button onClick={fetchData} disabled={loading || !kelasId || !bulan} className="h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Generate Laporan
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Hasil Rekapitulasi Kolektif" icon={Users} fullWidth noPadding>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
          <Tabs value={tab} onValueChange={setTab} className="w-full md:w-auto">
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm inline-flex">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger value="TABLE" className="rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 transition-all">
                  <List className="w-3 h-3 mr-1.5" /> Tabel Ringkasan
                </TabsTrigger>
                <TabsTrigger value="PIVOT" className="rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 transition-all">
                  <LayoutGrid className="w-3 h-3 mr-1.5" /> Pivot Kehadiran
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
          
          <div className="hidden md:flex gap-2">
             <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-9 px-4 border-slate-200 dark:border-slate-800">
               <FileText className="w-3.5 h-3.5 mr-2" /> Export Excel
             </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 overflow-hidden">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value="TABLE" className="mt-0 outline-none ring-0">
              <Table
                columns={columns}
                data={rows || []}
                loading={loading}
                emptyMessage="Silakan pilih filter dan klik Generate Laporan."
                compact={true}
                className="border-none"
              />
            </TabsContent>
            <TabsContent value="PIVOT" className="mt-0 outline-none ring-0">
               <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-20 h-20 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-6 border border-amber-500/20">
                     <BarChart3 size={40} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-2">Mode Pivot Premium</h4>
                  <p className="text-[11px] font-bold text-slate-500 max-w-xs leading-relaxed uppercase tracking-tight">
                    Visualisasi data harian per siswa dalam satu bulan penuh (Matrix) tersedia pada paket Berlangganan Premium.
                  </p>
                  <Button className="mt-8 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white px-8 h-10 shadow-lg shadow-blue-500/20">Upgrade Sekarang</Button>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </SectionCard>
    </div>
  );

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Rekap Presensi Per Kelas"
      description="Analisis kehadiran seluruh siswa dalam satu kelas secara kolektif dengan tampilan pivot yang mendetail."
    >
      {pageContent}
    </PremiumFeatureGate>
  );
}

export default function RekapBulananKelasPage() {
  return <RekapBulananKelasContent />;
}
