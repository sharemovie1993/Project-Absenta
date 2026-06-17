import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useParentSocket } from '../hooks/useParentSocket';

export const ParentNotificationSound = () => {
  const { socket } = useParentSocket();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (isAudioUnlocked) return;
      
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[ParentNotificationSound] AudioContext resumed by user interaction');
          setIsAudioUnlocked(true);
        });
      } else {
        setIsAudioUnlocked(true);
      }
      
      // Warm up TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Clear queue
        const warmUp = new SpeechSynthesisUtterance('');
        warmUp.volume = 0; // Silent
        window.speechSynthesis.speak(warmUp);
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [isAudioUnlocked]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any current speaking to avoid overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Indonesian
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Request Notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const playNotificationSequence = (message: string) => {
    // 0. Show System Notification (if background/hidden)
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Absenta Parent', {
          body: message,
          icon: '/icons/logo.png', // Updated to valid icon path
          tag: 'attendance-update', // Prevent stacking too many
          requireInteraction: true, // Keep notification visible
          badge: '/icons/logo.png', // Fallback badge
        });
      } catch (e) {
        console.error('System notification failed:', e);
      }
    }

    // 1. Play Ringtone
    const durationMs = playNotificationSound();

    // 2. Speak text
    // If background, speak IMMEDIATELY to avoid timer throttling
    if (document.hidden) {
      speakText(message);
    } else {
      // If foreground, wait for ringtone to finish nicely
      setTimeout(() => {
        speakText(message);
      }, durationMs); // Start TTS after sound ends
    }
  };

  const playNotificationSound = (): number => {
    let totalDuration = 0;
    try {
      // Get context via helper
      const ctx = getAudioContext();
      
      // Resume context if suspended (double check)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Ringtone pattern: Digital Trill
      // Repeat a fast pattern 4 times
      const loops = 4;
      const loopDuration = 0.6; // Duration of one trill block + pause
      
      totalDuration = loops * loopDuration * 1000;

      for (let i = 0; i < loops; i++) {
        const startTime = now + (i * loopDuration);
        
        // Note 1
        playTone(ctx, 880, startTime, 0.1);
        // Note 2
        playTone(ctx, 1174.66, startTime + 0.1, 0.1);
        // Note 1
        playTone(ctx, 880, startTime + 0.2, 0.1);
        // Note 2
        playTone(ctx, 1174.66, startTime + 0.3, 0.1);
        
        // Pause 0.2s before next loop
      }

    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
    
    return totalDuration;
  };

  const playTone = (ctx: AudioContext, freq: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = freq;

    // Envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Attack
    gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.02); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdate = (payload: any) => {
      console.log('Parent App Attendance Update:', payload);
      // We ignore this for Toast/Sound to avoid duplicates with 'notification' event.
      // The Dashboard uses this event to refresh data silently.
    };

    const handleNotification = (payload: any) => {
      console.log('Parent App Notification:', payload);
      const message = payload.data?.message || payload.message || 'Notifikasi baru';
      toast.info(message, {
        duration: 5000,
        icon: '📩'
      });
      playNotificationSequence(message);
    };

    socket.on('attendance_update', handleAttendanceUpdate);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('attendance_update', handleAttendanceUpdate);
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  return null; // Headless component
};
