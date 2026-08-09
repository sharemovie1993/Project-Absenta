import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wand2, Sparkles, Save, BookOpen, Loader2, Eye, Code2, Terminal, ChevronDown, ChevronUp, Zap, CheckCircle2, FileText } from 'lucide-react';
import { Modal, Button, SearchableSelect, Badge } from '../../ui';
import { useAuthStore } from '../../../store/authStore';
import { useJenjang } from '../../../hooks/useJenjang';

interface Option {
  label: string;
  value: string;
}

const GRADE_DROPDOWN_MAP: Record<string, Array<{ label: string; value: string }>> = {
  PAUD: [{ label: 'PAUD / TK (Fase PAUD)', value: 'PAUD' }],
  SD: [
    { label: 'Kelas 1 (Fase A)', value: '1' },
    { label: 'Kelas 2 (Fase A)', value: '2' },
    { label: 'Kelas 3 (Fase B)', value: '3' },
    { label: 'Kelas 4 (Fase B)', value: '4' },
    { label: 'Kelas 5 (Fase C)', value: '5' },
    { label: 'Kelas 6 (Fase C)', value: '6' },
  ],
  SMP: [
    { label: 'Kelas 7 / VII (Fase D)', value: 'VII' },
    { label: 'Kelas 8 / VIII (Fase D)', value: 'VIII' },
    { label: 'Kelas 9 / IX (Fase D)', value: 'IX' },
  ],
  SMA: [
    { label: 'Kelas 10 / X (Fase E)', value: 'X' },
    { label: 'Kelas 11 / XI (Fase F)', value: 'XI' },
    { label: 'Kelas 12 / XII (Fase F)', value: 'XII' },
  ],
  SMK: [
    { label: 'Kelas 10 / X (Fase E)', value: 'X' },
    { label: 'Kelas 11 / XI (Fase F)', value: 'XI' },
    { label: 'Kelas 12 / XII (Fase F)', value: 'XII' },
    { label: 'Kelas 13 / XIII (Fase F)', value: 'XIII' },
  ],
  SLB: [
    { label: 'Kelas 1 (Fase A)', value: '1' },
    { label: 'Kelas 2 (Fase A)', value: '2' },
    { label: 'Kelas 3 (Fase B)', value: '3' },
    { label: 'Kelas 4 (Fase B)', value: '4' },
    { label: 'Kelas 5 (Fase C)', value: '5' },
    { label: 'Kelas 6 (Fase C)', value: '6' },
    { label: 'Kelas 7 (Fase D)', value: '7' },
    { label: 'Kelas 8 (Fase D)', value: '8' },
    { label: 'Kelas 9 (Fase D)', value: '9' },
    { label: 'Kelas 10 (Fase E)', value: '10' },
    { label: 'Kelas 11 (Fase F)', value: '11' },
    { label: 'Kelas 12 (Fase F)', value: '12' },
  ],
  ALL: [
    { label: 'Kelas 1 (Fase A)', value: '1' },
    { label: 'Kelas 2 (Fase A)', value: '2' },
    { label: 'Kelas 3 (Fase B)', value: '3' },
    { label: 'Kelas 4 (Fase B)', value: '4' },
    { label: 'Kelas 5 (Fase C)', value: '5' },
    { label: 'Kelas 6 (Fase C)', value: '6' },
    { label: 'Kelas 7 / VII (Fase D)', value: 'VII' },
    { label: 'Kelas 8 / VIII (Fase D)', value: 'VIII' },
    { label: 'Kelas 9 / IX (Fase D)', value: 'IX' },
    { label: 'Kelas 10 / X (Fase E)', value: 'X' },
    { label: 'Kelas 11 / XI (Fase F)', value: 'XI' },
    { label: 'Kelas 12 / XII (Fase F)', value: 'XII' },
  ]
};


export interface TopikPreset {
  id: string;
  judul_topik: string;
  deskripsi?: string;
  kategori: string;
  tingkat?: number;
  fase?: string;
  jenjang?: string;
}

export interface LibraryTemplateItem {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
  jenis: string;
  judul: string;
  topik?: string;
}

export interface MyPerangkatItem {
  id: string;
  jenis: string;
  judul: string;
  topik?: string;
  status: string;
  mapel_id?: string;
}


