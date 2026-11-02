import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calculator,
  Sparkles,
  Info,
  Calendar
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
  tahun_pelajaran_nama?: string;
  semester_id?: string;
  semester_nama?: string;
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
  const kkm = item?.kkm || 70;

  // State untuk masing-masing komponen asesmen sumatif
  const [s1, setS1] = useState<string>('');
  const [s2, setS2] = useState<string>('');
  const [s3, setS3] = useState<string>('');
  const [sas, setSas] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (item) {
      setS1(item.sumatif_1 !== null && item.sumatif_1 !== undefined ? String(item.sumatif_1) : '');
      setS2(item.sumatif_2 !== null && item.sumatif_2 !== undefined ? String(item.sumatif_2) : '');
      setS3(item.sumatif_3 !== null && item.sumatif_3 !== undefined ? String(item.sumatif_3) : '');
      setSas(item.sumatif_akhir !== null && item.sumatif_akhir !== undefined ? String(item.sumatif_akhir) : '');
      setCatatan(item.status === 'completed' && item.catatan ? item.catatan : 'Tuntas Remedial Sumatif');
    } else {
      setS1('');
      setS2('');
      setS3('');
      setSas('');
      setCatatan('');
    }
  }, [item]);

  // Kalkulasi Rata-rata Sumatif & Nilai Rapor Final Real-time
  const { rataSumatif, nilaiRaporFinal, isTuntas } = useMemo(() => {
    const v1 = s1 !== '' && !isNaN(Number(s1)) ? Number(s1) : null;
    const v2 = s2 !== '' && !isNaN(Number(s2)) ? Number(s2) : null;
    const v3 = s3 !== '' && !isNaN(Number(s3)) ? Number(s3) : null;
    const vSas = sas !== '' && !isNaN(Number(sas)) ? Number(sas) : null;

    const list = [v1, v2, v3].filter((v): v is number => v !== null);
    let avgSum: number | null = null;
    if (list.length > 0) {
      avgSum = Number((list.reduce((acc, curr) => acc + curr, 0) / list.length).toFixed(1));
    }

    let finalScore: number | null = null;
    if (avgSum !== null && vSas !== null) {
      finalScore = Number(((avgSum + vSas) / 2).toFixed(1));
    } else if (vSas !== null) {
      finalScore = vSas;
    } else if (avgSum !== null) {
      finalScore = avgSum;
    }

    const tuntas = finalScore !== null && finalScore >= kkm;

    return {
      rataSumatif: avgSum,
      nilaiRaporFinal: finalScore,
      isTuntas: tuntas,
    };
  }, [s1, s2, s3, sas, kkm]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('Data siswa tidak ditemukan');

      const numS1 = s1 !== '' ? Number(s1) : null;
      const numS2 = s2 !== '' ? Number(s2) : null;
      const numS3 = s3 !== '' ? Number(s3) : null;
      const numSas = sas !== '' ? Number(sas) : null;

      return await raporApi.submitRemedialSingle({
        siswa_id: item.siswa_id,
        kelas_id: item.kelas_id,
        mapel_id: item.mapel_id,
        tahun_pelajaran_id: item.tahun_pelajaran_id || tahunPelajaranId,
        semester_id: item.semester_id || semesterId,
        sumatif_1: numS1,
        sumatif_2: numS2,
        sumatif_3: numS3,
        sumatif_akhir: numSas,
        nilai_rapor_final: nilaiRaporFinal,
        catatan_remedial: catatan.trim(),
      });
    },
    onSuccess: () => {
      toast.success(`Nilai remedial ${item?.nama_siswa} berhasil diperbarui!`);
      queryClient.invalidateQueries({ queryKey: ['rapor-radar-remedial'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress-subtab'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-action-hub'] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai remedial');
    },
  });

  if (!item) return null;

  const renderStatusBadge = (valStr: string) => {
    if (valStr === '') {
      return (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
          <Clock size={10} /> Kosong
        </span>
      );
    }
    const val = Number(valStr);
    if (isNaN(val)) return null;
    if (val >= kkm) {
      return (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          <CheckCircle2 size={10} /> Tuntas
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
        <AlertCircle size={10} /> &lt; KKM
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-xl w-full"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              Bedah Nilai &amp; Remedial Siswa
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span>{item.nama_kelas} &bull; {item.nama_mapel}</span>
              {(item.tahun_pelajaran_nama || item.semester_nama) && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  TP {item.tahun_pelajaran_nama} &bull; Sem. {item.semester_nama}
                </span>
              )}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner Konteks Periode Akademik & Jaminan Isolasi Database */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Calendar size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Target: TP {item.tahun_pelajaran_nama || 'Terpilih'} &bull; Semester {item.semester_nama || 'Terpilih'}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Terkunci Presisi
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nilai yang disimpan terisolasi mutlak pada periode ini dan tidak akan menimpa semester aktif lainnya.
              </p>
            </div>
          </div>
        </div>

        {/* Identitas Siswa & Target KKM */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {item.nama_siswa}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              NIS: {item.nis || '-'} &bull; Kelas: {item.nama_kelas}
            </p>
          </div>
          <div className="text-right px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Target KKM</span>
            <span className="text-base font-black text-purple-600 dark:text-purple-400">{kkm}</span>
          </div>
        </div>

        {/* ─── Grid Rincian Nilai Sumatif (Persis seperti Lembar e-Rapor) ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Rincian Komponen Nilai Sumatif</span>
              <span className="text-[10px] font-normal text-slate-400">(Skala 0 - 100)</span>
            </label>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
              <Sparkles size={12} /> Edit nilai sumatif yang diremedial
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Sumatif 1 */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Sumatif 1</span>
                {renderStatusBadge(s1)}
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={s1}
                onChange={(e) => setS1(e.target.value)}
                placeholder="0-100"
                className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
              />
            </div>

            {/* Sumatif 2 */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Sumatif 2</span>
                {renderStatusBadge(s2)}
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={s2}
                onChange={(e) => setS2(e.target.value)}
                placeholder="0-100"
                className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
              />
            </div>

            {/* Sumatif 3 */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Sumatif 3</span>
                {renderStatusBadge(s3)}
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={s3}
                onChange={(e) => setS3(e.target.value)}
                placeholder="0-100"
                className="w-full text-base font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
              />
            </div>

            {/* Sumatif Akhir (SAS) */}
            <div className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Sum. Akhir (SAS)</span>
                {renderStatusBadge(sas)}
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={sas}
                onChange={(e) => setSas(e.target.value)}
                placeholder="0-100"
                className="w-full text-base font-bold text-purple-900 dark:text-purple-200 bg-transparent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ─── Bar Kalkulasi Otomatis Rata-rata & Nilai Rapor Final ─── */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          isTuntas 
            ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' 
            : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                Rata-rata Sumatif Harian: <strong className="text-slate-700 dark:text-slate-200">{rataSumatif !== null ? rataSumatif : '-'}</strong>
              </span>
              <span className="text-[10px] text-slate-400">
                Formula: (Rata2 Sumatif + Sumatif Akhir) / 2
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Kalkulasi Nilai Rapor</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className={`text-xl font-black ${isTuntas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {nilaiRaporFinal !== null ? nilaiRaporFinal : '-'}
                </span>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isTuntas 
                    ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
                    : 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                }`}>
                  {isTuntas ? (
                    <>
                      <CheckCircle2 size={11} /> Tuntas KKM
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> Masih &lt; KKM
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Catatan Remedial */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Catatan Perbaikan / Tindak Lanjut
          </label>
          <input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Tuntas remedial Sumatif 1 (50 ➔ 75)..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
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
            disabled={submitMutation.isPending || nilaiRaporFinal === null}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{submitMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan Nilai'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

RemedialQuickModal.displayName = 'RemedialQuickModal';
