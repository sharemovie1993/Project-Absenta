import React, { useState, useMemo } from 'react';
import {
  Award,
  Save,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
} from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import { toast } from 'react-hot-toast';
import type { SiswaBimbinganItem } from '../types';

export interface SiswaNilaiRow {
  penempatan_id: string;
  nama_siswa: string;
  nis: string;
  kelas: string;
  nama_mitra: string;
  nilai_sikap: number;
  nilai_teknis: number;
  nilai_kedisiplinan: number;
  nilai_laporan: number;
}

export interface PklPenilaianTabProps {
  siswaList: SiswaBimbinganItem[];
  onSaveNilaiBatch?: (scores: Array<{ id: string; nilai: any }>) => Promise<void>;
}

export const PklPenilaianTab: React.FC<PklPenilaianTabProps> = ({
  siswaList,
  onSaveNilaiBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize scoring table state
  const [scores, setScores] = useState<Record<string, { sikap: number; teknis: number; disiplin: number; laporan: number }>>(() => {
    const init: Record<string, { sikap: number; teknis: number; disiplin: number; laporan: number }> = {};
    siswaList.forEach((s) => {
      init[s.id] = {
        sikap: 85,
        teknis: 88,
        disiplin: 90,
        laporan: 85,
      };
    });
    return init;
  });

  const handleScoreChange = (id: string, field: 'sikap' | 'teknis' | 'disiplin' | 'laporan', value: number) => {
    const safeVal = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
    setScores((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { sikap: 85, teknis: 85, disiplin: 85, laporan: 85 }),
        [field]: safeVal,
      },
    }));
  };

  const handleBatchFill = (val: number) => {
    setScores((prev) => {
      const next = { ...prev };
      siswaList.forEach((s) => {
        next[s.id] = { sikap: val, teknis: val, disiplin: val, laporan: val };
      });
      return next;
    });
    toast.success(`Seluruh komponen nilai diatur ke ${val}`);
  };

  const calculateFinal = (id: string) => {
    const sc = scores[id] || { sikap: 0, teknis: 0, disiplin: 0, laporan: 0 };
    const total = sc.sikap * 0.2 + sc.teknis * 0.4 + sc.disiplin * 0.2 + sc.laporan * 0.2;
    const rounded = Math.round(total * 10) / 10;
    let predikat = 'D';
    if (rounded >= 90) predikat = 'A (Sangat Baik)';
    else if (rounded >= 80) predikat = 'B (Baik)';
    else if (rounded >= 70) predikat = 'C (Cukup)';
    return { score: rounded, predikat };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = siswaList.map((s) => {
        const fin = calculateFinal(s.id);
        return {
          id: s.id,
          nilai: {
            ...scores[s.id],
            nilai_akhir: fin.score,
            predikat: fin.predikat,
          },
        };
      });

      if (onSaveNilaiBatch) {
        await onSaveNilaiBatch(payload);
      }
      toast.success('Seluruh penilaian pembimbing PKL berhasil disimpan!');
    } catch {
      toast.error('Gagal menyimpan penilaian.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSiswa = siswaList.filter(
    (s) =>
      s.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Cari nama siswa atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchFill(85)}
                className="text-xs font-bold rounded-xl h-9"
              >
                Set Semua 85
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchFill(90)}
                className="text-xs font-bold rounded-xl h-9"
              >
                Set Semua 90
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || filteredSiswa.length === 0}
              className="text-xs font-bold rounded-xl h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
            >
              <Save size={15} />
              {isSaving ? 'Menyimpan...' : 'Simpan Seluruh Nilai'}
            </Button>
          </div>
        </div>
      </div>

      {/* Nilai Scoring Grid */}
      {filteredSiswa.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Award className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Siswa Bimbingan
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Daftar siswa bimbingan PKL Anda akan otomatis tampil di sini saat masa magang aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSiswa.map((siswa) => {
            const sc = scores[siswa.id] || { sikap: 85, teknis: 85, disiplin: 85, laporan: 85 };
            const final = calculateFinal(siswa.id);

            return (
              <div
                key={siswa.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {siswa.nama_siswa}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {siswa.nis}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {siswa.kelas}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Mitra: <span className="font-bold text-indigo-600 dark:text-indigo-400">{siswa.nama_mitra}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Skor Akhir
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {final.score}
                      </span>
                    </div>
                    <Badge variant="success" className="text-xs font-bold">
                      {final.predikat}
                    </Badge>
                  </div>
                </div>

                {/* 4 Komponen Nilai Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Sikap (20%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sc.sikap}
                      onChange={(e) => handleScoreChange(siswa.id, 'sikap', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold text-center h-9 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Teknis (40%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sc.teknis}
                      onChange={(e) => handleScoreChange(siswa.id, 'teknis', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold text-center h-9 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Kedisiplinan (20%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sc.disiplin}
                      onChange={(e) => handleScoreChange(siswa.id, 'disiplin', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold text-center h-9 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Laporan PKL (20%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sc.laporan}
                      onChange={(e) => handleScoreChange(siswa.id, 'laporan', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold text-center h-9 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