interface PerangkatAjarAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiForm: {
    jenis: string;
    mapel_id: string;
    kelas: string;
    topik: string;
    alokasi_waktu: string;
  };
  setAiForm: React.Dispatch<React.SetStateAction<{
    jenis: string;
    mapel_id: string;
    kelas: string;
    topik: string;
    alokasi_waktu: string;
  }>>;
  filterJenisOptions: Option[];
  mapelOptions: Option[];
  aiTopikPresets?: TopikPreset[];
  libraryTemplates?: LibraryTemplateItem[];
  myPerangkatList?: MyPerangkatItem[];
  onOpenLibraryCatalog?: () => void;
  onEditExistingPerangkat?: (item: MyPerangkatItem) => void;
  isGeneratingAI: boolean;
  isSavingAI: boolean;
  generatedAIContent: string;
  setGeneratedAIContent: (content: string) => void;
  onSubmitAI: (e: React.FormEvent) => void;
  onSaveAI: () => void;
}

const JENIS_LABELS: Record<string, string> = {
  MODUL_AJAR: 'Modul Ajar',
  ATP: 'ATP (Alur Tujuan Pembelajaran)',
  MODUL_PROJEK: 'Modul Projek (P5)',
  PROTA: 'Program Tahunan (PROTA)',
  PROMES: 'Program Semester (PROMES)',
  KKTP: 'KKTP',
  RPP: 'RPP Legacy',
  SILABUS: 'Silabus Legacy',
};

