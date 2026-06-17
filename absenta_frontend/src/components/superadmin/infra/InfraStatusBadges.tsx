import React from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2, XCircle, AlertTriangle, AlertCircle, RotateCw,
} from 'lucide-react';
import type { JobHealth } from './infra.types';

// ─── HEALTH BADGE ─────────────────────────────────────────────────────────────

interface HealthBadgeProps {
  health: JobHealth;
  isRunning: boolean;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ health, isRunning }) => {
  if (isRunning && health !== 'stuck') {
    return (
      <Badge variant="warning" className="text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5">
        <RotateCw className="h-2.5 w-2.5 animate-spin shrink-0" />
        Sedang Berjalan
      </Badge>
    );
  }
  if (health === 'stuck') {
    return (
      <Badge className="text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
        <XCircle className="h-2.5 w-2.5 shrink-0" />
        Macet (Stuck)
      </Badge>
    );
  }
  if (health === 'never') {
    return (
      <Badge className="text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
        Belum Pernah Jalan
      </Badge>
    );
  }
  if (health === 'stale') {
    return (
      <Badge className="text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
        Terlambat / Stale
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5">
      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      Siap (Idle)
    </Badge>
  );
};

// ─── STATUS PILL ──────────────────────────────────────────────────────────────

interface StatusPillProps {
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | null | undefined;
  error?: string | null;
  showLabel?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, error, showLabel = true }) => {
  if (status === 'SUCCESS') {
    return (
      <div className="flex items-center gap-1 mt-0.5 font-sans">
        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.25 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30 tracking-wide uppercase w-max">
          <CheckCircle2 className="h-2 w-2 text-emerald-500 shrink-0" />
          Ok
        </span>
        {showLabel && (
          <span className="text-[9px] font-medium text-slate-450 dark:text-slate-500 tracking-wide">
            (Hasil Terakhir)
          </span>
        )}
      </div>
    );
  }
  if (status === 'FAILED') {
    return (
      <div className="flex items-center gap-1 mt-0.5 font-sans">
        <span
          title={error || 'Terjadi kesalahan sistem'}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.25 text-[9px] font-extrabold bg-red-50 text-red-750 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 tracking-wide uppercase cursor-help animate-pulse w-max"
        >
          <XCircle className="h-2 w-2 text-red-500 shrink-0" />
          Gagal
        </span>
        {showLabel && (
          <span className="text-[9px] font-medium text-red-500/80 dark:text-red-450/80 cursor-help tracking-wide" title={error || 'Terjadi kesalahan sistem'}>
            (Error)
          </span>
        )}
      </div>
    );
  }
  return null;
};
