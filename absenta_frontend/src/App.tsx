import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { Toaster, toast } from 'react-hot-toast';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { PendingPaymentBlocker } from './components/billing/PendingPaymentBlocker';

// Core Components (Static)
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PetugasRoute } from './components/auth/PetugasRoute';
import { Loader } from './components/ui/Loader';
import { Button, Modal, ModalFooter } from './components/ui';
import RoleSwitch from './components/routing/RoleSwitch';

// Context & Stores
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './providers/ThemeProvider';
import { ConfirmProvider } from '@/providers/ConfirmProvider';
import { SocketProvider } from './contexts/SocketContext';
import { LogService } from './utils/LogService';
import { loadActiveSystemConfig } from './services/systemConfig';
import { AttendanceErrorBoundary } from './components/attendance/AttendanceErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';

// Lazy Loaded Pages
const CheckEmail = lazy(() => import('./pages/auth/CheckEmail'));
const RegisterTenant = lazy(() => import('./pages/auth/RegisterTenant'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordConfirmPage = lazy(() => import('./pages/auth/ResetPasswordConfirmPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const OnboardingDashboard = lazy(() => import('./pages/dashboard/OnboardingDashboard'));
const SuspendedPage = lazy(() => import('./pages/system/SuspendedPage'));
const CancelledPage = lazy(() => import('./pages/system/CancelledPage'));
const DashboardOverview = lazy(() => import('./pages/dashboard/DashboardOverview'));
const BillingsPage = lazy(() => import('./pages/billing/BillingsPage'));
const BillingSettingsPage = lazy(() => import('./pages/billing/BillingSettingsPage'));
const PaymentsPageBilling = lazy(() => import('./pages/billing/PaymentsPage'));
const MonitoringPageBilling = lazy(() => import('./pages/billing/MonitoringPage'));
const PlansPage = lazy(() => import('./pages/billing/PlansPage'));
const SubscriptionsPage = lazy(() => import('./pages/billing/SubscriptionsPage'));
const BillingDashboardPage = lazy(() => import('./pages/billing/BillingDashboardPage'));
const BillingReportsPage = lazy(() => import('./pages/billing/BillingReportsPage'));
const ApprovalsPage = lazy(() => import('./pages/billing/ApprovalsPage'));
const CheckoutPage = lazy(() => import('./pages/billing/CheckoutPage'));
const ServiceCenterPage = lazy(() => import('./pages/billing/ServiceCenterPage'));
const RABCalculatorPage = lazy(() => import('./pages/billing/RABCalculatorPage').then(m => ({ default: m.RABCalculatorPage })));
const SIPLaHAuditVerifyPage = lazy(() => import('./pages/public/SIPLaHAuditVerifyPage'));
const AttendanceOpsPage = lazy(() => import('./pages/attendance/ops/AttendanceOpsPage'));
const MonitoringKbmPage = lazy(() => import('./pages/attendance/monitoring/MonitoringKbmPage'));
// Removed GerbangPage import

const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const TenantsPage = lazy(() => import('./pages/tenants/TenantsPage'));
const TenantDetailPage = lazy(() => import('./pages/superadmin/TenantDetailPage'));
const InfrastructureDashboard = lazy(() => import('./pages/superadmin/infra/InfrastructureDashboard'));
const InfraControlCenterPage = lazy(() => import('./pages/superadmin/infra/InfraControlCenterPage'));
const PlatformIntelligencePage = lazy(() => import('./pages/superadmin/PlatformIntelligencePage'));
const RevenueIntelligencePage = lazy(() => import('./pages/superadmin/intelligence/RevenueIntelligencePage'));
const UpgradeIntelligencePage = lazy(() => import('./pages/superadmin/intelligence/UpgradeIntelligencePage'));
const RevenueDashboardPage = lazy(() => import('./pages/superadmin/revenue/RevenueDashboardPage'));
const BackupsPage = lazy(() => import('./pages/superadmin/BackupsPage'));
const MapelPresetsPage = lazy(() => import('./pages/superadmin/MapelPresetsPage'));
const TopikPresetsPage = lazy(() => import('./pages/superadmin/TopikPresetsPage'));
const LibraryTemplatesPage = lazy(() => import('./pages/superadmin/LibraryTemplatesPage'));
const CalendarPresetsPage = lazy(() => import('./pages/superadmin/CalendarPresetsPage'));

const KurikulumStandardsPage = lazy(() => import('./pages/superadmin/KurikulumStandardsPage'));
const JurusanPresetsPage = lazy(() => import('./pages/superadmin/JurusanPresetsPage'));
const SupportTicketPage = lazy(() => import('./pages/support/SupportTicketPage'));
const AdminSupportTicketPage = lazy(() => import('./pages/superadmin/support/AdminSupportTicketPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const DocumentCenterPage = lazy(() => import('./pages/documents/DocumentCenterPage'));
const DocumentActivityPage = lazy(() => import('./pages/documents/DocumentActivityPage'));
const MemberDocsPage = lazy(() => import('./pages/documents/MemberDocsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const SubscriptionList = lazy(() => import('./pages/notifications/SubscriptionList'));
const TrialEmailSequencePage = lazy(() => import('./pages/notifications/TrialEmailSequencePage'));
const WhatsAppHealthPage = lazy(() => import('./pages/notifications/WhatsAppHealthPage'));
const AcademicDashboard = lazy(() => import('./pages/academic/AcademicDashboard'));
const AcademicTransitionPage = lazy(() => import('./pages/academic/transition/AcademicTransitionPage'));
const CetakBerkasPage = lazy(() => import('./pages/academic/CetakBerkasPage').then(m => ({ default: m.CetakBerkasPage })));
const CetakBerkasKurikulumPage = lazy(() => import('./pages/kurikulum/CetakBerkasKurikulumPage').then(m => ({ default: m.CetakBerkasKurikulumPage })));
const CetakBerkasKesiswaanPage = lazy(() => import('./pages/kesiswaan/CetakBerkasKesiswaanPage').then(m => ({ default: m.CetakBerkasKesiswaanPage })));
const CetakBerkasAbsensiPage = lazy(() => import('./pages/attendance/CetakBerkasAbsensiPage').then(m => ({ default: m.CetakBerkasAbsensiPage })));
const CetakBerkasBkPage = lazy(() => import('./pages/bpbk/CetakBerkasBkPage').then(m => ({ default: m.CetakBerkasBkPage })));
const CetakBerkasSarprasPage = lazy(() => import('./pages/sarpras/CetakBerkasSarprasPage').then(m => ({ default: m.CetakBerkasSarprasPage })));
const CetakBerkasHubinPage = lazy(() => import('./pages/hubin/CetakBerkasHubinPage').then(m => ({ default: m.CetakBerkasHubinPage })));
const BackupPage = lazy(() => import('./pages/academic/BackupPage'));
const StaffActivityLogPage = lazy(() => import('./pages/academic/StaffActivityLogPage'));
const PpdbMappingPage = lazy(() => import('./pages/academic/ppdb/PpdbMappingPage'));

// Named exports handled via lazy
const GuruPage = lazy(() => import('./pages/academic/GuruPage').then(module => ({ default: module.GuruPage })));
const SiswaPage = lazy(() => import('./pages/academic/SiswaPage'));
const KelasPage = lazy(() => import('./pages/academic/KelasPage').then(module => ({ default: module.KelasPage })));
const MapelPage = lazy(() => import('./pages/academic/MapelPage'));
const TahunPelajaranPage = lazy(() => import('./pages/academic/TahunPelajaranPage').then(module => ({ default: module.TahunPelajaranPage })));
const SemesterPage = lazy(() => import('./pages/academic/SemesterPage'));
const JurusanPage = lazy(() => import('./pages/academic/JurusanPage').then(module => ({ default: module.JurusanPage })));
const JenisKegiatanMasterPage = lazy(() => import('./pages/academic/JenisKegiatanMasterPage'));
const WaliKelasPage = lazy(() => import('./pages/kurikulum/WaliKelasPage'));
const GuruMapelPage = lazy(() => import('./pages/kurikulum/GuruMapelPage'));
const StrukturOrganisasiPage = lazy(() => import('./pages/academic/struktur-organisasi/StrukturOrganisasiPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const WhatsappSettingsPage = lazy(() => import('./pages/settings/WhatsappSettingsPage'));
const SystemUpdatePage = lazy(() => import('./pages/settings/SystemUpdatePage'));
const EasyTunnelPage = lazy(() => import('./pages/system/EasyTunnelPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const ComponentsDemo = lazy(() => import('./pages/ComponentsDemo'));
const MenuManagementPage = lazy(() => import('./pages/management/MenuManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/management/RoleManagementPage'));
const MenuAuditPage = lazy(() => import('./pages/management/MenuAuditPage'));
const TripayHealthPage = lazy(() => import('./pages/billing/TripayHealthPage'));
const TripaySimulatorPage = lazy(() => import('./pages/billing/TripaySimulatorPage'));
// Removed GerbangRecordsPage import
// Removed SesiPage import
const GuruMonitoringPage = lazy(() => import('./pages/attendance/GuruMonitoringPage'));
const FaceTemplatePage = lazy(() => import('./pages/attendance/FaceTemplatePage'));
const DeviceManagementPage = lazy(() => import('./pages/attendance/DeviceManagementPage'));
const RekapBulananSiswaPage = lazy(() => import('./pages/attendance/rekap/RekapBulananSiswaPage'));

const RekapBulananKelasPage = lazy(() => import('./pages/attendance/rekap/RekapBulananKelasPage'));
const RekapHarianSiswaPage = lazy(() => import('./pages/attendance/rekap/RekapHarianSiswaPage'));
const RekapPage = lazy(() => import('./pages/attendance/rekap/RekapPage'));
const MyAttendancePage = lazy(() => import('./pages/attendance/MyAttendancePage').then(module => ({ default: module.MyAttendancePage })));
const RiwayatAjarPage = lazy(() => import('./pages/attendance/RiwayatAjarPage').then(module => ({ default: module.RiwayatAjarPage })));

// Cooperative Pages
const CoopDashboard = lazy(() => import('./pages/cooperative/Dashboard'));
const CoopMembers = lazy(() => import('./pages/cooperative/Members'));
const CoopSavings = lazy(() => import('./pages/cooperative/Savings'));
const CoopLoans = lazy(() => import('./pages/cooperative/Loans'));
const CoopLoanDetail = lazy(() => import('./pages/cooperative/LoanDetail'));
const CoopPOS = lazy(() => import('./pages/cooperative/POS'));
const CoopVouchers = lazy(() => import('./pages/cooperative/Vouchers'));
const CoopPPOB = lazy(() => import('./pages/cooperative/PPOB'));
const CoopReports = lazy(() => import('./pages/cooperative/Accounting'));
const CoopSettings = lazy(() => import('./pages/cooperative/Settings'));
const CoopSHU = lazy(() => import('./pages/cooperative/SHU'));
const CoopProducts = lazy(() => import('./pages/cooperative/Products'));
const CoopInventoryReport = lazy(() => import('./pages/cooperative/LaporanInventori'));
const CoopAnnouncements = lazy(() => import('./pages/cooperative/Announcements'));
const CoopTickets = lazy(() => import('./pages/cooperative/Tickets'));
const CoopTicketDetail = lazy(() => import('./pages/cooperative/TicketDetail'));
const KurikulumDashboard = lazy(() => import('./pages/kurikulum/Dashboard'));
const CorrespondenceDashboard = lazy(() => import('./pages/correspondence/Dashboard'));
const RaporDashboard = lazy(() => import('./pages/rapor/Dashboard'));
const PerangkatAjarPage = lazy(() => import('./pages/kurikulum/PerangkatAjarPage'));
const InputNilaiPage = lazy(() => import('./pages/rapor/InputNilaiPage'));
const CetakRaporPage = lazy(() => import('./pages/rapor/CetakRaporPage'));
const P5Page = lazy(() => import('./pages/rapor/P5Page'));
const CbtDashboard = lazy(() => import('./pages/cbt/Dashboard'));
const TrackingSiswaPage = lazy(() => import('./pages/attendance/TrackingSiswaPage'));
const JadwalKegiatanPage = lazy(() => import('./pages/attendance/JadwalKegiatanPage'));
const AnggotaKegiatanEskulPage = lazy(() => import('./pages/attendance/AnggotaKegiatanEskulPage'));
const PetugasPage = lazy(() => import('./pages/attendance/PetugasPage'));
const AttendanceSettingsPage = lazy(() => import('./pages/attendance/AttendanceSettingsPage'));
const AttendanceDashboardPage = lazy(() => import('./pages/attendance/AttendanceDashboardPage'));
// Removed KegiatanPage and ManualPage per deprecation request
const StudentCardPage = lazy(() => import('./pages/academic/StudentCardPage'));
const HomePage = lazy(() => import('./pages/public/HomePage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const LearnMorePage = lazy(() => import('./pages/public/LearnMorePage'));
const AboutUsPage = lazy(() => import('./pages/public/AboutUsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/public/TermsOfServicePage'));
const DataProcessingAgreementPage = lazy(() => import('./pages/public/DataProcessingAgreementPage'));
const ServicesCatalogPage = lazy(() => import('./pages/public/ServicesCatalogPage'));
const ServiceDetailPage = lazy(() => import('./pages/public/ServiceDetailPage'));
const SuratKeluarQuickApprovePage = lazy(() => import('./pages/public/SuratKeluarQuickApprovePage'));
const SuratKeluarPublicViewPage = lazy(() => import('./pages/public/SuratKeluarPublicViewPage'));
const EmailVerificationStatusPage = lazy(() => import('./pages/public/EmailVerificationStatusPage'));
const SubdomainRedirect = lazy(() => import('./pages/auth/SubdomainRedirect'));

const PelanggaranPage = lazy(() => import('./pages/kesiswaan/PelanggaranPage'));
const JenisPelanggaranPage = lazy(() => import('./pages/kesiswaan/JenisPelanggaranPage'));
const MonitoringKesiswaanPage = lazy(() => import('./pages/kesiswaan/MonitoringKesiswaanPage'));

const SuratMasukPage = lazy(() => import('./pages/correspondence/SuratMasukPage'));
const SuratKeluarPage = lazy(() => import('./pages/correspondence/SuratKeluarPage'));
const PiketPage = lazy(() => import('./pages/kesiswaan/PiketPage'));
const PrestasiPage = lazy(() => import('./pages/kesiswaan/PrestasiPage'));
const KesiswaanSettingsPage = lazy(() => import('./pages/kesiswaan/SettingsPage'));
const BpbkWorkspacePage = lazy(() => import('./pages/bpbk/BpbkWorkspacePage'));
const BpbkBkDashboardPage = lazy(() => import('./pages/bpbk/DashboardPage'));
const BpbkSiswaPage = lazy(() => import('./pages/bpbk/SiswaKasusPage'));
const BpbkCasesPage = lazy(() => import('./pages/bpbk/CasesPage'));
const BpbkKonselingPage = lazy(() => import('./pages/bpbk/KonselingPage'));
const BpbkPemanggilanPage = lazy(() => import('./pages/bpbk/PemanggilanPage'));
const BpbkHomeVisitPage = lazy(() => import('./pages/bpbk/HomeVisitPage'));
const BpbkAsesmenPage = lazy(() => import('./pages/bpbk/AsesmenPage'));
const BpbkRujukanPage = lazy(() => import('./pages/bpbk/RujukanPage'));
const BpbkReportsPage = lazy(() => import('./pages/bpbk/ReportsPage'));
const BpbkAuditPage = lazy(() => import('./pages/bpbk/AuditPage'));
const SupervisiPage = lazy(() => import('./pages/kurikulum/SupervisiPage'));
const StrukturKurikulumPage = lazy(() => import('./pages/kurikulum/StrukturKurikulumPage'));
const MasterStrukturPage = lazy(() => import('./pages/kurikulum/MasterStrukturPage'));
const JadwalPelajaranPage = lazy(() => import('./pages/kurikulum/JadwalPelajaranPage'));
const JadwalPiketGuruPage = lazy(() => import('./pages/kurikulum/JadwalPiketGuruPage'));
const KalenderAkademikPage = lazy(() => import('./pages/kurikulum/KalenderAkademikPage'));
const JamKBMPage = lazy(() => import('./pages/kurikulum/JamKBMPage'));
const RekapKBMPage = lazy(() => import('./pages/kurikulum/RekapKBMPage'));
const SarprasInventoryPage = lazy(() => import('./pages/sarpras/SarprasInventoryPage'));
const SarprasLoansPage = lazy(() => import('./pages/sarpras/SarprasLoansPage'));
const SarprasMaintenancePage = lazy(() => import('./pages/sarpras/SarprasMaintenancePage'));
const SarprasDashboard = lazy(() => import('./pages/sarpras/SarprasDashboard'));
const SarprasCatalogPage = lazy(() => import('./pages/sarpras/SarprasCatalogPage').then(m => ({ default: m.SarprasCatalogPage })));




// Error Pages
const ForbiddenPage = lazy(() => import('./pages/error/ForbiddenPage'));
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));
const ServerErrorPage = lazy(() => import('./pages/error/ServerErrorPage'));

// Hubin Module
const HubinWorkspacePage = lazy(() => import('./pages/hubin/HubinWorkspacePage'));
const HubinDashboardPage = lazy(() => import('./pages/hubin/HubinDashboardPage'));
const MitraIndustriPage = lazy(() => import('./pages/hubin/MitraIndustriPage'));
const PenempatanPklPage = lazy(() => import('./pages/hubin/PenempatanPklPage'));
const AbsensiPklPage = lazy(() => import('./pages/hubin/AbsensiPklPage'));
const MonitoringPklPage = lazy(() => import('./pages/hubin/MonitoringPklPage'));
const BkkPage = lazy(() => import('./pages/hubin/BkkPage'));
const TracerStudyPage = lazy(() => import('./pages/hubin/TracerStudyPage'));
const TefaPage = lazy(() => import('./pages/hubin/TefaPage'));

// Parent App Pages
const ParentApp = lazy(() => import('./apps/parent/App'));



// queryClient now imported from ./lib/queryClient

function App() {
  const { isAuthenticated, user, hasCompletedOnboarding, loadUser, isLoading } = useAuthStore();
  const isSaas = import.meta.env.VITE_DEPLOY_MODE !== 'ON_PREMISE';
  const shouldOnboard = false; // Disabled per user request
  const isImpersonating = !!localStorage.getItem('support_auth_state');

  // Intercept quick_login_token & support_token query param for Quick Login from WhatsApp / Licensing Server
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quickToken = urlParams.get('quick_login_token') || urlParams.get('quick_token');
    const supportToken = urlParams.get('support_token');
    const activeToken = quickToken || supportToken;

    if (activeToken) {
      if (supportToken) {
        // Back up existing session for Support Impersonation Mode
        const currentStorage = localStorage.getItem('auth-storage');
        if (currentStorage && !localStorage.getItem('support_auth_state')) {
          localStorage.setItem('support_auth_state', currentStorage);
        }
      }
      
      // Set token into local storage
      localStorage.setItem('access_token', activeToken);
      
      // Clear query parameters from URL cleanly
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Force load user profile into Zustand auth state
      loadUser().then(() => {
        if (quickToken) {
          toast.success('Quick Login WhatsApp berhasil! Selamat datang di Absenta.');
        } else {
          toast.success('Bypass login berhasil! Masuk ke Mode Asisten.');
        }
      }).catch(console.error);
    }
  }, [loadUser]);

  const handleExitImpersonate = () => {
    const supportStateRaw = localStorage.getItem('support_auth_state');
    if (supportStateRaw) {
      // 1. Pulihkan auth-storage
      localStorage.setItem('auth-storage', supportStateRaw);
      
      // 2. Parse dan pulihkan state ke Zustand
      const supportState = JSON.parse(supportStateRaw);
      const stateData = supportState.state;
      
      localStorage.setItem('access_token', stateData.token || '');
      localStorage.setItem('refresh_token', stateData.refreshToken || '');
      if (stateData.user?.tenant_id) {
        localStorage.setItem('tenant_id', stateData.user.tenant_id);
      } else {
        localStorage.removeItem('tenant_id');
      }
      
      useAuthStore.setState({
        user: stateData.user,
        isAuthenticated: stateData.isAuthenticated,
        token: stateData.token,
        tenantId: stateData.tenantId,
        tenantMode: stateData.tenantMode,
        subscription: stateData.subscription,
        hasCompletedOnboarding: stateData.hasCompletedOnboarding
      });
      
      // 3. Hapus support_auth_state penanda mode asisten
      localStorage.removeItem('support_auth_state');
      
      // 4. Toast & Redirect kembali ke daftar tenant
      toast.success('Kembali ke Sesi Support Utama!');
      setTimeout(() => {
        window.location.href = '/tenants';
      }, 800);
    }
  };

  useEffect(() => {
    LogService.info('App initialized');

    // Final Auth Rehydration Fix:
    // Ensure we always rehydrate the user from the backend on bootstrap
    // to get the latest capabilities, regardless of localStorage cache.
    // This makes the Backend the Source of Truth.
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUser().catch(console.error);
    }
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadActiveSystemConfig().catch((err) => {
        console.warn('Failed to load active system config', err);
      });
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <SocketProvider>
            <BrowserRouter>
              {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-sky-600 via-blue-700 to-sky-600 text-white text-center py-2.5 px-4 shadow-lg flex items-center justify-between transition-all duration-300">
                  <div className="flex items-center space-x-2 mx-auto md:mx-0">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] md:text-xs font-bold tracking-wide">
                      MODE ASISTEN AKTIF: Anda sedang mengasistensi dashboard <span className="underline decoration-wavy decoration-emerald-400 font-black">{(user as any)?.tenant?.name || 'Sekolah Target'}</span> ({user?.email})
                    </span>
                  </div>
                  <button
                    onClick={handleExitImpersonate}
                    className="mt-2 md:mt-0 text-[10px] md:text-xs font-black uppercase tracking-wider bg-white text-blue-700 hover:bg-slate-100 px-3.5 py-1.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  >
                    Kembali ke Panel Support
                  </button>
                </div>
              )}
              <Toaster 
                position="top-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                  duration: 5000,
                  style: {
                    borderRadius: '20px',
                    background: '#fff',
                    color: '#333',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1), 0 10px 20px -5px rgba(0,0,0,0.05)',
                    padding: '16px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    maxWidth: '450px',
                    border: '1px solid rgba(0,0,0,0.05)'
                  },
                  success: {
                    style: {
                      background: '#10B981',
                      color: '#fff',
                      boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2)',
                    },
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#10B981',
                    },
                  },
                  error: {
                    className: 'premium-toast-error',
                    style: {
                      background: '#EF4444',
                      color: '#fff',
                      boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2)',
                    },
                    iconTheme: {
                      primary: '#fff',
                      secondary: '#EF4444',
                    },
                  },
                }}
              />
              <ScrollToTop />
              {/* <GlobalSubscriptionIssueModal /> */}
            {isLoading ? (
              <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Sesi...</p>
                </div>
              </div>
            ) : (
              <Routes>
                {/* Public routes */}
                <Route path="/home" element={<HomePage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/learn-more" element={<LearnMorePage />} />
                <Route path="/about" element={<AboutUsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/dpa" element={<DataProcessingAgreementPage />} />
                <Route path="/register-tenant" element={<RegisterTenant />} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/reset-password" element={<ResetPasswordConfirmPage />} />
                <Route path="/subdomain-redirect" element={<SubdomainRedirect />} />
                <Route path="/services/:slug" element={<ServiceDetailPage />} />
                <Route path="/surat-keluar/quick-approve/:token" element={<SuratKeluarQuickApprovePage />} />
                <Route path="/surat-keluar/public-view/:token" element={<SuratKeluarPublicViewPage />} />
                <Route path="/verify-email/status" element={<EmailVerificationStatusPage />} />
                <Route path="/verify-email/status/:token" element={<EmailVerificationStatusPage />} />
                
                {/* Error Routes */}
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/500" element={<ServerErrorPage />} />

                {/* Parent App Mount (BYPASS AUTH GUARD) */}
                <Route path="/parent-app/*" element={<ParentApp />} />

                {/* Legacy Parent App Redirect - DISABLED to fix route mount */}
                {/* <Route path="/parent-app/*" element={<Navigate to="/parent" replace />} /> */}
                <Route path="/parent/*" element={<Navigate to="/parent-app" replace />} />
                

                <Route path="/login" element={
                  !isAuthenticated ? <AuthLayout /> : <Navigate to={'/'} replace />
                }>
                  <Route index element={<LoginPage />} />
                  {/* Registrasi user biasa dinonaktifkan. Gunakan /register-tenant di rute publik */}
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                {/* Protected routes */}
                <Route path="/" element={
                  isAuthenticated ? <MainLayout /> : <UnauthedGate />
                }>
                  <Route element={<ProtectedRoute />}>
                    <Route index element={<Navigate to={'/dashboard'} replace />} />
                    <Route path="/onboarding" element={<OnboardingDashboard />} />
                    <Route path="/dashboard" element={
                      <ProtectedRoute requiredCapability="dashboard.view.overview">
                        <DashboardOverview />
                      </ProtectedRoute>
                    } />
                    <Route path="/suspended" element={<SuspendedPage />} />
                    <Route path="/cancelled" element={<CancelledPage />} />
                    
                    {/* Academic Routes */}
                    <Route path="/academic" element={
                      <ProtectedRoute requiredCapability="academic.students.view.list">
                        <AcademicDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/guru" element={
                      <ProtectedRoute requiredCapability="academic.teachers.view.list">
                        <GuruPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/academic/siswa" element={
                      <ProtectedRoute requiredCapability="academic.students.view.list">
                        <SiswaPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/ppdb-mapping" element={
                      <ProtectedRoute requiredCapability="academic.students.update">
                        <PpdbMappingPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/kelas" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <KelasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/mapel" element={
                      <ProtectedRoute requiredCapability="academic.subjects.view.list">
                        <MapelPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/tahun-pelajaran" element={
                      <ProtectedRoute requiredCapability="academic.years.view.list">
                        <TahunPelajaranPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/semester" element={
                      <ProtectedRoute requiredCapability="academic.semesters.view.list">
                        <SemesterPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/jurusan" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <JurusanPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/jenis-kegiatan" element={
                      <ProtectedRoute requiredCapability="academic.activities.types.manage">
                        <JenisKegiatanMasterPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/academic/transition" element={
                      <ProtectedRoute requiredCapability="academic.promotions.manage">
                        <AcademicTransitionPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="academic.years.view.list">
                        <CetakBerkasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/prep-checklist" element={<Navigate to="/academic/cetak-berkas" replace />} />
                    {/* Alias for menu item 'Kenaikan Kelas' */}
                    <Route path="/academic/kenaikan-kelas" element={<Navigate to="/academic/transition" replace />} />
                    <Route path="/academic/siswa-cards" element={
                      <ProtectedRoute requiredCapability="academic.student.card.view.config">
                        <StudentCardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/struktur-organisasi" element={
                      <ProtectedRoute requiredCapability={['academic.structures.view.tree', 'academic.structures.view.list']}>
                        <StrukturOrganisasiPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/backup" element={
                      <ProtectedRoute requiredCapability="academic.backups.view.list">
                        <BackupPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/academic/staff-logs" element={
                      <ProtectedRoute requiredCapability="core.sekolah.view.profile">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <StaffActivityLogPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Kesiswaan Routes */}
                    <Route path="/kesiswaan/pelanggaran" element={
                      <ProtectedRoute requiredCapability="affairs.violations.view.list">
                        <PelanggaranPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kesiswaan/jenis-pelanggaran" element={
                      <ProtectedRoute requiredCapability="affairs.violation.types.view.list">
                        <JenisPelanggaranPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kesiswaan/prestasi" element={
                      <ProtectedRoute requiredCapability="kesiswaan.prestasi.view">
                        <PrestasiPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kesiswaan/settings" element={
                      <ProtectedRoute requiredCapability="affairs.violation.types.view.list">
                        <KesiswaanSettingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kesiswaan/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="affairs.violations.view.list">
                        <CetakBerkasKesiswaanPage />
                      </ProtectedRoute>
                    } />

                    {/* Correspondence Routes */}
                    <Route path="/correspondence/dashboard" element={
                      <ProtectedRoute requiredCapability="correspondence.inbox.view">
                        <CorrespondenceDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/correspondence/surat-masuk" element={
                      <ProtectedRoute requiredCapability="correspondence.inbox.view">
                        <SuratMasukPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/correspondence/surat-keluar" element={
                      <ProtectedRoute requiredCapability="correspondence.outbox.view">
                        <SuratKeluarPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/bpbk" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkWorkspacePage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/dashboard" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkBkDashboardPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/siswa" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkSiswaPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/cases" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkCasesPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/konseling" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkKonselingPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/pemanggilan" element={
                      <ProtectedRoute requiredCapability="bk.summons.manage">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkPemanggilanPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/homevisit" element={
                      <ProtectedRoute requiredCapability="bk.homevisit.manage">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkHomeVisitPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/asesmen" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkAsesmenPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/rujukan" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkRujukanPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/reports" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkReportsPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/audit" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BpbkAuditPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/bpbk/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="bk.cases.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <CetakBerkasBkPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Hubin Module */}
                    <Route path="/hubin" element={
                      <ProtectedRoute requiredCapability={['dashboard.view.hubin', 'hubin.partners.manage', 'hubin.guidance.manage', 'hubin.pkl.view.list', 'hubin.view.pkl', 'hubin.self.pkl', 'hubin.self.logbook', 'hubin.self.tracer', 'hubin.self.bkk', 'hubin.bkk.manage', 'hubin.lamaran.manage', 'hubin.tracer.view', 'hubin.mou.view.list', 'hubin.tefa.manage']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <HubinWorkspacePage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/dashboard" element={
                      <ProtectedRoute requiredCapability="dashboard.view.hubin">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <HubinDashboardPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/mitra" element={
                      <ProtectedRoute requiredCapability={['hubin.partners.manage', 'hubin.mou.view.list']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <MitraIndustriPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/penempatan" element={
                      <ProtectedRoute requiredCapability={['hubin.pkl.manage', 'hubin.pkl.view.list']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <PenempatanPklPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/absensi" element={
                      <ProtectedRoute requiredCapability={['hubin.self.pkl', 'hubin.absensi.view.history', 'hubin.pkl.view.list']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <AbsensiPklPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/monitoring" element={
                      <ProtectedRoute requiredCapability={['hubin.pkl.view.list', 'hubin.logbook.manage']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <MonitoringPklPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/bkk" element={
                      <ProtectedRoute requiredCapability={['hubin.self.bkk', 'hubin.bkk.manage', 'hubin.lamaran.manage', 'hubin.partners.manage', 'hubin.pkl.view.list']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <BkkPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/tracer" element={
                      <ProtectedRoute requiredCapability={['hubin.self.tracer', 'hubin.tracer.view', 'hubin.partners.manage']}>
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <TracerStudyPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/tefa" element={
                      <ProtectedRoute requiredCapability="hubin.tefa.manage">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <TefaPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/hubin/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="hubin.pkl.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <CetakBerkasHubinPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Kurikulum Module */}

                    {/* Kurikulum Routes */}
                    <Route path="/kurikulum/dashboard" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <KurikulumDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/supervisi" element={
                      <ProtectedRoute requiredCapability="curriculum.supervision.view.report">
                        <SupervisiPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/struktur" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <StrukturKurikulumPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/plotting" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <MasterStrukturPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/jadwal" element={
                      <ProtectedRoute requiredCapability="academic.schedules.view.list">
                        <JadwalPelajaranPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/jadwal-piket" element={
                      <ProtectedRoute requiredCapability="academic.schedules.view.list">
                        <JadwalPiketGuruPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/jam-kbm" element={
                      <ProtectedRoute requiredCapability="academic.schedules.view.list">
                        <JamKBMPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/kalender" element={
                      <ProtectedRoute requiredCapability="academic.years.view.list">
                        <KalenderAkademikPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/rekap-kbm" element={
                      <ProtectedRoute requiredCapability="academic.teaching.rekap">
                        <RekapKBMPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="academic.structures.view.list">
                        <CetakBerkasKurikulumPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/perangkat" element={
                      <ProtectedRoute requiredCapability="academic.teaching.view">
                        <PerangkatAjarPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/guru-mapel" element={
                      <ProtectedRoute requiredCapability="academic.teaching.view">
                        <GuruMapelPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kurikulum/wali-kelas" element={
                      <ProtectedRoute requiredCapability="academic.homeroom.manage">
                        <WaliKelasPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* Sarpras Routes */}
                    <Route path="/sarpras/dashboard" element={
                      <ProtectedRoute requiredCapability="sarpras.inventory.view.list">
                        <SarprasDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/sarpras/inventory" element={
                      <ProtectedRoute requiredCapability="sarpras.inventory.view.list">
                        <SarprasInventoryPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/sarpras/loans" element={
                      <ProtectedRoute requiredCapability={['sarpras.loans.view.list', 'sarpras.loans.request']}>
                        <SarprasLoansPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/sarpras/maintenance" element={
                      <ProtectedRoute requiredCapability="sarpras.repairs.view.list">
                        <SarprasMaintenancePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/sarpras/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="sarpras.inventory.view.list">
                        <CetakBerkasSarprasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/sarpras/catalog" element={
                      <ProtectedRoute requiredRoles={['SUPERADMIN', 'ADMIN']}>
                        <SarprasCatalogPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* Rapor & CBT Routes */}
                    <Route path="/rapor/dashboard" element={
                      <ProtectedRoute requiredCapability="academic.students.view.list">
                        <RaporDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/rapor/nilai" element={
                      <ProtectedRoute requiredCapability="academic.teaching.view">
                        <InputNilaiPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rapor/cetak" element={
                      <ProtectedRoute requiredCapability="academic.view.wali.kelas">
                        <CetakRaporPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rapor/p5" element={
                      <ProtectedRoute requiredCapability="academic.teaching.view">
                        <P5Page />
                      </ProtectedRoute>
                    } />
                    <Route path="/cbt/dashboard" element={
                      <ProtectedRoute requiredCapability="academic.students.view.list">
                        <CbtDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Cooperative Routes */}
                    <Route path="/menu/cooperative" element={<Navigate to="/cooperative/dashboard" replace />} />
                    <Route path="/cooperative/dashboard" element={
                      <ProtectedRoute>
                        <CoopDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/members" element={
                      <ProtectedRoute requiredCapability="cooperative.members.view.list">
                        <CoopMembers />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/savings" element={
                      <ProtectedRoute requiredCapability="cooperative.savings.view.history">
                        <CoopSavings />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/savings/manage" element={
                      <ProtectedRoute requiredCapability="cooperative.savings.deposit">
                        <CoopSavings />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/loans" element={
                      <ProtectedRoute requiredCapability="cooperative.loans.apply">
                        <CoopLoans />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/loans/manage" element={
                      <ProtectedRoute requiredCapability={['cooperative.loans.approve', 'cooperative.loans.reject', 'cooperative.loans.view.list']}>
                        <CoopLoans />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/loans/:id" element={
                      <ProtectedRoute requiredCapability={['cooperative.loans.view.detail', 'cooperative.loans.apply']}>
                        <CoopLoanDetail />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/pos" element={
                      <ProtectedRoute requiredCapability={['cooperative.store.view.catalog', 'cooperative.store.orders.manage', 'cooperative.store.transactions.view']}>
                        <CoopPOS />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/vouchers" element={
                      <ProtectedRoute requiredCapability={['cooperative.points.view', 'cooperative.vouchers.view.list']}>
                        <CoopVouchers />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/vouchers/manage" element={
                      <ProtectedRoute requiredCapability={['cooperative.vouchers.view.list', 'cooperative.vouchers.manage']}>
                        <CoopVouchers />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/ppob" element={
                      <ProtectedRoute requiredCapability="cooperative.ppob.manage.products">
                        <CoopPPOB />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/reports" element={
                      <ProtectedRoute requiredCapability="cooperative.reports.view.financial">
                        <CoopReports />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/settings" element={
                      <ProtectedRoute requiredCapability="cooperative.settings.view">
                        <CoopSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/products" element={
                      <ProtectedRoute requiredCapability="cooperative.store.products.view.list">
                        <CoopProducts />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/inventory-report" element={
                      <ProtectedRoute requiredCapability="cooperative.store.products.view.list">
                        <CoopInventoryReport />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/shu" element={
                      <ProtectedRoute requiredCapability="cooperative.savings.view.history">
                        <CoopSHU />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/shu/manage" element={
                      <ProtectedRoute requiredCapability="cooperative.shu.view.report">
                        <CoopSHU />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/announcements" element={
                      <ProtectedRoute requiredCapability="cooperative.announcements.view.list">
                        <CoopAnnouncements />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/tickets" element={
                      <ProtectedRoute requiredCapability={['cooperative.tickets.create', 'cooperative.tickets.view.list']}>
                        <CoopTickets />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/tickets/manage" element={
                      <ProtectedRoute requiredCapability="cooperative.tickets.view.list">
                        <CoopTickets />
                      </ProtectedRoute>
                    } />
                    <Route path="/cooperative/tickets/:id" element={
                      <ProtectedRoute requiredCapability={['cooperative.tickets.view.detail', 'cooperative.tickets.create']}>
                        <CoopTicketDetail />
                      </ProtectedRoute>
                    } />

                    {/* Billing Routes */}
                    <Route path="/billing/checkout" element={
                      <ProtectedRoute requiredCapability="billing.my.subscription.create">
                        <CheckoutPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing/my-subscription" element={
                      <ProtectedRoute requiredCapability="billing.my.subscription.view">
                        <Navigate to="/service-center?tab=status" replace />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing" element={
                      <ProtectedRoute requiredCapability="billing.my.subscription.view">
                        <RoleSwitch
                          superadmin={<Navigate to="/billing/dashboard" replace />}
                          admin={<Navigate to="/service-center?tab=status" replace />}
                          fallback={<Navigate to="/service-center?tab=status" replace />}
                        />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing/dashboard" element={
                      <ProtectedRoute requiredCapability="billing.subscriptions.view.list">
                        <BillingDashboardPage />
                      </ProtectedRoute>
                    } />
                    {/* Plans & Subscriptions (SUPERADMIN management only) */}
                    <Route path="/billing/plans" element={
                      <ProtectedRoute requiredCapability="billing.plans.view.list">
                        <PlansPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing/subscriptions" element={
                      <ProtectedRoute requiredCapability="billing.subscriptions.view.active">
                        <SubscriptionsPage />
                      </ProtectedRoute>
                    } />
                    {/* Redirect from legacy path to canonical billing path */}
                    <Route path="/management/subscriptions" element={<Navigate to="/billing/subscriptions" replace />} />
                    <Route path="/billing/billings" element={
                      <ProtectedRoute requiredCapability="billing.invoices.view.list">
                        <RoleSwitch superadmin={<BillingsPage />} fallback={<Navigate to="/service-center?tab=status" replace />} />
                      </ProtectedRoute>
                    } />
                    {/* Owner-only: Approvals */}
                    <Route path="/billing/approvals" element={
                      <ProtectedRoute requiredCapability="billing.subscriptions.view.list">
                        <ApprovalsPage />
                      </ProtectedRoute>
                    } />
                    {/* Owner-only: Billing Settings */}
                    <Route path="/billing/settings" element={
                      <ProtectedRoute requiredCapability="core.system.config.view">
                        <BillingSettingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing/tripay-health" element={<Navigate to="/superadmin/infra/tripay-health" replace />} />
                    <Route path="/billing/tripay-simulator" element={<Navigate to="/superadmin/infra/tripay-simulator" replace />} />
                    <Route path="/billing/payments" element={
                      <ProtectedRoute requiredCapability="billing.payments.view.history">
                        <PaymentsPageBilling />
                      </ProtectedRoute>
                    } />
                    <Route path="/billing/reports" element={
                      <ProtectedRoute requiredCapability="billing.subscriptions.view.list">
                        <BillingReportsPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/users" element={
                      <ProtectedRoute requiredCapability="core.users.view.list">
                        <UsersPage />
                      </ProtectedRoute>
                    } />
                    {isSaas && (
                      <>
                        {/* Owner-only: Tenants management */}
                        <Route path="/tenants" element={
                          <ProtectedRoute requiredCapability="core.tenants.view.list">
                            <TenantsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/tenants/:tenantId" element={
                          <ProtectedRoute requiredCapability="core.tenants.view.detail">
                            <TenantDetailPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/infra" element={
                          <ProtectedRoute
                            requiredCapability={[
                              'superadmin.infra.view.socket.global',
                              'superadmin.infra.view.socket.tenants',
                            ]}
                          >
                            <InfrastructureDashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/infra/jobs" element={
                          <ProtectedRoute requiredCapability="superadmin.infra.monitoring.view">
                            <InfraControlCenterPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/infra/monitoring" element={
                          <ProtectedRoute requiredCapability="billing.reports.view.summary">
                            <MonitoringPageBilling />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/infra/tripay-health" element={
                          <ProtectedRoute requiredCapability="billing.reports.view.summary">
                            <TripayHealthPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/infra/tripay-simulator" element={
                          <ProtectedRoute requiredCapability="payments.test.simulate">
                            <TripaySimulatorPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/intelligence" element={
                          <ProtectedRoute requiredCapability="core.tenants.view.list">
                            <PlatformIntelligencePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/intelligence/revenue" element={
                          <ProtectedRoute requiredCapability="core.tenants.view.list">
                            <RevenueIntelligencePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/intelligence/upgrade" element={
                          <ProtectedRoute requiredCapability="core.tenants.view.list">
                            <UpgradeIntelligencePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/revenue" element={
                          <ProtectedRoute requiredCapability="superadmin.revenue.view.overview">
                            <RevenueDashboardPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/backups" element={
                          <ProtectedRoute requiredCapability="cadangan.view.cadangan">
                            <BackupsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/superadmin/support" element={
                          <ProtectedRoute requiredCapability="admin.tickets.view.list">
                            <AdminSupportTicketPage />
                          </ProtectedRoute>
                        } />
                      </>
                    )}

                    {/* Preset Global Master Routes (ALWAYS ACCESSIBLE TO SUPERADMIN) */}
                    <Route path="/superadmin/mapel-presets" element={<MapelPresetsPage />} />
                    <Route path="/superadmin/topik-presets" element={<TopikPresetsPage />} />
                    <Route path="/superadmin/library-templates" element={<LibraryTemplatesPage />} />
                    <Route path="/superadmin/library" element={<LibraryTemplatesPage />} />
                    <Route path="/superadmin/calendar-presets" element={<CalendarPresetsPage />} />
                    <Route path="/superadmin/jurusan-presets" element={<JurusanPresetsPage />} />
                    <Route path="/superadmin/kurikulum-standards" element={<KurikulumStandardsPage />} />

                    {/* Preset Global Aliases & Canonical Fallbacks */}
                    <Route path="/preset-global/mapel" element={<Navigate to="/superadmin/mapel-presets" replace />} />
                    <Route path="/preset-global/topik" element={<Navigate to="/superadmin/topik-presets" replace />} />
                    <Route path="/preset-global/library" element={<Navigate to="/superadmin/library-templates" replace />} />
                    <Route path="/preset-global/library-templates" element={<Navigate to="/superadmin/library-templates" replace />} />
                    <Route path="/preset-global/bank-library" element={<Navigate to="/superadmin/library-templates" replace />} />
                    <Route path="/preset-global/kalender" element={<Navigate to="/superadmin/calendar-presets" replace />} />
                    <Route path="/preset-global/jurusan" element={<Navigate to="/superadmin/jurusan-presets" replace />} />
                    <Route path="/preset-global/standar-jp" element={<Navigate to="/superadmin/kurikulum-standards" replace />} />
                    <Route path="/superadmin/preset-mapel" element={<Navigate to="/superadmin/mapel-presets" replace />} />
                    <Route path="/superadmin/preset-topik" element={<Navigate to="/superadmin/topik-presets" replace />} />
                    <Route path="/superadmin/preset-library" element={<Navigate to="/superadmin/library-templates" replace />} />
                    <Route path="/superadmin/preset-kalender" element={<Navigate to="/superadmin/calendar-presets" replace />} />
                    <Route path="/superadmin/preset-jurusan" element={<Navigate to="/superadmin/jurusan-presets" replace />} />
                    <Route path="/superadmin/preset-standar-jp" element={<Navigate to="/superadmin/kurikulum-standards" replace />} />




                    <Route path="/support" element={
                      <ProtectedRoute requiredCapability="support.tickets.view">
                        <SupportTicketPage />
                      </ProtectedRoute>
                    } />
                    {/* Services Catalog (Internal Admin Only) */}
                    {/* Unified Service Hub (Satu Pintu) */}
                    <Route path="/service-center" element={
                      <ProtectedRoute requiredCapability="billing.my.subscription.view">
                        <ServiceCenterPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* Backward Compatibility Redirects */}
                    <Route path="/services" element={<Navigate to="/service-center?tab=catalog" replace />} />
                    <Route path="/documents" element={
                      <ProtectedRoute
                        requiredCapability={[
                          'documents.view.list',
                          'documents.upload',
                          'documents.delete'
                        ]}
                      >
                        <DocumentCenterPage />
                      </ProtectedRoute>
                    } />
                    <Route
                      path="/documents/activities"
                      element={
                        <ProtectedRoute requiredCapability="documents.view.list">
                          <DocumentActivityPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/documents/member-docs"
                      element={
                        <ProtectedRoute requiredCapability="academic.students.view.detail">
                           <MemberDocsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/reports" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <ReportsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                      <ProtectedRoute requiredCapability="notify.view.stats">
                        <NotificationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications/trial-sequence" element={
                      <ProtectedRoute requiredCapability="notify.send.test_email">
                        <TrialEmailSequencePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications/whatsapp-health" element={
                      <ProtectedRoute requiredCapability="notify.check.status">
                        <WhatsAppHealthPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications/preferences" element={
                      <ProtectedRoute requiredCapability="notify.view.preferences">
                        <NotificationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications/my" element={
                      <ProtectedRoute requiredCapability="notify.view.my">
                        <NotificationsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications/subscriptions" element={
                      <ProtectedRoute requiredCapability="notify.push.view.subscriptions">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <SubscriptionList />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    {/* Attendance routes */}
                    <Route path="/attendance" element={<Navigate to="/attendance/dashboard" replace />} />
                    
                    <Route path="/attendance/dashboard" element={
                      <ProtectedRoute requiredCapability="attendance.sessions.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <AttendanceDashboardPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    
                    {/* Restricted to Active Petugas & Admin */}
                    <Route element={<PetugasRoute />}>
                      <Route path="/attendance/monitoring" element={
                        <ProtectedRoute requiredCapability="attendance.sessions.view.list">
                          <AttendanceErrorBoundary>
                            <MonitoringKbmPage />
                          </AttendanceErrorBoundary>
                        </ProtectedRoute>
                      } />
                    </Route>

                    {/* Open to all authenticated (Role & capability inside page) */}
                    <Route path="/attendance/settings" element={
                      <ProtectedRoute requiredCapability="attendance.gate.bypass">
                        <AttendanceSettingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/kesiswaan/jadwal-kegiatan" element={
                      <ProtectedRoute requiredCapability="kesiswaan.schedules.view.list">
                        <JadwalKegiatanPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/anggota-kegiatan-eskul" element={
                      <ProtectedRoute requiredCapability="kesiswaan.schedules.view.list">
                        <Suspense fallback={<div className="p-8"><Loader /></div>}>
                          <AnggotaKegiatanEskulPage />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    {/* Removed deprecated attendance pages: kegiatan, manual */}
                    <Route element={<PetugasRoute />}>
                    </Route>
                    <Route path="/attendance/tracking-siswa" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <TrackingSiswaPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/petugas" element={
                      <ProtectedRoute requiredCapability="attendance.officers.manage">
                        <PetugasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/devices" element={
                      <ProtectedRoute requiredCapability="attendance.sessions.view.list">
                        <DeviceManagementPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/attendance/rekap" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RekapPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/rekap/siswa-bulanan" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RekapBulananSiswaPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/rekap/kelas-bulanan" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RekapPage initialTab="BULANAN_KELAS" />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/rekap/mapel-bulanan" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RekapPage initialTab="BULANAN_MAPEL" />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/rekap/siswa-harian" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RekapHarianSiswaPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/jenis-kegiatan" element={
                      <ProtectedRoute requiredCapability="academic.activities.types.view">
                        <JenisKegiatanMasterPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/guru-monitoring" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <GuruMonitoringPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/rekam-wajah" element={
                      <ProtectedRoute requiredCapability="attendance.manage.face.templates">
                        <FaceTemplatePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/my-attendance" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <MyAttendancePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/riwayat-ajar" element={
                      <ProtectedRoute requiredCapability="attendance.reports.view">
                        <RiwayatAjarPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance/cetak-berkas" element={
                      <ProtectedRoute requiredCapability="attendance.sessions.view.list">
                        <CetakBerkasAbsensiPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute requiredCapability={['core.system.config.view', 'core.sekolah.view.profile']}>
                        <SettingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/whatsapp" element={
                      <ProtectedRoute requiredCapability="core.tenants.update">
                        <WhatsappSettingsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/system-update" element={
                      <ProtectedRoute requiredCapability="core.system.config.update">
                        <SystemUpdatePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/easy-tunnel" element={
                      <ProtectedRoute requiredCapability="core.system.config.update">
                        <EasyTunnelPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/:id" element={<ProfilePage />} />
                    <Route path="/components-demo" element={<ComponentsDemo />} />
                    <Route path="/management/menus" element={
                      <ProtectedRoute requiredRole="SUPERADMIN" requiredCapability="core.menu.view.list">
                        <MenuManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/management/roles" element={
                      <ProtectedRoute requiredRole="SUPERADMIN" requiredCapability="core.users.view.roles">
                        <RoleManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/management/menu-audit" element={
                      <ProtectedRoute requiredRole="SUPERADMIN" requiredCapability="core.menu.view.list">
                        <MenuAuditPage />
                      </ProtectedRoute>
                    } />
                  </Route>
                </Route>

                {/* ── FULL-PAGE ROUTES (No Sidebar / No MainLayout - JALUR B) ── */}
                <Route path="/attendance/ops" element={
                  <ProtectedRoute requiredCapability="attendance.sessions.view.list">
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                        <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      </div>
                    }>
                      <AttendanceErrorBoundary>
                        <AttendanceOpsPage />
                      </AttendanceErrorBoundary>
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/kesiswaan/piket" element={
                  <ProtectedRoute requiredCapability={['kesiswaan.piket.view', 'kesiswaan.schedules.view.list']}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                        <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      </div>
                    }>
                      <PiketPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/kesiswaan/monitoring" element={
                  <ProtectedRoute requiredCapability="dashboard.view.kesiswaan">
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                        <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      </div>
                    }>
                      <MonitoringKesiswaanPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/billing/rab-calculator" element={
                  <ProtectedRoute>
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    }>
                      <RABCalculatorPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/rab-calculator" element={<Navigate to="/billing/rab-calculator" replace />} />
                <Route path="/verify-siplah" element={<SIPLaHAuditVerifyPage />} />
                <Route path="/verify-siplah/:hash" element={<SIPLaHAuditVerifyPage />} />
                <Route path="/audit/siplah" element={<Navigate to="/verify-siplah" replace />} />

                {/* Catch-all route -> 404 */}
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            )}
          </BrowserRouter>
          </SocketProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
);
}

function GlobalSubscriptionIssueModal() {
  const navigate = useNavigate();
  const { subscriptionIssueModalOpen, closeSubscriptionIssueModal } = useAuthStore();

  return (
    <Modal
      isOpen={subscriptionIssueModalOpen}
      onClose={closeSubscriptionIssueModal}
      title="Langganan Tidak Aktif"
      description="Beberapa fitur tidak bisa digunakan karena status langganan tenant Anda tidak aktif."
      size="md"
      zIndex={80}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-700 dark:text-gray-200">
          Silakan buka halaman langganan untuk melihat status terbaru dan melakukan aktivasi atau pembayaran.
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Jika Anda yakin ini tidak sesuai, coba muat ulang atau hubungi tim support.
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              closeSubscriptionIssueModal();
              window.location.reload();
            }}
          >
            Muat Ulang
          </Button>
          <Button
            onClick={() => {
              closeSubscriptionIssueModal();
              navigate('/billing');
            }}
          >
            Buka Halaman Langganan
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

export default App;

function UnauthedGate() {
  const location = useLocation();
  const path = String(location.pathname || '');
  const hostname = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase();
  
  // Deteksi domain utama marketing vs domain portal SaaS app
  const isMarketingDomain = hostname === 'absenta.id' || 
                            hostname === 'www.absenta.id' || 
                            hostname === 'localhost' || 
                            hostname === '127.0.0.1';

  const isAppPortalDomain = hostname === 'app.absenta.id' || 
                            hostname === 'portal.absenta.id';

  // Jalur khusus dokumen tetap ke portal login jika belum terautentikasi
  if (path.startsWith('/documents')) {
    return <Navigate to="/login" replace />;
  }

  // Jika di domain marketing (absenta.id / www.absenta.id), arahkan rute publik ke Landing Page (/home)
  if (isMarketingDomain && (path === '/' || path === '')) {
    return <Navigate to="/home" replace />;
  }

  // Jika di portal app.absenta.id dan mengakses rute registrasi/RAB, biarkan tetap di rute tersebut
  if (isAppPortalDomain) {
    if (path === '/' || path === '') {
      return <Navigate to="/register-tenant" replace />;
    }
  }

  // Untuk subdomain tenant sekolah (seperti smkn1cibinong.absenta.id) atau On-Premise, arahkan ke Portal Login Sekolah (/login)
  return <Navigate to="/login" replace />;
}
