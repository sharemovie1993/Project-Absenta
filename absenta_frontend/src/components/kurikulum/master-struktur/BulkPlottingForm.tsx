import React from 'react';
import { Search, BookOpen, Trash2 } from 'lucide-react';
import type { Mapel } from '../../../types/academic';

import { StrukturKurikulum } from '../../../utils/kurikulum/masterStrukturHelper';

interface BulkPlottingFormProps {
  bulkSearchQuery: string;
  setBulkSearchQuery: (val: string) => void;
  bulkSelections: Record<string, { jp_per_minggu: number; kelompok: string }>;
  setBulkSelections: React.Dispatch<React.SetStateAction<Record<string, { jp_per_minggu: number; kelompok: string }>>>;
  subjects: any;
  mappingFiltered: StrukturKurikulum[];
  selectedTingkat: number;
  isMapelBelongsToOtherJurusan: (s: Mapel) => boolean;
  detectKelompokForMapel: (kode: string, nama: string) => string;
  detectDefaultJpForMapel: (kode: string, nama: string, tingkat: number) => number;
  presetSisaCount: { UMUM: number; KEJURUAN: number; MULOK: number; PILIHAN: number };
  handleAddPreset: (type: 'UMUM' | 'KEJURUAN' | 'MULOK' | 'PILIHAN') => void;
  kelompokOptions: { value: string; label: string }[];
}

