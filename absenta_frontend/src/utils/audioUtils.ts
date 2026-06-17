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
    // Jika belum di-resume oleh interaksi pertama, keluar secara anggun tanpa memicu error/warning
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
    
    // Nada Kedua (Chime High - E5) - Mulai dengan jeda manis (80ms)
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
