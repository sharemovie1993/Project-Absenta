import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSesiAbsensiList, getSesiAbsenSiswa } from '../../../api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi, KbmItem, getKbmStatusKey } from '../../../utils/kbm-normalizer';
import { toLocalDate, formatLocalTimeFromISO, getTimezoneLabel } from '../../../utils/attendance/time';
import { useSocket } from '../../../hooks/useSocket';
import { Button } from '../../ui';
import { BookOpen, Lock, ShieldAlert } from 'lucide-react';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { useAuthStore } from '../../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

import { dropdownApi } from '../../../api/dropdown.api';
import { kurikulumApi } from '../../../api/kurikulum.api';

// Import refactored subcomponents
import { KbmStatCards } from './kbm/KbmStatCards';
import { KbmFilters } from './kbm/KbmFilters';
import { KbmSessionTable } from './kbm/KbmSessionTable';
import { KbmSessionCard } from './kbm/KbmSessionCard';
import { KbmDetailModal } from './kbm/KbmDetailModal';

const SAMPLE_DEMO_SESSIONS = [
  {
    id: 'demo-1',
    waktu_mulai: new Date().toISOString(),
    waktu_selesai: new Date(Date.now() + 3600000).toISOString(),
    isLive: true,
    isFinished: false,
    isUpcoming: false,
    Kelas: { nama_kelas: 'XII RPL 1', jurusan_id: 'jur-1' },
    Mapel: { nama_mapel: 'Pemrograman Web & Perangkat Bergerak' },
    Guru: { nama_guru: 'Asep Suryadi, S.Kom' },
    _summary: {
      isLive: true,
      isFinished: false,
      teacherStatus: 'ON_TIME',
      hadir: 34,
      total: 36,
    },
    ProgresMateri: { judul_materi: 'Integrasi REST API Fastify & React UI' },
  },
  {
    id: 'demo-2',
    waktu_mulai: new Date().toISOString(),
    waktu_selesai: new Date(Date.now() + 3600000).toISOString(),
    isLive: true,
    isFinished: false,
    isUpcoming: false,
    Kelas: { nama_kelas: 'XI TKJ 2', jurusan_id: 'jur-2' },
    Mapel: { nama_mapel: 'Administrasi Infrastruktur Jaringan' },
    Guru: { nama_guru: 'Dedi Kurniawan, S.T' },
    _summary: {
      isLive: true,
      isFinished: false,
      teacherStatus: 'ON_TIME',
      hadir: 31,
      total: 32,
    },
    ProgresMateri: { judul_materi: 'Konfigurasi Routing MikroTik & VLAN' },
  },
  {
    id: 'demo-3',
    waktu_mulai: new Date(Date.now() - 7200000).toISOString(),
    waktu_selesai: new Date(Date.now() - 3600000).toISOString(),
    isLive: false,
    isFinished: true,
    isUpcoming: false,
    Kelas: { nama_kelas: 'X AKL 1', jurusan_id: 'jur-3' },
    Mapel: { nama_mapel: 'Akuntansi Keuangan Lembaga' },
    Guru: { nama_guru: 'Siti Rahmawati, S.Pd' },
    _summary: {
      isLive: false,
      isFinished: true,
      teacherStatus: 'ON_TIME',
      hadir: 35,
      total: 35,
    },
    ProgresMateri: { judul_materi: 'Penyusunan Laporan Laba Rugi Periode' },
  },
];

