import React, { useState } from 'react';
import { 
  GitBranch, 
  Sparkles,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { useSiswaOptions } from '@/hooks/useSiswaOptions';
import { useAuthStore } from '@/store/authStore';
import { useGuruMe } from '@/hooks/useGuruMe';
import { BaganStrukturOrganisasi } from './struktur/BaganStrukturOrganisasi';
import { JadwalPiketPintar } from './struktur/JadwalPiketPintar';
import type { WalasDashboardData } from '../types';

export interface WalasStrukturTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasStrukturTab: React.FC<WalasStrukturTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();

  const kelasInfo = data?.kelasInfo;
  const effectiveKelasId = kelasId || kelasInfo?.id;
  const effectiveKelasNama = kelasNama || kelasInfo?.nama_kelas || 'Kelas Binaan';
  
  const waliKelasNama =
    kelasInfo?.waliKelas?.nama ||
    guruProfile?.nama_lengkap ||
    guruProfile?.nama ||
    (user as any)?.name ||
    'Wali Kelas';

  const waliKelasNip =
    kelasInfo?.waliKelas?.nip ||
    guruProfile?.nip ||
    (user as any)?.nip ||
    (user as any)?.guru_profile?.nip ||
    '';

  const tahunPelajaran = data?.academicContext?.tahunPelajaranNama || '2025/2026';

  // Fetch real students from class for intelligent slot distribution
  const { rawList: studentsList, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: effectiveKelasId,
    enabled: Boolean(effectiveKelasId),
    onlyActive: true,
  });

  // Active view switcher: Langsung fokus ke 'struktur' (Bagan) atau 'piket' (Jadwal Piket)
  const [activeSection, setActiveSection] = useState<'struktur' | 'piket'>('struktur');

  const totalSiswaRombel = studentsList.length || kelasInfo?.totalSiswa || 0;

  return (
    <div className="space-y-3.5 w-full max-w-full min-w-0 pb-16 animate-in fade-in duration-200">
      {/* ── 1. Direct Segmented Switcher (Fokus Langsung: Bagan Organisasi vs Jadwal Piket) ── */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="grid grid-cols-2 gap-1 w-full sm:w-auto sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => setActiveSection('struktur')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'struktur'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4 shrink-0" />
            <span>Bagan Organisasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('piket')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'piket'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Jadwal Piket</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">{effectiveKelasNama}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-500 dark:text-slate-400">Wali: {waliKelasNama}</span>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-200 text-indigo-700 dark:text-indigo-300">
            {totalSiswaRombel} Siswa
          </Badge>
        </div>
      </div>

      {/* ── 2. Content Workspaces (Tanpa Double Card Border, Langsung Menyajikan Kanvas Kerja) ── */}
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        {activeSection === 'struktur' ? (
          <BaganStrukturOrganisasi
            kelasId={effectiveKelasId}
            kelasNama={effectiveKelasNama}
            waliKelasNama={waliKelasNama}
            waliKelasNip={waliKelasNip}
            tahunPelajaran={tahunPelajaran}
            studentsList={studentsList}
            isLoadingStudents={isLoadingStudents}
          />
        ) : (
          <JadwalPiketPintar
            kelasId={effectiveKelasId}
            kelasNama={effectiveKelasNama}
            waliKelasNama={waliKelasNama}
            waliKelasNip={waliKelasNip}
            tahunPelajaran={tahunPelajaran}
            studentsList={studentsList}
            isLoadingStudents={isLoadingStudents}
          />
        )}
      </div>
    </div>
  );
});

WalasStrukturTab.displayName = 'WalasStrukturTab';
