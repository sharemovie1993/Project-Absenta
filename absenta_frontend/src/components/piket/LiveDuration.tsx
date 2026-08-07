import React, { useState, useEffect } from 'react';

interface LiveDurationProps {
  jamKeluar: string;
  maxMinutes?: number;
}

export const LiveDuration: React.FC<LiveDurationProps> = React.memo(({ jamKeluar, maxMinutes = 45 }) => {
  const [elapsedText, setElapsedText] = useState('');
  const [diffMinutes, setDiffMinutes] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(jamKeluar).getTime();
      const now = new Date().getTime();
      const diffMs = now - start;
      if (diffMs < 0) {
        setElapsedText('Baru saja');
        setDiffMinutes(0);
        return;
      }
      const totalMinutes = Math.floor(diffMs / 60000);
      setDiffMinutes(totalMinutes);

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      if (hours > 0) {
        setElapsedText(`${hours}j ${mins}m`);
      } else if (mins === 0) {
        setElapsedText('Baru saja');
      } else {
        setElapsedText(`${mins}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 15000); // update every 15s
    return () => clearInterval(interval);
  }, [jamKeluar]);

  const isOverstay = diffMinutes > maxMinutes;
  const isNearLimit = diffMinutes >= maxMinutes - 5 && !isOverstay;

  if (isOverstay) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
        🔴 {elapsedText} (OVERSTAY)
      </span>
    );
  }

  if (isNearLimit) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        🟡 {elapsedText}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      🟢 {elapsedText}
    </span>
  );
});

export default LiveDuration;
