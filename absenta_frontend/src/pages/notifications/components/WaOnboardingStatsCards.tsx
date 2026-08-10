import React from 'react';
import { Users, BookOpen, GraduationCap, HeartHandshake, XCircle, CheckCircle2 } from 'lucide-react';
import type { WaOnboardingSummary } from '@/api/whatsapp.api';

interface WaOnboardingStatsCardsProps {
  summary: WaOnboardingSummary;
}

export function WaOnboardingStatsCards({ summary }: WaOnboardingStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Terdaftar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Total Pengguna</span>
          <Users className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-white">{summary.totalTotal}</div>
      </div>

      {/* Guru & Staf */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Guru & Staf</span>
          <BookOpen className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-xl font-bold text-sky-400">{summary.totalGuru}</div>
      </div>

      {/* Siswa */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Siswa Active</span>
          <GraduationCap className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-xl font-bold text-indigo-400">{summary.totalSiswa}</div>
      </div>

      {/* Orang Tua */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Orang Tua</span>
          <HeartHandshake className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-400">{summary.totalOrtu}</div>
      </div>

      {/* Belum Komunikasi */}
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-rose-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Belum Sapa</span>
          <XCircle className="w-4 h-4 text-rose-400 animate-pulse" />
        </div>
        <div className="text-xl font-extrabold text-rose-300">{summary.totalBelum}</div>
      </div>

      {/* Sudah Komunikasi */}
      <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-emerald-400 mb-1">
          <span className="text-xs font-medium">Sudah Sapa</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-emerald-300">{summary.totalSudah}</div>
      </div>
    </div>
  );
}
