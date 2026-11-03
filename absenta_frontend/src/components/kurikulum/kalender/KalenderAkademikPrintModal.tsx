import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { useQuery } from '@tanstack/react-query';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { CalendarEvent } from './EventFormModal';
import { formatDate } from '@/utils/layoutUtils';
import { cn } from '@/lib/utils';
import { Edit3, RotateCcw, LayoutTemplate, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KalenderAkademikPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  tahunPelajaranNama?: string;
}

interface MonthDef {
  name: string;
  year: number;
  monthIndex: number; // 0-indexed: 0 = Jan, 11 = Dec
}

type PrintLayoutMode = '1-page-landscape' | '2-page-portrait' | 'ganjil-portrait' | 'genap-portrait';

const cleanNip = (rawDetails?: string | null): string => {
  if (!rawDetails) return '-';
  const match = rawDetails.match(/NIP[:\s]+([0-9\s]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const digits = rawDetails.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    return digits;
  }
  return rawDetails.trim() || '-';
};

function formatDateToYYYYMMDD(d: Date | string): string {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseSchoolYear(tpNama?: string): { startYear: number; endYear: number } {
  if (tpNama) {
    const match = tpNama.match(/(\d{4})\s*[\/\-]\s*(\d{4})/);
    if (match) {
      return { startYear: parseInt(match[1], 10), endYear: parseInt(match[2], 10) };
    }
    const singleMatch = tpNama.match(/(\d{4})/);
    if (singleMatch) {
      const y = parseInt(singleMatch[1], 10);
      return { startYear: y, endYear: y + 1 };
    }
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() >= 6 ? currentYear : currentYear - 1;
  return { startYear, endYear: startYear + 1 };
}

function buildMonthDays(year: number, monthIndex: number): (number | null)[] {
  const firstDay = new Date(year, monthIndex, 1).getDay(); // 0 is Sunday, 1 is Monday...
  const adjFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Standar Kaldik Sekolah (ISO 8601): 0=Senin ... 6=Minggu
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < adjFirstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

function getEventsOnDate(events: CalendarEvent[], year: number, monthIndex: number, day: number): CalendarEvent[] {
  const d = new Date(year, monthIndex, day);
  const dateStr = formatDateToYYYYMMDD(d);
  return events.filter(e => {
    const startStr = formatDateToYYYYMMDD(e.tanggal_mulai);
    const endStr = formatDateToYYYYMMDD(e.tanggal_selesai);
    return dateStr >= startStr && dateStr <= endStr;
  });
}

function getDayCellStyle(dayEvents: CalendarEvent[], isSunday: boolean): { bgClass: string; textClass: string } {
  if (dayEvents.length > 0) {
    if (dayEvents.some(e => e.jenis === 'LIBUR_NASIONAL')) {
      return { bgClass: 'bg-red-500 font-black', textClass: 'text-white' };
    }
    if (dayEvents.some(e => e.jenis === 'LIBUR_SEKOLAH')) {
      return { bgClass: 'bg-amber-400 font-black', textClass: 'text-slate-950' };
    }
    if (dayEvents.some(e => e.jenis === 'PTS' || e.jenis === 'PAS')) {
      return { bgClass: 'bg-blue-600 font-black', textClass: 'text-white' };
    }
    if (dayEvents.some(e => e.jenis === 'KEGIATAN')) {
      return { bgClass: 'bg-emerald-600 font-black', textClass: 'text-white' };
    }
    return { bgClass: 'bg-slate-500 font-bold', textClass: 'text-white' };
  }
  if (isSunday) {
    return { bgClass: 'bg-red-50/70', textClass: 'text-red-600 font-bold' };
  }
  return { bgClass: 'bg-white', textClass: 'text-slate-800' };
}

function getJenisLabel(jenis: string): string {
  switch (jenis) {
    case 'LIBUR_NASIONAL': return 'Libur Nasional';
    case 'LIBUR_SEKOLAH': return 'Libur Sekolah';
    case 'PTS': return 'Sumatif Tengah Semester (STS)';
    case 'PAS': return 'Sumatif Akhir Semester (SAS)';
    case 'KEGIATAN': return 'Kegiatan Sekolah';
    case 'MINGGU_EFEKTIF': return 'Minggu Efektif';
    default: return 'Lainnya';
  }
}

// Komponen Kartu Bulan Cetak
const PrintMonthGrid: React.FC<{
  month: MonthDef;
  events: CalendarEvent[];
  compact?: boolean;
}> = React.memo(({ month, events, compact = false }) => {
  const days = useMemo(() => buildMonthDays(month.year, month.monthIndex), [month.year, month.monthIndex]);
  // Standar Resmi Kaldik Kedinasan / ISO 8601: Mulai dari SENIN
  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="border border-black/40 rounded overflow-hidden flex flex-col bg-white">
      {/* Month Header */}
      <div
        className={cn(
          "bg-slate-800 text-white text-center font-bold uppercase",
          compact ? "py-0.5 text-[9.5px]" : "py-1 text-[10.5px]"
        )}
      >
        {month.name} {month.year}
      </div>

      {/* Weekday Names Header */}
      <div
        className={cn(
          "grid grid-cols-7 border-b border-black/20 bg-slate-100 font-bold text-center",
          compact ? "py-0.5 text-[7px]" : "py-0.5 text-[8px]"
        )}
      >
        {dayNames.map((d, i) => (
          <div
            key={d}
            className={cn(
              i === 6
                ? "text-red-600 font-black"
                : i === 5
                ? "text-amber-700 font-bold"
                : "text-slate-700"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div
        className={cn(
          "grid grid-cols-7 gap-[1px] text-center flex-1 bg-slate-50/20",
          compact ? "p-0.5 text-[7.5px]" : "p-1 text-[8.5px]"
        )}
      >
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className={compact ? "h-3.5" : "h-5"} />;
          }

          const isSunday = idx % 7 === 6; // Standar Senin: Minggu adalah kolom ke-7 (index 6)
          const dayEvents = getEventsOnDate(events, month.year, month.monthIndex, day);
          const style = getDayCellStyle(dayEvents, isSunday);

          return (
            <div
              key={`day-${idx}`}
              className={cn(
                "flex items-center justify-center rounded-[1.5px] leading-none transition-colors select-none",
                compact ? "h-3.5" : "h-5",
                style.bgClass,
                style.textClass
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
});

PrintMonthGrid.displayName = 'PrintMonthGrid';

export const KalenderAkademikPrintModal: React.FC<KalenderAkademikPrintModalProps> = ({
  isOpen,
  onClose,
  events = [],
  tahunPelajaranNama = '2026/2027',
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const { user, isKurikulum } = useCapabilities();

  // Mode Layout: 1 Halaman 12 Bulan (Landscape) vs 2 Halaman Per Semester (Portrait)
  const [printLayoutMode, setPrintLayoutMode] = useState<PrintLayoutMode>('1-page-landscape');
  const [isEditingSigners, setIsEditingSigners] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { startYear, endYear } = useMemo(() => parseSchoolYear(tahunPelajaranNama), [tahunPelajaranNama]);

  // Query Struktur Organisasi & Profil Sekolah untuk Integrasi Otomatis Pejabat Penandatangan
  const { data: treeRes } = useQuery({
    queryKey: ['struktur-tree-signers-kalender'],
    queryFn: () => getStrukturTree().catch(() => null),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['struktur-list-signers-kalender'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile-signers-kalender'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  // Resolusi Pejabat Penandatangan Otomatis
  const resolvedSigners = useMemo(() => {
    const tree = (treeRes as any)?.data || treeRes || {};
    const list = Array.isArray((listRes as any)?.data)
      ? (listRes as any).data
      : Array.isArray(listRes)
      ? listRes
      : [];
    const sekolah = (sekolahRes as any)?.data || sekolahRes || rawSekolah || {};

    // 1. KEPALA SEKOLAH
    let kepsekNama = sekolah?.kepala_sekolah || '';
    let kepsekNip = cleanNip(sekolah?.nip_kepala);

    const kepsekNodes = Array.isArray(tree['KEPALA_SEKOLAH']) ? tree['KEPALA_SEKOLAH'] : [];
    const activeKepsek = kepsekNodes.find((n: any) => n.members && n.members.length > 0);
    if (activeKepsek && activeKepsek.members[0]?.name) {
      kepsekNama = activeKepsek.members[0].name;
      const parsedNip = cleanNip(activeKepsek.members[0].details);
      if (parsedNip !== '-') kepsekNip = parsedNip;
    }

    if (!kepsekNama) {
      const kepsekPos = list.find((p: any) => {
        const code = (p.kode || p.code || '').toUpperCase();
        return code === 'KEPALA_SEKOLAH' || code === 'KEPSEK';
      });
      const assign = kepsekPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) || kepsekPos?.organizationalAssigns?.[0];
      if (assign?.User?.Guru) {
        kepsekNama = assign.User.Guru.nama_guru;
        kepsekNip = assign.User.Guru.nip || kepsekNip;
      }
    }

    // 2. WAKASEK KURIKULUM
    let kurikulumNama = '';
    let kurikulumNip = '-';

    const kurikulumNodes = [
      ...(Array.isArray(tree['KURIKULUM']) ? tree['KURIKULUM'] : []),
      ...(Array.isArray(tree['WAKA_KURIKULUM']) ? tree['WAKA_KURIKULUM'] : []),
    ];
    const activeKurikulum = kurikulumNodes.find((n: any) => n.members && n.members.length > 0);
    if (activeKurikulum && activeKurikulum.members[0]?.name) {
      kurikulumNama = activeKurikulum.members[0].name;
      const parsedNip = cleanNip(activeKurikulum.members[0].details);
      if (parsedNip !== '-') kurikulumNip = parsedNip;
    }

    if (!kurikulumNama) {
      const kurikulumPos = list.find((p: any) => {
        const code = (p.kode || p.code || '').toUpperCase();
        const name = (p.nama || p.name || '').toUpperCase();
        return code === 'KURIKULUM' || code === 'WAKA_KURIKULUM' || name.includes('KURIKULUM');
      });
      const assign = kurikulumPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) || kurikulumPos?.organizationalAssigns?.[0];
      if (assign?.User?.Guru) {
        kurikulumNama = assign.User.Guru.nama_guru;
        kurikulumNip = assign.User.Guru.nip || '-';
      }
    }

    // Fallback: Jika user login saat ini adalah personil kurikulum
    if (!kurikulumNama && isKurikulum && user?.name) {
      kurikulumNama = user.name;
      kurikulumNip = (user as any).nip || (user as any).Guru?.nip || '-';
    }

    // 3. KOTA TITIMANGSA
    const kota =
      sekolah?.kota ||
      tenantInfo?.kabupaten ||
      tenantInfo?.address?.match(/Purwakarta|Bandung|Jakarta|Bogor|Bekasi|Subang|Cimahi|Depok/i)?.[0] ||
      'Bandung';

    return {
      kepsekNama: kepsekNama || 'Kepala Sekolah',
      kepsekNip: kepsekNip || '-',
      kurikulumNama: kurikulumNama || 'Wakasek Bidang Kurikulum',
      kurikulumNip: kurikulumNip || '-',
      kota,
    };
  }, [treeRes, listRes, sekolahRes, rawSekolah, tenantInfo, isKurikulum, user]);

  // State Penandatangan & Titimangsa yang Dapat Disesuaikan
  const [wakaKurikulumNama, setWakaKurikulumNama] = useState<string>(resolvedSigners.kurikulumNama);
  const [wakaKurikulumNip, setWakaKurikulumNip] = useState<string>(resolvedSigners.kurikulumNip);
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState<string>(resolvedSigners.kepsekNama);
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState<string>(resolvedSigners.kepsekNip);
  const [kotaTitimangsa, setKotaTitimangsa] = useState<string>(resolvedSigners.kota);

  // Titimangsa Standar Akademik: Awal Semester Ganjil (1 Juli) & Awal Semester Genap (2 Januari)
  const defaultTitimangsaGanjil = useMemo(() => `1 Juli ${startYear}`, [startYear]);
  const defaultTitimangsaGenap = useMemo(() => `2 Januari ${endYear}`, [endYear]);

  const [tanggalTitimangsaGanjil, setTanggalTitimangsaGanjil] = useState<string>(defaultTitimangsaGanjil);
  const [tanggalTitimangsaGenap, setTanggalTitimangsaGenap] = useState<string>(defaultTitimangsaGenap);

  // Sinkronisasi otomatis saat data struktur selesai dimuat
  useEffect(() => {
    if (resolvedSigners.kurikulumNama) setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    if (resolvedSigners.kurikulumNip) setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    if (resolvedSigners.kepsekNama) setKepalaSekolahNama(resolvedSigners.kepsekNama);
    if (resolvedSigners.kepsekNip) setKepalaSekolahNip(resolvedSigners.kepsekNip);
    if (resolvedSigners.kota) setKotaTitimangsa(resolvedSigners.kota);
  }, [resolvedSigners]);

  useEffect(() => {
    setTanggalTitimangsaGanjil(defaultTitimangsaGanjil);
    setTanggalTitimangsaGenap(defaultTitimangsaGenap);
  }, [defaultTitimangsaGanjil, defaultTitimangsaGenap]);

  const handleResetSigners = () => {
    setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    setKepalaSekolahNama(resolvedSigners.kepsekNama);
    setKepalaSekolahNip(resolvedSigners.kepsekNip);
    setKotaTitimangsa(resolvedSigners.kota);
    setTanggalTitimangsaGanjil(defaultTitimangsaGanjil);
    setTanggalTitimangsaGenap(defaultTitimangsaGenap);
    toast.success('Pengesah & titimangsa disinkronkan kembali');
  };

  // 6 Bulan Semester Ganjil (Juli - Desember)
  const ganjilMonths: MonthDef[] = useMemo(() => [
    { name: 'Juli', year: startYear, monthIndex: 6 },
    { name: 'Agustus', year: startYear, monthIndex: 7 },
    { name: 'September', year: startYear, monthIndex: 8 },
    { name: 'Oktober', year: startYear, monthIndex: 9 },
    { name: 'November', year: startYear, monthIndex: 10 },
    { name: 'Desember', year: startYear, monthIndex: 11 },
  ], [startYear]);

  // 6 Bulan Semester Genap (Januari - Juni)
  const genapMonths: MonthDef[] = useMemo(() => [
    { name: 'Januari', year: endYear, monthIndex: 0 },
    { name: 'Februari', year: endYear, monthIndex: 1 },
    { name: 'Maret', year: endYear, monthIndex: 2 },
    { name: 'April', year: endYear, monthIndex: 3 },
    { name: 'Mei', year: endYear, monthIndex: 4 },
    { name: 'Juni', year: endYear, monthIndex: 5 },
  ], [endYear]);

  // Filter Agenda Per Semester
  const ganjilEvents = useMemo(() => {
    const startStr = `${startYear}-07-01`;
    const endStr = `${startYear}-12-31`;
    return events
      .filter(e => {
        const m = formatDateToYYYYMMDD(e.tanggal_mulai);
        const s = formatDateToYYYYMMDD(e.tanggal_selesai);
        return s >= startStr && m <= endStr;
      })
      .sort((a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime());
  }, [events, startYear]);

  const genapEvents = useMemo(() => {
    const startStr = `${endYear}-01-01`;
    const endStr = `${endYear}-06-30`;
    return events
      .filter(e => {
        const m = formatDateToYYYYMMDD(e.tanggal_mulai);
        const s = formatDateToYYYYMMDD(e.tanggal_selesai);
        return s >= startStr && m <= endStr;
      })
      .sort((a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime());
  }, [events, endYear]);

  // Ekspor Dokumen PDF True WYSIWYG Berstandar Industri (html2canvas-pro + jsPDF)
  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    
    // 1. Simpan nilai zoom asli & matikan zoom sementara pada DOM sebelum capture
    // Menghilangkan anomali Chromium/html2canvas di mana CSS zoom membuat teks/karakter saling bertumpuk (kerning collapse)
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
    }

    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan file PDF Kalender Akademik...', { id: 'pdf-kalender' });

      // Tunggu hingga font selesai dimuat dan layout DOM stabil tanpa zoom
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise(r => setTimeout(r, 120));

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const isLandscape = printLayoutMode === '1-page-landscape';

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      const sheets = containerRef.current.querySelectorAll<HTMLElement>('.print-sheet');
      if (!sheets || sheets.length === 0) {
        toast.error('Lembar dokumen tidak ditemukan', { id: 'pdf-kalender' });
        return;
      }

      for (let i = 0; i < sheets.length; i++) {
        const sheetElement = sheets[i];
        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }

        const canvas = await html2canvas(sheetElement, {
          scale: 2, // 200 DPI Retina
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: isLandscape ? 1200 : 850,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              (clonedDesk.style as any).transform = 'none';
            }
            const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
            clonedSheets.forEach((s) => {
              s.style.zoom = '1';
              (s.style as any).transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = pdfWidth * canvasRatio;

        if (imgHeight <= pdfHeight + 1) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      }

      const cleanTp = tahunPelajaranNama.replace(/[\/\\]/g, '-');
      const filename = `Kalender_Akademik_${cleanTp}_${printLayoutMode}.pdf`;
      pdf.save(filename);
      toast.success('PDF Kalender Akademik berhasil diunduh', { id: 'pdf-kalender' });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      toast.error('Gagal membuat file PDF: ' + (err?.message || 'Error tidak diketahui'), { id: 'pdf-kalender' });
    } finally {
      // 2. Kembalikan zoom asli setelah proses render selesai
      if (deskCanvas && prevZoom) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  // Render Legenda Warna Kalender
  const renderLegend = (compact = false) => (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center border border-black/20 rounded font-semibold text-slate-800 bg-slate-50",
        compact ? "gap-2 py-1 px-2 text-[8px]" : "gap-3 py-1.5 px-3 text-[9px]"
      )}
    >
      <span className={cn("font-bold text-black uppercase mr-1", compact ? "text-[7.5px]" : "text-[8.5px]")}>
        Keterangan:
      </span>
      <div className="flex items-center gap-1">
        <span className={cn("rounded-[1.5px] bg-red-500 inline-block border border-black/20", compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
        <span>Libur Nasional</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("rounded-[1.5px] bg-amber-400 inline-block border border-black/20", compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
        <span>Libur Sekolah</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("rounded-[1.5px] bg-blue-600 inline-block border border-black/20", compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
        <span>Ujian (STS / SAS)</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("rounded-[1.5px] bg-emerald-600 inline-block border border-black/20", compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
        <span>Kegiatan Sekolah</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("rounded-[1.5px] bg-red-50 text-red-600 font-bold border border-red-200 inline-flex items-center justify-center leading-none", compact ? "w-2 h-2 text-[6.5px]" : "w-2.5 h-2.5 text-[7.5px]")}>
          M
        </span>
        <span>Minggu / Libur Rutin</span>
      </div>
    </div>
  );

  // Render Tabel Agenda Semester
  const renderAgendaTable = (agendaEvents: CalendarEvent[], semesterLabel: string) => (
    <div className="border border-black/30 rounded overflow-hidden">
      <div className="bg-slate-100 px-3 py-1 text-[10px] font-bold text-black border-b border-black/20 flex items-center justify-between">
        <span className="uppercase tracking-wider">AGENDA &amp; KEGIATAN {semesterLabel}</span>
        <span className="text-[9px] font-normal text-slate-600">{agendaEvents.length} Kegiatan Terjadwal</span>
      </div>
      {agendaEvents.length === 0 ? (
        <div className="py-3 text-center text-[9.5px] text-slate-500 italic bg-white">
          Tidak ada event khusus yang tercatat pada {semesterLabel}.
        </div>
      ) : (
        <table className="w-full text-[9.5px] border-collapse bg-white">
          <thead>
            <tr className="bg-slate-50 text-black border-b border-black/20">
              <th className="p-1 text-center w-7 border-r border-black/20">No</th>
              <th className="p-1 text-left w-36 border-r border-black/20">Rentang Tanggal</th>
              <th className="p-1 text-left border-r border-black/20">Agenda / Kegiatan Sekolah</th>
              <th className="p-1 text-center w-28 border-r border-black/20">Kategori</th>
              <th className="p-1 text-left w-40">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {agendaEvents.map((ev, idx) => (
              <tr key={ev.id} className="border-b border-black/10 text-black last:border-b-0">
                <td className="p-1 text-center border-r border-black/10">{idx + 1}</td>
                <td className="p-1 border-r border-black/10 font-medium">
                  {formatDate(ev.tanggal_mulai)}
                  {ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai
                    ? ` s.d. ${formatDate(ev.tanggal_selesai)}`
                    : ''}
                </td>
                <td className="p-1 border-r border-black/10 font-bold">{ev.judul}</td>
                <td className="p-1 text-center border-r border-black/10 text-[8.5px] uppercase font-semibold">
                  {getJenisLabel(ev.jenis)}
                </td>
                <td className="p-1 text-slate-700 italic text-[8.5px]">{ev.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render Tanda Tangan Resmi Dinas (Terintegrasi Otomatis)
  const renderSignature = (titimangsaTanggalStr: string, compact = false) => (
    <div className={cn("pt-1 break-inside-avoid text-black text-xs", compact ? "mt-3" : "mt-5")}>
      <div className="grid grid-cols-2 gap-6">
        {/* Kolom Kiri: Wakasek Kurikulum */}
        <div className={compact ? "space-y-8" : "space-y-12"}>
          <div>
            <p className={cn("font-normal", compact ? "text-[10px]" : "text-[11px]")}>Mengetahui,</p>
            <p className={cn("font-bold", compact ? "text-[10px]" : "text-[11px]")}>Wakasek Bidang Kurikulum</p>
          </div>
          <div>
            <p className={cn("font-bold underline", compact ? "text-[10px]" : "text-[11px]")}>
              {wakaKurikulumNama || '( .................................................... )'}
            </p>
            <p className={cn("text-slate-800", compact ? "text-[8.5px]" : "text-[9.5px]")}>
              NIP. {wakaKurikulumNip && wakaKurikulumNip !== '-' ? wakaKurikulumNip : '....................................................'}
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Titimangsa & Kepala Sekolah */}
        <div className={compact ? "space-y-8" : "space-y-12"}>
          <div>
            <p className={cn("font-normal", compact ? "text-[10px]" : "text-[11px]")}>
              {kotaTitimangsa}, {titimangsaTanggalStr}
            </p>
            <p className={cn("font-bold", compact ? "text-[10px]" : "text-[11px]")}>Kepala Sekolah</p>
          </div>
          <div>
            <p className={cn("font-bold underline", compact ? "text-[10px]" : "text-[11px]")}>
              {kepalaSekolahNama || '( .................................................... )'}
            </p>
            <p className={cn("text-slate-800", compact ? "text-[8.5px]" : "text-[9.5px]")}>
              NIP. {kepalaSekolahNip && kepalaSekolahNip !== '-' ? kepalaSekolahNip : '....................................................'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const activeOrientation = printLayoutMode === '1-page-landscape' ? 'landscape' : 'portrait';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak &amp; Unduh Kalender Akademik Resmi"
      subtitle={`Format Resmi 12 Bulan (Semester Ganjil & Genap) TP ${tahunPelajaranNama}`}
      allowLogoToggles={true}
      orientation={activeOrientation}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Menyiapkan...' : 'Unduh PDF'}
      extraActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Control Mode Cetak */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrintLayoutMode('1-page-landscape')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                printLayoutMode === '1-page-landscape'
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
              title="Poster 1 Halaman 12 Bulan (Landscape)"
            >
              <LayoutTemplate size={12} />
              <span>1 Halaman (12 Bulan)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('2-page-portrait')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                printLayoutMode === '2-page-portrait'
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
              title="2 Halaman Per Semester (Portrait)"
            >
              <Layers size={12} />
              <span>2 Halaman (Per Semester)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('ganjil-portrait')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors cursor-pointer hidden sm:block",
                printLayoutMode === 'ganjil-portrait'
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Semester Ganjil
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('genap-portrait')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors cursor-pointer hidden sm:block",
                printLayoutMode === 'genap-portrait'
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Semester Genap
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingSigners(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            title="Kustomisasi Penandatangan & Titimangsa"
          >
            <Edit3 size={13} className="text-emerald-600" />
            <span>{isEditingSigners ? 'Tutup Pengesah' : 'Ubah Pengesah'}</span>
          </button>
        </div>
      }
    >
      <div ref={containerRef} className="flex flex-col items-center justify-center p-2 sm:p-4 space-y-6">
        {/* Drawer Edit Pengesah & Titimangsa (no-print) */}
        {isEditingSigners && (
          <div className="no-print w-full max-w-4xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Integrasi &amp; Kustomisasi Pejabat Penandatangan Dokumen
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data otomatis terhubung dengan Profil Sekolah &amp; Struktur Organisasi. Anda dapat menyesuaikannya bila diperlukan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetSigners}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
              >
                <RotateCcw size={11} />
                <span>Reset ke Data Struktur</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Wakasek Kurikulum:</label>
                <input
                  type="text"
                  placeholder="Nama Wakasek Kurikulum"
                  value={wakaKurikulumNama}
                  onChange={e => setWakaKurikulumNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Wakasek Kurikulum"
                  value={wakaKurikulumNip}
                  onChange={e => setWakaKurikulumNip(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Kepala Sekolah:</label>
                <input
                  type="text"
                  placeholder="Nama Kepala Sekolah"
                  value={kepalaSekolahNama}
                  onChange={e => setKepalaSekolahNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Kepala Sekolah"
                  value={kepalaSekolahNip}
                  onChange={e => setKepalaSekolahNip(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Titimangsa &amp; Kota:</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Kota (contoh: Purwakarta)"
                    value={kotaTitimangsa}
                    onChange={e => setKotaTitimangsa(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tgl Smt Ganjil:</span>
                      <input
                        type="text"
                        placeholder="1 Juli 2026"
                        value={tanggalTitimangsaGanjil}
                        onChange={e => setTanggalTitimangsaGanjil(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tgl Smt Genap:</span>
                      <input
                        type="text"
                        placeholder="2 Januari 2027"
                        value={tanggalTitimangsaGenap}
                        onChange={e => setTanggalTitimangsaGenap(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PILIHAN 1: VERSI 1 HALAMAN MENGEMAS 12 BULAN (A4 LANDSCAPE)        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {printLayoutMode === '1-page-landscape' && (
          <PrintDocumentSheet
            pageNumber={1}
            totalPages={1}
            pageLabel="1 Halaman 12 Bulan Lengkap"
            footerText={`Kalender Pendidikan & Akademik Sekolah TP ${tahunPelajaranNama} (12 Bulan Lengkap)`}
            orientation="landscape"
            className="p-6 sm:p-8"
          >
            {/* Kop Surat Resmi Landscape */}
            <PrintHeader
              variant="landscape"
              sekolah={tenantInfo as any}
              tenantInfo={tenantInfo}
              logoDaerahBase64={logoDaerahBase64}
              logoSekolahBase64={logoSekolahBase64}
            />

            {/* Judul Dokumen */}
            <div className="text-center my-2 space-y-0.5">
              <h1 className="text-xs sm:text-sm font-black uppercase text-black">
                KALENDER AKADEMIK &amp; PENDIDIKAN SEKOLAH 12 BULAN
              </h1>
              <p className="text-[11px] font-bold text-black uppercase">
                TAHUN PELAJARAN {tahunPelajaranNama}
              </p>
            </div>

            {/* Dua Blok Berdampingan: Semester Ganjil (Kiri) & Semester Genap (Kanan) */}
            <div className="grid grid-cols-2 gap-4 my-2 items-start">
              {/* Kolom Kiri: SEMESTER GANJIL */}
              <div className="border border-emerald-800/40 rounded-lg overflow-hidden bg-white">
                <div className="bg-emerald-800 text-white text-center py-1 font-bold text-[10px] uppercase">
                  SEMESTER GANJIL (JULI - DESEMBER {startYear})
                </div>
                <div className="p-2 grid grid-cols-3 gap-1.5 bg-emerald-50/10">
                  {ganjilMonths.map((m) => (
                    <PrintMonthGrid key={`land-ganjil-${m.name}`} month={m} events={events} compact={true} />
                  ))}
                </div>
              </div>

              {/* Kolom Kanan: SEMESTER GENAP */}
              <div className="border border-blue-800/40 rounded-lg overflow-hidden bg-white">
                <div className="bg-blue-800 text-white text-center py-1 font-bold text-[10px] uppercase">
                  SEMESTER GENAP (JANUARI - JUNI {endYear})
                </div>
                <div className="p-2 grid grid-cols-3 gap-1.5 bg-blue-50/10">
                  {genapMonths.map((m) => (
                    <PrintMonthGrid key={`land-genap-${m.name}`} month={m} events={events} compact={true} />
                  ))}
                </div>
              </div>
            </div>

            {/* Legenda Warna Simbol (Kompak) */}
            <div className="my-1.5">
              {renderLegend(true)}
            </div>

            {/* Tanda Tangan Resmi Pengesahan 2-Tier */}
            {renderSignature(tanggalTitimangsaGanjil, true)}
          </PrintDocumentSheet>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PILIHAN 2: VERSI PER SEMESTER (A4 PORTRAIT)                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(printLayoutMode === '2-page-portrait' || printLayoutMode === 'ganjil-portrait') && (
          <PrintDocumentSheet
            pageNumber={1}
            totalPages={printLayoutMode === '2-page-portrait' ? 2 : 1}
            pageLabel={printLayoutMode === '2-page-portrait' ? "Halaman 1 dari 2 — Semester Ganjil" : "Semester Ganjil"}
            footerText={`Kalender Akademik Sekolah TP ${tahunPelajaranNama} — Semester Ganjil`}
            orientation="portrait"
          >
            {/* Kop Surat Resmi */}
            <PrintHeader
              sekolah={tenantInfo as any}
              tenantInfo={tenantInfo}
              logoDaerahBase64={logoDaerahBase64}
              logoSekolahBase64={logoSekolahBase64}
            />

            {/* Judul Dokumen */}
            <div className="text-center my-3 space-y-0.5">
              <h1 className="text-sm font-black uppercase text-black">
                KALENDER AKADEMIK &amp; PENDIDIKAN SEKOLAH
              </h1>
              <p className="text-xs font-bold text-black uppercase">
                SEMESTER GANJIL — TAHUN PELAJARAN {tahunPelajaranNama} (JULI - DESEMBER {startYear})
              </p>
            </div>

            {/* Grid 6 Bulan Semester Ganjil (3 Kolom x 2 Baris) */}
            <div className="grid grid-cols-3 gap-2.5 my-2.5">
              {ganjilMonths.map((m) => (
                <PrintMonthGrid key={`${m.name}-${m.year}`} month={m} events={events} />
              ))}
            </div>

            {/* Legenda Warna */}
            <div className="mb-2.5">
              {renderLegend()}
            </div>

            {/* Tabel Agenda Semester Ganjil */}
            <div className="my-2">
              {renderAgendaTable(ganjilEvents, 'SEMESTER GANJIL')}
            </div>

            {/* Tanda Tangan Resmi Semester Ganjil */}
            {renderSignature(tanggalTitimangsaGanjil)}
          </PrintDocumentSheet>
        )}

        {(printLayoutMode === '2-page-portrait' || printLayoutMode === 'genap-portrait') && (
          <PrintDocumentSheet
            pageNumber={printLayoutMode === '2-page-portrait' ? 2 : 1}
            totalPages={printLayoutMode === '2-page-portrait' ? 2 : 1}
            pageLabel={printLayoutMode === '2-page-portrait' ? "Halaman 2 dari 2 — Semester Genap" : "Semester Genap"}
            footerText={`Kalender Akademik Sekolah TP ${tahunPelajaranNama} — Semester Genap`}
            orientation="portrait"
          >
            {/* Kop Surat Resmi */}
            <PrintHeader
              sekolah={tenantInfo as any}
              tenantInfo={tenantInfo}
              logoDaerahBase64={logoDaerahBase64}
              logoSekolahBase64={logoSekolahBase64}
            />

            {/* Judul Dokumen */}
            <div className="text-center my-3 space-y-0.5">
              <h1 className="text-sm font-black uppercase text-black">
                KALENDER AKADEMIK &amp; PENDIDIKAN SEKOLAH
              </h1>
              <p className="text-xs font-bold text-black uppercase">
                SEMESTER GENAP — TAHUN PELAJARAN {tahunPelajaranNama} (JANUARI - JUNI {endYear})
              </p>
            </div>

            {/* Grid 6 Bulan Semester Genap (3 Kolom x 2 Baris) */}
            <div className="grid grid-cols-3 gap-2.5 my-2.5">
              {genapMonths.map((m) => (
                <PrintMonthGrid key={`${m.name}-${m.year}`} month={m} events={events} />
              ))}
            </div>

            {/* Legenda Warna */}
            <div className="mb-2.5">
              {renderLegend()}
            </div>

            {/* Tabel Agenda Semester Genap */}
            <div className="my-2">
              {renderAgendaTable(genapEvents, 'SEMESTER GENAP')}
            </div>

            {/* Tanda Tangan Resmi Semester Genap */}
            {renderSignature(tanggalTitimangsaGenap)}
          </PrintDocumentSheet>
        )}
      </div>
    </UniversalDocumentModal>
  );
};

export default KalenderAkademikPrintModal;
