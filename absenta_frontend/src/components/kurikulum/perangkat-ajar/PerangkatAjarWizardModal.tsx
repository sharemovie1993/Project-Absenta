import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuthStore } from '@/store/authStore';
import { useJenjang } from '@/hooks/useJenjang';
import {
  Sparkles,
  Wand2,
  CheckCircle2,
  Loader2,
  Zap,
  FileText,
  Layers,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  BookOpen,
} from 'lucide-react';

interface TopikPreset {
  id?: string;
  judul_topik: string;
  kategori?: string;
  jenjang?: string;
  fase?: string;
  tingkat?: number;
}

interface PerangkatAjarWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiForm: {
    jenis: string;
    mapel_id: string;
    kelas: string;
    topik: string;
    alokasi_waktu: string;
  };
  setAiForm: React.Dispatch<
    React.SetStateAction<{
      jenis: string;
      mapel_id: string;
      kelas: string;
      topik: string;
      alokasi_waktu: string;
    }>
  >;
  mapelOptions: Array<{ value: string; label: string }>;
  aiTopikPresets?: TopikPreset[];
  libraryTemplates?: any[];
  myPerangkatList?: any[];
  onOpenLibraryCatalog?: () => void;
  onEditExistingPerangkat?: (item: any) => void;
  isGeneratingAI: boolean;
  onSubmitAI: (e: React.FormEvent) => void;
}

const MACRO_JENIS_OPTIONS = [
  { value: 'ATP', label: 'Alur Tujuan Pembelajaran (ATP)' },
  { value: 'PROTA', label: 'Program Tahunan (PROTA)' },
  { value: 'PROMES', label: 'Program Semester (PROMES)' },
];

