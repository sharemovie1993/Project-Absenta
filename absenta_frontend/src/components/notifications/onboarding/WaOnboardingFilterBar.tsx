import React from 'react';
import { Filter, Sparkles, Search } from 'lucide-react';
import type { RoleFilterType, StatusFilterType } from '@/hooks/useWaOnboarding';

interface WaOnboardingFilterBarProps {
  roleFilter: RoleFilterType;
  onSelectRole: (role: RoleFilterType) => void;
  statusFilter: StatusFilterType;
  onSelectStatus: (status: StatusFilterType) => void;
  search: string;
  onSearchChange: (search: string) => void;
  totalBelum: number;
  bulkSending: boolean;
  onOpenBulkModal: () => void;
}

export function WaOnboardingFilterBar({
  roleFilter,
  onSelectRole,
  statusFilter,
  onSelectStatus,
  search,
  onSearchChange,
  totalBelum,
  bulkSending,
  onOpenBulkModal,
}: WaOnboardingFilterBarProps) {
  const roleList: RoleFilterType[] = [
    'ALL',
    'GURU',
    'SISWA',
    'ORTU',
    'KEPALA_SEKOLAH',
    'WALIKELAS',
    'PETUGAS_KELAS',
    'PETUGAS_GERBANG',
    'KAPROG',
    'WAKA',
    'TOOLMAN',
    'TU',
    'BPBK',
    'KOPERASI',
  ];

  const labels: Record<RoleFilterType, string> = {
    ALL: 'Semua Peran',
    GURU: '📚 Guru',
    SISWA: '🎓 Siswa',
    ORTU: '👨‍👩‍👧 Ortu',
    KEPALA_SEKOLAH: '👨‍💼 Kepala Sekolah',
    WALIKELAS: '🏫 Wali Kelas',
    PETUGAS_KELAS: '📋 Petugas Kelas',
    PETUGAS_GERBANG: '🛡️ Petugas Gerbang',
    KAPROG: '👨‍🏫 Kaprog',
    WAKA: '👔 Para Waka',
    TOOLMAN: '🔧 Toolman',
    TU: '📁 Tata Usaha',
    BPBK: '💬 Guru BP/BK',
    KOPERASI: '🏪 Koperasi',
  };

  const statusLabels: Record<StatusFilterType, string> = {
    ALL: 'Semua',
    BELUM: '🔴 Belum Komunikasi',
    SUDAH: '🟢 Sudah Komunikasi',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filter Role Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Peran:
          </span>
          {roleList.map((r) => {
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => onSelectRole(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Action Bulk Button */}
        <button
          onClick={onOpenBulkModal}
          disabled={bulkSending || totalBelum === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Sapa Semua yang Belum Komunikasi ({totalBelum})</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Filter Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
          {(['ALL', 'BELUM', 'SUDAH'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => onSelectStatus(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  active
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {statusLabels[st]}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, no HP, atau detail info..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>
    </div>
  );
}