export const MonitoringKbmWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const { tenantMode } = useAuthStore();
  const [targetDate, setTargetDate] = useState(toLocalDate());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time cache invalidation via Socket.io
  useEffect(() => {
    if (!isConnected) return;

    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance'] });
    };

    subscribe('attendance_feed_update', handleInvalidate);
    subscribe('sesi_status_update', handleInvalidate);
    subscribe('absen_guru_update', handleInvalidate);
    subscribe('session_attendance_update', handleInvalidate);
    subscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);
    subscribe('SESI_CREATED', handleInvalidate);
    subscribe('SESI_UPDATED', handleInvalidate);

    return () => {
      unsubscribe('attendance_feed_update', handleInvalidate);
      unsubscribe('sesi_status_update', handleInvalidate);
      unsubscribe('absen_guru_update', handleInvalidate);
      unsubscribe('session_attendance_update', handleInvalidate);
      unsubscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);
      unsubscribe('SESI_CREATED', handleInvalidate);
      unsubscribe('SESI_UPDATED', handleInvalidate);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'TABLE'>('LIST');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('ALL');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('ALL');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<string>('ALL');
  const [kelasOptions, setKelasOptions] = useState<any[]>([]);
  const [jurusanOptions, setJurusanOptions] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  // 1. Debounced Search Term to prevent lag on keypresses
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const isToday = useMemo(() => targetDate === toLocalDate(), [targetDate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Global Monitoring Stats (Backend Source of Truth)
  const { data: monitoringRes, isLoading: monitoringLoading, error: monitoringError } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', targetDate],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(targetDate),
    refetchInterval: isToday ? 30000 : false,
    retry: false,
  });

  // 3. Fetch Session List (Unified Source with include_scheduled: true)
  const { data: sesiData, isLoading: sesiLoading, error: sesiError, refetch: refetchSessions } = useQuery({
    queryKey: ['monitoring-sesi-absensi', targetDate],
    queryFn: () => getSesiAbsensiList({ tanggal: targetDate, include_scheduled: true, summary: true, limit: 500 } as any),
    enabled: tenantMode !== 'SIMPLE',
    refetchInterval: isToday && tenantMode !== 'SIMPLE' ? 30000 : false, 
    retry: false,
  });

  const isSubscriptionRequired = useMemo(() => {
    const err1 = (monitoringError as any)?.response?.data || (monitoringError as any)?.data;
    const err2 = (sesiError as any)?.response?.data || (sesiError as any)?.data;
    const reason = String(err1?.reason || err2?.reason || '');
    const code = String(err1?.code || err2?.code || '');
    const status = (monitoringError as any)?.response?.status || (sesiError as any)?.response?.status;
    return reason.includes('SUBSCRIPTION_REQUIRED') || code.includes('SUBSCRIPTION') || status === 402;
  }, [monitoringError, sesiError]);

  const isLoading = (monitoringLoading || sesiLoading) && !isSubscriptionRequired;
  const stats = useMemo(() => {
    if (monitoringRes?.data?.sessionStats) return monitoringRes.data.sessionStats;
    if (isSubscriptionRequired) {
      return {
        total: 12, live: 4, withJournal: 10, finished: 8,
        teacherOnTime: 11, teacherLate: 1, teacherNotArrived: 0, teacherAlpa: 0
      };
    }
    return {
      total: 0, live: 0, withJournal: 0, finished: 0,
      teacherOnTime: 0, teacherLate: 0, teacherNotArrived: 0, teacherAlpa: 0
    };
  }, [monitoringRes, isSubscriptionRequired]);

  useEffect(() => {
    dropdownApi.getKelasForDropdown().then(setKelasOptions).catch(console.error);
    dropdownApi.getJurusanForDropdown().then(setJurusanOptions).catch(console.error);
  }, []);

  const { data: detailAttendance, isLoading: detailLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', selectedSesi?.id],
    queryFn: () => getSesiAbsenSiswa(selectedSesi?.id),
    enabled: !!selectedSesi?.id,
    refetchInterval: !!selectedSesi?.id ? 4000 : false,
  });

  const formatTime = useCallback((iso?: string) => {
    if (!iso) return '--:--';
    const formatted = formatLocalTimeFromISO(iso);
    const tzLabel = getTimezoneLabel();
    return formatted ? `${formatted} ${tzLabel}` : '--:--';
  }, []);

  // Satu kabel: semua sesi dinormalisasi lewat kbm-normalizer
  const enrichedSessions: KbmItem[] = useMemo(() => {
    const rawData = sesiData?.data;
    const items = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(sesiData?.items)
      ? sesiData.items
      : [];
    if (!Array.isArray(items) || items.length === 0) {
      return isSubscriptionRequired ? SAMPLE_DEMO_SESSIONS : [];
    }
    return items.map((s: any) => normalizeFromSesiAbsensi(s));
  }, [sesiData, isSubscriptionRequired]);

  const processedSessions = useMemo(() => {
    return enrichedSessions.filter((s: any) => {
      const matchSearch = 
        String(s.Mapel?.nama_mapel || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(s.Guru?.nama_guru || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(s.Kelas?.nama_kelas || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchKelas = selectedKelasId === 'ALL' || String(s.kelas_id) === selectedKelasId;
      const matchJurusan = selectedJurusanId === 'ALL' || String(s.Kelas?.jurusan_id) === selectedJurusanId;
      
      const statusMatch = 
        statusFilter === 'ALL' || 
        (statusFilter === 'LIVE'     && s.status.isLive) || 
        (statusFilter === 'FINISHED' && s.status.isFinished) || 
        (statusFilter === 'OVERDUE'  && s.status.isOverdue) ||
        (statusFilter === 'UPCOMING' && s.status.isUpcoming) ||
        (statusFilter === 'JURNAL'   && !!(s as any).ProgresMateri);

      const matchTeacherStatus = teacherStatusFilter === 'ALL' || s.status.teacherStatus === teacherStatusFilter;

      return matchSearch && matchKelas && matchJurusan && matchTeacherStatus && statusMatch;
    });
  }, [enrichedSessions, debouncedSearchTerm, statusFilter, selectedKelasId, selectedJurusanId, teacherStatusFilter]);

  const handleExport = useCallback(() => {
    if (!processedSessions.length) return toast.error('Tidak ada data untuk diekspor');
    
    const headers = ['Waktu', 'Kelas', 'Mapel', 'Guru', 'Status Guru', 'Siswa Hadir', 'Total Siswa', 'Materi Jurnal'];
    const rows = processedSessions.map((s: any) => [
      formatTime(s.waktu_mulai),
      s.Kelas?.nama_kelas || '-',
      s.Mapel?.nama_mapel || '-',
      s.Guru?.nama_guru || '-',
      s._summary?.teacherStatus || '-',
      s._summary?.hadir || 0,
      s._summary?.total || 0,
      s.ProgresMateri?.judul_materi || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Monitoring_KBM_${targetDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Laporan KBM berhasil diunduh');
  }, [processedSessions, targetDate, formatTime]);

  const handleCloseDetail = useCallback(() => {
    setSelectedSesi(null);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <div className="space-y-6 relative rounded-2xl overflow-hidden min-h-[300px]">
      {/* 🔮 Transparent Glass Watermark Overlay when Subscription Required */}
      {isSubscriptionRequired && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-2xl flex flex-col items-center justify-center p-6 text-center">
          {/* Subtle Transparent Glass Backdrop (100% crystal clear!) */}
          <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-900/25 backdrop-blur-[1px]" />

          {/* Diagonal Watermark Text */}
          <div className="absolute inset-0 flex items-center justify-center rotate-[-12deg] select-none opacity-[0.07] dark:opacity-[0.12]">
            <span className="text-7xl font-black uppercase tracking-widest text-indigo-950 dark:text-white whitespace-nowrap">
              ABSENTA PRO • LIVE MONITORING KBM
            </span>
          </div>

          {/* Floating Glass Center Badge */}
          <div className="relative z-10 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-amber-300 dark:border-amber-700/80 px-8 py-5 rounded-3xl shadow-2xl space-y-2 max-w-md pointer-events-auto">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Preview Fitur Live Monitoring KBM
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Tampilan UI di atas adalah modul asli <strong>Monitoring KBM &amp; Absensi Sesi</strong>. Hubungi administrator untuk mengaktifkan lisensi modul ini.
            </p>
          </div>
        </div>
      )}

      {/* 1. Analytic Overview Cards */}
      <KbmStatCards
        stats={stats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        teacherStatusFilter={teacherStatusFilter}
        setTeacherStatusFilter={setTeacherStatusFilter}
        healthScore={monitoringRes?.data?.healthScore || 0}
      />

      {/* 2. Controls & Filters Row */}
      <KbmFilters
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedJurusanId={selectedJurusanId}
        setSelectedJurusanId={setSelectedJurusanId}
        selectedKelasId={selectedKelasId}
        setSelectedKelasId={setSelectedKelasId}
        jurusanOptions={jurusanOptions}
        kelasOptions={kelasOptions}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isLoading={isLoading}
        refetchSessions={refetchSessions}
        handleExport={handleExport}
      />

      {/* 3. Session List/Grid/Table */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Sinkronisasi Data...</p>
            </motion.div>
          ) : viewMode === 'TABLE' ? (
            <KbmSessionTable
              sessions={processedSessions}
              onSelectSession={setSelectedSesi}
              formatTime={formatTime}
            />
          ) : processedSessions.length > 0 ? (
            <div className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-1.5"}>
              {processedSessions.map((sesi) => (
                <KbmSessionCard
                  key={sesi.id}
                  session={sesi}
                  viewMode={viewMode}
                  onSelectSession={setSelectedSesi}
                  formatTime={formatTime}
                />
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center bg-white dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 shadow-inner"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/20 rounded-full animate-ping opacity-20" />
                <div className="relative z-10 w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600">
                  <BookOpen size={32} />
                </div>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Data Tidak Ditemukan</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium">
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : 'Belum ada aktivitas pembelajaran yang tercatat untuk hari ini.'}
              </p>
              {searchTerm && (
                <Button variant="ghost" onClick={handleResetSearch} className="mt-4 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                  Reset Pencarian
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <KbmDetailModal
        selectedSesi={selectedSesi}
        onClose={handleCloseDetail}
        detailLoading={detailLoading}
        detailAttendance={detailAttendance}
        journalModalOpen={journalModalOpen}
        setJournalModalOpen={setJournalModalOpen}
      />

      <JurnalKbmModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        sesiId={selectedSesi?.id || ''}
        initialData={selectedSesi?.ProgresMateri}
        readOnly={true}
      />
    </div>
  );
};
