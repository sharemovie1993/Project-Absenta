import React, { useState, useMemo, useEffect } from 'react';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
  type PrintHeaderTenantInfo,
} from '@/components/ui/PrintHeader';
import { useQuery } from '@tanstack/react-query';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { useCapabilities } from '@/hooks/useCapabilities';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { Edit3, RotateCcw, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  StrukturKurikulumDocumentSheet,
  type StrukturKurikulumJurusanMeta,
  type StrukturKurikulumRawItem,
} from './StrukturKurikulumDocumentSheet';

export interface StrukturKurikulumPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappingData: StrukturKurikulumRawItem[];
  selectedJurusan?: StrukturKurikulumJurusanMeta | null;
  allJurusans?: StrukturKurikulumJurusanMeta[];
  tahunPelajaranNama?: string;
  tahunPelajaranId?: string;
  jenjang?: string;
  tenantInfoOverride?: PrintHeaderTenantInfo;
  signersOverride?: {
    kepsek_nama?: string;
    kepsek_nip?: string;
    waka_kurikulum_nama?: string;
    waka_kurikulum_nip?: string;
    kota?: string;
  };
  isPublicMode?: boolean;
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

/**
 * 5-Step True WYSIWYG PDF Exporter for Struktur Kurikulum Document Sheets
 */
export async function exportStrukturKurikulumPdf({
  containerSelector = '.print-sheet',
  fileName = 'STRUKTUR_KURIKULUM_KOSP.pdf',
}: {
  containerSelector?: string;
  fileName?: string;
}): Promise<void> {
  const toastId = toast.loading('Sedang merender PDF Struktur Kurikulum (True WYSIWYG)...');
  const deskCanvas = document.getElementById('print-desk-canvas-area');
  const prevZoom = deskCanvas?.style.zoom || '';

  try {
    const sheetElements = document.querySelectorAll(containerSelector);
    if (!sheetElements || sheetElements.length === 0) {
      window.print();
      toast.dismiss(toastId);
      return;
    }

    // Step 1: Reset mobile zoom before capture so bounding box is 100% physical A4
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
    }

    // Step 2: Wait for fonts & layout reflow
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 120));

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

      // Step 3 & 4: High-DPI html2canvas-pro capture + onclone sanitizer
      const canvas = await html2canvas(sheetElement, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
        onclone: (clonedDoc) => {
          const sheets = clonedDoc.querySelectorAll('.print-sheet');
          sheets.forEach((s: any) => {
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
            s.style.margin = '0';
            s.style.transform = 'none';
            s.style.zoom = '1';
          });
          const allText = clonedDoc.querySelectorAll('p, span, div, td, th, h1, h2, h3, h4, li');
          allText.forEach((el: any) => {
            el.style.letterSpacing = 'normal';
            el.style.wordSpacing = 'normal';
          });
        },
      });

      // Step 5: JPEG 0.88 compression + aspect-ratio preservation
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const canvasRatio = canvas.height / canvas.width;
      let finalWidth = pdfWidth;
      let finalHeight = pdfWidth * canvasRatio;
      let posX = 0;
      const posY = 0;

      if (finalHeight > pdfHeight) {
        const scale = pdfHeight / finalHeight;
        finalHeight = pdfHeight;
        finalWidth = pdfWidth * scale;
        posX = (pdfWidth - finalWidth) / 2;
      }

      pdf.addImage(imgData, 'JPEG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');
    }

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    toast.success(`PDF Struktur Kurikulum (${sheetElements.length} Lembar) berhasil diunduh!`, {
      id: toastId,
    });
  } catch (err) {
    console.error('Failed to generate Struktur Kurikulum PDF:', err);
    toast.error('Gagal merender PDF, beralih ke dialog cetak browser...', { id: toastId });
    window.print();
  } finally {
    if (deskCanvas) {
      deskCanvas.style.zoom = prevZoom;
    }
  }
}

