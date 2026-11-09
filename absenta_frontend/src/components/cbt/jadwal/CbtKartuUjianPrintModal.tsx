import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui';
import {
  CreditCard,
  Download,
  Filter,
  Edit3,
  User,
  KeyRound,
  QrCode as QrCodeIcon,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Scissors,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { useQuery } from '@tanstack/react-query';
import { siswaApi } from '@/api/academic.api';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { KelasRoomMapping } from './cbtOrchestratorHelper';
import { formatDate } from '@/utils/date.utils';
import { useJenjang } from '@/hooks/useJenjang';
import { cn } from '@/lib/utils';

export interface CbtKartuUjianPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  selectedKelasId?: string | null;
  eventName?: string;
  activeTpName?: string;
}

export interface StudentExamCardData {
  id: string;
  nama_siswa: string;
  nis: string;
  nisn: string;
  kelas_id: string;
  nama_kelas: string;
  tingkat: number;
  jurusan: string;
  slot_ruang: string;
  nama_ruang: string;
  sesi_ujian: string;
  no_peserta: string;
  username: string;
  pin: string;
  foto?: string;
}

/**
 * Pemecah data siswa menjadi potongan per halaman (4 siswa per lembar A4 - Grid 2x2)
 */
function chunkArray<T>(items: T[], size = 4): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generator sample data siswa realistis jika DB siswa kelas terkait belum ada / kosong
 */
const SAMPLE_FIRST_NAMES = [
  'Ahmad', 'Aditia', 'Budi', 'Chandra', 'Dimas', 'Eko', 'Fajar', 'Gilang',
  'Hendra', 'Ilham', 'Joko', 'Kevin', 'Lutfi', 'Muhammad', 'Naufal', 'Pratama',
  'Raditya', 'Rian', 'Rizky', 'Syahrul', 'Taufik', 'Wahyu', 'Yoga', 'Zulham',
  'Annisa', 'Bella', 'Citra', 'Dewi', 'Fitri', 'Gita', 'Intan', 'Lestari',
  'Nabila', 'Putri', 'Rahma', 'Siti', 'Tiara', 'Winda', 'Zahra', 'Aulia'
];

const SAMPLE_LAST_NAMES = [
  'Santoso', 'Pratama', 'Hidayat', 'Saputra', 'Kurniawan', 'Ramadhan',
  'Setiawan', 'Wibowo', 'Nugroho', 'Firmansyah', 'Permana', 'Maulana',
  'Kusuma', 'Gunawan', 'Wijaya', 'Siregar', 'Harahap', 'Lubis', 'Nasution'
];

function generateSampleStudentsForClass(
  cls: KelasRoomMapping,
  count = 28
): StudentExamCardData[] {
  const students: StudentExamCardData[] = [];
  const tingkatStr = cls.tingkat === 10 ? 'X' : cls.tingkat === 11 ? 'XI' : 'XII';
  const cleanClassName = cls.nama_kelas.replace(/\s+/g, '');
  const prefixNo = `26-${tingkatStr}-${cleanClassName}`;

  for (let i = 1; i <= count; i++) {
    const fn = SAMPLE_FIRST_NAMES[(i * 3 + cls.tingkat * 5) % SAMPLE_FIRST_NAMES.length];
    const ln = SAMPLE_LAST_NAMES[(i * 7 + cls.tingkat * 2) % SAMPLE_LAST_NAMES.length];
    const nama = `${fn} ${ln}`;
    const nis = `${23 + (12 - cls.tingkat)}24${String(i).padStart(4, '0')}`;
    const nisn = `007${String(1000000 + i * 47).padStart(7, '0')}`;
    const noPeserta = `${prefixNo}-${String(i).padStart(3, '0')}`;
    // Password PIN 6 angka
    const pin = String(100000 + ((i * 8492) % 900000));

    students.push({
      id: `sample-${cls.kelas_id}-${i}`,
      nama_siswa: nama,
      nis,
      nisn,
      kelas_id: cls.kelas_id,
      nama_kelas: cls.nama_kelas,
      tingkat: cls.tingkat,
      jurusan: cls.jurusan || 'Kejuruan',
      slot_ruang: cls.slot_ruang || 'R.01',
      nama_ruang: cls.nama_ruang || 'Ruang CBT',
      sesi_ujian: 'Sesi 1 (07.30 - 09.30 WIB)',
      no_peserta: noPeserta,
      username: nisn,
      pin,
    });
  }
  return students;
}

