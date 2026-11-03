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
import { Edit3, RotateCcw } from 'lucide-react';
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

  const orientation = 'portrait';
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Group identical days toggle (e.g. Selasa, Rabu, Kamis yang polanya sama di-merger)
  const [groupIdenticalDays, setGroupIdenticalDays] = useState(true);

  // Otomatis Deteksi Single Shift (1 Lembar) vs Multi Shift (2 Lembar)
  const isMultiShift = useMemo(() => {
    return shiftConfig?.operational_mode === 'MULTI' ||
      (shiftConfig?.operational_mode !== 'SINGLE' && (shiftConfig?.shifts?.length || 0) > 1);
  }, [shiftConfig?.operational_mode, shiftConfig?.shifts]);

  const activeShiftsToPrint = useMemo<ShiftItem[]>(() => {
    const list = shiftConfig?.shifts || [];
    if (isMultiShift && list.length > 1) {
      return list;
    }
    return [list[0] || { id: 'reguler', name: 'Reguler', slot_duration: 45, slots: [], breaks: [] }];
  }, [shiftConfig?.shifts, isMultiShift]);

  // Otomatis Deteksi Hari Kerja: 6 Hari (Senin-Sabtu) jika tenant aktif 6 hari atau ada jadwal Sabtu
  const includeSaturday = useMemo(() => {
    if (tenantInfo?.hari_sekolah === 6) return true;
    return activeShiftsToPrint.some(shift => {
      const sat = shift.day_patterns?.['SABTU'];
      return Boolean(sat && sat.slots && sat.slots.length > 0);
    });
  }, [tenantInfo?.hari_sekolah, activeShiftsToPrint]);

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

  // Active days to display in table
  const activeDays = useMemo(() => {
    return includeSaturday ? ALL_DAYS : ALL_DAYS.filter(d => d.key !== 'SABTU');
  }, [includeSaturday]);

  // Helper untuk mendapatkan jadwal hari tertentu untuk shift tertentu
  const getDaySchedule = useCallback((shift: ShiftItem, dayKey: string) => {
    if (!shift) return { slots: [] as TimeSlot[], breaks: [] as BreakItem[], duration: 45 };
    if (shift.day_patterns?.[dayKey]) {
      const dp = shift.day_patterns[dayKey];
      return {
        slots: dp.slots && dp.slots.length > 0 ? dp.slots : shift.slots || [],
        breaks: dp.breaks ?? shift.breaks ?? [],
        duration: dp.slot_duration ?? shift.slot_duration ?? 45,
      };
    }
    return {
      slots: shift.slots || [],
      breaks: shift.breaks || [],
      duration: shift.slot_duration || 45,
    };
  }, []);

  // Helper untuk membuat daftar urutan jam + istirahat untuk 1 hari
  const getDayTimelineItems = useCallback((shift: ShiftItem, dayKey: string): DayTimelineItem[] => {
    const sch = getDaySchedule(shift, dayKey);
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

  // Kelompok hari untuk format vertikal 2 kolom per Shift
  interface DayGroup {
    id: string;
    dayLabel: string;
    subLabel?: string;
    dayCount: number;
    items: DayTimelineItem[];
    duration: number;
    slotsCount: number;
  }

  const getShiftDayGroups = useCallback((shift: ShiftItem): DayGroup[] => {
    if (!groupIdenticalDays) {
      return activeDays.map(d => {
        const sch = getDaySchedule(shift, d.key);
        return {
          id: d.key,
          dayLabel: d.label.toUpperCase(),
          dayCount: 1,
          items: getDayTimelineItems(shift, d.key),
          duration: sch.duration,
          slotsCount: sch.slots.length,
        };
      });
    }

    // ── Smart Auto-Merger: Deteksi & Merger Hari dengan Pola Waktu yang Sama ──
    const dayDataList = activeDays.map(d => {
      const sch = getDaySchedule(shift, d.key);
      const items = getDayTimelineItems(shift, d.key);
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

  // Dual-Engine True WYSIWYG PDF Download (Mendukung Otomatis 1 Lembar Single Shift atau 2 Lembar Multi Shift)
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Distribusi Jam Pelajaran (True WYSIWYG)...');
    try {
      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const sheetElement = sheetElements[i] as HTMLElement;
        const canvas = await html2canvas(sheetElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            // Bersihkan border dan shadow lembar kertas agar tepi PDF bersih tanpa garis bingkai di kiri/kanan
            const sheets = clonedDoc.querySelectorAll('.print-sheet');
            sheets.forEach((s: any) => {
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        // Optimasi ukuran file: gunakan JPEG 88% kualitas tinggi + compression flag
        const imgData = canvas.toDataURL('image/jpeg', 0.88);

        // STRICT 1-PAGE AUTO-FIT & TRUE WYSIWYG ASPECT RATIO PER SHEET
        const canvasRatio = canvas.height / canvas.width;
        let finalWidth = pdfWidth;
        let finalHeight = pdfWidth * canvasRatio;
        let posX = 0;
        let posY = 0;

        if (finalHeight > pdfHeight) {
          const scale = pdfHeight / finalHeight;
          finalHeight = pdfHeight;
          finalWidth = pdfWidth * scale;
          posX = (pdfWidth - finalWidth) / 2; // Rata tengah secara horizontal
        }

        pdf.addImage(imgData, 'JPEG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');
      }

      const modeSlug = activeShiftsToPrint.length > 1
        ? 'MultiShift_2Lembar'
        : (activeShiftsToPrint[0]?.name?.replace(/[^a-zA-Z0-9]/g, '_') || '1Lembar');

      pdf.save(`Distribusi_Jam_Pelajaran_${modeSlug}_${todayStr.replace(/\s+/g, '_')}.pdf`);
      toast.success(
        `PDF Distribusi Jam Pelajaran (${activeShiftsToPrint.length} Lembar) berhasil diunduh!`,
        { id: toastId }
      );
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
      subtitle={
        isMultiShift
          ? "Dokumen Pedoman Resmi Format Vertikal (Otomatis 2 Lembar: Shift Pagi & Shift Siang)"
          : "Dokumen Pedoman Resmi Format Vertikal (Otomatis 1 Lembar)"
      }
      orientation="portrait"
      allowOrientationToggle={false}
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
          {/* Toggle Gabung Hari Sama */}
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

          {/* Tombol Pengesah Dokumen */}
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

        {/* ── Lembar Dokumen Fisik A4 (Otomatis 1 Lembar / 2 Lembar Multi-Shift) ── */}
        <div className="flex flex-col items-center gap-8 w-full overflow-x-auto p-2">
          {activeShiftsToPrint.map((shift, shiftIndex) => {
            const pageNum = shiftIndex + 1;
            const totalPages = activeShiftsToPrint.length;
            const shiftDayGroups = getShiftDayGroups(shift);

            return (
              <PrintDocumentSheet
                key={shift.id || shiftIndex}
                orientation="portrait"
                pageNumber={pageNum}
                totalPages={totalPages}
                footerText={`Pedoman Resmi Distribusi Jam Pelajaran KBM - ${tenantInfo?.name || 'Sekolah'}`}
                className="text-black font-serif !p-4 sm:!p-5 print:!border-none print:!shadow-none"
              >
                {/* 1. KOP SURAT DINAS & SEKOLAH RESMI */}
                <PrintHeader
                  variant="portrait"
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
                  {isMultiShift && (
                    <div className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md border border-black text-[9px] font-black uppercase tracking-wider bg-slate-50">
                      {shift.name}
                    </div>
                  )}
                </div>

                {/* 3. TABEL DISTRIBUSI JAM PELAJARAN (FORMAT VERTIKAL 2 KOLOM) */}
                <div className="w-full border border-black mb-2.5 overflow-hidden text-[10px]">
                  {/* Header Tabel */}
                  <div className="grid grid-cols-[176px_1fr] bg-slate-100 border-b-2 border-black font-black text-center text-[10.5px]">
                    <div className="border-r border-black py-1 uppercase tracking-wider">
                      HARI
                    </div>
                    <div className="py-1 uppercase tracking-wider">
                      WAKTU
                    </div>
                  </div>

                  {/* Baris Kelompok Hari (Merger Murni Tanpa Garis di Kolom Hari) */}
                  {shiftDayGroups.map((group, gIdx) => {
                    const items = group.items;
                    if (items.length === 0) return null;

                    return (
                      <div
                        key={`${group.dayLabel}-${gIdx}`}
                        className={cn(
                          "grid grid-cols-[176px_1fr] w-full",
                          gIdx < shiftDayGroups.length - 1 && "border-b-2 border-black"
                        )}
                      >
                        {/* KOLOM PERTAMA: HARI (1 Kotak Solid Ter-merger Utuh, Bebas Garis Horizontal) */}
                        <div className="border-r border-black bg-slate-50/90 flex flex-col items-center justify-center p-2 text-center select-none">
                          <div className="font-black text-xs tracking-wider text-black">{group.dayLabel}</div>
                          {group.subLabel && (
                            <div className="text-[8px] text-slate-600 font-sans font-normal mt-0.5">
                              {group.subLabel}
                            </div>
                          )}
                          <div className="text-[8.5px] text-slate-500 font-sans font-normal mt-1 pt-0.5 border-t border-slate-300 w-full">
                            <div>{items.filter(x => x.type === 'SLOT').length} JP</div>
                            <div>{group.duration} mnt / JP</div>
                          </div>
                        </div>

                        {/* KOLOM KEDUA: WAKTU (Daftar Jam & Istirahat dengan Garis Pembatas Mandiri) */}
                        <div className="flex flex-col w-full">
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center justify-between px-3 py-0.5 text-[9.5px]",
                                item.type === 'BREAK' ? 'bg-amber-50/70 font-bold' : 'hover:bg-slate-50/40',
                                idx < items.length - 1 && "border-b border-black/60"
                              )}
                            >
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
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. CATATAN & KETENTUAN KBM */}
                <div className="border border-black rounded-sm p-2 mb-2.5 text-[8.5px] leading-snug bg-slate-50/40">
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Ketentuan Pelaksanaan KBM:</span>
                  <ol className="list-decimal pl-4 space-y-0">
                    <li>
                      Durasi standar 1 Jam Pelajaran (JP) = <strong>{shift?.slot_duration ?? 45} Menit</strong>.
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
                    <div className="h-8 sm:h-9" />
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
                    <div className="h-8 sm:h-9" />
                    <div className="font-bold underline">{kepalaSekolahNama}</div>
                    <div className="text-[9.5px] font-mono">
                      {kepalaSekolahNip && kepalaSekolahNip !== '-' ? `NIP. ${kepalaSekolahNip}` : 'NIP. –'}
                    </div>
                  </div>
                </div>
              </PrintDocumentSheet>
            );
          })}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};

export default DistribusiJamPelajaranPrintModal;
