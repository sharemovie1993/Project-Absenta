import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
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
  ArrowRight,
  BarChart3,
  History
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { Loader } from '../../components/ui/Loader';
import { useAuth } from '../../hooks/useAuth';

const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(m => ({ default: m.SiswaForm })));

// Subcomponents (to be created)
import { DashboardSection } from './components/DashboardSection';
import { SiswaKasusSection } from './components/SiswaKasusSection';
import { CasesSection } from './components/CasesSection';
import { KonselingSection } from './components/KonselingSection';
import { PemanggilanSection } from './components/PemanggilanSection';
import { HomeVisitSection } from './components/HomeVisitSection';
import { AsesmenSection } from './components/AsesmenSection';
import { RujukanSection } from './components/RujukanSection';
import { SettingsSection } from './components/SettingsSection';
import { ReportsSection } from './components/ReportsSection';
import { AuditSection } from './components/AuditSection';

type ActiveMenu = 
  | 'dashboard'
  | 'siswa'
  | 'cases'
  | 'konseling'
  | 'pemanggilan'
  | 'homevisit'
  | 'asesmen'
  | 'rujukan'
  | 'reports'
  | 'settings'
  | 'audit';

interface MenuItem {
  id: ActiveMenu;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
}

export const BpbkWorkspacePage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { can } = useAuth();

  const viewSiswaDetail = useCallback((id: string) => {
    setSelectedSiswaId(id);
    setIsDetailOpen(true);
  }, []);

  const handleTabChange = useCallback((id: ActiveMenu) => {
    setActiveMenu(id);
  }, []);

  const handleViewSiswa = useCallback(() => {
    setActiveMenu('siswa');
  }, []);

  const showReports = can('bk.reports.view');
  const showAudit = can('bk.audit.view');

  const menuItems: MenuItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard BPBK', icon: LayoutDashboard, colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
    { id: 'siswa', label: 'Data Kasus Siswa', icon: Users, colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
    { id: 'cases', label: 'Kasus BK (Parent Entity)', icon: ShieldAlert, colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
    { id: 'konseling', label: 'Layanan Konseling', icon: UserCheck, colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
    { id: 'pemanggilan', label: 'Pemanggilan Ortu', icon: MailOpen, colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
    { id: 'homevisit', label: 'Home Visit', icon: Home, colorClass: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20' },
    { id: 'asesmen', label: 'Asesmen & Angket', icon: ClipboardList, colorClass: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
    { id: 'rujukan', label: 'Rujukan Kasus', icon: Send, colorClass: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20' },
    ...(showReports ? [{ id: 'reports' as const, label: 'Laporan & Statistik', icon: BarChart3, colorClass: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' }] : []),
    ...(showAudit ? [{ id: 'audit' as const, label: 'Log Audit BK', icon: History, colorClass: 'text-slate-600 bg-slate-100 dark:bg-slate-850/20' }] : []),
    { id: 'settings', label: 'Pengaturan Kategori & Poin', icon: Settings, colorClass: 'text-slate-500 bg-slate-50 dark:bg-slate-950/20' }
  ], [showReports, showAudit]);

  const renderActiveSection = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardSection onViewSiswaDetail={viewSiswaDetail} onViewSiswa={handleViewSiswa} />;
      case 'siswa':
        return <SiswaKasusSection onViewSiswaDetail={viewSiswaDetail} />;
      case 'cases':
        return <CasesSection />;
      case 'konseling':
        return <KonselingSection />;
      case 'pemanggilan':
        return <PemanggilanSection />;
      case 'homevisit':
        return <HomeVisitSection />;
      case 'asesmen':
        return <AsesmenSection />;
      case 'rujukan':
        return <RujukanSection />;
      case 'reports':
        return <ReportsSection />;
      case 'audit':
        return <AuditSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardSection onViewSiswaDetail={viewSiswaDetail} onViewSiswa={handleViewSiswa} />;
    }
  };

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  const handleDetailSuccess = useCallback(() => {
    setIsDetailOpen(false);
    window.location.reload();
  }, []);

  return (
    <AcademicPageLayout 
      title="Pusat Kendali Bimbingan Konseling (BP/BK)" 
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Bimbingan Konseling', path: '/bpbk' }
      ]}
      hardeningModuleKey="bpbk_workspace"
      instruction={{
        title: "Panduan Pusat Kendali BPBK",
        description: "Gunakan menu sidebar untuk mengakses layanan konseling, data kasus siswa, pemanggilan ortu, home visit, asesmen, dan laporan.",
        items: [
          { text: "Dashboard BPBK menampilkan rangkuman data kasus, konseling aktif, dan tindak lanjut terbaru." },
          { text: "Pilih 'Data Kasus Siswa' untuk mencari profil lengkap siswa beserta riwayat pembinaannya." },
          { text: "Gunakan 'Kasus BK (Parent Entity)' untuk mendata akar masalah pelanggaran siswa secara klinis." }
        ]
      }}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-2">Menu Navigasi BK</span>
            <nav className="space-y-1.5">
              {menuItems?.map(item => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
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
        <Modal isOpen={isDetailOpen} onClose={handleCloseDetail} title="Profil Lengkap & Linimasa Siswa" size="4xl">
          <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
            {selectedSiswaId && (
              <SiswaForm
                siswaId={selectedSiswaId}
                mode="view"
                onSuccess={handleDetailSuccess}
                onCancel={handleCloseDetail}
              />
            )}
          </Suspense>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default BpbkWorkspacePage;


