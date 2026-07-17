import React, { useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ClipboardCheck, 
  Activity, 
  Clock, 
  RefreshCw,
  Zap,
  Star,
  UserCheck,
  ChevronRight,
  Fingerprint,
  Users,
  LayoutList
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Progress } from '../../ui/Progress';
import { getPetugasDashboardStats } from '../../../api/dashboard.api';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import iconForName from '../../../lib/iconForName';
import { cn } from '../../../lib/utils';

export const PetugasDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { menu: groupedMenu } = useSmartMenu();
  
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['petugas-stats'],
    queryFn: getPetugasDashboardStats,
    refetchInterval: 60000 
  });

  const progressValue = useMemo(() => {
    if (!stats?.data?.total_sesi) return 0;
    return Math.round((stats.data.sesi_selesai / stats.data.total_sesi) * 100);
  }, [stats]);

  const quickActions: QuickAction[] = [
    { label: 'Input Absen', icon: Zap, onClick: () => navigate('/attendance/ops'), color: 'blue' },
    { label: 'Monitoring', icon: Activity, onClick: () => navigate('/attendance/rekap'), color: 'emerald' },
    { label: 'Riwayat Log', icon: Clock, onClick: () => navigate('/attendance/tracking-siswa'), color: 'indigo' },
    { label: 'Jadwal KBM', icon: LayoutList, onClick: () => navigate('/kurikulum/jadwal'), color: 'amber' },
  ];

  const infoStrips: InfoStripItem[] = [
    { label: 'Progres', value: `${progressValue}%`, icon: ClipboardCheck, color: 'blue' },
    { label: 'Sesi Aktif', value: `${stats?.data?.sesi_hari_ini ?? 0}`, icon: Clock, color: 'orange' },
    { label: 'Jadwal Hari Ini', value: `${stats?.data?.total_sesi ?? 0}`, icon: LayoutList, color: 'indigo' },
    { label: 'Status Hub', value: 'Connected', icon: Activity, color: 'emerald' },
  ];

  return (
    <>
      <WelcomeBanner
        title={`Semangat bertugas, ${user?.full_name?.split(' ')[0]}!`}
        subtitle="Pantau dan catat kehadiran siswa hari ini untuk memastikan ketertiban sekolah."
        icon={Star}
        badge={{ label: 'Petugas Aktif', color: 'amber' }}
      />

      <QuickActionGrid title="Aksi Cepat" actions={quickActions} columns={4} />

      <InfoStripGrid items={infoStrips} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Mission Control Card (Wider) */}
        <div className="md:col-span-2">
           <CompactSectionCard title="Progres Perekaman Harian" icon={ClipboardCheck} iconColor="blue">
              <div className="space-y-4">
                 <div className="flex justify-between items-end mb-1">
                    <div>
                       <h2 className="text-2xl font-black text-blue-600 leading-none">{progressValue}%</h2>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {stats?.data?.sesi_selesai ?? 0} dari {stats?.data?.total_sesi ?? 0} sesi selesai
                       </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/attendance/ops')}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest px-4"
                    >
                       Input Sekarang
                    </Button>
                 </div>
                 <Progress value={progressValue} className="h-2 bg-blue-50" indicatorClassName="bg-blue-600" />
              </div>
           </CompactSectionCard>
        </div>

        {/* Sync Status Card */}
        <CompactSectionCard title="Status Sistem" icon={RefreshCw} iconColor="indigo">
           <div className="flex items-center gap-4 h-full py-1">
              <div className={cn("w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500", isLoading && "animate-spin")}>
                 <RefreshCw size={20} />
              </div>
              <div>
                 <h4 className="text-sm font-bold text-gray-900 leading-tight">Smart Sync</h4>
                 <p className="text-[10px] text-gray-400 mt-0.5">Updated every 60s</p>
                 <button onClick={() => refetch()} className="text-[9px] font-black text-indigo-600 uppercase mt-1 hover:underline">Sync Now</button>
              </div>
           </div>
        </CompactSectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         <CompactSectionCard title="Statistik Sesi" icon={Activity} iconColor="indigo">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                  <Clock size={20} />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">{stats?.data?.sesi_hari_ini ?? 0} Sesi Aktif</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Sesi sedang berjalan saat ini</p>
               </div>
            </div>
         </CompactSectionCard>

         <CompactSectionCard title="Status Akses" icon={UserCheck} iconColor="emerald">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">Verified</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hak Akses: Operasional Full</p>
               </div>
            </div>
         </CompactSectionCard>
      </div>
    </>
  );
};

// Placeholder icon for consistency with the style
const ShieldCheck = (props: any) => <Fingerprint {...props} />;
