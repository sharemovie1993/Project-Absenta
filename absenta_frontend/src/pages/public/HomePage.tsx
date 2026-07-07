import React, { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Sparkles } from 'lucide-react';
import { Loader, SectionCard, Button } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';

// Lazy loading heavy components
const Navbar = lazy(() => import('@/components/layout/Navbar').then(m => ({ default: m.Navbar })));
const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));

// Home sub-components
const HomeHero = lazy(() => import('@/components/public/home/HomeHero').then(m => ({ default: m.HomeHero })));
const HomeServiceModes = lazy(() => import('@/components/public/home/HomeServiceModes').then(m => ({ default: m.HomeServiceModes })));
const HomeFeatures = lazy(() => import('@/components/public/home/HomeFeatures').then(m => ({ default: m.HomeFeatures })));
const HomeTestimonials = lazy(() => import('@/components/public/home/HomeTestimonials').then(m => ({ default: m.HomeTestimonials })));
const HomeCTA = lazy(() => import('@/components/public/home/HomeCTA').then(m => ({ default: m.HomeCTA })));

export default function HomePage() {
  const navigate = useNavigate();
  const [checkingPreset, setCheckingPreset] = React.useState(true);
  const { data: systemConfig, isLoading: configLoading } = useQuery({
    queryKey: ['system-config', 'active', 'public'],
    queryFn: fetchActiveSystemConfig,
  });

  React.useEffect(() => {
    const checkPreset = async () => {
      try {
        const res = await axiosInstance.get('/auth/registration-preset');
        if (res.data?.success) {
          const preset = res.data.data;
          if (preset.is_single_tenant && preset.is_registered) {
            navigate('/login', { replace: true });
            return;
          }
        }
      } catch (err) {
        console.warn('[HomePage] Gagal memuat registration-preset:', err);
      } finally {
        setCheckingPreset(false);
      }
    };
    checkPreset();
  }, [navigate]);

  const appName = systemConfig?.app_name || 'Sistem Absensi';
  const primaryColor = systemConfig?.primary_color || '#2563EB';

  const breadcrumbs = useMemo(() => [
    { label: 'Beranda' }
  ], []);

  const instruction = useMemo(() => ({
    title: `Selamat Datang di ${appName}`,
    description: 'Platform manajemen kehadiran dan akademik sekolah yang modern, aman, dan mudah digunakan.',
    items: [
      { text: 'Gunakan navigasi di atas untuk melihat fitur dan harga layanan.' },
      { text: 'Klik "Pelajari Lebih Lanjut" untuk melihat detail teknis platform.' },
      { text: 'Hubungi tim sales kami jika Anda membutuhkan demo khusus untuk sekolah Anda.' }
    ]
  }), [appName]);

  React.useEffect(() => {
    try {
      document.title = String(appName);
    } catch {}
  }, [appName]);

  React.useEffect(() => {
    if (systemConfig) {
      try {
        applyBrandingFromConfig(systemConfig);
      } catch (err) {
        console.error('Failed to apply branding:', err);
      }
    }
  }, [systemConfig]);

  if (checkingPreset || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader />
      </div>
    );
  }

  if (!configLoading && !systemConfig) {
    return (
      <AcademicPageLayout
        title="Beranda"
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="home_page"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Konfigurasi Tidak Ditemukan</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Maaf, kami tidak dapat memuat konfigurasi sistem saat ini. Silakan coba segarkan halaman atau hubungi administrator.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Segarkan Halaman
          </Button>
        </div>
      </AcademicPageLayout>
    );
  }

  const handleLearnMore = () => navigate('/learn-more');
  const handlePricing = () => navigate('/pricing');
  const handleContactSales = () => {
    // Implement contact sales or redirect to contact page
    navigate('/contact');
  };

  return (
    <AcademicPageLayout
      title="Beranda"
      description={`Selamat datang di platform ${appName}.`}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="home_page"
      isLoading={configLoading}
    >
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900">
        <Suspense fallback={<div className="h-16" />}>
          <Navbar />
        </Suspense>

        <main className="flex-grow">
          <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
            <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader /></div>}>
              <HomeHero 
                appName={appName}
                primaryColor={primaryColor}
                onLearnMore={handleLearnMore}
                onPricing={handlePricing}
              />
            </Suspense>
          </SectionCard>

          <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
            <Suspense fallback={<div className="py-24 text-center"><Loader /></div>}>
              <HomeServiceModes />
            </Suspense>
          </SectionCard>

          <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
            <Suspense fallback={<div className="py-24 text-center"><Loader /></div>}>
              <HomeFeatures />
            </Suspense>
          </SectionCard>

          <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
            <Suspense fallback={<div className="py-24 text-center"><Loader /></div>}>
              <HomeTestimonials />
            </Suspense>
          </SectionCard>

          <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
            <Suspense fallback={<div className="py-24 text-center"><Loader /></div>}>
              <HomeCTA 
                onLearnMore={handleLearnMore}
                onContactSales={handleContactSales}
              />
            </Suspense>
          </SectionCard>
        </main>

        <Suspense fallback={<div className="h-64" />}>
          <Footer />
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
}
