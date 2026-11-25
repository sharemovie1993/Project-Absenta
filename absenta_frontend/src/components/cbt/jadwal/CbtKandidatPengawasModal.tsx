import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Briefcase,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  UserCheck,
  MessageSquare,
  Send,
  Phone,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtEventItem } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CbtKandidatPengawasModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: CbtEventItem | null;
  guruList: any[];
  totalSesiCount?: number;
  onSaved?: (candidateIds: string[]) => void;
}

export const CbtKandidatPengawasModal: React.FC<CbtKandidatPengawasModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  guruList,
  totalSesiCount = 0,
  onSaved,
}) => {
  const queryClient = useQueryClient();

  // Pisahkan kelompok Pendidik vs TU
  const { pendidikList, tuList, allStaffList } = useMemo(() => {
    const pendidik: any[] = [];
    const tu: any[] = [];

    (guruList || []).forEach((g) => {
      const ptk = (g.jenis_ptk || '').toUpperCase().trim();
      if (
        ptk === 'TENAGA_KEPENDIDIKAN' ||
        ptk === 'TU' ||
        ptk === 'TATA_USAHA' ||
        ptk === 'STAFF' ||
        ptk === 'STAF'
      ) {
        tu.push(g);
      } else {
        pendidik.push(g);
      }
    });

    return {
      pendidikList: pendidik,
      tuList: tu,
      allStaffList: guruList || [],
    };
  }, [guruList]);

  // Selected Candidate IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [ptkFilter, setPtkFilter] = useState<'ALL' | 'PENDIDIK' | 'TU' | 'SELECTED_ONLY'>('ALL');
  const [rolloverSourceEventId, setRolloverSourceEventId] = useState<string>('');

  const { data: eventsSummaryRes } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const rolloverSourceEvents = useMemo(() => {
    const groups = eventsSummaryRes?.summary || [];
    const list: Array<{ id: string; nama_event: string; tpLabel: string; candidateIds: string[] }> = [];
    groups.forEach((grp: any) => {
      const tpLabel = grp?.tahun_pelajaran || '';
      (grp?.events || []).forEach((ev: CbtEventItem) => {
        if (!ev?.id || ev.id === activeEvent?.id) return;
        const cands = Array.isArray(ev.pengawas_candidates) ? ev.pengawas_candidates : [];
        if (cands.length > 0) {
          list.push({
            id: ev.id,
            nama_event: ev.nama_event,
            tpLabel,
            candidateIds: cands,
          });
        }
      });
    });
    return list;
  }, [eventsSummaryRes, activeEvent?.id]);

  useEffect(() => {
    if (rolloverSourceEvents.length > 0 && !rolloverSourceEvents.some((e) => e.id === rolloverSourceEventId)) {
      setRolloverSourceEventId(rolloverSourceEvents[0].id);
    }
  }, [rolloverSourceEvents, rolloverSourceEventId]);

  const handleRolloverCandidates = () => {
    const src = rolloverSourceEvents.find((e) => e.id === rolloverSourceEventId);
    if (!src) return;
    const validStaffIds = new Set(allStaffList.map((g) => g.id));
    const imported = src.candidateIds.filter((id) => validStaffIds.has(id));
    if (imported.length === 0) {
      toast.error('Tidak ada kandidat yang cocok dengan data pegawai aktif saat ini.');
      return;
    }
    setSelectedIds(new Set(imported));
    toast.success(`Berhasil mengambil ${imported.length} kandidat pengawas dari "${src.nama_event}". Klik Simpan untuk menerapkan.`);
  };

  // WA Broadcast Mode
  const [isWaComposerOpen, setIsWaComposerOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waBroadcastResult, setWaBroadcastResult] = useState<{
    queuedCount: number;
    skippedCount: number;
    skippedTeachers: Array<{ id: string; nama_guru: string; reason: string }>;
    estimatedSeconds: number;
  } | null>(null);

  const buildDefaultWaTemplate = (eventNama?: string) =>
    `Yth. Bapak/Ibu {nama},\n\nAnda telah ditetapkan sebagai *Kandidat Pengawas Ujian* pada kegiatan *${eventNama || '{event}'}* di {sekolah}.\nMohon bersiap untuk jadwal penugasan ruang yang akan dibagikan oleh Panitia CBT.\n\nTerima kasih.`;

  // Inisialisasi dari activeEvent.pengawas_candidates
  useEffect(() => {
    if (isOpen && activeEvent) {
      const existing = activeEvent.pengawas_candidates;
      if (Array.isArray(existing) && existing.length > 0) {
        setSelectedIds(new Set(existing));
      } else {
        // Jika belum pernah diset sama sekali, jangan pilih siapapun secara acak,
        // biarkan kosong agar panitia secara eksplisit menentukan whitelisting
        setSelectedIds(new Set());
      }
      setSearchQuery('');
      setPtkFilter('ALL');
      setIsWaComposerOpen(false);
      setWaBroadcastResult(null);
      setWaMessage(buildDefaultWaTemplate(activeEvent.nama_event));
    }
  }, [isOpen, activeEvent]);

  // Toggle Single Guru
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick Actions
  const handleSelectAllPendidik = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pendidikList.forEach((g) => next.add(g.id));
      return next;
    });
    toast.success(`Menambahkan seluruh ${pendidikList.length} Guru Pendidik ke Kandidat`);
  };

  const handleSelectAllTU = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      tuList.forEach((g) => next.add(g.id));
      return next;
    });
    toast.success(`Menambahkan seluruh ${tuList.length} Staf TU ke Kandidat`);
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
    toast.success('Daftar kandidat dikosongkan');
  };

  // Filter List Guru untuk Ditampilkan
  const displayedStaff = useMemo(() => {
    let list = allStaffList;

    if (ptkFilter === 'PENDIDIK') {
      list = pendidikList;
    } else if (ptkFilter === 'TU') {
      list = tuList;
    } else if (ptkFilter === 'SELECTED_ONLY') {
      list = list.filter((g) => selectedIds.has(g.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => {
        const name = (g.nama_guru || '').toLowerCase();
        const nip = (g.nip || '').toLowerCase();
        return name.includes(q) || nip.includes(q);
      });
    }

    // Urutkan: yang sudah terpilih di atas, lalu abjad nama
    return [...list].sort((a, b) => {
      const aSel = selectedIds.has(a.id) ? 1 : 0;
      const bSel = selectedIds.has(b.id) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      return (a.nama_guru || '').localeCompare(b.nama_guru || '');
    });
  }, [allStaffList, pendidikList, tuList, ptkFilter, searchQuery, selectedIds]);

  // Hitung Breakdown Terpilih
  const selectedCounts = useMemo(() => {
    let pendidik = 0;
    let tu = 0;
    selectedIds.forEach((id) => {
      const g = allStaffList.find((item) => item.id === id);
      if (g) {
        const ptk = (g.jenis_ptk || '').toUpperCase().trim();
        if (
          ptk === 'TENAGA_KEPENDIDIKAN' ||
          ptk === 'TU' ||
          ptk === 'TATA_USAHA' ||
          ptk === 'STAFF' ||
          ptk === 'STAF'
        ) {
          tu++;
        } else {
          pendidik++;
        }
      }
    });

    const totalSelected = selectedIds.size;
    const avgLoad =
      totalSelected > 0 && totalSesiCount > 0
        ? (totalSesiCount / totalSelected).toFixed(1)
        : '0';

    return {
      total: totalSelected,
      pendidik,
      tu,
      avgLoad,
    };
  }, [selectedIds, allStaffList, totalSesiCount]);

  // Mutation Simpan Kandidat ke activeEvent
  const saveCandidatesMutation = useMutation({
    mutationFn: async () => {
      if (!activeEvent) throw new Error('Event CBT tidak ditemukan');
      const candidateArray = Array.from(selectedIds);
      return await cbtApi.upsertEvent({
        id: activeEvent.id,
        pengawas_candidates: candidateArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.eventsSummary() });
      toast.success(
        `Berhasil menetapkan ${selectedIds.size} Kandidat Pengawas untuk ${activeEvent?.nama_event || 'Event'}`
      );
      if (onSaved) {
        onSaved(Array.from(selectedIds));
      }
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan daftar kandidat pengawas');
    },
  });

  // Statistik Nomor HP Kandidat Terpilih untuk WA Broadcast
  const selectedWaStats = useMemo(() => {
    const selectedStaff = allStaffList.filter((g) => selectedIds.has(g.id));
    const isValidPhone = (hp?: string | null) => Boolean(hp && hp.replace(/[^0-9]/g, '').length >= 9);
    const withPhone = selectedStaff.filter((g) => isValidPhone(g.no_hp));
    const withoutPhone = selectedStaff.filter((g) => !isValidPhone(g.no_hp));
    return {
      total: selectedStaff.length,
      withPhone,
      withoutPhone,
      sample: withPhone[0] || selectedStaff[0] || null,
    };
  }, [allStaffList, selectedIds]);

  const broadcastWaMutation = useMutation({
    mutationFn: async () => {
      if (!activeEvent) throw new Error('Event CBT tidak ditemukan');
      const trimmed = waMessage.trim();
      if (!trimmed) throw new Error('Pesan WhatsApp wajib diisi');
      const targetIds = Array.from(selectedIds);
      if (targetIds.length === 0) throw new Error('Pilih minimal satu kandidat pengawas');
      return await cbtApi.broadcastKandidatWa(activeEvent.id, {
        message: trimmed,
        guru_ids: targetIds,
      });
    },
    onSuccess: (res) => {
      setWaBroadcastResult(res);
      toast.success(
        `${res.queuedCount} pesan WA kandidat masuk antrian WA Gateway${
          res.skippedCount > 0 ? ` (${res.skippedCount} dilewati tanpa No. HP)` : ''
        }`
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengirim pesan WA massal';
      toast.error(msg);
    },
  });

  const handleInsertPlaceholder = (token: string) => {
    setWaMessage((prev) => (prev ? `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${token}` : token));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pra-Ploting: Penetapan Kandidat Pengawas Ujian"
      size="xl"
    >
      <div className="space-y-4 py-1 text-xs">
        {isWaComposerOpen ? (
          <div className="space-y-4">
            {/* Header Banner WA Broadcast */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Kirim Pesan Massal via WA Gateway
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Target: <strong>{selectedWaStats.withPhone.length} kandidat</strong> memiliki No. HP valid
                    {selectedWaStats.withoutPhone.length > 0 && (
                      <span className="text-amber-700 dark:text-amber-300 font-semibold">
                        {' '}• {selectedWaStats.withoutPhone.length} tanpa No. HP (dilewati)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWaComposerOpen(false)}
                className="text-xs font-bold gap-1.5"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Daftar</span>
              </Button>
            </div>

            {selectedWaStats.withoutPhone.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold">Kandidat tanpa No. HP/WA valid ({selectedWaStats.withoutPhone.length}): </span>
                  <span>
                    {selectedWaStats.withoutPhone
                      .slice(0, 6)
                      .map((g) => g.nama_guru)
                      .join(', ')}
                    {selectedWaStats.withoutPhone.length > 6
                      ? ` dan ${selectedWaStats.withoutPhone.length - 6} lainnya`
                      : ''}
                    .
                  </span>
                </div>
              </div>
            )}

            {/* Placeholder Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  Isi Pesan WhatsApp
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 mr-1">Sisipkan variabel:</span>
                  {['{nama}', '{nip}', '{event}', '{sekolah}'].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleInsertPlaceholder(token)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={6}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                placeholder="Tulis pesan untuk kandidat pengawas CBT..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-normal leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Antrian WA Gateway otomatis memberi jeda ±3 detik per pesan agar aman dari pemblokiran.</span>
                <span className="font-mono">{waMessage.length}/4000</span>
              </div>
            </div>

            {/* Live Preview */}
            {selectedWaStats.sample && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pratinjau Pesan ({selectedWaStats.sample.nama_guru})
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {waMessage
                    .replace(/\{nama\}/gi, selectedWaStats.sample.nama_guru || '')
                    .replace(/\{nip\}/gi, selectedWaStats.sample.nip || '-')
                    .replace(/\{event\}/gi, activeEvent?.nama_event || 'Ujian CBT')
                    .replace(/\{sekolah\}/gi, 'Sekolah Anda')}
                </p>
              </div>
            )}

            {/* Broadcast Result Feedback */}
            {waBroadcastResult && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>
                    {waBroadcastResult.queuedCount} pesan berhasil masuk antrian WA Gateway (estimasi selesai ±
                    {waBroadcastResult.estimatedSeconds} detik).
                  </span>
                </div>
                {waBroadcastResult.skippedCount > 0 && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    {waBroadcastResult.skippedCount} kandidat dilewati karena tidak memiliki No. HP valid.
                  </p>
                )}
              </div>
            )}

            {/* Footer WA Composer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWaComposerOpen(false)}
                disabled={broadcastWaMutation.isPending}
                className="text-xs font-bold"
              >
                Kembali
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => broadcastWaMutation.mutate()}
                disabled={
                  broadcastWaMutation.isPending ||
                  !waMessage.trim() ||
                  selectedWaStats.withPhone.length === 0
                }
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                <Send size={13} />
                <span>
                  {broadcastWaMutation.isPending
                    ? 'Memasukkan Antrian...'
                    : `Kirim via WA Gateway (${selectedWaStats.withPhone.length})`}
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <>
        {/* Banner Info Kesiapan & Rasio */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50/50 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-indigo-950/20 border border-indigo-200 dark:border-indigo-800/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{selectedCounts.total} Kandidat Pengawas Terpilih</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {selectedCounts.pendidik} Guru Pendidik • {selectedCounts.tu} Staf TU
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Engine ploting otomatis dan pemilihan manual akan <strong>hanya memanggil guru/staf yang di-whitelist di sini</strong>.
              </p>
            </div>
          </div>

          {totalSesiCount > 0 && selectedCounts.total > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-right">
              <span className="text-[10px] text-slate-400 font-semibold block">Rata-rata Beban</span>
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">
                ~{selectedCounts.avgLoad} Sesi / Pengawas
              </span>
            </div>
          )}
        </div>

        {/* Action Toolbar: Filter PTK, Search, Quick Buttons */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filter Tabs PTK */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setPtkFilter('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  ptkFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Semua ({allStaffList.length})
              </button>
              <button
                type="button"
                onClick={() => setPtkFilter('PENDIDIK')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  ptkFilter === 'PENDIDIK'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <GraduationCap size={12} />
                <span>Pendidik ({pendidikList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPtkFilter('TU')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  ptkFilter === 'TU'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <Briefcase size={12} />
                <span>TU / Staf ({tuList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPtkFilter('SELECTED_ONLY')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  ptkFilter === 'SELECTED_ONLY'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                )}
              >
                <CheckCircle2 size={12} />
                <span>Kandidat Terpilih ({selectedCounts.total})</span>
              </button>
            </div>

            {/* Quick Batch Select Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllPendidik}
                className="text-[11px] h-7 font-bold border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              >
                + Pilih Semua Pendidik
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllTU}
                className="text-[11px] h-7 font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                + Pilih Semua TU
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-[11px] h-7 font-bold border-slate-300 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Kosongkan
              </Button>
            </div>
          </div>

          {/* Search Box */}
          {rolloverSourceEvents.length > 0 && (
            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <RotateCcw size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 shrink-0">
                  Rollover dari Event Lain:
                </span>
                <select
                  value={rolloverSourceEventId}
                  onChange={(e) => setRolloverSourceEventId(e.target.value)}
                  className="h-7 px-2 text-[11px] rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium min-w-0 max-w-xs"
                >
                  {rolloverSourceEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nama_event}{ev.tpLabel ? ` (${ev.tpLabel})` : ''} — {ev.candidateIds.length} Kandidat
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRolloverCandidates}
                className="text-[11px] h-7 font-bold border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shrink-0"
              >
                <RotateCcw size={12} className="mr-1" />
                Ambil Kandidat
              </Button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru atau NIP..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Tabel Pegawai / Kandidat (Scrollable) */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[380px] overflow-y-auto">
          {displayedStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <Users size={24} className="mx-auto text-slate-300" />
              <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                Tidak ada data pegawai yang cocok
              </p>
              <p className="text-[11px]">Ubah filter atau kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2 px-3 text-center w-12">Pilih</th>
                  <th className="py-2 px-3">Nama Pegawai &amp; NIP</th>
                  <th className="py-2 px-3">No. HP / WA</th>
                  <th className="py-2 px-3">Jenis PTK</th>
                  <th className="py-2 px-3 text-center">Status Kandidat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedStaff.map((staff) => {
                  const isSelected = selectedIds.has(staff.id);
                  const ptk = (staff.jenis_ptk || '').toUpperCase().trim();
                  const isTU =
                    ptk === 'TENAGA_KEPENDIDIKAN' ||
                    ptk === 'TU' ||
                    ptk === 'TATA_USAHA' ||
                    ptk === 'STAFF' ||
                    ptk === 'STAF';

                  return (
                    <tr
                      key={staff.id}
                      onClick={() => handleToggle(staff.id)}
                      className={cn(
                        'transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(staff.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                        />
                      </td>

                      {/* Nama & NIP */}
                      <td className="py-2 px-3 align-middle">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {staff.nama_guru}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {staff.nip ? `NIP. ${staff.nip}` : 'Non-NIP'}
                        </div>
                      </td>

                      {/* No. HP / WA */}
                      <td className="py-2 px-3 align-middle">
                        {staff.no_hp && staff.no_hp.replace(/[^0-9]/g, '').length >= 9 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <Phone size={10} />
                            <span>{staff.no_hp}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-500 italic">
                            No. HP kosong
                          </span>
                        )}
                      </td>

                      {/* Kategori PTK */}
                      <td className="py-2 px-3 align-middle">
                        {isTU ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Briefcase size={10} />
                            <span>Tenaga Kependidikan / TU</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <GraduationCap size={10} />
                            <span>Guru Pendidik</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center align-middle">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <Check size={10} strokeWidth={3} />
                            <span>Kandidat Aktif</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Bukan Kandidat
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-500">
            Total {selectedCounts.total} pegawai akan menjadi dasar pool seleksi pengawas ujian.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWaBroadcastResult(null);
                setIsWaComposerOpen(true);
              }}
              disabled={selectedCounts.total === 0 || saveCandidatesMutation.isPending}
              className="text-xs font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
              title="Kirim pesan massal WhatsApp ke kandidat terpilih via WA Gateway"
            >
              <MessageSquare size={13} />
              <span>Kirim WA Massal ({selectedWaStats.withPhone.length})</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saveCandidatesMutation.isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveCandidatesMutation.mutate()}
              disabled={saveCandidatesMutation.isPending}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
            >
              {saveCandidatesMutation.isPending ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>Simpan Kandidat Pengawas ({selectedCounts.total})</span>
                </>
              )}
            </Button>
          </div>
        </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CbtKandidatPengawasModal;