export const BulkPlottingForm: React.FC<BulkPlottingFormProps> = ({
  bulkSearchQuery,
  setBulkSearchQuery,
  bulkSelections,
  setBulkSelections,
  subjects,
  mappingFiltered,
  selectedTingkat,
  isMapelBelongsToOtherJurusan,
  detectKelompokForMapel,
  detectDefaultJpForMapel,
  presetSisaCount,
  handleAddPreset,
  kelompokOptions
}) => {
  const renderJpCalculator = (jp: number, mapelName: string, mapelKode: string) => {
    const weeks = selectedTingkat === 12 ? 32 : 36;
    const annualIntra = jp * weeks;
    const recommendedJp = detectDefaultJpForMapel(mapelKode, mapelName, selectedTingkat);
    const recommendedAnnual = recommendedJp * weeks;
    
    let statusColor = "text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40";
    let statusText = "Sesuai Standar Permendikbud 12/2024";
    
    if (jp > recommendedJp) {
      statusColor = "text-violet-650 dark:text-violet-455 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40";
      statusText = `Otonomi Sekolah (+${jp - recommendedJp} JP/Minggu)`;
    } else if (jp < recommendedJp) {
      statusColor = "text-amber-650 dark:text-amber-455 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40";
      statusText = `Di bawah Standar Permendikbud (-${recommendedJp - jp} JP/Minggu)`;
    }
    
    return (
      <div className="mt-1 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1 text-left text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Kalkulator JP</span>
          <span className={`text-[8px] font-black tracking-wider uppercase border px-1.5 py-0.5 rounded ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="flex gap-4">
          <p className="text-gray-500">Intra/Thn: <strong className="text-slate-700 dark:text-slate-350">{annualIntra} JP</strong></p>
          <p className="text-gray-550">Standar: <strong className="text-slate-700 dark:text-slate-350">{recommendedAnnual} JP</strong></p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
      {/* Panel Kiri: Pemilihan Mapel (Col 5) */}
      <div className="lg:col-span-5 border-r border-slate-100 dark:border-slate-800 pr-6 flex flex-col space-y-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pencarian Mapel</span>
          <div className="relative">
            <input
              type="text"
              value={bulkSearchQuery}
              onChange={(e) => setBulkSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
          </div>
        </div>

        {/* Presets Button Shortcuts */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Paket Cepat (Presets)</span>
          <div className="flex flex-wrap gap-2 items-center">
            {presetSisaCount.UMUM === 0 ? (
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none animate-in fade-in duration-200">
                ✓ Paket Umum Selesai
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleAddPreset('UMUM')}
                className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                + Paket Umum ({presetSisaCount.UMUM})
              </button>
            )}

            {presetSisaCount.KEJURUAN === 0 ? (
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none animate-in fade-in duration-200">
                ✓ Paket Kejuruan Selesai
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleAddPreset('KEJURUAN')}
                className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                + Paket Kejuruan ({presetSisaCount.KEJURUAN})
              </button>
            )}

            {presetSisaCount.MULOK === 0 ? (
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none animate-in fade-in duration-200">
                ✓ Paket Mulok Selesai
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleAddPreset('MULOK')}
                className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                + Paket Mulok ({presetSisaCount.MULOK})
              </button>
            )}

            {presetSisaCount.PILIHAN === 0 ? (
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 rounded-lg font-black border border-emerald-200 dark:border-emerald-900 shadow-sm cursor-default select-none animate-in fade-in duration-200">
                ✓ Paket Pilihan Selesai
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleAddPreset('PILIHAN')}
                className="text-[10px] bg-slate-150 dark:bg-slate-800 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/20 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                + Paket Pilihan ({presetSisaCount.PILIHAN})
              </button>
            )}

            <button
              type="button"
              onClick={() => setBulkSelections({})}
              className="text-[10px] text-red-500 hover:underline px-2 py-1.5 font-bold ml-auto"
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* Mapel List Checkboxes */}
        <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
          {subjects?.data?.filter((s: Mapel) => {
            const kode = (s.kode_mapel || '').toUpperCase();
            const nama = (s.nama_mapel || '').toLowerCase();
            
            // 1. Text Search Filter
            const matchesSearch = nama.includes(bulkSearchQuery.toLowerCase()) || 
                                  kode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
            if (!matchesSearch) return false;
            
            // 3. Sembunyikan mapel yang sudah di-ploting sebelumnya di tingkat kelas ini
            const alreadyMapped = mappingFiltered?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
            if (alreadyMapped) return false;
            
            if (isMapelBelongsToOtherJurusan(s)) return false;
            
            const isDasar = kode.includes('DAS-') || nama.includes('dasar-dasar') || nama.includes('dasar dasar');
            const isPkl = kode.includes('PKL') || nama.includes('praktik kerja lapangan') || nama.includes('praktek kerja lapangan') || nama.includes('pkl');
            const isPkk = kode.includes('PKK') || nama.includes('projek kreatif') || nama.includes('project kreatif') || nama.includes('pkk');
            const isKoding = nama.includes('koding') || nama.includes('coding') || nama.includes('pemrograman dasar') || nama.includes('programming');
            const isMulok = kode.startsWith('M-') || 
                             nama.includes('bahasa sunda') || 
                             nama.includes('bahasa jawa') || 
                             nama.includes('bahasa bali') || 
                             nama.includes('bahasa madura') || 
                             nama.includes('muatan lokal') || 
                             nama.includes('plh') || 
                             nama.includes('kesenian daerah') ||
                             nama.includes('kepariwisataan') ||
                             nama.includes('sunda');
            
            const isKk = kode === 'KK' || kode.startsWith('KK-') || nama.includes('konsentrasi keahlian');
            
            // 2. Smart Filter Relevansi Tingkat
            if (selectedTingkat === 10) {
              if (isPkl || isPkk || isKk) return false;
              const kejuruanSuffixes = ['-RPL', '-TKJ', '-AKL', '-MPLB', '-DKV', '-TBSM', '-TKR', '-TP', '-PH', '-KL', '-TB', '-TAV', '-TOI'];
              const isProduktifLanjut = kejuruanSuffixes.some(suffix => kode.includes(suffix)) && !isDasar && !isPkl && !isPkk && !isKoding;
              if (isProduktifLanjut) return false;
            } else if (selectedTingkat === 11) {
              if (isDasar || isPkl || isKoding || isMulok) return false;
            } else {
              if (isDasar || isKoding || isMulok) return false;
            }
            
            return true;
          }).map((s: Mapel) => {
            const isChecked = !!bulkSelections[s.id];
            return (
              <div 
                key={s.id}
                onClick={() => {
                  const copy = { ...bulkSelections };
                  if (isChecked) {
                    delete copy[s.id];
                  } else {
                    copy[s.id] = {
                      jp_per_minggu: detectDefaultJpForMapel(s.kode_mapel || '', s.nama_mapel, selectedTingkat),
                      kelompok: detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel)
                    };
                  }
                  setBulkSelections(copy);
                }}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isChecked 
                  ? 'bg-indigo-50/20 border-indigo-500 dark:bg-indigo-950/10' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent div click
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.nama_mapel}</p>
                  <span className="text-[9px] text-slate-400 font-mono font-bold">{s.kode_mapel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Kanan: Setting JP & Kelompok Massal (Col 7) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mapel Terpilih ({Object.keys(bulkSelections).length})</span>
          {Object.keys(bulkSelections).length > 0 && (
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black px-2.5 py-1 rounded-lg animate-in fade-in duration-200">
              Total JP: {Object.values(bulkSelections).reduce((sum, item) => sum + Number(item.jp_per_minggu), 0)} JP
            </span>
          )}
        </div>

        {/* Selected Mapels Table List */}
        <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-3">
          {Object.keys(bulkSelections).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 space-y-2">
              <BookOpen size={36} />
              <p className="text-xs font-bold">Pilih mata pelajaran di panel kiri untuk mulai plotting</p>
            </div>
          ) : (
            Object.entries(bulkSelections).map(([id, config]) => {
              const mapelObj = subjects?.data?.find((s: Mapel) => s.id === id);
              if (!mapelObj) return null;
              
              return (
                <div key={id} className="flex flex-col gap-2.5 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-250">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{mapelObj.nama_mapel}</p>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{mapelObj.kode_mapel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* JP Input */}
                      <div className="w-20">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={config.jp_per_minggu}
                          onChange={(e) => {
                            const copy = { ...bulkSelections };
                            copy[id] = { ...copy[id], jp_per_minggu: Number(e.target.value) };
                            setBulkSelections(copy);
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-center text-xs font-black text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {/* Kelompok select */}
                      <div className="w-44">
                        <select
                          value={config.kelompok}
                          onChange={(e) => {
                            const copy = { ...bulkSelections };
                            copy[id] = { ...copy[id], kelompok: e.target.value };
                            setBulkSelections(copy);
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-xs font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          {kelompokOptions?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      {/* Delete item button */}
                      <button
                        type="button"
                        onClick={() => {
                          const copy = { ...bulkSelections };
                          delete copy[id];
                          setBulkSelections(copy);
                        }}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {/* JP calculator */}
                  {renderJpCalculator(Number(config.jp_per_minggu || 0), mapelObj.nama_mapel, mapelObj.kode_mapel)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default BulkPlottingForm;
