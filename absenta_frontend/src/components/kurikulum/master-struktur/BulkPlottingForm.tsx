import React, { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, Trash2, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react';
import type { Mapel } from '../../../types/academic';
import { Button } from '../../ui/Button';
import { StrukturKurikulum, isMapelRelevantForTingkat, getSubjectSortRank, checkMapelHasStandard } from '../../../utils/kurikulum/masterStrukturHelper';

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
  jenjang: string;
  kurikulum: string;
  isPendingSave?: boolean;
  onClose?: () => void;
  targetJp?: number;
  standardReferences?: any;
}

interface Step {
  id: 'umum' | 'kejuruan' | 'mulok' | 'pilihan' | 'summary';
  label: string;
  kelompok: string;
  presetType?: 'UMUM' | 'KEJURUAN' | 'MULOK' | 'PILIHAN';
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
  kelompokOptions,
  jenjang,
  kurikulum,
  isPendingSave,
  onClose,
  targetJp = 40,
  standardReferences
}) => {
  const isSmkOrMak = jenjang === 'SMK' || jenjang === 'MAK';
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);

  // Define steps dynamically based on jenjang
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      { id: 'umum', label: 'Mapel Umum', kelompok: 'MATA PELAJARAN UMUM', presetType: 'UMUM' }
    ];
    if (jenjang === 'SMK' || jenjang === 'MAK') {
      list.push({ id: 'kejuruan', label: 'Mapel Kejuruan', kelompok: 'MATA PELAJARAN KEJURUAN', presetType: 'KEJURUAN' });
    }
    list.push({ id: 'mulok', label: 'Muatan Lokal', kelompok: 'MUATAN LOKAL', presetType: 'MULOK' });
    list.push({ id: 'pilihan', label: 'Mapel Pilihan', kelompok: 'MATA PELAJARAN PILIHAN', presetType: 'PILIHAN' });
    list.push({ id: 'summary', label: 'Ringkasan', kelompok: 'SUMMARY' });
    return list;
  }, [jenjang]);

  // Prevent accidental double-click form submission when entering the summary step
  useEffect(() => {
    if (activeStepIndex === steps.length - 1) {
      setCanSubmit(false);
      const timer = setTimeout(() => {
        setCanSubmit(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setCanSubmit(false);
    }
  }, [activeStepIndex, steps.length]);

  // JP Projected calculation
  const existingMappedJp = useMemo(() => {
    if (!mappingFiltered) return 0;
    return mappingFiltered.reduce((sum, item) => {
      if (bulkSelections[item.mapel_id]) {
        return sum;
      }
      return sum + item.jp_per_minggu;
    }, 0);
  }, [mappingFiltered, bulkSelections]);

  const bulkSelectedJp = useMemo(() => {
    return Object.values(bulkSelections).reduce((sum, item) => sum + Number(item.jp_per_minggu || 0), 0);
  }, [bulkSelections]);

  const projectedTotalJp = existingMappedJp + bulkSelectedJp;
  const projectedGap = targetJp - projectedTotalJp;

  const currentStep = steps[activeStepIndex];

  // Helper to check if a step is completed (has at least 1 selection, or doesn't have any preset left)
  const isStepCompleted = (step: Step) => {
    if (step.id === 'summary') return false;
    const selectedCount = Object.values(bulkSelections).filter(s => s.kelompok === step.kelompok).length;
    return selectedCount > 0;
  };

  const handleNext = () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
    }
  };

  const renderJpCalculator = (jp: number, mapelName: string, mapelKode: string) => {
    const weeks = selectedTingkat === 12 ? 32 : 36;
    const annualIntra = jp * weeks;
    const recommendedJp = detectDefaultJpForMapel(mapelKode, mapelName, selectedTingkat);
    const recommendedAnnual = recommendedJp * weeks;
    
    let statusColor = "text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40";
    let statusText = "Sesuai Standar Kemendikbud";
    
    if (jp > recommendedJp) {
      statusColor = "text-violet-650 dark:text-violet-455 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40";
      statusText = `Otonomi (+${jp - recommendedJp} JP)`;
    } else if (jp < recommendedJp) {
      statusColor = "text-amber-650 dark:text-amber-455 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40";
      statusText = `Di bawah Standar (-${recommendedJp - jp} JP)`;
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
          <p className="text-gray-500 font-bold">Intra/Thn: <strong className="text-slate-700 dark:text-slate-350">{annualIntra} JP</strong></p>
          <p className="text-gray-500 font-bold">Standar: <strong className="text-slate-700 dark:text-slate-350">{recommendedAnnual} JP</strong></p>
        </div>
      </div>
    );
  };

  // Filter subjects for the current step
  const filteredSubjects = useMemo(() => {
    if (!subjects?.data) return [];
    return subjects.data.filter((s: Mapel) => {
      const kode = (s.kode_mapel || '').toUpperCase();
      const nama = (s.nama_mapel || '').toLowerCase();
      
      // 1. Text Search Filter
      const matchesSearch = nama.includes(bulkSearchQuery.toLowerCase()) || 
                            kode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      // 2. Hide already mapped structure items
      const alreadyMapped = mappingFiltered?.some((m: StrukturKurikulum) => m.mapel_id === s.id);
      if (alreadyMapped) return false;
      
      // 3. Hide other majors' specific subjects (SMK)
      if (isMapelBelongsToOtherJurusan(s)) return false;
      
      // 4. Respect active curriculum
      if (kurikulum === 'K13') {
        const isSeniPilihan = ['SENI_MUSIK', 'SENI_RUPA', 'SENI_TARI', 'SENI_TEATER'].includes(kode) ||
          ['seni musik', 'seni rupa', 'seni tari', 'seni teater'].some(t => nama.includes(t));
        if (isSeniPilihan) return false;
      } else if (kurikulum === 'MERDEKA') {
        if (jenjang !== 'SMK' && jenjang !== 'MAK') {
          const isGeneralSeniBudaya = kode === 'SENI' || nama === 'seni budaya';
          if (isGeneralSeniBudaya) return false;
        }
      }

      // 5. Respect tingkat/level relevance using the shared helper
      if (!isMapelRelevantForTingkat(s, selectedTingkat, jenjang === 'SMK' || jenjang === 'MAK', isMapelBelongsToOtherJurusan)) {
        return false;
      }

      // 6. Must belong to the current step's kelompok category
      const subjectKelompok = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
      return subjectKelompok === currentStep.kelompok;
    });
  }, [subjects?.data, currentStep, bulkSearchQuery, mappingFiltered, isMapelBelongsToOtherJurusan, kurikulum, jenjang, selectedTingkat]);

  // Selected subjects in the current step
  const selectedSubjectsInCurrentStep = useMemo(() => {
    return Object.entries(bulkSelections).filter(([_, config]) => config.kelompok === currentStep.kelompok);
  }, [bulkSelections, currentStep]);

  // Grouped selections for summary step
  const groupedSelections = useMemo(() => {
    const groups: Record<string, Array<[string, { jp_per_minggu: number; kelompok: string }]>> = {
      'MATA PELAJARAN UMUM': [],
      'MATA PELAJARAN KEJURUAN': [],
      'MUATAN LOKAL': [],
      'MATA PELAJARAN PILIHAN': [],
    };

    Object.entries(bulkSelections).forEach(([id, config]) => {
      const kelompok = config.kelompok;
      if (!groups[kelompok]) {
        groups[kelompok] = [];
      }
      groups[kelompok].push([id, config]);
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, [bulkSelections]);

  return (
    <div className="flex flex-col space-y-6 min-h-[500px]">
      {/* Step Indicators */}
      <div className="relative flex justify-between items-center w-full max-w-4xl mx-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const isCompleted = idx < activeStepIndex || isStepCompleted(step);
          
          return (
            <React.Fragment key={step.id}>
              {/* Connector line between steps */}
              {idx > 0 && (
                <div 
                  className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                    idx <= activeStepIndex ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
              
              {/* Step circle */}
              <button
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className="flex items-center gap-2 focus:outline-none group relative"
              >
                <div 
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none scale-105' 
                      : isCompleted 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-300 dark:border-emerald-900' 
                        : 'bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-850 hover:border-slate-350'
                  }`}
                >
                  {isCompleted && step.id !== 'summary' ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span 
                  className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${
                    isActive 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : isCompleted 
                        ? 'text-emerald-600 dark:text-emerald-450' 
                        : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {currentStep.id === 'summary' ? (
        /* Ringkasan Step Layout */
        <div className="flex-1 space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Warning Banner - Verifikasi */}
            <div className="md:col-span-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">⚠️</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">Verifikasi Plotting Beban Belajar</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 select-none">
                      {jenjang}
                    </span>
                    <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 select-none">
                      Kelas {selectedTingkat}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                  Periksa kembali alokasi JP sebelum disimpan. Jika sudah sesuai, klik <strong className="text-amber-900 dark:text-amber-300">SIMPAN PEMETAAN</strong> di pojok kanan bawah.
                </p>
              </div>
            </div>
            
            <div className="md:col-span-4 flex">
              {projectedGap > 0 ? (
                <div className="w-full bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider">Kurang {projectedGap} JP</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 leading-normal">
                      Beban belajar saat ini (<strong>{projectedTotalJp} JP</strong>) masih berada di bawah target standar kementerian (<strong>{targetJp} JP</strong>).
                    </p>
                  </div>
                </div>
              ) : projectedGap === 0 ? (
                <div className="w-full bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-450 tracking-wider">Sesuai Regulasi</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 leading-normal">
                      Total beban belajar telah pas dan memenuhi target standar nasional (<strong>{targetJp} JP</strong>).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200 dark:border-indigo-900/50 p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-400 tracking-wider">Otonomi (+{Math.abs(projectedGap)} JP)</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 leading-normal">
                      Beban belajar saat ini (<strong>{projectedTotalJp} JP</strong>) melampaui standar kementerian (<strong>{targetJp} JP</strong>) sebagai jam pelajaran tambahan.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
            <div className="max-h-[250px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800">
                    <th className="p-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mata Pelajaran</th>
                    <th className="p-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kelompok</th>
                    <th className="p-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Alokasi JP</th>
                    <th className="p-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Kesesuaian</th>
                    <th className="p-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kalkulasi Tahunan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {groupedSelections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-600 font-bold text-xs">
                        Belum ada mata pelajaran yang terpilih untuk di-plot.
                      </td>
                    </tr>
                  ) : (
                    groupedSelections.map(([kelompok, list]) => {
                      const sortedList = [...list].sort((a, b) => {
                        const sA = subjects?.data?.find((s: Mapel) => s.id === a[0]);
                        const sB = subjects?.data?.find((s: Mapel) => s.id === b[0]);
                        
                        const rankA = getSubjectSortRank({ Mapel: sA, kelompok });
                        const rankB = getSubjectSortRank({ Mapel: sB, kelompok });
                        
                        if (rankA !== rankB) return rankA - rankB;
                        return (sA?.nama_mapel || '').localeCompare(sB?.nama_mapel || '');
                      });

                      const totalJpKelompok = list.reduce((sum, [_, config]) => sum + Number(config.jp_per_minggu), 0);

                      let badgeClass = '';
                      if (kelompok === 'MATA PELAJARAN UMUM') {
                        badgeClass = 'bg-blue-100 text-blue-850 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30';
                      } else if (kelompok === 'MATA PELAJARAN KEJURUAN') {
                        badgeClass = 'bg-purple-100 text-purple-850 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/30';
                      } else if (kelompok === 'MUATAN LOKAL') {
                        badgeClass = 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/30';
                      } else {
                        badgeClass = 'bg-indigo-100 text-indigo-850 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30';
                      }

                      return (
                        <React.Fragment key={kelompok}>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-t border-slate-100 dark:border-slate-850">
                            <td colSpan={5} className="px-4 py-2">
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${badgeClass}`}>
                                  {kelompok}
                                </span>
                                <span className="text-[9px] text-slate-500 font-black uppercase">
                                  Subtotal: {totalJpKelompok} JP / Minggu
                                </span>
                              </div>
                            </td>
                          </tr>
                          {sortedList.map(([id, config]) => {
                            const mapel = subjects?.data?.find((s: Mapel) => s.id === id);
                            if (!mapel) return null;
                            
                            const weeks = selectedTingkat === 12 ? 32 : 36;

                            // Kesesuaian compliance logic
                            const recommendedJp = detectDefaultJpForMapel(mapel.kode_mapel || '', mapel.nama_mapel, selectedTingkat);
                            const hasStd = checkMapelHasStandard(mapel, selectedTingkat, standardReferences?.data || [], isSmkOrMak, config.kelompok);
                            
                            let kesesuaianBadge: React.ReactNode;
                            if (!hasStd) {
                              kesesuaianBadge = (
                                <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Tidak diatur dalam standar nasional kelas ini">
                                  Otonomi Sekolah
                                </span>
                              );
                            } else if (config.jp_per_minggu === recommendedJp) {
                              kesesuaianBadge = (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                                  ✓ Sesuai Standar
                                </span>
                              );
                            } else if (config.jp_per_minggu < recommendedJp) {
                              kesesuaianBadge = (
                                <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40" title={`Standar kementerian: ${recommendedJp} JP`}>
                                  ⚠ Harusnya {recommendedJp} JP
                                </span>
                              );
                            } else {
                              kesesuaianBadge = (
                                <span className="inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-900/40" title={`Standar kementerian: ${recommendedJp} JP`}>
                                  Otonomi +{config.jp_per_minggu - recommendedJp} JP
                                </span>
                              );
                            }

                            return (
                              <tr key={id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/25 transition-colors">
                                <td className="p-3 pl-6">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{mapel.nama_mapel}</p>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">{mapel.kode_mapel}</span>
                                </td>
                                <td className="p-3">
                                  <span className="text-[9px] text-slate-450 dark:text-slate-400 font-bold uppercase">
                                    {config.kelompok.replace('MATA PELAJARAN ', '')}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      max={50}
                                      value={config.jp_per_minggu}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const val = Math.max(1, Number(e.target.value));
                                        setBulkSelections(prev => ({
                                          ...prev,
                                          [id]: { ...prev[id], jp_per_minggu: val }
                                        }));
                                      }}
                                      className="w-14 text-center text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                                      title="Klik untuk mengubah alokasi JP"
                                    />
                                    <span className="text-[9px] font-bold text-slate-400">JP</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  {kesesuaianBadge}
                                </td>
                                <td className="p-3 text-xs text-slate-500 font-bold">
                                  {config.jp_per_minggu * weeks} JP / Tahun ({weeks} Minggu)
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs font-black">
              <span className="text-slate-500 uppercase">Ringkasan Beban Belajar:</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 dark:text-slate-550 font-bold uppercase">
                  Proyeksi Total: {projectedTotalJp} / {targetJp} JP
                </span>
                {projectedGap > 0 ? (
                  <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    Kurang {projectedGap} JP
                  </span>
                ) : projectedGap === 0 ? (
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    Pas Regulasi
                  </span>
                ) : (
                  <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    Otonomi (+{Math.abs(projectedGap)} JP)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Wizard Step Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[330px] animate-in fade-in duration-200">
          {/* Panel Kiri: Pemilihan Mapel (Col 5) */}
          <div className="lg:col-span-5 border-r border-slate-100 dark:border-slate-800/80 pr-6 flex flex-col space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cari Mata Pelajaran</span>
              <div className="relative">
                <input
                  type="text"
                  value={bulkSearchQuery}
                  onChange={(e) => setBulkSearchQuery(e.target.value)}
                  placeholder={`Cari mapel ${currentStep.label.toLowerCase()}...`}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={14} />
                </div>
              </div>
            </div>

            {/* Presets Button Contextual Shortcut */}
            {currentStep.presetType && presetSisaCount[currentStep.presetType] > 0 && (
              <div className="bg-indigo-50/30 dark:bg-slate-900 p-3 rounded-2xl border border-indigo-100/50 dark:border-slate-800/80 flex items-center justify-between gap-3 animate-in slide-in-from-top-1 duration-200">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300">Tersedia Preset Baku</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Plot cepat semua mapel {currentStep.label.toLowerCase()} standar Kemendikbud.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddPreset(currentStep.presetType!)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-3 py-1.5 rounded-lg shadow-sm transition-colors whitespace-nowrap uppercase tracking-wider"
                >
                  Auto-Plot ({presetSisaCount[currentStep.presetType]})
                </button>
              </div>
            )}

            {/* Mapel List Checkboxes */}
            <div className="flex-1 overflow-y-auto max-h-[200px] pr-1 space-y-2 border border-slate-100 dark:border-slate-850 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
              {filteredSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center space-y-2">
                  <BookOpen size={28} />
                  <p className="text-[10px] font-black uppercase">Tidak ada mapel {currentStep.label.toLowerCase()}</p>
                  <p className="text-[9px] font-bold">Semua mapel kategori ini sudah di-plot atau belum dibuat.</p>
                </div>
              ) : (
                filteredSubjects.map((s: Mapel) => {
                  const isChecked = !!bulkSelections[s.id];
                  const group = detectKelompokForMapel(s.kode_mapel || '', s.nama_mapel);
                  const hasStandard = checkMapelHasStandard(s, selectedTingkat, standardReferences?.data || [], isSmkOrMak, group);
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
                            kelompok: currentStep.kelompok
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
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.nama_mapel}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[9px] text-slate-400 font-mono font-bold">{s.kode_mapel}</span>
                          {!hasStandard && (
                            <span
                              title="Mapel ini tidak diatur dalam standar nasional Kemendikbud untuk kelas ini, sehingga tidak termasuk dalam Auto-Plot. Anda tetap dapat memilihnya secara manual."
                              className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-450 border border-orange-200 dark:border-orange-900/40 select-none cursor-help"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              Tidak Masuk Auto-Plot
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel Kanan: Setting JP & Kelompok Massal (Col 7) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Terpilih di {currentStep.label} ({selectedSubjectsInCurrentStep.length})
              </span>
              {selectedSubjectsInCurrentStep.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const copy = { ...bulkSelections };
                    selectedSubjectsInCurrentStep.forEach(([id]) => {
                      delete copy[id];
                    });
                    setBulkSelections(copy);
                  }}
                  className="text-[9px] text-red-500 font-black uppercase hover:underline"
                >
                  Kosongkan Kategori Ini
                </button>
              )}
            </div>

            {/* Selected Mapels Table List */}
            <div className="flex-1 overflow-y-auto max-h-[250px] border border-slate-100 dark:border-slate-850 rounded-xl p-3 bg-white dark:bg-slate-950 space-y-3">
              {selectedSubjectsInCurrentStep.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 space-y-2">
                  <BookOpen size={36} />
                  <p className="text-xs font-bold text-center">Pilih mata pelajaran di panel kiri untuk mulai plotting {currentStep.label.toLowerCase()}</p>
                </div>
              ) : (
                selectedSubjectsInCurrentStep.map(([id, config]) => {
                  const mapelObj = subjects?.data?.find((s: Mapel) => s.id === id);
                  if (!mapelObj) return null;
                  
                  return (
                    <div key={id} className="flex flex-col gap-2 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{mapelObj.nama_mapel}</p>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{mapelObj.kode_mapel}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* JP Input */}
                          <div className="w-24">
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
                            <Trash2 size={15} />
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
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 px-1">
        {activeStepIndex === 0 ? (
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="rounded-xl font-bold text-xs h-9"
          >
            BATAL
          </Button>
        ) : (
          <Button
            variant="outline"
            type="button"
            onClick={handleBack}
            className="rounded-xl font-bold flex items-center gap-1.5 text-xs h-9"
          >
            <ChevronLeft size={14} />
            KEMBALI
          </Button>
        )}
        
        {activeStepIndex < steps.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-slate-100 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/20 font-black rounded-xl text-xs h-9 border border-indigo-100 dark:border-slate-700 flex items-center gap-1.5"
          >
            SELANJUTNYA
            <ChevronRight size={14} />
          </Button>
        ) : (
          <Button
            type={canSubmit ? "submit" : "button"}
            isLoading={isPendingSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs h-9 border border-indigo-500 shadow-md shadow-indigo-150 dark:shadow-none flex items-center gap-1.5 animate-pulse"
          >
            SIMPAN PEMETAAN
            <Check size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};
export default BulkPlottingForm;
