import React, { useState } from 'react';
import { 
  Shield, 
  GitBranch, 
  Sparkles, 
  Layers
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { HubStatusStrip } from '@/components/ui/hub';
import { useSiswaOptions } from '@/hooks/useSiswaOptions';
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
  const kelasInfo = data?.kelasInfo;
  const effectiveKelasId = kelasId || kelasInfo?.id;
  const effectiveKelasNama = kelasNama || kelasInfo?.nama_kelas || 'Kelas Binaan';
  const waliKelasNama = kelasInfo?.waliKelas?.nama || 'Wali Kelas';
  const waliKelasNip = kelasInfo?.waliKelas?.nip;

  // Fetch real students from class for intelligent slot distribution
  const { rawList: studentsList, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: effectiveKelasId,
    enabled: Boolean(effectiveKelasId),
    onlyActive: true,
  });

  // Active view switcher: 'all' | 'struktur' | 'piket'
  const [activeSection, setActiveSection] = useState<'all' | 'struktur' | 'piket'>('all');

  // Deteksi Hari Ini
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[new Date().getDay()] || 'Senin';

  const totalSiswaRombel = studentsList.length || kelasInfo?.totalSiswa || 0;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 pb-12 animate-in fade-in duration-200">
      {/* ── 1. Mini Status Strip (Shopee-Grade High-Density) ── */}
      <HubStatusStrip
        items={[
          {
            id: 'total_siswa',
            title: `${totalSiswaRombel} Siswa`,
            subtitle: 'Rombel Aktif',
            className: 'text-indigo-600 dark:text-indigo-400',
          },
          {
            id: 'struktur_pos',
            title: '8 Posisi',
            subtitle: 'Struktur Organisasi',
            className: 'text-violet-600 dark:text-violet-400',
          },
          {
            id: 'regu_piket',
            title: '5 Regu',
            subtitle: 'Bagi Rata (Senin-Jum)',
            className: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            id: 'hari_ini',
            title: todayName,
            subtitle: 'Piket Hari Ini',
            className: 'text-amber-600 dark:text-amber-400',
          },
        ]}
      />

      {/* ── 2. Header & Tab Navigation Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Tata Kelola {effectiveKelasNama}</span>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-200 text-indigo-700 dark:text-indigo-300">
                Wali: {waliKelasNama}
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bagan pohon organisasi kepengurusan & jadwal piket kebersihan kelas
            </p>
          </div>
        </div>

        {/* Section View Switcher (Shopee-Grade Segmented Tabs) */}
        <div className="grid grid-cols-3 sm:flex items-center p-1 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('struktur')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'struktur'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Bagan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('piket')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'piket'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Piket</span>
          </button>
        </div>
      </div>

      {/* ── 3. Content Sections ── */}
      <div className="space-y-4 sm:space-y-6">
        {/* SECTION A: BAGAN STRUKTUR ORGANISASI KELAS (BAGAN POHON) */}
        {(activeSection === 'all' || activeSection === 'struktur') && (
          <Card className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 sm:space-y-4">
            <BaganStrukturOrganisasi
              kelasId={effectiveKelasId}
              kelasNama={effectiveKelasNama}
              waliKelasNama={waliKelasNama}
              waliKelasNip={waliKelasNip}
              studentsList={studentsList}
              isLoadingStudents={isLoadingStudents}
            />
          </Card>
        )}

        {/* SECTION B: JADWAL PIKET PINTAR (MEMBAGI RATA KE JUMLAH SISWA) */}
        {(activeSection === 'all' || activeSection === 'piket') && (
          <Card className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 sm:space-y-4">
            <JadwalPiketPintar
              kelasId={effectiveKelasId}
              kelasNama={effectiveKelasNama}
              studentsList={studentsList}
              isLoadingStudents={isLoadingStudents}
            />
          </Card>
        )}
      </div>
    </div>
  );
});

WalasStrukturTab.displayName = 'WalasStrukturTab';
