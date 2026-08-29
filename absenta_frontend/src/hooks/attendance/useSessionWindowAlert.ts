import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { notifySessionPhase, stopFindDeviceAlarm, type NotificationAlertPhase } from '@/utils/audioUtils';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export interface ScheduleAlertItem {
  id: string;
  kelas_id?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  kelas_nama?: string;
  mapel_nama?: string;
  kegiatan?: string;
  guru_nama?: string;
  guru_status?: string;
  is_finished?: boolean;
  session?: {
    id?: string;
    status?: string;
    foto_kegiatan?: string | null;
  } | null;
}

interface UseSessionWindowAlertOptions {
  schedules?: ScheduleAlertItem[];
  enabled?: boolean;
  roleLabel?: 'guru' | 'petugas_kelas' | 'ops' | 'siswa' | 'general';
  onOpenSession?: (item: ScheduleAlertItem) => void;
  customToleranceMinutes?: number;
}

export type AlertPhase = 'PREPARE' | 'START' | 'LATE';

/**
 * Menghasilkan teks notifikasi, fase alarm & styling yang membedakan 3 kondisi:
 * 1. PREPARE: H-15 Menit s.d. Jam Mulai
 * 2. START: Jam Mulai Masuk s.d. +Toleransi Menit (Default 10m dari Tenant)
 * 3. LATE: > +Toleransi Menit (Masa Terlambat / Pemicu Inval)
 */
export function getSessionAlertDetails(item: ScheduleAlertItem, currentMinutes?: number, toleransiMenit: number = 10) {
  const now = new Date();
  const nowMin = currentMinutes ?? (now.getHours() * 60 + now.getMinutes());
  
  let phase: AlertPhase = 'PREPARE';

  if (item.jam_mulai && item.jam_mulai.includes(':')) {
    const [sH, sM] = item.jam_mulai.split(':').map(Number);
    const startMinutes = (sH || 0) * 60 + (sM || 0);
    if (nowMin > startMinutes + toleransiMenit) {
      phase = 'LATE';
    } else if (nowMin >= startMinutes) {
      phase = 'START';
    } else {
      phase = 'PREPARE';
    }
  }

  const mapelLabel = item.kegiatan || item.mapel_nama || 'KBM';
  const kelasLabel = item.kelas_nama || 'Kelas';

  let title = '';
  let body = '';
  let indicatorColor = 'bg-amber-400';

  if (phase === 'PREPARE') {
    // 🟡 Alarm 1: Masa Persiapan (H-15 Menit)
    title = `⏰ Persiapan KBM (${item.jam_mulai} WIB)`;
    body = `${kelasLabel} • ${mapelLabel} : Sesi sudah bisa dibuka dan siap di-tap.`;
    indicatorColor = 'bg-amber-400';
  } else if (phase === 'START') {
    // 🟢 Alarm 2: Jam Pelajaran Dimulai (Waktu Mulai)
    title = `🔔 Jam KBM Masuk (${item.jam_mulai} WIB)`;
    body = `${kelasLabel} • ${mapelLabel} : Jam pelajaran dimulai! Silakan buka sesi KBM.`;
    indicatorColor = 'bg-emerald-400';
  } else {
    // 🔴 Alarm 3: Masa Terlambat / Pemicu Inval
    title = `⚠️ Peringatan KBM (${item.jam_mulai} WIB)`;
    body = `${kelasLabel} • ${mapelLabel} : Melewati toleransi waktu (${toleransiMenit}m)! Segera buka sesi agar tidak dialihkan ke Guru Inval.`;
    indicatorColor = 'bg-rose-500';
  }

  return { title, body, phase, isBeforeClass: phase === 'PREPARE', isLate: phase === 'LATE', indicatorColor };
}

