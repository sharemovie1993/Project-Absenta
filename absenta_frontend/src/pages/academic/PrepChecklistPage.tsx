import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Printer,
  FileText,
  Settings,
  Users,
  BookOpen,
  Clock,
  School,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Award,
  ClipboardList,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Button, Card, CardContent } from '../../components/ui';
import { getPrepChecklist, type PrepChecklistData, type ChecklistItem } from '../../api/academic/prep-checklist.api';
import { kelasApi, siswaApi } from '../../api/academic.api';
import { listGuruMapel } from '../../api/academic/guru-mapel.api';
import type { Kelas, Siswa, GuruMapel } from '../../types/academic';
import { sekolahApi, type Sekolah } from '../../api/academic/sekolah.api';
import { getTenantById, type Tenant } from '../../api/tenants.api';
import { getStrukturList, type StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { PrintHeader } from '../../components/ui/PrintHeader';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const PrepChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'system' | 'print'>('system');
  
  // System Checklist State
  const [checklistData, setChecklistData] = useState<PrepChecklistData | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState<boolean>(true);
  
  // Printing State
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPrintType, setSelectedPrintType] = useState<'attendance' | 'journal' | 'roster' | 'sk_load'>('attendance');
  
  const [students, setStudents] = useState<Siswa[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  
  const [guruMapelList, setGuruMapelList] = useState<GuruMapel[]>([]);
  const [loadingGuruMapel, setLoadingGuruMapel] = useState<boolean>(false);
  
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  
  const { user } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [strukturList, setStrukturList] = useState<StrukturOrganisasi[]>([]);

  // Load Checklist data
  const loadChecklist = useCallback(async () => {
    try {
      setLoadingChecklist(true);
      const res = await getPrepChecklist();
      setChecklistData(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat checklist persiapan');
    } finally {
      setLoadingChecklist(false);
    }
  }, []);

  const loadSekolah = useCallback(async () => {
    try {
      const res = await sekolahApi.getProfile();
      setSekolah(res);
    } catch (err) {
      console.error('Gagal memuat profil sekolah:', err);
    }
  }, []);

  const loadTenantInfo = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      const res = await getTenantById(user.tenant_id);
      if (res.success && res.data) {
        setTenantInfo(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat informasi tenant:', err);
    }
  }, [user?.tenant_id]);

  const loadStruktur = useCallback(async () => {
    try {
      const res = await getStrukturList({ is_active: true });
      if (res.success && res.data) {
        setStrukturList(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat struktur organisasi:', err);
    }
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  useEffect(() => {
    if (activeTab === 'print') {
      loadSekolah();
      loadTenantInfo();
      loadStruktur();
    }
  }, [activeTab, loadSekolah, loadTenantInfo, loadStruktur]);

  // Load Classes for Printing tab
  const loadClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const res = await kelasApi.getAll({ limit: 100 });
      setClasses(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedClassId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat daftar kelas');
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'print') {
      loadClasses();
    }
  }, [activeTab, loadClasses]);

  // Load students when class changes
  useEffect(() => {
    if (activeTab === 'print' && selectedClassId && ['attendance', 'journal', 'roster'].includes(selectedPrintType)) {
      const loadStudents = async () => {
        try {
          setLoadingStudents(true);
          const res = await siswaApi.getAll({ kelas_id: selectedClassId, limit: 150 });
          setStudents(res.data || []);
        } catch (err) {
          console.error(err);
          toast.error('Gagal memuat siswa kelas');
        } finally {
          setLoadingStudents(false);
        }
      };
      loadStudents();
    }
  }, [activeTab, selectedClassId, selectedPrintType]);

  // Load Guru Mapel when print type is SK Load
  useEffect(() => {
    if (activeTab === 'print' && selectedPrintType === 'sk_load') {
      const loadGuruMapels = async () => {
        try {
          setLoadingGuruMapel(true);
          const res = await listGuruMapel();
          setGuruMapelList(res.data || []);
        } catch (err) {
          console.error(err);
          toast.error('Gagal memuat beban kerja guru');
        } finally {
          setLoadingGuruMapel(false);
        }
      };
      loadGuruMapels();
    }
  }, [activeTab, selectedPrintType]);

  // Selected Class details helper
  const selectedClassObj = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const isLandscape = ['attendance', 'roster'].includes(selectedPrintType);

  const waliKelasObj = useMemo(() => {
    return selectedClassObj?.WaliKelas?.[0]?.Guru as any;
  }, [selectedClassObj]);

  const waliKelasName = useMemo(() => {
    return waliKelasObj?.nama_guru || '_______________________';
  }, [waliKelasObj]);

  const waliKelasNip = useMemo(() => {
    return waliKelasObj?.nip ? `NIP. ${waliKelasObj.nip}` : 'NIP. ..............................';
  }, [waliKelasObj]);

  const principalName = useMemo(() => {
    const principalAssign = strukturList?.find(s => s.kode === 'KEPALA_SEKOLAH');
    const principalGuru = principalAssign?.organizationalAssigns?.[0]?.User?.Guru;
    return principalGuru?.nama_guru || sekolah?.kepala_sekolah || 'DRS. H. CONTOH KEPSEK, M.Pd.';
  }, [strukturList, sekolah]);

  const principalNip = useMemo(() => {
    const principalAssign = strukturList?.find(s => s.kode === 'KEPALA_SEKOLAH');
    const principalGuru = principalAssign?.organizationalAssigns?.[0]?.User?.Guru;
    return principalGuru?.nip || sekolah?.nip_kepala || '19720512 199803 1 002';
  }, [strukturList, sekolah]);

  // Get dynamic dates list for attendance printing
  const daysInMonth = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 0);
    const count = date.getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  // Month names list helper
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Map icon helper for checklist items
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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <AcademicPageLayout
      title="Pusat Persiapan & Cetak TU"
      description="Kelola kesiapan sistem menyambut Tahun Ajaran Baru dan cetak lembaran administrasi fisik secara mandiri."
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Persiapan & Cetak TU' }
      ]}
      instruction={{
        title: "Panduan Administrasi TU SMK",
        description: "Gunakan menu ini untuk memverifikasi kesiapan data sistem dan mencetak kelengkapan berkas fisik untuk awal tahun ajaran.",
        items: [
          { text: "Tinjau tab 'Checklist Sistem' untuk memastikan data kurikulum & siswa di database sudah siap." },
          { text: "Gunakan tab 'Cetak Dokumen Fisik' untuk mencetak lembar presensi manual, jurnal kelas, atau format nilai." },
          { text: "Pengaturan printer disarankan mengaktifkan opsi 'Background Graphics' agar tabel tercetak sempurna." }
        ]
      }}
      hardeningModuleKey="prepchecklistpage"
    >
      <div className="p-6 lg:p-8 space-y-6 print:p-0">
        
        {/* Navigation Tabs - Modern glassmorphism style */}
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
              Cetak Dokumen Fisik (Manual)
            </div>
          </button>
        </div>

        {/* --- TAB 1: SYSTEM CHECKLIST --- */}
        {activeTab === 'system' && (
          <div className="space-y-6 print:hidden">
            {loadingChecklist ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-slate-500">Mengevaluasi kesiapan data...</span>
              </div>
            ) : checklistData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Checklist Summary Card */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Context Card - Light theme themed */}
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <Info size={14} className="text-blue-500" /> Informasi Periode
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm font-medium">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                        <span className="text-slate-400 dark:text-slate-500 text-[9px] block uppercase font-bold tracking-wider mb-1 leading-tight">Periode Aktif Sekarang</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold block text-xs sm:text-sm">{checklistData.current_year?.tahun || 'Tidak ada'}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium block mt-0.5">{checklistData.current_semester?.nama_semester || 'Tidak ada'}</span>
                      </div>
                      <div className="bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                        <span className="text-blue-500/80 dark:text-blue-400 text-[9px] block uppercase font-bold tracking-wider mb-1 leading-tight">Periode Rencana Baru</span>
                        <span className="text-blue-600 dark:text-blue-300 font-black block text-xs sm:text-sm">{checklistData.target_year?.tahun || 'Tidak disiapkan'}</span>
                        <span className="text-blue-500 dark:text-blue-400 text-[10px] font-semibold block mt-0.5">{checklistData.target_semester?.nama_semester || 'Tidak disiapkan'}</span>
                      </div>
                    </div>
                  </div>

                  <SectionCard title="Kesiapan Sistem" icon={ClipboardList} fullWidth>
                    <div className="space-y-6 text-center py-4 flex flex-col items-center">
                      <div className="relative inline-flex items-center justify-center">
                        {/* Circular Progress Indicator */}
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
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-4xl font-black">{checklistData.completion_percentage}%</span>
                          <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Selesai</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-w-[240px]">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Menyambut Tahun Ajaran Baru</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Pastikan seluruh indikator digital bernilai hijau sebelum Anda mengaktifkan periode akademik baru di dashboard utama.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center w-full">
                        <Button 
                          variant="toolbarPrimary" 
                          onClick={() => loadChecklist()}
                          className="w-full flex justify-center gap-2"
                        >
                          Refresh Data
                        </Button>
                      </div>
                    </div>
                  </SectionCard>
                </div>

                {/* Checklist Tasks List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Checklist Kesiapan Administrasi Digital</h3>
                  <div className="space-y-3">
                    {checklistData.checklist.map((item, index) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group bg-white dark:bg-slate-900 hover:shadow-lg ${
                          item.completed 
                            ? 'border-emerald-100 dark:border-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-900/50' 
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Completed or Warning Status Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            item.completed 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                          }`}>
                            {item.completed ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.label}</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                item.completed 
                                  ? 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                  : 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                              }`}>
                                {item.completed ? 'Siap' : 'Perlu Setup'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{item.description}</p>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-1">{item.status_text}</span>
                          </div>
                        </div>

                        {/* Action Link to Module */}
                        <button
                          onClick={() => navigate(item.action_path)}
                          className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 flex items-center justify-center transition-all"
                          title="Lakukan konfigurasi"
                        >
                          <ChevronRight size={16} className="transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <SectionCard>
                <div className="text-center py-10">
                  <p className="text-slate-500">Gagal mengevaluasi data checklist.</p>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* --- TAB 2: PHYSICAL DOCUMENT PRINTING --- */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            
            {/* Control Panel (Selector) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
              <div className="lg:col-span-1">
                <SectionCard title="Pengaturan Cetak" icon={Printer}>
                  <div className="space-y-4 py-2">
                    
                    {/* Document Type Dropdown */}
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400 block">Jenis Dokumen Fisik</label>
                      <select
                        value={selectedPrintType}
                        onChange={(e) => setSelectedPrintType(e.target.value as any)}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="attendance">1. Presensi Bulanan Kelas (Kosong)</option>
                        <option value="journal">2. Buku Jurnal KBM Kelas (Kosong)</option>
                        <option value="roster">3. Daftar Kelas & Lembar Nilai</option>
                        <option value="sk_load">4. Lampiran SK Beban Mengajar</option>
                      </select>
                    </div>

                    {/* Class Selector (Conditional) */}
                    {['attendance', 'journal', 'roster'].includes(selectedPrintType) && (
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-slate-400 block">Pilih Kelas</label>
                        {loadingClasses ? (
                          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 py-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat kelas...
                          </div>
                        ) : (
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Month Selector (Conditional) */}
                    {selectedPrintType === 'attendance' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-slate-400 block">Bulan</label>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {monthNames.map((name, index) => (
                              <option key={index} value={index + 1}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-slate-400 block">Tahun</label>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <Button
                        onClick={handlePrint}
                        variant="toolbarPrimary"
                        className="w-full flex justify-center items-center gap-2 py-2.5"
                        disabled={
                          (selectedPrintType === 'sk_load' && guruMapelList.length === 0) ||
                          (['attendance', 'journal', 'roster'].includes(selectedPrintType) && students.length === 0)
                        }
                      >
                        <Printer size={16} />
                        Cetak Lembaran
                      </Button>
                      <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3 rounded-xl text-[10px] leading-relaxed font-semibold">
                        Ketik Ctrl+P di browser untuk pratinjau penuh. Hilangkan opsi margin, header, dan footer di dialog cetak browser Anda.
                      </div>
                    </div>

                  </div>
                </SectionCard>
              </div>

              {/* Preview Area */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Pratinjau Lembar Fisik</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    Format Kertas Standard
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 overflow-x-auto max-h-[70vh]">
                  
                  {/* Local Print Area Styling */}
                  <style>{`
                    @media print {
                      body * { visibility: hidden; }
                      #print-tu-area, #print-tu-area * { visibility: visible; }
                      #print-tu-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; margin: 0; color: black !important; }
                      .print-page-break { page-break-inside: avoid; }
                      .print-no-border { border: none !important; }
                    }
                  `}</style>

                  {/* Wrapper printable element */}
                  {/* Dynamic Page Orientation CSS for Printing */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: ${isLandscape ? 'landscape' : 'portrait'};
                        margin: 15mm 15mm 15mm 15mm;
                      }
                      body {
                        background: #fff !important;
                        color: #000 !important;
                      }
                      #print-tu-area {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 100% !important;
                      }
                    }
                  `}} />

                  <div 
                    id="print-tu-area" 
                    className={`bg-white text-slate-900 border border-slate-300 rounded-2xl shadow p-8 mx-auto text-xs font-mono font-medium leading-relaxed transition-all duration-300 ${
                      isLandscape ? 'w-full max-w-[1100px] min-w-[900px]' : 'w-full max-w-[850px] min-w-[650px]'
                    }`}
                  >
                    
                    {/* --- REPORT HEADER (KOP SURAT) --- */}
                    <div className="mb-6">
                      <PrintHeader variant={isLandscape ? 'landscape' : 'portrait'} tenantInfo={tenantInfo} />
                    </div>

                    {/* --- RENDER 1: BLANK ATTENDANCE SHEET --- */}
                    {selectedPrintType === 'attendance' && (
                      <div className="space-y-4">
                        <div className="text-center space-y-1 mb-6">
                          <h3 className="text-sm font-bold uppercase underline">DAFTAR HADIR / PRESENSI BULANAN SISWA</h3>
                          <p className="text-xs">
                            BULAN: <span className="font-bold uppercase">{monthNames[selectedMonth - 1]} {selectedYear}</span> &nbsp;|&nbsp; 
                            KELAS: <span className="font-bold uppercase">{selectedClassObj?.nama_kelas || '---'}</span>
                          </p>
                        </div>

                        {loadingStudents ? (
                          <div className="text-center py-10 flex justify-center items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Memuat data siswa...
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">Tidak ada siswa terdaftar pada kelas ini.</div>
                        ) : (
                          <table className="w-full border-collapse border border-black text-[9px]">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-black px-1.5 py-2 text-center w-6" rowSpan={2}>NO</th>
                                <th className="border border-black px-2 py-2 text-center w-16" rowSpan={2}>NIS/NISN</th>
                                <th className="border border-black px-2 py-2 text-left" rowSpan={2}>NAMA LENGKAP SISWA</th>
                                <th className="border border-black px-1.5 py-2 text-center w-6" rowSpan={2}>L/P</th>
                                <th className="border border-black py-1 text-center" colSpan={daysInMonth.length}>TANGGAL KEGIATAN BULANAN</th>
                                <th className="border border-black px-1 py-1 text-center w-12" colSpan={3}>ABS</th>
                              </tr>
                              <tr className="bg-slate-50">
                                {daysInMonth.map(day => (
                                  <th key={day} className="border border-black p-0.5 text-center text-[7px] w-4">{day}</th>
                                ))}
                                <th className="border border-black p-0.5 text-center text-[7px] w-4">S</th>
                                <th className="border border-black p-0.5 text-center text-[7px] w-4">I</th>
                                <th className="border border-black p-0.5 text-center text-[7px] w-4">A</th>
                              </tr>
                            </thead>
                            <tbody>
                              {students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-50">
                                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                                  <td className="border border-black p-1 text-center">{student.nis}</td>
                                  <td className="border border-black p-1 text-left uppercase truncate max-w-[150px]">{student.nama_siswa}</td>
                                  <td className="border border-black p-1 text-center">{String(student.jenis_kelamin).startsWith('L') ? 'L' : 'P'}</td>
                                  {daysInMonth.map(day => (
                                    <td key={day} className="border border-black p-0"></td>
                                  ))}
                                  <td className="border border-black p-0"></td>
                                  <td className="border border-black p-0"></td>
                                  <td className="border border-black p-0"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* --- RENDER 2: BLANK LESSON LOG (JURNAL) --- */}
                    {selectedPrintType === 'journal' && (
                      <div className="space-y-4">
                        <div className="text-center space-y-1 mb-6">
                          <h3 className="text-sm font-bold uppercase underline">BUKU JURNAL HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)</h3>
                          <p className="text-xs">
                            KELAS: <span className="font-bold uppercase">{selectedClassObj?.nama_kelas || '---'}</span> &nbsp;|&nbsp; 
                            TAHUN PELAJARAN: <span className="font-bold uppercase">{checklistData?.current_year?.tahun || '---'}</span>
                          </p>
                        </div>

                        <table className="w-full border-collapse border border-black text-[9px]">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-black px-2 py-3 text-center w-8">NO</th>
                              <th className="border border-black px-2 py-3 text-center w-24">HARI / TANGGAL</th>
                              <th className="border border-black px-2 py-3 text-center w-14">JAM KE-</th>
                              <th className="border border-black px-2 py-3 text-left w-36">MATA PELAJARAN</th>
                              <th className="border border-black px-2 py-3 text-left">URAIAN MATERI / KD YANG DIAJARKAN</th>
                              <th className="border border-black px-2 py-3 text-left w-36">SISWA TIDAK HADIR (NAMA & ALASAN)</th>
                              <th className="border border-black px-2 py-3 text-center w-20">PARAF GURU</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <tr key={idx} className="h-16">
                                <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2"></td>
                                <td className="border border-black p-2"></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* --- RENDER 3: CLASS ROSTER & GRADE SHEET --- */}
                    {selectedPrintType === 'roster' && (
                      <div className="space-y-4">
                        <div className="text-center space-y-1 mb-6">
                          <h3 className="text-sm font-bold uppercase underline">DAFTAR KELAS & DAFTAR FORMAT PENILAIAN GURU</h3>
                          <p className="text-xs">
                            KELAS: <span className="font-bold uppercase">{selectedClassObj?.nama_kelas || '---'}</span> &nbsp;|&nbsp; 
                            TAHUN PELAJARAN: <span className="font-bold uppercase">{checklistData?.current_year?.tahun || '---'}</span>
                          </p>
                        </div>

                        {loadingStudents ? (
                          <div className="text-center py-10 flex justify-center items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Memuat data siswa...
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">Tidak ada siswa terdaftar pada kelas ini.</div>
                        ) : (
                          <table className="w-full border-collapse border border-black text-[9px]">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-black px-2 py-2 text-center w-8">NO</th>
                                <th className="border border-black px-2 py-2 text-center w-20">NIS / NISN</th>
                                <th className="border border-black px-2 py-2 text-left">NAMA LENGKAP SISWA</th>
                                <th className="border border-black px-2 py-2 text-center w-6">L/P</th>
                                {Array.from({ length: 10 }).map((_, i) => (
                                  <th key={i} className="border border-black p-1 text-center w-8 text-[7px] vertical-text">COL {i+1}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-50 h-6">
                                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                                  <td className="border border-black p-1 text-center">{student.nis}</td>
                                  <td className="border border-black p-1 text-left uppercase truncate max-w-[200px]">{student.nama_siswa}</td>
                                  <td className="border border-black p-1 text-center">{String(student.jenis_kelamin).startsWith('L') ? 'L' : 'P'}</td>
                                  {Array.from({ length: 10 }).map((_, i) => (
                                    <td key={i} className="border border-black p-0"></td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* --- RENDER 4: TEACHER WORKLOAD (SK ATTACHMENT) --- */}
                    {selectedPrintType === 'sk_load' && (
                      <div className="space-y-4">
                        <div className="text-center space-y-1 mb-6">
                          <h3 className="text-xs font-bold uppercase">LAMPIRAN SURAT KEPUTUSAN KEPALA {sekolah?.nama || 'SMK NEGERI CONTOH ABSENTA'}</h3>
                          <p className="text-[10px] font-bold">NOMOR: 421.3 / 088 / TU-CADISDIK / VI / {new Date().getFullYear()}</p>
                          <h3 className="text-sm font-bold uppercase underline mt-4">DISTRIBUSI GURU PENGAMPU BEBAN TUGAS MENGAJAR</h3>
                          <p className="text-xs">
                            TAHUN PELAJARAN: <span className="font-bold uppercase">{checklistData?.current_year?.tahun || '---'}</span>
                          </p>
                        </div>

                        {loadingGuruMapel ? (
                          <div className="text-center py-10 flex justify-center items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Memuat beban mengajar...
                          </div>
                        ) : guruMapelList.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">Belum ada data penugasan Guru Pengampu Mata Pelajaran.</div>
                        ) : (
                          <table className="w-full border-collapse border border-black text-[9px]">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-black px-2 py-2 text-center w-10">NO</th>
                                <th className="border border-black px-2 py-2 text-left w-64">NAMA GURU / NIP</th>
                                <th className="border border-black px-2 py-2 text-left">MATA PELAJARAN YANG DIAMPU</th>
                                <th className="border border-black px-2 py-2 text-center w-24">KODE MAPEL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {guruMapelList.map((gm, idx) => (
                                <tr key={gm.id} className="hover:bg-slate-50">
                                  <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                                  <td className="border border-black p-2 text-left font-semibold">
                                    {gm.Guru?.nama_guru} <br />
                                    <span className="text-[8px] text-slate-500 font-mono font-medium">NIP: {gm.Guru?.nip || '---'}</span>
                                  </td>
                                  <td className="border border-black p-2 text-left uppercase">{gm.Mapel?.nama_mapel}</td>
                                  <td className="border border-black p-2 text-center font-mono">{gm.Mapel?.kode_mapel || '---'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* --- SIGNATURES BOTTOM SECTION --- */}
                    <div className="mt-12 grid grid-cols-2 gap-12 print:page-break">
                      <div>
                        {['attendance', 'journal', 'roster'].includes(selectedPrintType) && (
                          <div className="text-center space-y-16">
                            <div>
                              <p>Mengetahui,</p>
                              <p className="font-bold">Wali Kelas {selectedClassObj?.nama_kelas || '---'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold underline uppercase">{waliKelasName}</p>
                              <p className="text-[10px] text-slate-500">{waliKelasNip}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center space-y-16">
                        <div>
                          <p>Purwakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="font-bold">Kepala Sekolah,</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold underline uppercase">{principalName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {principalNip ? `NIP. ${principalNip}` : 'NIP. ..............................'}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
};

export default PrepChecklistPage;
