import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, SectionCard } from '@/components/ui';
import { 
  Building2, 
  CheckCircle, 
  Wallet, 
  ArrowRight, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const SERVICES_DATA = [
  {
    slug: 'absensi',
    name: 'Absensi Sekolah',
    tag: 'absensi',
    description: 'Transformasi digital manajemen kehadiran. Terintegrasi dengan laporan jam mengajar guru dan kedisiplinan siswa.',
    basePrice: 'Rp 249.000',
    extraPerStudent: 'Rp 2.000',
    storage: '3 GB',
    icon: Building2,
    highlight: 'Hemat 10% dengan billing tahunan',
    color: 'blue'
  },
  {
    slug: 'koperasi',
    name: 'Koperasi Sekolah',
    tag: 'koperasi',
    description: 'Ekosistem ekonomi sekolah mandiri. Kelola anggota, simpan pinjam, dan POS kantin dalam satu genggaman.',
    basePrice: 'Rp 199.000',
    extraPerStudent: 'Rp 1.000',
    storage: '3 GB',
    icon: Wallet,
    highlight: 'Hemat 10% dengan billing tahunan',
    color: 'emerald'
  },
];

function ServicesCatalogContent() {
  const navigate = useNavigate();

  const services = useMemo(() => SERVICES_DATA, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Beranda', path: '/' },
    { label: 'Katalog Layanan' }
  ], []);

  const handleGoToDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const handleConsultation = useCallback(() => window.open('https://wa.me/6281222333444', '_blank'), []);
  const handleSelectService = useCallback((slug: string) => navigate(`/services/${slug}`), [navigate]);

  return (
    <AcademicPageLayout
      title="Katalog Layanan"
      description="Pilih modul layanan yang sesuai dengan kebutuhan operasional sekolah Anda. Seluruh modul terintegrasi secara cerdas."
      hardeningModuleKey="services_catalog"
      instruction={{
        title: 'Katalog Layanan',
        description: 'Jelajahi berbagai solusi kami untuk mendigitalisasi sekolah Anda.',
        items: [
          { text: 'Anda dapat memulai uji coba gratis atau langsung berlangganan paket yang tersedia.' }
        ]
      }}
      breadcrumbs={breadcrumbs}
      toolbar={
        <Button 
          variant="outline" 
          onClick={handleGoToDashboard}
          className="rounded-xl border-slate-200 dark:border-slate-800 h-10 px-4 font-bold text-xs"
        >
          <ArrowLeft size={14} className="mr-2" />
          Dashboard
        </Button>
      }
    >
      <div className="space-y-20 pb-20">
        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {(services ?? [])?.map((s, idx) => {
            const Icon = s.icon;
            const isBlue = s.color === 'blue';
            
            return (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <SectionCard 
                  title={s.name} 
                  icon={() => <Icon size={24} />} 
                  fullWidth
                  noPadding
                  className={`group relative overflow-hidden rounded-[2.5rem] border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 ${isBlue ? 'border-blue-50 hover:border-blue-600' : 'border-emerald-50 hover:border-emerald-600'}`}
                >
                  <div className={`p-8 border-b ${isBlue ? 'bg-blue-50/30' : 'bg-emerald-50/30'} dark:bg-transparent border-slate-100 dark:border-slate-800`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-xl ${isBlue ? 'bg-blue-600 shadow-blue-500/20' : 'bg-emerald-600 shadow-emerald-500/20'} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{s.name}</h2>
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isBlue ? 'text-blue-600' : 'text-emerald-600'}`}>{s.tag}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed min-h-[3rem]">
                      {s.description}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Harga Dasar</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{s.basePrice}<span className="text-xs font-medium text-slate-400 ml-1">/ bln</span></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Add-on Siswa</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{s.extraPerStudent}<span className="text-xs font-medium text-slate-400 ml-1">/ siswa</span></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Cloud Storage</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{s.storage}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${isBlue ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <CheckCircle size={14} />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{s.highlight}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className={`w-full py-7 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98] ${isBlue ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
                      onClick={() => handleSelectService(s.slug)}
                    >
                      Pilih Layanan Ini
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </div>
                </SectionCard>
              </motion.div>
            );
          })}
        </div>

        {/* Support Area */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 rounded-[4rem] bg-slate-900 text-white text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-4 tracking-tight">Masih bingung menentukan pilihan?</h3>
            <p className="text-slate-400 mb-10 max-w-2xl mx-auto font-medium">Tim spesialis kami siap membantu Anda melakukan pemetaan kebutuhan digital sekolah secara gratis.</p>
            <Button 
              variant="outline" 
              onClick={handleConsultation}
              className="rounded-2xl px-12 py-7 h-auto text-sm font-black uppercase tracking-widest border-2 border-white/10 hover:bg-white hover:text-slate-900 transition-all"
            >
              Konsultasi via WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    </AcademicPageLayout>
  );
}

export default function ServicesCatalogPage() {
  return (
    <ServicesCatalogContent />
  );
}
