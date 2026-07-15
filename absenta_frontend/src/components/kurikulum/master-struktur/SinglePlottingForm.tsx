import React from 'react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import type { Mapel } from '../../../types/academic';

import { StrukturKurikulum } from '../../../utils/kurikulum/masterStrukturHelper';

interface SinglePlottingFormProps {
  editingItem: StrukturKurikulum | null;
  addMode: 'manual' | 'massal';
  formData: {
    mapel_id: string;
    jp_per_minggu: number;
    kelompok: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<{
    mapel_id: string;
    jp_per_minggu: number;
    kelompok: string;
  }>>;
  unmappedSubjects: Mapel[];
  subjects: any;
  kelompokOptions: { value: string; label: string }[];
  selectedTingkat: number;
  detectDefaultJpForMapel: (kodeMapel: string, namaMapel: string, tingkat: number) => number;
}

export const SinglePlottingForm: React.FC<SinglePlottingFormProps> = ({
  editingItem,
  formData,
  handleInputChange,
  setFormData,
  unmappedSubjects,
  subjects,
  kelompokOptions,
  selectedTingkat,
  detectDefaultJpForMapel
}) => {
  const renderJpCalculator = (jp: number, mapelName: string, mapelKode: string) => {
    const weeks = selectedTingkat === 12 ? 32 : 36;
    const annualIntra = jp * weeks;
    const recommendedJp = detectDefaultJpForMapel(mapelKode, mapelName, selectedTingkat);
    const recommendedAnnual = recommendedJp * weeks;
    
    let statusColor = "text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40";
    let statusText = "Sesuai Standar Permendikbud 12/2024";
    
    if (jp > recommendedJp) {
      statusColor = "text-violet-650 dark:text-violet-450 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40";
      statusText = `Otonomi Sekolah (+${jp - recommendedJp} JP/Minggu)`;
    } else if (jp < recommendedJp) {
      statusColor = "text-amber-650 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40";
      statusText = `Di bawah Standar Permendikbud (-${recommendedJp - jp} JP/Minggu)`;
    }
    
    return (
      <div className="mt-2.5 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5 text-left text-xs font-medium">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Kalkulator JP Tahunan</span>
          <span className={`text-[9px] font-black tracking-wider uppercase border px-2 py-0.5 rounded-lg select-none ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-[9px] uppercase tracking-wider">Intrakurikuler / Tahun</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{annualIntra} <span className="text-[10px] font-bold text-gray-400">JP / Tahun</span></p>
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-[9px] uppercase tracking-wider">Standar Kementerian</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{recommendedAnnual} <span className="text-[10px] font-bold text-gray-400">JP / Tahun</span></p>
          </div>
        </div>
      </div>
    );
  };

  const selMapelForJp = subjects?.data?.find((s: Mapel) => s.id === formData.mapel_id);

  return (
    <div className="space-y-4 p-1">
      {editingItem ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="jp_per_minggu" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Jam Pelajaran Per Minggu (JP)</label>
            <input 
              type="number" 
              id="jp_per_minggu"
              name="jp_per_minggu"
              value={formData.jp_per_minggu}
              onChange={handleInputChange}
              min={1}
              max={40}
              required
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {renderJpCalculator(Number(formData.jp_per_minggu || 0), editingItem?.Mapel?.nama_mapel || '', editingItem?.Mapel?.kode_mapel || '')}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="kelompok" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kelompok Mata Pelajaran</label>
            <select 
              id="kelompok"
              name="kelompok"
              value={formData.kelompok}
              onChange={handleInputChange}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              {kelompokOptions?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="mapel_id" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pilih Mata Pelajaran</label>
            <SearchableSelect 
              id="mapel_id"
              value={formData.mapel_id}
              onValueChange={(val) => {
                setFormData(prev => ({ ...prev, mapel_id: val }));
              }}
              options={unmappedSubjects.map(s => ({
                value: s.id,
                label: `${s.nama_mapel} (${s.kode_mapel || ''})`
              }))}
              placeholder="Pilih mata pelajaran yang belum di-plot..."
              className="w-full animate-in fade-in duration-200"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="jp_per_minggu" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Jam Pelajaran Per Minggu (JP)</label>
            <input 
              type="number" 
              id="jp_per_minggu"
              name="jp_per_minggu"
              value={formData.jp_per_minggu}
              onChange={handleInputChange}
              min={1}
              max={40}
              required
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {selMapelForJp && renderJpCalculator(Number(formData.jp_per_minggu || 0), selMapelForJp.nama_mapel || '', selMapelForJp.kode_mapel || '')}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="kelompok" className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Kelompok Mata Pelajaran</label>
            <select 
              id="kelompok"
              name="kelompok"
              value={formData.kelompok}
              onChange={handleInputChange}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              {kelompokOptions?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
export default SinglePlottingForm;
