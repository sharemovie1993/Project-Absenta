import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicPlans } from '../../api/plans.api';
import type { Plan } from '../../types/plans';
import { formatCurrency } from '../../api/plans.api';
import { 
  Check, 
  ArrowRight, 
  Calculator, 
  X, 
  Users, 
  Server, 
  Zap,
  ShieldCheck,
  Star,
  Sparkles,
  Info,
  ChevronDown,
  MessageCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui';
import { fetchActiveSystemConfig } from '@/services/systemConfig';
import { UnifiedCatalog } from '@/components/billing/UnifiedCatalog';

type SystemConfig = { app_name?: string | null };

const PricingPage: React.FC = () => {
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Simulation State
  const [simOpen, setSimOpen] = useState(false);
  const [simStudents, setSimStudents] = useState(1500);
  const [simModel, setSimModel] = useState<'TIERED' | 'ACTIVE' | 'DEDICATED'>('TIERED');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const calculateSimulation = () => {
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
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configData = await fetchActiveSystemConfig();
        setSystemConfig(configData);
      } catch (err) {
        console.error('Error fetching system config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleContactSales = () => {
    window.open('https://wa.me/6281222333444?text=Halo%20Tim%20Absenta,%20saya%20tertarik%20dengan%20paket%20Enterprise.', '_blank');
  };

  const handleSelectSimulatedPlan = () => {
    let price = 0;
    let desc = '';
    if (simModel === 'DEDICATED') { price = 1500000; desc = 'Dedicated Resource'; }
    else { price = calculateSimulation(); desc = `Model: ${simModel}, Siswa: ${simStudents}`; }
    const query = new URLSearchParams({ customPrice: String(price), simModel: simModel, simStudents: String(simStudents), simDesc: desc });
    navigate(`/register-tenant?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
               <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-sm font-medium text-slate-500">Menyiapkan penawaran terbaik...</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* 1. Immersive Header */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-mesh">
        <div className="container relative mx-auto text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6 tracking-wider uppercase"
            >
                <Zap size={14} className="fill-current" />
                <span>Pricing & Plans</span>
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6"
            >
                Investasi Terbaik untuk <br />
                <span className="text-gradient-primary">Kemajuan Sekolah Anda</span>
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400 mb-8"
            >
                Sederhana, transparan, dan tanpa biaya tersembunyi. <br className="hidden md:block" />
                Pilih paket yang sesuai dengan kapasitas dan kebutuhan operasional sekolah Anda.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 flex flex-col items-center gap-4"
            >
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
                <p className="text-xs text-slate-400 font-medium">Investasi jangka panjang untuk efisiensi sekolah maksimal.</p>
            </motion.div>
        </div>
      </section>

      {/* 2. Unified Dynamic Catalog */}
      <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="container mx-auto px-4">
           <UnifiedCatalog 
             mode="public" 
             onSelectPlan={(groupId) => navigate(`/services/${groupId}`)}
           />
        </div>
      </section>


      {/* 3. Special CTA & Trust Elements */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
         <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div className="space-y-8">
                  <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
                    Butuh Solusi yang <br />
                    <span className="text-blue-600">Lebih Spesifik?</span>
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    Kami memahami setiap sekolah unik. Jika Anda membutuhkan integrasi custom, deployment dedicated, atau skala siswa di atas 2000, tim kami siap membantu.
                  </p>
                  
                  <div className="space-y-4">
                     {[
                        { icon: <ShieldCheck className="text-green-500" />, text: "Sesuai Standar UU Perlindungan Data Pribadi (PDP)" },
                        { icon: <CheckCircle2 className="text-blue-500" />, text: "Isolasi Data Database per Sekolah (Tenant Isolation)" },
                        { icon: <Zap className="text-amber-500" />, text: "Integrasi Payment Gateway untuk Pembayaran SPP" }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                           {item.icon}
                           <span className="font-semibold">{item.text}</span>
                        </div>
                     ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                     <Button 
                        size="lg" 
                        variant="primary" 
                        onClick={() => setSimOpen(true)}
                        className="rounded-xl px-10 py-6 h-auto text-lg bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                     >
                        <Calculator className="mr-2" size={20} />
                        Simulasi Enterprise
                     </Button>
                     <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={handleContactSales}
                        className="rounded-xl px-10 py-6 h-auto text-lg border-slate-200 dark:border-slate-800"
                     >
                        <MessageCircle className="mr-2" size={20} />
                        Chat Sales
                     </Button>
                  </div>
               </div>

               <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
                  <div className="relative glass-morphism rounded-[3rem] p-8 md:p-12 border-white/20 shadow-2xl bg-white/50 dark:bg-slate-900/50">
                     <h3 className="text-2xl font-bold mb-8 text-center uppercase tracking-widest text-blue-600 dark:text-blue-400">FAQ Pembayaran</h3>
                     <div className="space-y-6">
                        {[
                           { q: "Apakah ada biaya aktivasi?", a: "Tidak ada. Anda hanya membayar biaya langganan paket yang dipilih." },
                           { q: "Bagaimana jika siswa bertambah?", a: "Anda dapat melakukan upgrade paket kapasitas siswa kapan saja via dashboard." },
                           { q: "Dukungan apa yang saya dapat?", a: "Semua paket mendapatkan dukungan via Email & WhatsApp di jam operasional." },
                           { q: "Server disimpan di mana?", a: "Data disimpan di pusat data lokal (Region Indonesia) untuk kecepatan & kepatuhan regulasi." }
                        ].map((faq, i) => (
                           <div key={i} className="space-y-2">
                              <h4 className="font-bold flex items-start gap-2">
                                 <ChevronDown className="text-blue-500 mt-1 flex-shrink-0" size={16} />
                                 {faq.q}
                              </h4>
                              <p className="text-sm text-slate-500 pl-6">{faq.a}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <Footer />

      {/* 4. Enhanced Simulation Modal */}
      <AnimatePresence>
        {simOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSimOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.4, ease: "easeOut" as any }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                       <Calculator size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold">Simulasi Enterprise</h3>
                      <p className="text-sm text-slate-500">Sesuaikan kapasitas dan model biaya.</p>
                    </div>
                  </div>
                  <button onClick={() => setSimOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-10">
                   {/* Model Switches */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'TIERED', label: 'Tiered', sub: 'Per Blok Siswa' },
                        { id: 'ACTIVE', label: 'Active', sub: 'Per User Aktif' },
                        { id: 'DEDICATED', label: 'Dedicated', sub: 'Private Server' }
                      ].map(model => (
                        <button
                          key={model.id}
                          onClick={() => setSimModel(model.id as any)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            simModel === model.id 
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'
                          }`}
                        >
                           <div className={`text-sm font-bold mb-1 ${simModel === model.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{model.label}</div>
                           <div className="text-[10px] uppercase font-bold text-slate-400">{model.sub}</div>
                        </button>
                      ))}
                   </div>

                   {simModel !== 'DEDICATED' ? (
                     <div className="space-y-6">
                        <div>
                           <div className="flex items-center justify-between mb-4">
                              <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Kapasitas Siswa</label>
                              <div className="text-2xl font-extrabold text-blue-600">{simStudents.toLocaleString()} Siswa</div>
                           </div>
                           <input 
                              type="range" min="1000" max="10000" step="100"
                              value={simStudents} onChange={(e) => setSimStudents(Number(e.target.value))}
                              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6"
                           />
                        </div>

                        <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                           <div>
                              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Estimasi Harga</div>
                               <div className="text-4xl font-black text-slate-900 dark:text-white">
                                  {formatCurrency(calculateSimulation())}
                                  <span className="text-sm font-medium text-slate-400 lowercase italic ml-2">/ bln</span>
                               </div>
                           </div>
                           <Button size="lg" onClick={handleSelectSimulatedPlan} className="w-full md:w-auto px-8 py-5 rounded-xl shadow-lg shadow-blue-500/20">
                              Lanjutkan Registrasi
                           </Button>
                        </div>
                     </div>
                   ) : (
                     <div className="text-center py-6">
                        <div className="w-20 h-20 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 mx-auto mb-6">
                           <Server size={40} />
                        </div>
                        <h4 className="text-xl font-bold mb-2">Private & Dedicated Cluster</h4>
                         <p className="text-slate-500 mb-8 max-w-sm mx-auto">Model ini memerlukan asistensi teknis langsung untuk menentukan spesifikasi hardware dan isolasi data.</p>
                        <Button size="lg" onClick={handleContactSales} variant="primary" className="rounded-xl bg-purple-600 hover:bg-purple-700 w-full md:w-auto px-10">
                           Konsultasi via WhatsApp
                        </Button>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingPage;

