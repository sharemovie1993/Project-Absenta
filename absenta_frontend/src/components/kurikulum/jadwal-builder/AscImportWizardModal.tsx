import React, { useState, useRef } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  analyzeAscXml, 
  executeAscImport, 
  type AscAnalysisResult, 
  type EntityMapping 
} from '../../../api/academic/ascImporter.api';
import { cn } from '../../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId: string;
  semesterId: string;
  onSuccessImport?: () => void;
}

export const AscImportWizardModal: React.FC<Props> = ({
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

        // Initialize Teacher Mappings
        const initTeachers: Record<string, EntityMapping> = {};
        res.data.teachers.forEach(t => {
          initTeachers[t.asc_id] = {
            asc_id: t.asc_id,
            name: t.name,
            code: t.code,
            target_id: t.matched_db_id || undefined,
            action: t.matched_db_id ? 'MATCH' : 'CREATE',
          };
        });
        setTeacherMappings(initTeachers);

        // Initialize Class Mappings
        const initClasses: Record<string, EntityMapping> = {};
        res.data.classes.forEach(c => {
          initClasses[c.asc_id] = {
            asc_id: c.asc_id,
            name: c.name,
            code: c.code,
            target_id: c.matched_db_id || undefined,
            action: c.matched_db_id ? 'MATCH' : 'CREATE',
          };
        });
        setClassMappings(initClasses);

        // Initialize Subject Mappings
        const initSubjects: Record<string, EntityMapping> = {};
        res.data.subjects.forEach(s => {
          initSubjects[s.asc_id] = {
            asc_id: s.asc_id,
            name: s.name,
            code: s.code,
            target_id: s.matched_db_id || undefined,
            action: s.matched_db_id ? 'MATCH' : 'CREATE',
          };
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

  const handleExecuteImport = async () => {
    if (!analysis || !tahunPelajaranId || !semesterId) {
      console.error('❌ [aSc Import Wizard] Invalid parameters for execution:', { analysis: !!analysis, tahunPelajaranId, semesterId });
      toast.error('Parameter Tahun Pelajaran / Semester tidak valid');
      return;
    }

    const payload = {
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId,
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
                <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                  File Terbaca: <span className="text-white font-mono">{analysis.filename}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span>👥 {analysis.summary.total_teachers} Guru</span>
                  <span>🏫 {analysis.summary.total_classes} Kelas</span>
                  <span>📚 {analysis.summary.total_subjects} Mapel</span>
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

            {/* TAB CONTENT TABLES */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              {activeTab === 'GURU' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
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
                        return (
                          <tr key={t.asc_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {t.name} {t.code ? <span className="text-slate-400 font-normal">({t.code})</span> : null}
                            </td>
                            <td className="py-2.5 px-4">
                              {t.match_status === 'EXACT_MATCH' ? (
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
                                value={currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setTeacherMappings(prev => ({
                                      ...prev,
                                      [t.asc_id]: { ...prev[t.asc_id], target_id: undefined, action: 'CREATE' }
                                    }));
                                  } else {
                                    setTeacherMappings(prev => ({
                                      ...prev,
                                      [t.asc_id]: { ...prev[t.asc_id], target_id: val, action: 'MATCH' }
                                    }));
                                  }
                                }}
                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="__CREATE__">+ Buat Guru Baru "{t.name}"</option>
                                <optgroup label="Pilih dari Master Guru yang Ada:">
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
                        return (
                          <tr key={c.asc_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {c.name}
                            </td>
                            <td className="py-2.5 px-4">
                              {c.match_status === 'EXACT_MATCH' ? (
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
                                value={currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setClassMappings(prev => ({
                                      ...prev,
                                      [c.asc_id]: { ...prev[c.asc_id], target_id: undefined, action: 'CREATE' }
                                    }));
                                  } else {
                                    setClassMappings(prev => ({
                                      ...prev,
                                      [c.asc_id]: { ...prev[c.asc_id], target_id: val, action: 'MATCH' }
                                    }));
                                  }
                                }}
                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="__CREATE__">+ Buat Rombel Baru "{c.name}"</option>
                                <optgroup label="Arahkan ke Master Rombel yang Ada:">
                                  {analysis.db_classes.map(dbc => (
                                    <option key={dbc.id} value={dbc.id}>
                                      {dbc.name}
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

              {activeTab === 'MAPEL' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
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
                        return (
                          <tr key={s.asc_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {s.name} {s.code ? <span className="text-slate-400 font-normal">({s.code})</span> : null}
                            </td>
                            <td className="py-2.5 px-4">
                              {s.match_status === 'EXACT_MATCH' ? (
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
                                value={currentMap.target_id || '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setSubjectMappings(prev => ({
                                      ...prev,
                                      [s.asc_id]: { ...prev[s.asc_id], target_id: undefined, action: 'CREATE' }
                                    }));
                                  } else {
                                    setSubjectMappings(prev => ({
                                      ...prev,
                                      [s.asc_id]: { ...prev[s.asc_id], target_id: val, action: 'MATCH' }
                                    }));
                                  }
                                }}
                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="__CREATE__">+ Buat Mapel Baru "{s.name}"</option>
                                <optgroup label="Arahkan ke Master Mapel yang Ada:">
                                  {analysis.db_subjects.map(dbs => (
                                    <option key={dbs.id} value={dbs.id}>
                                      {dbs.name} {dbs.code ? `(${dbs.code})` : ''}
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
                onClick={() => setStep(3)}
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
};
