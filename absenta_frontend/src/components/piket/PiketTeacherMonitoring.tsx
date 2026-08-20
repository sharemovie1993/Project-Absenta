import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSesiAbsensiList, updateAbsenGuru, sendKbmReminderApi } from '../../api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi, type KbmItem } from '../../utils/kbm-normalizer';
import { guruApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { useSocket } from '../../hooks/useSocket';
import { Button, Badge } from '../ui';
import { Modal, ModalFooter } from '../ui/Modal';
import { 
  Clock, 
  MessageSquare, 
  UserX, 
  RefreshCw, 
  UserCheck, 
  Search,
  CheckCircle2,
  Send,
  LayoutGrid,
  List,
  Table as TableIcon,
  Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export const PiketTeacherMonitoring: React.FC = () => {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const today = toLocalDate();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'DECK' | 'LIST' | 'TABLE'>('DECK');
  const [selectedSession, setSelectedSession] = useState<KbmItem | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'IZIN' | 'SAKIT' | 'PENUGASAN' | 'ALPA'>('IZIN');
  const [selectedGuruInvalId, setSelectedGuruInvalId] = useState<string>('');
  const [catatanText, setCatatanText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 0. Real-time WebSocket synchronization
  useEffect(() => {
    if (!isConnected) return;

    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-me-class'] });
    };

    subscribe('absen_guru_update', handleInvalidate);
    subscribe('attendance_feed_update', handleInvalidate);
    subscribe('sesi_status_update', handleInvalidate);
    subscribe('sesi_reminder_updated', handleInvalidate);
    subscribe('SESI_CREATED', handleInvalidate);
    subscribe('SESI_UPDATED', handleInvalidate);
    subscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);

    return () => {
      unsubscribe('absen_guru_update', handleInvalidate);
      unsubscribe('attendance_feed_update', handleInvalidate);
      unsubscribe('sesi_status_update', handleInvalidate);
      unsubscribe('sesi_reminder_updated', handleInvalidate);
      unsubscribe('SESI_CREATED', handleInvalidate);
      unsubscribe('SESI_UPDATED', handleInvalidate);
      unsubscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);

  // 1. Fetch Session List with backend status_filter: READY_UNOPENED
  const { data: sesiData, isLoading: sesiLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['monitoring-sesi-absensi-piket', today],
    queryFn: () => getSesiAbsensiList({ tanggal: today, include_scheduled: true, summary: true, status_filter: 'READY_UNOPENED', limit: 500 }),
    refetchInterval: 15000,
  });

  // 2. Fetch Teacher Options for Guru Inval dropdown
  const { data: guruOptionsRes } = useQuery({
    queryKey: ['academic-guru-inval-options'],
    queryFn: () => guruApi.getAll({ limit: 1000 } as any).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const guruList = useMemo(() => {
    const raw = (guruOptionsRes as any)?.data?.data || (guruOptionsRes as any)?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [guruOptionsRes]);

  // 3. Normalize sessions directly from backend READY_UNOPENED payload
  const pendingTeachers = useMemo(() => {
    const rawData = (sesiData as any)?.data;
    const rawSessions: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.sessions)
      ? rawData.sessions
      : Array.isArray((sesiData as any)?.sessions)
      ? (sesiData as any).sessions
      : [];

    return rawSessions.map(normalizeFromSesiAbsensi);
  }, [sesiData]);

  // 4. Search Filter
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return pendingTeachers;
    const q = searchTerm.toLowerCase();
    return pendingTeachers.filter(
      (item) =>
        (item.guru_nama && item.guru_nama.toLowerCase().includes(q)) ||
        (item.kelas_nama && item.kelas_nama.toLowerCase().includes(q)) ||
        (item.mapel_nama && item.mapel_nama.toLowerCase().includes(q))
    );
  }, [pendingTeachers, searchTerm]);

  // 5. Send WA Message Action via Gateway or Personal
  const handleSendWa = async (item: KbmItem, method: 'GATEWAY' | 'PERSONAL_LINK' = 'GATEWAY') => {
    try {
      const res = await sendKbmReminderApi(item.id, {
        method,
        senderRole: 'PIKET',
        senderName: 'Meja Piket',
      });
      if (method === 'PERSONAL_LINK' && res.personal_wa_link) {
        window.open(res.personal_wa_link, '_blank');
        toast.success('Membuka WhatsApp Personal...');
      } else {
        toast.success('Pengingat WhatsApp berhasil dikirim ke guru via Gateway');
      }
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengirim pengingat');
    }
  };

  // 6. Open Status Update Modal
  const handleOpenStatusModal = (item: KbmItem) => {
    setSelectedSession(item);
    setSelectedStatus('IZIN');
    setSelectedGuruInvalId('');
    setCatatanText('');
    setStatusModalOpen(true);
  };

  // 7. Submit Status Update & Guru Inval
  const handleSubmitStatus = async () => {
    if (!selectedSession) return;
    const guruId = selectedSession.guru_id || (selectedSession.Guru as any)?.id;
    if (!guruId) {
      toast.error('Data Guru Pengajar tidak ditemukan pada sesi ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAbsenGuru(selectedSession.id, guruId, {
        status: selectedStatus,
        guru_inval_id: selectedGuruInvalId || undefined,
        catatan: catatanText || undefined,
      });

      toast.success(`Status KBM ${selectedSession.kelas_nama || ''} berhasil diperbarui.`);
      setStatusModalOpen(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui status KBM.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER MEJA PIKET */}
      <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 dark:border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              ● JAM KBM AKTIF
            </span>
            <span className="text-xs font-bold text-slate-500">
              🕒 Hari Ini
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Guru Belum Masuk Kelas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Daftar guru yang jadwalnya sedang berlangsung namun belum melakukan presensi atau membuka sesi KBM.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSessions()}
            className="rounded-xl border-amber-500/30 hover:bg-amber-500/10 text-xs font-bold gap-1.5"
          >
            <RefreshCw size={12} className={cn(sesiLoading && "animate-spin")} />
            <span>Segarkan</span>
          </Button>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-black border border-amber-500/30">
            {pendingTeachers.length} Guru Belum Hadir
          </span>
        </div>
      </div>

      {/* TOOLBAR: SEARCH & VIEW MODE SWITCHER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama guru, kelas, atau mapel..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 text-slate-900 dark:text-white shadow-xs"
          />
        </div>

        {/* View Mode Toggle Buttons (Deck, List, Table) */}
        <div className="flex items-center self-end sm:self-auto bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('DECK')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
              viewMode === 'DECK'
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Tampilan Kartu Deck Grid"
          >
            <LayoutGrid size={13} />
            <span>Deck</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
              viewMode === 'LIST'
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Tampilan List Ramping"
          >
            <List size={13} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
              viewMode === 'TABLE'
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title="Tampilan Tabel Data"
          >
            <TableIcon size={13} />
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* SESSIONS CONTENT: LOADING / EMPTY / DECK / LIST / TABLE */}
      {sesiLoading && pendingTeachers.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Memeriksa jadwal KBM aktif...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
          <UserCheck size={36} className="text-emerald-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
            Semua Guru Sudah di Kelas
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Seluruh guru pada jam pelajaran saat ini telah hadir dan membuka sesi KBM.
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* 📊 TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3.5">Waktu KBM</th>
                  <th className="px-4 py-3.5">Kelas</th>
                  <th className="px-4 py-3.5">Mata Pelajaran</th>
                  <th className="px-4 py-3.5">Guru Pengajar</th>
                  <th className="px-4 py-3.5">Status Pengingat</th>
                  <th className="px-4 py-3.5 text-right">Aksi Meja Piket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredList.map((item) => {
                  const rawPhone = (item.Guru as any)?.no_hp || (item as any)?.guru_no_hp || (item.Guru as any)?.telepon || (item.Guru as any)?.phone;
                  const hasPhone = Boolean(rawPhone);
                  const reminderMeta = item.reminder_meta || (item as any)._summary?.reminder_meta || null;
                  const diffMinutes = reminderMeta?.last_wa_sent_at 
                    ? Math.floor((Date.now() - new Date(reminderMeta.last_wa_sent_at).getTime()) / 60000) 
                    : null;
                  const isRemindedRecently = diffMinutes !== null && diffMinutes < 10;

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.jam_mulai} – {item.jam_selesai}
                          </span>
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 animate-pulse">
                            ● SIAP DIMULAI
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] font-mono border border-blue-500/20">
                          {item.kelas_nama || 'Kelas'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {item.mapel_nama || 'Mata Pelajaran'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-xs shrink-0">
                            👨‍🏫
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                              {item.guru_nama || 'Guru Pengajar'}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {hasPhone ? '📱 WA Tersedia' : '⚠️ No. HP Belum Ada'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isRemindedRecently ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            <CheckCircle2 size={11} className="text-amber-600" />
                            {reminderMeta.last_wa_sent_by} ({diffMinutes}m lalu)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Belum diingatkan</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isRemindedRecently}
                            onClick={() => handleSendWa(item, 'GATEWAY')}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all",
                              isRemindedRecently
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700"
                                : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer shadow-xs"
                            )}
                            title={isRemindedRecently ? `Sudah diingatkan oleh ${reminderMeta.last_wa_sent_by}` : "Kirim pesan peringatan WA via Gateway"}
                          >
                            <MessageSquare size={12} />
                            <span>{isRemindedRecently ? 'Terkirim ✓' : 'Kirim WA'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-[11px] font-black shadow-xs transition-all cursor-pointer"
                            title="Tentukan status izin/sakit/penugasan dan guru inval"
                          >
                            <UserX size={12} />
                            <span>Ubah Status</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'LIST' ? (
        /* 📋 COMPACT LIST VIEW */
        <div className="space-y-2">
          {filteredList.map((item) => {
            const rawPhone = (item.Guru as any)?.no_hp || (item as any)?.guru_no_hp || (item.Guru as any)?.telepon || (item.Guru as any)?.phone;
            const hasPhone = Boolean(rawPhone);
            const reminderMeta = item.reminder_meta || (item as any)._summary?.reminder_meta || null;
            const diffMinutes = reminderMeta?.last_wa_sent_at 
              ? Math.floor((Date.now() - new Date(reminderMeta.last_wa_sent_at).getTime()) / 60000) 
              : null;
            const isRemindedRecently = diffMinutes !== null && diffMinutes < 10;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/25 dark:border-amber-500/20 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs font-mono border border-blue-500/20 shrink-0">
                      {item.kelas_nama || 'Kelas'}
                    </span>
                    <span className="text-slate-500 font-mono text-xs font-bold shrink-0">
                      {item.jam_mulai} – {item.jam_selesai}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {item.mapel_nama || 'Mata Pelajaran'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      👨‍🏫 <strong className="text-slate-800 dark:text-slate-200">{item.guru_nama}</strong>
                      {hasPhone ? ' • 📱 WA' : ' • ⚠️ Belum ada No HP'}
                    </p>
                  </div>

                  {isRemindedRecently && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300 shrink-0">
                      Diingatkan ({reminderMeta.last_wa_sent_by} • {diffMinutes}m lalu)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    disabled={isRemindedRecently}
                    onClick={() => handleSendWa(item, 'GATEWAY')}
                    className={cn(
                      "flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all",
                      isRemindedRecently
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer"
                    )}
                  >
                    <MessageSquare size={12} />
                    <span>{isRemindedRecently ? 'Terkirim ✓' : 'Kirim WA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal(item)}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <UserX size={12} />
                    <span>Ubah Status</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 🎴 DECK / GRID VIEW (DEFAULT) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredList.map((item) => {
            const rawPhone = (item.Guru as any)?.no_hp || (item as any)?.guru_no_hp || (item.Guru as any)?.telepon || (item.Guru as any)?.phone;
            const hasPhone = Boolean(rawPhone);
            const isItemReady = item.isReadyToOpen || item.status?.isReadyToOpen;
            const isItemOverdue = item.isOverdue || item.status?.isOverdue || item.is_overdue;

            const reminderMeta = item.reminder_meta || (item as any)._summary?.reminder_meta || null;
            const diffMinutes = reminderMeta?.last_wa_sent_at 
              ? Math.floor((Date.now() - new Date(reminderMeta.last_wa_sent_at).getTime()) / 60000) 
              : null;
            const isRemindedRecently = diffMinutes !== null && diffMinutes < 10;

            return (
              <div
                key={item.id}
                className="relative p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-500/20 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] font-mono border border-blue-500/20">
                        {item.kelas_nama || 'Kelas'}
                      </span>
                      {isItemReady ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[10px] border border-amber-500/30 animate-pulse">
                          ● SIAP DIMULAI
                        </span>
                      ) : isItemOverdue ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black text-[10px] border border-rose-500/30">
                          TERLEWAT
                        </span>
                      ) : null}
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1 font-semibold">
                      <Clock size={11} className="text-amber-500 shrink-0" />
                      {item.jam_mulai} – {item.jam_selesai}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug line-clamp-1">
                    {item.mapel_nama || 'Mata Pelajaran'}
                  </h4>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-xs shrink-0">
                      👨‍🏫
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {item.guru_nama || 'Guru Pengajar'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {hasPhone ? '📱 WhatsApp Tersedia' : '⚠️ No. HP Belum Terdaftar'}
                      </p>
                    </div>
                  </div>

                  {/* Anti-Spam / Cooldown Status Banner */}
                  {isRemindedRecently && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      <CheckCircle2 size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Diingatkan ({reminderMeta.last_wa_sent_by} • {diffMinutes}m lalu)</span>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isRemindedRecently}
                    onClick={() => handleSendWa(item, 'GATEWAY')}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black shadow-xs transition-all",
                      isRemindedRecently
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer"
                    )}
                    title={isRemindedRecently ? `Sudah diingatkan oleh ${reminderMeta.last_wa_sent_by}` : "Kirim pesan peringatan WA ke guru via Gateway"}
                  >
                    <MessageSquare size={13} />
                    <span>{isRemindedRecently ? 'Terkirim ✓' : 'Kirim WA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer"
                    title="Tentukan status izin/sakit/penugasan dan guru inval"
                  >
                    <UserX size={13} />
                    <span>Ubah Status</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PENETAPAN STATUS & GURU INVAL */}
      {statusModalOpen && selectedSession && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title="Tentukan Status Ketidakhadiran Guru"
          size="md"
        >
          <div className="space-y-4 p-1">
            {/* Info Guru & Sesi */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target KBM:</p>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {selectedSession.guru_nama}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {selectedSession.kelas_nama} • {selectedSession.mapel_nama} ({selectedSession.jam_mulai} - {selectedSession.jam_selesai} WIB)
              </p>
            </div>

            {/* Pilihan Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Pilih Status Ketidakhadiran:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { val: 'IZIN', label: 'Izin', color: 'bg-blue-600 text-white' },
                  { val: 'SAKIT', label: 'Sakit', color: 'bg-amber-500 text-slate-950' },
                  { val: 'PENUGASAN', label: 'Penugasan', color: 'bg-purple-600 text-white' },
                  { val: 'ALPA', label: 'Alpa', color: 'bg-rose-600 text-white' },
                ].map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => setSelectedStatus(st.val as any)}
                    className={cn(
                      "py-2 px-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                      selectedStatus === st.val
                        ? `${st.color} border-transparent shadow-md scale-102`
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Guru Inval (Opsional) */}
            {selectedStatus !== 'ALPA' && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Guru Inval / Pengganti:</span>
                  <span className="text-[10px] text-slate-400 font-normal italic">(Opsional)</span>
                </label>
                <select
                  value={selectedGuruInvalId}
                  onChange={(e) => setSelectedGuruInvalId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">-- Tanpa Guru Inval (Penugasan Mandiri) --</option>
                  {guruList
                    .filter((g: any) => g.id !== selectedSession.guru_id)
                    .map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_guru} {g.nip ? `(NIP: ${g.nip})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Catatan / Keterangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Catatan / Alasan:
              </label>
              <textarea
                value={catatanText}
                onChange={(e) => setCatatanText(e.target.value)}
                placeholder={
                  selectedStatus === 'IZIN'
                    ? 'Contoh: Izin Dinas Luar / Acara Keluarga'
                    : selectedStatus === 'SAKIT'
                    ? 'Contoh: Sakit demam / Surat dokter terlampir'
                    : selectedStatus === 'PENUGASAN'
                    ? 'Contoh: Penugasan proyek kurikulum / Pembinaan lomba'
                    : 'Keterangan tambahan...'
                }
                rows={3}
                className="w-full p-3 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setStatusModalOpen(false)}
              disabled={isSubmitting}
              className="rounded-2xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitStatus}
              disabled={isSubmitting}
              className="rounded-2xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};
