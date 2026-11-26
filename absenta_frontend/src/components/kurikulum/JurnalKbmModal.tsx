
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Textarea, Label } from '../ui';
import { BookOpen, AlertCircle, CheckCircle2, Info, Sparkles, Percent, Laptop, Video, Link2, Plus, Trash2, FileText } from 'lucide-react';
import { upsertProgresMateri } from '../../api/attendanceGerbang.api';
import { getActiveTpForSesi, TujuanPembelajaranItem } from '../../api/atp.api';
import { getReaderContent, type AvailableModulItem, type AttachedFileItem } from '../../api/bahan-ajar.api';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ui/Modal';
import { cn } from '../../lib/utils';

const AtpBuilderModal = lazy(() => import('./atp/AtpBuilderModal'));

interface JurnalKbmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sesiId: string;
  sesi?: any;
  initialData?: any;
  onSuccess?: () => void;
  readOnly?: boolean;
  zIndex?: number;
}

export const JurnalKbmModal: React.FC<JurnalKbmModalProps> = ({
  isOpen,
  onClose,
  sesiId,
  sesi,
  initialData,
  onSuccess,
  readOnly = false,
  zIndex = 160
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tpList, setTpList] = useState<TujuanPembelajaranItem[]>([]);
  const [atpInfo, setAtpInfo] = useState<any>(null);
  const [isLoadingTp, setIsLoadingTp] = useState(false);
  const [atpModalOpen, setAtpModalOpen] = useState(false);
  const [availableModuls, setAvailableModuls] = useState<AvailableModulItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [newRefJudul, setNewRefJudul] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');
  const [formData, setFormData] = useState({
    judul_materi: '',
    deskripsi: '',
    pencapaian_persen: 100,
    kendala: '',
    mode_pelaksanaan: 'TATAP_MUKA' as 'TATAP_MUKA' | 'DARING_LIVE' | 'DARING_TUGAS',
    perangkat_ajar_id: '',
    instruksi_tugas: '',
    file_tugas_url: '',
    referensi_json: [] as Array<{ judul: string; url: string }>
  });

  const unitNama = sesi?.unit_nama || sesi?.UnitPengajaran?.nama_unit || sesi?._raw?.unit_nama || initialData?.unit_nama || null;
  const mapelNama = sesi?.mapel_nama || sesi?.Mapel?.nama_mapel || sesi?.kegiatan || initialData?.mapel_nama || null;
  const kelasNama = sesi?.kelas_nama || sesi?.Kelas?.nama_kelas || initialData?.kelas_nama || null;
  const mapelId = sesi?.mapel_id || sesi?.Mapel?.id || sesi?._raw?.mapel_id || initialData?.mapel_id || undefined;
  const isPjjDay = Boolean(sesi?.is_pjj_daring || sesi?._raw?.is_pjj_daring);

  // Reset or set initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultMode = initialData?.mode_pelaksanaan
        || sesi?.mode_pelaksanaan
        || (isPjjDay ? 'DARING_TUGAS' : 'TATAP_MUKA');
      const initRefs = Array.isArray(initialData?.referensi_json)
        ? initialData.referensi_json
        : Array.isArray(sesi?.referensi_json)
        ? sesi.referensi_json
        : [];

      setFormData({
        judul_materi: initialData?.judul_materi || initialData?.materi || '',
        deskripsi: initialData?.deskripsi || '',
        pencapaian_persen: typeof initialData?.pencapaian_persen === 'number' ? initialData.pencapaian_persen : 100,
        kendala: initialData?.kendala || '',
        mode_pelaksanaan: defaultMode,
        perangkat_ajar_id: initialData?.perangkat_ajar_id || sesi?.perangkat_ajar_id || '',
        instruksi_tugas: initialData?.instruksi_tugas || sesi?.instruksi_tugas || '',
        file_tugas_url: initialData?.file_tugas_url || sesi?.file_tugas_url || '',
        referensi_json: initRefs
      });
      setNewRefJudul('');
      setNewRefUrl('');

      // Fetch active TP list for this session
      if (sesiId && !readOnly) {
        setIsLoadingTp(true);
        getActiveTpForSesi(sesiId)
          .then((res) => {
            setTpList(res.tujuan_pembelajaran || []);
            setAtpInfo(res.atp || null);
          })
          .catch(() => {
            setTpList([]);
            setAtpInfo(null);
          })
          .finally(() => setIsLoadingTp(false));
      }

      // Fetch available PerangkatAjar & BahanAjarPreset for this subject
      if ((mapelId || mapelNama) && !readOnly) {
        getReaderContent(mapelId || 'auto', {
          mapel_id: mapelId,
          mapel_nama: mapelNama || undefined,
        })
          .then((res) => {
            setAvailableModuls(res?.available_moduls || []);
            setAttachedFiles(res?.attached_files || []);
          })
          .catch(() => {
            setAvailableModuls([]);
            setAttachedFiles([]);
          });
      }
    }
  }, [isOpen, initialData, sesiId, readOnly, mapelId, mapelNama, isPjjDay, sesi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!sesiId) {
      toast.error('ID Sesi KBM tidak ditemukan. Silakan buka sesi mengajar terlebih dahulu.');
      return;
    }
    if (!formData.judul_materi.trim()) {
      toast.error('Judul materi wajib diisi');
      return;
    }
    const isDaring = formData.mode_pelaksanaan === 'DARING_LIVE' || formData.mode_pelaksanaan === 'DARING_TUGAS';
    if (isDaring && !formData.instruksi_tugas.trim() && !formData.perangkat_ajar_id && !formData.file_tugas_url && formData.referensi_json.length === 0) {
      toast.error('Untuk KBM Daring/PJJ, wajib menyematkan minimal Modul, Uraian Tugas, atau Referensi belajar bagi siswa.');
      return;
    }
    setLoading(true);
    try {
      await upsertProgresMateri(sesiId, formData);
      toast.success(isDaring ? 'Ruang KBM Daring & Laporan Mengajar berhasil dipublikasikan! ✨' : 'Jurnal KBM berhasil disimpan! ✨');
      queryClient.invalidateQueries({ queryKey: ['rekapJurnalSesiList'] });
      queryClient.invalidateQueries({ queryKey: ['sesiAbsensiList'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['guruTeachingTimeline'] });
      queryClient.invalidateQueries({ queryKey: ['guru-riwayat-ajar'] });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan Jurnal KBM');
    } finally {
      setLoading(false);
    }
  };

  const quickPercentages = [25, 50, 75, 100];
  const quickKendalas = [
    'Nihil (KBM Lancar)',
    'Siswa kurang fokus',
    'Waktu KBM terbatas',
    'Koneksi internet lambat'
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        zIndex={zIndex}
        size="xl"
        className="max-h-[92vh] max-w-2xl w-full flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden"
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-800 dark:text-white text-base">
                {readOnly ? 'Detail Jurnal & Ruang KBM' : 'Isi Jurnal & Ruang KBM Daring'}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                {readOnly ? 'Catatan jurnal & materi KBM resmi' : 'Catat ringkasan pembelajaran, sematkan modul & tugas siswa'}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
            {(mapelNama || unitNama || kelasNama) && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex-wrap justify-between">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {kelasNama && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-[11px] font-mono border border-blue-300 dark:border-blue-800 shrink-0">
                      {kelasNama}
                    </span>
                  )}
                  {mapelNama && <span className="font-extrabold text-slate-900 dark:text-white truncate">{mapelNama}</span>}
                </div>
                {unitNama && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Unit: {unitNama}
                  </span>
                )}
              </div>
            )}

            {!readOnly && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium text-[11px]">
                  Jurnal ini tersinkronisasi langsung ke <strong>Buku Agenda Guru</strong>, dashboard Kurikulum, dan laporan Kepala Sekolah.
                </p>
              </div>
            )}

            {/* 1-KLIK INTEGRASI DARI ATP KURIKULUM MERDEKA */}
            {!readOnly && (
              <>
                {/* Loading Skeleton */}
                {isLoadingTp && (
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 animate-pulse flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-9 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                )}

                {/* Dropdown — ada data TP */}
                {!isLoadingTp && tpList.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-extrabold text-xs">
                        <Sparkles size={14} className="text-amber-500 animate-bounce" />
                        <span>Rencana ATP / Tujuan Pembelajaran (Kurikulum Merdeka)</span>
                      </div>
                      {atpInfo?.fase && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200 text-[10px] font-black">
                          Fase {atpInfo.fase}
                        </span>
                      )}
                    </div>
                    <select
                      className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-blue-300/80 dark:border-blue-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-xs"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const selected = tpList.find((t) => (t.id && t.id === val) || t.kode_tp === val);
                        if (selected) {
                          setFormData({
                            ...formData,
                            judul_materi: selected.judul_materi,
                            deskripsi: selected.deskripsi_tp || formData.deskripsi,
                            pencapaian_persen: 100
                          });
                          toast.success(`⚡ 1-Klik: '${selected.kode_tp}' diterapkan!`, { icon: '✨' });
                        }
                      }}
                    >
                      <option value="">⚡ 1-Klik: Pilih Materi / TP dari Agenda Semester...</option>
                      {tpList.map((tp, i) => (
                        <option key={tp.id || i} value={tp.id || tp.kode_tp}>
                          {tp.kode_tp}: {tp.judul_materi} ({tp.alokasi_jp} JP)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Empty State — belum ada ATP/TP */}
                {!isLoadingTp && tpList.length === 0 && (
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                        <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 truncate">
                          Belum ada Rencana ATP / TP
                        </p>
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium leading-tight">
                          Susun sekarang agar judul &amp; CP terisi otomatis
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAtpModalOpen(true)}
                      className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-black text-[11px] shadow-sm shadow-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>+ Buat ATP</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 1. Judul Materi */}
            <div className="space-y-1.5">
              <Label htmlFor="judul_materi" className="text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-between">
                <span>Judul Materi / Pokok Bahasan <span className="text-rose-500">*</span></span>
              </Label>
              <Input
                id="judul_materi"
                placeholder={readOnly ? '-' : "Contoh: Pengenalan Komponen Motor Bakar 4 Tak"}
                value={formData.judul_materi}
                onChange={(e) => setFormData({...formData, judul_materi: e.target.value})}
                required
                disabled={readOnly}
                className="rounded-xl h-11 border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 2. Ringkasan Pembahasan */}
            <div className="space-y-1.5">
              <Label htmlFor="deskripsi" className="text-slate-800 dark:text-slate-200 font-extrabold text-xs">
                Ringkasan Pembahasan / Capaian Pembelajaran (CP)
              </Label>
              <Textarea
                id="deskripsi"
                placeholder={readOnly ? '-' : "Uraikan aktivitas KBM dan materi yang tersampaikan kepada siswa..."}
                value={formData.deskripsi}
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                rows={5}
                disabled={readOnly}
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 leading-relaxed min-h-[120px] resize-y p-3.5"
              />
            </div>

            {/* 3. Pencapaian Persen with Slider & Quick Preset Pills */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label htmlFor="pencapaian" className="text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5">
                  <Percent size={13} className="text-blue-500" />
                  <span>Ketercapaian Materi</span>
                </Label>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs font-mono">
                  {formData.pencapaian_persen}%
                </span>
              </div>

              {!readOnly && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.pencapaian_persen}
                    onChange={(e) => setFormData({...formData, pencapaian_persen: Number(e.target.value)})}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  {/* Quick Preset Pills */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {quickPercentages.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setFormData({...formData, pencapaian_persen: pct})}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer",
                          formData.pencapaian_persen === pct
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {pct}%{pct === 100 ? ' (Tuntas)' : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 4. Kendala / Catatan Khusus with Quick Suggestion Chips */}
            <div className="space-y-1.5">
              <Label htmlFor="kendala" className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Kendala / Catatan Kelas (Opsional)</span>
              </Label>
              <Textarea
                id="kendala"
                placeholder={readOnly ? '-' : "Catatan khusus, tindak lanjut, kendala siswa, dsb."}
                value={formData.kendala}
                onChange={(e) => setFormData({...formData, kendala: e.target.value})}
                rows={2}
                disabled={readOnly}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />

              {!readOnly && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-bold">Pilihan Cepat:</span>
                  {quickKendalas.map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({...formData, kendala: chip})}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px] transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. KONSOLIDASI RUANG KBM DARING / PJJ (MODUL, TUGAS, REFERENSI & LIVE WEBRTC) */}
            <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/25 border border-violet-200/80 dark:border-violet-800/60 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-600 text-white">
                    <Laptop size={14} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-violet-950 dark:text-violet-100">
                      Mode Pelaksanaan &amp; Ruang KBM Daring (PJJ)
                    </h5>
                    <p className="text-[10px] text-violet-700/80 dark:text-violet-300/80 font-medium">
                      Sematkan modul, uraian tugas, referensi &amp; ruang kelas virtual untuk diakses siswa
                    </p>
                  </div>
                </div>
                {isPjjDay && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    ⚡ Instruksi PJJ Aktif
                  </span>
                )}
              </div>

              {/* Pilihan Mode Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'TATAP_MUKA', label: '🏫 Tatap Muka', desc: 'KBM Reguler di Kelas' },
                  { id: 'DARING_TUGAS', label: '📚 Daring (Modul & Tugas)', desc: 'Sematkan Modul & Tugas' },
                  { id: 'DARING_LIVE', label: '🎥 Daring + Live Virtual', desc: 'Live WebRTC + Modul' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setFormData({ ...formData, mode_pelaksanaan: m.id as any })}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      formData.mode_pelaksanaan === m.id
                        ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800/60 text-slate-700 dark:text-slate-200 hover:bg-violet-100/50"
                    )}
                  >
                    <div className="text-[11px] font-black">{m.label}</div>
                    <div className={cn("text-[9px] font-medium", formData.mode_pelaksanaan === m.id ? "text-violet-100" : "text-slate-400")}>
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Sematkan Modul dari Perangkat Ajar / Bahan Ajar */}
              <div className="space-y-1.5">
                <Label className="text-violet-950 dark:text-violet-200 font-extrabold text-xs flex items-center gap-1.5">
                  <BookOpen size={13} className="text-violet-600 dark:text-violet-400" />
                  <span>Sematkan Modul Ajar / Lembar Kerja Siswa (Opsional)</span>
                </Label>
                {!readOnly && (availableModuls.length > 0 || attachedFiles.length > 0) && (
                  <select
                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                    value={formData.perangkat_ajar_id || formData.file_tugas_url || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matchedFile = attachedFiles.find((f) => f.file_url === val || f.id === val);
                      const matchedModul = availableModuls.find((m) => m.id === val);
                      if (matchedFile) {
                        setFormData({
                          ...formData,
                          perangkat_ajar_id: matchedFile.id,
                          file_tugas_url: matchedFile.file_url,
                          judul_materi: formData.judul_materi || matchedFile.judul,
                        });
                      } else if (matchedModul) {
                        setFormData({
                          ...formData,
                          perangkat_ajar_id: matchedModul.id,
                          judul_materi: formData.judul_materi || matchedModul.judul,
                        });
                      } else {
                        setFormData({ ...formData, perangkat_ajar_id: '', file_tugas_url: '' });
                      }
                    }}
                  >
                    <option value="">-- Pilih dari Perangkat Ajar / Modul Kurikulum Anda --</option>
                    {availableModuls.map((m) => (
                      <option key={m.id} value={m.id}>
                        📘 [Modul Interaktif] {m.judul} (Fase {m.fase})
                      </option>
                    ))}
                    {attachedFiles.map((f) => (
                      <option key={f.id} value={f.file_url}>
                        📄 [Berkas {f.jenis}] {f.judul}
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  placeholder={readOnly ? '-' : "Atau tempel tautan langsung Modul / PDF / Google Drive..."}
                  value={formData.file_tugas_url}
                  onChange={(e) => setFormData({ ...formData, file_tugas_url: e.target.value })}
                  disabled={readOnly}
                  className="rounded-xl h-10 bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800 text-xs font-medium"
                />
              </div>

              {/* Uraian Tugas Siswa */}
              <div className="space-y-1.5">
                <Label className="text-violet-950 dark:text-violet-200 font-extrabold text-xs flex items-center gap-1.5">
                  <FileText size={13} className="text-violet-600 dark:text-violet-400" />
                  <span>Uraian Tugas &amp; Instruksi Pembelajaran Siswa</span>
                </Label>
                <Textarea
                  placeholder={readOnly ? '-' : "Uraikan langkah belajar mandiri, soal tugas, atau instruksi pengumpulan tugas bagi siswa di ruang KBM daring..."}
                  value={formData.instruksi_tugas}
                  onChange={(e) => setFormData({ ...formData, instruksi_tugas: e.target.value })}
                  rows={3}
                  disabled={readOnly}
                  className="rounded-xl bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800 text-xs font-medium"
                />
              </div>

              {/* Lampiran Referensi (Video / Artikel / Link) */}
              <div className="space-y-2">
                <Label className="text-violet-950 dark:text-violet-200 font-extrabold text-xs flex items-center gap-1.5">
                  <Link2 size={13} className="text-violet-600 dark:text-violet-400" />
                  <span>Lampiran Referensi Belajar (Video YouTube / Artikel / Sumber Belajar)</span>
                </Label>
                {!readOnly && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Judul Referensi (mis: Video Tutorial Bab 1)"
                      value={newRefJudul}
                      onChange={(e) => setNewRefJudul(e.target.value)}
                      className="rounded-xl h-9 bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800 text-xs flex-1"
                    />
                    <Input
                      placeholder="https://youtube.com/..."
                      value={newRefUrl}
                      onChange={(e) => setNewRefUrl(e.target.value)}
                      className="rounded-xl h-9 bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!newRefUrl.trim()) {
                          toast.error('Masukkan URL referensi terlebih dahulu');
                          return;
                        }
                        setFormData({
                          ...formData,
                          referensi_json: [
                            ...formData.referensi_json,
                            { judul: newRefJudul.trim() || newRefUrl.trim(), url: newRefUrl.trim() }
                          ]
                        });
                        setNewRefJudul('');
                        setNewRefUrl('');
                      }}
                      className="h-9 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0"
                    >
                      <Plus size={13} className="mr-1" /> Tambah
                    </Button>
                  </div>
                )}

                {formData.referensi_json.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formData.referensi_json.map((refItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200/70 dark:border-violet-800/60 text-xs"
                      >
                        <a
                          href={refItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-violet-700 dark:text-violet-300 hover:underline truncate"
                        >
                          🔗 {refItem.judul}
                        </a>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                referensi_json: formData.referensi_json.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Safe-Area Footer */}
          <div className="p-4 sm:p-5 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 pb-6 sm:pb-5">
            <Button
              type="button"
              variant={readOnly ? "primary" : "outline"}
              onClick={onClose}
              className="rounded-xl font-bold text-xs h-10 px-4"
            >
              {readOnly ? 'Tutup' : 'Batal'}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl px-5 h-10 font-black text-xs shadow-md shadow-blue-500/20"
              >
                {loading ? 'Menyimpan...' : (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Simpan Jurnal KBM</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <Suspense fallback={null}>
        {atpModalOpen && (
          <AtpBuilderModal
            isOpen={atpModalOpen}
            onClose={() => setAtpModalOpen(false)}
            initialMapelId={sesi?.mapel_id || sesi?.Mapel?.id}
            initialFase={sesi?.fase || (Number(sesi?.tingkat) >= 11 ? 'F' : 'E')}
            zIndex={zIndex + 20}
            onSaved={() => {
              if (sesiId) {
                setIsLoadingTp(true);
                getActiveTpForSesi(sesiId)
                  .then((res) => {
                    setTpList(res.tujuan_pembelajaran || []);
                    setAtpInfo(res.atp || null);
                  })
                  .finally(() => setIsLoadingTp(false));
              }
            }}
          />
        )}
      </Suspense>
    </>
  );
};
