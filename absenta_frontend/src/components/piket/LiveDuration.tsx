import React, { useState, useEffect } from 'react';

interface LiveDurationProps {
  jamKeluar: string;
}

export const LiveDuration: React.FC<LiveDurationProps> = React.memo(({ jamKeluar }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(jamKeluar).getTime();
      const now = new Date().getTime();
      const diffMs = now - start;
      if (diffMs < 0) {
        setElapsed('Baru saja');
        return;
      }
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      if (hours > 0) {
        setElapsed(`${hours} jam ${mins} menit`);
      } else {
        setElapsed(`${mins} menit`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [jamKeluar]);

  return (
    <span className="font-bold text-rose-600 animate-pulse">
      {elapsed}
    </span>
  );
});

export default LiveDuration;
