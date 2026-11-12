import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Layers,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  analyzeAscXml, 
  executeAscImport, 
  type AscAnalysisResult, 
  type EntityMapping,
  type LessonMappingInput
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

const extractClassJurusan = (name: string): string | null => {
  if (!name) return null;
  const match = name.match(/\b(TKRO|TKR|TBSM|TSM|TO|TE|TM|TPM|TP|TOI|TAV|TITL|TKJ|TJKT|RPL|PPLG|DKV|AKL|AK|MPLB|OTKP|BDP|PM|KUL|TBG|HTL|PHT|ATPH|APHP)\b/i);
  return match ? match[1].toUpperCase() : null;
};

// Deteksi potensi ketidaksesuaian Konsentrasi Keahlian / Jurusan
const isJurusanConflict = (xmlJurusan: string | null, targetDbClass: any): boolean => {
  if (!xmlJurusan || !targetDbClass) return false;
  const targetKode = (targetDbClass.jurusan_kode || '').toUpperCase();
  const targetNama = (targetDbClass.jurusan_nama || '').toUpperCase();
  if (!targetKode && !targetNama) return false; // Target belum memiliki Jurusan spesifik (Umum)

  // Keluarga alias vokasi SMK (misal: TO di kelas 10 bercabang ke TKRO/TBSM di kelas 11-12)
  const aliasFamilies: Record<string, string[]> = {
    TO: ['TO', 'TKRO', 'TKR', 'TBSM', 'TSM', 'OTOMOTIF'],
    TKRO: ['TKRO', 'TKR', 'TO', 'OTOMOTIF'],
    TBSM: ['TBSM', 'TSM', 'TO', 'MOTOR'],
    TE: ['TE', 'TOI', 'TAV', 'TITL', 'ELEKTRONIKA'],
    TOI: ['TOI', 'TE', 'OTOMASI'],
    TAV: ['TAV', 'TE', 'AUDIO'],
    TITL: ['TITL', 'TE', 'LISTRIK'],
    TM: ['TM', 'TPM', 'TP', 'MESIN'],
    TPM: ['TPM', 'TP', 'TM', 'PEMESINAN', 'MESIN'],
    TJKT: ['TJKT', 'TKJ', 'JARINGAN'],
    TKJ: ['TKJ', 'TJKT', 'JARINGAN'],
    PPLG: ['PPLG', 'RPL', 'PERANGKAT LUNAK'],
    RPL: ['RPL', 'PPLG', 'PERANGKAT LUNAK'],
    DKV: ['DKV', 'DESAIN', 'MULTIMEDIA'],
    AKL: ['AKL', 'AK', 'AKUNTANSI'],
    MPLB: ['MPLB', 'OTKP', 'PERKANTORAN'],
    KUL: ['KUL', 'TBG', 'KULINER', 'BOGA'],
    HTL: ['HTL', 'PHT', 'HOTEL', 'PERHOTELAN'],
  };

  const allowed = aliasFamilies[xmlJurusan] || [xmlJurusan];
  const matchesKode = targetKode && allowed.some(a => targetKode.includes(a) || a.includes(targetKode));
  const matchesNama = targetNama && allowed.some(a => targetNama.includes(a));

  return !matchesKode && !matchesNama;
};

