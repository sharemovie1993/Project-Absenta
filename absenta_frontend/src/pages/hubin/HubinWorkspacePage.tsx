import React, { useState, useEffect, Suspense, useMemo, useCallback, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Clock, 
  Activity, 
  Briefcase, 
  GraduationCap, 
  Hammer, 
  ArrowRight,
  Loader
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

// Import Tab Components via lazy load
const HubinDashboardSection = lazy(() => import('./components/HubinDashboardSection').then(m => ({ default: m.HubinDashboardSection })));
const MitraIndustriSection = lazy(() => import('./MitraIndustriPage').then(m => ({ default: m.MitraIndustriSection })));
const PenempatanPklSection = lazy(() => import('./PenempatanPklPage').then(m => ({ default: m.PenempatanPklSection })));
const AbsensiPklSection = lazy(() => import('./AbsensiPklPage').then(m => ({ default: m.AbsensiPklSection })));
const MonitoringPklSection = lazy(() => import('./MonitoringPklPage').then(m => ({ default: m.MonitoringPklSection })));
const BkkSection = lazy(() => import('./components/BkkSection').then(m => ({ default: m.BkkSection })));
const TracerStudySection = lazy(() => import('./components/TracerStudySection').then(m => ({ default: m.TracerStudySection })));
const TefaSection = lazy(() => import('./components/TefaSection').then(m => ({ default: m.TefaSection })));

type ActiveMenu = 
  | 'dashboard'
  | 'mitra'
  | 'penempatan'
  | 'absensi'
  | 'monitoring'
  | 'bkk'
  | 'tracer'
  | 'tefa';

interface MenuItem {
  id: ActiveMenu;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
}

export const HubinWorkspacePage: React.FC = () => {
  const { user } = useAuthStore();
  const { can, canAny } = useAuth();
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  
  const isStudent = user?.role?.name === 'SISWA';
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('absensi');

  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];
    
    if (can('dashboard.view.hubin')) {
      items.push({ id: 'dashboard', label: 'Dashboard Analitik', icon: LayoutDashboard, colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' });
    }
    if (canAny(['hubin.partners.manage', 'hubin.mou.view.list'])) {
      items.push({ id: 'mitra', label: 'Kemitraan & MoU', icon: Building2, colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' });
    }
    if (canAny(['hubin.pkl.manage', 'hubin.pkl.view.list'])) {
      items.push({ id: 'penempatan', label: 'Penempatan PKL', icon: Users, colorClass: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20' });
    }
    if (canAny(['hubin.self.pkl', 'hubin.absensi.view.history', 'hubin.pkl.view.list'])) {
      items.push({ id: 'absensi', label: isStudent ? 'Presensi & Jurnal PKL' : 'Presensi Mandiri Siswa', icon: Clock, colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' });
    }
    if (canAny(['hubin.pkl.view.list', 'hubin.logbook.manage'])) {
      items.push({ id: 'monitoring', label: 'Monitoring & Jurnal', icon: Activity, colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' });
    }
    if (canAny(['hubin.self.bkk', 'hubin.bkk.manage', 'hubin.lamaran.manage', 'hubin.partners.manage', 'hubin.pkl.view.list'])) {
      items.push({ id: 'bkk', label: isStudent ? 'Lowongan Kerja (BKK)' : 'BKK & Lowongan Kerja', icon: Briefcase, colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' });
    }
    if (canAny(['hubin.self.tracer', 'hubin.tracer.view', 'hubin.partners.manage'])) {
      items.push({ id: 'tracer', label: isStudent ? 'Tracer Study Alumni' : 'Tracer Study (Alumni)', icon: GraduationCap, colorClass: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' });
    }
    if (can('hubin.tefa.manage')) {
      items.push({ id: 'tefa', label: 'Teaching Factory (TEFA)', icon: Hammer, colorClass: 'text-slate-600 bg-slate-100 dark:bg-slate-850/20' });
    }
    
    return items;
  }, [can, canAny, isStudent]);

  useEffect(() => {
    const allowedMenuIds = menuItems?.map(item => item.id) || [];
    if (tab && allowedMenuIds.includes(tab as ActiveMenu)) {
      setActiveMenu(tab as ActiveMenu);
    } else if (allowedMenuIds.length > 0) {
      setActiveMenu(allowedMenuIds[0]);
    }
  }, [tab, menuItems]);

  const handleTabChange = useCallback((menuId: ActiveMenu) => {
    setActiveMenu(menuId);
    navigate(`/hubin/${menuId}`);
  }, [navigate]);

  const renderActiveSection = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <HubinDashboardSection onNavigateTab={(tabId) => handleTabChange(tabId as ActiveMenu)} />;
      case 'mitra':
        return <MitraIndustriSection hideLayout={true} />;
      case 'penempatan':
        return <PenempatanPklSection hideLayout={true} />;
      case 'absensi':
        return <AbsensiPklSection hideLayout={true} />;
      case 'monitoring':
        return <MonitoringPklSection hideLayout={true} />;
      case 'bkk':
        return <BkkSection />;
      case 'tracer':
        return <TracerStudySection />;
      case 'tefa':
        return <TefaSection />;
      default:
        return isStudent ? <AbsensiPklSection hideLayout={true} /> : <HubinDashboardSection onNavigateTab={(tabId) => handleTabChange(tabId as ActiveMenu)} />;
    }
  };

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pusat Kendali Hubungan Industri"
      description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri, mencakup pengelolaan mitra, MoU, program PKL, BKK lowongan kerja, Tracer Study alumni, dan Teaching Factory."
    >
      <AcademicPageLayout 
        title={isStudent ? "Portal Hubungan Industri (HUBIN)" : "Pusat Kendali Hubungan Industri (HUBIN)"} 
        description={isStudent ? "Akses presensi PKL, bursa kerja khusus, dan kuesioner tracer study" : "Kelola kemitraan industri, program PKL, BKK lowongan kerja, tracer study alumni, dan teaching factory (TEFA)."}
        hardeningModuleKey="hubin_workspace"
        instruction={{
          title: "Panduan Portal Hubungan Industri (HUBIN)",
          items: [
            { text: "Pilih menu navigasi di panel kiri untuk mengakses sub-modul Hubungan Industri." },
            { text: "Dashboard Analitik menampilkan ringkasan data keterserapan alumni dan keaktifan PKL." },
            { text: "Bursa Kerja Khusus (BKK) dapat diakses oleh alumni untuk melamar lowongan pekerjaan industri." }
          ]
        }}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'HUBIN Workspace', path: '/hubin' }
        ]}
      >
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-2">Menu Navigasi HUBIN</span>
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
            <div className="transition-all duration-550 ease-in-out">
              <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
                {renderActiveSection()}
              </Suspense>
            </div>
          </div>

        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default HubinWorkspacePage;
