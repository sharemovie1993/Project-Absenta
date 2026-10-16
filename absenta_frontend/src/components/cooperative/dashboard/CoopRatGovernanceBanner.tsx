import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Users, ShieldCheck, ArrowRight, Vote } from 'lucide-react';

interface CoopRatGovernanceBannerProps {
  totalActiveMembers?: number;
  fiscalYear?: number;
}

export const CoopRatGovernanceBanner: React.FC<CoopRatGovernanceBannerProps> = React.memo(({
  totalActiveMembers = 5,
  fiscalYear = new Date().getFullYear(),
}) => {
  const quorumTarget = totalActiveMembers > 0 ? Math.floor(totalActiveMembers / 2) + 1 : 1;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 border border-indigo-900/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full min-w-0">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start sm:items-center gap-3.5 z-10 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
          <Gavel size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-black text-white truncate">
              Kesiapan Rapat Anggota Tahunan (RAT) Tahun Buku {fiscalYear}
            </h4>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
              <ShieldCheck size={11} />
              <span>Kuorum Terkunci (50% + 1)</span>
            </span>
          </div>
          <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1">
              <Users size={12} className="text-indigo-400" />
              <strong>{totalActiveMembers} Anggota Aktif</strong> terdaftar
            </span>
            <span>&bull;</span>
            <span className="text-emerald-300 font-semibold">
              Ambang Sah: {quorumTarget} Suara Diperlukan
            </span>
            <span className="hidden sm:inline-block">&bull;</span>
            <span className="text-slate-400 hidden sm:inline-block">
              Asas One Member One Vote (UU No. 25/1992)
            </span>
          </p>
        </div>
      </div>

      <div className="z-10 shrink-0">
        <Link
          to="/cooperative/rat"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all w-full md:w-auto"
        >
          <Vote size={14} />
          <span>Buka Ruang Sidang RAT</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
});

CoopRatGovernanceBanner.displayName = 'CoopRatGovernanceBanner';
