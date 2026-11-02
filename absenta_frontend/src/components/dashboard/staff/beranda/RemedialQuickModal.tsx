import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { raporApi } from '@/api/rapor.api';
import { toast } from 'sonner';

export interface RadarRemedialItem {
  id: string;
  siswa_id: string;
  nis: string;
  nama_siswa: string;
  kelas_id: string;
  nama_kelas: string;
  mapel_id: string;
  nama_mapel: string;
  kkm: number;
  nilai_saat_ini: number | null;
  sumatif_1?: number | null;
  sumatif_2?: number | null;
  sumatif_3?: number | null;
  sumatif_akhir?: number | null;
  status: 'needs_remedial' | 'unassessed' | 'completed';
  catatan?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
}

interface RemedialQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RadarRemedialItem | null;
  tahunPelajaranId: string;
  semesterId: string;
  onSuccess?: () => void;
}

export const RemedialQuickModal: React.FC<RemedialQuickModalProps> = React.memo(({
  isOpen,
  onClose,
  item,
  tahunPelajaranId,
  semesterId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [nilai, setNilai] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (item) {
      setNilai(item.nilai_saat_ini !== null ? String(item.nilai_saat_ini) : '');
      setCatatan(item.status === 'completed' && item.catatan ? item.catatan : 'Tuntas Remedial Sumatif');
    } else {
      setNilai('');
      setCatatan('');
    }
  }, [item]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('Data siswa tidak ditemukan');
      const val = parseFloat(nilai);
      if (isNaN(val) || val < 0 || val > 100) {
        throw new Error('Nilai remedial harus berupa angka antara 0 hingga 100');
      }

      return await raporApi.submitRemedialSingle({
        siswa_id: item.siswa_id,
        kelas_id: item.kelas_id,
        mapel_id: item.mapel_id,
        tahun_pelajaran_id: item.tahun_pelajaran_id || tahunPelajaranId,
        semester_id: item.semester_id || semesterId,
        nilai_remedial: val,
        catatan_remedial: catatan.trim(),
      });
    },
    onSuccess: () => {
      toast.success(`Nilai remedial ${item?.nama_siswa} berhasil disimpan!`);
      queryClient.invalidateQueries({ queryKey: ['rapor-radar-remedial'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress-subtab'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-action-hub'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai remedial');
    },
  });

  if (!item) return null;

  const currentScore = item.nilai_saat_ini;
  const kkm = item.kkm || 70;
  const numNilai = parseFloat(nilai);
  const isTargetAchieved = !isNaN(numNilai) && numNilai >= kkm;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-lg w-full"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              Penuntasan Nilai Remedial Siswa
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {item.nama_kelas} &bull; {item.nama_mapel}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Ringkasan Profil Siswa & Status Nilai */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {item.nama_siswa}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                NIS: {item.nis || '-'} &bull; {item.nama_kelas}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Target KKM</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400">{kkm}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Nilai Rapor Saat Ini:</span>
              <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {currentScore !== null ? (
                  <span className={currentScore < kkm ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-extrabold'}>
                    {currentScore} {currentScore < kkm ? '(Di Bawah KKM)' : '(Tuntas)'}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 italic font-semibold">
                    Belum Ada Nilai
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Status Radar:</span>
              <div className="mt-0.5">
                {item.status === 'needs_remedial' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                    <AlertCircle size={10} /> Butuh Remedial
                  </span>
                ) : item.status === 'unassessed' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    <Clock size={10} /> Asesmen Kosong
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 size={10} /> Sudah Tuntas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Input Form Nilai Perbaikan */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nilai Hasil Remedial / Perbaikan (Skala 0 - 100) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                placeholder={`Masukkan nilai minimal ${kkm}...`}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              {nilai && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                  {isTargetAchieved ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Tuntas KKM
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle size={13} /> Masih &lt; KKM
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Nilai yang disimpan akan langsung meng-update nilai rapor akhir dan sumatif akhir siswa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Deskripsi Remedial (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Tuntas perbaikan asesmen sumatif bab trigonometri..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitMutation.isPending}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !nilai}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{submitMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai Remedial'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

RemedialQuickModal.displayName = 'RemedialQuickModal';
