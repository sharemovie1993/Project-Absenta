import React, { useState, useEffect } from 'react';

interface TenantConfig {
  jamMasuk: string;
  jamPulang: string;
  toleransi: number;
}

export const useGateLogic = (tenantConfig: TenantConfig | null, onDirectionChange?: (val: any) => void) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [internalDirection, setInternalDirection] = useState<any>('GERBANG_DATANG');
  const lastAutoPhaseRef = React.useRef<'MASUK' | 'PULANG' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tenantConfig) return;

    const checkAutoSwitch = () => {
      try {
        const [pHours, pMinutes] = tenantConfig.jamPulang.split(':').map(Number);
        const pulangDate = new Date(currentTime);
        pulangDate.setHours(pHours, pMinutes, 0, 0);

        const currentPhase = currentTime >= pulangDate ? 'PULANG' : 'MASUK';

        if (lastAutoPhaseRef.current !== currentPhase) {
          const newDirection = currentPhase === 'PULANG' ? 'GERBANG_PULANG' : 'GERBANG_DATANG';
          if (onDirectionChange) onDirectionChange(newDirection);
          else setInternalDirection(newDirection);
          lastAutoPhaseRef.current = currentPhase;
        }
      } catch (e) {}
    };

    checkAutoSwitch();
  }, [currentTime, tenantConfig, onDirectionChange]);

  const timeStatus = React.useMemo(() => {
    if (!tenantConfig || internalDirection !== 'GERBANG_DATANG') return null;
    try {
      const [hours, minutes] = tenantConfig.jamMasuk.split(':').map(Number);
      const targetDate = new Date(currentTime);
      targetDate.setHours(hours, minutes, 0, 0);
      const limitDate = new Date(targetDate);
      limitDate.setMinutes(minutes + tenantConfig.toleransi);
      const isLate = currentTime > limitDate;
      let lateMinutes = 0;
      if (isLate) {
        lateMinutes = Math.floor((currentTime.getTime() - targetDate.getTime()) / 60000);
      }
      return { status: isLate ? 'TERLAMBAT' : 'TEPAT_WAKTU', lateMinutes };
    } catch { return null; }
  }, [currentTime, tenantConfig, internalDirection]);

  return {
    currentTime,
    internalDirection,
    setInternalDirection,
    timeStatus
  };
};
