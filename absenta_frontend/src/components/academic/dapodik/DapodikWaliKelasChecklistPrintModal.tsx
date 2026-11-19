/**
 * DapodikWaliKelasChecklistPrintModal.tsx
 * Modal Cetak & Ekspor PDF True WYSIWYG Lembar Verifikasi Data & Checklist Berkas Siswa
 * Khusus untuk diserahkan ke Wali Kelas guna memverifikasi selisih data Dapodik vs Absenta
 * serta mengumpulkan/mengunggah berkas pendukung (Ijazah, KK, KTP, NISN, Akta Lahir).
 *
 * Standar Industri: Universal Document Printing (A4 Landscape, True WYSIWYG + Dual-Engine Vector Fallback).
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SlidersHorizontal, RotateCcw, X, Calendar, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  Button,
  DigitalSignatureField,
} from '@/components/ui';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import type { ReconciledStudent } from '@/api/dapodik.api';
import { generatePdfDapodikWaliKelas } from '@/utils/print/modules/pdfDapodikWaliKelas';
import type { DapodikEditableSignerState } from './DapodikBeritaAcaraSignersDrawer';

export interface DapodikWaliKelasChecklistPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: ReconciledStudent[];
  activeFilterLabel?: string;
  activeRombel?: string;
  activeTingkat?: string;
  activeDiffAttribute?: string;
  dapodikHost: string;
  npsn: string;
  sourceMode?: 'LIVE' | 'STAGING';
}

function formatIndoLongDate(isoDateStr?: string): string {
  const safe = isoDateStr ? new Date(`${isoDateStr.split('T')[0]}T00:00:00`) : new Date();
  if (Number.isNaN(safe.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return safe.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDapodikRombel(s: ReconciledStudent): string {
  return s.dapodikRaw?.nama_rombel || s.rombel || 'Tanpa Rombel';
}

export function getRombelSortRank(rombel: string): number {
  if (!rombel || rombel === 'Tanpa Rombel') return 99999;
  const trimmed = rombel.trim().toUpperCase();
  if (trimmed.startsWith('XIII') || trimmed.startsWith('13')) return 4000;
  if (trimmed.startsWith('XII') || trimmed.startsWith('12')) return 3000;
  if (trimmed.startsWith('XI') || trimmed.startsWith('11')) return 2000;
  if (trimmed.startsWith('X') || trimmed.startsWith('10')) return 1000;
  return 5000;
}

export function compareDapodikRombel(a: string, b: string): number {
  const rankA = getRombelSortRank(a);
  const rankB = getRombelSortRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
}

export const DapodikWaliKelasChecklistPrintModal: React.FC<
  DapodikWaliKelasChecklistPrintModalProps
> = ({
  isOpen,
  onClose,
  students,
  activeFilterLabel = 'Semua Selisih Atribut',
  activeRombel,
  activeTingkat,
  activeDiffAttribute,
  dapodikHost,
  npsn,
  sourceMode = 'STAGING',
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Parameter Dokumen & Titimangsa
  const [documentNumber, setDocumentNumber] = useState<string>(
    `421.5/VERVAL-WALAS/${new Date().getFullYear()}/TU`
  );
  const [titimangsaCity, setTitimangsaCity] = useState<string>('');
  const [titimangsaDate, setTitimangsaDate] = useState<string>('');
  const [includeKepsekTier, setIncludeKepsekTier] = useState<boolean>(true);

  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;
  const autoSigners = useDocumentSigners();

  // Tanda Tangan: Kiri (Operator), Kanan (Wali Kelas), Bawah (Kepala Sekolah)
  const [operatorSigner, setOperatorSigner] = useState<DapodikEditableSignerState>({
    roleTitle: 'Petugas Pendataan /\nOperator Dapodik,',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });

  const [waliKelasSigner, setWaliKelasSigner] = useState<DapodikEditableSignerState>({
    roleTitle: activeRombel ? `Wali Kelas ${activeRombel},` : 'Wali Kelas,',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });

  const [kepsekSigner, setKepsekSigner] = useState<DapodikEditableSignerState>({
    roleTitle: 'Kepala Sekolah',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });

  // Sinkronisasi Penandatangan dari Hierarki Sistem
  const applyResolvedSigners = useCallback(() => {
    const resolvedCity = sekolahData?.kota || autoSigners.city || 'Purwakarta';
    setTitimangsaCity(resolvedCity);
    setTitimangsaDate(formatIndoLongDate(getTodayIsoDate()));

    setOperatorSigner((prev) => ({
      roleTitle: 'Petugas Pendataan /\nOperator Dapodik,',
      personName: autoSigners.tuKepegawaian.isAssigned
        ? autoSigners.tuKepegawaian.personName
        : '........................................',
      nip: autoSigners.tuKepegawaian.nip || '',
      signatureImage: prev.signatureImage,
    }));

    setWaliKelasSigner((prev) => ({
      roleTitle: activeRombel ? `Wali Kelas ${activeRombel},` : 'Wali Kelas,',
      personName: '........................................',
      nip: '',
      signatureImage: prev.signatureImage,
    }));

    setKepsekSigner((prev) => ({
      roleTitle: `Kepala ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'}`,
      personName:
        autoSigners.kepsek.personName ||
        sekolahData?.kepala_sekolah ||
        '........................................',
      nip: autoSigners.kepsek.nip || sekolahData?.nip_kepala || '',
      signatureImage: prev.signatureImage,
    }));
  }, [autoSigners, sekolahData, tenantInfo, activeRombel]);

  const [hasInitializedSigners, setHasInitializedSigners] = useState(false);
  useEffect(() => {
    if (isOpen && !autoSigners.isLoading && !hasInitializedSigners) {
      applyResolvedSigners();
      setHasInitializedSigners(true);
    }
  }, [isOpen, autoSigners.isLoading, hasInitializedSigners, applyResolvedSigners]);

  // Update role wali kelas jika activeRombel berubah
  useEffect(() => {
    if (activeRombel) {
      setWaliKelasSigner((prev) => ({
        ...prev,
        roleTitle: `Wali Kelas ${activeRombel},`,
      }));
    }
  }, [activeRombel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTING & GROUPING BERDASARKAN KELAS DAPODIK
  // ═══════════════════════════════════════════════════════════════════════════
  const [pageBreakPerRombel, setPageBreakPerRombel] = useState<boolean>(false);

  // Sorting: Prioritas Kelas Dapodik (Natural Order X -> XI -> XII) lalu Nama Siswa (A-Z)
  const sortedStudents = useMemo(() => {
    const list = [...students];
    list.sort((a, b) => {
      const rombelA = getDapodikRombel(a);
      const rombelB = getDapodikRombel(b);
      const rombelComp = compareDapodikRombel(rombelA, rombelB);
      if (rombelComp !== 0) return rombelComp;
      const nameA = a.dapodikRaw?.nama || a.nama || '';
      const nameB = b.dapodikRaw?.nama || b.nama || '';
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });
    return list;
  }, [students]);

  // Grouping Berdasarkan Rombongan Belajar Dapodik
  interface RombelGroup {
    rombelName: string;
    students: ReconciledStudent[];
  }

  const rombelGroups = useMemo<RombelGroup[]>(() => {
    const map = new Map<string, ReconciledStudent[]>();
    sortedStudents.forEach((s) => {
      const rombel = getDapodikRombel(s);
      if (!map.has(rombel)) {
        map.set(rombel, []);
      }
      map.get(rombel)!.push(s);
    });

    return Array.from(map.entries()).map(([rombelName, groupStudents]) => ({
      rombelName,
      students: groupStudents,
    }));
  }, [sortedStudents]);

  // Peta nomor urut siswa dalam rombelnya masing-masing (1..N per rombel)
  const studentIndexInRombelMap = useMemo(() => {
    const map = new Map<string, number>();
    rombelGroups.forEach((g) => {
      g.students.forEach((s, idx) => {
        map.set(s.id, idx + 1);
      });
    });
    return map;
  }, [rombelGroups]);

  // Peta jumlah siswa per rombel
  const rombelCountMap = useMemo(() => {
    const map = new Map<string, number>();
    rombelGroups.forEach((g) => {
      map.set(g.rombelName, g.students.length);
    });
    return map;
  }, [rombelGroups]);

  interface SheetPlan {
    sheetId: string;
    rombelName?: string;
    isFirstPageOfGroup: boolean;
    pageStudents: ReconciledStudent[];
    hasSignatures: boolean;
    isSignaturesOnlySheet?: boolean;
    classTitle?: string;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PEMBAGIAN HALAMAN (PAGINATION CHUNKING) ANTI-OVERFLOW
  // Mendukung Mode Pisah Lembar per Rombel maupun Mode Gabung Berkelanjutan
  // ═══════════════════════════════════════════════════════════════════════════
  const computedSheets = useMemo<SheetPlan[]>(() => {
    if (pageBreakPerRombel) {
      const plans: SheetPlan[] = [];
      rombelGroups.forEach((group, gIdx) => {
        const gStudents = group.students;
        if (gStudents.length <= 10) {
          plans.push({
            sheetId: `g-${gIdx}-0`,
            rombelName: group.rombelName,
            isFirstPageOfGroup: true,
            pageStudents: gStudents,
            hasSignatures: true,
            classTitle: group.rombelName,
          });
        } else {
          let remaining = [...gStudents];
          // Lembar 1 rombel ini: 15 siswa
          plans.push({
            sheetId: `g-${gIdx}-0`,
            rombelName: group.rombelName,
            isFirstPageOfGroup: true,
            pageStudents: remaining.slice(0, 15),
            hasSignatures: false,
            classTitle: group.rombelName,
          });
          remaining = remaining.slice(15);
          let subIdx = 1;

          while (remaining.length > 0) {
            if (remaining.length <= 10) {
              plans.push({
                sheetId: `g-${gIdx}-${subIdx}`,
                rombelName: group.rombelName,
                isFirstPageOfGroup: false,
                pageStudents: remaining,
                hasSignatures: true,
                classTitle: group.rombelName,
              });
              break;
            } else if (remaining.length <= 18) {
              plans.push({
                sheetId: `g-${gIdx}-${subIdx}`,
                rombelName: group.rombelName,
                isFirstPageOfGroup: false,
                pageStudents: remaining,
                hasSignatures: false,
                classTitle: group.rombelName,
              });
              subIdx++;
              plans.push({
                sheetId: `g-${gIdx}-${subIdx}-sig`,
                rombelName: group.rombelName,
                isFirstPageOfGroup: false,
                pageStudents: [],
                hasSignatures: true,
                isSignaturesOnlySheet: true,
                classTitle: group.rombelName,
              });
              break;
            } else {
              plans.push({
                sheetId: `g-${gIdx}-${subIdx}`,
                rombelName: group.rombelName,
                isFirstPageOfGroup: false,
                pageStudents: remaining.slice(0, 18),
                hasSignatures: false,
                classTitle: group.rombelName,
              });
              remaining = remaining.slice(18);
              subIdx++;
            }
          }
        }
      });
      return plans.length > 0
        ? plans
        : [
            {
              sheetId: 'empty',
              isFirstPageOfGroup: true,
              pageStudents: [],
              hasSignatures: true,
            },
          ];
    } else {
      // Continuous Grouped Flow
      const plans: SheetPlan[] = [];
      let remaining = [...sortedStudents];
      if (remaining.length === 0) {
        return [{ sheetId: 'empty', isFirstPageOfGroup: true, pageStudents: [], hasSignatures: true }];
      }

      if (remaining.length <= 10) {
        return [{ sheetId: 'c-0', isFirstPageOfGroup: true, pageStudents: remaining, hasSignatures: true }];
      }

      plans.push({
        sheetId: 'c-0',
        isFirstPageOfGroup: true,
        pageStudents: remaining.slice(0, 15),
        hasSignatures: false,
      });
      remaining = remaining.slice(15);
      let subIdx = 1;

      while (remaining.length > 0) {
        if (remaining.length <= 10) {
          plans.push({
            sheetId: `c-${subIdx}`,
            isFirstPageOfGroup: false,
            pageStudents: remaining,
            hasSignatures: true,
          });
          break;
        } else if (remaining.length <= 18) {
          plans.push({
            sheetId: `c-${subIdx}`,
            isFirstPageOfGroup: false,
            pageStudents: remaining,
            hasSignatures: false,
          });
          subIdx++;
          plans.push({
            sheetId: `c-${subIdx}-sig`,
            isFirstPageOfGroup: false,
            pageStudents: [],
            hasSignatures: true,
            isSignaturesOnlySheet: true,
          });
          break;
        } else {
          plans.push({
            sheetId: `c-${subIdx}`,
            isFirstPageOfGroup: false,
            pageStudents: remaining.slice(0, 18),
            hasSignatures: false,
          });
          remaining = remaining.slice(18);
          subIdx++;
        }
      }
      return plans;
    }
  }, [pageBreakPerRombel, rombelGroups, sortedStudents]);

  const totalPages = computedSheets.length;

  // Dual-Engine PDF Download
  const handleDownloadPdf = async () => {
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    const safeRombel = activeRombel ? `_${activeRombel.replace(/\s+/g, '_')}` : '';
    const filePrefix = `LEMBAR_VERVAL_WALI_KELAS${safeRombel}_${npsn || 'SEKOLAH'}`;

    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan Lembar Verifikasi PDF True WYSIWYG...', {
        id: 'walas-pdf-toast',
      });

      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        void deskCanvas.offsetHeight;
      }
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        throw new Error('Lembar dokumen tidak ditemukan');
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) pdf.addPage('a4', 'landscape');
        const sheet = sheetElements[i] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 2.3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              (clonedDesk.style as any).transform = 'none';
            }
            clonedDoc.querySelectorAll('.print-sheet').forEach((s: any) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgHeight = Math.min(pdfHeight, (pdfWidth * canvas.height) / canvas.width);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      }

      pdf.save(`${filePrefix}.pdf`);
      toast.success('Dokumen Lembar Verifikasi berhasil diunduh.', { id: 'walas-pdf-toast' });
    } catch {
      // Fallback Engine 2 Vector AutoTable
      try {
        const { blobUrl } = generatePdfDapodikWaliKelas({
          documentNumber,
          titimangsaCity: titimangsaCity || 'Purwakarta',
          titimangsaDate: titimangsaDate || formatIndoLongDate(getTodayIsoDate()),
          activeFilterLabel,
          activeRombel,
          activeTingkat,
          npsn,
          dapodikHost,
          sourceMode,
          students,
          sekolah: {
            nama: sekolahData?.nama || tenantInfo.name || 'SMK NEGERI 1 PLERED',
            alamat: tenantInfo.address,
            kota: titimangsaCity || sekolahData?.kota || 'Purwakarta',
            telepon: tenantInfo.phone,
            email: tenantInfo.email,
            website: tenantInfo.website,
            nama_dinas_atas: tenantInfo.nama_dinas_atas,
            nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
            nama_cabang_dinas: tenantInfo.nama_cabang_dinas,
            print_header_lines: tenantInfo.print_header_lines,
          },
          options: {
            logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
            logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
          },
          signers: {
            operatorDapodik: {
              ...operatorSigner,
              isAssigned: Boolean(operatorSigner.personName),
            },
            waliKelas: {
              ...waliKelasSigner,
              isAssigned: Boolean(waliKelasSigner.personName),
            },
            kepsek: {
              ...kepsekSigner,
              isAssigned: Boolean(kepsekSigner.personName),
            },
            includeKepsekTier,
          },
        });

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${filePrefix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Dokumen PDF (Vector Fallback) berhasil diunduh.', { id: 'walas-pdf-toast' });
      } catch {
        toast.error('Gagal mengekspor dokumen ke PDF.', { id: 'walas-pdf-toast' });
      }
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  // Hitung running index per lembar
  let accumulatedIndex = 0;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Verifikasi Selisih Data & Ceklis Berkas Siswa (Wali Kelas)"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            {activeFilterLabel} ({students.length} Siswa Terfilter)
          </span>
          {activeRombel && (
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-md">
              Rombel: {activeRombel}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Format Cetak A4 Landscape &amp; Ceklis Dokumen Fisik
          </span>
        </div>
      }
      orientation="landscape"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      extraActions={
        <div className="flex items-center gap-2">
          {/* Toggle Mode Lembar: Berkelanjutan vs Pisah per Rombel */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setPageBreakPerRombel(false)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                !pageBreakPerRombel
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
              title="Tampilkan seluruh rombel berurutan dalam lembar bersambung"
            >
              Gabung Berurutan
            </button>
            <button
              type="button"
              onClick={() => setPageBreakPerRombel(true)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                pageBreakPerRombel
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
              title="Pisahkan halaman cetak untuk masing-masing kelas / rombel"
            >
              Pisah Lembar Tiap Kelas
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isDrawerOpen
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Atur Nama Wali Kelas, Operator Dapodik, & Kepala Sekolah"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atur Penandatangan</span>
          </button>
        </div>
      }
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses...' : 'Unduh PDF (Landscape)'}
      defaultWaFilename={`LEMBAR_VERVAL_WALI_KELAS_${activeRombel || 'SEMUA'}.pdf`}
      defaultWaCaption={`Yth. Bapak/Ibu Wali Kelas, berikut kami sampaikan Lembar Verifikasi Selisih Data Siswa Dapodik vs Absenta untuk dilakukan cross-check dan upload berkas pendukung.`}
      onPrint={() => window.print()}
      printButtonText="Cetak Lembar"
      size="5xl"
    >
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full">
        {/* DRAWER PENGATURAN PENANDATANGAN */}
        {isDrawerOpen && (
          <aside className="w-full lg:w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Pengaturan Dokumen
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nomor & Titimangsa */}
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Nomor Surat / Dokumen:
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Kota Dokumen:</label>
                <input
                  type="text"
                  value={titimangsaCity}
                  onChange={(e) => setTitimangsaCity(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tanggal Dokumen:</label>
                <input
                  type="text"
                  value={titimangsaDate}
                  onChange={(e) => setTitimangsaDate(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Sisi Kanan: Wali Kelas */}
            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Wali Kelas (Penandatangan Kanan)</span>
              </div>
              <input
                type="text"
                value={waliKelasSigner.roleTitle}
                onChange={(e) =>
                  setWaliKelasSigner((prev) => ({ ...prev, roleTitle: e.target.value }))
                }
                placeholder="Jabatan (cth: Wali Kelas X AKL 1)"
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={waliKelasSigner.personName}
                onChange={(e) =>
                  setWaliKelasSigner((prev) => ({ ...prev, personName: e.target.value }))
                }
                placeholder="Nama Lengkap Wali Kelas"
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={waliKelasSigner.nip}
                onChange={(e) =>
                  setWaliKelasSigner((prev) => ({ ...prev, nip: e.target.value }))
                }
                placeholder="NIP Wali Kelas (opsional)"
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-800"
              />
            </div>

            {/* Sisi Kiri: Operator Dapodik */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Petugas Pendataan (Kiri)</span>
              </div>
              <input
                type="text"
                value={operatorSigner.roleTitle}
                onChange={(e) =>
                  setOperatorSigner((prev) => ({ ...prev, roleTitle: e.target.value }))
                }
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={operatorSigner.personName}
                onChange={(e) =>
                  setOperatorSigner((prev) => ({ ...prev, personName: e.target.value }))
                }
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={operatorSigner.nip}
                onChange={(e) =>
                  setOperatorSigner((prev) => ({ ...prev, nip: e.target.value }))
                }
                placeholder="NIP Operator (opsional)"
                className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-800"
              />
            </div>

            {/* Tier 2: Kepala Sekolah */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kepala Sekolah (Mengesahkan)
                </span>
                <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeKepsekTier}
                    onChange={(e) => setIncludeKepsekTier(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>
              {includeKepsekTier && (
                <>
                  <input
                    type="text"
                    value={kepsekSigner.roleTitle}
                    onChange={(e) =>
                      setKepsekSigner((prev) => ({ ...prev, roleTitle: e.target.value }))
                    }
                    className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={kepsekSigner.personName}
                    onChange={(e) =>
                      setKepsekSigner((prev) => ({ ...prev, personName: e.target.value }))
                    }
                    className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={kepsekSigner.nip}
                    onChange={(e) =>
                      setKepsekSigner((prev) => ({ ...prev, nip: e.target.value }))
                    }
                    placeholder="NIP Kepala Sekolah"
                    className="w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-800"
                  />
                </>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={applyResolvedSigners}
              className="w-full text-xs gap-1.5 text-slate-600 dark:text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Struktur
            </Button>
          </aside>
        )}

        {/* LEMBAR-LEMBAR CETAK MULTI-SHEET A4 LANDSCAPE */}
        <div className="flex-1 flex flex-col items-center gap-6 overflow-x-auto w-full">
          {computedSheets.map((sheet, sheetIdx) => {
            const pageNumber = sheetIdx + 1;
            const isFirstPage = pageBreakPerRombel ? sheet.isFirstPageOfGroup : sheetIdx === 0;
            const activeRombelLabel = pageBreakPerRombel && sheet.rombelName ? sheet.rombelName : activeRombel;

            return (
              <PrintDocumentSheet
                key={sheet.sheetId}
                orientation="landscape"
                pageNumber={pageNumber}
                totalPages={totalPages}
                footerText={
                  pageBreakPerRombel && sheet.rombelName
                    ? `Lembar Verifikasi Rombel ${sheet.rombelName} — ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'} (NPSN: ${npsn})`
                    : `Lembar Verifikasi Selisih Data Siswa — ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'} (NPSN: ${npsn})`
                }
              >
                {/* KOP SURAT RESMI PADA HALAMAN PERTAMA DARI GRUP / DOKUMEN */}
                {isFirstPage ? (
                  <PrintHeader
                    variant="landscape"
                    tenantInfo={tenantInfo}
                    showLogoDaerah={showLogoDaerah}
                    showLogoSekolah={showLogoSekolah}
                  />
                ) : (
                  <div className="pb-1 mb-2 border-b border-black flex items-center justify-between text-[9px] font-serif">
                    <span className="font-bold uppercase tracking-wider text-black">
                      Lanjutan Lembar Verifikasi {sheet.rombelName ? `Kelas ${sheet.rombelName}` : 'Data Siswa'} — {sekolahData?.nama || tenantInfo.name}
                    </span>
                    <span className="italic text-slate-700">
                      Halaman {pageNumber} dari {totalPages}
                    </span>
                  </div>
                )}

                {/* JUDUL DOKUMEN & METADATA (HANYA HALAMAN PERTAMA GRUP/DOKUMEN) */}
                {isFirstPage && (
                  <>
                    <div className="text-center my-2 space-y-0.5 font-serif">
                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-black">
                        LEMBAR VERIFIKASI SELISIH DATA DAPODIK &amp; CEKLIS BERKAS PENDUKUNG SISWA
                      </h3>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-black">
                        {pageBreakPerRombel && sheet.rombelName
                          ? `ROMBONGAN BELAJAR: ${sheet.rombelName}`
                          : 'UNTUK WALI KELAS &amp; TIM OPERATOR PENDATAAN PENDIDIKAN'}
                      </h4>
                      <p className="text-[9px] font-normal italic text-slate-700">
                        Nomor: {documentNumber}
                      </p>
                    </div>

                    {/* METADATA FILTER & INFO SATUAN PENDIDIKAN */}
                    <div className="my-1.5 p-1.5 bg-slate-50 border border-slate-300 rounded text-[9.5px] font-serif text-black flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div>
                        <span className="font-semibold text-slate-600">Kategori Selisih:</span>{' '}
                        <strong className="text-black">{activeFilterLabel}</strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Rombongan Belajar:</span>{' '}
                        <strong className="text-black">
                          {activeRombelLabel || 'Semua Rombel (Gabungan)'}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Tingkat:</span>{' '}
                        <strong className="text-black">{activeTingkat ? `Kelas ${activeTingkat}` : 'Semua Tingkat'}</strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">
                          {pageBreakPerRombel && sheet.rombelName ? 'Siswa di Kelas Ini:' : 'Total Siswa Terfilter:'}
                        </span>{' '}
                        <strong className="text-black">
                          {pageBreakPerRombel && sheet.rombelName
                            ? `${rombelCountMap.get(sheet.rombelName) || sheet.pageStudents.length} Siswa`
                            : `${students.length} Siswa`}
                        </strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Tanggal Tarik/Cetak:</span>{' '}
                        <span className="text-black">{titimangsaDate || formatIndoLongDate(getTodayIsoDate())}</span>
                      </div>
                    </div>

                    {/* PETUNJUK RINGKAS KERJA WALI KELAS */}
                    <div className="my-1 px-2 py-1 rounded bg-amber-50/70 border border-amber-200 text-[8.5px] font-serif text-amber-950 text-justify leading-tight">
                      <strong>Petunjuk Pengisian Wali Kelas:</strong> 1. Cocokkan identitas siswa di bawah ini dengan dokumen autentik siswa. 
                      2. Berikan centang <strong>[✔]</strong> pada kolom berkas pendukung fisik yang telah dikumpulkan dan di-upload ke sistem (Ijazah SMP/MTs, Kartu Keluarga, KTP Siswa/Ortu, NISN, Akta Kelahiran).
                      3. Tuliskan perbaikan data yang sah pada kolom Catatan Validasi dan bubuhkan paraf pengesahan.
                    </div>
                  </>
                )}

                {/* KONDISI LEMBAR KHUSUS PENUTUP / TANDA TANGAN SAJA */}
                {sheet.isSignaturesOnlySheet ? (
                  <div className="my-3 p-3 bg-slate-50 border border-slate-300 rounded text-[10px] font-serif text-black space-y-1.5">
                    <p className="font-bold uppercase text-slate-800">
                      Rekapitulasi Verifikasi &amp; Penyerahan Berkas
                    </p>
                    <p className="text-justify leading-relaxed">
                      Telah dilaksanakan pemeriksaan dan pencocokan silang data peserta didik pada rombongan belajar{' '}
                      <strong>{activeRombelLabel || 'seluruh rombel'}</strong>. Seluruh berkas pendukung fisik dan perbaikan data
                      pada lembar ini diserahkan kepada tim Operator Pendataan Dapodik / Tata Usaha untuk
                      dimutakhirkan ke dalam sistem Dapodik Kemendikbudristek dan database sekolah.
                    </p>
                  </div>
                ) : (
                  /* TABEL DATA SISWA & CHECKLIST BERKAS */
                  <div className="my-1.5 w-full">
                    <table className="w-full border-collapse border border-black text-black font-serif text-[9.5px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th rowSpan={2} className="border border-black p-1 w-7">
                            No
                          </th>
                          <th rowSpan={2} className="border border-black p-1 w-28">
                            NISN &amp; NIK
                          </th>
                          <th colSpan={2} className="border border-black p-1">
                            Perbandingan Nama Siswa
                          </th>
                          <th rowSpan={2} className="border border-black p-1 w-24">
                            Rombel / Kelas
                          </th>
                          <th colSpan={5} className="border border-black p-0.5">
                            Ceklis Berkas Autentik (Upload / Fisik)
                          </th>
                          <th rowSpan={2} className="border border-black p-1">
                            Catatan Validasi / Nama Benar Sesuai Berkas
                          </th>
                          <th rowSpan={2} className="border border-black p-1 w-14">
                            Paraf
                          </th>
                        </tr>
                        <tr className="bg-slate-50 font-semibold text-center text-[8.5px]">
                          <th className="border border-black p-1">Nama di Dapodik (Port 5774)</th>
                          <th className="border border-black p-1">Nama di Absenta (Sekolah)</th>
                          <th className="border border-black p-0.5 w-9" title="Ijazah SMP/MTs">
                            Ijazah
                          </th>
                          <th className="border border-black p-0.5 w-9" title="Kartu Keluarga">
                            KK
                          </th>
                          <th className="border border-black p-0.5 w-9" title="KTP Siswa / Ortu">
                            KTP
                          </th>
                          <th className="border border-black p-0.5 w-9" title="Bukti / Kartu NISN">
                            NISN
                          </th>
                          <th className="border border-black p-0.5 w-9" title="Akta Kelahiran">
                            Akta
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.pageStudents.map((s, idx) => {
                          const currentRombel = getDapodikRombel(s);
                          const isFirstOfRombelOnThisSheet =
                            idx === 0 || getDapodikRombel(sheet.pageStudents[idx - 1]) !== currentRombel;
                          const groupCount = rombelCountMap.get(currentRombel) || 0;
                          const idxInRombel = studentIndexInRombelMap.get(s.id) || idx + 1;
                          const otherDiffs = s.diffs.filter((d) => d.field !== 'nama');

                          return (
                            <React.Fragment key={s.id}>
                              {/* Banner Header Rombel Jika Berpindah Rombel di Mode Berkelanjutan */}
                              {!pageBreakPerRombel && isFirstOfRombelOnThisSheet && (
                                <tr className="bg-slate-200 text-black font-bold">
                                  <td
                                    colSpan={12}
                                    className="border border-black px-2 py-1 text-left bg-slate-200"
                                  >
                                    <div className="flex items-center justify-between font-serif text-[9px]">
                                      <span>
                                        ROMBONGAN BELAJAR DAPODIK:{' '}
                                        <strong className="text-black uppercase font-extrabold">
                                          {currentRombel}
                                        </strong>
                                      </span>
                                      <span className="font-normal italic text-[8.5px] text-slate-700">
                                        {groupCount} Siswa Perlu Verifikasi
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}

                              <tr className="text-center">
                                <td className="border border-black p-1 font-semibold">
                                  {idxInRombel}
                                </td>
                                <td className="border border-black p-1 text-left">
                                  <div className="font-mono font-bold text-black text-[9px]">
                                    {s.nisn || '-'}
                                  </div>
                                  <div className="font-mono text-[8px] text-slate-600">
                                    NIK: {s.nik || s.dapodikRaw?.nik || '-'}
                                  </div>
                                  {otherDiffs.length > 0 && (
                                    <div className="text-[7.5px] text-amber-800 font-sans italic mt-0.5">
                                      *{otherDiffs.map((d) => d.label).join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td className="border border-black p-1.5 text-left font-bold text-black text-[9.5px]">
                                  {s.dapodikRaw?.nama || s.nama}
                                </td>
                                <td className="border border-black p-1.5 text-left text-slate-900 text-[9.5px]">
                                  {s.absentaRaw?.nama_siswa || '-'}
                                </td>
                                <td className="border border-black p-1 font-mono text-[8.5px]">
                                  {currentRombel}
                                </td>
                                {/* 5 Kolom Checklist Berkas Fisik / Upload */}
                                <td className="border border-black p-1 text-center">
                                  <div className="w-3.5 h-3.5 border border-black mx-auto rounded-xs"></div>
                                </td>
                                <td className="border border-black p-1 text-center">
                                  <div className="w-3.5 h-3.5 border border-black mx-auto rounded-xs"></div>
                                </td>
                                <td className="border border-black p-1 text-center">
                                  <div className="w-3.5 h-3.5 border border-black mx-auto rounded-xs"></div>
                                </td>
                                <td className="border border-black p-1 text-center">
                                  <div className="w-3.5 h-3.5 border border-black mx-auto rounded-xs"></div>
                                </td>
                                <td className="border border-black p-1 text-center">
                                  <div className="w-3.5 h-3.5 border border-black mx-auto rounded-xs"></div>
                                </td>
                                {/* Catatan Validasi & Paraf */}
                                <td className="border border-black p-1 text-left text-[8px] text-slate-400">
                                  &nbsp;
                                </td>
                                <td className="border border-black p-1">&nbsp;</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* BLOK TANDA TANGAN JIKA TERCANTUM PADA HALAMAN INI */}
                {sheet.hasSignatures && (
                  <div className="mt-3 pt-1 w-full">
                    <UniversalDocumentSignatures
                      layout={includeKepsekTier ? 'triangle_2tier' : 'dual_custom'}
                      titimangsaCity={titimangsaCity || 'Purwakarta'}
                      titimangsaDate={titimangsaDate || formatIndoLongDate(getTodayIsoDate())}
                      verifierLabel=""
                      makerLabel=""
                      notesOrApprovalLabel="Mengetahui / Mengesahkan,"
                      signerLeft={{
                        roleTitle:
                          operatorSigner.roleTitle || 'Petugas Pendataan /\nOperator Dapodik,',
                        personName:
                          operatorSigner.personName || '........................................',
                        nip: operatorSigner.nip || undefined,
                        isAssigned: Boolean(operatorSigner.personName),
                        signatureImage: operatorSigner.signatureImage || undefined,
                      }}
                      signerRight={{
                        roleTitle:
                          pageBreakPerRombel && sheet.rombelName
                            ? `Wali Kelas ${sheet.rombelName},`
                            : waliKelasSigner.roleTitle || 'Wali Kelas,',
                        personName:
                          waliKelasSigner.personName || '........................................',
                        nip: waliKelasSigner.nip || undefined,
                        isAssigned: Boolean(waliKelasSigner.personName),
                        signatureImage: waliKelasSigner.signatureImage || undefined,
                      }}
                      signerCenter={{
                        roleTitle:
                          kepsekSigner.roleTitle ||
                          `Kepala ${sekolahData?.nama || tenantInfo.name}`,
                        personName:
                          kepsekSigner.personName || '........................................',
                        nip: kepsekSigner.nip || undefined,
                        isAssigned: Boolean(kepsekSigner.personName),
                        signatureImage: kepsekSigner.signatureImage || undefined,
                      }}
                      spacingHeightMm={14}
                    />
                  </div>
                )}
              </PrintDocumentSheet>
            );
          })}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};

export default DapodikWaliKelasChecklistPrintModal;
