import { useCallback, useRef } from 'react';

export const useAudioFeedback = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(async (type: 'success' | 'error' = 'success') => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {}
      }

      const playTone = (freq: number, dur: number, g: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(g, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      };

      if (type === 'success') {
        playTone(1200, 0.2, 0.2);
      } else {
        playTone(400, 0.3, 0.3);
        setTimeout(() => playTone(400, 0.3, 0.3), 350);
      }
    } catch (e) {
        console.warn('Audio feedback failed', e);
    }
  }, []);

  return { playBeep };
};
