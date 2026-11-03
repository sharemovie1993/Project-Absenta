import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { Calendar, Edit3, Columns2, LayoutList, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShiftConfig, ShiftItem, TimeSlot, BreakItem } from './JamKBMTypes';

export interface DistribusiJamPelajaranPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftConfig: ShiftConfig;
  jenjang?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

const ALL_DAYS = [
  { key: 'SENIN', label: 'Senin' },
  { key: 'SELASA', label: 'Selasa' },
  { key: 'RABU', label: 'Rabu' },
  { key: 'KAMIS', label: 'Kamis' },
  { key: 'JUMAT', label: "Jum'at" },
  { key: 'SABTU', label: 'Sabtu' },
] as const;

interface DayTimelineItem {
  type: 'SLOT' | 'BREAK';
  slotNum?: number;
  duration?: number;
  start: string;
  end: string;
}

const cleanNip = (rawDetails?: string | null): string => {
  if (!rawDetails) return '-';
  const match = rawDetails.match(/NIP[:\s]+([0-9\s]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const digitsOnly = rawDetails.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 8) {
    return digitsOnly;
  }
  return rawDetails === 'GURU' || rawDetails === 'SISWA' ? '-' : rawDetails;
};

export const DistribusiJamPelajaranPrintModal: React.FC<DistribusiJamPelajaranPrintModalProps> = ({
  isOpen,
  onClose,
  shiftConfig,
  jenjang = 'SMK',
  tahunPelajaranNama = '2026/2027',
  semesterNama = 'Ganjil',
}) => {
  const { tenantInfo } = usePrintHeaderData();
  const { user, isKurikulum } = useCapabilities();

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Table Format: 'VERTICAL_2_COL' (Kolom 1: Hari, Kolom 2: Waktu) vs 'HORIZONTAL_MATRIX'
  const [tableLayout, setTableLayout] = useState<'VERTICAL_2_COL' | 'HORIZONTAL_MATRIX'>('VERTICAL_2_COL');

  // Group identical days toggle (e.g. Senin – Kamis atau Selasa, Rabu, Kamis yang polanya sama di-merger)
  const [groupIdenticalDays, setGroupIdenticalDays] = useState(true);

  // Active Shift selection for 2-shift schools
  const shifts = shiftConfig?.shifts ?? [];
  const [selectedShiftId, setSelectedShiftId] = useState<string>(shifts[0]?.id || 'pagi');

  // Days configuration
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);

  // ── Auto-Resolving Queries for Official Signers ──
  const { data: treeRes } = useQuery({
    queryKey: ['academic-struktur-tree'],
    queryFn: () => getStrukturTree().catch(() => null),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['academic-struktur-list-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  // Resolve official signer names from Struktur Organisasi / Profil Sekolah
  const resolvedSigners = useMemo(() => {
    const tree = (treeRes as any)?.data || treeRes || {};
    const list = Array.isArray((listRes as any)?.data)
      ? (listRes as any).data
      : Array.isArray(listRes)
      ? listRes
      : [];
    const sekolah = (sekolahRes as any)?.data || sekolahRes || {};

    // 1. RESOLVE KEPALA SEKOLAH
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

    // 2. RESOLVE WAKASEK KURIKULUM
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

    // Fallback: jika user yang sedang login adalah personil kurikulum
    if (!kurikulumNama && isKurikulum && user?.name) {
      kurikulumNama = user.name;
      kurikulumNip = (user as any).nip || (user as any).Guru?.nip || '-';
    }

    // 3. RESOLVE KOTA TITIMANGSA
    const kota = sekolah?.kota || tenantInfo?.kabupaten || tenantInfo?.address?.match(/Purwakarta|Bandung|Jakarta|Bogor|Bekasi|Subang|Cimahi|Depok/i)?.[0] || 'Purwakarta';

    return {
      kepsekNama: kepsekNama || 'Kepala Sekolah',
      kepsekNip: kepsekNip || '-',
      kurikulumNama: kurikulumNama || 'Wakasek Bidang Kurikulum',
      kurikulumNip: kurikulumNip || '-',
      kota,
    };
  }, [treeRes, listRes, sekolahRes, tenantInfo, isKurikulum, user]);

  // ── Auto-Resolving Academic Year & Semester ──
  const { activeTahunPelajaran } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions({ tahunPelajaranId: activeTahunPelajaran?.id });

  const resolvedTahunPelajaran = tahunPelajaranNama || activeTahunPelajaran?.tahun || '2026/2027';
  const resolvedSemester = semesterNama || activeSemester?.nama_semester || (activeSemester as any)?.nama || 'Ganjil';

  // Menghitung default tanggal titimangsa akademik (1 Juli untuk Ganjil, 2 Januari untuk Genap)
  const defaultAcademicDate = useMemo(() => {
    const yearMatch = resolvedTahunPelajaran.match(/\b(20\d{2})\b/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    const semLower = resolvedSemester.toLowerCase();
    const isGenap = semLower.includes('genap') || semLower.includes('2');

    if (isGenap) {
      return `2 Januari ${startYear + 1}`;
    }
    return `1 Juli ${startYear}`;
  }, [resolvedTahunPelajaran, resolvedSemester]);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Custom Signers State (Editable)
  const [isEditingSigners, setIsEditingSigners] = useState(false);
  const [wakaKurikulumNama, setWakaKurikulumNama] = useState(resolvedSigners.kurikulumNama);
  const [wakaKurikulumNip, setWakaKurikulumNip] = useState(resolvedSigners.kurikulumNip);
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState(resolvedSigners.kepsekNama);
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState(resolvedSigners.kepsekNip);
  const [kotaTitimangsa, setKotaTitimangsa] = useState(resolvedSigners.kota);
  const [tanggalTitimangsa, setTanggalTitimangsa] = useState(defaultAcademicDate);

  // Sync saat defaultAcademicDate berubah
  useEffect(() => {
    setTanggalTitimangsa(defaultAcademicDate);
  }, [defaultAcademicDate]);

  // Re-sync saat data struktur organisasi selesai dimuat
  useEffect(() => {
    if (resolvedSigners.kurikulumNama) {
      setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    }
    if (resolvedSigners.kurikulumNip) {
      setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    }
    if (resolvedSigners.kepsekNama) {
      setKepalaSekolahNama(resolvedSigners.kepsekNama);
    }
    if (resolvedSigners.kepsekNip) {
      setKepalaSekolahNip(resolvedSigners.kepsekNip);
    }
    if (resolvedSigners.kota) {
      setKotaTitimangsa(resolvedSigners.kota);
    }
  }, [resolvedSigners]);

  const handleResetSignersToStructure = () => {
    setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    setKepalaSekolahNama(resolvedSigners.kepsekNama);
    setKepalaSekolahNip(resolvedSigners.kepsekNip);
    setKotaTitimangsa(resolvedSigners.kota);
    setTanggalTitimangsa(defaultAcademicDate);
    toast.success('Pengesah & titimangsa di-reset ke standar akademik');
  };

  const currentShift = useMemo<ShiftItem | undefined>(() => {
    return shifts.find(s => s.id === selectedShiftId) || shifts[0];
  }, [shifts, selectedShiftId]);

  // Active days to display in table
  const activeDays = useMemo(() => {
    return includeSaturday ? ALL_DAYS : ALL_DAYS.filter(d => d.key !== 'SABTU');
  }, [includeSaturday]);

  // Helper untuk mendapatkan jadwal hari tertentu
  const getDaySchedule = useCallback((dayKey: string) => {
    if (!currentShift) return { slots: [] as TimeSlot[], breaks: [] as BreakItem[], duration: 45 };
    if (currentShift.day_patterns?.[dayKey]) {
      const dp = currentShift.day_patterns[dayKey];
      return {
        slots: dp.slots && dp.slots.length > 0 ? dp.slots : currentShift.slots || [],
        breaks: dp.breaks ?? currentShift.breaks ?? [],
        duration: dp.slot_duration ?? currentShift.slot_duration ?? 45,
      };
    }
    return {
      slots: currentShift.slots || [],
      breaks: currentShift.breaks || [],
      duration: currentShift.slot_duration || 45,
    };
  }, [currentShift]);

  // Helper untuk membuat daftar urutan jam + istirahat untuk 1 hari
  const getDayTimelineItems = useCallback((dayKey: string): DayTimelineItem[] => {
    const sch = getDaySchedule(dayKey);
    const items: DayTimelineItem[] = [];
    const slots = sch.slots || [];

    slots.forEach((slot, idx) => {
      items.push({
        type: 'SLOT',
        slotNum: slot.slot,
        start: slot.start,
        end: slot.end,
        duration: sch.duration,
      });

      const brk = sch.breaks.find(b => b.afterSlot === slot.slot);
      if (brk) {
        const nextSlot = slots[idx + 1];
        items.push({
          type: 'BREAK',
          duration: brk.duration,
          start: slot.end,
          end: nextSlot ? nextSlot.start : '',
        });
      }
    });

    return items;
  }, [getDaySchedule]);

  // Helper untuk memformat label hari gabungan secara cerdas & resmi
  const formatDayGroupLabel = (days: Array<{ key: string; label: string }>): string => {
    if (days.length === 1) return days[0].label.toUpperCase();
    if (days.length === 2) return `${days[0].label.toUpperCase()} & ${days[1].label.toUpperCase()}`;

    // Cek apakah hari-hari tersebut berurutan dalam sepekan
    const dayIndices = days.map(d => ALL_DAYS.findIndex(ad => ad.key === d.key));
    let isConsecutive = true;
    for (let i = 1; i < dayIndices.length; i++) {
      if (dayIndices[i] !== dayIndices[i - 1] + 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive) {
      return `${days[0].label.toUpperCase()} – ${days[days.length - 1].label.toUpperCase()}`;
    }

    return days.map(d => d.label.toUpperCase()).join(', ');
  };

  // Kelompok hari untuk format vertikal 2 kolom
  interface DayGroup {
    id: string;
    dayLabel: string;
    subLabel?: string;
    dayCount: number;
    items: DayTimelineItem[];
    duration: number;
    slotsCount: number;
  }

  const verticalDayGroups = useMemo<DayGroup[]>(() => {
    if (!groupIdenticalDays) {
      return activeDays.map(d => {
        const sch = getDaySchedule(d.key);
        return {
          id: d.key,
          dayLabel: d.label.toUpperCase(),
          dayCount: 1,
          items: getDayTimelineItems(d.key),
          duration: sch.duration,
          slotsCount: sch.slots.length,
        };
      });
    }

    // ── Smart Auto-Merger: Deteksi & Merger Hari dengan Pola Waktu yang Sama ──
    const dayDataList = activeDays.map(d => {
      const sch = getDaySchedule(d.key);
      const items = getDayTimelineItems(d.key);
      const signature = items
        .map(it => `${it.type}:${it.slotNum ?? ''}:${it.start}-${it.end}:${it.duration ?? ''}`)
        .join('|');
      return { day: d, sch, items, signature };
    });

    const clusterMap = new Map<string, { days: Array<{ key: string; label: string }>; items: DayTimelineItem[]; duration: number; slotsCount: number }>();

    dayDataList.forEach(({ day, sch, items, signature }) => {
      const existing = clusterMap.get(signature);
      if (existing) {
        existing.days.push(day);
      } else {
        clusterMap.set(signature, {
          days: [day],
          items,
          duration: sch.duration,
          slotsCount: sch.slots.length,
        });
      }
    });

    const groups: DayGroup[] = [];
    clusterMap.forEach((val, sig) => {
      const label = formatDayGroupLabel(val.days);
      const isSingle = val.days.length === 1;
      groups.push({
        id: sig,
        dayLabel: label,
        subLabel: isSingle ? undefined : `(${val.days.length} Hari: ${val.days.map(d => d.label).join(', ')})`,
        dayCount: val.days.length,
        items: val.items,
        duration: val.duration,
        slotsCount: val.slotsCount,
      });
    });

    return groups;
  }, [activeDays, groupIdenticalDays, getDaySchedule, getDayTimelineItems]);

  // Untuk mode matriks horizontal (jika user beralih)
  const maxSlotNum = useMemo(() => {
    let max = 0;
    activeDays.forEach(day => {
      const sch = getDaySchedule(day.key);
      if (sch.slots.length > max) max = sch.slots.length;
    });
    return Math.max(max, 10);
  }, [activeDays, getDaySchedule]);

  interface TimetableMatrixRow {
    type: 'SLOT' | 'BREAK';
    slotNum?: number;
    afterSlot?: number;
  }

  const matrixRows = useMemo<TimetableMatrixRow[]>(() => {
    const rows: TimetableMatrixRow[] = [];
    const breaksHandled = new Set<number>();

    for (let s = 1; s <= maxSlotNum; s++) {
      rows.push({ type: 'SLOT', slotNum: s });
      const hasBreakAfterSlot = activeDays.some(day => {
        const sch = getDaySchedule(day.key);
        return sch.breaks.some(b => b.afterSlot === s);
      });
      if (hasBreakAfterSlot && !breaksHandled.has(s)) {
        breaksHandled.add(s);
        rows.push({ type: 'BREAK', afterSlot: s });
      }
    }
    return rows;
  }, [maxSlotNum, activeDays, getDaySchedule]);

  // Dual-Engine True WYSIWYG PDF Download
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Distribusi Jam Pelajaran (True WYSIWYG)...');
    try {
      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      const canvas = await html2canvas(sheetElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Optimasi ukuran file: gunakan JPEG 88% kualitas tinggi + compression flag
      // Mengurangi ukuran file dari 24 MB ke < 500 KB tanpa mengurangi ketajaman teks/tabel
      const imgData = canvas.toDataURL('image/jpeg', 0.88);

      // PRESERVE 100% TRUE WYSIWYG ASPECT RATIO (ANTI-DISTORTION & ANTI-SQUASH)
      // Mencegah gambar dipadatkan/gepeng secara vertikal oleh jsPDF
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      if (imgHeight <= pdfHeight + 1) {
        // Pas 1 lembar utuh tanpa distorsi
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        // Jika konten melebihi 1 lembar fisik A4, split proporsional antar halaman tanpa kompresi gepeng
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      const shiftSlug = currentShift?.name ? currentShift.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Reguler';
      pdf.save(`Distribusi_Jam_Pelajaran_2Kolom_${shiftSlug}_${todayStr.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Distribusi Jam Pelajaran berhasil diunduh!', { id: toastId });
    } catch (err) {
      console.error('Failed to generate PDF', err);
      toast.error('Gagal merender PDF, beralih ke print browser...', { id: toastId });
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Distribusi Jam Pelajaran"
      subtitle="Dokumen Pedoman Resmi Format Vertikal (Kolom 1: Hari, Kolom 2: Waktu)"
      orientation={orientation}
      allowOrientationToggle={true}
      onOrientationChange={setOrientation}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Merender...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
      extraActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Selector: Vertikal 2 Kolom vs Matriks Mingguan */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setTableLayout('VERTICAL_2_COL');
                setOrientation('portrait');
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                tableLayout === 'VERTICAL_2_COL'
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Vertikal 2 Kolom</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTableLayout('HORIZONTAL_MATRIX');
                setOrientation('landscape');
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                tableLayout === 'HORIZONTAL_MATRIX'
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Matriks Mingguan</span>
            </button>
          </div>

          {/* Shift Selector jika sekolah 2 shift */}
          {shifts.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {shifts.map(s => {
                const isActive = s.id === selectedShiftId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedShiftId(s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      isActive
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle Gabung Hari Sama (Khusus Vertikal 2 Kolom) */}
          {tableLayout === 'VERTICAL_2_COL' && (
            <button
              type="button"
              onClick={() => setGroupIdenticalDays(prev => !prev)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                groupIdenticalDays
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                  : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
              )}
            >
              {groupIdenticalDays ? 'Pola Sama: Di-merger' : 'Rinci Setiap Hari'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIncludeSaturday(prev => !prev)}
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1",
              includeSaturday
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{includeSaturday ? 'Termasuk Sabtu' : 'Senin – Jumat'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditingSigners(prev => !prev)}
            className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEditingSigners ? 'Tutup Pengesah' : 'Ubah Pengesah'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drawer Edit Pengesah (no-print) */}
        {isEditingSigners && (
          <div className="no-print bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Penyesuaian Pejabat Penandatangan Dokumen (Terhubung Otomatis)
              </h4>
              <button
                type="button"
                onClick={handleResetSignersToStructure}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ke Data Struktur</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Wakasek Kurikulum:</label>
                <input
                  type="text"
                  value={wakaKurikulumNama}
                  onChange={e => setWakaKurikulumNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Wakasek"
                  value={wakaKurikulumNip}
                  onChange={e => setWakaKurikulumNip(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Kepala Sekolah:</label>
                <input
                  type="text"
                  value={kepalaSekolahNama}
                  onChange={e => setKepalaSekolahNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Kepala Sekolah"
                  value={kepalaSekolahNip}
                  onChange={e => setKepalaSekolahNip(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Titimangsa (Kota &amp; Tanggal):</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Kota (contoh: Purwakarta)"
                    value={kotaTitimangsa}
                    onChange={e => setKotaTitimangsa(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Tanggal Titimangsa"
                    value={tanggalTitimangsa}
                    onChange={e => setTanggalTitimangsa(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTanggalTitimangsa(defaultAcademicDate)}
                    className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Awal Semester ({defaultAcademicDate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTanggalTitimangsa(todayStr)}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Hari Ini ({todayStr})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Lembar Dokumen Fisik A4 (PrintDocumentSheet) ── */}
        <div className="flex justify-center w-full overflow-x-auto p-2">
          <PrintDocumentSheet
            orientation={orientation}
            pageNumber={1}
            totalPages={1}
            footerText={`Pedoman Resmi Distribusi Jam Pelajaran KBM - ${tenantInfo?.name || 'Sekolah'}`}
            className="text-black font-serif !p-5 sm:!p-6"
          >
            {/* 1. KOP SURAT DINAS & SEKOLAH RESMI */}
            <PrintHeader
              variant={orientation}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
              tenantInfo={tenantInfo}
              className="mb-2"
            />

            {/* 2. JUDUL DOKUMEN RESMI */}
            <div className="text-center mb-2.5">
              <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline">
                DISTRIBUSI JAM PELAJARAN (JP) &amp; WAKTU BEL KBM
              </h2>
              <p className="text-[10px] font-bold uppercase mt-0.5 tracking-wide">
                TAHUN PELAJARAN {resolvedTahunPelajaran} {resolvedSemester ? `– SEMESTER ${resolvedSemester.toUpperCase()}` : ''}
              </p>
              {shifts.length > 1 && currentShift && (
                <div className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md border border-black text-[9px] font-black uppercase tracking-wider bg-slate-50">
                  {currentShift.name}
                </div>
              )}
            </div>

            {/* 3. TABEL DISTRIBUSI JAM PELAJARAN */}
            {tableLayout === 'VERTICAL_2_COL' ? (
              /* ── FORMAT VERTIKAL 2 KOLOM (Kolom 1: HARI, Kolom 2: WAKTU) ── */
              <div className="overflow-x-auto w-full mb-2.5">
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black">
                      <th className="border border-black px-3 py-1 text-center font-black uppercase w-44 text-[10.5px]">
                        HARI
                      </th>
                      <th className="border border-black px-3 py-1 text-center font-black uppercase text-[10.5px]">
                        WAKTU
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {verticalDayGroups.map((group, gIdx) => {
                      const items = group.items;
                      if (items.length === 0) return null;

                      return items.map((item, idx) => (
                        <tr
                          key={`${group.dayLabel}-${idx}`}
                          className={cn(
                            item.type === 'BREAK' ? 'bg-amber-50/70' : 'hover:bg-slate-50/40',
                            idx === items.length - 1 && gIdx !== verticalDayGroups.length - 1
                              ? 'border-b-2 border-black'
                              : 'border-b border-black/60'
                          )}
                        >
                          {/* KOLOM PERTAMA: HARI (Rowspan untuk seluruh slot & istirahat hari ini) */}
                          {idx === 0 && (
                            <td
                              rowSpan={items.length}
                              className="border border-black px-2 py-1 text-center font-black uppercase align-middle bg-slate-50/90 text-xs w-44"
                            >
                              <div className="font-black text-xs tracking-wider">{group.dayLabel}</div>
                              {group.subLabel && (
                                <div className="text-[8px] text-slate-600 font-sans font-normal mt-0.5">
                                  {group.subLabel}
                                </div>
                              )}
                              <div className="text-[8.5px] text-slate-500 font-sans font-normal mt-1 pt-0.5 border-t border-slate-300">
                                <div>{items.filter(x => x.type === 'SLOT').length} JP</div>
                                <div>{group.duration} mnt / JP</div>
                              </div>
                            </td>
                          )}

                          {/* KOLOM KEDUA: WAKTU */}
                          <td className="border border-black px-3 py-0.5 text-[9.5px]">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'font-bold',
                                  item.type === 'BREAK'
                                    ? 'text-amber-900 uppercase text-[9px] tracking-wide'
                                    : 'text-slate-900'
                                )}
                              >
                                {item.type === 'BREAK'
                                  ? `ISTIRAHAT (${item.duration} Menit)`
                                  : `Jam Pelajaran Ke-${item.slotNum} (JP ${item.slotNum})`}
                              </span>
                              <span
                                className={cn(
                                  'font-mono font-bold text-[10px]',
                                  item.type === 'BREAK' ? 'text-amber-950 font-black' : 'text-slate-900'
                                )}
                              >
                                {item.start} – {item.end}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── FORMAT MATRIKS MINGGUAN (HORIZONTAL) ── */
              <div className="overflow-x-auto w-full mb-4">
                <table className="w-full border-collapse border border-black text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-black px-2 py-1.5 text-center font-black uppercase w-24">
                        JAM KE-
                      </th>
                      {activeDays.map(day => (
                        <th
                          key={day.key}
                          className="border border-black px-2 py-1.5 text-center font-black uppercase"
                        >
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row, rIdx) => {
                      if (row.type === 'BREAK') {
                        return (
                          <tr key={`break-${row.afterSlot}-${rIdx}`} className="bg-amber-50/60 font-bold">
                            <td className="border border-black px-2 py-1 text-center font-black bg-amber-100/70 text-[10px] uppercase">
                              ISTIRAHAT
                            </td>
                            {activeDays.map(day => {
                              const sch = getDaySchedule(day.key);
                              const brk = sch.breaks.find(b => b.afterSlot === row.afterSlot);
                              if (!brk) {
                                return (
                                  <td
                                    key={`break-${day.key}-${rIdx}`}
                                    className="border border-black px-2 py-1 text-center text-slate-400 italic text-[9.5px]"
                                  >
                                    –
                                  </td>
                                );
                              }
                              const slotPrev = sch.slots.find(s => s.slot === row.afterSlot);
                              const slotNext = sch.slots.find(s => s.slot === row.afterSlot + 1);
                              const breakStart = slotPrev ? slotPrev.end : '';
                              const breakEnd = slotNext ? slotNext.start : '';

                              return (
                                <td
                                  key={`break-${day.key}-${rIdx}`}
                                  className="border border-black px-2 py-1 text-center text-[10px]"
                                >
                                  <div>
                                    {breakStart && breakEnd ? `${breakStart} – ${breakEnd}` : `${brk.duration} menit`}
                                  </div>
                                  <div className="text-[8.5px] text-slate-600 font-sans font-normal">
                                    ({brk.duration} mnt)
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }

                      const sNum = row.slotNum!;
                      return (
                        <tr key={`slot-${sNum}`} className="hover:bg-slate-50/40">
                          <td className="border border-black px-2 py-1 text-center font-black bg-slate-50/80">
                            JP {sNum}
                          </td>
                          {activeDays.map(day => {
                            const sch = getDaySchedule(day.key);
                            const slot = sch.slots.find(s => s.slot === sNum);

                            if (!slot) {
                              return (
                                <td
                                  key={`slot-${day.key}-${sNum}`}
                                  className="border border-black px-2 py-1 text-center text-slate-300 italic text-[9.5px]"
                                >
                                  –
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`slot-${day.key}-${sNum}`}
                                className="border border-black px-2 py-1 text-center font-mono text-[10px] font-semibold"
                              >
                                {slot.start} – {slot.end}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. CATATAN & KETENTUAN KBM */}
            <div className="border border-black rounded-sm p-2 mb-3 text-[8.5px] leading-snug bg-slate-50/40">
              <span className="font-bold uppercase tracking-wider block mb-0.5">Ketentuan Pelaksanaan KBM:</span>
              <ol className="list-decimal pl-4 space-y-0">
                <li>
                  Durasi standar 1 Jam Pelajaran (JP) = <strong>{currentShift?.slot_duration ?? 45} Menit</strong>.
                </li>
                <li>
                  Setiap hari Senin wajib mengikuti Upacara Bendera / Apel Pagi sebelum KBM JP ke-1 dimulai.
                </li>
                <li>
                  Bapak/Ibu Guru dimohon hadir di dalam ruang kelas tepat waktu pada saat bel pergantian jam berbunyi.
                </li>
                <li>
                  Waktu istirahat digunakan untuk pemulihan energi dan ibadah, tidak diperkenankan memperpanjang waktu di luar jadwal resmi.
                </li>
              </ol>
            </div>

            {/* 5. TANDA TANGAN RESMI 2-TIER (KAPATUHAN SKILL UNIVERSAL DOCUMENT PRINTING) */}
            <div className="flex justify-between items-start text-[10px] leading-normal page-break-inside-avoid">
              {/* Kolom Kiri: Wakasek Kurikulum */}
              <div className="text-center w-64">
                <div>Mengetahui,</div>
                <div className="font-bold">Wakil Kepala Sekolah Bidang Kurikulum</div>
                <div className="h-10" />
                <div className="font-bold underline">{wakaKurikulumNama}</div>
                <div className="text-[9.5px] font-mono">
                  {wakaKurikulumNip && wakaKurikulumNip !== '-' ? `NIP. ${wakaKurikulumNip}` : 'NIP. –'}
                </div>
              </div>

              {/* Kolom Kanan: Kepala Sekolah */}
              <div className="text-center w-64">
                <div>
                  {kotaTitimangsa}, {tanggalTitimangsa}
                </div>
                <div className="font-bold">Kepala Sekolah</div>
                <div className="h-10" />
                <div className="font-bold underline">{kepalaSekolahNama}</div>
                <div className="text-[9.5px] font-mono">
                  {kepalaSekolahNip && kepalaSekolahNip !== '-' ? `NIP. ${kepalaSekolahNip}` : 'NIP. –'}
                </div>
              </div>
            </div>
          </PrintDocumentSheet>
        </div>
      </div>
    </UniversalDocumentModal>
  );
};

export default DistribusiJamPelajaranPrintModal;
