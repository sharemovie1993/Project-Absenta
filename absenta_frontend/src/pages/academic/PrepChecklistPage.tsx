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
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);
  const [includeSchoolLogo, setIncludeSchoolLogo] = useState<boolean>(true);

  // Load logo Daerah (Kiri)
  useEffect(() => {
    const leftLogo = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url;
    if (leftLogo) {
      getBase64ImageFromUrl(leftLogo).then(res => {
        setLogoDaerahBase64(res);
      }).catch(err => {
        console.warn('Gagal memuat logo daerah base64:', err);
        setLogoDaerahBase64(null);
      });
    } else {
      setLogoDaerahBase64(null);
    }
  }, [tenantInfo?.logo_daerah_url, (sekolah as any)?.logo_daerah_url]);

  // Load logo Sekolah (Kanan)
  useEffect(() => {
    const rightLogo = tenantInfo?.logo_url || sekolah?.logo_url;
    if (rightLogo) {
      getBase64ImageFromUrl(rightLogo).then(res => {
        setLogoSekolahBase64(res);
      }).catch(err => {
        console.warn('Gagal memuat logo sekolah base64:', err);
        setLogoSekolahBase64(null);
      });
    } else {
      setLogoSekolahBase64(null);
    }
  }, [tenantInfo?.logo_url, sekolah?.logo_url]);

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
      const res = await kelasApi.getAll({ limit: 150 });
      // Filter classes to only include those that are active (is_active === true)
      const activeClasses = (res.data || []).filter((c: any) => c.is_active === true);
      setClasses(activeClasses);
      if (activeClasses.length > 0) {
        setSelectedClassId(activeClasses[0].id);
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
          let rawStudents: Siswa[] = [];
          if (selectedClassId === 'all') {
            const res = await siswaApi.getAll({ limit: 1000 });
            rawStudents = res.data || [];
          } else if (selectedClassId.startsWith('all_tingkat_')) {
            const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
            const res = await siswaApi.getAll({ tingkat: tingkatNum, limit: 500 });
            rawStudents = res.data || [];
          } else {
            const res = await siswaApi.getAll({ kelas_id: selectedClassId, limit: 150 });
            rawStudents = res.data || [];
          }
          
          // Sort alphabetically A to Z
          const sorted = [...rawStudents].sort((a, b) => {
            const nameA = (a.nama_siswa || '').toUpperCase();
            const nameB = (b.nama_siswa || '').toUpperCase();
            return nameA.localeCompare(nameB);
          });
          
          setStudents(sorted);
        } catch (err) {
          console.error(err);
          toast.error('Gagal memuat data siswa');
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

  // Extract unique grade levels (tingkat) from loaded classes list
  const uniqueTingkatList = useMemo(() => {
    const list = classes.map(c => Number(c.tingkat)).filter(t => !isNaN(t) && t > 0);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [classes]);

  const isLandscape = false;

  const waliKelasObj = useMemo(() => {
    return selectedClassObj?.WaliKelas?.[0]?.Guru as any;
  }, [selectedClassObj]);

  const waliKelasName = useMemo(() => {
    return waliKelasObj?.nama_guru || '_______________________';
  }, [waliKelasObj]);

  const waliKelasNip = useMemo(() => {
    if (!waliKelasObj?.nip) return 'NIP/NUPTK. ..............................';
    const cleanNip = String(waliKelasObj.nip).replace(/\s/g, '');
    const isNuptk = cleanNip.length === 16;
    return isNuptk ? `NUPTK. ${waliKelasObj.nip}` : `NIP. ${waliKelasObj.nip}`;
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
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // Portrait A4
      const pageHeight = 297;

      // 2. Identify target classes to print
      const targetClasses = selectedPrintType === 'sk_load'
        ? [null]
        : selectedClassId === 'all'
          ? classes
          : selectedClassId.startsWith('all_tingkat_')
            ? (() => {
                const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                return classes.filter(c => Number(c.tingkat) === tingkatNum);
              })()
            : classes.filter(c => c.id === selectedClassId);

      if (targetClasses.length === 0) {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
        return;
      }

      for (let classIndex = 0; classIndex < targetClasses.length; classIndex++) {
        const c = targetClasses[classIndex];
        let classStudents: Siswa[] = [];
        if (c && ['attendance', 'journal', 'roster'].includes(selectedPrintType)) {
          try {
            const res = await siswaApi.getAll({ kelas_id: c.id, limit: 150 });
            // Sort students alphabetically A to Z
            classStudents = (res.data || []).sort((a, b) => {
              const nameA = (a.nama_siswa || '').toUpperCase();
              const nameB = (b.nama_siswa || '').toUpperCase();
              return nameA.localeCompare(nameB);
            });
          } catch (err) {
            console.error(`Gagal memuat siswa untuk kelas ${c.nama_kelas}:`, err);
          }
        }

        const classWaliKelasObj = c?.WaliKelas?.[0]?.Guru as any;
        const classWaliKelasName = classWaliKelasObj?.nama_guru || '_______________________';
        let classWaliKelasNip = 'NIP/NUPTK. ..............................';
        if (classWaliKelasObj?.nip) {
          const cleanNip = String(classWaliKelasObj.nip).replace(/\s/g, '');
          const isNuptk = cleanNip.length === 16;
          classWaliKelasNip = isNuptk ? `NUPTK. ${classWaliKelasObj.nip}` : `NIP. ${classWaliKelasObj.nip}`;
        }

        // Draw Logo Daerah (Kiri)
        if (logoDaerahBase64) {
          try {
            doc.addImage(logoDaerahBase64, 'PNG', 15, 10, 16, 16);
          } catch (e) {
            console.warn('Failed to add logo daerah to PDF', e);
          }
        }
        
        // Draw Logo Sekolah (Kanan)
        if (includeSchoolLogo && logoSekolahBase64) {
          try {
            doc.addImage(logoSekolahBase64, 'PNG', pageWidth - 31, 10, 16, 16);
          } catch (e) {
            console.warn('Failed to add logo sekolah to PDF', e);
          }
        }
        
        // Parse print header lines from tenantInfo / fallbacks
        const rawLines = tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
          ? tenantInfo.print_header_lines
          : [
              tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
              tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
              tenantInfo?.nama_cabang_dinas || 'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV',
              tenantInfo?.name || sekolah?.nama || 'SMK NEGERI 1 PLERED'
            ];
            
        const parsedLines = rawLines.map(line => {
          if (typeof line === 'object' && line !== null) {
            return line as any;
          }
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object' && 'text' in parsed) {
              return parsed;
            }
          } catch (e) {}
          return { text: line };
        });
        
        // Draw official lines
        let currentY = 13;
        parsedLines.forEach((line, index) => {
          const isLast = index === parsedLines.length - 1;
          const isSecondLast = index === parsedLines.length - 2 && parsedLines.length > 1;
          
          let fontSize = 7.5;
          let isBold = false;
          
          if (line.fontSize) {
            fontSize = line.fontSize * 0.7;
          } else {
            if (isLast) fontSize = 11;
            else if (isSecondLast) fontSize = 8.5;
            else fontSize = 7.5;
          }
          
          if (line.bold !== undefined) {
            isBold = line.bold;
          } else {
            if (isLast || isSecondLast) isBold = true;
          }
          
          doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
          doc.setFontSize(fontSize);
          
          const textToDraw = String(line.text).toUpperCase();
          doc.text(textToDraw, pageWidth / 2, currentY, { align: 'center' });
          
          currentY += (fontSize * 0.35) + 1.2;
        });
        
        // Draw Address and Contact Info
        const address = tenantInfo?.address || sekolah?.alamat || '';
        const phone = tenantInfo?.phone || sekolah?.telepon || '';
        const email = tenantInfo?.email || sekolah?.email || '';
        const website = tenantInfo?.website || sekolah?.website || '';
        
        if (address) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          const contactText = `${address}${phone ? ` | Telp: ${phone}` : ''}`;
          doc.text(contactText, pageWidth / 2, currentY, { align: 'center' });
          currentY += 3.2;
        }
        
        if (website || email) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(6.5);
          const webText = `${website ? `Website: ${website}` : ''}${email ? ` | Email: ${email}` : ''}`;
          doc.text(webText, pageWidth / 2, currentY, { align: 'center' });
          currentY += 3;
        }
        
        // Draw double lines under header
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(15, currentY, pageWidth - 15, currentY);
        doc.setLineWidth(0.18);
        doc.line(15, currentY + 0.6, pageWidth - 15, currentY + 0.6);

        const headerEndY = currentY + 2.5; // End of Kop Surat line

        // 3. Draw Document Content
        if (selectedPrintType === 'attendance') {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('DAFTAR HADIR HARIAN SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
          doc.setFontSize(9.5);
          doc.text(`TAHUN PELAJARAN ${checklistData?.current_year?.tahun || '2025/2026'}`, pageWidth / 2, headerEndY + 10, { align: 'center' });

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          // Left info labels
          doc.text(`Program Keahlian`, 15, headerEndY + 16);
          doc.text(`Tingkat/Konsentrasi Keahlian`, 15, headerEndY + 20);
          doc.text(`: ${(c?.Jurusan as any)?.nama || (c?.Jurusan as any)?.nama_jurusan || 'Teknik Elektronika'}`, 58, headerEndY + 16);
          doc.text(`: ${c?.nama_kelas || 'X TE 1'}`, 58, headerEndY + 20);

          const head = [
            [
              { content: 'NO', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
              { content: 'NIS', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
              { content: 'NISN', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
              { content: 'NAMA SISWA', rowSpan: 3, styles: { valign: 'middle' } },
              { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } },
              { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } }
            ],
            [
              { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } },
              { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } }
            ],
            [
              ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } })),
              ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } }))
            ]
          ];
          const body = classStudents.map((s, idx) => [
            idx + 1,
            s.nis || '-',
            s.nisn || '-',
            s.nama_siswa?.toUpperCase() || '',
            ...Array.from({ length: 24 }).map(() => '')
          ]);
          body.push([
            '',
            '',
            '',
            { content: '+++', styles: { halign: 'center' } } as any,
            ...Array.from({ length: 24 }).map(() => '')
          ]);

          autoTable(doc, {
            startY: headerEndY + 24,
            head: head as any,
            body: body as any,
            theme: 'grid',
            styles: { fontSize: 5.5, font: 'Helvetica', cellPadding: 0.8 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] },
            bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            columnStyles: {
              0: { cellWidth: 6, halign: 'center' },
              1: { cellWidth: 15, halign: 'center' },
              2: { cellWidth: 15, halign: 'center' },
              3: { cellWidth: 38 },
            }
          });
        } else if (selectedPrintType === 'journal') {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('BUKU JURNAL HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)', pageWidth / 2, headerEndY + 6, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

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
            startY: headerEndY + 16,
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
          doc.text('DAFTAR KELAS & DAFTAR FORMAT PENILAIAN GURU', pageWidth / 2, headerEndY + 6, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

          const head = [[
            { content: 'NO', styles: { halign: 'center' } },
            { content: 'NIS / NISN', styles: { halign: 'center' } },
            { content: 'NAMA LENGKAP SISWA' },
            { content: 'L/P', styles: { halign: 'center' } },
            ...Array.from({ length: 10 }).map((_, i) => ({ content: `COL ${i+1}`, styles: { halign: 'center' } }))
          ]];
          const body = classStudents.map((s, idx) => [
            idx + 1,
            s.nis || '-',
            s.nama_siswa?.toUpperCase() || '',
            String(s.jenis_kelamin).startsWith('L') ? 'L' : 'P',
            ...Array.from({ length: 10 }).map(() => '')
          ]);
          autoTable(doc, {
            startY: headerEndY + 16,
            head: head as any,
            body: body as any,
            theme: 'grid',
            styles: { fontSize: 7.5, font: 'Helvetica', cellPadding: 1.2 },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
            bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
            columnStyles: {
              0: { cellWidth: 6, halign: 'center' },
              1: { cellWidth: 16, halign: 'center' },
              2: { cellWidth: 48 },
              3: { cellWidth: 6, halign: 'center' },
            }
          });
        } else if (selectedPrintType === 'sk_load') {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.text(`LAMPIRAN SURAT KEPUTUSAN KEPALA ${sekolah?.nama?.toUpperCase() || 'SMK NEGERI CONTOH ABSENTA'}`, pageWidth / 2, headerEndY + 5, { align: 'center' });
          doc.text(`NOMOR: 421.3 / 088 / TU-CADISDIK / VI / ${new Date().getFullYear()}`, pageWidth / 2, headerEndY + 9, { align: 'center' });
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('DISTRIBUSI GURU PENGAMPU BEBAN TUGAS MENGAJAR', pageWidth / 2, headerEndY + 15, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 19, { align: 'center' });

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
            startY: headerEndY + 23,
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
        if (finalY + 35 > pageHeight) {
          doc.addPage();
          finalY = 20;
        }
        const sigY = finalY + 8;

        if (selectedPrintType === 'attendance') {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.text('Wali Kelas,', pageWidth - 60, sigY + 4, { align: 'center' });

          doc.setFont('Helvetica', 'bold');
          doc.text(classWaliKelasName, pageWidth - 60, sigY + 24, { align: 'center' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text(classWaliKelasNip, pageWidth - 60, sigY + 28, { align: 'center' });
        } else {
          if (['journal', 'roster'].includes(selectedPrintType)) {
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Mengetahui,', 40, sigY, { align: 'center' });
            doc.text(`Wali Kelas ${c?.nama_kelas || '---'}`, 40, sigY + 4, { align: 'center' });

            doc.setFont('Helvetica', 'bold');
            doc.text(classWaliKelasName, 40, sigY + 22, { align: 'center' });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(classWaliKelasNip, 40, sigY + 26, { align: 'center' });
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
        }

        if (classIndex < targetClasses.length - 1) {
          doc.addPage();
        }
      }

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
    logoDaerahBase64,
    logoSekolahBase64,
    tenantInfo,
    strukturList,
    daysInMonth,
    selectedClassObj,
    waliKelasName,
    waliKelasNip,
    principalName,
    principalNip,
    isLandscape,
    checklistData,
    sekolah,
    includeSchoolLogo,
    classes
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
                        <option value="attendance">1. DAFTAR HADIR HARIAN SISWA</option>
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
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
                          >
                            {uniqueTingkatList.map(t => (
                              <option key={`all_tingkat_${t}`} value={`all_tingkat_${t}`}>
                                🖨️ CETAK TINGKAT {t} (MASAL)
                              </option>
                            ))}
                            <option value="all">🖨️ CETAK SEMUA KELAS (SELURUH SEKOLAH)</option>
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

                    {/* Checkbox to Toggle Right Logo (Sekolah) */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="toggle-school-logo"
                        checked={includeSchoolLogo}
                        onChange={(e) => setIncludeSchoolLogo(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-800 focus:ring-blue-500 bg-white dark:bg-slate-900"
                      />
                      <label htmlFor="toggle-school-logo" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                        Sertakan Logo Sekolah (Kanan)
                      </label>
                    </div>

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
                        src={`${pdfUrl}#toolbar=1&navpanes=0&pagemode=none`}
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
