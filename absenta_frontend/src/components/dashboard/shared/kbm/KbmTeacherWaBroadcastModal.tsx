import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  getKbmTeachersPreview,
  broadcastKbmTeachers,
  type KbmTeachingTeacherItem,
} from '@/api/whatsapp.api';
import { toLocalDate } from '@/utils/attendance/time';
import {
  MessageSquare,
  Send,
  Clock,
  Users,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { WhatsAppChatLogView } from '@/components/notifications/chatlog/WhatsAppChatLogView';

interface KbmTeacherWaBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

const ALL_SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);

const DEFAULT_MESSAGE =
  'Yth. Bapak/Ibu {nama},\n\nMohon perhatian terkait jadwal mengajar Anda hari ini ({tanggal}) pada *{jam_mengajar}* di kelas *{kelas}* ({mapel}).\n\n[Tulis pengumuman dadakan di sini]\n\nTerima kasih.\n- Panitia / Kurikulum {sekolah}';

export const KbmTeacherWaBroadcastModal: React.FC<KbmTeacherWaBroadcastModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const [tanggal, setTanggal] = useState<string>(() => initialDate || toLocalDate());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([7, 8, 9, 10, 11, 12]);
  const [selectedGuruIds, setSelectedGuruIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);
  const [broadcastResult, setBroadcastResult] = useState<{
    queuedCount: number;
    skippedCount: number;
    estimatedSeconds: number;
  } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTanggal(initialDate || toLocalDate());
      setBroadcastResult(null);
    }
  }, [isOpen, initialDate]);

  const sortedSlots = useMemo(
    () => [...selectedSlots].sort((a, b) => a - b),
    [selectedSlots]
  );

  const previewQuery = useQuery({
    queryKey: ['kbm-teachers-wa-preview', tanggal, sortedSlots.join(',')],
    queryFn: () => getKbmTeachersPreview({ tanggal, slots: sortedSlots }),
    enabled: isOpen && sortedSlots.length > 0 && Boolean(tanggal),
    staleTime: 15_000,
  });

  const teachers: KbmTeachingTeacherItem[] = previewQuery.data?.teachers || [];

  // Auto-select all valid-phone teachers whenever preview changes
  useEffect(() => {
    if (previewQuery.data?.teachers) {
      setSelectedGuruIds(
        new Set(
          previewQuery.data.teachers
            .filter((t) => t.hasValidPhone)
            .map((t) => t.guru_id)
        )
      );
    } else if (sortedSlots.length === 0) {
      setSelectedGuruIds(new Set());
    }
  }, [previewQuery.data, sortedSlots.length]);

  const toggleSlot = (slot: number) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const applyPresetSlots = (slots: number[]) => {
    setSelectedSlots(slots);
  };

  const toggleGuru = (guruId: string) => {
    setSelectedGuruIds((prev) => {
      const next = new Set(prev);
      if (next.has(guruId)) next.delete(guruId);
      else next.add(guruId);
      return next;
    });
  };

  const selectedStats = useMemo(() => {
    const selected = teachers.filter((t) => selectedGuruIds.has(t.guru_id));
    const valid = selected.filter((t) => t.hasValidPhone);
    const missing = selected.filter((t) => !t.hasValidPhone);
    return {
      totalSelected: selected.length,
      validCount: valid.length,
      missingCount: missing.length,
      sample: valid[0] || selected[0] || null,
    };
  }, [teachers, selectedGuruIds]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const trimmed = message.trim();
      if (!trimmed) throw new Error('Isi pesan pengumuman wajib diisi');
      if (sortedSlots.length === 0) throw new Error('Pilih minimal satu jam KBM ke-n');
      const guruIds = Array.from(selectedGuruIds);
      if (guruIds.length === 0) throw new Error('Pilih minimal satu guru penerima');

      return await broadcastKbmTeachers({
        tanggal,
        slots: sortedSlots,
        message: trimmed,
        guru_ids: guruIds,
      });
    },
    onSuccess: (res) => {
      setBroadcastResult({
        queuedCount: res.queuedCount,
        skippedCount: res.skippedCount,
        estimatedSeconds: res.estimatedSeconds,
      });
      toast.success(
        `${res.queuedCount} pesan WA guru KBM berhasil masuk antrian WA Gateway!`
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengirim pesan WA';
      toast.error(msg);
    },
  });

  const handleInsertToken = (token: string) => {
    setMessage((prev) =>
      prev ? `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${token}` : token
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengumuman Dadakan Guru KBM (WA Gateway)"
      size="xl"
    >
      <div className="space-y-4 py-1 text-xs">
        {/* Step 1: Tanggal & Rentang Jam KBM */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-800 dark:text-slate-100">
                1. Pilih Tanggal &amp; Jam KBM ke-N
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => applyPresetSlots([1, 2, 3, 4, 5, 6])}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer"
            >
              Jam 1–6 (Pagi)
            </button>
            <button
              type="button"
              onClick={() => applyPresetSlots([7, 8, 9, 10, 11, 12])}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              Jam 7–12 (Siang–Sore)
            </button>
            <button
              type="button"
              onClick={() => applyPresetSlots(ALL_SLOTS)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer"
            >
              Semua (1–12)
            </button>
            <button
              type="button"
              onClick={() => applyPresetSlots([])}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 cursor-pointer"
            >
              Kosongkan
            </button>
          </div>

          {/* Slot Chips 1..12 */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_SLOTS.map((slot) => {
              const active = selectedSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(slot)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer',
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  )}
                >
                  Jam {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Daftar Guru Terjaring */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-slate-800 dark:text-slate-100">
                2. Guru Mengajar Terjaring ({teachers.length} Guru Unik)
              </span>
              {previewQuery.data && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {previewQuery.data.tanggalLabel}
                </span>
              )}
            </div>
            {teachers.length > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGuruIds(
                      new Set(teachers.filter((t) => t.hasValidPhone).map((t) => t.guru_id))
                    )
                  }
                  className="font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  Pilih Semua Valid
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedGuruIds(new Set())}
                  className="font-bold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[210px] overflow-y-auto">
            {sortedSlots.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Pilih minimal satu jam KBM di atas untuk melihat daftar guru mengajar.
              </div>
            ) : previewQuery.isLoading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span>Mencari jadwal guru mengajar...</span>
              </div>
            ) : teachers.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Tidak ada jadwal KBM guru ditemukan pada {previewQuery.data?.tanggalLabel || tanggal} untuk jam yang dipilih.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Pilih</th>
                    <th className="py-2 px-3">Nama Guru</th>
                    <th className="py-2 px-3">Jam &amp; Kelas</th>
                    <th className="py-2 px-3">No. HP / WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teachers.map((t) => {
                    const checked = selectedGuruIds.has(t.guru_id);
                    return (
                      <tr
                        key={t.guru_id}
                        onClick={() => toggleGuru(t.guru_id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          checked
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        )}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGuru(t.guru_id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{t.nama_guru}</span>
                            {t.hasInval && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                Inval
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                            {t.mapelList.join(', ')}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {t.jamRangeLabel}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {t.kelasList.join(', ')}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {t.hasValidPhone ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              <Phone size={10} />
                              <span>{t.no_hp}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-500 italic">
                              No. HP kosong
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {previewQuery.data && previewQuery.data.missingPhoneCount > 0 && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-600" />
              <span>
                <strong>{previewQuery.data.missingPhoneCount} guru</strong> belum memiliki No. HP/WA valid dan akan otomatis dilewati saat pengiriman.
              </span>
            </div>
          )}
        </div>

        {/* Step 3: Pesan Pengumuman */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-emerald-600" />
              3. Isi Pengumuman WhatsApp
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {['{nama}', '{jam_mengajar}', '{kelas}', '{mapel}', '{tanggal}', '{sekolah}'].map(
                (tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => handleInsertToken(tok)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {tok}
                  </button>
                )
              )}
            </div>
          </div>

          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pengumuman dadakan untuk guru mengajar..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              1 guru hanya menerima 1 pesan (jeda antrian otomatis ±3 detik/pesan agar aman dari blokir WA).
            </span>
            <span className="font-mono">{message.length}/4000</span>
          </div>
        </div>

        {broadcastResult && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              <strong>{broadcastResult.queuedCount} pesan WA</strong> berhasil masuk antrian WA Gateway
              (estimasi selesai ±{broadcastResult.estimatedSeconds} detik).
              {broadcastResult.skippedCount > 0 &&
                ` (${broadcastResult.skippedCount} dilewati tanpa No. HP)`}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500">
            Siap kirim ke <strong>{selectedStats.validCount} guru</strong> ber-No. HP valid.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLogModalOpen(true)}
              className="text-xs font-bold border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              title="Pantau status pesan WA terkirim / dibaca secara live"
            >
              Lihat Status WA
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={sendMutation.isPending}
              className="text-xs font-bold"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={
                sendMutation.isPending ||
                !message.trim() ||
                selectedStats.validCount === 0
              }
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
            >
              <Send size={13} />
              <span>
                {sendMutation.isPending
                  ? 'Memasukkan Antrian...'
                  : `Kirim WA ke ${selectedStats.validCount} Guru`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {isLogModalOpen && (
        <Modal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          title="Monitor Live Status Pesan WhatsApp (Terkirim / Dibaca)"
          size="full"
        >
          <WhatsAppChatLogView isModal={true} hideLayout={true} />
        </Modal>
      )}
    </Modal>
  );
};

export default KbmTeacherWaBroadcastModal;
