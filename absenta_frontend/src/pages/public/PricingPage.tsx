import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calculator, 
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button, Loader, SectionCard } from '@/components/ui';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { formatDate } from '../../utils/layoutUtils';
import { formatCurrency } from '@/api/plans.api';

// Lazy load components
const UnifiedCatalog = lazy(() => import('@/components/billing/UnifiedCatalog').then(m => ({ default: m.UnifiedCatalog })));
const PricingSimulationModal = lazy(() => import('@/components/public/pricing/PricingSimulationModal').then(m => ({ default: m.PricingSimulationModal })));

type SystemConfig = { app_name?: string | null; primary_color?: string };

function PricingPageContent() {
  const navigate = useNavigate();

  const { data: systemConfig, isLoading: loading } = useQuery({
    queryKey: ['system-config', 'active', 'pricing'],
    queryFn: fetchActiveSystemConfig,
  });

  const isEmpty = !systemConfig && !loading;

  // Simulation State
  const [simOpen, setSimOpen] = useState(false);
  const [simStudents, setSimStudents] = useState(1500);
  const [simModel, setSimModel] = useState<'TIERED' | 'ACTIVE' | 'DEDICATED'>('TIERED');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const calculateSimulation = useCallback(() => {
    if (simModel === 'TIERED') {
      const basePrice = 650000;
      const baseStudents = 1000;
      const extraPrice = 250000;
      const extraBlockSize = 500;
      
      const extraStudents = Math.max(0, simStudents - baseStudents);
      const blocks = Math.ceil(extraStudents / extraBlockSize);
      
      return basePrice + (blocks * extraPrice);
    } else if (simModel === 'ACTIVE') {
      const ratePerStudent = 700; 
      const minChargeStudents = 1000;
      const chargeableStudents = Math.max(minChargeStudents, simStudents);
      return chargeableStudents * ratePerStudent;
    }
    return 0; 
  }, [simModel, simStudents]);

  useEffect(() => {
    if (systemConfig) {
      try {
        applyBrandingFromConfig(systemConfig);
      } catch (err: unknown) {
        console.error('Error applying branding:', err);
      }
    }
  }, [systemConfig]);

  const handleContactSales = useCallback(() => {
    window.open('https://wa.me/6281222333444?text=Halo%20Tim%20Absenta,%20saya%20tertarik%20dengan%20paket%20Enterprise.', '_blank');
  }, []);

  const handleSelectSimulatedPlan = useCallback(() => {
    let price = 0;
    let desc = '';
    if (simModel === 'DEDICATED') { price = 1500000; desc = 'Dedicated Resource'; }
    else { price = calculateSimulation(); desc = `Model: ${simModel}, Siswa: ${simStudents}`; }
    const query = new URLSearchParams({ 
      customPrice: String(price), 
      simModel: simModel, 
      simStudents: String(simStudents), 
      simDesc: desc 
    });
    navigate(`/register-tenant?${query.toString()}`);
  }, [simModel, simStudents, calculateSimulation, navigate]);

  const trustElements = useMemo(() => [
    { icon: <ShieldCheck className="text-green-500" />, text: "Sesuai Standar UU Perlindungan Data Pribadi (PDP)" },
    { icon: <CheckCircle2 className="text-blue-500" />, text: "Isolasi Data Database per Sekolah (Tenant Isolation)" },
    { icon: <Zap className="text-amber-500" />, text: "Integrasi Payment Gateway untuk Pembayaran SPP" }
  ], []);

  const faqs = useMemo(() => [
    { q: "Apakah ada biaya aktivasi?", a: "Tidak ada. Anda hanya membayar biaya langganan paket yang dipilih." },
    { q: "Bagaimana jika siswa bertambah?", a: "Anda dapat melakukan upgrade paket kapasitas siswa kapan saja via dashboard." },
    { q: "Dukungan apa yang saya dapat?", a: "Semua paket mendapatkan dukungan via Email & WhatsApp di jam operasional." },
    { q: "Server disimpan di mana?", a: "Data disimpan di pusat data lokal (Region Indonesia) untuk kecepatan & kepatuhan regulasi." }
  ], []);

  const handleSelectPlan = useCallback((groupId: string) => {
    navigate(`/services/${groupId}`);
  }, [navigate]);

  const breadcrumbs = useMemo(() => [
    { label: 'Layanan' },
    { label: 'Harga' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Harga & Paket',
    description: 'Pilih paket yang paling sesuai dengan kapasitas siswa dan kebutuhan administrasi sekolah Anda.',
    items: [
      { text: 'Pilih siklus penagihan Bulanan atau Tahunan untuk mendapatkan diskon.' },
      { text: 'Gunakan tombol "Simulasi Enterprise" jika kapasitas siswa di atas 1000.' },
      { text: 'Hubungi tim sales kami untuk penawaran khusus sekolah besar.' }
    ]
  }), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader size="lg" />
        <p className="text-sm font-medium text-slate-500 mt-4 uppercase tracking-widest font-black">Menyiapkan penawaran terbaik...</p>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Investasi Terbaik untuk Kemajuan Sekolah Anda"
      description="Sederhana, transparan, dan tanpa biaya tersembunyi. Pilih paket yang sesuai dengan kapasitas dan kebutuhan operasional sekolah Anda."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="pricing_page"
    >
      <div className="space-y-24 pb-24">
        {/* Billing Cycle Switcher */}
        <div className="flex flex-col items-center gap-4 -mt-12">
          <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-800 shadow-inner">
            <button 
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${billingCycle === 'MONTHLY' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'YEARLY' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Tahunan
              <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-500 text-[10px] rounded-full uppercase tracking-tighter">Hemat 20%</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest font-black">Investasi jangka panjang untuk efisiensi sekolah maksimal.</p>
        </div>

        {/* 2. Unified Dynamic Catalog */}
        <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
          <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader /></div>}>
            <UnifiedCatalog 
              mode="public" 
              onSelectPlan={handleSelectPlan}
            />
          </Suspense>
        </SectionCard>

        {/* 3. Special CTA & Trust Elements */}
        <SectionCard noPadding fullWidth className="py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] -mx-4 md:-mx-10 px-4 md:px-10 border-none shadow-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-black leading-tight uppercase tracking-tight">
                Butuh Solusi yang <br />
                <span className="text-blue-600">Lebih Spesifik?</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                Kami memahami setiap sekolah unik. Jika Anda membutuhkan integrasi custom, deployment dedicated, atau skala siswa di atas 2000, tim kami siap membantu.
              </p>
              
              <div className="space-y-4">
                {trustElements?.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="font-black text-sm uppercase tracking-tight text-slate-700 dark:text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  variant="primary" 
                  onClick={() => setSimOpen(true)}
                  className="rounded-xl px-10 py-6 h-auto text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xl"
                >
                  <Calculator className="mr-2" size={20} />
                  Simulasi Enterprise
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleContactSales}
                  className="rounded-xl px-10 py-6 h-auto text-xs font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-800"
                >
                  <MessageCircle className="mr-2" size={20} />
                  Chat Sales
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
              <div className="relative glass-morphism rounded-[3rem] p-8 md:p-12 border-white/20 shadow-2xl bg-white/50 dark:bg-slate-900/50">
                <h3 className="text-xl font-black mb-10 text-center uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">FAQ Pembayaran</h3>
                <div className="space-y-8">
                  {faqs?.map((faq, i) => (
                    <div key={i} className="space-y-3">
                      <h4 className="font-black text-sm flex items-start gap-3 uppercase tracking-tight text-slate-800 dark:text-slate-200">
                        <ChevronDown className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                        {faq.q}
                      </h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-7 leading-relaxed uppercase tracking-tight">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 4. Enhanced Simulation Modal */}
        <Suspense fallback={null}>
          <PricingSimulationModal 
            isOpen={simOpen}
            onClose={() => setSimOpen(false)}
            simStudents={simStudents}
            setSimStudents={setSimStudents}
            simModel={simModel}
            setSimModel={setSimModel}
            onSelectPlan={handleSelectSimulatedPlan}
            onContactSales={handleContactSales}
            calculateSimulation={calculateSimulation}
          />
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
}

export default function PricingPage() {
  return (
    <PricingPageContent />
  );
}
