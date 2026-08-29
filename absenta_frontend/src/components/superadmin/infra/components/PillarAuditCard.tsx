import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { HardeningStandard } from '../infra.types';

interface PillarAuditCardProps {
  std?: HardeningStandard;
  standard?: HardeningStandard;
  isCritical?: boolean;
}

export const PillarAuditCard: React.FC<PillarAuditCardProps> = ({ std: stdProp, standard: standardProp, isCritical = false }) => {
  const item = stdProp || standardProp;
  if (!item) return null;

  const isVerified = item.status === 'VERIFIED';
  const isWarning  = item.status === 'WARNING';
  const isFailed   = item.status === 'FAILED';

  let cardClass = 'p-2 rounded-lg border transition-all space-y-1 ';
  let iconContainerClass = '';
  let statusBadgeClass = '';
  let IconComponent = X;

  if (isVerified) {
    cardClass += 'bg-emerald-950/10 border-emerald-900/30 hover:border-emerald-800/50';
    iconContainerClass = 'p-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40';
    statusBadgeClass = 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40';
    IconComponent = Check;
  } else if (isWarning) {
    cardClass += 'bg-yellow-950/10 border-yellow-900/30 hover:border-yellow-800/50';
    iconContainerClass = 'p-1 rounded bg-yellow-950/40 text-yellow-400 border border-yellow-900/40';
    statusBadgeClass = 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/40';
    IconComponent = AlertTriangle;
  } else {
    cardClass += 'bg-rose-950/10 border-rose-900/30 hover:border-rose-800/50';
    iconContainerClass = 'p-1 rounded bg-rose-950/40 text-rose-400 border border-rose-900/40';
    statusBadgeClass = 'bg-rose-950/50 text-rose-400 border border-rose-900/40';
    IconComponent = X;
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={iconContainerClass}>
            <IconComponent className="h-3 w-3 shrink-0" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black text-slate-200 truncate flex items-center gap-1.5 font-sans">
              {item.name}
              {isCritical && !isVerified && (
                <span className="inline-flex text-[6.5px] font-extrabold px-1 rounded bg-red-950 text-red-400 border border-red-900/40 uppercase tracking-widest shrink-0 animate-pulse">
                  CRITICAL
                </span>
              )}
              {isCritical && isVerified && (
                <span className="inline-flex text-[6.5px] font-extrabold px-1 rounded bg-slate-800 text-slate-500 border border-slate-700/50 uppercase tracking-widest shrink-0">
                  HIGH IMPACT
                </span>
              )}
            </span>
          </div>
        </div>
        <span className={`inline-flex text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${statusBadgeClass}`}>
          {item.status || 'UNKNOWN'}
        </span>
      </div>
      <p className="text-[9.5px] text-slate-400 font-medium font-sans leading-relaxed pl-7">
        {item.details || item.description}
      </p>
    </div>
  );
};
