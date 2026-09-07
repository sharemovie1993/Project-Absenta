import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  QrCode, 
  FileText, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { Card, Button, Badge } from '../ui';

interface EmptySubscriptionOverviewProps {
  activeAcademicTier: string;
}

const RECOMMENDED_MODULES = [
  {
    icon: QrCode,
    color: 'from-blue-500 to-indigo-600',
    title: 'Presensi GPS & WhatsApp',
    desc: 'Absensi akurat koordinat radius sekolah & notifikasi instan ke nomor WhatsApp wali murid.',
    tag: 'Paling Populer'
  },
  {
    icon: FileText,
    color: 'from-amber-500 to-orange-600',
    title: 'CBT Ujian & Bank Soal',
    desc: 'Pelaksanaan ujian online anti-curang, acak soal & kunci otomatis langsung terintegrasi nilai.',
    tag: 'Akademik'
  },
  {
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-600',
    title: 'Keuangan SPP & POS',
    desc: 'Manajemen pos tagihan, multi-channel payment gateway, dan POS koperasi siswa digital.',
    tag: 'Keuangan'
  }
];

export const EmptySubscriptionOverview: React.FC<EmptySubscriptionOverviewProps> = React.memo(({
  activeAcademicTier
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Banner Core Platform Status */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                <ShieldCheck size={11} className="mr-1 inline" /> Lisensi Core Aktif
              </Badge>
              <span className="text-[10px] text-slate-400 font-medium">Akses Standar Institusi</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sekolah Anda Beroperasi pada Absenta Core Platform
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Fitur dasar master data siswa, guru, rombel, dan kurikulum siap digunakan. Tambahkan modul layanan opsional untuk mengotomasi absensi, ujian, dan tata kelola administrasi.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate('/catalog')}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <ShoppingBag size={14} />
            <span>Jelajahi Katalog</span>
          </Button>
        </div>

        {/* Feature Checkpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="font-medium text-[11px]">Database Master Terpusat</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="font-medium text-[11px]">Multi-User & Hak Akses Role</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="font-medium text-[11px]">Dukungan SIPLaH & SPJ BOS</span>
          </div>
        </div>
      </Card>

      {/* Rekomendasi Modul Tambahan */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" /> Modul Rekomendasi untuk Diaktifkan
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">Pengadaan Sesuai Kebutuhan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RECOMMENDED_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Card 
                key={idx}
                className="p-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-xs`}>
                      <Icon size={14} />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-bold text-slate-500 border-slate-200 dark:border-slate-700 px-1.5 py-0">
                      {mod.tag}
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                    {mod.title}
                  </h5>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                    {mod.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/catalog')}
                    className="p-0 h-auto text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Buka Spesifikasi</span>
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
});