interface SavedMappingPref {
  action: 'MATCH' | 'CREATE' | 'IGNORE' | 'UNIT_OF_PARENT';
  target_id?: string;
  parent_mapel_id?: string;
  unit_name?: string;
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
      const entry: SavedMappingPref = { action: t.action, target_id: t.target_id };
      data.teachers[t.name.toLowerCase().trim()] = entry;
      data.teachers[t.asc_id] = entry;
    });
    Object.values(classes).forEach(c => {
      const entry: SavedMappingPref = { action: c.action, target_id: c.target_id };
      data.classes[c.name.toLowerCase().trim()] = entry;
      data.classes[c.asc_id] = entry;
    });
    Object.values(subjects).forEach(s => {
      const entry: SavedMappingPref = {
        action: s.action,
        target_id: s.target_id,
        parent_mapel_id: s.parent_mapel_id,
        unit_name: s.unit_name,
      };
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

  // Target Academic Context Mapping State
  const [targetTpId, setTargetTpId] = useState<string>(tahunPelajaranId || '');
  const [targetSemId, setTargetSemId] = useState<string>(semesterId || '');

  // Synchronize props when modal opens or props update
  useEffect(() => {
    if (isOpen) {
      if (tahunPelajaranId) setTargetTpId(tahunPelajaranId);
      if (semesterId) setTargetSemId(semesterId);
    }
  }, [isOpen, tahunPelajaranId, semesterId]);

  // Fetch list of Tahun Pelajaran for academic context mapping
  const { data: tpListRes, isLoading: loadingTp } = useQuery({
    queryKey: ['academic-tp-list-for-asc'],
    queryFn: () => getTahunPelajaranList(1, 50),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const tpList = useMemo(() => tpListRes?.data || [], [tpListRes]);

  // Auto-select active TP if none chosen
  useEffect(() => {
    if (isOpen && !targetTpId && tpList.length > 0) {
      const activeTp = tpList.find((t: any) => t.is_active) || tpList[0];
      if (activeTp) {
        setTargetTpId(activeTp.id);
      }
    }
  }, [isOpen, targetTpId, tpList]);

  // Fetch list of Semesters for selected Tahun Pelajaran
  const { data: semListRes, isLoading: loadingSem } = useQuery({
    queryKey: ['academic-sem-list-for-asc', targetTpId],
    queryFn: () => (targetTpId ? getSemesterList(1, 50, '', targetTpId) : Promise.resolve({ data: [] } as any)),
    enabled: isOpen && Boolean(targetTpId),
    staleTime: 5 * 60 * 1000,
  });
  const semList = useMemo(() => (semListRes as any)?.data || [], [semListRes]);

  // Auto-select active Semester for chosen TP if not matching
  useEffect(() => {
    if (isOpen && semList.length > 0) {
      const match = semList.find((s: any) => s.id === targetSemId);
      if (!match) {
        const activeSem = semList.find((s: any) => s.is_active) || semList[0];
        if (activeSem) {
          setTargetSemId(activeSem.id);
        }
      }
    }
  }, [isOpen, semList, targetSemId]);

  const selectedTp = useMemo(() => tpList.find((t: any) => t.id === targetTpId), [tpList, targetTpId]);
  const selectedSem = useMemo(() => semList.find((s: any) => s.id === targetSemId), [semList, targetSemId]);
  const targetTpName = selectedTp?.tahun || 'Memuat...';
  const targetSemName = selectedSem?.nama_semester || 'Memuat...';

  // Tab State in Step 2
  const [activeTab, setActiveTab] = useState<'GURU' | 'KELAS' | 'MAPEL' | 'DELEGASI'>('GURU');
  const [searchQuery, setSearchQuery] = useState('');

  // Editable User Mappings
  const [teacherMappings, setTeacherMappings] = useState<Record<string, EntityMapping>>({});
  const [classMappings, setClassMappings] = useState<Record<string, EntityMapping>>({});
  const [subjectMappings, setSubjectMappings] = useState<Record<string, EntityMapping>>({});
  const [lessonMappings, setLessonMappings] = useState<Record<string, LessonMappingInput>>({});
  const [onlyMappedLessons, setOnlyMappedLessons] = useState(false);

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
    setLessonMappings({});
    setOnlyMappedLessons(false);
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

    if (!targetTpId || !targetSemId) {
      toast.error('Silakan tentukan Tahun Pelajaran dan Semester sasaran terlebih dahulu.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Memproses & menganalisis file XML aSc TimeTables...');
    try {
      console.log('⏳ [aSc Import Wizard] Sending XML file to backend /api/academic/asc-importer/analyze ...');
      const res = await analyzeAscXml(file, targetTpId, targetSemId);
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

        // Initialize Subject Mappings (prioritize DB saved history / suggested UNIT_OF_PARENT, then localStorage)
        const initSubjects: Record<string, EntityMapping> = {};
        res.data.subjects.forEach(s => {
          const keyName = s.name.toLowerCase().trim();
          const savedPref = saved.subjects[s.asc_id] || saved.subjects[keyName];
          if (s.saved_action === 'UNIT_OF_PARENT' && (s.saved_parent_mapel_id || s.saved_target_id)) {
            initSubjects[s.asc_id] = {
              asc_id: s.asc_id,
              name: s.name,
              code: s.code,
              action: 'UNIT_OF_PARENT',
              target_id: s.saved_parent_mapel_id || s.saved_target_id || undefined,
              parent_mapel_id: s.saved_parent_mapel_id || s.saved_target_id || undefined,
              unit_name: s.saved_unit_name || s.suggested_unit_name || s.name,
            };
          } else if (savedPref) {
            initSubjects[s.asc_id] = {
              asc_id: s.asc_id,
              name: s.name,
              code: s.code,
              target_id: savedPref.target_id || (s.matched_db_id || undefined),
              parent_mapel_id: savedPref.parent_mapel_id,
              unit_name: savedPref.unit_name,
              action: savedPref.action,
            };
          } else if (s.suggested_parent_mapel_id && !s.matched_db_id) {
            initSubjects[s.asc_id] = {
              asc_id: s.asc_id,
              name: s.name,
              code: s.code,
              action: 'UNIT_OF_PARENT',
              target_id: s.suggested_parent_mapel_id,
              parent_mapel_id: s.suggested_parent_mapel_id,
              unit_name: s.suggested_unit_name || s.name,
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

        // Initialize Lesson Mappings from backend DB history
        const initLessons: Record<string, LessonMappingInput> = {};
        (res.data.lessons || []).forEach(l => {
          if (l.saved_lesson_mapping) {
            initLessons[l.asc_lesson_id] = { ...l.saved_lesson_mapping };
          }
        });
        setLessonMappings(initLessons);

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

  const handleBulkSetAction = (tab: 'GURU' | 'KELAS' | 'MAPEL' | 'DELEGASI', action: 'CHECK_ALL' | 'UNCHECK_ALL') => {
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
    const jurusanMismatches: string[] = [];

    analysis.classes.forEach(c => {
      const mapping = classMappings[c.asc_id];
      if (mapping && mapping.action === 'MATCH' && mapping.target_id) {
        const targetDbClass = analysis.db_classes.find(d => d.id === mapping.target_id);
        const xmlLevel = extractClassLevel(c.name);
        const targetLevel = targetDbClass?.tingkat
          ? (targetDbClass.tingkat === 10 ? 'X' : targetDbClass.tingkat === 11 ? 'XI' : 'XII')
          : extractClassLevel(targetDbClass?.nama_kelas || targetDbClass?.name || '');
        if (xmlLevel && targetLevel && xmlLevel !== targetLevel) {
          mismatches.push(`• "${c.name}" (Tingkat ${xmlLevel}) ➔ "${targetDbClass?.name}" (Tingkat ${targetLevel})`);
        }

        const xmlJurusan = c.detected_jurusan || extractClassJurusan(c.name);
        if (xmlJurusan && targetDbClass && isJurusanConflict(xmlJurusan, targetDbClass)) {
          const targetJurusanLabel = targetDbClass.jurusan_nama || targetDbClass.jurusan_kode || 'Jurusan Lain';
          jurusanMismatches.push(`• "${c.name}" (Jurusan ${xmlJurusan}) ➔ "${targetDbClass.name}" (Jurusan ${targetJurusanLabel})`);
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

    if (jurusanMismatches.length > 0) {
      toast.error(
        `⛔ PEMETAAN JURUSAN / KONSENTRASI KEAHLIAN SALAH:\n${jurusanMismatches.slice(0, 3).join('\n')}${jurusanMismatches.length > 3 ? `\n(+${jurusanMismatches.length - 3} lainnya)` : ''}\n\nPastikan rombel dipetakan ke Konsentrasi Keahlian yang tepat sesuai modul Staging Master!`,
        { duration: 7000 }
      );
      setActiveTab('KELAS');
      return;
    }

    setStep(3);
  };

  const handleExecuteImport = async () => {
    let effectiveTpId = targetTpId || tahunPelajaranId;
    let effectiveSemId = targetSemId || semesterId;

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
      lesson_mappings: Object.values(lessonMappings),
    };

    console.log('🚀 [aSc Import Wizard] Executing Import Payload:', {
      tahun_pelajaran_id: effectiveTpId,
      semester_id: effectiveSemId,
      targetTpName,
      targetSemName,
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
      maxWidth="full"
      className="lg:max-w-[98vw] lg:h-[95vh] lg:max-h-[95vh]"
      contentClassName="lg:max-h-[calc(95vh-76px)]"
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

        {/* STEP 1: UPLOAD FILE & KONTEKS AKADEMIK */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Konteks Akademik Sasaran Impor Card */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Konteks Akademik Sasaran Impor
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih Tahun Pelajaran & Semester target tempat jadwal KBM hasil impor XML ini akan diterapkan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pelajaran Target
                  </label>
                  <select
                    value={targetTpId}
                    onChange={(e) => {
                      setTargetTpId(e.target.value);
                      setTargetSemId('');
                    }}
                    disabled={loadingTp}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {tpList.length === 0 ? (
                      <option value="">Memuat Tahun Pelajaran...</option>
                    ) : (
                      tpList.map((tp: any) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.tahun} {tp.is_active ? '★ (Aktif)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Semester Target
                  </label>
                  <select
                    value={targetSemId}
                    onChange={(e) => setTargetSemId(e.target.value)}
                    disabled={loadingSem || !targetTpId}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {semList.length === 0 ? (
                      <option value="">
                        {!targetTpId ? 'Pilih Tahun Pelajaran dahulu' : 'Tidak ada data semester'}
                      </option>
                    ) : (
                      semList.map((sem: any) => (
                        <option key={sem.id} value={sem.id}>
                          {sem.nama_semester} {sem.is_active ? '★ (Aktif)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-3 py-2 text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Target Impor Aktif: <strong className="font-bold underline">{targetTpName} • {targetSemName}</strong>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Dapat disesuaikan sebelum file XML dianalisis
                </span>
              </div>
            </div>

            {/* File Upload Box */}
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
                  disabled={loading || !targetTpId || !targetSemId}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? 'Menganalisis XML...' : 'Pilih File XML aSc'}
                </Button>
              </div>
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
              <div className="flex flex-col items-end gap-1.5">
                <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-xs px-3 py-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  Target: {targetTpName} • {targetSemName}
                </Badge>
                <span className="text-[10px] text-slate-300 font-medium">Mode Transaksional</span>
              </div>
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

                <button
                  onClick={() => { setActiveTab('DELEGASI'); setSearchQuery(''); }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all relative",
                    activeTab === 'DELEGASI'
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Layers className="w-4 h-4" />
                  <span>Delegasi &amp; Team-Teaching</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                    Opsional
                  </span>
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
            {activeTab !== 'DELEGASI' && (
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
            )}

            {/* TAB CONTENT TABLES */}
            <div className="max-h-80 lg:max-h-[calc(95vh-360px)] min-h-[320px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
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
                        const xmlJurusan = c.detected_jurusan || extractClassJurusan(c.name);

                        // Deteksi jika rombel ini memiliki nama kembar multi-jurusan di database master (seperti X TE 3 di TOI & TAV)
                        const normCName = (c.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        const twinCandidates = analysis.db_classes.filter(dbc => {
                          const normDbName = (dbc.nama_kelas || dbc.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                          return normDbName === normCName;
                        });

                        const targetLevel = targetDbClass
                          ? (targetDbClass.tingkat ? (targetDbClass.tingkat === 10 ? 'X' : targetDbClass.tingkat === 11 ? 'XI' : 'XII') : extractClassLevel(targetDbClass.nama_kelas || targetDbClass.name))
                          : null;
                        const isLevelMismatched = xmlLevel && targetLevel && xmlLevel !== targetLevel;
                        const isJurusanMismatched = xmlJurusan && targetDbClass && isJurusanConflict(xmlJurusan, targetDbClass);

                        return (
                          <tr
                            key={c.asc_id}
                            className={cn(
                              "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                              isIgnored && "opacity-60 bg-slate-50/50 dark:bg-slate-950/20",
                              (isLevelMismatched || isJurusanMismatched) && "bg-rose-50/80 dark:bg-rose-950/40 border-l-4 border-l-rose-600"
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{c.name}</span>
                                {xmlLevel && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Tingkat {xmlLevel}
                                  </span>
                                )}
                              </div>
                              {xmlJurusan && (
                                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>Konsentrasi: <strong>{xmlJurusan}</strong></span>
                                </div>
                              )}
                              {twinCandidates.length > 1 && (
                                <div className="mt-1 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 flex items-center gap-1 font-medium leading-tight">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                  <span>Terdapat {twinCandidates.length} Jurusan di DB ({twinCandidates.map(t => `${t.jurusan_kode || t.jurusan_nama || 'Umum'}${t.is_active === false ? ' [Nonaktif]' : ''}`).join(', ')}). Pastikan memilih yang sesuai periode ini.</span>
                                </div>
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
                              ) : isJurusanMismatched ? (
                                <Badge className="bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  ⛔ BEDA JURUSAN: {xmlJurusan} ➔ {targetDbClass?.jurusan_kode || targetDbClass?.jurusan_nama || 'Lain'}
                                </Badge>
                              ) : c.match_status === 'EXACT_MATCH' ? (
                                <div className="space-y-0.5">
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                    ✓ Cocok di DB Master
                                  </Badge>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-56" title={c.matched_db_name || ''}>
                                    {c.matched_db_name}
                                  </div>
                                </div>
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
                                    const selTargetLevel = selectedDbClass?.tingkat
                                      ? (selectedDbClass.tingkat === 10 ? 'X' : selectedDbClass.tingkat === 11 ? 'XI' : 'XII')
                                      : extractClassLevel(selectedDbClass?.nama_kelas || selectedDbClass?.name || '');
                                    if (xmlLevel && selTargetLevel && xmlLevel !== selTargetLevel) {
                                      toast.error(
                                        `⚠️ Peringatan Tingkat Berbeda!\nKelas XML "${c.name}" (${xmlLevel}) tidak boleh dipetakan ke "${selectedDbClass?.name}" (${selTargetLevel}).`,
                                        { duration: 5000 }
                                      );
                                    }
                                    if (xmlJurusan && selectedDbClass && isJurusanConflict(xmlJurusan, selectedDbClass)) {
                                      toast.error(
                                        `⚠️ Peringatan Konsentrasi Keahlian!\nKelas XML "${c.name}" (${xmlJurusan}) diarahkan ke "${selectedDbClass.name}" (${selectedDbClass.jurusan_nama || selectedDbClass.jurusan_kode || 'Lain'}). Pastikan jurusan sesuai!`,
                                        { duration: 6000 }
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
                                    : (isLevelMismatched || isJurusanMismatched)
                                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 font-bold ring-2 ring-rose-500/50"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                )}
                              >
                                <option value="__IGNORE__">🚫 Abaikan / Jangan Impor Kelas Ini</option>
                                <option value="__CREATE__">➕ Buat Rombel Baru "{c.name}" {xmlJurusan ? `(Jurusan ${xmlJurusan})` : ''}</option>
                                <optgroup label="Arahkan ke Master Rombel yang Ada:">
                                  {analysis.db_classes.map(dbc => {
                                    const dbcLevel = dbc.tingkat
                                      ? (dbc.tingkat === 10 ? 'X' : dbc.tingkat === 11 ? 'XI' : 'XII')
                                      : extractClassLevel(dbc.nama_kelas || dbc.name);
                                    const levelConflict = xmlLevel && dbcLevel && xmlLevel !== dbcLevel;
                                    const jurConflict = xmlJurusan && isJurusanConflict(xmlJurusan, dbc);
                                    const jurLabel = dbc.jurusan_nama ? ` - ${dbc.jurusan_nama}` : dbc.jurusan_kode ? ` - ${dbc.jurusan_kode}` : '';
                                    const studentBadge = (dbc.total_siswa_aktif && dbc.total_siswa_aktif > 0) ? ` • ${dbc.total_siswa_aktif} Siswa` : '';
                                    const activeLabel = dbc.is_active === false ? ' [Nonaktif]' : '';

                                    let prefix = '';
                                    if (levelConflict) prefix = '⚠️ [BEDA TINGKAT] ';
                                    else if (jurConflict) prefix = '⚠️ [BEDA JURUSAN] ';

                                    return (
                                      <option key={dbc.id} value={dbc.id}>
                                        {prefix}{dbc.nama_kelas || dbc.name}{jurLabel}{studentBadge}{activeLabel}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              </select>

                              {/* Live Target Context Preview Strip */}
                              {targetDbClass && !isIgnored && (
                                <div className="mt-1 text-[10px] flex items-center justify-between text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                                  <span>Tingkat: <strong className="text-slate-700 dark:text-slate-200">{targetLevel || '-'}</strong></span>
                                  <span>Konsentrasi: <strong className="text-indigo-600 dark:text-indigo-400">{targetDbClass.jurusan_nama || targetDbClass.jurusan_kode || 'Umum'}</strong>{targetDbClass.is_active === false ? ' [Nonaktif]' : ''}</span>
                                </div>
                              )}
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
                        const isUnitOfParent = currentMap.action === 'UNIT_OF_PARENT';
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
                              ) : isUnitOfParent ? (
                                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">
                                  🔗 Unit dari Mapel Induk Dapodik
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
                            <td className="py-2.5 px-4 space-y-2">
                              <select
                                value={
                                  isIgnored
                                    ? '__IGNORE__'
                                    : isUnitOfParent
                                    ? '__UNIT_OF_PARENT__'
                                    : currentMap.target_id || '__CREATE__'
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSubjectMappings(prev => {
                                    const next = { ...prev };
                                    if (val === '__IGNORE__') {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: undefined, parent_mapel_id: undefined, action: 'IGNORE' };
                                    } else if (val === '__CREATE__') {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: undefined, parent_mapel_id: undefined, action: 'CREATE' };
                                    } else if (val === '__UNIT_OF_PARENT__') {
                                      const fallbackParentId =
                                        currentMap.parent_mapel_id ||
                                        s.suggested_parent_mapel_id ||
                                        analysis.db_subjects[0]?.id;
                                      next[s.asc_id] = {
                                        ...next[s.asc_id],
                                        action: 'UNIT_OF_PARENT',
                                        parent_mapel_id: fallbackParentId,
                                        target_id: fallbackParentId,
                                        unit_name: currentMap.unit_name || s.suggested_unit_name || s.name,
                                      };
                                    } else {
                                      next[s.asc_id] = { ...next[s.asc_id], target_id: val, parent_mapel_id: undefined, action: 'MATCH' };
                                    }
                                    saveMappingsToStorage(teacherMappings, classMappings, next);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "w-full text-xs rounded-lg border p-1.5",
                                  isIgnored
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold"
                                    : isUnitOfParent
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 font-bold"
                                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                )}
                              >
                                <option value="__IGNORE__">🚫 Abaikan / Jangan Impor Mapel Ini</option>
                                <option value="__CREATE__">➕ Buat Mapel Baru "{s.name}"</option>
                                <option value="__UNIT_OF_PARENT__">🔗 Petakan sebagai Unit dari Mapel Induk (Kolaborasi)</option>
                                <optgroup label="Arahkan Langsung ke Master Mapel yang Ada:">
                                  {analysis.db_subjects.map(dbs => (
                                    <option key={dbs.id} value={dbs.id}>
                                      {dbs.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>

                              {isUnitOfParent && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                                  <div>
                                    <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-0.5">
                                      Mapel Induk Dapodik:
                                    </label>
                                    <select
                                      value={currentMap.parent_mapel_id || currentMap.target_id || ''}
                                      onChange={(e) => {
                                        const pid = e.target.value;
                                        setSubjectMappings(prev => {
                                          const next = {
                                            ...prev,
                                            [s.asc_id]: {
                                              ...prev[s.asc_id],
                                              action: 'UNIT_OF_PARENT' as const,
                                              parent_mapel_id: pid,
                                              target_id: pid,
                                            },
                                          };
                                          saveMappingsToStorage(teacherMappings, classMappings, next);
                                          return next;
                                        });
                                      }}
                                      className="w-full text-[11px] rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 p-1 text-slate-800 dark:text-slate-100"
                                    >
                                      <option value="">-- Pilih Mapel Induk --</option>
                                      {analysis.db_subjects.map(dbs => (
                                        <option key={dbs.id} value={dbs.id}>
                                          {dbs.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-0.5">
                                      Nama Unit / Sub-Materi:
                                    </label>
                                    <input
                                      type="text"
                                      value={currentMap.unit_name || ''}
                                      placeholder="Misal: CNC, Bubut, Kelistrikan"
                                      onChange={(e) => {
                                        const uName = e.target.value;
                                        setSubjectMappings(prev => {
                                          const next = {
                                            ...prev,
                                            [s.asc_id]: {
                                              ...prev[s.asc_id],
                                              unit_name: uName,
                                            },
                                          };
                                          saveMappingsToStorage(teacherMappings, classMappings, next);
                                          return next;
                                        });
                                      }}
                                      className="w-full text-[11px] rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 p-1 text-slate-800 dark:text-slate-100"
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {activeTab === 'DELEGASI' && (
                <div className="space-y-3 p-2">
                  {/* Banner Panduan Ramah & Status Otomatis */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm">
                            Tab Ini Bersifat Opsional — Seluruh {analysis.lessons?.length || 0} Pelajaran Sudah Otomatis 100% Siap
                          </h4>
                          <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-2 py-0.5 rounded-full">
                            Default Otomatis Siap
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          Secara default, seluruh jadwal KBM di XML <strong>otomatis mengajar sesuai Guru SK (Dapodik)</strong> hasil pemetaan Anda di Tab Guru.
                          Jika seluruh guru mengajar sesuai jadwal XML, <strong>Anda tidak perlu mengubah apapun di tab ini dan bisa langsung klik tombol &ldquo;Lanjut ke Eksekusi&rdquo;</strong> di bawah.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          💡 <em>Gunakan tabel di bawah hanya jika ada kebutuhan khusus:</em>
                          <span className="ml-1 text-slate-700 dark:text-slate-200 font-semibold">1) Mendelegasikan jam ke guru pengganti (Inval)</span>, atau <span className="text-slate-700 dark:text-slate-200 font-semibold">2) Membagi unit materi pelajaran team-teaching (multi-guru)</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setOnlyMappedLessons(false)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                          !onlyMappedLessons
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        )}
                      >
                        Semua Pelajaran ({analysis.lessons?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => setOnlyMappedLessons(true)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                          onlyMappedLessons
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                        )}
                      >
                        <span>Hanya Multi-Guru / Perlu Penyesuaian</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          onlyMappedLessons ? "bg-white/20 text-white" : "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold"
                        )}>
                          {(analysis.lessons || []).filter(l => {
                            const lm = lessonMappings[l.asc_lesson_id];
                            const sMap = subjectMappings[l.subject_asc_id];
                            return Boolean(lm?.guru_pelaksana_id || lm?.sk_guru_id || lm?.unit_name || l.is_team_teaching || sMap?.action === 'UNIT_OF_PARENT');
                          }).length}
                        </span>
                      </button>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500">
                      Kosongkan dropdown untuk mengikuti Guru SK hasil pemetaan
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Pelajaran XML (Mapel / Kelas / JP)</th>
                        <th className="py-2 px-3">Guru XML</th>
                        <th className="py-2 px-3">Guru SK Resmi (Dapodik)</th>
                        <th className="py-2 px-3">Pengajar Pelaksana (Delegasi)</th>
                        <th className="py-2 px-3">Unit / Sub-Materi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {(analysis.lessons || [])
                        .filter((l) => {
                          const sMap = subjectMappings[l.subject_asc_id];
                          if (sMap?.action === 'IGNORE') return false;
                          const q = searchQuery.trim().toLowerCase();
                          if (q) {
                            const hay = `${l.subject_name} ${l.class_names.join(' ')} ${l.teacher_names.join(' ')}`.toLowerCase();
                            if (!hay.includes(q)) return false;
                          }
                          if (onlyMappedLessons) {
                            const lm = lessonMappings[l.asc_lesson_id];
                            const hasCustom = Boolean(lm?.guru_pelaksana_id || lm?.sk_guru_id || lm?.unit_name || l.is_team_teaching || sMap?.action === 'UNIT_OF_PARENT');
                            if (!hasCustom) return false;
                          }
                          return true;
                        })
                        .slice(0, 150)
                        .map((l) => {
                          const lm = lessonMappings[l.asc_lesson_id] || { asc_lesson_id: l.asc_lesson_id };
                          const sMap = subjectMappings[l.subject_asc_id];
                          const defaultUnitName = sMap?.action === 'UNIT_OF_PARENT' ? (sMap.unit_name || sMap.name) : '';
                          return (
                            <tr key={l.asc_lesson_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-800 dark:text-slate-100">{l.subject_name}</div>
                                <div className="text-[10px] text-slate-500">
                                  {l.class_names.join(', ') || '-'} • {l.periods_per_week} JP
                                  {l.is_team_teaching && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                      Multi-Guru
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                {l.teacher_names.join(', ') || '-'}
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={lm.sk_guru_id || ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setLessonMappings(prev => ({
                                      ...prev,
                                      [l.asc_lesson_id]: { ...lm, asc_lesson_id: l.asc_lesson_id, sk_guru_id: val },
                                    }));
                                  }}
                                  className="w-full text-[11px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 font-medium"
                                >
                                  <option value="">✓ Otomatis (Sesuai Guru XML)</option>
                                  {analysis.db_teachers.map(dbt => (
                                    <option key={dbt.id} value={dbt.id}>{dbt.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={lm.guru_pelaksana_id || ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setLessonMappings(prev => ({
                                      ...prev,
                                      [l.asc_lesson_id]: { ...lm, asc_lesson_id: l.asc_lesson_id, guru_pelaksana_id: val },
                                    }));
                                  }}
                                  className="w-full text-[11px] rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30 p-1.5 font-medium"
                                >
                                  <option value="">✓ Otomatis (Sama dengan Guru SK)</option>
                                  {analysis.db_teachers.map(dbt => (
                                    <option key={dbt.id} value={dbt.id}>{dbt.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={lm.unit_name ?? defaultUnitName}
                                  placeholder={defaultUnitName || 'Unit / Sub-materi'}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setLessonMappings(prev => ({
                                      ...prev,
                                      [l.asc_lesson_id]: { ...lm, asc_lesson_id: l.asc_lesson_id, unit_name: val },
                                    }));
                                  }}
                                  className="w-full text-[11px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Step 2 Bottom Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="rounded-xl"
              >
                Kembali
              </Button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pemetaan siap. Klik tombol untuk lanjut.</span>
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToStep3}
                  className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md cursor-pointer"
                >
                  Lanjut ke Eksekusi
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EKSEKUSI OVERWRITE */}
        {step === 3 && analysis && (
          <div className="space-y-6 text-center py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl text-amber-900 dark:text-amber-200 text-left flex gap-3 items-start">
              <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-2">
                <div className="font-bold text-sm text-amber-900 dark:text-amber-100">
                  Konfirmasi Mode Overwrite (Penimpaan Jadwal Transaksional)
                </div>
                <p>
                  Proses ini akan <strong>menimpa (<em>overwrite</em>) seluruh Jadwal KBM & Kontrak Pelajaran</strong> pada:
                </p>
                <div className="p-2.5 bg-amber-100/70 dark:bg-amber-900/40 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                  <span>Konteks Akademik Sasaran: <strong>Tahun Pelajaran {targetTpName}</strong> — <strong>Semester {targetSemName}</strong></span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                  <li>File Sumber XML: <code className="font-bold">{analysis.filename}</code></li>
                  <li>Total Guru Terpetakan: {Object.values(teacherMappings).length} orang</li>
                  <li>Total Kelas Terpetakan: {Object.values(classMappings).length} kelas</li>
                  <li>Total Mapel Terpetakan: {Object.values(subjectMappings).length} mapel</li>
                  <li>Total Slot Plotting: {analysis.summary.total_cards} slot jam</li>
                </ul>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 italic">
                  * Jadwal kegiatan pembiasaan, upacara, dan slot jam ke-0 tetap aman terlindungi dan tidak akan terhapus.
                </p>
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
                    Seluruh Jadwal KBM & Kontrak Pelajaran dari file <code className="bg-black/20 px-1.5 py-0.5 rounded text-white font-bold">{analysis?.filename}</code> telah berhasil ditimpa dan disimpan untuk <strong>Tahun Pelajaran {targetTpName} • Semester {targetSemName}</strong> ke database PostgreSQL Absenta.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge className="bg-white text-emerald-800 font-bold px-3 py-1 text-xs shadow-sm">
                  STATUS: COMMITTED
                </Badge>
                <span className="text-[11px] text-emerald-100 font-medium">
                  {targetTpName} • {targetSemName}
                </span>
              </div>
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
                  <div className="flex justify-between"><span>Unit Induk Dapodik:</span> <span className="font-bold text-indigo-600">{executionResult?.total_mapel_unit_of_parent || 0}</span></div>
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
                  <div className="flex justify-between"><span>Kontrak &amp; Unit:</span> <span className="font-bold">{executionResult?.total_kontrak || 0} / {executionResult?.total_units_synced || 0}</span></div>
                  <div className="flex justify-between"><span>Delegasi Aktif:</span> <span className="font-bold">{executionResult?.total_delegated_lessons || 0} Pelajaran</span></div>
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
