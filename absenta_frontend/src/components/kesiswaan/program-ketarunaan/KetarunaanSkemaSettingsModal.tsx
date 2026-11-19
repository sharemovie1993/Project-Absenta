import React, { useState, useEffect } from 'react';
import { Sliders, Info, Shield, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { KetarunaanSkema } from '@/api/kesiswaan/programKetarunaan.api';

export interface KetarunaanSkemaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skema: KetarunaanSkema | null;
  onSave: (payload: KetarunaanSkema) => Promise<void>;
  isSaving: boolean;
  tahunPelajaranId: string;
  semesterId?: string | null;
  jurusanId?: string | null;
  jurusanNama?: string;
}

export const KetarunaanSkemaSettingsModal: React.FC<KetarunaanSkemaSettingsModalProps> = ({
  isOpen,
  onClose,
  skema,
  onSave,
  isSaving,
  tahunPelajaranId,
  semesterId,
  jurusanId,
  jurusanNama,
}) => {
  const [mode, setMode] = useState<'FULL_TARUNA' | 'SEMI_TARUNA'>('SEMI_TARUNA');
  const [bobotSamapta, setBobotSamapta] = useState(25);
  const [bobotPbb, setBobotPbb] = useState(20);
  const [bobotDisiplin, setBobotDisiplin] = useState(30);
  const [bobotMental, setBobotMental] = useState(25);

  useEffect(() => {
    if (skema) {
      setMode(skema.mode_pelatihan || 'SEMI_TARUNA');
      setBobotSamapta(skema.bobot_samapta ?? 25);
      setBobotPbb(skema.bobot_pbb ?? 20);
      setBobotDisiplin(skema.bobot_disiplin ?? 30);
      setBobotMental(skema.bobot_mental ?? 25);
    }
  }, [skema]);

  if (!isOpen) return null;

  const totalBobot = bobotSamapta + bobotPbb + bobotDisiplin + bobotMental;
  const isBobotValid = totalBobot === 100;

  const applyPreset = (presetMode: 'FULL_TARUNA' | 'SEMI_TARUNA') => {
    setMode(presetMode);
    if (presetMode === 'FULL_TARUNA') {
      setBobotSamapta(40);
      setBobotPbb(30);
      setBobotDisiplin(15);
      setBobotMental(15);
    } else {
      setBobotSamapta(25);
      setBobotPbb(20);
      setBobotDisiplin(30);
      setBobotMental(25);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBobotValid) return;

    await onSave({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId || null,
      jurusan_id: jurusanId || null,
      mode_pelatihan: mode,
      bobot_samapta: bobotSamapta,
      bobot_pbb: bobotPbb,
      bobot_disiplin: bobotDisiplin,
      bobot_mental: bobotMental,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                Skema &amp; Bobot Penilaian Ketarunaan
              </h3>
              <p className="text-[11px] text-slate-400">
                {jurusanNama ? `Khusus Jurusan: ${jurusanNama}` : 'Berlaku Global Sekolah'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* 1. Pemilihan Mode Pelatihan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Karakteristik Mode Pelatihan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => applyPreset('SEMI_TARUNA')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'SEMI_TARUNA'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-xs">Semi Ketarunaan</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fokus karakter kerja industri, 5R/5S, kedisiplinan apel &amp; kebugaran berkala.
                </p>
              </div>

              <div
                onClick={() => applyPreset('FULL_TARUNA')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  mode === 'FULL_TARUNA'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-xs">Murni Ketarunaan</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fokus fisik militer/kedinasan (Samapta A&amp;B intensif, PBB defile, hierarki korsa).
                </p>
              </div>
            </div>
          </div>

          {/* 2. Slider 4 Pilar Bobot */}
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Distribusi Persentase Bobot (Wajib 100%)
              </span>
              <span
                className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full ${
                  isBobotValid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                Total: {totalBobot}%
              </span>
            </div>

            {/* Aspek 1: Kesamaptaan Jasmani */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">1. Kesamaptaan Jasmani (Fisik)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bobotSamapta}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bobotSamapta}
                onChange={(e) => setBobotSamapta(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Lari 12 menit, push-up, sit-up, pull-up, shuttle run.</p>
            </div>

            {/* Aspek 2: PBB & Tata Upacara */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">2. PBB &amp; Tata Upacara Lapangan</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bobotPbb}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bobotPbb}
                onChange={(e) => setBobotPbb(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">PBB di tempat, langkah tegap, danton, ketertiban apel.</p>
            </div>

            {/* Aspek 3: Kedisiplinan & Atribut */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">3. Kedisiplinan &amp; Atribut Seragam</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bobotDisiplin}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bobotDisiplin}
                onChange={(e) => setBobotDisiplin(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Kelengkapan atribut, potongan rambut, presensi, tata tertib.</p>
            </div>

            {/* Aspek 4: Karakter & Mental Kerja */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">4. Karakter, Sikap &amp; Budaya Kerja</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bobotMental}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bobotMental}
                onChange={(e) => setBobotMental(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Respek hierarki, budaya 5S/5R, jiwa korsa, integritas.</p>
            </div>
          </div>

          {!isBobotValid && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>Jumlah bobot harus tepat 100% untuk dapat disimpan (selisih: {100 - totalBobot}%).</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={!isBobotValid || isSaving}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Skema Penilaian'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
