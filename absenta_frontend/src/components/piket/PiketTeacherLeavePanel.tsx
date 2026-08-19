import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { guruIzinApi, type PermohonanIzinGuruItem } from '../../api/guruIzin.api';
import { Plus, Search, Filter, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Eye, BookOpen, RefreshCw, FileText } from 'lucide-react';
import { TeacherLeaveApprovalModal } from './TeacherLeaveApprovalModal';
import { PengajuanIzinGuruModal } from '../dashboard/staff/profil/PengajuanIzinGuruModal';

export const PiketTeacherLeavePanel: React.FC = () => {
  const [activeStatus, setActiveStatus] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<PermohonanIzinGuruItem | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['guru-izin-list', activeStatus, searchTerm],
    queryFn: () => guruIzinApi.getAll({
      status: activeStatus,
      search: searchTerm || undefined,
      limit: 100
    }),
    staleTime: 15000,
    refetchInterval: 30000
  });

  const leaveList: PermohonanIzinGuruItem[] = Array.isArray(data?.data) ? data.data : [];

  const pendingCount = leaveList.filter(item => item.status === 'PENDING').length;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Filter Status Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'PENDING', label: 'Menunggu Verifikasi', icon: AlertCircle },
            { id: 'DISETUJUI', label: 'Disetujui', icon: CheckCircle2 },
            { id: 'DITOLAK', label: 'Ditolak', icon: XCircle },
            { id: 'ALL', label: 'Semua Riwayat', icon: Filter }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                activeStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
              {tab.id === 'PENDING' && pendingCount > 0 && activeStatus !== 'PENDING' && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Action Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari nama guru..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shadow-blue-500/20 shrink-0 transition-all active:scale-95"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Ajukan Izin / Dinas</span>
          </button>
        </div>
      </div>

      {/* Leave List Card / Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-2" />
          <p>Memuat data permohonan izin guru...</p>
        </div>
      ) : leaveList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h4 className="font-bold text-slate-700 dark:text-slate-200">Tidak ada permohonan izin</h4>
          <p className="text-slate-400 text-[11px]">
            {activeStatus === 'PENDING' ? 'Semua pengajuan izin guru telah diverifikasi.' : 'Belum ada data pada filter ini.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {leaveList.map((item) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'DISETUJUI';
            const isRejected = item.status === 'DITOLAK';

            const todayStr = new Date().toISOString().slice(0, 10);
            const isTodayLeave = item.tanggal_mulai <= todayStr && item.tanggal_selesai >= todayStr;
            const isUrgent = isPending && isTodayLeave;

            const tipeColor =
              item.tipe_izin === 'SAKIT' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' :
              item.tipe_izin === 'DINAS_LUAR' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' :
              'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                  isUrgent
                    ? 'border-2 border-rose-500/80 bg-rose-50/20 dark:bg-rose-950/20 shadow-md shadow-rose-500/10 ring-2 ring-rose-500/20'
                    : 'border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${tipeColor}`}>
                        {item.tipe_izin.replace('_', ' ')}
                      </span>
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                          🚨 HARI INI
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1.5">
                      {item.Guru?.nama_guru || 'Guru'}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400">NIP: {item.Guru?.nip || '-'}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                    isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
                    isRejected ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' :
                    isUrgent ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 animate-pulse font-extrabold' :
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 animate-pulse'
                  }`}>
                    {isApproved ? '✓ DISETUJUI' : isRejected ? '✕ DITOLAK' : isUrgent ? '⚠️ PERLU TINDAKAN' : '⏳ PENDING'}
                  </span>
                </div>

                {/* Date & Reason */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    <Calendar size={12} className="text-slate-400 shrink-0" />
                    <span>
                      {formatDate(item.tanggal_mulai)}
                      {item.tanggal_mulai !== item.tanggal_selesai && ` - ${formatDate(item.tanggal_selesai)}`}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 italic">
                    "{item.alasan}"
                  </p>

                  {item.instruksi_tugas && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
                      <BookOpen size={11} className="shrink-0" />
                      <span className="truncate">Tugas: {item.instruksi_tugas}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    {item.tipe_durasi === 'SEBAGIAN_SESI' ? 'Jam Tertentu' : '1 Hari'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeave(item);
                      setIsApprovalOpen(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                      isPending
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Eye size={12} />
                    <span>{isPending ? 'Verifikasi' : 'Detail'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Verifikasi / Detail */}
      <TeacherLeaveApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => {
          setIsApprovalOpen(false);
          setSelectedLeave(null);
        }}
        leaveItem={selectedLeave}
      />

      {/* Modal Form Pengajuan Izin Baru */}
      <PengajuanIzinGuruModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
};
