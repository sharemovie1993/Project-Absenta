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
import { getBase64ImageFromUrl } from '../../utils/cooperative/coopDocUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Load logo Base64 on school change
  useEffect(() => {
    if (sekolah?.logo_url) {
      getBase64ImageFromUrl(sekolah.logo_url).then(res => {
        setLogoBase64(res);
      }).catch(err => {
        console.warn('Gagal memuat base64 logo sekolah:', err);
        setLogoBase64(null);
      });
    } else {
      setLogoBase64(null);
    }
  }, [sekolah?.logo_url]);

  // Clean up blob url on unmount
  useEffect(() => {
    return () => {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

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

  // Dynamic PDF Preview Generation Effect
  useEffect(() => {
    if (activeTab !== 'print') return;

    const generatePreviewPdf = async () => {
      // 1. Create jsPDF instance
      const orientation = isLandscape ? 'l' : 'p';
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      // 2. Draw Kop Surat
      const pageWidth = isLandscape ? 297 : 210;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 15, 10, 18, 18);
        } catch (e) {
          console.warn('Failed to add logo to PDF', e);
        }
      }
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text('PEMERINTAH PROVINSI DINAS PENDIDIKAN', pageWidth / 2, 14, { align: 'center' });
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(sekolah?.nama?.toUpperCase() || 'SMK NEGERI CONTOH ABSENTA', pageWidth / 2, 19, { align: 'center' });
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(sekolah?.alamat || 'Jl. Raya Plered KM. 5 Purwakarta', pageWidth / 2, 23, { align: 'center' });
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.line(15, 26, pageWidth - 15, 26);
      doc.setLineWidth(0.2);
      doc.line(15, 27, pageWidth - 15, 27);

      // 3. Draw Document Content
      if (selectedPrintType === 'attendance') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DAFTAR HADIR / PRESENSI BULANAN SISWA', pageWidth / 2, 34, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`BULAN: ${monthNames[selectedMonth - 1]?.toUpperCase()} ${selectedYear}  |  KELAS: ${selectedClassObj?.nama_kelas?.toUpperCase() || '---'}`, pageWidth / 2, 39, { align: 'center' });

        const head = [
          [
            { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'NIS/NISN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'NAMA LENGKAP SISWA', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'L/P', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'TANGGAL KEGIATAN BULANAN', colSpan: daysInMonth.length, styles: { halign: 'center' } },
            { content: 'ABS', colSpan: 3, styles: { halign: 'center' } }
          ],
          [
            ...daysInMonth.map(d => ({ content: String(d), styles: { halign: 'center' } })),
            { content: 'S', styles: { halign: 'center' } },
            { content: 'I', styles: { halign: 'center' } },
            { content: 'A', styles: { halign: 'center' } }
          ]
        ];
        const body = students.map((s, idx) => [
          idx + 1,
          s.nis || '-',
          s.nama_siswa?.toUpperCase() || '',
          String(s.jenis_kelamin).startsWith('L') ? 'L' : 'P',
          ...daysInMonth.map(() => ''),
          '', '', ''
        ]);
        autoTable(doc, {
          startY: 44,
          head: head as any,
          body: body as any,
          theme: 'grid',
          styles: { fontSize: 6.5, font: 'Helvetica', cellPadding: 0.8 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
          bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 42 },
            3: { cellWidth: 7, halign: 'center' },
          }
        });
      } else if (selectedPrintType === 'journal') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('BUKU JURNAL HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)', pageWidth / 2, 34, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`KELAS: ${selectedClassObj?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, 39, { align: 'center' });

        const head = [[
          { content: 'NO', styles: { halign: 'center' } },
          { content: 'HARI / TANGGAL', styles: { halign: 'center' } },
          { content: 'JAM KE-', styles: { halign: 'center' } },
          { content: 'MATA PELAJARAN' },
          { content: 'URAIAN MATERI / KD YANG DIAJARKAN' },
          { content: 'SISWA TIDAK HADIR (NAMA & ALASAN)' },
          { content: 'PARAF GURU', styles: { halign: 'center' } }
        ]];
        const body = Array.from({ length: 8 }).map((_, idx) => [
          idx + 1, '', '', '', '', '', ''
        ]);
        autoTable(doc, {
          startY: 44,
          head: head as any,
          body: body as any,
          theme: 'grid',
          styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2, minCellHeight: 12 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0], minCellHeight: 6 },
          bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 35 },
            4: { cellWidth: 60 },
            5: { cellWidth: 25 },
            6: { cellWidth: 15 }
          }
        });
      } else if (selectedPrintType === 'roster') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DAFTAR KELAS & DAFTAR FORMAT PENILAIAN GURU', pageWidth / 2, 34, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`KELAS: ${selectedClassObj?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, 39, { align: 'center' });

        const head = [[
          { content: 'NO', styles: { halign: 'center' } },
          { content: 'NIS / NISN', styles: { halign: 'center' } },
          { content: 'NAMA LENGKAP SISWA' },
          { content: 'L/P', styles: { halign: 'center' } },
          ...Array.from({ length: 10 }).map((_, i) => ({ content: `COL ${i+1}`, styles: { halign: 'center' } }))
        ]];
        const body = students.map((s, idx) => [
          idx + 1,
          s.nis || '-',
          s.nama_siswa?.toUpperCase() || '',
          String(s.jenis_kelamin).startsWith('L') ? 'L' : 'P',
          ...Array.from({ length: 10 }).map(() => '')
        ]);
        autoTable(doc, {
          startY: 44,
          head: head as any,
          body: body as any,
          theme: 'grid',
          styles: { fontSize: 7.5, font: 'Helvetica', cellPadding: 1.2 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
          bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 50 },
            3: { cellWidth: 7, halign: 'center' },
          }
        });
      } else if (selectedPrintType === 'sk_load') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`LAMPIRAN SURAT KEPUTUSAN KEPALA ${sekolah?.nama?.toUpperCase() || 'SMK NEGERI CONTOH ABSENTA'}`, pageWidth / 2, 32, { align: 'center' });
        doc.text(`NOMOR: 421.3 / 088 / TU-CADISDIK / VI / ${new Date().getFullYear()}`, pageWidth / 2, 36, { align: 'center' });
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('DISTRIBUSI GURU PENGAMPU BEBAN TUGAS MENGAJAR', pageWidth / 2, 42, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, 46, { align: 'center' });

        const head = [[
          { content: 'NO', styles: { halign: 'center' } },
          { content: 'NAMA GURU / NIP' },
          { content: 'MATA PELAJARAN YANG DIAMPU' },
          { content: 'KODE MAPEL', styles: { halign: 'center' } }
        ]];
        const body = guruMapelList.map((gm, idx) => [
          idx + 1,
          `${gm.Guru?.nama_guru || ''}\nNIP: ${gm.Guru?.nip || '---'}`,
          gm.Mapel?.nama_mapel?.toUpperCase() || '',
          gm.Mapel?.kode_mapel || '---'
        ]);
        autoTable(doc, {
          startY: 51,
          head: head as any,
          body: body as any,
          theme: 'grid',
          styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
          bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 62 },
            2: { cellWidth: 70 },
            3: { cellWidth: 30, halign: 'center' }
          }
        });
      }

      // 4. Draw Signatures
      let finalY = (doc as any).lastAutoTable?.finalY ?? 60;
      const pageHeight = isLandscape ? 210 : 297;
      if (finalY + 35 > pageHeight) {
        doc.addPage();
        finalY = 20;
      }
      const sigY = finalY + 8;

      if (['attendance', 'journal', 'roster'].includes(selectedPrintType)) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Mengetahui,', 40, sigY, { align: 'center' });
        doc.text(`Wali Kelas ${selectedClassObj?.nama_kelas || '---'}`, 40, sigY + 4, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.text(waliKelasName, 40, sigY + 22, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(waliKelasNip, 40, sigY + 26, { align: 'center' });
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(dateText, pageWidth - 60, sigY - 4, { align: 'center' });
      doc.text('Kepala Sekolah,', pageWidth - 60, sigY, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.text(principalName, pageWidth - 60, sigY + 22, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(principalNip.startsWith('NIP') ? principalNip : `NIP. ${principalNip}`, pageWidth - 60, sigY + 26, { align: 'center' });

      // 5. Output Blob URL and set state
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });
    };

    generatePreviewPdf();
  }, [
    activeTab,
    selectedPrintType,
    selectedClassId,
    selectedMonth,
    selectedYear,
    students,
    guruMapelList,
    sekolah,
    logoBase64,
    tenantInfo,
    strukturList,
    daysInMonth,
    selectedClassObj,
    waliKelasName,
    waliKelasNip,
    principalName,
    principalNip,
    isLandscape,
    checklistData
  ]);

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
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } else {
      toast.error('Pratinjau PDF belum siap.');
    }
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print:hidden">
              <div className="lg:col-span-1">
                <SectionCard title="Pengaturan Cetak" icon={Printer} fullWidth>
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
              <div className="lg:col-span-3">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <Eye size={14} className="text-blue-500" /> Pratinjau Dokumen Fisik (PDF Resmi)
                    </h3>
                    <div className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold uppercase px-2 py-0.5 rounded-full">
                      Format A4 {isLandscape ? 'Landscape' : 'Portrait'}
                    </div>
                  </div>
                  
                  {pdfUrl ? (
                    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white">
                      <iframe
                        id="pdf-preview-iframe"
                        src={pdfUrl}
                        className="w-full h-[680px] border-none"
                        title="Pratinjau PDF Dokumen TU"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[680px] flex flex-col items-center justify-center bg-white dark:bg-slate-950 border rounded-xl border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-xs font-semibold text-slate-500">Mempersiapkan pratinjau dokumen...</p>
                    </div>
                  )}
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
