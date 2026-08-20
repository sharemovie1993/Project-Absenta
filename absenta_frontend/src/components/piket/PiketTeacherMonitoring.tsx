import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSesiAbsensiList, updateAbsenGuru, sendKbmReminderApi } from '../../api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi, type KbmItem } from '../../utils/kbm-normalizer';
import { guruApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui';
import { Modal, ModalFooter } from '../ui/Modal';
import { 
  Clock, 
  MessageSquare, 
  UserX, 
  RefreshCw, 
  UserCheck, 
  Search,
  CheckCircle2,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export const PiketTeacherMonitoring: React.FC = () => {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const today = toLocalDate();

  const [searchTerm, setSearchTerm] = useState('');
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

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama guru, kelas, atau mapel..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 text-slate-900 dark:text-white"
        />
      </div>

      {/* SESSIONS LIST GRID */}
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
      ) : (
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
