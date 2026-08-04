import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  FileText,
  Settings,
  ClipboardList,
  Loader2,
  Calendar,
  Clock,
  School,
  Users,
  Award,
  ShieldCheck,
  BookOpen,
  Info,
  Download
} from 'lucide-react';
import { AcademicPageLayout } from './AcademicPageLayout';
import { SectionCard, Button, Card, CardContent } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { getTenantById, type Tenant } from '../../api/tenants.api';
import { sekolahApi, type Sekolah } from '../../api/academic/sekolah.api';
import { getStrukturList, type StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { getPrepChecklist, type PrepChecklistData } from '../../api/academic/cetak-berkas.api';
import { getBase64ImageFromUrl } from '../../utils/cooperative/coopDocUtils';
import { kelasApi, siswaApi } from '../../api/academic.api';
import { sarprasApi } from '../../api/sarpras.api';
import { correspondenceApi } from '../../api/correspondence.api';
import { getGuruList } from '../../api/academic/guru.api';
import type { Kelas, Guru, Siswa } from '../../types/academic';
import toast from 'react-hot-toast';

interface CetakBerkasTemplateProps {
  module: 'academic' | 'kurikulum' | 'kesiswaan' | 'attendance' | 'bpbk' | 'sarpras' | 'hubin';
  title: string;
  description: string;
  breadcrumbs: { label: string; path?: string }[];
  instruction: {
    title: string;
    description: React.ReactNode;
    items: { text: string }[];
  };
  showChecklist?: boolean;
  hideHeaderAndBreadcrumbs?: boolean;
  docFormRenderer: (props: {
    selectedPrintType: string;
    setSelectedPrintType: (val: string) => void;
    selectedClassId: string;
    setSelectedClassId: (val: string) => void;
    selectedGuruId?: string;
    setSelectedGuruId?: (val: string) => void;
    selectedStudentId?: string;
    setSelectedStudentId?: (val: string) => void;
    eventDetails?: Record<string, string>;
    setEventDetails?: (val: Record<string, string>) => void;
    includeSchoolLogo: boolean;
    setIncludeSchoolLogo: (val: boolean) => void;
    classes: Kelas[];
    loadingClasses: boolean;
    gurus?: Guru[];
    loadingGurus?: boolean;
    students?: Siswa[];
    loadingStudents?: boolean;
  }) => React.ReactNode;
  pdfGenerator: (params: {
    selectedPrintType: string;
    selectedClassId: string;
    selectedGuruId?: string;
    selectedStudentId?: string;
    eventDetails?: Record<string, string>;
    classes: Kelas[];
    gurus?: Guru[];
    students?: Siswa[];
    sekolah: Sekolah | null;
    tenantInfo: Tenant | null;
    strukturList: StrukturOrganisasi[];
    logoDaerahBase64: string | null;
    logoSekolahBase64: string | null;
    includeSchoolLogo: boolean;
    checklistData: PrepChecklistData | null;
  }) => Promise<Blob>;
  defaultPrintType: string;
  initialClassId?: string;
  initialGuruId?: string;
  hardeningModuleKey?: string;
}

export const CetakBerkasTemplate: React.FC<CetakBerkasTemplateProps> = ({
  module,
  title,
  description,
  breadcrumbs,
  instruction,
  showChecklist = false,
  hideHeaderAndBreadcrumbs = false,
  docFormRenderer,
  pdfGenerator,
  defaultPrintType,
  initialClassId,
  initialGuruId,
  hardeningModuleKey: _hardeningModuleKey  // accepted but unused in template directly
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'print'>(showChecklist ? 'system' : 'print');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Filter & selections
  const [selectedPrintType, setSelectedPrintType] = useState<string>(defaultPrintType);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialGuruId || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (defaultPrintType) setSelectedPrintType(defaultPrintType);
    if (initialClassId) setSelectedClassId(initialClassId);
    if (initialGuruId) setSelectedGuruId(initialGuruId);
  }, [defaultPrintType, initialClassId, initialGuruId]);
  const [eventDetails, setEventDetails] = useState<Record<string, string>>({
    nomorSurat: '',
    tanggalPertemuan: '',
    waktuPertemuan: '08.00 WIB s.d. Selesai',
    tempatPertemuan: 'Ruang Piket / Kesiswaan',
    agendaPertemuan: 'Klarifikasi & Pembinaan Khusus Siswa',
    bulanRekap: new Date().toISOString().substring(0, 7)
  });
  const [includeSchoolLogo, setIncludeSchoolLogo] = useState<boolean>(true);
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  // Checklist system
  const [checklistData, setChecklistData] = useState<PrepChecklistData | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState<boolean>(false);

  const { user } = useAuth();

  // ── useQuery Hooks with Offline Cache ─────────────────────────────────────
  const { data: sekolahData } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const sekolah = sekolahData || null;

  const { data: tenantData } = useQuery({
    queryKey: ['tenant-info', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const res = await getTenantById(user.tenant_id).catch(() => null);
      return res?.success ? res.data : null;
    },
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantData || null;

  const { data: strukturData } = useQuery({
    queryKey: ['struktur-organisasi-active'],
    queryFn: async () => {
      const res = await getStrukturList({ is_active: true }).catch(() => null);
      return (res?.success && res.data) ? res.data : [];
    },
    staleTime: 10 * 60 * 1000,
  });
  const strukturList = strukturData || [];

  const { data: kelasQueryData, isLoading: loadingClasses } = useQuery({
    queryKey: ['cetak-berkas-kelas-list', module],
    queryFn: async () => {
      try {
        if (module === 'sarpras') {
          const res = await sarprasApi.getLocations();
          return (res.data || []).map((l: any) => ({
            id: l.id,
            nama_kelas: l.nama,
            tingkat: 1,
            is_active: true
          })) as Kelas[];
        } else {
          const res = await kelasApi.getAll({ limit: 150 });
          return ((res.data || []).filter((c: any) => c.is_active === true)) as Kelas[];
        }
      } catch {
        return [] as Kelas[];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
  const classes = kelasQueryData || [];

  const { data: guruQueryData, isLoading: loadingGurus } = useQuery({
    queryKey: ['cetak-berkas-gurus-list'],
    queryFn: async () => {
      try {
        const res = await getGuruList(1, 200);
        return (res.data || []) as Guru[];
      } catch {
        return [] as Guru[];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
  const gurus = guruQueryData || [];

  const { data: studentQueryData, isLoading: loadingStudents } = useQuery({
    queryKey: ['cetak-berkas-students-list', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId || selectedClassId === 'all') return [] as Siswa[];
      try {
        const res = await siswaApi.getAll({ kelas_id: selectedClassId, limit: 150 });
        return (res.data || []) as Siswa[];
      } catch {
        return [] as Siswa[];
      }
    },
    enabled: !!selectedClassId && selectedClassId !== 'all',
    staleTime: 10 * 60 * 1000,
  });
  const students = studentQueryData || [];

  // Synchronize default selectedClassId, selectedGuruId, selectedStudentId
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      const params = new URLSearchParams(window.location.search);
      const qClassId = params.get('classId');
      if (qClassId && classes.some(c => c.id === qClassId)) {
        setSelectedClassId(qClassId);
      } else {
        setSelectedClassId(classes[0].id);
      }
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (gurus.length > 0 && !selectedGuruId) {
      setSelectedGuruId(gurus[0].id);
    }
  }, [gurus, selectedGuruId]);

  useEffect(() => {
    if (students.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const qStudentId = params.get('studentId');
      if (qStudentId && students.some(s => s.id === qStudentId)) {
        setSelectedStudentId(qStudentId);
      } else if (!selectedStudentId || !students.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(students[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [students, selectedStudentId]);

  // Load logos
  useEffect(() => {
    const leftLogo = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url;
    if (leftLogo) {
      getBase64ImageFromUrl(leftLogo).then(res => setLogoDaerahBase64(res)).catch(() => setLogoDaerahBase64(null));
    } else {
      setLogoDaerahBase64(null);
    }
  }, [tenantInfo?.logo_daerah_url, (sekolah as any)?.logo_daerah_url]);

  useEffect(() => {
    const rightLogo = tenantInfo?.logo_url || sekolah?.logo_url;
    if (rightLogo) {
      getBase64ImageFromUrl(rightLogo).then(res => setLogoSekolahBase64(res)).catch(() => setLogoSekolahBase64(null));
    } else {
      setLogoSekolahBase64(null);
    }
  }, [tenantInfo?.logo_url, sekolah?.logo_url]);

  // Load query params on mount for cross-module redirect printing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qPrintType = params.get('printType');
    const qClassId = params.get('classId');
    const qGuruId = params.get('guruId');
    const qStudentId = params.get('studentId');
    const qAgenda = params.get('agenda');
    const qNomor = params.get('nomor');

    if (qPrintType) {
      setSelectedPrintType(qPrintType as any);
    }
    if (qClassId) {
      setSelectedClassId(qClassId);
    }
    if (qGuruId && setSelectedGuruId) {
      setSelectedGuruId(qGuruId);
    }
    if (qStudentId) {
      setSelectedStudentId(qStudentId);
    }
    if (qAgenda || qNomor) {
      setEventDetails(prev => ({
        ...prev,
        agendaPertemuan: qAgenda || prev.agendaPertemuan,
        nomorSurat: qNomor || prev.nomorSurat
      }));
    }
  }, [setSelectedPrintType, setSelectedClassId, setSelectedStudentId]);

  // Clean up blob url on unmount
  useEffect(() => {
    return () => {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  // Load Checklist System Data
  const loadChecklist = useCallback(async () => {
    if (!showChecklist) return;
    try {
      setLoadingChecklist(true);
      const res = await getPrepChecklist();
      setChecklistData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat checklist persiapan');
    } finally {
      setLoadingChecklist(false);
    }
  }, [showChecklist]);

  useEffect(() => {
    if (showChecklist) {
      loadChecklist();
    }
  }, [showChecklist, loadChecklist]);

  // Generate PDF Effect
  const generatePreview = useCallback(async () => {
    if (activeTab !== 'print') return;
    try {
      setGeneratingPdf(true);
      const blob = await pdfGenerator({
        selectedPrintType,
        selectedClassId,
        selectedGuruId,
        selectedStudentId,
        eventDetails,
        classes,
        gurus,
        students,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo,
        checklistData
      });
      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });
    } catch (err) {
      console.error('PDF Generation error:', err);
      toast.error('Gagal me-render pratinjau PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }, [
    activeTab,
    selectedPrintType,
    selectedClassId,
    selectedGuruId,
    selectedStudentId,
    eventDetails,
    classes,
    gurus,
    students,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    checklistData,
    pdfGenerator
  ]);

  useEffect(() => {
    if (activeTab === 'print' && (classes.length > 0 || gurus.length > 0 || students.length > 0)) {
      generatePreview();
    }
  }, [activeTab, selectedPrintType, selectedClassId, selectedGuruId, selectedStudentId, eventDetails, includeSchoolLogo, classes, gurus, students, generatePreview]);

  const recordSuratKeluar = async () => {
    const isLetter = ['letter_summons', 'letter_bk_call', 'pkl_intro', 'attendance_warning'].includes(selectedPrintType);
    if (!isLetter) return;

    try {
      const studentId = selectedStudentId || undefined;
      const details = eventDetails || {};
      const nomor = details.nomorSurat || `800 / OUT / ${module.toUpperCase()} / ${new Date().getFullYear()}`;
      
      let perihal = '';
      let kategori = 'Dinas';
      let tujuan = 'Orang Tua / Wali Siswa';

      if (selectedPrintType === 'letter_summons') {
        perihal = `Surat Panggilan Orang Tua: ${details.agendaPertemuan || 'Klarifikasi & Pembinaan'}`;
        kategori = 'Panggilan';
      } else if (selectedPrintType === 'letter_bk_call') {
        perihal = `Surat Panggilan Konseling BK: ${details.agendaPertemuan || 'Layanan BK'}`;
        kategori = 'Panggilan';
      } else if (selectedPrintType === 'pkl_intro') {
        perihal = 'Surat Pengantar Praktik Kerja Lapangan (PKL)';
        kategori = 'Dinas';
        tujuan = 'Pimpinan / HRD DUDI Mitra';
      } else if (selectedPrintType === 'attendance_warning') {
        perihal = 'Surat Peringatan Ketidakhadiran Siswa (SP)';
        kategori = 'Peringatan';
        tujuan = 'Orang Tua / Wali Siswa';
      }

      await correspondenceApi.createSuratKeluar({
        nomor_surat: nomor,
        judul: perihal,
        tujuan_surat: tujuan,
        tanggal_surat: new Date().toISOString().split('T')[0],
        isi_ringkas: `Digenerasikan dari modul Cetak Berkas (${module}). Agenda: ${details.agendaPertemuan || '-'}`,
        kategori_surat: kategori,
        siswa_id: studentId
      });
      console.log('Surat Keluar successfully recorded in database!');
    } catch (e) {
      console.error('Failed to auto-record Surat Keluar:', e);
    }
  };

  // Handlers
  const handlePrint = () => {
    if (pdfUrl) {
      recordSuratKeluar();
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      recordSuratKeluar();
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${module}_cetak_berkas_${selectedPrintType}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getChecklistItemIcon = (key: string) => {
    switch (key) {
      case 'tahun_pelajaran': return <Calendar size={18} />;
      case 'semester': return <Clock size={18} />;
      case 'kelas': return <School size={18} />;
      case 'guru': return <Users size={18} />;
      case 'siswa_baru': return <Users size={18} />;
      case 'siswa_transisi': return <Award size={18} />;
      case 'wali_kelas': return <ShieldCheck size={18} />;
      case 'guru_mapel': return <BookOpen size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <AcademicPageLayout
      title={hideHeaderAndBreadcrumbs ? undefined : title}
      description={hideHeaderAndBreadcrumbs ? undefined : description}
      breadcrumbs={hideHeaderAndBreadcrumbs ? [] : breadcrumbs}
      instruction={hideHeaderAndBreadcrumbs ? undefined : instruction}
      hardeningModuleKey={`cetak_berkas_${module}`}
    >
      <div className={hideHeaderAndBreadcrumbs ? "p-0 space-y-4 print:p-0" : "p-6 lg:p-8 space-y-6 print:p-0"}>
        {/* Navigation Tabs - only visible if showChecklist is true */}
        {showChecklist && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 mb-6 print:hidden">
            <button
              onClick={() => setActiveTab('system')}
              className={`pb-4 text-sm font-bold uppercase tracking-wider relative transition-colors ${
                activeTab === 'system'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {activeTab === 'system' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Checklist Sistem
              </div>
            </button>

            <button
              onClick={() => setActiveTab('print')}
              className={`pb-4 text-sm font-bold uppercase tracking-wider relative transition-colors ${
                activeTab === 'print'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {activeTab === 'print' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
              <div className="flex items-center gap-2">
                <Printer size={16} />
                Cetak Dokumen Fisik
              </div>
            </button>
          </div>
        )}

        {/* Tab 1: System Checklist */}
        {showChecklist && activeTab === 'system' && checklistData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              {loadingChecklist ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                checklistData.checklist.map((item, index) => (
                  <Card
                    key={item.key}
                    className={`border transition-all duration-300 ${
                      item.completed
                        ? 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5'
                        : 'border-amber-100 dark:border-amber-950 bg-amber-50/10 dark:bg-amber-950/5'
                    }`}
                  >
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          item.completed
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {getChecklistItemIcon(item.key)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.label}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full ${
                            item.completed
                              ? 'bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {item.status_text}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              {/* circular progress indicator */}
              <SectionCard title="Kesiapan Sistem" icon={ClipboardList} fullWidth>
                <div className="space-y-6 text-center py-4 flex flex-col items-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-44 h-44 transform -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="76"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        className="text-slate-100 dark:text-slate-800"
                      />
                      <motion.circle
                        cx="88"
                        cy="88"
                        r="76"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={477.5}
                        initial={{ strokeDashoffset: 477.5 }}
                        animate={{ strokeDashoffset: 477.5 - (477.5 * checklistData.completion_percentage) / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-black">{checklistData.completion_percentage}%</span>
                      <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Selesai</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-w-[240px]">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Menyambut Periode Baru</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pastikan seluruh indikator digital bernilai hijau sebelum Anda mengoperasikan periode akademik baru.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center w-full">
                    <Button variant="toolbarPrimary" onClick={loadChecklist} className="w-full flex justify-center gap-2">
                      Refresh Data
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {/* Tab 2: Document Printing (Built-in PDF Viewer) */}
        {activeTab === 'print' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print:hidden">
            <div className="lg:col-span-1">
              <SectionCard title="Pengaturan Cetak" icon={Printer} fullWidth>
                <div className="space-y-4 py-2">
                  {/* Dynamic Form renderer based on module config */}
                  {docFormRenderer({
                    selectedPrintType,
                    setSelectedPrintType,
                    selectedClassId,
                    setSelectedClassId,
                    selectedGuruId,
                    setSelectedGuruId,
                    selectedStudentId,
                    setSelectedStudentId,
                    eventDetails,
                    setEventDetails,
                    includeSchoolLogo,
                    setIncludeSchoolLogo,
                    classes,
                    loadingClasses,
                    gurus,
                    loadingGurus,
                    students,
                    loadingStudents
                  })}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <Button
                      onClick={handlePrint}
                      variant="toolbarPrimary"
                      disabled={!pdfUrl || generatingPdf}
                      className="w-full justify-center flex gap-2 font-bold"
                    >
                      <Printer size={14} />
                      Cetak Sekarang
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="ghost"
                      disabled={!pdfUrl || generatingPdf}
                      className="w-full justify-center flex gap-2 font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    >
                      <Download size={14} />
                      Unduh PDF
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Built-in PDF IFrame Pratinjau */}
            <div className="lg:col-span-3">
              <SectionCard title="Pratinjau Dokumen (Built-in PDF)" icon={FileText} fullWidth>
                <div className="relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[680px] flex items-center justify-center">
                  {generatingPdf && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Me-render Pratinjau Dokumen...</span>
                    </div>
                  )}

                  {pdfUrl ? (
                    <iframe
                      src={`${pdfUrl}#toolbar=1&navpanes=0&pagemode=none`}
                      title="PDF Preview"
                      className="w-full h-full border-none"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 max-w-sm">
                      <Info className="w-10 h-10 mx-auto text-slate-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Tidak Ada Dokumen</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Silakan pilih kelas atau dokumen untuk membuat pratinjau otomatis.
                      </p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </AcademicPageLayout>
  );
};