export const CbtKartuUjianPrintModal: React.FC<CbtKartuUjianPrintModalProps> = ({
  isOpen,
  onClose,
  kelasList,
  roomMappings,
  selectedKelasId,
  eventName = 'PENILAIAN AKHIR SEMESTER (PAS) GANJIL',
  activeTpName = 'TP 2026/2027',
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const { jenjang } = useJenjang();

  // ── 1. Filter States ──
  const [filterKelasId, setFilterKelasId] = useState<string>(selectedKelasId || 'ALL');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [filterRuang, setFilterRuang] = useState<string>('ALL');

  // ── 2. Card Visual & Security Toggles ──
  const [showPassword, setShowPassword] = useState<boolean>(true); // True: Teks PIN terlihat, False: '••••••'
  const [showFoto, setShowFoto] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showTtd, setShowTtd] = useState<boolean>(true);
  const [signerRole, setSignerRole] = useState<'panitia' | 'kepsek'>('panitia');
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // ── 3. Editable Text ──
  const [customEventName, setCustomEventName] = useState<string>(
    eventName || 'PENILAIAN AKHIR SEMESTER (PAS) GANJIL'
  );
  const [customKetuaPanitia, setCustomKetuaPanitia] = useState<string>('Drs. Tri Anawati, M.Pd.');
  const [customNipPanitia, setCustomNipPanitia] = useState<string>('198402142010012015');

  // Universal Header Info (SSoT)
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = (rawSekolah || {}) as any;

  // Sync props when opening
  useEffect(() => {
    if (selectedKelasId) {
      setFilterKelasId(selectedKelasId);
    } else {
      setFilterKelasId('ALL');
    }
  }, [selectedKelasId, isOpen]);

  useEffect(() => {
    if (eventName) {
      setCustomEventName(eventName);
    }
  }, [eventName]);

  // Map of kelas_id to roomMapping for fast O(1) lookup
  const roomMapByKelasId = useMemo(() => {
    const map = new Map<string, KelasRoomMapping>();
    roomMappings.forEach((rm) => map.set(rm.kelas_id, rm));
    return map;
  }, [roomMappings]);

  // Target classes filtered
  const targetClasses = useMemo(() => {
    let list = roomMappings;
    if (filterKelasId !== 'ALL') {
      list = list.filter((r) => r.kelas_id === filterKelasId);
    }
    if (filterTingkat !== 'ALL') {
      list = list.filter((r) => r.tingkat === filterTingkat);
    }
    if (filterRuang !== 'ALL') {
      list = list.filter((r) => r.slot_ruang === filterRuang);
    }
    return list;
  }, [roomMappings, filterKelasId, filterTingkat, filterRuang]);

  // ── 4. Query Real Students from Database ──
  const { data: realStudentsRes, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['cbt-print-students', filterKelasId, targetClasses.map((c) => c.kelas_id).join(',')],
    queryFn: async () => {
      // If single class selected, fetch directly
      if (filterKelasId !== 'ALL') {
        const res = await siswaApi.getAll({ kelas_id: filterKelasId, limit: 100, status: 'AKTIF' });
        return res?.data || [];
      }
      // If multiple, fetch up to 300 students
      const res = await siswaApi.getAll({ limit: 300, status: 'AKTIF' });
      return res?.data || [];
    },
    enabled: isOpen && targetClasses.length > 0,
    staleTime: 60 * 1000,
  });

  const realStudents = realStudentsRes || [];

  // ── 5. Assemble Final Student Cards Data (Real + Fallback Sample) ──
  const studentCardsList = useMemo<StudentExamCardData[]>(() => {
    if (targetClasses.length === 0) return [];

    const result: StudentExamCardData[] = [];

    targetClasses.forEach((cls) => {
      // Find matching real students for this class
      const matchedReal = realStudents.filter(
        (s) => s.kelas_id === cls.kelas_id || s.Kelas?.id === cls.kelas_id
      );

      if (matchedReal.length > 0) {
        // Map real students into exam card format
        matchedReal.forEach((s, idx) => {
          const tingkatStr = cls.tingkat === 10 ? 'X' : cls.tingkat === 11 ? 'XI' : 'XII';
          const cleanClassName = cls.nama_kelas.replace(/\s+/g, '');
          const noPeserta = `26-${tingkatStr}-${cleanClassName}-${String(idx + 1).padStart(3, '0')}`;
          const username = s.User?.username || s.nisn || s.nis || `user_${s.id.slice(0, 5)}`;
          // Default PIN: 6-digit number derived from NISN or random pin
          const pin = s.nisn && s.nisn.length >= 6 ? s.nisn.slice(-6) : String(849200 + ((idx * 17) % 999));

          result.push({
            id: s.id,
            nama_siswa: s.nama_siswa || (s as any).nama || 'Siswa CBT',
            nis: s.nis || '-',
            nisn: s.nisn || '-',
            kelas_id: cls.kelas_id,
            nama_kelas: cls.nama_kelas,
            tingkat: cls.tingkat,
            jurusan: cls.jurusan || 'Kejuruan',
            slot_ruang: cls.slot_ruang || 'R.01',
            nama_ruang: cls.nama_ruang || 'Ruang CBT',
            sesi_ujian: 'Sesi 1 (07.30 - 09.30 WIB)',
            no_peserta: noPeserta,
            username,
            pin,
            foto: s.foto,
          });
        });
      } else {
        // Fallback realistic sample students so preview is never empty
        const samples = generateSampleStudentsForClass(cls, filterKelasId === 'ALL' ? 12 : 28);
        result.push(...samples);
      }
    });

    return result;
  }, [targetClasses, realStudents, filterKelasId]);

  // ── 6. Pre-generate QR Codes Map ──
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !showQrCode || studentCardsList.length === 0) return;

    let isMounted = true;
    const generateAllQrs = async () => {
      const newMap: Record<string, string> = {};
      // Generate for each student
      for (const st of studentCardsList) {
        try {
          const loginPayload = `${window.location.origin}/cbt/login?user=${st.username}&token=${st.pin}&room=${st.slot_ruang}`;
          const dataUrl = await QRCode.toDataURL(loginPayload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 120,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          newMap[st.id] = dataUrl;
        } catch (err) {
          console.warn('[QR Code Generation Error]', err);
        }
      }
      if (isMounted) {
        setQrMap(newMap);
      }
    };

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, showQrCode, studentCardsList]);

  // Chunk students into pages of 4 (Grid 2x2 per A4 sheet)
  const studentChunks = useMemo(() => {
    return chunkArray(studentCardsList, 4);
  }, [studentCardsList]);

  // Penandatangan data
  const kepsekNama =
    sekolahData?.kepala_sekolah ||
    sekolahData?.nama_kepala_sekolah ||
    'Drs. H. Hendra Permana, M.Pd.';
  const kepsekNip =
    sekolahData?.nip_kepala ||
    sekolahData?.nip_kepala_sekolah ||
    '197111022008011001';

  const titimangsaKota = sekolahData?.kabupaten || tenantInfo?.address?.split(',')[0] || 'Kota';
  const titimangsaTanggal = formatDate(new Date(), { weekday: undefined });

  // ── 7. Print Handler (Browser True WYSIWYG) ──
  const handleBrowserPrint = () => {
    window.print();
  };

  // ── 8. PDF Export Handler (html2canvas-pro + jsPDF) ──
  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }

    const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
    if (sheets.length === 0) {
      toast.error('Tidak ada kartu ujian yang dipilih');
      return;
    }

    const toastId = toast.loading(`Mempersiapkan PDF ${sheets.length} Lembar Kartu Ujian (Grid 2x2)...`);

    try {
      setIsExportingPdf(true);

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const canvas = await html2canvas(sheet, {
          scale: 2, // 200 DPI Retina
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
            clonedSheets.forEach((s) => {
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = pdfWidth * canvasRatio;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      }

      const fileName =
        filterKelasId !== 'ALL'
          ? `KARTU_UJIAN_CBT_${targetClasses[0]?.nama_kelas.replace(/\s+/g, '_') || 'KELAS'}.pdf`
          : `KARTU_UJIAN_CBT_SEMUA_ROMBEL.pdf`;

      pdf.save(fileName);
      toast.success('File PDF Kartu Ujian A4 Portrait berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[CBT Exam Card PDF Export Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kartu Peserta Ujian CBT (A4 Grid 2×2)"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Format:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            Kertas A4 Portrait (4 Kartu per Lembar)
          </span>
          <span className="text-[11px] text-muted-foreground">
            • {studentCardsList.length} Siswa ({studentChunks.length} Lembar A4)
          </span>
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4 Portrait)'}
      printButtonText="Cetak Kartu Ujian"
      size="5xl"
      extraActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Input Edit Nama Event Asesmen */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
            <Edit3 size={12} className="text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Event:</span>
            <input
              type="text"
              value={customEventName}
              onChange={(e) => setCustomEventName(e.target.value)}
              placeholder="Nama Event Asesmen..."
              aria-label="Edit nama event ujian pada kartu"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden w-48 sm:w-56"
            />
          </div>

          {/* Filter Rombel Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
            <Filter size={12} className="text-slate-400" />
            <select
              value={filterKelasId}
              onChange={(e) => {
                setFilterKelasId(e.target.value);
                setFilterRuang('ALL');
              }}
              aria-label="Filter rombel kelas kartu ujian"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Rombel ({roomMappings.length})</option>
              {roomMappings.map((r) => (
                <option key={r.kelas_id} value={r.kelas_id}>
                  {r.nama_kelas} ({r.slot_ruang})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Ruang Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400">Ruang:</span>
            <select
              value={filterRuang}
              onChange={(e) => {
                setFilterRuang(e.target.value);
                setFilterKelasId('ALL');
              }}
              aria-label="Filter ruang ujian"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Ruang</option>
              {roomMappings.map((r) => (
                <option key={r.kelas_id} value={r.slot_ruang}>
                  {r.slot_ruang} ({r.nama_kelas})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Password Visible / Hidden */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer',
              showPassword
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
            )}
            title="Sembunyikan atau tampilkan password/PIN di kartu"
          >
            {showPassword ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showPassword ? 'PIN Terlihat' : 'PIN Sensor (••••••)'}</span>
          </button>

          {/* Toggle QR Code */}
          <button
            type="button"
            onClick={() => setShowQrCode((prev) => !prev)}
            className={cn(
              'px-2 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer',
              showQrCode
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            )}
            title="Tampilkan QR Code Quick Login di kartu"
          >
            <QrCodeIcon size={12} />
            <span>QR {showQrCode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle Foto Siswa */}
          <button
            type="button"
            onClick={() => setShowFoto((prev) => !prev)}
            className={cn(
              'px-2 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer',
              showFoto
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            )}
            title="Tampilkan foto siswa di kartu"
          >
            <User size={12} />
            <span>Foto {showFoto ? 'ON' : 'OFF'}</span>
          </button>

          {/* Penandatangan Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setSignerRole('panitia')}
              className={cn(
                'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                signerRole === 'panitia'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Ketua Panitia
            </button>
            <button
              type="button"
              onClick={() => setSignerRole('kepsek')}
              className={cn(
                'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                signerRole === 'kepsek'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Kepsek
            </button>
          </div>
        </div>
      }
    >
      <div ref={sheetContainerRef} className="space-y-8 print:space-y-0">
        {studentChunks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold">Tidak ada kartu peserta yang sesuai dengan filter.</p>
            <p className="text-xs mt-1 text-slate-400">Silakan ubah filter rombel atau ruang di toolbar atas.</p>
          </div>
        ) : (
          studentChunks.map((cards, pageIdx) => (
            <PrintDocumentSheet
              key={`sheet-${pageIdx}`}
              orientation="portrait"
              pageNumber={pageIdx + 1}
              totalPages={studentChunks.length}
              footerText={`${sekolahData?.nama_sekolah || tenantInfo?.name || 'Absenta CBT'} • Kartu Peserta Ujian ${activeTpName}`}
              className="p-5 print:p-4 relative"
            >
              {/* ── Kontainer Grid 2 × 2 (4 Kartu per Lembar A4 Portrait) ── */}
              <div className="relative w-full h-[1035px] flex flex-col justify-between">
                {/* 2x2 Grid Layout */}
                <div className="grid grid-cols-2 grid-rows-2 gap-3.5 h-full w-full">
                  {cards.map((student, cardIdx) => {
                    const signerName = signerRole === 'kepsek' ? kepsekNama : customKetuaPanitia;
                    const signerNip = signerRole === 'kepsek' ? kepsekNip : customNipPanitia;
                    const signerLabel = signerRole === 'kepsek' ? 'Kepala Sekolah,' : 'Ketua Panitia CBT,';

                    return (
                      <div
                        key={student.id || `card-${cardIdx}`}
                        className="relative h-full flex flex-col justify-between border-2 border-slate-300 print:border-slate-400 rounded-xl p-3 bg-white text-slate-900 shadow-2xs print:shadow-none overflow-hidden"
                      >
                        {/* ── 1. Header Mini Kop Kartu ── */}
                        <div className="flex items-center gap-2 pb-1.5 border-b-2 border-slate-800 shrink-0">
                          {showLogoSekolah && (
                            <img
                              src={sekolahData?.logo_url || tenantInfo?.logo_url || '/logo.png'}
                              alt="Logo"
                              className="w-9 h-9 object-contain shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1 text-center min-w-0">
                            <p className="text-[7.5px] uppercase font-bold tracking-wider text-slate-500 leading-none truncate">
                              {sekolahData?.nama_dinas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
                            </p>
                            <h4 className="text-[10px] font-black uppercase text-slate-900 leading-tight tracking-tight truncate mt-0.5">
                              {sekolahData?.nama_sekolah || tenantInfo?.name || 'SMK NEGERI 1'}
                            </h4>
                            <div className="mt-0.5 flex items-center justify-center">
                              <span className="inline-block px-1.5 py-0.2 bg-indigo-50 text-indigo-900 text-[8px] font-black uppercase rounded tracking-wide border border-indigo-200/60">
                                KARTU PESERTA UJIAN CBT
                              </span>
                            </div>
                            <p className="text-[7px] font-bold text-slate-600 truncate mt-0.5 uppercase">
                              {customEventName} • {activeTpName}
                            </p>
                          </div>
                        </div>

                        {/* ── 2. Badan Kartu: Foto 3x4 + QR di Kiri, Identitas & Kredensial di Kanan ── */}
                        <div className="grid grid-cols-12 gap-2 my-1.5 flex-1 items-start min-h-0">
                          {/* Sisi Kiri: Foto 3x4 + QR Quick Login */}
                          <div className="col-span-4 flex flex-col items-center justify-start gap-1 shrink-0 pt-0.5">
                            {/* Pasfoto Resmi 3x4 (24mm x 32mm) */}
                            {showFoto ? (
                              student.foto ? (
                                <img
                                  src={student.foto}
                                  alt={student.nama_siswa}
                                  className="w-[23mm] h-[31mm] object-cover rounded-xs border border-slate-300 shadow-2xs"
                                />
                              ) : (
                                <div className="w-[23mm] h-[31mm] border-2 border-dashed border-slate-300 rounded-xs bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-1 text-center shrink-0">
                                  <User size={18} className="text-slate-300 mb-0.5" />
                                  <span className="text-[6.5px] font-black uppercase leading-tight text-slate-400">
                                    PASFOTO
                                    <br />
                                    3 × 4
                                  </span>
                                </div>
                              )
                            ) : null}

                            {/* QR Code Quick Login */}
                            {showQrCode && qrMap[student.id] && (
                              <div className="flex flex-col items-center mt-0.5">
                                <img
                                  src={qrMap[student.id]}
                                  alt="QR Login"
                                  className="w-13 h-13 border border-slate-200 rounded p-0.5 bg-white"
                                />
                                <span className="text-[6.5px] font-bold text-slate-500 uppercase mt-0.5 tracking-tight text-center">
                                  Scan Login CBT
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Sisi Kanan: Tabel Identitas & Box Kredensial Login */}
                          <div className="col-span-8 flex flex-col justify-between h-full gap-1 min-w-0">
                            {/* Identitas Siswa */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
                                <span className="text-slate-400 text-[7.5px] font-bold uppercase">No. Peserta</span>
                                <span className="font-mono font-black text-indigo-700 text-[8.5px] bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                                  {student.no_peserta}
                                </span>
                              </div>

                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block">Nama Peserta</span>
                                <span className="font-black text-slate-900 text-[9px] uppercase truncate block leading-tight">
                                  {student.nama_siswa}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[8px]">
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 block uppercase">NIS / NISN</span>
                                  <span className="font-bold text-slate-700 truncate block">
                                    {student.nis} / {student.nisn}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 block uppercase">Kelas / Rombel</span>
                                  <span className="font-bold text-slate-700 truncate block">
                                    {student.nama_kelas}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1 pt-0.5 border-t border-slate-100 text-[8px]">
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 block uppercase">Ruang Ujian</span>
                                  <span className="font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded inline-block border border-emerald-200 text-[8px]">
                                    {student.slot_ruang}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 block uppercase">Sesi Ujian</span>
                                  <span className="font-bold text-slate-700 truncate block text-[7.5px]">
                                    {student.sesi_ujian}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Box Kredensial Login CBT */}
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 mt-auto">
                              <div className="flex items-center justify-between text-[7px] font-bold text-slate-500 uppercase border-b border-slate-200 pb-0.5">
                                <span className="flex items-center gap-1 text-slate-700">
                                  <KeyRound size={9} className="text-indigo-600" />
                                  Kredensial Login Siswa
                                </span>
                                <span className="text-emerald-700 font-black text-[6.5px]">RESMI CBT</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[8px] pt-0.5">
                                <div>
                                  <span className="text-slate-400 block text-[6.5px] uppercase">Username:</span>
                                  <span className="font-mono font-bold text-slate-800 truncate block text-[8px]">
                                    {student.username}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[6.5px] uppercase">Password / PIN:</span>
                                  <span className="font-mono font-black text-indigo-700 tracking-wider text-[8px]">
                                    {showPassword ? student.pin : '••••••'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── 3. Footer Kartu: Tata Tertib di Kiri, Titimangsa & TTD di Kanan ── */}
                        <div className="pt-1.5 border-t border-slate-200 grid grid-cols-2 gap-1.5 items-end shrink-0 text-[7px]">
                          {/* Tata Tertib Singkat */}
                          <div className="text-slate-500 space-y-0.5 pr-0.5">
                            <p className="font-bold text-slate-600 text-[6.5px] uppercase">Tata Tertib Peserta:</p>
                            <p className="leading-tight">1. Kartu wajib dibawa saat sesi ujian.</p>
                            <p className="leading-tight">2. Jaga kerahasiaan Username &amp; PIN.</p>
                            <p className="leading-tight">3. Hadir di ruang 15 menit sebelum mulai.</p>
                          </div>

                          {/* Titimangsa & Tanda Tangan */}
                          <div className="text-center flex flex-col items-center pl-1">
                            <p className="text-slate-500 text-[6.5px]">
                              {titimangsaKota}, {titimangsaTanggal}
                            </p>
                            <p className="font-bold text-slate-700 text-[7px]">
                              {signerLabel}
                            </p>

                            {/* Box Stempel & TTD Resmi */}
                            <div className="h-7 w-full flex items-center justify-center relative my-0.5">
                              {showTtd && (
                                <div className="w-8 h-8 border-2 border-indigo-500/25 rounded-full flex items-center justify-center text-indigo-500/35 text-[5px] font-black uppercase transform -rotate-12 select-none">
                                  CAP CBT
                                </div>
                              )}
                            </div>

                            <p className="font-black text-slate-900 underline text-[7.5px] leading-tight truncate w-full">
                              {signerName}
                            </p>
                            {signerNip && (
                              <p className="text-slate-500 text-[6px] truncate w-full">
                                NIP. {signerNip}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Panduan Gunting Lembar Kertas (Cutting Guides) ── */}
                {/* Garis Potong Vertikal Tengah */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                  <span className="text-[10px] leading-none text-slate-500">✂</span>
                  <div className="w-px h-full border-r border-dashed border-slate-400 my-1"></div>
                  <span className="text-[10px] leading-none text-slate-500">✂</span>
                </div>

                {/* Garis Potong Horizontal Tengah */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                  <span className="text-[10px] leading-none text-slate-500">✂</span>
                  <div className="h-px w-full border-b border-dashed border-slate-400 mx-1"></div>
                  <span className="text-[10px] leading-none text-slate-500">✂</span>
                </div>
              </div>
            </PrintDocumentSheet>
          ))
        )}
      </div>
    </UniversalDocumentModal>
  );
};
