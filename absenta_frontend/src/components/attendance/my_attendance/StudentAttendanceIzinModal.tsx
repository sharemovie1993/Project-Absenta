import React, { useState } from 'react';
import { z } from 'zod';
import { FileUp, AlertCircle } from 'lucide-react';
import { Modal, Button, Label, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import type { IzinFormData } from './StudentAttendanceTypes';

export const izinFormSchema = z.object({
  jenis: z.enum(['SAKIT', 'IZIN', 'DISPEN']),
  tanggalMulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggalSelesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  alasan: z.string().min(3, 'Alasan pengajuan minimal 3 karakter'),
  fileSuratUrl: z.string().optional()
});

interface StudentAttendanceIzinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const StudentAttendanceIzinModal: React.FC<StudentAttendanceIzinModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess
}) => {
  const [formData, setFormData] = useState<IzinFormData>({
    jenis: 'SAKIT',
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    alasan: '',
    fileSuratUrl: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Zod Schema Validation Guard
    const validation = izinFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Mohon lengkapi formulir pengajuan izin dengan benar');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Pengajuan izin/sakit berhasil dikirim ke Wali Kelas!');
      if (onSubmitSuccess) onSubmitSuccess();
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📩 Form Pengajuan Izin / Sakit"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
        <div className="space-y-1.5">
          <Label htmlFor="izin-jenis-select" className="font-bold text-slate-700 dark:text-slate-200">
            Jenis Pengajuan <span className="text-rose-500">*</span>
          </Label>
          <select
            id="izin-jenis-select"
            aria-label="Pilih jenis pengajuan izin atau sakit"
            value={formData.jenis}
            onChange={(e) => setFormData({ ...formData, jenis: e.target.value as any })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="SAKIT">🏥 Surat Sakit Dokter / Orang Tua</option>
            <option value="IZIN">📝 Izin Kepentingan Keluarga / Acara</option>
            <option value="DISPEN">🎖️ Dispensasi Lomba / Tugas Sekolah</option>
          </select>
          {errors.jenis && <p className="text-[10px] text-rose-500 font-medium">{errors.jenis}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="izin-tgl-mulai" className="font-bold text-slate-700 dark:text-slate-200">
              Tanggal Mulai <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="izin-tgl-mulai"
              aria-label="Tanggal mulai izin"
              type="date"
              value={formData.tanggalMulai}
              onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
            />
            {errors.tanggalMulai && <p className="text-[10px] text-rose-500 font-medium">{errors.tanggalMulai}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="izin-tgl-selesai" className="font-bold text-slate-700 dark:text-slate-200">
              Tanggal Selesai <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="izin-tgl-selesai"
              aria-label="Tanggal selesai izin"
              type="date"
              value={formData.tanggalSelesai}
              onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
            />
            {errors.tanggalSelesai && <p className="text-[10px] text-rose-500 font-medium">{errors.tanggalSelesai}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="izin-alasan-input" className="font-bold text-slate-700 dark:text-slate-200">
            Alasan / Keterangan Lengkap <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="izin-alasan-input"
            aria-label="Alasan atau keterangan lengkap izin"
            rows={3}
            placeholder="Tuliskan keterangan detail alasan berhalangan hadir..."
            value={formData.alasan}
            onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
          />
          {errors.alasan && <p className="text-[10px] text-rose-500 font-medium">{errors.alasan}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="file-surat-upload" className="font-bold text-slate-700 dark:text-slate-200">
            Upload Surat Bukti (Opsional)
          </Label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
            <FileUp className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-500 block">Klik untuk unggah foto/surat (JPG/PDF)</span>
            <input
              id="file-surat-upload"
              type="file"
              aria-label="Unggah berkas surat bukti"
              className="hidden"
              onChange={() => toast.success('Berkas surat dipilih (Siap dikirim)')}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            Kirim Pengajuan
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentAttendanceIzinModal;
