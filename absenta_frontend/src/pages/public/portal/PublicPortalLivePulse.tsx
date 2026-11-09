import React from 'react';
import { Activity, CheckCircle2, Clock, Sparkles, CalendarCheck2, Users } from 'lucide-react';
import { PublicLivePulse } from '../../../api/public-portal.api';

interface PublicPortalLivePulseProps {
  pulse: PublicLivePulse | null;
}

export const PublicPortalLivePulse: React.FC<PublicPortalLivePulseProps> = ({ pulse }) => {
  if (!pulse) return null;

  return (
    <section className="py-8 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-blue-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left Title & Live Indicator */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live School Pulse
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    TP {pulse.tahun_ajaran} • {pulse.semester}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                  Transparansi Budaya Positif & Kedisiplinan Akademik Real-Time
                </h3>
                <p className="text-xs text-blue-200/80 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                  <span>{pulse.status_pembiasaan_pagi}</span>
                </p>
              </div>
            </div>

            {/* Right Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:flex-shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  Kehadiran Siswa
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">
                  {pulse.indeks_kehadiran_siswa}%
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  Kehadiran Guru
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-blue-300 mt-0.5">
                  {pulse.indeks_kehadiran_guru}%
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  KBM Terlaksana
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-amber-300 mt-0.5">
                  {pulse.sesi_kbm_terlaksana_pct}%
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <CalendarCheck2 className="w-3 h-3 text-purple-400" />
                  Rombel Aktif
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-purple-300 mt-0.5">
                  {pulse.total_rombel_aktif} Kelas
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
