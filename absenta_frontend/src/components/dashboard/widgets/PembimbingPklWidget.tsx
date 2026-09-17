import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  ArrowRight, 
  Users, 
  Building2, 
  Clock,
  Sparkles,
  ClipboardCheck,
  Award
} from 'lucide-react';
import { Button, Badge, Loader } from '../../ui';
import { hubinApi } from '../../../api/hubin.api';
import { toLocalDate } from '../../../utils/attendance/time';
import { SiswaBimbinganDetailModal } from '../../hubin/SiswaBimbinganDetailModal';

interface PembimbingPklWidgetProps {
  onNavigateTab?: (tabId: string) => void;
}

export const PembimbingPklWidget: React.FC<PembimbingPklWidgetProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const todayStr = useMemo(() => toLocalDate(), []);
  const [selectedSiswaForModal, setSelectedSiswaForModal] = React.useState<any>(null);
  const [modalInitialTab, setModalInitialTab] = React.useState<'presensi' | 'logbook'>('presensi');

  const { data: penempatanRes, isLoading } = useQuery({
    queryKey: ['hubin-penempatan-pembimbing-widget'],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const rawList = useMemo(() => {
    if (Array.isArray(penempatanRes?.data)) return penempatanRes.data;
    if (Array.isArray(penempatanRes)) return penempatanRes;
    return [];
  }, [penempatanRes]);

  // Hanya siswa dengan status AKTIF
  const activeList = useMemo(() => {
    return rawList.filter((p: any) => p.status === 'AKTIF');
  }, [rawList]);

  // Kalkulasi statistik kehadiran siswa bimbingan hari ini
  const stats = useMemo(() => {
    let hadirCount = 0;
    let sakitCount = 0;
    let izinCount = 0;
    let pendingVerificationCount = 0;
    const mitraSet = new Set<string>();

    activeList.forEach((p: any) => {
      if (p.Mitra?.nama) {
        mitraSet.add(p.Mitra.nama);
      }

      const abs = p.AbsensiPkl?.[0];
      if (abs) {
        const absDate = typeof abs.tanggal === 'string' ? abs.tanggal.substring(0, 10) : '';
        if (absDate === todayStr) {
          const st = (abs.status || '').toUpperCase();
          const isHadir = Boolean(abs.jam_masuk || st === 'HADIR' || st === 'TERLAMBAT');
          const isSakit = st === 'SAKIT';
          const isIzin = st === 'IZIN';

          if (isHadir) hadirCount++;
          else if (isSakit) sakitCount++;
          else if (isIzin) izinCount++;

          if (!abs.is_verified && (isHadir || isSakit || isIzin)) {
            pendingVerificationCount++;
          }
        }
      }
    });

    return {
      totalSiswa: activeList.length,
      hadirCount,
      sakitCount,
      izinCount,
      pendingVerificationCount,
      mitraNames: Array.from(mitraSet),
    };
  }, [activeList, todayStr]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center gap-3">
        <Loader size="sm" />
        <span className="text-xs font-semibold text-slate-400">Memuat status bimbingan PKL...</span>
      </div>
    );
  }

  // Jika tidak ada siswa bimbingan yang terdaftar untuk guru ini
  if (activeList.length === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-500/20 shadow-xl space-y-4 sm:space-y-5 relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Monitoring Bimbingan PKL
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                PEMBIMBING
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {stats.totalSiswa} Siswa Aktif • {stats.mitraNames.slice(0, 2).join(', ')}
              {stats.mitraNames.length > 2 ? ` (+${stats.mitraNames.length - 2} DUDI lainnya)` : ''}
            </p>
          </div>
        </div>

        {/* Action Button ke Tab Bimbingan PKL */}
        {onNavigateTab && (
          <Button
            onClick={() => onNavigateTab('pembimbing_pkl')}
            className="self-start sm:self-auto h-9 px-4 rounded-xl text-xs font-black bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 shrink-0 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Buka Lembar Bimbingan</span>
            <ArrowRight size={13} />
          </Button>
        )}
      </div>

      {/* Status Grid (3 Kartu Ringkas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {/* Stat 1: Kehadiran Hari Ini di DUDI */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Check-In DUDI Hari Ini
            </span>
            <div className="text-base font-black text-white">
              {stats.hadirCount} / {stats.totalSiswa} Siswa
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {stats.sakitCount + stats.izinCount > 0 
                ? `${stats.sakitCount + stats.izinCount} izin/sakit • ${Math.max(0, stats.totalSiswa - stats.hadirCount - stats.sakitCount - stats.izinCount)} belum presensi`
                : stats.hadirCount === stats.totalSiswa 
                ? 'Semua siswa sudah masuk' 
                : `${stats.totalSiswa - stats.hadirCount} belum presensi`}
            </p>
          </div>
        </div>

        {/* Stat 2: Antrean Verifikasi Presensi */}
        <div className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 transition-colors ${
          stats.pendingVerificationCount > 0 
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            stats.pendingVerificationCount > 0 
              ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
              : 'bg-slate-700/40 text-slate-400'
          }`}>
            <ClipboardCheck size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Antrean Verifikasi
            </span>
            <div className={`text-base font-black ${stats.pendingVerificationCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.pendingVerificationCount} Presensi
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {stats.pendingVerificationCount > 0 ? 'Perlu approval pembimbing' : 'Semua telah diverifikasi'}
            </p>
          </div>
        </div>

        {/* Stat 3: Mitra Industri Bimbingan */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mitra Industri
            </span>
            <div className="text-base font-black text-white truncate">
              {stats.mitraNames.length} Tempat DUDI
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {stats.mitraNames[0] || 'DUDI Terplot'}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Bar & Quick Action Button jika ada Presensi yang Belum Diverifikasi */}
      {stats.pendingVerificationCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={17} className="text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-200">
              Ada {stats.pendingVerificationCount} kehadiran / izin siswa hari ini yang menunggu verifikasi pembimbing.
            </p>
          </div>
          <Button
            onClick={() => {
              const unverified = activeList.find((p: any) => {
                const abs = p.AbsensiPkl?.[0];
                const st = (abs?.status || '').toUpperCase();
                return abs && abs.tanggal?.substring(0, 10) === todayStr && !abs.is_verified && (abs.jam_masuk || st === 'HADIR' || st === 'SAKIT' || st === 'IZIN');
              });
              if (unverified) {
                setSelectedSiswaForModal(unverified);
                setModalInitialTab('presensi');
              } else if (onNavigateTab) {
                onNavigateTab('pembimbing_pkl');
              } else {
                navigate('/hubin/absensi');
              }
            }}
            className="h-8 px-4 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border-none shrink-0 shadow-md shadow-amber-950/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <span>Verifikasi Presensi Sekarang</span>
            <ArrowRight size={13} />
          </Button>
        </div>
      )}

      {/* Quick Links Strip */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Aksi Cepat:
        </span>
        <button
          type="button"
          onClick={() => {
            if (activeList.length === 1) {
              setSelectedSiswaForModal(activeList[0]);
              setModalInitialTab('presensi');
            } else if (onNavigateTab) {
              onNavigateTab('pembimbing_pkl');
            } else {
              navigate('/hubin/absensi');
            }
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ClipboardCheck size={13} className="text-emerald-400" />
          <span>Verifikasi Presensi</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeList.length === 1) {
              setSelectedSiswaForModal(activeList[0]);
              setModalInitialTab('logbook');
            } else if (onNavigateTab) {
              onNavigateTab('pembimbing_pkl');
            } else {
              navigate('/hubin/monitoring');
            }
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Clock size={13} className="text-blue-400" />
          <span>Review Logbook</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('pembimbing_pkl');
            } else {
              navigate('/hubin/penempatan');
            }
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <MapPin size={13} className="text-indigo-400" />
          <span>Lembar Bimbingan</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/hubin/nilai-pkl')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Award size={13} className="text-emerald-400" />
          <span>Input Nilai PKL</span>
        </button>
      </div>

      {/* ── Modal In-Place Drilldown ── */}
      {selectedSiswaForModal && (
        <SiswaBimbinganDetailModal
          isOpen={!!selectedSiswaForModal}
          onClose={() => setSelectedSiswaForModal(null)}
          siswaPkl={selectedSiswaForModal}
          initialTab={modalInitialTab}
        />
      )}
    </div>
  );
};
