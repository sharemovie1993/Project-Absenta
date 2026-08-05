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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [analysis, setAnalysis] = useState<AscAnalysisResult | null>(null);

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
        toast.success('Impor XML aSc TimeTables BERHASIL! Jadwal & Kontrak KBM telah diperbarui 100%.', { id: toastId, duration: 5000 });
        if (onSuccessImport) onSuccessImport();
        handleClose();
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
              Unggah File XML
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 2 ? "bg-indigo-600 text-white" : step > 2 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              2
            </div>
            <span className={cn("text-xs font-semibold", step === 2 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")}>
              Pratinjau & Pemetaan
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center space-x-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", step === 3 ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
              3
            </div>
            <span className={cn("text-xs font-semibold", step === 3 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")}>
              Eksekusi & Overwrite
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

        {/* STEP 2: PRATINJAU & PEMETAAN */}
        {step === 2 && analysis && (
          <div className="space-y-4">
            {/* Summary Header Badges */}
            <div className="grid grid-cols-5 gap-3 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Guru XML</div>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">{analysis.summary.total_teachers}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Kelas XML</div>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">{analysis.summary.total_classes}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Mapel XML</div>
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">{analysis.summary.total_subjects}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Kontrak Les</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{analysis.summary.total_lessons}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Slot Plotting</div>
                <div className="text-base font-black text-amber-600 dark:text-amber-400">{analysis.summary.total_cards}</div>
              </div>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('GURU')}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", activeTab === 'GURU' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
                >
                  <Users className="w-3.5 h-3.5" />
                  Pemetaan Guru ({analysis.teachers.length})
                </button>
                <button
                  onClick={() => setActiveTab('KELAS')}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", activeTab === 'KELAS' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Pemetaan Kelas ({analysis.classes.length})
                </button>
                <button
                  onClick={() => setActiveTab('MAPEL')}
                  className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", activeTab === 'MAPEL' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Pemetaan Mapel ({analysis.subjects.length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* TAB CONTENT: GURU */}
            {activeTab === 'GURU' && (
              <div className="max-h-[340px] overflow-y-auto border rounded-xl border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Nama di XML aSc</th>
                      <th className="p-2.5">Kode</th>
                      <th className="p-2.5">Status Matching</th>
                      <th className="p-2.5">Arahkan ke Master Data Guru Absenta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analysis.teachers
                      .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(t => {
                        const currentMap = teacherMappings[t.asc_id] || { action: 'CREATE' };
                        return (
                          <tr key={t.asc_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{t.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{t.code || '-'}</td>
                            <td className="p-2.5">
                              {currentMap.action === 'MATCH' ? (
                                <Badge variant="success" className="text-[10px]">Terhubung DB</Badge>
                              ) : (
                                <Badge variant="info" className="text-[10px]">Auto-Create Baru</Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <select
                                value={currentMap.action === 'MATCH' ? currentMap.target_id || '' : '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setTeacherMappings(prev => ({
                                      ...prev,
                                      [t.asc_id]: { ...prev[t.asc_id], action: 'CREATE', target_id: undefined }
                                    }));
                                  } else {
                                    setTeacherMappings(prev => ({
                                      ...prev,
                                      [t.asc_id]: { ...prev[t.asc_id], action: 'MATCH', target_id: val }
                                    }));
                                  }
                                }}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                              >
                                <option value="__CREATE__">+ Buat Guru Baru di DB ("{t.name}")</option>
                                <optgroup label="Pilih Guru dari Database Absenta">
                                  {analysis.db_teachers.map(dbg => (
                                    <option key={dbg.id} value={dbg.id}>{dbg.name}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: KELAS */}
            {activeTab === 'KELAS' && (
              <div className="max-h-[340px] overflow-y-auto border rounded-xl border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Nama Kelas di XML aSc</th>
                      <th className="p-2.5">Kode</th>
                      <th className="p-2.5">Status Matching</th>
                      <th className="p-2.5">Arahkan ke Master Data Kelas Absenta (Redirection)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analysis.classes
                      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(c => {
                        const currentMap = classMappings[c.asc_id] || { action: 'CREATE' };
                        return (
                          <tr key={c.asc_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{c.code || '-'}</td>
                            <td className="p-2.5">
                              {currentMap.action === 'MATCH' ? (
                                <Badge variant="success" className="text-[10px]">Terhubung DB</Badge>
                              ) : (
                                <Badge variant="info" className="text-[10px]">Auto-Create Baru</Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <select
                                value={currentMap.action === 'MATCH' ? currentMap.target_id || '' : '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setClassMappings(prev => ({
                                      ...prev,
                                      [c.asc_id]: { ...prev[c.asc_id], action: 'CREATE', target_id: undefined }
                                    }));
                                  } else {
                                    setClassMappings(prev => ({
                                      ...prev,
                                      [c.asc_id]: { ...prev[c.asc_id], action: 'MATCH', target_id: val }
                                    }));
                                  }
                                }}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                              >
                                <option value="__CREATE__">+ Buat Kelas Baru di DB ("{c.name}")</option>
                                <optgroup label="Arahkan ke Kelas yang Ada di Absenta">
                                  {analysis.db_classes.map(dbc => (
                                    <option key={dbc.id} value={dbc.id}>{dbc.name}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: MAPEL */}
            {activeTab === 'MAPEL' && (
              <div className="max-h-[340px] overflow-y-auto border rounded-xl border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5">Nama Mapel di XML aSc</th>
                      <th className="p-2.5">Kode Singkatan</th>
                      <th className="p-2.5">Status Matching</th>
                      <th className="p-2.5">Arahkan ke Master Data Mapel Absenta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analysis.subjects
                      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(s => {
                        const currentMap = subjectMappings[s.asc_id] || { action: 'CREATE' };
                        return (
                          <tr key={s.asc_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{s.code || '-'}</td>
                            <td className="p-2.5">
                              {currentMap.action === 'MATCH' ? (
                                <Badge variant="success" className="text-[10px]">Terhubung DB</Badge>
                              ) : (
                                <Badge variant="info" className="text-[10px]">Auto-Create Baru</Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <select
                                value={currentMap.action === 'MATCH' ? currentMap.target_id || '' : '__CREATE__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__CREATE__') {
                                    setSubjectMappings(prev => ({
                                      ...prev,
                                      [s.asc_id]: { ...prev[s.asc_id], action: 'CREATE', target_id: undefined }
                                    }));
                                  } else {
                                    setSubjectMappings(prev => ({
                                      ...prev,
                                      [s.asc_id]: { ...prev[s.asc_id], action: 'MATCH', target_id: val }
                                    }));
                                  }
                                }}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold"
                              >
                                <option value="__CREATE__">+ Buat Mapel Baru di DB ("{s.name}")</option>
                                <optgroup label="Pilih Mapel dari Database Absenta">
                                  {analysis.db_subjects.map(dbs => (
                                    <option key={dbs.id} value={dbs.id}>{dbs.name} ({dbs.code || '-'})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Step 2 Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="rounded-xl"
              >
                Kembali ke Unggah
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(3)}
                className="rounded-xl px-6 bg-indigo-600 text-white font-bold"
              >
                Lanjut ke Eksekusi Overwrite
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
      </div>
    </Modal>
  );
};