export const StrukturKurikulumPrintModal: React.FC<StrukturKurikulumPrintModalProps> = ({
  isOpen,
  onClose,
  mappingData,
  selectedJurusan,
  allJurusans = [],
  tahunPelajaranNama = '2025/2026',
  tahunPelajaranId,
  jenjang = 'SMK',
  tenantInfoOverride,
  signersOverride,
  isPublicMode = false,
}) => {
  const { tenantInfo: hookTenantInfo } = usePrintHeaderData(tenantInfoOverride);
  const effectiveTenantInfo = tenantInfoOverride || hookTenantInfo;
  const { user, isKurikulum } = useCapabilities();

  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [printAllJurusans, setPrintAllJurusans] = useState(false);

  // ── Auto-Resolving Queries for Official Signers (Skipped in Public Mode) ──
  const { data: treeRes } = useQuery({
    queryKey: ['academic-struktur-tree'],
    queryFn: () => getStrukturTree().catch(() => null),
    enabled: isOpen && !isPublicMode,
    staleTime: 5 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['academic-struktur-list-active'],
    queryFn: () => getStrukturList({ is_active: true }).catch(() => null),
    enabled: isOpen && !isPublicMode,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled: isOpen && !isPublicMode,
    staleTime: 10 * 60 * 1000,
  });

  const resolvedSigners = useMemo(() => {
    if (signersOverride?.kepsek_nama || signersOverride?.waka_kurikulum_nama) {
      return {
        kepsekNama: signersOverride.kepsek_nama || 'Kepala Sekolah',
        kepsekNip: cleanNip(signersOverride.kepsek_nip),
        kurikulumNama: signersOverride.waka_kurikulum_nama || 'Wakasek Bidang Kurikulum',
        kurikulumNip: cleanNip(signersOverride.waka_kurikulum_nip),
        kota: signersOverride.kota || 'Purwakarta',
      };
    }

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
      const assign =
        kepsekPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
        kepsekPos?.organizationalAssigns?.[0];
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
      const assign =
        kurikulumPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
        kurikulumPos?.organizationalAssigns?.[0];
      if (assign?.User?.Guru) {
        kurikulumNama = assign.User.Guru.nama_guru;
        kurikulumNip = assign.User.Guru.nip || '-';
      }
    }

    if (!kurikulumNama && isKurikulum && user?.name) {
      kurikulumNama = user.name;
      kurikulumNip = (user as any).nip || (user as any).Guru?.nip || '-';
    }

    const kota =
      sekolah?.kota ||
      effectiveTenantInfo?.address?.match(
        /Purwakarta|Bandung|Jakarta|Bogor|Bekasi|Subang|Cimahi|Depok|Karawang/i
      )?.[0] ||
      'Purwakarta';

    return {
      kepsekNama: kepsekNama || 'Kepala Sekolah',
      kepsekNip: kepsekNip || '-',
      kurikulumNama: kurikulumNama || 'Wakasek Bidang Kurikulum',
      kurikulumNip: kurikulumNip || '-',
      kota,
    };
  }, [signersOverride, treeRes, listRes, sekolahRes, effectiveTenantInfo, isKurikulum, user]);

  const defaultAcademicDate = useMemo(() => {
    const yearMatch = (tahunPelajaranNama || '').match(/\b(20\d{2})\b/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    return `14 Juli ${startYear}`;
  }, [tahunPelajaranNama]);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const [isEditingSigners, setIsEditingSigners] = useState(false);
  const [wakaKurikulumNama, setWakaKurikulumNama] = useState(resolvedSigners.kurikulumNama);
  const [wakaKurikulumNip, setWakaKurikulumNip] = useState(resolvedSigners.kurikulumNip);
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState(resolvedSigners.kepsekNama);
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState(resolvedSigners.kepsekNip);
  const [kotaTitimangsa, setKotaTitimangsa] = useState(resolvedSigners.kota);
  const [tanggalTitimangsa, setTanggalTitimangsa] = useState(defaultAcademicDate);

  useEffect(() => {
    setTanggalTitimangsa(defaultAcademicDate);
  }, [defaultAcademicDate]);

  useEffect(() => {
    if (resolvedSigners.kurikulumNama) setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    if (resolvedSigners.kurikulumNip) setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    if (resolvedSigners.kepsekNama) setKepalaSekolahNama(resolvedSigners.kepsekNama);
    if (resolvedSigners.kepsekNip) setKepalaSekolahNip(resolvedSigners.kepsekNip);
    if (resolvedSigners.kota) setKotaTitimangsa(resolvedSigners.kota);
  }, [resolvedSigners]);

  const handleResetSignersToStructure = () => {
    setWakaKurikulumNama(resolvedSigners.kurikulumNama);
    setWakaKurikulumNip(resolvedSigners.kurikulumNip);
    setKepalaSekolahNama(resolvedSigners.kepsekNama);
    setKepalaSekolahNip(resolvedSigners.kepsekNip);
    setKotaTitimangsa(resolvedSigners.kota);
    setTanggalTitimangsa(defaultAcademicDate);
    toast.success('Pengesah & titimangsa di-reset ke standar struktur organisasi');
  };

  const sheetsToRender = useMemo(() => {
    if (printAllJurusans && allJurusans.length > 1) {
      return allJurusans;
    }
    return [selectedJurusan || null];
  }, [printAllJurusans, allJurusans, selectedJurusan]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const jurusanSlug = printAllJurusans
        ? 'SEMUA_JURUSAN'
        : (
            selectedJurusan?.singkatan ||
            selectedJurusan?.kode ||
            selectedJurusan?.nama ||
            'UMUM'
          )
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_');
      const tahunSlug = (tahunPelajaranNama || 'TP').replace(/[^0-9]+/g, '_');
      await exportStrukturKurikulumPdf({
        fileName: `STRUKTUR_KURIKULUM_${jurusanSlug}_${tahunSlug}.pdf`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Struktur Kurikulum (KOSP)"
      subtitle={`Dokumen Resmi Struktur Kurikulum Standar Kemendikbudristek — TP ${tahunPelajaranNama}`}
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
          {allJurusans.length > 1 && (
            <button
              type="button"
              onClick={() => setPrintAllJurusans((prev) => !prev)}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1',
                printAllJurusans
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {printAllJurusans
                  ? `Semua Jurusan (${allJurusans.length} Lembar)`
                  : 'Jurusan Aktif (1 Lembar)'}
              </span>
            </button>
          )}

          {!isPublicMode && (
            <button
              type="button"
              onClick={() => setIsEditingSigners((prev) => !prev)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEditingSigners ? 'Tutup Pengesah' : 'Ubah Pengesah'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drawer Edit Pengesah (no-print) */}
        {isEditingSigners && !isPublicMode && (
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
                  onChange={(e) => setWakaKurikulumNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Wakasek"
                  value={wakaKurikulumNip}
                  onChange={(e) => setWakaKurikulumNip(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Kepala Sekolah:</label>
                <input
                  type="text"
                  value={kepalaSekolahNama}
                  onChange={(e) => setKepalaSekolahNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
                <input
                  type="text"
                  placeholder="NIP Kepala Sekolah"
                  value={kepalaSekolahNip}
                  onChange={(e) => setKepalaSekolahNip(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">
                  Titimangsa (Kota &amp; Tanggal):
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Kota (contoh: Purwakarta)"
                    value={kotaTitimangsa}
                    onChange={(e) => setKotaTitimangsa(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Tanggal Titimangsa"
                    value={tanggalTitimangsa}
                    onChange={(e) => setTanggalTitimangsa(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTanggalTitimangsa(defaultAcademicDate)}
                    className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Awal TP ({defaultAcademicDate})
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

        {/* Lembar Dokumen Fisik A4 */}
        <div className="flex flex-col items-center gap-8 w-full overflow-x-auto p-2">
          {sheetsToRender.map((jurusanItem, idx) => (
            <StrukturKurikulumDocumentSheet
              key={jurusanItem?.id || `sheet-${idx}`}
              mappingData={mappingData}
              selectedJurusan={jurusanItem}
              allJurusans={allJurusans}
              tahunPelajaranNama={tahunPelajaranNama}
              tahunPelajaranId={tahunPelajaranId}
              jenjang={jenjang}
              tenantInfo={effectiveTenantInfo}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
              wakaKurikulumNama={wakaKurikulumNama}
              wakaKurikulumNip={wakaKurikulumNip}
              kepalaSekolahNama={kepalaSekolahNama}
              kepalaSekolahNip={kepalaSekolahNip}
              kotaTitimangsa={kotaTitimangsa}
              tanggalTitimangsa={tanggalTitimangsa}
              pageNumber={idx + 1}
              totalPages={sheetsToRender.length}
            />
          ))}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};

export default StrukturKurikulumPrintModal;
