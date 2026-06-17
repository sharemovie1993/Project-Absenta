// ─── INFRA UTILS ──────────────────────────────────────────────────────────────
// Utility functions, icon mappings, dan konstanta untuk komponen infrastruktur.

import React from 'react';
import {
  CalendarCheck, CreditCard, Bell, BarChart3, Wrench, Cog,
  CalendarClock, Mail, Cpu, Server,
} from 'lucide-react';
import type { GradeInfo } from './infra.types';

// ─── ICON MAPPINGS ────────────────────────────────────────────────────────────

export const getNodeIcon = (nodeId: string): React.ComponentType<any> => {
  const id = String(nodeId || '').toLowerCase();
  if (id.includes('billing')) return CreditCard;
  if (id.includes('attendance')) return CalendarCheck;
  if (id.includes('api')) return Server;
  return Cpu;
};

export const getWorkerIcon = (workerType: string): React.ComponentType<any> => {
  const t = String(workerType || '').toLowerCase();
  if (t === 'attendance') return CalendarCheck;
  if (t === 'billing') return CreditCard;
  if (t === 'notification') return Bell;
  if (t === 'analytics') return BarChart3;
  if (t === 'maintenance') return Wrench;
  if (t === 'infra') return Cog;
  if (t === 'recurring') return CalendarClock;
  if (t === 'email') return Mail;
  return Cpu;
};

// ─── TIME & DURATION FORMATTERS ───────────────────────────────────────────────

export const getServerTimeOffset = (): number => {
  if (typeof window !== 'undefined') {
    return (window as any).__SERVER_TIME_OFFSET__ || 0;
  }
  return 0;
};

export const fmtDuration = (val: number | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)} menit`;
  if (n >= 1_000) return `${(n / 1000).toFixed(2)} detik`;
  return `${n} ms`;
};

export const fmtAge = (ts: number | null | undefined): string => {
  if (!ts || !Number.isFinite(ts)) return '-';
  const offset = getServerTimeOffset();
  const delta = Math.max(0, (Date.now() - offset) - ts);
  const sec = Math.floor(delta / 1000);
  if (sec < 20) return 'Baru saja';
  if (sec < 60) return `${sec} detik lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
};

export const fmtClock = (ts: number | null | undefined): string => {
  if (!ts || !Number.isFinite(ts)) return '-';
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(ts);
  }
};

// ─── HIGH-PERFORMANCE THROTTLE UTILITY ────────────────────────────────────────

export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  let lastArgs: any[] | null = null;

  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  } as unknown as T;
}

// ─── HARDENING CONSTANTS ───────────────────────────────────────────────────────

// ① CRITICAL_PILLAR_IDS dipindah ke luar komponen agar tidak dibuat ulang setiap render
export const CRITICAL_PILLAR_IDS = new Set([
  'architectural_layout_standard',
  'architectural_safe_mapping',
  'architectural_memoization',
  'fault_tolerance',
  'memory_leak_safeguards',
  'architectural_performance_optimization',
  'architectural_table_pagination',
  'code_splitting',
]);

// ─── GRADE INFO ───────────────────────────────────────────────────────────────

export function getGradeInfo(scoreValue: number): GradeInfo {
  if (scoreValue >= 95) return {
    letter: 'A+',
    badgeText: '🛡️ Hardened (DEV AUDIT A+)',
    badgeClass: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/15 border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400',
    pingClass: 'bg-emerald-400', pingDotClass: 'bg-emerald-500',
    ringClass: 'border-emerald-500/20 text-emerald-400', ringPulse: 'border-emerald-400/40',
    headerGlow: 'from-emerald-950/40 via-teal-950/30 to-slate-900'
  };
  if (scoreValue >= 80) return {
    letter: 'A',
    badgeText: '🛡️ Hardened (DEV AUDIT A)',
    badgeClass: 'from-emerald-50 to-green-50 dark:from-emerald-950/15 dark:to-green-950/10 border-emerald-200 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    pingClass: 'bg-green-400', pingDotClass: 'bg-green-500',
    ringClass: 'border-green-500/20 text-green-400', ringPulse: 'border-green-400/30',
    headerGlow: 'from-emerald-950/40 via-teal-950/20 to-slate-900'
  };
  if (scoreValue >= 60) return {
    letter: 'B',
    badgeText: '⚠️ Partial (DEV AUDIT B)',
    badgeClass: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/10 border-yellow-250 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    pingClass: 'bg-yellow-400', pingDotClass: 'bg-yellow-500',
    ringClass: 'border-yellow-500/20 text-yellow-450', ringPulse: 'border-yellow-400/30',
    headerGlow: 'from-yellow-950/30 via-amber-950/20 to-slate-900'
  };
  if (scoreValue >= 45) return {
    letter: 'C',
    badgeText: '⚠️ Partial (DEV AUDIT C)',
    badgeClass: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 border-orange-250 dark:border-orange-900/30 text-orange-800 dark:text-orange-400',
    pingClass: 'bg-orange-400', pingDotClass: 'bg-orange-500',
    ringClass: 'border-orange-500/20 text-orange-450', ringPulse: 'border-orange-400/30',
    headerGlow: 'from-orange-950/35 via-amber-950/20 to-slate-900'
  };
  if (scoreValue >= 25) return {
    letter: 'D',
    badgeText: '🚨 Vulnerable (DEV AUDIT D)',
    badgeClass: 'from-red-50 to-orange-50 dark:from-red-950/15 dark:to-orange-950/10 border-red-200 dark:border-red-900/20 text-red-750 dark:text-red-400',
    pingClass: 'bg-orange-500 animate-pulse', pingDotClass: 'bg-orange-600',
    ringClass: 'border-orange-500/20 text-red-450', ringPulse: 'border-orange-400/30',
    headerGlow: 'from-red-950/30 via-orange-950/20 to-slate-900'
  };
  return {
    letter: 'F',
    badgeText: '🚨 Unhardened (DEV AUDIT F)',
    badgeClass: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/15 border-red-250 dark:border-red-900/30 text-red-800 dark:text-red-400',
    pingClass: 'bg-red-400 animate-pulse', pingDotClass: 'bg-red-500',
    ringClass: 'border-red-550/25 text-red-500 bg-red-950/10', ringPulse: 'border-red-400/40',
    headerGlow: 'from-red-950/40 via-rose-950/25 to-slate-900'
  };
}