export default React.memo(function PerangkatAjarAIModal({
  isOpen,
  onClose,
  aiForm,
  setAiForm,
  filterJenisOptions,
  mapelOptions,
  aiTopikPresets,
  libraryTemplates,
  myPerangkatList,
  onOpenLibraryCatalog,
  onEditExistingPerangkat,
  isGeneratingAI,
  isSavingAI,
  generatedAIContent,
  setGeneratedAIContent,
  onSubmitAI,
  onSaveAI,
}: PerangkatAjarAIModalProps) {
  const { user } = useAuthStore();
  const { jenjang, kurikulum, config, tingkatList } = useJenjang();
  const [editorMode, setEditorMode] = useState<'VISUAL' | 'CODE' | 'RAW'>('VISUAL');
  const [showPromptDetails, setShowPromptDetails] = useState(true);

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

  const upperJenis = String(aiForm.jenis || '').toUpperCase();
  const isMacroDoc = upperJenis.includes('ATP') || upperJenis.includes('PROTA') || upperJenis.includes('PROMES');

  const selectedMapelLabel = mapelOptions.find((m) => m.value === aiForm.mapel_id)?.label || 'Mata Pelajaran';

  // Deteksi dokumen yang sudah dimiliki/diklaim Guru di Repositori Pribadi
  const isTopicInMyRepository = useCallback((topicText: string) => {
    if (!topicText || topicText.trim().length < 2) return null;
    if (!myPerangkatList || myPerangkatList.length === 0) return null;

    const sanitize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

    const cleanInput = sanitize(topicText);
    if (!cleanInput) return null;

    const stopWords = new Set(['and', 'or', 'in', 'the', 'dan', 'di', 'pada', 'untuk', 'dengan']);
    const inputWords = cleanInput
      .split(' ')
      .filter((w) => w.length > 2 && !stopWords.has(w));

    return myPerangkatList.find((item) => {
      if (item.jenis && aiForm.jenis && item.jenis.toUpperCase() !== aiForm.jenis.toUpperCase()) {
        return false;
      }

      const itemTitle = sanitize(item.judul || '');
      const itemTopic = sanitize(item.topik || '');

      if (itemTitle && (itemTitle.includes(cleanInput) || cleanInput.includes(itemTitle))) {
        return true;
      }
      if (itemTopic && (itemTopic.includes(cleanInput) || cleanInput.includes(itemTopic))) {
        return true;
      }

      if (inputWords.length > 0) {
        const matchCount = inputWords.filter(
          (word) => itemTitle.includes(word) || itemTopic.includes(word)
        ).length;
        if (matchCount >= Math.min(2, inputWords.length)) {
          return true;
        }
      }

      return false;
    });
  }, [myPerangkatList, aiForm.jenis]);

  // Deteksi duplikasi katalog berdasarkan Jenis, Mapel, dan Topik
  const isTopicInCatalog = useCallback((topicText: string) => {
    if (!topicText || topicText.trim().length < 2) return null;
    if (!libraryTemplates || libraryTemplates.length === 0) return null;

    const sanitize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

    const cleanInput = sanitize(topicText);
    if (!cleanInput) return null;

    const stopWords = new Set(['and', 'or', 'in', 'the', 'dan', 'di', 'pada', 'untuk', 'dengan']);
    const inputWords = cleanInput
      .split(' ')
      .filter((w) => w.length > 2 && !stopWords.has(w));

    return libraryTemplates.find((lib) => {
      if (lib.jenis && aiForm.jenis && lib.jenis.toUpperCase() !== aiForm.jenis.toUpperCase()) {
        return false;
      }

      const libTitle = sanitize(lib.judul || '');
      const libTopic = sanitize(lib.topik || '');

      if (libTitle && (libTitle.includes(cleanInput) || cleanInput.includes(libTitle))) {
        return true;
      }
      if (libTopic && (libTopic.includes(cleanInput) || cleanInput.includes(libTopic))) {
        return true;
      }

      if (inputWords.length > 0) {
        const matchCount = inputWords.filter(
          (word) => libTitle.includes(word) || libTopic.includes(word)
        ).length;
        if (matchCount >= Math.min(2, inputWords.length)) {
          return true;
        }
      }

      return false;
    });
  }, [libraryTemplates, aiForm.jenis]);

  const matchingMyRepoItem = useMemo(() => {
    return isTopicInMyRepository(aiForm.topik);
  }, [isTopicInMyRepository, aiForm.topik]);

  const matchingCatalogItem = useMemo(() => {
    return isTopicInCatalog(aiForm.topik);
  }, [isTopicInCatalog, aiForm.topik]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchingMyRepoItem) {
      if (onEditExistingPerangkat) onEditExistingPerangkat(matchingMyRepoItem);
      return;
    }
    if (matchingCatalogItem) {
      if (onOpenLibraryCatalog) onOpenLibraryCatalog();
      return;
    }
    onSubmitAI(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generator Perangkat Ajar Kurikulum Merdeka (AI Powered)"
      size="5xl"
    >
      <div className="space-y-4">
        {!generatedAIContent ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="p-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs text-violet-900 dark:text-violet-300">
              <p className="font-bold flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5 text-violet-500" />
                Asisten AI Penyusunan Modul Ajar & KKTP (Dokumen Mikro)
              </p>
              <p className="text-[11px] text-violet-700 dark:text-violet-400 mt-0.5">
                Cukup pilih mata pelajaran, kelas, dan 1 topik materi. AI akan secara otomatis menyusun Modul Ajar harian lengkap dengan CP, TP, langkah KBM, LKPD, dan rubrik asesmen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ai-jenis" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Perangkat <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="ai-jenis"
                  value={aiForm.jenis}
                  onValueChange={(val) => setAiForm((prev) => ({ ...prev, jenis: val }))}
                  options={filterJenisOptions.filter((o) => o.value !== '' && !['ATP', 'PROTA', 'PROMES'].includes(o.value))}
                  placeholder="Pilih Jenis"
                />
              </div>

              <div>
                <label htmlFor="ai-mapel" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="ai-mapel"
                  value={aiForm.mapel_id}
                  onValueChange={(val) => setAiForm((prev) => ({ ...prev, mapel_id: val }))}
                  options={mapelOptions}
                  placeholder="Pilih Mapel"
                />
              </div>

              <div>
                <label htmlFor="ai-kelas" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas / Tingkat <span className="text-rose-500">*</span>
                </label>
                <select
                  id="ai-kelas"
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

            {(() => {
              const DEFAULT_TOPICS: TopikPreset[] = [
                { id: '1', judul_topik: 'Pemrograman Web & RESTful API Frontend (React/Tailwind)', kategori: 'KBM' },
                { id: '2', judul_topik: 'Teks Laporan Hasil Observasi (LHO) & Analisis Struktur', kategori: 'KBM' },
                { id: '3', judul_topik: 'Persamaan Garis Lurus & Fungsi Kuadrat', kategori: 'KBM' },
                { id: '4', judul_topik: 'Projek P5: Suara Demokrasi & Simulasi Pemilu Pelajar', kategori: 'P5' },
                { id: '5', judul_topik: 'Analytical Exposition Text & English Speaking Skill', kategori: 'KBM' },
                { id: '6', judul_topik: 'Penerapan Nilai Pancasila dalam Era Digital', kategori: 'KBM' },
              ];
              const activePresets = (aiTopikPresets && aiTopikPresets.length > 0) ? aiTopikPresets : DEFAULT_TOPICS;

              return (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      Rekomendasi Topik Database ({activePresets.length} Topik Tersedia)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300">
                      🔘 Mode Single-Select (Pilih 1 Topik Utama)
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                    {activePresets.map((preset, index) => {
                      const isSelected = aiForm.topik === preset.judul_topik;
                      const existsInMyRepo = Boolean(isTopicInMyRepository(preset.judul_topik));
                      const existsInLib = Boolean(isTopicInCatalog(preset.judul_topik));

                      return (
                        <button
                          key={preset.id || index}
                          type="button"
                          onClick={() => setAiForm((prev) => ({ ...prev, topik: preset.judul_topik }))}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border text-left text-xs font-semibold transition-all group ${
                            isSelected
                              ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30'
                          }`}
                        >
                          <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-700'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="line-clamp-2 leading-snug block">{preset.judul_topik}</span>
                              {existsInMyRepo ? (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5 ${
                                  isSelected ? 'bg-blue-300 text-blue-950 font-extrabold' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200'
                                }`}>
                                  <CheckCircle2 size={10} className="text-blue-600 dark:text-blue-400" /> Sudah Diklaim
                                </span>
                              ) : existsInLib ? (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5 ${
                                  isSelected ? 'bg-emerald-400 text-slate-950 font-extrabold' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                }`}>
                                  <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" /> Ada di Katalog
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div>
              <label htmlFor="ai-topik" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Topik / Pokok Bahasan Utama <span className="text-rose-500">*</span>
              </label>
              <input
                id="ai-topik"
                type="text"
                required
                value={aiForm.topik}
                onChange={(e) => setAiForm((prev) => ({ ...prev, topik: e.target.value }))}
                placeholder="Contoh: Pemrograman Web & RESTful API / Teks Laporan Hasil Observasi"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-medium"
              />
            </div>

            <div>
              <label htmlFor="ai-alokasi" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alokasi Waktu (Opsional)
              </label>
              <input
                id="ai-alokasi"
                type="text"
                value={aiForm.alokasi_waktu}
                onChange={(e) => setAiForm((prev) => ({ ...prev, alokasi_waktu: e.target.value }))}
                placeholder="Contoh: 2 x 45 Menit (1 Pertemuan)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            {matchingMyRepoItem ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="space-y-0.5 flex-1 min-w-[240px]">
                  <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <FileText className="w-4 h-4 text-blue-600 fill-blue-100" />
                    Anda Sudah Memiliki Dokumen Ini di Repositori!
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-snug">
                    Dokumen <b>"{matchingMyRepoItem.judul}"</b> sudah ada di daftar Perangkat Ajar milik Anda.
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
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="space-y-0.5 flex-1 min-w-[240px]">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-400" />
                    Topik Ini Sudah Tersedia di Bank Katalog Platform!
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    Dokumen <b>"{matchingCatalogItem.judul}"</b> sudah tersedia. Anda dapat klaim langsung tanpa AI.
                  </p>
                </div>
                {onOpenLibraryCatalog && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onOpenLibraryCatalog}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm border-0 shrink-0"
                  >
                    <Zap size={13} className="mr-1 fill-amber-300 text-amber-300" /> KLAIM SEKARANG
                  </Button>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 pb-20 sm:pb-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
                BATAL
              </Button>
              <Button
                type="submit"
                disabled={isGeneratingAI || Boolean(matchingMyRepoItem) || Boolean(matchingCatalogItem) || !aiForm.topik.trim()}
                className={`rounded-xl font-bold border-0 shadow-md ${
                  matchingMyRepoItem || matchingCatalogItem
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-500/20'
                }`}
              >
                {matchingMyRepoItem ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> SUDAH DIMILIKI ANDA
                  </>
                ) : matchingCatalogItem ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> SUDAH ADA DI KATALOG
                  </>
                ) : isGeneratingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> MENYUSUN DENGAN AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" /> GENERATE MODUL AJAR (AI)
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Header Result Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800/50 gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-900 dark:text-violet-300">
                <BookOpen className="w-4 h-4 text-violet-600" />
                <span>Hasil Penyusunan AI: {aiForm.topik}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-violet-200/60 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditorMode('VISUAL')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'VISUAL'
                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye size={14} />
                    Pratinjau Dokumen Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('CODE')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'CODE'
                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Code2 size={14} />
                    Editor Kode HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('RAW')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'RAW'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Terminal size={14} />
                    Respon Mentah AI (Raw)
                  </button>
                </div>


                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setGeneratedAIContent('')}
                  className="text-xs font-bold"
                >
                  ✏️ Edit Parameter Prompt
                </Button>
              </div>
            </div>

            {/* Prompt & Parameter Details Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  Parameter & Naskah Prompt AI yang Digunakan
                </span>
                <button
                  type="button"
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  {showPromptDetails ? (
                    <>
                      <span>Sembunyikan Prompt</span> <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      <span>Tampilkan Naskah Prompt AI</span> <ChevronDown size={12} />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 font-sans">
                <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                  Jenis: {JENIS_LABELS[aiForm.jenis] || aiForm.jenis}
                </Badge>
                <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 font-bold text-[10px]">
                  Mapel: {selectedMapelLabel}
                </Badge>
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-[10px]">
                  Kelas: {aiForm.kelas}
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                  Topik: {aiForm.topik}
                </Badge>
                {aiForm.alokasi_waktu && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]">
                    Alokasi: {aiForm.alokasi_waktu}
                  </Badge>
                )}
              </div>

              {showPromptDetails && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono leading-relaxed space-y-1 mt-2 border border-slate-800 select-text">
                  <div className="font-bold text-amber-400 font-sans text-xs flex items-center gap-1.5 mb-1">
                    <Terminal size={13} /> Naskah Prompt Resmi (Dikirim ke Gemini AI Engine):
                  </div>
                  <p className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                    "Buatlah draf lengkap dokumen perangkat ajar Kurikulum Merdeka (Permendikbudristek No. 12 Tahun 2024) dengan spesifikasi: Jenis Dokumen: <b>{aiForm.jenis}</b>, Mata Pelajaran: <b>{selectedMapelLabel}</b>, Tingkat/Kelas: <b>{aiForm.kelas}</b>, Topik/Materi: <b>{aiForm.topik}</b>, Alokasi Waktu: <b>{aiForm.alokasi_waktu || '2 x 45 Menit'}</b>. Gunakan struktur tabel formal untuk langkah KBM, CP/TP, Profil Pancasila, dan Asesmen."
                  </p>
                </div>
              )}
            </div>

            {/* Display View / Editor Container */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="ai-generated-content" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {editorMode === 'VISUAL'
                    ? '📄 Pratinjau Dokumen Resmi Kurikulum Merdeka'
                    : editorMode === 'CODE'
                    ? '💻 Editor Kode HTML'
                    : '⚡ Respon Mentah String Asli (Raw Gemini Output)'}
                </label>

                {editorMode === 'RAW' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedAIContent);
                      toast.success('Respon mentah AI berhasil disalin ke clipboard!');
                    }}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    📋 Salin Respon Mentah
                  </button>
                )}
              </div>

              {editorMode === 'VISUAL' ? (
                <div className="w-full min-h-[50vh] max-h-[60vh] overflow-y-auto p-6 md:p-8 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-inner font-sans text-xs leading-relaxed select-text">
                  <div dangerouslySetInnerHTML={{ __html: generatedAIContent }} />
                </div>
              ) : editorMode === 'CODE' ? (
                <textarea
                  id="ai-generated-content"
                  rows={16}
                  value={generatedAIContent}
                  onChange={(e) => setGeneratedAIContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none leading-relaxed"
                />
              ) : (
                <pre className="w-full min-h-[50vh] max-h-[60vh] overflow-y-auto p-4 bg-slate-950 text-amber-300 rounded-xl border border-slate-800 shadow-inner font-mono text-xs leading-relaxed select-text whitespace-pre-wrap break-all">
                  {generatedAIContent}
                </pre>
              )}
            </div>


            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 pb-20 sm:pb-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
                BATAL
              </Button>
              <Button
                type="button"
                onClick={onSaveAI}
                disabled={isSavingAI}
                className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md shadow-emerald-500/20"
              >
                {isSavingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> MENYIMPAN...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> SIMPAN KE REPOSITORI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});
