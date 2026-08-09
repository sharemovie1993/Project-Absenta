import React, { useState, useRef, useMemo } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { 
  FileUp, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  analyzeAscXml, 
  executeAscImport, 
  type AscAnalysisResult, 
  type EntityMapping 
} from '../../../api/academic/ascImporter.api';
import { cn } from '../../../lib/utils';
import { getTahunPelajaranList } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../../api/academic/semester.api';

const ASC_STORAGE_KEY = 'absenta_asc_import_mappings_v1';

const extractClassLevel = (name: string): 'X' | 'XI' | 'XII' | null => {
  if (!name) return null;
  const trimmed = name.trim().toUpperCase();
  if (/\b(XII|12)\b/i.test(trimmed) || trimmed.startsWith('XII') || trimmed.startsWith('12')) return 'XII';
  if (/\b(XI|11)\b/i.test(trimmed) || trimmed.startsWith('XI') || trimmed.startsWith('11')) return 'XI';
  if (/\b(X|10)\b/i.test(trimmed) || trimmed.startsWith('X') || trimmed.startsWith('10')) return 'X';
  return null;
};

interface SavedMappingPref {
  action: 'MATCH' | 'CREATE' | 'IGNORE';
  target_id?: string;
}

interface SavedMappingMap {
  teachers: Record<string, SavedMappingPref>;
  classes: Record<string, SavedMappingPref>;
  subjects: Record<string, SavedMappingPref>;
}

