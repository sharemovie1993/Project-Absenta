import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, User, School, Loader2, FileText, Info } from 'lucide-react';
import { Button } from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { useKelasOptions, useGuruOptions, useTahunPelajaranOptions, useSemesterOptions } from '../../common';
import { useTenantSettings } from '../../../hooks/useTenantSettings';
import { useUnifiedScheduleData } from '../../../hooks/attendance/useUnifiedScheduleData';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { jenisKegiatanMasterApi } from '../../../api/academic/jenisKegiatanMaster.api';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { toast } from 'react-hot-toast';

interface Props {
  initialMode?: 'KELAS' | 'GURU';
  initialKelasId?: string;
  initialGuruId?: string;
}

export const JadwalBuiltInPdfPreview: React.FC<Props> = ({
  initialMode = 'KELAS',
  initialKelasId = '',
  initialGuruId = '',
}) => {
  const [mode, setMode] = useState<'KELAS' | 'GURU'>(initialMode);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(initialKelasId);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialGuruId);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // 1. Reference Data Hooks
  const { tenant } = useTenantSettings();
  const { options: kelasOptions, rawList: kelasRawList } = useKelasOptions();
  const { options: guruOptions, rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { activeTahunPelajaran } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions({ tahunPelajaranId: activeTahunPelajaran?.id });

  // 2. Single Source of Truth Unified Schedule Data
  const { allJadwal } = useUnifiedScheduleData({
    tahunPelajaranId: activeTahunPelajaran?.id,
    semesterId: activeSemester?.id,
    kelasId: mode === 'KELAS' ? selectedKelasId : undefined,
    guruId: mode === 'GURU' ? selectedGuruId : undefined,
  });

  // School Profile Query
  const { data: sekolahProfileRes } = useQuery({
    queryKey: ['sekolah-profile-pdf-preview'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  // Default Auto-Select if empty
  useEffect(() => {
    if (!selectedKelasId && kelasRawList && kelasRawList.length > 0) {
      setSelectedKelasId(kelasRawList[0].id);
    }
    if (!selectedGuruId && guruRawList && guruRawList.length > 0) {
      setSelectedGuruId(guruRawList[0].id);
    }
  }, [kelasRawList, guruRawList, selectedKelasId, selectedGuruId]);

  // Clean up blob url on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Stable primitive key for triggering PDF generation (prevents array reference churn flickering)
  const pdfTriggerKey = useMemo(() => {
    return `${mode}-${selectedKelasId}-${selectedGuruId}-${activeTahunPelajaran?.id}-${activeSemester?.id}-${allJadwal.length}-${kelasRawList.length}-${guruRawList.length}`;
  }, [mode, selectedKelasId, selectedGuruId, activeTahunPelajaran?.id, activeSemester?.id, allJadwal.length, kelasRawList.length, guruRawList.length]);

  // Debounced smooth PDF Generation
  useEffect(() => {
    if (!activeTahunPelajaran?.id || !activeSemester?.id) return;
    if (mode === 'KELAS' && !selectedKelasId) return;
    if (mode === 'GURU' && !selectedGuruId) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsGeneratingPdf(true);

        const jenisRes = await jenisKegiatanMasterApi.getAll().catch(() => ({ data: [] }));
        if (isCancelled) return;

        const blob = await generateGenericPdf({
          module: 'kurikulum',
          printType: mode === 'KELAS' ? 'roster' : 'roster_teacher',
          selectedClassId: selectedKelasId || 'all',
          selectedGuruId: selectedGuruId || 'all',
          sekolah: sekolahProfileRes || null,
          tenantInfo: tenant || null,
          strukturList: [],
          logoDaerahBase64: null,
          logoSekolahBase64: null,
          includeSchoolLogo: true,
          filterData: {
            jadwalList: allJadwal,
            jenisKegiatanList: jenisRes.data || [],
            classes: kelasRawList || [],
            gurus: guruRawList || [],
          },
        });

        if (isCancelled) return;

        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(prevUrl => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return blobUrl;
        });
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to generate PDF preview:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsGeneratingPdf(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pdfTriggerKey]);

  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    const printWindow = window.open(pdfBlobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const targetKelas = kelasRawList?.find((k: any) => k.id === selectedKelasId);
    const targetGuru = guruRawList?.find((g: any) => g.id === selectedGuruId);
    const name = mode === 'KELAS' 
      ? `Jadwal KBM Kelas ${targetKelas?.nama_kelas || selectedKelasId || 'Seluruh Kelas'}.pdf` 
      : `Jadwal Mengajar Guru ${targetGuru?.nama_guru || selectedGuruId || 'Seluruh Guru'}.pdf`;

    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Left Control Panel */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Pengaturan Cetak PDF</h3>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Dokumen:</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('KELAS')}
                className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'KELAS'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <School size={13} />
                <span>Per Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('GURU')}
                className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'GURU'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={13} />
                <span>Per Guru</span>
              </button>
            </div>
          </div>

          {/* Target Selector */}
          {mode === 'KELAS' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Kelas Sasaran:</label>
              <SearchableSelect
                value={selectedKelasId}
                onValueChange={setSelectedKelasId}
                options={kelasOptions}
                placeholder="Pilih Kelas..."
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Guru Sasaran:</label>
              <SearchableSelect
                value={selectedGuruId}
                onValueChange={setSelectedGuruId}
                options={guruOptions}
                placeholder="Pilih Guru..."
                className="w-full"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Button
              onClick={handlePrint}
              disabled={!pdfBlobUrl || isGeneratingPdf}
              className="w-full justify-center flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-xl shadow-md"
            >
              <Printer size={14} />
              <span>Cetak / Print</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!pdfBlobUrl || isGeneratingPdf}
              className="w-full justify-center flex items-center gap-2 font-bold text-xs py-2 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <Download size={14} />
              <span>Unduh File PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Right Area: Built-in PDF Viewer */}
      <div className="lg:col-span-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                Pratinjau Dokumen PDF (Built-in Viewer)
              </h3>
            </div>
            {isGeneratingPdf && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses PDF...</span>
              </div>
            )}
          </div>

          <div className="relative bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[720px] flex items-center justify-center">
            {isGeneratingPdf && (
              <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Me-render PDF Resmi Absenta...</span>
              </div>
            )}

            {pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#toolbar=1&navpanes=0&pagemode=none`}
                title="Built-in PDF Preview"
                className="w-full h-full border-none"
              />
            ) : (
              <div className="text-center p-6 space-y-2 max-w-sm">
                <Info className="w-10 h-10 mx-auto text-slate-400" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Tidak Ada Dokumen</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Silakan pilih kelas atau guru untuk membuat pratinjau dokumen PDF secara otomatis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