export function useSessionWindowAlert({
  schedules = [],
  enabled = true,
  roleLabel = 'guru',
  onOpenSession,
  customToleranceMinutes,
}: UseSessionWindowAlertOptions) {
  const navigate = useNavigate();
  const { tenant } = useTenantSettings();
  const toleransiMenit = useMemo(() => {
    if (customToleranceMinutes !== undefined) return customToleranceMinutes;
    return tenant?.toleransi_kbm_guru_inval_menit ?? 10;
  }, [customToleranceMinutes, tenant?.toleransi_kbm_guru_inval_menit]);

  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;
  const onOpenSessionRef = useRef(onOpenSession);
  onOpenSessionRef.current = onOpenSession;
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const checkSchedules = () => {
      const currentSchedules = schedulesRef.current;
      if (!currentSchedules || currentSchedules.length === 0) return;

      const now = new Date();
      const todayStr = now.toLocaleDateString('sv-SE');
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      currentSchedules.forEach((item) => {
        if (!item.jam_mulai || !item.jam_mulai.includes(':')) return;

        const [sH, sM] = item.jam_mulai.split(':').map(Number);
        const startMinutes = (sH || 0) * 60 + (sM || 0);
        const openMinutes = startMinutes - 15; // 15 menit sebelum jam mulai

        let endMinutes = startMinutes + 90;
        if (item.jam_selesai && item.jam_selesai.includes(':')) {
          const [eH, eM] = item.jam_selesai.split(':').map(Number);
          endMinutes = (eH || 0) * 60 + (eM || 0);
        }

        // Sudah masuk jendela waktu (openMinutes <= now <= endMinutes)
        const isWithinWindow = currentMinutes >= openMinutes && currentMinutes <= endMinutes;
        if (!isWithinWindow) return;

        // Cek apakah sesi sudah dibuka/selesai
        const isStarted = Boolean(
          item.session?.foto_kegiatan ||
          (item.guru_status && item.guru_status !== 'BELUM_TAP' && item.guru_status !== 'BELUM_HADIR' && item.guru_status !== 'ALPA')
        );
        const isFinished = item.is_finished || item.session?.status === 'SELESAI';
        if (isStarted || isFinished) return;

        // Tentukan fase alarm aktif saat ini (PREPARE, START, LATE) dengan toleransi dinamis tenant
        const { title, body, phase, indicatorColor } = getSessionAlertDetails(item, currentMinutes, toleransiMenit);

        // Kunci idempotency per fase alarm agar Alarm 1 (H-15), Alarm 2 (Jam Masuk), dan Alarm 3 (Terlambat)
        // masing-masing dapat berbunyi 1x pada fasenya jika sesi belum dibuka
        const notifyKey = `alert_${item.id}_${phase.toLowerCase()}_${todayStr}`;
        if (notifiedKeysRef.current.has(notifyKey)) return;
        if (typeof window !== 'undefined' && sessionStorage.getItem(notifyKey)) {
          notifiedKeysRef.current.add(notifyKey);
          return;
        }

        // Tandai fase ini sudah dinotifikasi
        notifiedKeysRef.current.add(notifyKey);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(notifyKey, 'true');
        }

        // Tentukan Target Navigasi
        const targetUrl = roleLabel === 'guru' 
          ? '/dashboard?tab=kbm' 
          : `/attendance/ops?subtab=kbm${item.kelas_id ? `&kelas_id=${item.kelas_id}` : ''}`;

        const actionButtonLabel = roleLabel === 'guru' 
          ? '📸 Buka Sesi KBM' 
          : '📋 Buka Presensi Ops';

        // 🎵 Picu Notifikasi Ramah & Proporsional Sesuai Fase (Tidak Rewel)
        notifySessionPhase(phase as NotificationAlertPhase, title, body, targetUrl);

        // Toast interaktif (dengan id unik agar tidak menumpuk & auto-dismiss dalam 12 detik)
        toast((t) => (
          React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm p-1' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('p', { className: 'font-black text-white flex items-center gap-2 text-sm' },
                React.createElement('span', { className: `w-2.5 h-2.5 rounded-full ${indicatorColor} animate-ping inline-block` }),
                title
              ),
              React.createElement('p', { className: 'text-xs text-slate-300' }, body)
            ),
            React.createElement('div', { className: 'flex items-center gap-2 self-end sm:self-center shrink-0' },
              React.createElement('button', {
                onClick: () => {
                  stopFindDeviceAlarm();
                  toast.dismiss(t.id);
                },
                className: 'px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-all'
              }, 'Tutup'),
              React.createElement('button', {
                onClick: () => {
                  stopFindDeviceAlarm();
                  toast.dismiss(t.id);
                  navigate(targetUrl);
                  if (onOpenSessionRef.current) {
                    onOpenSessionRef.current(item);
                  }
                },
                className: 'px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all'
              }, actionButtonLabel)
            )
          )
        ), {
          id: `session-window-alert-${item.id}`,
          duration: 12000,
          position: 'top-right',
          style: {
            background: '#090d16',
            border: phase === 'LATE' ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1.5px solid rgba(99, 102, 241, 0.4)',
            color: '#f8fafc',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
            borderRadius: '16px',
            padding: '12px 16px',
          }
        });
      });
    };

    // Jalankan pengecekan pertama dan berkala setiap 20 detik
    checkSchedules();
    const interval = setInterval(checkSchedules, 20 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, [enabled, roleLabel, navigate, toleransiMenit]);
}