export default React.memo(function PerangkatAjarWizardModal({
  isOpen,
  onClose,
  aiForm,
  setAiForm,
  mapelOptions,
  aiTopikPresets,
  libraryTemplates,
  myPerangkatList,
  onOpenLibraryCatalog,
  onEditExistingPerangkat,
  isGeneratingAI,
  onSubmitAI,
}: PerangkatAjarWizardModalProps) {
  const { user } = useAuthStore();
  const { jenjang, kurikulum, config, tingkatList, sekolah } = useJenjang();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [topicTab, setTopicTab] = useState<'MY_REPO' | 'GLOBAL_MASTER'>('MY_REPO');

  const selectedMapelLabel = useMemo(() => {
    return mapelOptions.find((m) => m.value === aiForm.mapel_id)?.label || 'Mata Pelajaran';
  }, [mapelOptions, aiForm.mapel_id]);

  // Dynamic Grade Options generated from useJenjang hook
  const gradeOptions = useMemo(() => {
    return tingkatList.map((t) => {
      let fase = 'A';
      if (t === 1 || t === 2) fase = 'A';
      else if (t === 3 || t === 4) fase = 'B';
      else if (t === 5 || t === 6) fase = 'C';
      else if (t >= 7 && t <= 9) fase = 'D';
      else if (t === 10) fase = 'E';
      else if (t >= 11) fase = 'F';

      const romanMap: Record<number, string> = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
        7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII'
      };

      const roman = romanMap[t] || String(t);

      return {
        value: roman,
        label: `Kelas ${roman} (Fase ${fase})`,
      };
    });
  }, [tingkatList]);

  // Extract topics from teacher's own repository items
  const myTopicsList = useMemo(() => {
    if (!myPerangkatList || myPerangkatList.length === 0) return [];

    const filtered = myPerangkatList.filter((item) => {
      if (aiForm.mapel_id && item.Mapel?.id && item.Mapel.id !== aiForm.mapel_id) {
        return false;
      }
      return true;
    });

    const uniqueTopiks = new Map<string, any>();
    filtered.forEach((item) => {
      const topikName = (item.topik || item.judul || '').trim();
      if (topikName && !uniqueTopiks.has(topikName)) {
        uniqueTopiks.set(topikName, {
          id: item.id,
          judul_topik: topikName,
          jenis: item.jenis,
          status: item.status,
          mapel_name: item.Mapel?.nama_mapel || selectedMapelLabel,
        });
      }
    });

    return Array.from(uniqueTopiks.values());
  }, [myPerangkatList, aiForm.mapel_id, selectedMapelLabel]);

  // Auto switch tab to MY_REPO if teacher has items, else GLOBAL_MASTER
  useEffect(() => {
    if (myTopicsList.length > 0) {
      setTopicTab('MY_REPO');
    } else {
      setTopicTab('GLOBAL_MASTER');
    }
  }, [myTopicsList.length]);

  // Reset wizard when modal opens or document type changes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      // Auto-set default macro type if currently micro
      if (!['ATP', 'PROTA', 'PROMES'].includes(String(aiForm.jenis).toUpperCase())) {
        setAiForm((prev) => ({ ...prev, jenis: 'ATP' }));
      }
      // Auto-set default grade from tenant tingkatList if not set
      if (!aiForm.kelas && gradeOptions.length > 0) {
        setAiForm((prev) => ({ ...prev, kelas: gradeOptions[0].value }));
      }
    }
  }, [isOpen, gradeOptions]);

  // Deteksi kepemilikan di repositori pribadi
  const matchingMyRepoItem = useMemo(() => {
    if (!aiForm.topik || !myPerangkatList) return null;
    const cleanTopik = aiForm.topik.toLowerCase().trim();
    return myPerangkatList.find(
      (item) =>
        item.jenis?.toUpperCase() === aiForm.jenis?.toUpperCase() &&
        (item.judul?.toLowerCase().includes(cleanTopik) || item.topik?.toLowerCase().includes(cleanTopik))
    );
  }, [myPerangkatList, aiForm.jenis, aiForm.topik]);

  // Deteksi ketersediaan di bank katalog platform
  const matchingCatalogItem = useMemo(() => {
    if (!aiForm.topik || !libraryTemplates) return null;
    const cleanTopik = aiForm.topik.toLowerCase().trim();
    return libraryTemplates.find(
      (lib) =>
        lib.jenis?.toUpperCase() === aiForm.jenis?.toUpperCase() &&
        (lib.judul?.toLowerCase().includes(cleanTopik) || lib.topik?.toLowerCase().includes(cleanTopik))
    );
  }, [libraryTemplates, aiForm.jenis, aiForm.topik]);

  // Helper handling multi-select topics
  const currentTopicsArray = useMemo(() => {
    return aiForm.topik
      ? aiForm.topik.split(';').map((t) => t.trim()).filter(Boolean)
      : [];
  }, [aiForm.topik]);

  const handleTogglePreset = (topikText: string) => {
    const exists = currentTopicsArray.includes(topikText);
    let updatedArray: string[];
    if (exists) {
      updatedArray = currentTopicsArray.filter((t) => t !== topikText);
    } else {
      updatedArray = [...currentTopicsArray, topikText];
    }
    setAiForm((prev) => ({ ...prev, topik: updatedArray.join('; ') }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Untuk Wizard Makro (ATP/PROTA/PROMES), topik adalah multi-topic string.
    // Selalu langsung generate AI - tidak perlu cek single-match repository/catalog
    // karena matriks baru selalu harus disusun dari kumpulan topik yang dipilih.
    onSubmitAI(e);
  };

  const DEFAULT_TOPICS: TopikPreset[] = [
    { id: '1', judul_topik: 'Pemrograman Web & RESTful API Frontend (React/Tailwind)', kategori: 'KBM' },
    { id: '2', judul_topik: 'Teks Laporan Hasil Observasi (LHO) & Analisis Struktur', kategori: 'KBM' },
    { id: '3', judul_topik: 'Persamaan Garis Lurus & Fungsi Kuadrat', kategori: 'KBM' },
    { id: '4', judul_topik: 'Projek P5: Suara Demokrasi & Simulasi Pemilu Pelajar', kategori: 'P5' },
    { id: '5', judul_topik: 'Analytical Exposition Text & English Speaking Skill', kategori: 'KBM' },
    { id: '6', judul_topik: 'Penerapan Nilai Pancasila dalam Era Digital', kategori: 'KBM' },
  ];

  // Dynamic Master Topic presets strictly filtered by Selected Mapel and Grade
  const activeMasterPresets = useMemo(() => {
    const listFromPresets = aiTopikPresets ?? [];
    const cleanMapelName = selectedMapelLabel
      .replace(/\s*\([^)]*\)/g, '')
      .toLowerCase()
      .trim();

    let combined: TopikPreset[] = [...listFromPresets];

    // Merge matching items from Bank Katalog Platform for this Mapel
    if (libraryTemplates && libraryTemplates.length > 0) {
      libraryTemplates.forEach((libItem) => {
        const libMapel = (libItem.nama_mapel || '').toLowerCase();
        if (cleanMapelName && cleanMapelName !== 'mata pelajaran' && libMapel.includes(cleanMapelName)) {
          const topikText = libItem.topik || libItem.judul;
          if (topikText && !combined.some((p) => p.judul_topik.toLowerCase() === topikText.toLowerCase())) {
            combined.push({
              id: libItem.id,
              judul_topik: topikText,
              kategori: libItem.jenis,
              jenjang: libItem.jenjang,
              fase: libItem.fase,
              tingkat: libItem.tingkat,
            });
          }
        }
      });
    }

    return combined.length > 0 ? combined : DEFAULT_TOPICS;
  }, [aiTopikPresets, libraryTemplates, selectedMapelLabel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wizard Orkestrasi Kurikulum Merdeka (ATP / PROTA / PROMES)"
      size="5xl"
    >
      <form onSubmit={handleFormSubmit} className="space-y-5">
        {/* Wizard Stepper Progress Header */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-lg border border-slate-800">
          <div
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all ${
              step === 1 ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
            <span className="text-xs">1. Identitas & Mapel</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-slate-800" />

          <div
            onClick={() => {
              if (aiForm.mapel_id && aiForm.kelas) setStep(2);
            }}
            className={`flex items-center gap-2 font-bold px-3.5 py-1.5 rounded-xl transition-all ${
              step === 2
                ? 'bg-violet-600 text-white shadow-md'
                : aiForm.mapel_id && aiForm.kelas
                ? 'text-slate-400 cursor-pointer hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
            <span className="text-xs">2. Multi-Topik & JP</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-slate-800" />

          <div
            onClick={() => {
              if (aiForm.topik.trim()) setStep(3);
            }}
            className={`flex items-center gap-2 font-bold px-3.5 py-1.5 rounded-xl transition-all ${
              step === 3
                ? 'bg-violet-600 text-white shadow-md'
                : aiForm.topik.trim()
                ? 'text-slate-400 cursor-pointer hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
            <span className="text-xs">3. Review & Eksekusi</span>
          </div>
        </div>

        {/* STEP 1: SPESIFIKASI DOKUMEN */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Layers size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Langkah 1 dari 3: Tentukan Dokumen Makro Perencanaan</span>
                <span className="text-[11px] opacity-90">
                  ATP, PROTA, dan PROMES adalah perencanaan program tahunan/semester. Pada wizard ini Anda dapat merangkum banyak topik sekaligus menjadi 1 lembar matriks jadwal utuh.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Dokumen Makro <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="wizard-jenis"
                  value={aiForm.jenis}
                  onValueChange={(val) => setAiForm((prev) => ({ ...prev, jenis: val }))}
                  options={MACRO_JENIS_OPTIONS}
                  placeholder="Pilih Dokumen Makro"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran Pengajar <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="wizard-mapel"
                  value={aiForm.mapel_id}
                  onValueChange={(val) => setAiForm((prev) => ({ ...prev, mapel_id: val }))}
                  options={mapelOptions}
                  placeholder="Pilih Mapel"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas & Fase Kurikulum <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={aiForm.kelas}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, kelas: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold text-slate-800 dark:text-slate-200"
                >
                  {gradeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ORKESTRASI MULTI-TOPIK */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Langkah 2 dari 3: Orkestrasi Topik-Topik Database</span>
                <span className="text-[11px] opacity-90">
                  Centang beberapa topik di bawah untuk dirangkum ke dalam tabel matriks {aiForm.jenis}. Sistem offline/AI akan menyusun alur kode TP dan minggu kalendernya.
                </span>
              </div>
            </div>

            <div>
              {/* Tab Selector Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTopicTab('MY_REPO')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      topicTab === 'MY_REPO'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen size={13} />
                    <span>📂 Topik Repositori Anda ({myTopicsList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTopicTab('GLOBAL_MASTER')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      topicTab === 'GLOBAL_MASTER'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    <span>🌐 Bank Master Platform ({activeMasterPresets.length})</span>
                  </button>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                  ☑️ {currentTopicsArray.length} Topik Terpilih untuk Matriks
                </span>
              </div>

              {/* Tab 1: Topik dari Repositori Dokumen Milik Guru */}
              {topicTab === 'MY_REPO' && (
                <div>
                  {myTopicsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      {myTopicsList.map((preset, index) => {
                        const isSelected = currentTopicsArray.includes(preset.judul_topik);
                        return (
                          <button
                            key={preset.id || index}
                            type="button"
                            onClick={() => handleTogglePreset(preset.judul_topik)}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all group ${
                              isSelected
                                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30'
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              }`}
                            >
                              {isSelected ? '✓' : index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="line-clamp-2 leading-snug block font-bold">{preset.judul_topik}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                  ✓ Di Repositori
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs space-y-2">
                      <p className="text-slate-600 dark:text-slate-400">
                        Anda belum memiliki Modul Ajar di repositori pribadi untuk Mapel ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTopicTab('GLOBAL_MASTER')}
                        className="text-xs font-bold text-violet-600 hover:underline"
                      >
                        👉 Klik di sini untuk memilih dari Bank Master Topik Platform
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Bank Master Topik Database Platform */}
              {topicTab === 'GLOBAL_MASTER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  {activeMasterPresets.map((preset, index) => {
                    const isSelected = currentTopicsArray.includes(preset.judul_topik);
                    return (
                      <button
                        key={preset.id || index}
                        type="button"
                        onClick={() => handleTogglePreset(preset.judul_topik)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all group ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                            : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30'
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700'
                          }`}
                        >
                          {isSelected ? '✓' : index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="line-clamp-2 leading-snug block">{preset.judul_topik}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rangkaian Topik yang Dipilih (Titik koma `;` untuk memisah) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={aiForm.topik}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, topik: e.target.value }))}
                  placeholder="Ketik atau centang topik-topik di atas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total Alokasi JP
                </label>
                <input
                  type="text"
                  value={aiForm.alokasi_waktu}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, alokasi_waktu: e.target.value }))}
                  placeholder="Contoh: 72 JP Efektif"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & EKSEKUSI */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-violet-900 dark:text-violet-200 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-violet-600" />
                Langkah 3 dari 3: Ringkasan Spesifikasi Orkestrasi
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">JENIS DOKUMEN</span>
                  <span className="font-bold text-violet-700 dark:text-violet-300">{aiForm.jenis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">MATA PELAJARAN</span>
                  <span className="font-bold">{selectedMapelLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">KELAS / TINGKAT</span>
                  <span className="font-bold">Kelas {aiForm.kelas}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-normal">RANGKAIAN TOPIK ({currentTopicsArray.length} Topik)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed block">
                    {aiForm.topik}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">ALOKASI WAKTU</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">{aiForm.alokasi_waktu || 'Otomatis 72 JP'}</span>
                </div>
              </div>
            </div>

            {matchingMyRepoItem ? (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="space-y-0.5 flex-1 min-w-[240px]">
                  <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <FileText className="w-4 h-4 text-blue-600 fill-blue-100" />
                    Dokumen Matriks Ini Sudah Tersedia di Repositori Anda!
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-snug">
                    Dokumen <b>"{matchingMyRepoItem.judul}"</b> sudah tersimpan di daftar Perangkat Ajar milik Anda.
                  </p>
                </div>
                {onEditExistingPerangkat && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onEditExistingPerangkat(matchingMyRepoItem)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm border-0 shrink-0"
                  >
                    <FileText size={13} className="mr-1 text-blue-100" /> EDIT DI REPOSITORI
                  </Button>
                )}
              </div>
            ) : matchingCatalogItem ? (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="space-y-0.5 flex-1 min-w-[240px]">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-400" />
                    Matriks {aiForm.jenis} Ini Sudah Ada di Bank Katalog Platform!
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    Dokumen <b>"{matchingCatalogItem.judul}"</b> telah disiapkan platform. Anda dapat klaim langsung secara offline (0 detik).
                  </p>
                </div>
                {onOpenLibraryCatalog && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onOpenLibraryCatalog}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm border-0 shrink-0"
                  >
                    <Zap size={13} className="mr-1 fill-amber-300 text-amber-300" /> KLAIM INSTAN (0s)
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* WIZARD FOOTER NAVIGATION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
            BATAL
          </Button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="rounded-xl font-bold"
              >
                <ChevronLeft size={16} className="mr-1" /> KEMBALI
              </Button>
            )}

            {step === 1 && (
              <Button
                type="button"
                disabled={!aiForm.mapel_id || !aiForm.kelas}
                onClick={() => setStep(2)}
                className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md"
              >
                LANJUT KE PILIH TOPIK <ChevronRight size={16} className="ml-1" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                disabled={!aiForm.topik.trim()}
                onClick={() => setStep(3)}
                className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md"
              >
                LANJUT KE REVIEW & EKSEKUSI <ChevronRight size={16} className="ml-1" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="submit"
                disabled={isGeneratingAI || !aiForm.topik.trim()}
                className={`rounded-xl font-bold border-0 shadow-md ${
                  isGeneratingAI
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-500/20'
                }`}
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> MENGORKESTRASI MATRIKS...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" /> GENERATE MATRIKS {aiForm.jenis}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
});
