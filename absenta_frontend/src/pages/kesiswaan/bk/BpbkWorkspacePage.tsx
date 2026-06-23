import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { Card } from '../../../components/ui/Card';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Trophy, 
  MailOpen, 
  Home, 
  ClipboardList, 
  Send, 
  Settings,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Loader } from '../../../components/ui/Loader';

const SiswaForm = lazy(() => import('../../../components/academic/siswa/SiswaForm').then(m => ({ default: m.SiswaForm })));

// Subcomponents (to be created)
import { DashboardSection } from './components/DashboardSection';
import { SiswaKasusSection } from './components/SiswaKasusSection';
import { KonselingSection } from './components/KonselingSection';
import { PrestasiSection } from './components/PrestasiSection';
import { PemanggilanSection } from './components/PemanggilanSection';
import { HomeVisitSection } from './components/HomeVisitSection';
import { AsesmenSection } from './components/AsesmenSection';
import { RujukanSection } from './components/RujukanSection';
import { SettingsSection } from './components/SettingsSection';

type ActiveMenu = 
  | 'dashboard'
  | 'siswa'
  | 'konseling'
  | 'prestasi'
  | 'pemanggilan'
  | 'homevisit'
  | 'asesmen'
  | 'rujukan'
  | 'settings';

interface MenuItem {
  id: ActiveMenu;
  label: string;
  icon: React.ComponentType<any>;
  colorClass: string;
}

export const BpbkWorkspacePage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const viewSiswaDetail = (id: string) => {
    setSelectedSiswaId(id);
    setIsDetailOpen(true);
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard BPBK', icon: LayoutDashboard, colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
    { id: 'siswa', label: 'Data Kasus Siswa', icon: Users, colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
    { id: 'konseling', label: 'Layanan Konseling', icon: UserCheck, colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
    { id: 'prestasi', label: 'Prestasi & Penghargaan', icon: Trophy, colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
    { id: 'pemanggilan', label: 'Pemanggilan Ortu', icon: MailOpen, colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
    { id: 'homevisit', label: 'Home Visit', icon: Home, colorClass: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20' },
    { id: 'asesmen', label: 'Asesmen & Angket', icon: ClipboardList, colorClass: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
    { id: 'rujukan', label: 'Rujukan Kasus', icon: Send, colorClass: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20' },
    { id: 'settings', label: 'Pengaturan Kategori & Poin', icon: Settings, colorClass: 'text-slate-500 bg-slate-50 dark:bg-slate-950/20' }
  ];

  const renderActiveSection = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardSection onViewSiswaDetail={viewSiswaDetail} onViewSiswa={() => setActiveMenu('siswa')} />;
      case 'siswa':
        return <SiswaKasusSection onViewSiswaDetail={viewSiswaDetail} />;
      case 'konseling':
        return <KonselingSection />;
      case 'prestasi':
        return <PrestasiSection />;
      case 'pemanggilan':
        return <PemanggilanSection />;
      case 'homevisit':
        return <HomeVisitSection />;
      case 'asesmen':
        return <AsesmenSection />;
      case 'rujukan':
        return <RujukanSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardSection onViewSiswaDetail={viewSiswaDetail} onViewSiswa={() => setActiveMenu('siswa')} />;
    }
  };

  return (
    <AcademicPageLayout title="Pusat Kendali Bimbingan Konseling (BP/BK)" subtitle="Layanan terintegrasi pendampingan karakter, kedisiplinan, dan prestasi siswa">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-2">Menu Navigasi BK</span>
            <nav className="space-y-1.5">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-300 active:scale-[0.98]",
                      isActive 
                        ? "font-black bg-white dark:bg-slate-800 shadow-md shadow-slate-100 dark:shadow-none border border-slate-200/40 dark:border-slate-700/50 text-slate-900 dark:text-white" 
                        : "font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50", item.colorClass)}>
                        <Icon size={14} className={isActive ? "scale-110 transition-transform" : ""} />
                      </div>
                      <span className="tracking-tight">{item.label}</span>
                    </div>
                    {isActive && <ArrowRight size={12} className="text-slate-400 animate-pulse" />}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Right Section Content */}
        <div className="flex-1 w-full min-w-0">
          <div className="transition-all duration-500 ease-in-out">
            {renderActiveSection()}
          </div>
        </div>

      </div>

      {/* Shared Student Detail & counseling timeline Modal */}
      <Suspense fallback={null}>
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Profil Lengkap & Linimasa Siswa" size="4xl">
          <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
            {selectedSiswaId && (
              <SiswaForm
                siswaId={selectedSiswaId}
                mode="view"
                onSuccess={() => {
                  setIsDetailOpen(false);
                  window.location.reload();
                }}
                onCancel={() => setIsDetailOpen(false)}
              />
            )}
          </Suspense>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default BpbkWorkspacePage;
