
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Textarea, Label } from '../ui';
import { BookOpen, AlertCircle, CheckCircle2, Info, Sparkles, Percent } from 'lucide-react';
import { upsertProgresMateri } from '../../api/attendanceGerbang.api';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ui/Modal';
import { cn } from '../../lib/utils';

interface JurnalKbmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sesiId: string;
  initialData?: any;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export const JurnalKbmModal: React.FC<JurnalKbmModalProps> = ({
  isOpen,
  onClose,
  sesiId,
  initialData,
  onSuccess,
  readOnly = false
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    judul_materi: '',
    deskripsi: '',
    pencapaian_persen: 100,
    kendala: ''
  });

  // Reset or set initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        judul_materi: initialData?.judul_materi || '',
        deskripsi: initialData?.deskripsi || '',
        pencapaian_persen: typeof initialData?.pencapaian_persen === 'number' ? initialData.pencapaian_persen : 100,
        kendala: initialData?.kendala || ''
      });
    }
  }, [isOpen, initialData]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formData.judul_materi.trim()) {
      toast.error('Judul materi wajib diisi');
      return;
    }
    setShowConfirm(true);
  };

  const handleActualSubmit = async () => {
    if (readOnly) return;
    setLoading(true);
    try {
      await upsertProgresMateri(sesiId, formData);
      toast.success('Jurnal KBM berhasil disimpan');
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
      setShowConfirm(false);
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
        zIndex={80}
        size="lg"
        className="max-h-[92vh] flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden"
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-800 dark:text-white text-base">
                {readOnly ? 'Detail Jurnal Mengajar' : 'Isi Jurnal KBM Guru'}
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                {readOnly ? 'Catatan jurnal KBM resmi' : 'Catat ringkasan pembelajaran & capaian materi'}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handlePreSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
            {!readOnly && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium text-[11px]">
                  Jurnal ini tersinkronisasi langsung ke <strong>Buku Agenda Guru</strong>, dashboard Kurikulum, dan laporan Kepala Sekolah.
                </p>
              </div>
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
                className="rounded-xl h-10 border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
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
                rows={2}
                disabled={readOnly}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 leading-relaxed"
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

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleActualSubmit}
        title="Simpan Jurnal KBM?"
        message="Pastikan ringkasan materi dan capaian pembelajaran sudah tepat. Data akan langsung terbit ke Buku Agenda Guru resmi."
        confirmText="Ya, Terbitkan Jurnal"
        cancelText="Periksa Lagi"
      />
    </>
  );
};
