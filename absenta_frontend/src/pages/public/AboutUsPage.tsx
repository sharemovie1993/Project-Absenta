import React from 'react';
import { motion } from 'framer-motion';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  Building2, 
  Users, 
  Heart, 
  Target, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  Award,
  Globe,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui';

export const AboutUsPage: React.FC = () => {
  const { systemConfig } = useSystemConfig();
  const appName = systemConfig?.app_name || 'Absenta';
  const companyName = (systemConfig as any)?.company_name || 'PT Solusi Pendidikan Indonesia';
  const description = (systemConfig as any)?.company_description || 
    'Kami adalah perusahaan teknologi pendidikan yang berdedikasi untuk membantu sekolah-sekolah di Indonesia melakukan transformasi digital. Misi kami adalah menyediakan sistem manajemen sekolah yang terjangkau, mudah digunakan, dan sesuai dengan kebutuhan lokal.';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      
      <main className="flex-grow">
        {/* 1. Immersive Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-mesh">
          <div className="container relative mx-auto px-4 text-center">
             <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-8 tracking-wider uppercase"
             >
                <Sparkles size={14} className="fill-current" />
                <span>Our Story & Mission</span>
             </motion.div>

             <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-7xl font-extrabold tracking-tight leading-tight mb-8"
             >
                Membentuk Masa Depan <br />
                <span className="text-gradient-primary">Pendidikan Indonesia</span>
             </motion.h1>

             <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed"
             >
                Lebih dari sekadar sistem absensi. Kami membangun jembatan antara teknologi, guru, dan orang tua untuk menciptakan ekosistem sekolah yang transparan dan disiplin.
             </motion.p>
          </div>
          
          {/* Floating Abstract Elements */}
          <div className="absolute top-1/4 left-10 w-24 h-24 bg-blue-400/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl animate-float-delayed" />
        </section>

        {/* 2. Philosophy & Vision */}
        <section className="py-24 bg-white dark:bg-slate-950">
           <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                 >
                    <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
                    <div className="relative glass-morphism rounded-[3rem] p-8 md:p-12 border-white/20 shadow-2xl">
                       <div className="flex items-center gap-4 mb-8">
                          <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                             <Building2 size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-extrabold">{appName} Philosophy</h2>
                             <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-xs">Innovation for Education</p>
                          </div>
                       </div>
                       
                       <div className="space-y-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                          <p>
                             {description}
                          </p>
                          <p className="font-medium text-slate-900 dark:text-white border-l-4 border-blue-600 pl-6 italic">
                             "Tujuan kami bukan untuk menggantikan peran manusia di sekolah, melainkan memberdayakan mereka dengan data yang akurat untuk mengambil keputusan yang lebih baik."
                          </p>
                       </div>
                    </div>
                 </motion.div>

                 <div className="space-y-12">
                    <h3 className="text-2xl md:text-4xl font-extrabold">Mengapa Kami <span className="text-blue-600">Berbeda?</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {[
                          { icon: <Target className="text-red-500" />, title: "Fokus Solusi", desc: "Setiap fitur dirancang berdasarkan analisis mendalam kendala operasional sekolah nyata." },
                          { icon: <ShieldCheck className="text-green-500" />, title: "Keamanan Data", desc: "Kepatuhan penuh pada standar perlindungan data pribadi dan isolasi tenant." },
                          { icon: <Zap className="text-amber-500" />, title: "Efisiesi Total", desc: "Mengurangi beban administrasi hingga 80%, memberikan guru lebih banyak waktu mengajar." },
                          { icon: <Heart className="text-pink-500" />, title: "Human Centric", desc: "Antarmuka yang intuitif dan mudah dipahami oleh staff dari segala latar belakang teknologi." }
                       ].map((item, i) => (
                          <motion.div 
                             key={i}
                             initial={{ opacity: 0, y: 20 }}
                             whileInView={{ opacity: 1, y: 0 }}
                             viewport={{ once: true }}
                             transition={{ delay: i * 0.1 }}
                             className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all group"
                          >
                             <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                {item.icon}
                             </div>
                             <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                             <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                          </motion.div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* 3. Impact Counters (Simplified) */}
        <section className="py-20 bg-slate-900 text-white rounded-[3rem] mx-4 md:mx-10 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[150px] rounded-full" />
           <div className="container mx-auto px-4 relative">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
                 {[
                    { icon: <Globe />, label: "Sekolah Aktif", val: "500+" },
                    { icon: <Users />, label: "Siswa Terdata", val: "250K+" },
                    { icon: <Award />, label: "Kepuasan Sekolah", val: "99%" },
                    { icon: <Zap />, label: "Uptime Server", val: "99.9%" }
                 ].map((stat, i) => (
                    <div key={i} className="space-y-3">
                       <div className="inline-flex p-3 rounded-xl bg-white/10 mb-2">
                          {React.cloneElement(stat.icon as any, { size: 24, className: "text-blue-400" })}
                       </div>
                       <div className="text-4xl font-black">{stat.val}</div>
                       <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* 4. Team Culture or Commitment */}
        <section className="py-32">
           <div className="container mx-auto px-4 text-center max-w-4xl">
              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 className="space-y-8"
              >
                 <h2 className="text-3xl md:text-5xl font-extrabold">Komitmen Kami untuk <br /> <span className="text-blue-600">Pendidikan yang Berkelanjutan</span></h2>
                 <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    Kami percaya bahwa teknologi harus merangkul semua orang. Itulah sebabnya kami terus berinovasi untuk memberikan harga yang kompetitif tanpa mengorbankan kualitas, memastikan setiap sekolah di Indonesia—baik di kota besar maupun daerah terpencil—memiliki kesempatan yang sama untuk maju.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button 
                       size="lg" 
                       onClick={() => window.open('/register-tenant', '_self')}
                       className="rounded-xl px-10 py-6 h-auto text-lg bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900"
                    >
                       Mulai Perjalanan Anda
                       <ArrowRight size={20} className="ml-2" />
                    </Button>
                    <Button 
                       variant="outline"
                       size="lg" 
                       onClick={() => window.open('https://wa.me/6281222333444', '_blank')}
                       className="rounded-xl px-10 py-6 h-auto text-lg border-slate-200 dark:border-slate-800"
                    >
                       Hubungi Tim Kami
                    </Button>
                 </div>
              </motion.div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUsPage;


