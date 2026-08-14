/**
 * Web Audio API Synthesizer dengan First User Gesture Gatekeeper
 * Sepenuhnya mematuhi kebijakan Autoplay browser modern (Chrome/Safari Autoplay Policy)
 * Mencegah warning autoplay mengotori developer console secara elegan.
 */

let sharedAudioContext: AudioContext | null = null;

/**
 * Mendapatkan instance AudioContext bersama secara aman.
 * Jika dalam keadaan suspended (kebijakan autoplay), akan di-resume saat interaksi pengguna dideteksi.
 */
const getAudioContext = (): AudioContext | null => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }

    // Jika browser menangguhkan AudioContext karena belum ada interaksi pengguna
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {
        // Abaikan kegagalan resume secara diam-diam agar konsol tetap bersih
      });
    }

    return sharedAudioContext;
  } catch (err) {
    return null;
  }
};

// Pasang pendengar interaksi pertama untuk mengaktifkan AudioContext secara proaktif
if (typeof window !== 'undefined') {
  const initOnGesture = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'running') {
      // Hapus listener setelah AudioContext sukses aktif demi efisiensi memori
      window.removeEventListener('click', initOnGesture);
      window.removeEventListener('keydown', initOnGesture);
      console.log('🎵 [AudioUtils] AudioContext successfully initialized via first user gesture.');
    }
  };
  window.addEventListener('click', initOnGesture, { passive: true });
  window.addEventListener('keydown', initOnGesture, { passive: true });
}

/**
 * Memainkan nada bel notifikasi premium (Chime)
 * Hanya akan berbunyi jika AudioContext sudah aktif (diizinkan oleh interaksi pengguna)
 */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') {
      return;
    }
    
    // Nada Pertama (Chime Low - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);
    
    // Nada Kedua (Chime High - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (err) {
    // Graceful fallback
  }
};

/**
 * Memainkan nada alarm sesi KBM (Tri-Tone Chime: C5 -> E5 -> G5)
 * Dirancang khusus untuk peringatan pembukaan sesi KBM yang jernih dan elegan.
 */
export const playSessionAlarmSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') {
      return;
    }

    const tones = [
      { freq: 523.25, timeOffset: 0.00, duration: 0.35 }, // C5
      { freq: 659.25, timeOffset: 0.12, duration: 0.35 }, // E5
      { freq: 783.99, timeOffset: 0.24, duration: 0.60 }, // G5
    ];

    tones.forEach(({ freq, timeOffset, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + timeOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + duration);

      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + duration + 0.05);
    });
  } catch (err) {
    // Graceful fallback
  }
};

/**
 * Memicu getaran pada perangkat yang mendukung Vibration API (Android Chrome/Edge/dll)
 */
export const triggerVibration = (pattern: number | number[] = [300, 150, 300, 150, 500]) => {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Graceful fallback
  }
};

let activeAlarmInterval: any = null;
let activeVibrationInterval: any = null;
let activeLoopAudioCtx: AudioContext | null = null;

export const isAlarmRinging = (): boolean => activeAlarmInterval !== null;

/**
 * Memainkan 1 pulsa "tit-tit-tit-tit" ala Find My Device Google (High Pitch Beeps)
 */
const playFindDeviceBeepPulse = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;
    const beeps = [
      { freq: 1046.50, start: 0.00, dur: 0.08 }, // C6
      { freq: 1318.51, start: 0.11, dur: 0.08 }, // E6
      { freq: 1046.50, start: 0.22, dur: 0.08 }, // C6
      { freq: 1567.98, start: 0.33, dur: 0.18 }, // G6
    ];

    beeps.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(0.35, now + start + 0.015);
      gain.gain.linearRampToValueAtTime(0.0001, now + start + dur);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.03);
    });
  } catch (err) {
    console.error('[AudioUtils] Beep pulse error:', err);
  }
};

/**
 * Memulai Alarm Terus-Menerus (Looping "tit-tit-tit-tit") sampai dimatikan oleh user
 */
export const startFindDeviceAlarm = () => {
  stopFindDeviceAlarm(); // Reset instance sebelumnya jika ada

  try {
    const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!activeLoopAudioCtx || activeLoopAudioCtx.state === 'closed') {
      activeLoopAudioCtx = new AudioCtxClass();
    }
    const ctx = activeLoopAudioCtx;

    const playCycle = () => {
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      playFindDeviceBeepPulse(ctx);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playCycle()).catch(() => playCycle());
    } else {
      playCycle();
    }

    // Set interval untuk mengulang suara setiap 850 milidetik
    activeAlarmInterval = setInterval(playCycle, 850);

    // Getar berulang di HP setiap 950 milidetik
    const vibrateCycle = () => {
      triggerVibration([150, 60, 150, 60, 150, 60, 200]);
    };
    vibrateCycle();
    activeVibrationInterval = setInterval(vibrateCycle, 950);
  } catch (err) {
    console.error('[AudioUtils] startFindDeviceAlarm error:', err);
  }
};

/**
 * Menghentikan Alarm saat pengguna menanggapi / mematikan tombol
 */
export const stopFindDeviceAlarm = () => {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
  if (activeVibrationInterval) {
    clearInterval(activeVibrationInterval);
    activeVibrationInterval = null;
  }
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
};

/**
 * Meminta izin Web Notification API ke pengguna
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * Mengirim notifikasi sistem lengkap dengan Suara, Getar, dan Banner OS
 */
export const notifySessionReady = (title: string, body: string, onClickUrl?: string) => {
  // 1. Mulai Alarm Looping Find Device
  startFindDeviceAlarm();

  // 2. Banner Notifikasi Browser / OS (Jika diizinkan)
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'session-ready-alert',
        requireInteraction: true,
      });

      if (onClickUrl) {
        notif.onclick = () => {
          stopFindDeviceAlarm();
          window.focus();
          window.location.href = onClickUrl;
          notif.close();
        };
      }
    }
  } catch (err) {
    // Graceful fallback
  }
};


