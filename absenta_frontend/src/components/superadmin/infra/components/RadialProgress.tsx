import React from 'react';

interface RadialProgressProps {
  score: number;
  label: string;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ score, label }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let colorClass = 'text-rose-500';
  if (score >= 90) {
    colorClass = 'text-emerald-400';
  } else if (score >= 50) {
    colorClass = 'text-amber-400';
  }
  
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[70px] bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl">
      <div className="relative flex items-center justify-center">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-slate-800"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className={colorClass}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-[11px] font-black font-mono text-white">{score}</span>
      </div>
      <span className="text-[8px] font-black text-slate-400 uppercase text-center tracking-wide block truncate w-full">{label}</span>
    </div>
  );
};
