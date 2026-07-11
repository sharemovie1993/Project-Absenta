import React, { useEffect } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import { useTvStore } from '@/store/tvStore';
import { cn } from '@/lib/utils';
import Tooltip from './Tooltip';

interface TvModeToggleProps {
  className?: string;
  variant?: 'toolbar' | 'floating-exit';
}

export const TvModeToggle: React.FC<TvModeToggleProps> = ({ 
  className, 
  variant = 'toolbar' 
}) => {
  const { isTvMode, setTvMode, toggleTvMode } = useTvStore();

  // Sinkronisasi state isTvMode dengan actual browser fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen && isTvMode) {
        setTvMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isTvMode, setTvMode]);

  const handleToggle = async () => {
    try {
      if (!isTvMode) {
        // Go Fullscreen
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
        setTvMode(true);
      } else {
        // Exit Fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setTvMode(false);
      }
    } catch (err) {
      console.warn('Failed to switch fullscreen mode:', err);
      // Fallback: toggle state even if fullscreen API fails (e.g. iframe context)
      toggleTvMode();
    }
  };

  if (variant === 'floating-exit') {
    if (!isTvMode) return null;

    return (
      <button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 font-black uppercase tracking-wider text-[10px]",
          className
        )}
      >
        <MonitorOff size={14} />
        <span>Keluar Mode TV</span>
      </button>
    );
  }

  return (
    <Tooltip content={isTvMode ? "Keluar Mode TV" : "Tampilkan di TV / Monitor Besar"}>
      <button
        onClick={handleToggle}
        aria-label="Toggle Kiosk TV Mode"
        className={cn(
          "p-2.5 rounded-xl border transition-all duration-200 shadow-sm flex items-center justify-center",
          isTvMode
            ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
            : "bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300",
          className
        )}
      >
        {isTvMode ? <MonitorOff size={16} /> : <Monitor size={16} />}
      </button>
    </Tooltip>
  );
};