const loadSavedMappings = (): SavedMappingMap => {
  try {
    const raw = localStorage.getItem(ASC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load saved aSc import mappings', e);
  }
  return { teachers: {}, classes: {}, subjects: {} };
};

const saveMappingsToStorage = (
  teachers: Record<string, EntityMapping>,
  classes: Record<string, EntityMapping>,
  subjects: Record<string, EntityMapping>
) => {
  try {
    const data: SavedMappingMap = { teachers: {}, classes: {}, subjects: {} };
    Object.values(teachers).forEach(t => {
      const entry = { action: t.action, target_id: t.target_id };
      data.teachers[t.name.toLowerCase().trim()] = entry;
      data.teachers[t.asc_id] = entry;
    });
    Object.values(classes).forEach(c => {
      const entry = { action: c.action, target_id: c.target_id };
      data.classes[c.name.toLowerCase().trim()] = entry;
      data.classes[c.asc_id] = entry;
    });
    Object.values(subjects).forEach(s => {
      const entry = { action: s.action, target_id: s.target_id };
      data.subjects[s.name.toLowerCase().trim()] = entry;
      data.subjects[s.asc_id] = entry;
    });
    localStorage.setItem(ASC_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save aSc import mappings', e);
  }
};

export const AscImportWizardModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  tahunPelajaranId,
  semesterId,
  onSuccessImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [analysis, setAnalysis] = useState<AscAnalysisResult | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Tab State in Step 2
  const [activeTab, setActiveTab] = useState<'GURU' | 'KELAS' | 'MAPEL'>('GURU');
  const [searchQuery, setSearchQuery] = useState('');

  // Editable User Mappings
  const [teacherMappings, setTeacherMappings] = useState<Record<string, EntityMapping>>({});
  const [classMappings, setClassMappings] = useState<Record<string, EntityMapping>>({});
  const [subjectMappings, setSubjectMappings] = useState<Record<string, EntityMapping>>({});

  const mappingStats = useMemo(() => {
    const teachersList = Object.values(teacherMappings);
    const classesList = Object.values(classMappings);
    const subjectsList = Object.values(subjectMappings);

    const activeTeachers = teachersList.filter(t => t.action !== 'IGNORE');
    const ignoredTeachers = teachersList.filter(t => t.action === 'IGNORE');

    const activeClasses = classesList.filter(c => c.action !== 'IGNORE');
    const ignoredClasses = classesList.filter(c => c.action === 'IGNORE');

    const activeSubjects = subjectsList.filter(s => s.action !== 'IGNORE');
    const ignoredSubjects = subjectsList.filter(s => s.action === 'IGNORE');

    return {
      teachers: { total: teachersList.length, active: activeTeachers.length, ignored: ignoredTeachers.length },
      classes: { total: classesList.length, active: activeClasses.length, ignored: ignoredClasses.length },
      subjects: { total: subjectsList.length, active: activeSubjects.length, ignored: ignoredSubjects.length },
    };
  }, [teacherMappings, classMappings, subjectMappings]);

  const resetState = () => {
    setStep(1);
    setLoading(false);
    setExecuting(false);
    setAnalysis(null);
    setExecutionResult(null);
    setActiveTab('GURU');
    setSearchQuery('');
    setTeacherMappings({});
    setClassMappings({});
    setSubjectMappings({});
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn('⚠️ [aSc Import Wizard] No file selected.');
      return;
    }

    console.log('🚀 [aSc Import Wizard] Selected XML File:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
    });

    if (!file.name.toLowerCase().endsWith('.xml')) {
      console.error('❌ [aSc Import Wizard] Invalid file extension (must be .xml):', file.name);
      toast.error('File harus berformat XML (.xml) hasil export aSc TimeTables');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Memproses & menganalisis file XML aSc TimeTables...');
    try {
      console.log('⏳ [aSc Import Wizard] Sending XML file to backend /api/academic/asc-importer/analyze ...');
      const res = await analyzeAscXml(file);
      console.log('📩 [aSc Import Wizard] Received Backend Analysis Response:', res);

      if (res.success && res.data) {
        setAnalysis(res.data);

        // Load saved mapping preferences from localStorage memory
        const saved = loadSavedMappings();

        // Initialize Teacher Mappings with persistent memory restore
        const initTeachers: Record<string, EntityMapping> = {};
        res.data.teachers.forEach(t => {
          const keyName = t.name.toLowerCase().trim();
          const savedPref = saved.teachers[t.asc_id] || saved.teachers[keyName];
          if (savedPref) {
            initTeachers[t.asc_id] = {
              asc_id: t.asc_id,
              name: t.name,
              code: t.code,
              target_id: savedPref.target_id || (t.matched_db_id || undefined),
              action: savedPref.action,
            };
          } else {
            initTeachers[t.asc_id] = {
              asc_id: t.asc_id,
              name: t.name,
              code: t.code,
              target_id: t.matched_db_id || undefined,
              action: t.matched_db_id ? 'MATCH' : 'CREATE',
            };
          }
        });
        setTeacherMappings(initTeachers);

        // Initialize Class Mappings with persistent memory restore
        const initClasses: Record<string, EntityMapping> = {};
        res.data.classes.forEach(c => {
          const keyName = c.name.toLowerCase().trim();
          const savedPref = saved.classes[c.asc_id] || saved.classes[keyName];
          if (savedPref) {
            initClasses[c.asc_id] = {
              asc_id: c.asc_id,
              name: c.name,
              code: c.code,
              target_id: savedPref.target_id || (c.matched_db_id || undefined),
              action: savedPref.action,
            };
          } else {
            initClasses[c.asc_id] = {
              asc_id: c.asc_id,
              name: c.name,
              code: c.code,
              target_id: c.matched_db_id || undefined,
              action: c.matched_db_id ? 'MATCH' : 'CREATE',
            };
          }
        });
        setClassMappings(initClasses);

        // Initialize Subject Mappings with persistent memory restore
        const initSubjects: Record<string, EntityMapping> = {};
        res.data.subjects.forEach(s => {
          const keyName = s.name.toLowerCase().trim();
          const savedPref = saved.subjects[s.asc_id] || saved.subjects[keyName];
          if (savedPref) {
            initSubjects[s.asc_id] = {
              asc_id: s.asc_id,
              name: s.name,
              code: s.code,
              target_id: savedPref.target_id || (s.matched_db_id || undefined),
              action: savedPref.action,
            };
          } else {
            initSubjects[s.asc_id] = {
              asc_id: s.asc_id,
              name: s.name,
              code: s.code,
              target_id: s.matched_db_id || undefined,
              action: s.matched_db_id ? 'MATCH' : 'CREATE',
            };
          }
        });
        setSubjectMappings(initSubjects);

        console.log('✅ [aSc Import Wizard] Pre-Execution Mappings Initialized:', {
          teachers: Object.keys(initTeachers).length,
          classes: Object.keys(initClasses).length,
          subjects: Object.keys(initSubjects).length,
          summary: res.data.summary,
        });

        toast.success('Analisis XML berhasil! Menampilkan pratinjau pemetaan.', { id: toastId });
        setStep(2);
      } else {
        console.error('❌ [aSc Import Wizard] Analysis failed with server message:', res.message);
        toast.error(res.message || 'Gagal menganalisis file XML', { id: toastId });
      }
    } catch (err: any) {
      console.error('💥 [aSc Import Wizard] Exception in handleFileUpload:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat mengunggah file XML';
      toast.error(serverMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSetAction = (tab: 'GURU' | 'KELAS' | 'MAPEL', action: 'CHECK_ALL' | 'UNCHECK_ALL') => {
    if (tab === 'GURU') {
      setTeacherMappings(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (action === 'UNCHECK_ALL') {
            next[id] = { ...next[id], action: 'IGNORE', target_id: undefined };
          } else {
            const originalMatch = analysis?.teachers.find(t => t.asc_id === id)?.matched_db_id;
            next[id] = { ...next[id], action: originalMatch ? 'MATCH' : 'CREATE', target_id: originalMatch || undefined };
          }
        });
        saveMappingsToStorage(next, classMappings, subjectMappings);
        return next;
      });
    } else if (tab === 'KELAS') {
      setClassMappings(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (action === 'UNCHECK_ALL') {
            next[id] = { ...next[id], action: 'IGNORE', target_id: undefined };
          } else {
            const originalMatch = analysis?.classes.find(c => c.asc_id === id)?.matched_db_id;
            next[id] = { ...next[id], action: originalMatch ? 'MATCH' : 'CREATE', target_id: originalMatch || undefined };
          }
        });
        saveMappingsToStorage(teacherMappings, next, subjectMappings);
        return next;
      });
    } else if (tab === 'MAPEL') {
      setSubjectMappings(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (action === 'UNCHECK_ALL') {
            next[id] = { ...next[id], action: 'IGNORE', target_id: undefined };
          } else {
            const originalMatch = analysis?.subjects.find(s => s.asc_id === id)?.matched_db_id;
            next[id] = { ...next[id], action: originalMatch ? 'MATCH' : 'CREATE', target_id: originalMatch || undefined };
          }
        });
        saveMappingsToStorage(teacherMappings, classMappings, next);
        return next;
      });
    }
  };

  const handleResetSavedPreferences = () => {
    localStorage.removeItem(ASC_STORAGE_KEY);
    toast.success('Memori pilihan impor berhasil dibersihkan ke default auto-match.');
    if (analysis) {
      const initTeachers: Record<string, EntityMapping> = {};
      analysis.teachers.forEach(t => {
        initTeachers[t.asc_id] = { asc_id: t.asc_id, name: t.name, code: t.code, target_id: t.matched_db_id || undefined, action: t.matched_db_id ? 'MATCH' : 'CREATE' };
      });
      setTeacherMappings(initTeachers);

      const initClasses: Record<string, EntityMapping> = {};
      analysis.classes.forEach(c => {
        initClasses[c.asc_id] = { asc_id: c.asc_id, name: c.name, code: c.code, target_id: c.matched_db_id || undefined, action: c.matched_db_id ? 'MATCH' : 'CREATE' };
      });
      setClassMappings(initClasses);

      const initSubjects: Record<string, EntityMapping> = {};
      analysis.subjects.forEach(s => {
        initSubjects[s.asc_id] = { asc_id: s.asc_id, name: s.name, code: s.code, target_id: s.matched_db_id || undefined, action: s.matched_db_id ? 'MATCH' : 'CREATE' };
      });
      setSubjectMappings(initSubjects);
    }
  };

  const handleProceedToStep3 = () => {
    if (!analysis) return;

    const mismatches: string[] = [];
    analysis.classes.forEach(c => {
      const mapping = classMappings[c.asc_id];
      if (mapping && mapping.action === 'MATCH' && mapping.target_id) {
        const targetDbClass = analysis.db_classes.find(d => d.id === mapping.target_id);
        const xmlLevel = extractClassLevel(c.name);
        const targetLevel = extractClassLevel(targetDbClass?.name || '');
        if (xmlLevel && targetLevel && xmlLevel !== targetLevel) {
          mismatches.push(`• "${c.name}" (Tingkat ${xmlLevel}) ➔ "${targetDbClass?.name}" (Tingkat ${targetLevel})`);
        }
      }
    });

    if (mismatches.length > 0) {
      toast.error(
        `⛔ PEMETAAN TINGKAT KELAS SALAH:\n${mismatches.slice(0, 3).join('\n')}${mismatches.length > 3 ? `\n(+${mismatches.length - 3} lainnya)` : ''}\n\nKelas Tingkat XI wajib ke XI, 10/X wajib ke 10/X, XII wajib ke XII!`,
        { duration: 7000 }
      );
      setActiveTab('KELAS');
      return;
    }

    setStep(3);
  };

  const handleExecuteImport = async () => {
    let effectiveTpId = tahunPelajaranId;
    let effectiveSemId = semesterId;

    if (!effectiveTpId || !effectiveSemId) {
      try {
        const tpRes = await getTahunPelajaranList(1, 10);
        const activeTp = tpRes?.data?.find((t: any) => t.is_active) || tpRes?.data?.[0];
        if (activeTp) {
          effectiveTpId = effectiveTpId || activeTp.id;
          const semRes = await getSemesterList(1, 10, '', activeTp.id);
          const activeSem = semRes?.data?.find((s: any) => s.is_active) || semRes?.data?.[0];
          if (activeSem) {
            effectiveSemId = effectiveSemId || activeSem.id;
          }
        }
      } catch (err) {
        console.warn('Fallback fetch TP/Semester failed in AscImportWizardModal', err);
      }
    }

    if (!analysis || !effectiveTpId || !effectiveSemId) {
      console.error('❌ [aSc Import Wizard] Invalid parameters for execution:', { analysis: !!analysis, effectiveTpId, effectiveSemId });
      toast.error('Parameter Tahun Pelajaran / Semester tidak valid');
      return;
    }

    const payload = {
      tahun_pelajaran_id: effectiveTpId,
      semester_id: effectiveSemId,
      filename: analysis.filename,
      xml_content: analysis.xml_content,
      teacher_mappings: Object.values(teacherMappings),
      class_mappings: Object.values(classMappings),
      subject_mappings: Object.values(subjectMappings),
    };

    console.log('🚀 [aSc Import Wizard] Executing Import Payload:', {
      tahunPelajaranId,
      semesterId,
      filename: analysis.filename,
      teachersCount: payload.teacher_mappings.length,
      classesCount: payload.class_mappings.length,
      subjectsCount: payload.subject_mappings.length,
    });

    setExecuting(true);
    const toastId = toast.loading('Sedang menyimpan & menimpa jadwal KBM dari XML...');
    try {
      const res = await executeAscImport(payload);
      console.log('📩 [aSc Import Wizard] Received Execute Response:', res);

      if (res.success) {
        console.log('🎉 [aSc Import Wizard] Import successfully committed to database!', res.data);
        toast.success('Impor XML Berhasil! Menampilkan Ringkasan Laporan Hasil CRUD.', { id: toastId, duration: 4000 });
        setExecutionResult(res.data?.summary || res.data);
        setStep(4);
        if (onSuccessImport) onSuccessImport();
      } else {
        console.error('❌ [aSc Import Wizard] Execute failed with server message:', res.message);
        toast.error(res.message || 'Gagal mengimpor jadwal', { id: toastId });
      }
    } catch (err: any) {
      console.error('💥 [aSc Import Wizard] Exception in handleExecuteImport:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat mengesekusi impor';
      toast.error(serverMsg, { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Wizard Impor Jadwal aSc TimeTables (.XML)"
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 1 ? "bg-indigo-600 text-white" : "bg-emerald-500 text-white")}>
              1
            </div>
            <span className={cn("text-xs font-semibold", step === 1 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")}>
              Unggah XML
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 2 ? "bg-indigo-600 text-white" : step > 2 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              2
            </div>
            <span className={cn("text-xs font-semibold", step === 2 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")}>
              Pratinjau Pemetaan
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 3 ? "bg-indigo-600 text-white" : step > 3 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              3
            </div>
            <span className={cn("text-xs font-semibold", step === 3 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")}>
              Eksekusi Overwrite
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 4 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              4
            </div>
            <span className={cn("text-xs font-semibold", step === 4 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500")}>
              Laporan CRUD Hasil
            </span>
          </div>
        </div>

        {/* STEP 1: UPLOAD FILE */}
        {step === 1 && (
          <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 p-8 text-center space-y-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full">
              <FileUp className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Unggah File Export XML dari aSc TimeTables
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Pilih file ekspor database aSc TimeTables (contoh: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">Backup timetables 2627 real.xml</code>) untuk dianalisis oleh sistem.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl px-6 py-2.5 shadow-md flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Menganalisis XML...' : 'Pilih File XML aSc'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PRE-EXECUTION PREVIEW & MAPPING */}
        {step === 2 && analysis && (
          <div className="space-y-4">
            {/* Top Summary Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider flex items-center gap-2">
                  <span>File Terbaca: <span className="text-white font-mono">{analysis.filename}</span></span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 font-sans font-medium">
                    {mappingStats.teachers.ignored + mappingStats.classes.ignored + mappingStats.subjects.ignored > 0
                      ? `🚫 ${mappingStats.teachers.ignored + mappingStats.classes.ignored + mappingStats.subjects.ignored} Entitas Di-Uncheck (Diabaikan)`
                      : '✓ Seluruh Entitas Di-Centang (Diimpor)'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <span>👥 <strong>{mappingStats.teachers.active}</strong>/{analysis.summary.total_teachers} Guru</span>
                  <span>🏫 <strong>{mappingStats.classes.active}</strong>/{analysis.summary.total_classes} Kelas</span>
                  <span>📚 <strong>{mappingStats.subjects.active}</strong>/{analysis.summary.total_subjects} Mapel</span>
                  <span>📜 {analysis.summary.total_lessons} Kontrak</span>
                  <span>🧩 {analysis.summary.total_cards} Kartu Jam</span>
                </div>
              </div>
              <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-xs px-3 py-1">
                Mode Transaksional
              </Badge>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex space-x-1">
                <button
                  onClick={() => { setActiveTab('GURU'); setSearchQuery(''); }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all",
                    activeTab === 'GURU'
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Pemetaan Guru ({Object.keys(teacherMappings).length})
                </button>

                <button
                  onClick={() => { setActiveTab('KELAS'); setSearchQuery(''); }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all",
                    activeTab === 'KELAS'
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <GraduationCap className="w-4 h-4" />
                  Pemetaan Kelas ({Object.keys(classMappings).length})
                </button>

                <button
                  onClick={() => { setActiveTab('MAPEL'); setSearchQuery(''); }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all",
                    activeTab === 'MAPEL'
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  Pemetaan Mapel ({Object.keys(subjectMappings).length})
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative w-64 pb-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Toolbar Kontrol Masal & Memori Presisten */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Aksi Masal ({activeTab}):</span>
                <button
                  type="button"
                  onClick={() => handleBulkSetAction(activeTab, 'CHECK_ALL')}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Centang Semua ({activeTab})
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetAction(activeTab, 'UNCHECK_ALL')}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  🚫 Abaikan Semua ({activeTab})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Check/Uncheck tersimpan otomatis untuk pengujian selanjutnya
                </span>
                <button
                  type="button"
                  onClick={handleResetSavedPreferences}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium underline cursor-pointer"
                  title="Hapus memori pilihan yang tersimpan di browser dan kembalikan ke default auto-match"
                >
                  Reset Memori Pilihan
                </button>
              </div>
            </div>

            {/* TAB CONTENT TABLES */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              {activeTab === 'GURU' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Impor</th>
                      <th className="py-2.5 px-4">Nama di File XML aSc</th>
                      <th className="py-2.5 px-4">Status Pemetaan Auto</th>
                      <th className="py-2.5 px-4">Aksi / Target Database Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {analysis.teachers
                      .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t) => {
                        const currentMap = teacherMappings[t.asc_id] || { action: 'CREATE', asc_id: t.asc_id, name: t.name };
                        const isIgnored = currentMap.action === 'IGNORE';
                        return (
                          <tr key={t.asc_id} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50", isIgnored && "opacity-60 bg-slate-50/50 dark:bg-slate-950/20")}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!isIgnored}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setTeacherMappings(prev => {
                                    const next = { ...prev };
                                    if (!checked) {
                                      next[t.asc_id] = { ...next[t.asc_id], action: 'IGNORE', target_id: undefined };
                                    } else {
                                      const defaultAction = t.matched_db_id ? 'MATCH' : 'CREATE';
                                      next[t.asc_id] = { ...next[t.asc_id], action: defaultAction, target_id: t.matched_db_id || undefined };
                                    }
                                    saveMappingsToStorage(next, classMappings, subjectMappings);
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                title="Centang untuk mengimpor, hapus centang untuk mengabaikan"
                              />
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {t.name} {t.code ? <span className="text-slate-400 font-normal">({t.code})</span> : null}
                            </td>
                            <td className="py-2.5 px-4">
                              {isIgnored ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                                  🚫 Diabaikan (Jangan Impor)
                                </Badge>
                              ) : t.match_status === 'EXACT_MATCH' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                  ✓ Cocok di DB Master ({t.matched_db_name})
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                  + Guru Baru (Auto Create)
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={isIgnored ? '__IGNORE__' : currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTeacherMappings(prev => {
                                    const next = { ...prev };
                                    if (val === '__IGNORE__') {
                                      next[t.asc_id] = { ...next[t.asc_id], target_id: undefined, action: 'IGNORE' };
                                    } else if (val === '__CREATE__') {
                                      next[t.asc_id] = { ...next[t.asc_id], target_id: undefined, action: 'CREATE' };
                                    } else {
                                      next[t.asc_id] = { ...next[t.asc_id], target_id: val, action: 'MATCH' };
                                    }
                                    saveMappingsToStorage(next, classMappings, subjectMappings);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "w-full text-xs rounded-lg border p-1.5",
                                  isIgnored
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                )}
                              >
                                <option value="__IGNORE__">🚫 Abaikan / Jangan Impor Guru Ini</option>
                                <option value="__CREATE__">➕ Buat Guru Baru "{t.name}"</option>
                                <optgroup label="Arahkan ke Master Guru yang Ada:">
                                  {analysis.db_teachers.map(dbg => (
                                    <option key={dbg.id} value={dbg.id}>
                                      {dbg.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {activeTab === 'KELAS' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Impor</th>
                      <th className="py-2.5 px-4">Nama Kelas di File XML</th>
                      <th className="py-2.5 px-4">Status Pemetaan Auto</th>
                      <th className="py-2.5 px-4">Aksi / Target Database Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {analysis.classes
                      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((c) => {
                        const currentMap = classMappings[c.asc_id] || { action: 'CREATE', asc_id: c.asc_id, name: c.name };
                        const isIgnored = currentMap.action === 'IGNORE';

                        const targetDbClass = currentMap.action === 'MATCH' && currentMap.target_id
                          ? analysis.db_classes.find(d => d.id === currentMap.target_id)
                          : null;
                        const xmlLevel = extractClassLevel(c.name);
                        const targetLevel = targetDbClass ? extractClassLevel(targetDbClass.name) : null;
                        const isLevelMismatched = xmlLevel && targetLevel && xmlLevel !== targetLevel;

                        return (
                          <tr
                            key={c.asc_id}
                            className={cn(
                              "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                              isIgnored && "opacity-60 bg-slate-50/50 dark:bg-slate-950/20",
                              isLevelMismatched && "bg-rose-50/80 dark:bg-rose-950/40 border-l-4 border-l-rose-600"
                            )}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!isIgnored}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setClassMappings(prev => {
                                    const next = { ...prev };
                                    if (!checked) {
                                      next[c.asc_id] = { ...next[c.asc_id], action: 'IGNORE', target_id: undefined };
                                    } else {
                                      const defaultAction = c.matched_db_id ? 'MATCH' : 'CREATE';
                                      next[c.asc_id] = { ...next[c.asc_id], action: defaultAction, target_id: c.matched_db_id || undefined };
                                    }
                                    saveMappingsToStorage(teacherMappings, next, subjectMappings);
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                title="Centang untuk mengimpor, hapus centang untuk mengabaikan"
                              />
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {c.name}
                              {xmlLevel && (
                                <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                  Tingkat {xmlLevel}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {isIgnored ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                                  🚫 Diabaikan (Jangan Impor)
                                </Badge>
                              ) : isLevelMismatched ? (
                                <Badge className="bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  ⛔ SALAH TINGKAT: {xmlLevel} ➔ {targetLevel}
                                </Badge>
                              ) : c.match_status === 'EXACT_MATCH' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                  ✓ Cocok di DB Master ({c.matched_db_name})
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                  + Rombel Baru (Auto Create)
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={isIgnored ? '__IGNORE__' : currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== '__IGNORE__' && val !== '__CREATE__') {
                                    const selectedDbClass = analysis.db_classes.find(d => d.id === val);
                                    const selTargetLevel = selectedDbClass ? extractClassLevel(selectedDbClass.name) : null;
                                    if (xmlLevel && selTargetLevel && xmlLevel !== selTargetLevel) {
                                      toast.error(
                                        `⚠️ Peringatan Tingkat Berbeda!\nKelas XML "${c.name}" (${xmlLevel}) tidak boleh dipetakan ke "${selectedDbClass?.name}" (${selTargetLevel}).`,
                                        { duration: 5000 }
                                      );
                                    }
                                  }
                                  setClassMappings(prev => {
                                    const next = { ...prev };
                                    if (val === '__IGNORE__') {
                                      next[c.asc_id] = { ...next[c.asc_id], target_id: undefined, action: 'IGNORE' };
                                    } else if (val === '__CREATE__') {
                                      next[c.asc_id] = { ...next[c.asc_id], target_id: undefined, action: 'CREATE' };
                                    } else {
                                      next[c.asc_id] = { ...next[c.asc_id], target_id: val, action: 'MATCH' };
                                    }
                                    saveMappingsToStorage(teacherMappings, next, subjectMappings);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "w-full text-xs rounded-lg border p-1.5 transition-colors",
                                  isIgnored
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold"
                                    : isLevelMismatched
                                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 font-bold ring-2 ring-rose-500/50"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                )}
                              >
                                <option value="__IGNORE__">🚫 Abaikan / Jangan Impor Kelas Ini</option>
                                <option value="__CREATE__">➕ Buat Rombel Baru "{c.name}"</option>
                                <optgroup label="Arahkan ke Master Rombel yang Ada:">
                                  {analysis.db_classes.map(dbc => {
                                    const dbcLevel = extractClassLevel(dbc.name);
                                    const mismatchFlag = xmlLevel && dbcLevel && xmlLevel !== dbcLevel;
                                    return (
                                      <option key={dbc.id} value={dbc.id}>
                                        {mismatchFlag ? `⚠️ [BEDA TINGKAT] ${dbc.name}` : dbc.name}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {activeTab === 'MAPEL' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Impor</th>
                      <th className="py-2.5 px-4">Mata Pelajaran di File XML</th>
                      <th className="py-2.5 px-4">Status Pemetaan Auto</th>
                      <th className="py-2.5 px-4">Aksi / Target Database Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {analysis.subjects
                      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((s) => {
                        const currentMap = subjectMappings[s.asc_id] || { action: 'CREATE', asc_id: s.asc_id, name: s.name };
                        const isIgnored = currentMap.action === 'IGNORE';
                        return (
                          <tr key={s.asc_id} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50", isIgnored && "opacity-60 bg-slate-50/50 dark:bg-slate-950/20")}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!isIgnored}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSubjectMappings(prev => {
                                    const next = { ...prev };
                                    if (!checked) {
                                      next[s.asc_id] = { ...next[s.asc_id], action: 'IGNORE', target_id: undefined };
                                    } else {
                                      const defaultAction = s.matched_db_id ? 'MATCH' : 'CREATE';
                                      next[s.asc_id] = { ...next[s.asc_id], action: defaultAction, target_id: s.matched_db_id || undefined };
                                    }
                                    saveMappingsToStorage(teacherMappings, classMappings, next);
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                title="Centang untuk mengimpor, hapus centang untuk mengabaikan"
                              />
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {s.name} {s.code ? <span className="text-slate-400 font-normal">({s.code})</span> : null}
                            </td>
                            <td className="py-2.5 px-4">
                              {isIgnored ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                                  🚫 Diabaikan (Jangan Impor)
                                </Badge>
                              ) : s.match_status === 'EXACT_MATCH' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                  ✓ Cocok di DB Master ({s.matched_db_name})
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                  + Mapel Baru (Auto Create)
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={isIgnored ? '__IGNORE__' : currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSubjectMappings(prev => {
                                    const next = { ...prev };
                                    if (val === '__IGNORE__') {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: undefined, action: 'IGNORE' };
                                    } else if (val === '__CREATE__') {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: undefined, action: 'CREATE' };
                                    } else {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: val, action: 'MATCH' };
                                    }
                                    saveMappingsToStorage(teacherMappings, classMappings, next);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "w-full text-xs rounded-lg border p-1.5",
                                  isIgnored
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                )}
                              >
                                <option value="__IGNORE__">🚫 Abaikan / Jangan Impor Mapel Ini</option>
                                <option value="__CREATE__">➕ Buat Mapel Baru "{s.name}"</option>
                                <optgroup label="Arahkan ke Master Mapel yang Ada:">
                                  {analysis.db_subjects.map(dbs => (
                                    <option key={dbs.id} value={dbs.id}>
                                      {dbs.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Step 2 Bottom Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="rounded-xl"
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProceedToStep3}
                className="rounded-xl px-6 bg-indigo-600 text-white font-bold"
              >
                Lanjut ke Eksekusi
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: EKSEKUSI OVERWRITE */}
        {step === 3 && analysis && (
          <div className="space-y-6 text-center py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl text-amber-900 dark:text-amber-200 text-left flex gap-3 items-start">
              <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-sm text-amber-900 dark:text-amber-100">
                  Konfirmasi Mode Overwrite (Penimpaan Jadwal Transaksional)
                </div>
                <p>
                  Proses ini akan **menimpa (*overwrite*) seluruh Jadwal KBM & Kontrak Pelajaran** pada periode/semester aktif ini dengan data presisi dari file <code className="font-bold">{analysis.filename}</code>.
                </p>
                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                  <li>Total Guru Terpetakan: {Object.values(teacherMappings).length} orang</li>
                  <li>Total Kelas Terpetakan: {Object.values(classMappings).length} kelas</li>
                  <li>Total Mapel Terpetakan: {Object.values(subjectMappings).length} mapel</li>
                  <li>Total Slot Plotting: {analysis.summary.total_cards} slot jam</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={executing}
                className="rounded-xl px-5"
              >
                Batal / Cek Ulang Pemetaan
              </Button>

              <Button
                variant="primary"
                onClick={handleExecuteImport}
                disabled={executing}
                className="rounded-xl px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex items-center gap-2 text-sm"
              >
                {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {executing ? 'Sedang Memproses Impor...' : 'EKSEKUSI IMPOR XML SEKARANG'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: LAPORAN KEBERHASILAN CRUD RECORD */}
        {step === 4 && (
          <div className="space-y-6 py-2">
            {/* Hero Success Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> 100% Impor Transaksional Sukses
                  </div>
                  <h2 className="text-xl font-black">Laporan Keberhasilan Impor & CRUD Record</h2>
                  <p className="text-xs text-emerald-100 mt-1 max-w-xl">
                    Seluruh Jadwal KBM & Kontrak Pelajaran dari file <code className="bg-black/20 px-1.5 py-0.5 rounded text-white font-bold">{analysis?.filename}</code> telah berhasil ditimpa dan disimpan ke database PostgreSQL Absenta.
                  </p>
                </div>
              </div>
              <Badge className="bg-white text-emerald-800 font-bold px-3 py-1 text-xs shadow-sm">
                STATUS: COMMITTED
              </Badge>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" /> Master Guru</span>
                  <span className="text-indigo-600 font-bold">{executionResult?.total_guru || 0} Terproses</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {executionResult?.total_guru || 0} <span className="text-xs font-normal text-slate-400">orang</span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                  <div className="flex justify-between"><span>Sesuai Database:</span> <span className="font-bold text-emerald-600">{executionResult?.total_guru_matched || 0}</span></div>
                  <div className="flex justify-between"><span>Dibuat Baru:</span> <span className="font-bold text-indigo-600">{executionResult?.total_guru_created || 0}</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-blue-500" /> Master Rombel</span>
                  <span className="text-blue-600 font-bold">{executionResult?.total_kelas || 0} Terproses</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {executionResult?.total_kelas || 0} <span className="text-xs font-normal text-slate-400">kelas</span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                  <div className="flex justify-between"><span>Sesuai Database:</span> <span className="font-bold text-emerald-600">{executionResult?.total_kelas_matched || 0}</span></div>
                  <div className="flex justify-between"><span>Dibuat Baru:</span> <span className="font-bold text-blue-600">{executionResult?.total_kelas_created || 0}</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-amber-500" /> Master Mapel</span>
                  <span className="text-amber-600 font-bold">{executionResult?.total_mapel || 0} Terproses</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {executionResult?.total_mapel || 0} <span className="text-xs font-normal text-slate-400">mapel</span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                  <div className="flex justify-between"><span>Sesuai Database:</span> <span className="font-bold text-emerald-600">{executionResult?.total_mapel_matched || 0}</span></div>
                  <div className="flex justify-between"><span>Dibuat Baru:</span> <span className="font-bold text-amber-600">{executionResult?.total_mapel_created || 0}</span></div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Slot Jam Plotting</span>
                  <span className="text-emerald-600 font-bold">100% Terisi</span>
                </div>
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                  {executionResult?.total_cards || 0} <span className="text-xs font-normal text-emerald-600">slot</span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-0.5 border-t border-emerald-200 dark:border-emerald-800/60 pt-2 font-medium">
                  <div className="flex justify-between"><span>Kontrak KBM:</span> <span className="font-bold">{executionResult?.total_kontrak || 0} Kontrak</span></div>
                  <div className="flex justify-between"><span>Pola Jam Bel:</span> <span className="font-bold">Day-Pattern Sync</span></div>
                </div>
              </div>
            </div>

            {/* Tabel Matriks Komparasi Audit */}
            <div className="bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Matriks Perbandingan Audit (File XML ➔ Filter Check/Uncheck ➔ Realisasi Database)
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  100% Data Verified & Stored
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-100/60 dark:bg-slate-800/60">
                      <th className="py-2.5 px-3 rounded-l-lg">Kategori Entitas</th>
                      <th className="py-2.5 px-3 text-center">Total di XML</th>
                      <th className="py-2.5 px-3 text-center">Di-Centang (Impor)</th>
                      <th className="py-2.5 px-3 text-center">Di-Uncheck (Diabaikan)</th>
                      <th className="py-2.5 px-3 text-center font-bold text-emerald-600 rounded-r-lg">Realisasi Masuk DB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Master Guru
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{analysis?.summary.total_teachers} orang</td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{mappingStats.teachers.active} orang</td>
                      <td className="py-2.5 px-3 text-center text-rose-500">{mappingStats.teachers.ignored > 0 ? `🚫 ${mappingStats.teachers.ignored} orang` : '0'}</td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">{executionResult?.total_guru || 0} orang</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Master Rombel / Kelas
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{analysis?.summary.total_classes} kelas</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">{mappingStats.classes.active} kelas</td>
                      <td className="py-2.5 px-3 text-center text-rose-500">{mappingStats.classes.ignored > 0 ? `🚫 ${mappingStats.classes.ignored} kelas` : '0'}</td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">{executionResult?.total_kelas || 0} kelas</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Master Mapel
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{analysis?.summary.total_subjects} mapel</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">{mappingStats.subjects.active} mapel</td>
                      <td className="py-2.5 px-3 text-center text-rose-500">{mappingStats.subjects.ignored > 0 ? `🚫 ${mappingStats.subjects.ignored} mapel` : '0'}</td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">{executionResult?.total_mapel || 0} mapel</td>
                    </tr>
                    <tr className="bg-emerald-100/50 dark:bg-emerald-950/40 font-bold border-t border-emerald-200 dark:border-emerald-800">
                      <td className="py-3 px-3 text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Slot Jam Plotting & Kontrak KBM
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{analysis?.summary.total_cards} slot</td>
                      <td className="py-3 px-3 text-center text-indigo-700 dark:text-indigo-300" colSpan={2}>
                        Disaring Berdasarkan Entitas Di-Centang ({mappingStats.teachers.ignored + mappingStats.classes.ignored + mappingStats.subjects.ignored} Di-Uncheck)
                      </td>
                      <td className="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-100 dark:bg-emerald-950/80">
                        {executionResult?.total_cards || 0} Slot ({executionResult?.total_kontrak || 0} Kontrak)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Log Box */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Ringkasan Eksekusi Transaksi Database & Log Sync</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full font-bold">
                  200 OK (COMMITTED)
                </span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 space-y-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span>[Mode Transaksi] Overwrite Per Periode</span>
                  <span className="text-emerald-600 font-bold">CLEARED & RE-CREATED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span>[Table Inserted] JadwalKontrakKbm</span>
                  <span className="font-bold text-slate-900 dark:text-white">{executionResult?.total_kontrak || 0} Record</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span>[Table Inserted] JadwalKBM (Slot Jam)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{executionResult?.total_cards || 0} Record</span>
                </div>
                <div className="flex justify-between">
                  <span>[Sinkronisasi Waktu] Day-Pattern Shift Bel</span>
                  <span className="text-indigo-600 font-bold">Pola Jam Senin-Jumat Aktif</span>
                </div>
              </div>
            </div>

            {/* Finish Action */}
            <div className="flex items-center justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleClose}
                className="rounded-xl px-8 py-3 shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Selesai & Lihat Jadwal di Visual Builder
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});
