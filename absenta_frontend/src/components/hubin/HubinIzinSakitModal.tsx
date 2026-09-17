import React, { useState, useCallback } from 'react';
import { 
  Calendar, 
  FileText, 
  Camera, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Stethoscope, 
  HelpCircle,
  X
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Modal, ModalFooter, Button, Input } from '../ui';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import { hubinApi } from '../../api/hubin.api';
import { toLocalDate } from '../../utils/attendance/time';

interface HubinIzinSakitModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaPklId: string;
  studentName?: string;
  studentEmail?: string;
  studentClassName?: string;
  onSuccess?: () => void;
}

export const HubinIzinSakitModal: React.FC<HubinIzinSakitModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaPklId,
  studentName,
  studentEmail,
  studentClassName,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const todayStr = toLocalDate();

  const [status, setStatus] = useState<'SAKIT' | 'IZIN'>('SAKIT');
  const [tanggalMulai, setTanggalMulai] = useState(todayStr);
  const [tanggalSelesai, setTanggalSelesai] = useState(todayStr);
  const [keterangan, setKeterangan] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setStatus('SAKIT');
      setTanggalMulai(todayStr);
      setTanggalSelesai(todayStr);
      setKeterangan('');
      setImageUrl('');
    }
  }, [isOpen, todayStr]);

  const submitMutation = useMutation({
    mutationFn: (payload: {
      siswaPklId: string;
      status: 'SAKIT' | 'IZIN';
      tanggal_mulai: string;
      tanggal_selesai?: string;
      keterangan: string;
      image_url?: string;
    }) => hubinApi.submitIzinSakitPkl(payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Permohonan izin / sakit berhasil dikirim!');
      queryClient.invalidateQueries({ queryKey: ['my-penempatan'] });
      queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-absensi-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-tab'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-widget'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim permohonan izin');
    }
  });

  const handleSubmit = useCallback(() => {
    if (!keterangan.trim()) {
      toast.error('Mohon masukkan alasan permohonan');
      return;
    }
    if (!tanggalMulai) {
      toast.error('Tanggal mulai wajib diisi');
      return;
    }
    if (tanggalSelesai && tanggalSelesai < tanggalMulai) {
      toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai');
      return;
    }

    submitMutation.mutate({
      siswaPklId,
      status,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai || tanggalMulai,
      keterangan: keterangan.trim(),
      image_url: imageUrl || undefined,
    });
  }, [siswaPklId, status, tanggalMulai, tanggalSelesai, keterangan, imageUrl, submitMutation]);

  const customFileName = `${status}_${(studentName || 'siswa').replace(/\s+/g, '_')}_${tanggalMulai}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Pengajuan Izin / Sakit PKL"
      size="md"
    >
      <div className="space-y-4 p-1">
        {/* Info Box */}
        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
            Permohonan izin Anda akan dicatat pada rekap kehadiran PKL dan diteruskan ke <strong>Guru Pembimbing</strong> untuk diverifikasi.
          </div>
        </div>

        {/* 1. Pilih Tipe: SAKIT / IZIN */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Jenis Pengajuan <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('SAKIT')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                status === 'SAKIT'
                  ? 'bg-amber-500/15 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Stethoscope size={16} className={status === 'SAKIT' ? 'text-amber-600' : 'text-slate-400'} />
              <span>Sakit</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('IZIN')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                status === 'IZIN'
                  ? 'bg-blue-500/15 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Calendar size={16} className={status === 'IZIN' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Izin Keperluan</span>
            </button>
          </div>
        </div>

        {/* 2. Rentang Tanggal */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="tgl-mulai-izin" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tanggal Mulai <span className="text-rose-500">*</span>
            </label>
            <Input
              id="tgl-mulai-izin"
              type="date"
              value={tanggalMulai}
              onChange={(e) => {
                setTanggalMulai(e.target.value);
                if (tanggalSelesai < e.target.value) {
                  setTanggalSelesai(e.target.value);
                }
              }}
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div>
            <label htmlFor="tgl-selesai-izin" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tanggal Selesai <span className="text-rose-500">*</span>
            </label>
            <Input
              id="tgl-selesai-izin"
              type="date"
              min={tanggalMulai}
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
          </div>
        </div>

        {/* 3. Alasan / Keterangan */}
        <div>
          <label htmlFor="alasan-izin" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Alasan / Keterangan <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="alasan-izin"
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder={
              status === 'SAKIT'
                ? 'Jelaskan keluhan sakit (contoh: Demam tinggi dan radang tenggorokan)...'
                : 'Jelaskan alasan izin (contoh: Mengikuti tes seleksi beasiswa / urusan keluarga mendesak)...'
            }
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none resize-none"
          />
        </div>

        {/* 4. Unggah Foto Bukti (Surat Dokter / Surat Izin) */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
            <span>Foto Surat Dokter / Surat Orang Tua</span>
            <span className="text-[10px] text-slate-400 font-normal">Opsional namun sangat disarankan</span>
          </label>
          <div className="rounded-xl overflow-hidden">
            <HubinGoogleDriveUploader
              label={status === 'SAKIT' ? 'Unggah Foto Surat Dokter' : 'Unggah Foto Surat Keterangan'}
              value={imageUrl}
              onChange={setImageUrl}
              studentEmail={studentEmail}
              customFileName={customFileName}
              folderName={studentClassName || 'PKL_Surat_Izin'}
              compact
            />
          </div>
        </div>

        {/* Action Buttons */}
        <ModalFooter className="px-0 pb-0 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitMutation.isPending}
            className="rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={submitMutation.isPending}
            className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send size={13} />
            <span>Kirim Permohonan</span>
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
});

HubinIzinSakitModal.displayName = 'HubinIzinSakitModal';
