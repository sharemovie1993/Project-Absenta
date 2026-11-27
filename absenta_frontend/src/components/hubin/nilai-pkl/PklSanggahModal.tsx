import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { ScoreRow, isPklRowExempted } from './types';

interface PklSanggahModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: ScoreRow | null;
  canReview: boolean;
}

const ALASAN_OPTIONS = [
  { value: 'SISWA_KELUAR', label: 'Siswa Keluar / Mengundurkan Diri' },
  { value: 'MUTASI_SEKOLAH', label: 'Siswa Pindah / Mutasi Sekolah' },
  { value: 'DIBATALKAN_DUDI', label: 'Penempatan PKL Dibatalkan DUDI' },
  { value: 'TIDAK_HADIR_TOTAL', label: 'Siswa Tidak Pernah Hadir / Tanpa Keterangan' },
  { value: 'LAINNYA', label: 'Alasan Lainnya' },
];

export const PklSanggahModal: React.FC<PklSanggahModalProps> = ({
  isOpen,
  onClose,
  student,
  canReview,
}) => {
  const queryClient = useQueryClient();
  const [alasan, setAlasan] = useState('SISWA_KELUAR');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !student) return null;

  const exemption = isPklRowExempted(student);
  const sanggah = student.pkl_sanggah;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catatan.trim().length < 5) {
      toast.error('Mohon isi catatan sanggah minimal 5 karakter');
      return;
    }
    setIsSubmitting(true);
    try {
      await hubinApi.submitPklSanggah(student.siswa_pkl_id, {
        alasan,
        catatan: catatan.trim(),
      });
      toast.success(`Sanggah untuk ${student.nama_siswa} disimpan & dikecualikan dari Colek WA`);
      await queryClient.invalidateQueries({ queryKey: ['hubin-rekap-pkl'] });
      await queryClient.invalidateQueries({ queryKey: ['hubin'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim sanggah');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
    setIsSubmitting(true);
    try {
      await hubinApi.reviewPklSanggah(student.siswa_pkl_id, { decision });
      toast.success(
        decision === 'APPROVE'
          ? `Penempatan PKL ${student.nama_siswa} dinonaktifkan (BATAL)`
          : `Sanggah ${student.nama_siswa} ditolak — siswa kembali ke daftar penilaian`
      );
      await queryClient.invalidateQueries({ queryKey: ['hubin-rekap-pkl'] });
      await queryClient.invalidateQueries({ queryKey: ['hubin'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses review sanggah');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Sanggah &amp; Pengecualian Nilai PKL
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {student.nama_siswa} ({student.nama_kelas || student.nis})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {exemption.exempted && sanggah ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-300">
                  Status: {sanggah.status === 'APPROVED' ? 'Disetujui (Nonaktif)' : 'Menunggu Review Hubin/Kaprog'}
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  <strong>Alasan:</strong> {exemption.reasonLabel}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <strong>Catatan Guru:</strong> {sanggah.catatan}
                </div>
                <div className="text-[10px] text-slate-400">
                  Dikirim oleh {sanggah.submitted_by_name || 'Guru'}
                </div>
              </div>

              {canReview && sanggah.status === 'PENDING' && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleReview('REJECT')}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold gap-1"
                  >
                    <XCircle size={13} />
                    Tolak Sanggah
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleReview('APPROVE')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                  >
                    {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Terima &amp; Nonaktifkan PKL
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                Siswa yang disanggah akan <strong>langsung dikecualikan</strong> dari perhitungan tagihan{' '}
                <strong>Colek WA</strong> sehingga Anda tidak terus terjaring pengingat untuk siswa yang sudah keluar/mutasi.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Alasan Pengecualian
                </label>
                <select
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {ALASAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Catatan Lapangan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Siswa sudah mengundurkan diri dari sekolah sejak awal November 2026..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1"
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                  Kirim Sanggah &amp; Kecualikan
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const PklSanggahRowButton: React.FC<{
  score: ScoreRow;
  isComplete?: boolean;
  onOpen: (student: ScoreRow) => void;
}> = ({ score, isComplete = false, onOpen }) => {
  const exemption = isPklRowExempted(score);

  if (exemption.exempted) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(score);
        }}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 text-[9.5px] font-bold cursor-pointer hover:bg-amber-200/70 transition-colors"
        title={score.pkl_sanggah?.catatan || exemption.reasonLabel}
      >
        <AlertTriangle size={10} className="shrink-0" />
        <span className="truncate max-w-[145px]">{exemption.reasonLabel}</span>
      </button>
    );
  }

  if (isComplete) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(score);
      }}
      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9.5px] font-bold cursor-pointer transition-colors"
      title="Sanggah / Tandai siswa sudah keluar agar tidak terjaring Colek WA"
    >
      <AlertTriangle size={10} className="shrink-0" />
      <span>Sanggah / Keluar</span>
    </button>
  );
};
