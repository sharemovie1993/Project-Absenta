import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  MapPin, 
  Award, 
  FileText,
  Calendar,
  Phone,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Badge, Loader, Input, SectionCard } from '../../../ui';
import { hubinApi } from '../../../../api/hubin.api';
import { toLocalDate, formatLocalTimeFromISO, getTimezoneLabel } from '../../../../utils/attendance/time';
import { SiswaBimbinganDetailModal } from '../../../hubin/SiswaBimbinganDetailModal';

const formatWaktu = (raw?: string | null) => {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();
  const tzLabel = getTimezoneLabel();
  if (str.includes('T') || str.includes('Z')) {
    const formatted = formatLocalTimeFromISO(str);
    if (formatted) return `${formatted} ${tzLabel}`;
  }
  const clean = str.replace(/(WIB|WITA|WIT)/gi, '').trim();
  return clean ? `${clean} ${tzLabel}` : '-';
};

interface StaffPembimbingPklTabProps {
  guruId?: string;
  guruNama?: string;
}

export const StaffPembimbingPklTab: React.FC<StaffPembimbingPklTabProps> = ({
  guruId,
  guruNama,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => toLocalDate(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HADIR' | 'BELUM' | 'UNVERIFIED'>('ALL');
  const [selectedSiswaForModal, setSelectedSiswaForModal] = useState<any>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'presensi' | 'logbook'>('presensi');

  const handleOpenPresensiModal = (siswa: any) => {
    setSelectedSiswaForModal(siswa);
    setModalInitialTab('presensi');
  };

  const handleOpenLogbookModal = (siswa: any) => {
    setSelectedSiswaForModal(siswa);
    setModalInitialTab('logbook');
  };

  // Query Data Siswa Bimbingan
  const { data: penempatanRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hubin-penempatan-pembimbing-tab'],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    staleTime: 30 * 1000,
  });

  const rawList = useMemo(() => {
    if (Array.isArray(penempatanRes?.data)) return penempatanRes.data;
    if (Array.isArray(penempatanRes)) return penempatanRes;
    return [];
  }, [penempatanRes]);

  const activeList = useMemo(() => {
    return rawList.filter((p: any) => p.status === 'AKTIF');
  }, [rawList]);

  // Mutation Verifikasi Langsung
  const verifyMutation = useMutation({
    mutationFn: (absensiId: string) => hubinApi.verifyAbsensi(absensiId),
    onSuccess: () => {
      toast.success('Presensi siswa berhasil diverifikasi!');
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-tab'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-widget'] });
      queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memverifikasi presensi.');
    }
  });

  // Metriks Bimbingan
  const metrics = useMemo(() => {
    let hadirToday = 0;
    let unverifiedCount = 0;
    const mitraSet = new Set<string>();

    activeList.forEach((p: any) => {
      if (p.Mitra?.nama) mitraSet.add(p.Mitra.nama);
      const abs = p.AbsensiPkl?.[0];
      if (abs) {
        const absDate = typeof abs.tanggal === 'string' ? abs.tanggal.substring(0, 10) : '';
        if (absDate === todayStr) {
          const st = (abs.status || '').toUpperCase();
          const isHadir = Boolean(abs.jam_masuk || st === 'HADIR' || st === 'TERLAMBAT');
          const isSakit = st === 'SAKIT';
          const isIzin = st === 'IZIN';

          if (isHadir) {
            hadirToday++;
          }
          if (!abs.is_verified && (isHadir || isSakit || isIzin)) {
            unverifiedCount++;
          }
        }
      }
    });

    return {
      totalSiswa: activeList.length,
      hadirToday,
      unverifiedCount,
      totalMitra: mitraSet.size,
    };
  }, [activeList, todayStr]);

  // Filtered List
  const filteredList = useMemo(() => {
    return activeList.filter((item: any) => {
      const nama = item.Siswa?.nama_siswa || '';
      const nis = item.Siswa?.nis || '';
      const mitra = item.Mitra?.nama || '';
      const kelas = item.Siswa?.Kelas?.nama_kelas || '';

      const matchSearch = searchTerm === '' ||
        nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kelas.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      const abs = item.AbsensiPkl?.[0];
      const isToday = abs && (typeof abs.tanggal === 'string' ? abs.tanggal.substring(0, 10) === todayStr : false);
      const isHadir = isToday && (abs.jam_masuk || abs.status === 'HADIR' || abs.status === 'TERLAMBAT');
      const isUnverified = isToday && isHadir && !abs.is_verified;

      if (statusFilter === 'HADIR') return isHadir;
      if (statusFilter === 'BELUM') return !isHadir;
      if (statusFilter === 'UNVERIFIED') return isUnverified;

      return true;
    });
  }, [activeList, searchTerm, statusFilter, todayStr]);

  return (
    <motion.div
      key="tab-pembimbing-pkl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-3 sm:space-y-4"
    >
      {/* ── Top Header Banner (Compact & Clean) ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Briefcase size={18} className="sm:hidden" />
            <Briefcase size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                Lembar Bimbingan PKL
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                SUPERVISI
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
              Monitoring presensi harian & jurnal kegiatan siswa magang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/hubin/nilai-pkl')}
            className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
            title="Buka Lembar Penilaian Sidang & Sertifikat PKL"
          >
            <Award size={13} />
            <span className="hidden sm:inline">Input Nilai PKL</span>
            <span className="sm:hidden">Nilai</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
            title="Segarkan data"
          >
            <RefreshCw size={12} className={isRefetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>
      </div>

      {/* ── 4 Ultra-Compact Analytics Cards (Single Row Strip) ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Total Siswa */}
        <div className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center sm:gap-2.5 text-center sm:text-left transition-all">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-1 sm:mb-0">
            <Users size={14} className="sm:hidden" />
            <Users size={16} className="hidden sm:block" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Siswa
            </span>
            <div className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight">
              {metrics.totalSiswa} <span className="hidden sm:inline text-xs font-semibold text-slate-400">Anak</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hadir Hari Ini */}
        <div className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center sm:gap-2.5 text-center sm:text-left transition-all">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mb-1 sm:mb-0">
            <CheckCircle2 size={14} className="sm:hidden" />
            <CheckCircle2 size={16} className="hidden sm:block" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block truncate">
              Hadir
            </span>
            <div className="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {metrics.hadirToday}<span className="text-slate-400 font-bold">/{metrics.totalSiswa}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Menunggu Verifikasi */}
        <div className={`p-2 sm:p-3 rounded-2xl border shadow-2xs flex flex-col sm:flex-row items-center sm:gap-2.5 text-center sm:text-left transition-all ${
          metrics.unverifiedCount > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mb-1 sm:mb-0 ${
            metrics.unverifiedCount > 0
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <AlertCircle size={14} className="sm:hidden" />
            <AlertCircle size={16} className="hidden sm:block" />
          </div>
          <div className="min-w-0 w-full">
            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block truncate ${
              metrics.unverifiedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
            }`}>
              Verifikasi
            </span>
            <div className={`text-xs sm:text-base font-black leading-tight ${
              metrics.unverifiedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            }`}>
              {metrics.unverifiedCount}
            </div>
          </div>
        </div>

        {/* Card 4: Mitra DUDI */}
        <div className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center sm:gap-2.5 text-center sm:text-left transition-all">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mb-1 sm:mb-0">
            <Building2 size={14} className="sm:hidden" />
            <Building2 size={16} className="hidden sm:block" />
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Mitra
            </span>
            <div className="text-xs sm:text-base font-black text-slate-900 dark:text-white leading-tight">
              {metrics.totalMitra} <span className="hidden sm:inline text-xs font-semibold text-slate-400">DUDI</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar (Sleek & Compact) ── */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama siswa, NIS, mitra..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua ({activeList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('HADIR')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'HADIR'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            Hadir ({metrics.hadirToday})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNVERIFIED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'UNVERIFIED'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500'
            }`}
          >
            Belum Verifikasi ({metrics.unverifiedCount})
          </button>
        </div>
      </div>

      {/* ── Student List Table / Cards ── */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
          <Loader size="lg" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memuat daftar siswa bimbingan...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <Users size={28} />
          </div>
          <h4 className="text-base font-black text-slate-900 dark:text-white">Tidak Ada Data Siswa Bimbingan</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Tidak ada siswa bimbingan yang cocok dengan kriteria filter Anda.'
              : 'Belum ada siswa PKL yang diplot ke akun pembimbing Anda saat ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item: any) => {
            const abs = item.AbsensiPkl?.[0];
            const isToday = abs && (typeof abs.tanggal === 'string' ? abs.tanggal.substring(0, 10) === todayStr : false);
            const isHadir = isToday && (abs.jam_masuk || abs.status === 'HADIR' || abs.status === 'TERLAMBAT');
            const isSakit = isToday && abs.status === 'SAKIT';
            const isIzin = isToday && abs.status === 'IZIN';
            const isVerified = isToday && abs.is_verified;
            const isPendingVerification = isToday && (isHadir || isSakit || isIzin) && !abs.is_verified;

            return (
              <div
                key={item.id}
                className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-indigo-500/40"
              >
                {/* Siswa & Mitra Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                    {(item.Siswa?.nama_siswa || 'S')[0].toUpperCase()}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {item.Siswa?.nama_siswa || 'Nama Siswa'}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.Siswa?.Kelas?.nama_kelas || 'Kelas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} className="text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{item.Mitra?.nama || 'Mitra DUDI'}</span>
                      </span>
                      {item.Mitra?.alamat && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-xs">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{item.Mitra.alamat}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Presensi Hari Ini & Action Buttons (Mobile-first layout) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Status Hari Ini
                    </span>
                    {isHadir ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          Hadir ({formatWaktu(abs.jam_masuk)})
                        </span>
                        {isVerified ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            TERVERIFIKASI
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                            MENUNGGU VERIFIKASI
                          </span>
                        )}
                      </div>
                    ) : isSakit ? (
                      <div className="flex flex-col sm:items-end gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            Sakit
                          </span>
                          {isVerified ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              TERVERIFIKASI
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                              MENUNGGU VERIFIKASI
                            </span>
                          )}
                        </div>
                        {abs.kegiatan && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                            {abs.kegiatan}
                          </span>
                        )}
                        {abs.image_url && (
                          <a
                            href={abs.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Lihat Surat Dokter ↗
                          </a>
                        )}
                      </div>
                    ) : isIzin ? (
                      <div className="flex flex-col sm:items-end gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            Izin
                          </span>
                          {isVerified ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              TERVERIFIKASI
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40 animate-pulse">
                              MENUNGGU VERIFIKASI
                            </span>
                          )}
                        </div>
                        {abs.kegiatan && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                            {abs.kegiatan}
                          </span>
                        )}
                        {abs.image_url && (
                          <a
                            href={abs.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Lihat Surat Izin ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Belum Presensi
                      </span>
                    )}
                  </div>

                  {/* Action Buttons (Touch-friendly & flexible in mobile) */}
                  <div className="flex items-center gap-2 pt-1 sm:pt-0">
                    {/* Direct Verify Button jika ada presensi yang belum diverifikasi */}
                    {isPendingVerification && (
                      <Button
                        size="sm"
                        onClick={() => verifyMutation.mutate(abs.id)}
                        disabled={verifyMutation.isPending}
                        className="flex-1 sm:flex-initial h-8 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Verifikasi</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPresensiModal(item)}
                      className="flex-1 sm:flex-initial h-8 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 flex items-center justify-center"
                    >
                      <Clock size={13} className="text-slate-400" />
                      <span>Presensi</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenLogbookModal(item)}
                      className="flex-1 sm:flex-initial h-8 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 flex items-center justify-center"
                    >
                      <FileText size={13} className="text-blue-500" />
                      <span>Logbook</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Lembar Kerja Bimbingan Siswa (In-Place Drilldown) ── */}
      {selectedSiswaForModal && (
        <SiswaBimbinganDetailModal
          isOpen={!!selectedSiswaForModal}
          onClose={() => setSelectedSiswaForModal(null)}
          siswaPkl={selectedSiswaForModal}
          initialTab={modalInitialTab}
        />
      )}
    </motion.div>
  );
};
