import React, { useState } from 'react';
import Badge from '../../ui/Badge';
import { FileText, CheckCircle2, ChevronLeft, ChevronRight, Stamp, Users } from 'lucide-react';
import type { CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';
import { ResolutionTextRenderer } from './ResolutionTextRenderer';

interface RatTvResolutionStageProps {
  resolutions: CoopResolutionItem[];
  coopName?: string;
  meetingLocation?: string | null;
  meetingDate?: string | null;
}

export const RatTvResolutionStage: React.FC<RatTvResolutionStageProps> = React.memo(({
  resolutions = [],
  coopName = 'KOPERASI KONSUMEN / SIMPAN PINJAM',
  meetingLocation,
  meetingDate,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!resolutions || resolutions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-slate-700 flex items-center justify-center text-indigo-500 mb-4 shadow-inner">
          <FileText className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
          Belum Ada Surat Ketetapan (TAP RAT) yang Diterbitkan
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
          Layar panggung akan menampilkan naskah ketetapan resmi ini saat draf TAP RAT disahkan oleh Presidium Sidang.
        </p>
      </div>
    );
  }

  const currentRes = resolutions[selectedIdx] || resolutions[0];
  const formattedDate = meetingDate ? new Date(meetingDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Hari ini';

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 space-y-4 max-w-5xl mx-auto w-full overflow-y-auto">
      {/* RESOLUTION SELECTOR TOOLBAR */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedIdx((prev) => Math.max(0, prev - 1))}
            disabled={selectedIdx === 0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            TAP {selectedIdx + 1} dari {resolutions.length}
          </span>
          <button
            type="button"
            onClick={() => setSelectedIdx((prev) => Math.min(resolutions.length - 1, prev + 1))}
            disabled={selectedIdx === resolutions.length - 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* LIST OF PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {resolutions.map((res, idx) => (
            <button
              key={res.id || idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedIdx === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {res.resolutionNo || `TAP 0${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* TELEPROMPTER DOCUMENT CONTAINER */}
      <div className="relative p-8 sm:p-12 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-lg font-serif space-y-6">
        {/* OFFICIAL STAMP BADGE */}
        <div className="absolute top-8 right-8 rotate-12 select-none pointer-events-none">
          <div className="border-4 border-emerald-600 text-emerald-700 px-4 py-1.5 rounded-xl font-sans font-black text-xs uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50/90 shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>DISAHKAN SECARA PARIPURNA</span>
          </div>
        </div>

        {/* HEADER */}
        <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
          <h2 className="text-base sm:text-xl font-black uppercase tracking-wider">
            {coopName}
          </h2>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            RAPAT ANGGOTA TAHUNAN (RAT)
          </h3>
          <p className="text-xs font-sans text-slate-500">
            Ketetapan Resmi Berdasarkan UU No. 25 Tahun 1992 tentang Perkoperasian
          </p>
        </div>

        {/* METADATA */}
        <div className="text-center space-y-1 pt-2">
          <h4 className="text-sm sm:text-lg font-black underline uppercase">
            SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN
          </h4>
          <p className="font-mono text-sm sm:text-base font-bold text-indigo-700">
            NOMOR: {currentRes.resolutionNo}
          </p>
          <p className="text-xs sm:text-base font-bold uppercase pt-1 text-slate-800 max-w-2xl mx-auto">
            TENTANG: {currentRes.subject}
          </p>
        </div>

        {/* DOCUMENT BODY (LARGE TELEPROMPTER TEXT) */}
        <div className="text-sm sm:text-base leading-relaxed text-justify text-slate-800 pt-3">
          <ResolutionTextRenderer text={currentRes.summary} isTeleprompter={true} />
        </div>

        {/* SIGNATURE SECTION */}
        <div className="pt-6 border-t border-slate-200 mt-8 font-sans">
          <div className="text-right text-xs text-slate-700 mb-4">
            Ditetapkan di: {meetingLocation || 'Aula Sidang Pleno RAT'}
            <br />
            Pada tanggal: {formattedDate}
          </div>
          <div className="text-center font-bold text-xs uppercase tracking-wider mb-6">
            PRESIDIUM SIDANG RAPAT ANGGOTA TAHUNAN
          </div>
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t border-slate-800 pt-1 font-bold">
              Ketua Sidang
            </div>
            <div className="border-t border-slate-800 pt-1 font-bold">
              Sekretaris Sidang
            </div>
            <div className="border-t border-slate-800 pt-1 font-bold">
              Anggota Presidium
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

RatTvResolutionStage.displayName = 'RatTvResolutionStage';
export default RatTvResolutionStage;
