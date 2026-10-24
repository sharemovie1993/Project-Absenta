import React, { useState, Suspense, lazy } from 'react';
import { Users, UserCheck, Shield, Sparkles, Briefcase, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, Loader } from '@/components/ui';
import { HubStatusStrip } from '@/components/ui/hub';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const SiswaView = lazy(() =>
  import('@/components/academic/siswa/SiswaView').then((m) => ({ default: m.SiswaView }))
);

export interface WalasSiswaTabProps {
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  data?: WalasDashboardData;
}

export const WalasSiswaTab: React.FC<WalasSiswaTabProps> = React.memo(({
  kelasId,
  kelasNama,
  tahunPelajaranId,
  semesterId,
  data,
}) => {
  const [subView, setSubView] = useState<'roster' | 'struktur'>('roster');
  const [showMiniStats, setShowMiniStats] = useState(true);
  const kelasInfo = data?.kelasInfo;
  const isSmkUpper = (kelasInfo?.tingkat || 10) >= 11;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. HEADER RINGKAS & SUB-SWITCHER (Shopee-Grade High-Density) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Peserta Didik {kelasNama || kelasInfo?.nama_kelas || 'Rombel'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {kelasInfo?.jurusan?.nama || 'Umum'} • {kelasInfo?.totalSiswa || 0} Siswa
              </p>
            </div>
          </div>

          {/* Toggle Mini Card on Mobile */}
          <button
            type="button"
            onClick={() => setShowMiniStats((prev) => !prev)}
            aria-label="Toggle ringkasan metrik"
            className="sm:hidden text-[10.5px] font-medium px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            {showMiniStats ? (
              <>
                <EyeOff className="w-3 h-3 text-slate-400" />
                <span>Ringkasan</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-slate-400" />
                <span>Ringkasan</span>
              </>
            )}
          </button>
        </div>

        {/* Sub-View Switcher (Capitalize, Ramping Ala Shopee) */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSubView('roster')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
              subView === 'roster'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Roster Siswa
          </button>
          <button
            type="button"
            onClick={() => setSubView('struktur')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
              subView === 'struktur'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Struktur & Piket
          </button>
        </div>
      </div>

      {/* 2. MINI METRIK 1 BARIS KARTU (Shopee-Grade Hairline Strip) */}
      {showMiniStats && subView === 'roster' && (
        <HubStatusStrip
          items={[
            {
              id: 'total',
              title: `${kelasInfo?.totalSiswa || 0} Siswa`,
              subtitle: 'Terdaftar',
            },
            {
              id: 'laki',
              title: `${kelasInfo?.totalLaki || 0} L`,
              subtitle: 'Laki-laki',
              className: 'text-indigo-600 dark:text-indigo-400',
            },
            {
              id: 'perempuan',
              title: `${kelasInfo?.totalPerempuan || 0} P`,
              subtitle: 'Perempuan',
              className: 'text-pink-600 dark:text-pink-400',
            },
            {
              id: 'status',
              title: '100% Aktif',
              subtitle: 'Status Rombel',
              className: 'text-emerald-600 dark:text-emerald-400',
            },
          ]}
        />
      )}

      {/* 3. KONTEN SUB-VIEW (Keep-Alive Sub-View Toggle) */}
      <div className={subView === 'roster' ? 'block' : 'hidden'}>
        <div className="space-y-4">
          {/* Universal Role-Ready Siswa View Scoped to Kelas - Code-split Chunk */}
          <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
            <SiswaView
              hideLayout
              hideHeaderStats
              hideScopeBanner
              kelasId={kelasId}
              kelasNama={kelasNama}
              tahunPelajaranId={tahunPelajaranId}
              semesterId={semesterId}
            />
          </Suspense>
        </div>
      </div>

      <div className={subView === 'struktur' ? 'block' : 'hidden'}>
        {/* Struktur Organisasi & Regu Piket Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Struktur Organisasi Kelas */}
          <Card className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Perangkat Pengurus Kelas</h4>
                <p className="text-xs text-slate-500">Struktur kepemimpinan rombel peserta didik</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { role: 'Ketua Murid (KM)', name: 'Perwakilan Siswa 1', desc: 'Koordinator kelas dan penghubung walas' },
                { role: 'Wakil Ketua Murid', name: 'Perwakilan Siswa 2', desc: 'Pendamping ketua murid' },
                { role: 'Sekretaris 1 & 2', name: 'Perwakilan Siswa 3 & 4', desc: 'Pencatat absensi & agenda kelas harian' },
                { role: 'Bendahara 1 & 2', name: 'Perwakilan Siswa 5 & 6', desc: 'Pengelola kas & perlengkapan kelas' },
              ].map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{pos.role}</p>
                    <p className="text-[11px] text-slate-400">{pos.desc}</p>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-medium px-2.5 py-1">
                    {pos.name}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Jadwal Regu Piket Kebersihan */}
          <Card className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Regu Piket Kebersihan Kelas</h4>
                <p className="text-xs text-slate-500">Jadwal pembagian ketertiban ruang kelas Senin - Jumat</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { day: 'Senin', count: '7 Siswa', lead: 'Regu A (Koord: Ahmad)' },
                { day: 'Selasa', count: '7 Siswa', lead: 'Regu B (Koord: Budi)' },
                { day: 'Rabu', count: '7 Siswa', lead: 'Regu C (Koord: Citra)' },
                { day: 'Kamis', count: '7 Siswa', lead: 'Regu D (Koord: Doni)' },
                { day: 'Jumat', count: '8 Siswa', lead: 'Regu E (Koord: Eka)' },
              ].map((pkt, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs font-bold text-slate-700 dark:text-slate-300">{pkt.day}</span>
                    <span className="text-xs text-slate-500">{pkt.lead}</span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px]">
                    {pkt.count}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. WIDGET KHUSUS SISWA PKL SMK (Fase F Kelas XI / XII) */}
      {isSmkUpper && (
        <Card className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-r from-indigo-50/30 via-white to-blue-50/20 dark:from-slate-900 dark:to-indigo-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monitoring Siswa PKL (Praktik Kerja Lapangan)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sebagai wali kelas jenjang SMK, pantau kesiapan administrasi dan kondisi peserta didik binaan saat diterjunkan ke industri mitra (DUDI).
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold text-xs shrink-0">
              SMK Fase F Terintegrasi
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
});

WalasSiswaTab.displayName = 'WalasSiswaTab';
