import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const SERVICES = [
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

export default function ServicesCatalogPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <section className="container mx-auto px-4">
           {/* Header Area */}
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="space-y-4"
              >
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                    <Sparkles size={14} />
                    <span>Solutions Catalog</span>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black tracking-tight">Pilih <span className="text-blue-600">Layanan</span></h1>
                 <p className="text-slate-500 max-w-lg">Berlangganan modul yang sesuai dengan kebutuhan operasional sekolah Anda. Semua modul terintegrasi secara seamless.</p>
              </motion.div>
              
              <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
              >
                 <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                    className="rounded-xl border-slate-200 dark:border-slate-800 px-6"
                 >
                    <ArrowLeft size={18} className="mr-2" />
                    Kembali ke Dashboard
                 </Button>
              </motion.div>
           </div>

           {/* Services Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {SERVICES.map((s, idx) => {
               const Icon = s.icon;
               const isBlue = s.color === 'blue';
               
               return (
                 <motion.div
                    key={s.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                 >
                    <Card className={`group relative p-0 overflow-hidden rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 ${isBlue ? 'border-blue-50 hover:border-blue-600' : 'border-emerald-50 hover:border-emerald-600'} bg-white dark:bg-slate-900`}>
                       <div className={`p-8 border-b ${isBlue ? 'bg-blue-50/30' : 'bg-emerald-50/30'} dark:bg-transparent border-slate-100 dark:border-slate-800`}>
                          <div className="flex items-center gap-5">
                             <div className={`w-16 h-16 rounded-xl ${isBlue ? 'bg-blue-600 shadow-blue-500/20' : 'bg-emerald-600 shadow-emerald-500/20'} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                <Icon size={32} />
                             </div>
                             <div>
                                <h2 className="text-2xl font-black">{s.name}</h2>
                                <div className={`text-xs font-bold uppercase tracking-widest ${isBlue ? 'text-blue-600' : 'text-emerald-600'}`}>{s.tag}</div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-8 space-y-8">
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed min-h-[3rem]">
                             {s.description}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Harga Dasar</div>
                                <div className="text-xl font-bold">{s.basePrice}<span className="text-xs font-medium text-slate-400 ml-1">/ bln</span></div>
                             </div>
                             <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Add-on Siswa</div>
                                <div className="text-xl font-bold">{s.extraPerStudent}<span className="text-xs font-medium text-slate-400 ml-1">/ siswa</span></div>
                             </div>
                             <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Cloud Storage</div>
                                <div className="text-xl font-bold">{s.storage}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-full ${isBlue ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                   <CheckCircle size={14} />
                                </div>
                                <span className="text-xs font-bold text-slate-500">{s.highlight}</span>
                             </div>
                          </div>
                          
                          <Button 
                             className={`w-full py-7 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98] ${isBlue ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
                             onClick={() => navigate(`/services/${s.slug}`)}
                          >
                             Pilih Layanan Ini
                             <ArrowRight size={20} className="ml-2" />
                          </Button>
                       </div>
                    </Card>
                 </motion.div>
               );
             })}
           </div>

           {/* Support Area */}
           <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-20 p-10 rounded-[3rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center"
           >
              <h3 className="text-2xl font-bold mb-4">Masih bingung menentukan pilihan?</h3>
              <p className="text-slate-500 mb-8 max-w-2xl mx-auto">Tim spesialis kami siap membantu Anda melakukan pemetaan kebutuhan digital sekolah secara gratis.</p>
              <Button 
                 variant="outline" 
                 onClick={() => window.open('https://wa.me/6281222333444', '_blank')}
                 className="rounded-xl px-10 py-6 h-auto text-lg border-slate-200 dark:border-slate-800"
              >
                 Konsultasi via WhatsApp
              </Button>
           </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
