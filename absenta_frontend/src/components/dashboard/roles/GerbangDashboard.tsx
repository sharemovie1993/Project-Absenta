import React, { useState, Suspense, lazy } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  DoorOpen, 
  Activity, 
  ClipboardList, 
  AlertCircle, 
  QrCode,
  Users,
  LogOut,
  RefreshCw,
  Scan,
  ShieldCheck,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { getGerbangDashboardStats } from '../../../api/dashboard.api';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { Button } from '../../ui/Button';

const CatatPelanggaranModal = lazy(() => import('../../kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

export const GerbangDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { menu: groupedMenu } = useSmartMenu();
  
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['gerbang-stats'],
    queryFn: getGerbangDashboardStats,
    refetchInterval: 30000 
  });

  const quickActions: QuickAction[] = [
    { label: 'Scanner Gerbang', icon: Scan, onClick: () => navigate('/attendance/ops'), color: 'blue' },
    { label: 'Tindak Masal', icon: CheckCircle2, onClick: () => setTindakMasalModalOpen(true), color: 'emerald' },
    { label: 'Catat Pelanggaran', icon: AlertTriangle, onClick: () => setCatatModalOpen(true), color: 'amber' },
    { label: 'Monitor Tap', icon: Activity, onClick: () => navigate('/attendance/tracking-siswa'), color: 'indigo' },
    { label: 'Log Harian', icon: ClipboardList, onClick: () => navigate('/attendance/rekap/siswa-harian'), color: 'purple' },
    { label: 'Data Wajah', icon: Users, onClick: () => navigate('/attendance/rekam-wajah'), color: 'rose' },
  ];

  const infoStrips: InfoStripItem[] = [
    { label: 'Total Taps', value: `${stats?.data?.total_taps_today ?? 0}`, icon: RefreshCw, color: 'indigo' },
    { label: 'Masuk', value: `${stats?.data?.total_masuk ?? 0}`, icon: LogIn, color: 'emerald' },
    { label: 'Keluar', value: `${stats?.data?.total_keluar ?? 0}`, icon: LogOut, color: 'rose' },
    { label: 'Device', value: `${stats?.data?.active_devices ?? 0} Aktif`, icon: DoorOpen, color: 'blue' },
  ];

  return (
    <>
      <WelcomeBanner
        title="Operasional Gerbang"
        subtitle="Monitoring gerbang sekolah secara real-time untuk memastikan keamanan dan ketertiban presensi harian."
        icon={ShieldCheck}
        badge={{ label: 'Security & Attendance', color: 'indigo' }}
      />

      <QuickActionGrid title="Kontrol & Aksi Gerbang" actions={quickActions} columns={3} />

      <InfoStripGrid items={infoStrips} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         {/* Live Sync Status */}
         <CompactSectionCard title="Sinkronisasi Sistem" icon={RefreshCw} iconColor="indigo">
            <div className="flex items-center gap-4 h-full py-1">
               <div className={`w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 ${isLoading ? 'animate-spin' : ''}`}>
                  <RefreshCw size={20} />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">Live Cloud Sync</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Updated every 30 seconds</p>
                  <button onClick={() => refetch()} className="text-[9px] font-black text-indigo-600 uppercase mt-1 hover:underline">Sync Now</button>
               </div>
            </div>
         </CompactSectionCard>

         {/* Override/Bypass quick link */}
         <CompactSectionCard title="Tindakan Alert" icon={AlertCircle} iconColor="rose">
            <div className="flex flex-col justify-center h-full">
               <p className="text-[10px] text-gray-500 font-medium mb-2">Perlu override kehadiran manual?</p>
               <Button 
                variant="outline" 
                className="h-8 rounded-lg border-rose-100 text-rose-600 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                onClick={() => navigate('/attendance/settings')}
               >
                  Bypass Manual
               </Button>
            </div>
         </CompactSectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         <CompactSectionCard title="Identitas Terminal" icon={Fingerprint} iconColor="indigo">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-inner border border-gray-100 flex items-center justify-center group hover:rotate-6 transition-transform">
                  <QrCode size={24} className="text-gray-400 group-hover:text-indigo-600" />
               </div>
               <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate uppercase">{user?.full_name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">LOKASI: GERBANG UTAMA</p>
               </div>
            </div>
         </CompactSectionCard>

         <CompactSectionCard title="Status Device" icon={DoorOpen} iconColor="blue">
            <div className="flex items-center gap-4 h-full">
               <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">{stats?.data?.active_devices ?? 0} Aktif</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Terminal yang terhubung</p>
               </div>
               <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                  <Activity size={20} />
               </div>
            </div>
         </CompactSectionCard>
      </div>

      {/* Modal Catat Pelanggaran Kilat */}
      <Suspense fallback={null}>
        <CatatPelanggaranModal
          isOpen={catatModalOpen}
          onClose={() => setCatatModalOpen(false)}
        />
      </Suspense>

      {/* Modal Tindak Masal Pelanggaran */}
      <Suspense fallback={null}>
        <TindakMasalPelanggaranModal
          isOpen={tindakMasalModalOpen}
          onClose={() => setTindakMasalModalOpen(false)}
        />
      </Suspense>
    </>
  );
};
