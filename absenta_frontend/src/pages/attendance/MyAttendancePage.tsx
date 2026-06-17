import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRekapBulananGuruMe } from '../../api/attendanceGerbang.api';
import { useAuthStore } from '../../store/authStore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Trophy, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Info,
  TrendingUp, 
  Award, 
  CalendarDays, 
  Fingerprint,
  Target,
  FileText
} from 'lucide-react';
import { 
  Button, 
  Badge, 
  SectionCard,
  Loader,
  EmptyState
} from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const PremiumFeatureGate = lazy(() => import('../../components/auth/PremiumFeatureGate'));

const STATUS_COLORS: Record<string, string> = {
  HADIR: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  ALPA: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  SAKIT: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  IZIN: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  BELUM: 'bg-slate-200 dark:bg-slate-700'
};

const STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir Tepat Waktu',
  ALPA: 'Alpa / Tanpa Keterangan',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  BELUM: 'Belum Ada Data'
};

export const MyAttendancePage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const bulanKey = format(currentDate, 'yyyy-MM');
  const { tenantId, subscription } = useAuthStore();
  
  const features = (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.features || 
                   (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.Plan?.features_json || 
                   (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['my-attendance-rekap', bulanKey, tenantId],
    queryFn: () => getRekapBulananGuruMe({ bulan: bulanKey }),
    enabled: !!tenantId && !isLocked
  });

  const rekap = attendanceData?.data;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfMonth = getDay(monthStart);
  const prefixDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const getDayStatus = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return rekap?.detail?.find((d: { tanggal: string }) => d.tanggal === dateStr);
  }, [rekap]);

  const stats = [
    {
      title: "Poin Kehadiran",
      value: (rekap?.total_poin || 0).toString(),
      icon: <Trophy size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Akumulasi bulan ini"
    },
    {
      title: "Persentase",
      value: `${rekap?.persentase_kehadiran || 0}%`,
      icon: <Target size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Tingkat kedisiplinan"
    }
  ];

  const instructionData = {
    title: "Informasi Presensi",
    description: "Pantau rekapitulasi kehadiran dan poin kedisiplinan Anda secara mandiri.",
    items: [
      { text: "Warna pada kalender menunjukkan status kehadiran harian Anda." },
      { text: "Poin dihitung berdasarkan ketepatan waktu tap di gerbang sekolah." },
      { text: "Laporan PDF tersedia untuk keperluan administrasi bulanan." }
    ]
  };

  const pageContent = (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics Overview */}
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Ringkasan Kedisiplinan" icon={TrendingUp} fullWidth>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pencapaian Poin</span>
                     <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                    {rekap?.total_poin || 0} <span className="text-sm font-bold text-slate-400">Pts</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Setara dengan performa luar biasa</p>
               </div>

               <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rasio Kehadiran</span>
                     <Target className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-4xl font-black text-emerald-600 tracking-tight mb-4">
                    {rekap?.persentase_kehadiran || 0}%
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${rekap?.persentase_kehadiran || 0}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
               </div>
            </div>

            <div className="mt-8 p-6 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Hadir Sesi</div>
                  <div className="text-xl font-black text-emerald-600">{rekap?.statistik?.HADIR || 0}</div>
               </div>
               <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Alpa</div>
                  <div className="text-xl font-black text-rose-600">{rekap?.statistik?.ALPA || 0}</div>
               </div>
               <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Izin</div>
                  <div className="text-xl font-black text-blue-600">{rekap?.statistik?.IZIN || 0}</div>
               </div>
               <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Sakit</div>
                  <div className="text-xl font-black text-amber-600">{rekap?.statistik?.SAKIT || 0}</div>
               </div>
            </div>
          </SectionCard>

          <SectionCard title="Kalender Presensi" icon={CalendarIcon} fullWidth noPadding>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
               <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-xl h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="px-4 font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
                    {format(currentDate, 'MMMM yyyy', { locale: id })}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-xl h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
               </div>
               <div className="hidden md:flex gap-4">
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'BELUM').map(([key]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[key]}`}></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-8">
               <div className="grid grid-cols-7 gap-4 mb-6">
                 {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                   <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     {day}
                   </div>
                 ))}
               </div>

               <div className="grid grid-cols-7 gap-4">
                 {Array.from({ length: prefixDays }).map((_, i) => (
                   <div key={`prefix-${i}`} className="aspect-square opacity-0"></div>
                 ))}

                 {calendarDays?.map((date, idx) => {
                   const dayInfo = getDayStatus(date);
                   const status = dayInfo?.status || 'BELUM';
                   const isCurr = isToday(date);

                   return (
                     <motion.div
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: idx * 0.01 }}
                       key={date.toString()} 
                       className={`relative aspect-square rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group
                        ${isCurr 
                          ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-lg shadow-blue-500/10' 
                          : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md'}`}
                     >
                       <span className={`text-[11px] font-black ${isCurr ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`}>
                         {format(date, 'd')}
                       </span>
                       <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`}></div>
                     </motion.div>
                   );
                 })}
               </div>
            </div>
          </SectionCard>
        </div>

        {/* Legend & Sidebar */}
        <div className="space-y-8">
           <SectionCard title="Legenda Status" icon={Info} fullWidth>
              <div className="space-y-6">
                 {Object.entries(STATUS_LABELS).map(([key, label]) => (
                   <div key={key} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${key === 'BELUM' ? 'bg-slate-100 dark:bg-slate-800' : STATUS_COLORS[key] + ' bg-opacity-10'}`}>
                         <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[key]}`}></div>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{key}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </SectionCard>

           <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
              <Fingerprint className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110 duration-700" />
              <div className="relative z-10">
                 <div className="flex items-center gap-2 text-indigo-100 font-black text-[10px] uppercase tracking-widest mb-4">
                    <Award className="w-4 h-4 text-amber-300" /> Sertifikasi Kehadiran
                 </div>
                 <p className="text-[11px] leading-relaxed text-indigo-50 font-bold uppercase tracking-tight mb-8">
                    Data kehadiran ini divalidasi oleh sistem gerbang IoT dan verifikasi sesi admin sekolah.
                 </p>
                 <Button className="w-full h-12 rounded-xl bg-white text-indigo-600 font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-50 active:scale-95 transition-all gap-2">
                    <FileText size={14} /> Cetak Laporan
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <AcademicPageLayout
      hardeningModuleKey="myattendancepage"
      title="Presensi Saya"
      description="Monitoring kedisiplinan dan akumulasi poin kehadiran Anda secara realtime."
      stats={stats}
      breadcrumbs={[
        { label: 'Presensi', path: '/attendance' },
        { label: 'Presensi Saya', path: '/attendance/my-attendance' }
      ]}
      instruction={{
        title: "Panduan Presensi Pribadi",
        description: "Gunakan halaman ini untuk memantau rekap kehadiran Anda sendiri.",
        items: [
          { text: "Kalender menunjukkan status kehadiran per hari." },
          { text: "Poin Kehadiran diakumulasikan berdasarkan kedisiplinan Anda." }
        ]
      }}
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Laporan Kehadiran Personal"
          description="Lihat rekapitulasi kehadiran Anda, poin kedisiplinan, dan kalender presensi secara mendetail."
        >
          {isLoading ? (
            <div className="flex justify-center py-40">
              <Loader size="lg" />
            </div>
          ) : !rekap || !rekap.detail || rekap.detail.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Belum Ada Data Presensi"
              description="Tidak ada catatan presensi yang ditemukan untuk bulan ini."
            />
          ) : (
            pageContent
          )}
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default MyAttendancePage;
