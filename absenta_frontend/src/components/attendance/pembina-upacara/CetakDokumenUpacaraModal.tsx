import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Printer, Download, Loader2, FileText, CheckCircle, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getTenantById } from '@/api/tenants.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { useAuthStore } from '@/store/authStore';
import { getBase64ImageFromUrl } from '@/utils/cooperative/coopDocUtils';
import { generateGenericPdf } from '@/utils/print/pdfGeneric';
import { pembinaUpacaraApi, type JadwalPembinaUpacaraItem } from '@/api/attendance/pembinaUpacara.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunAjaranNama?: string;
  semesterNama?: string;
  schedules?: JadwalPembinaUpacaraItem[];
}

export const CetakDokumenUpacaraModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  tahunPelajaranId,
  semesterId,
  tahunAjaranNama,
  semesterNama,
  schedules: initialSchedules,
}) => {
  const { user } = useAuthStore();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [includeSchoolLogo, setIncludeSchoolLogo] = useState<boolean>(true);

  // 1. Fetch fresh schedules strictly based on selected Academic Context
  const { data: fetchedSchedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['pembina-upacara-pdf-context', tahunPelajaranId, semesterId],
    queryFn: async () => {
      const res = await pembinaUpacaraApi.getAll({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
      return res?.data || [];
    },
    enabled: isOpen && !!tahunPelajaranId,
    staleTime: 30 * 1000,
  });

  const activeSchedules = fetchedSchedules ?? initialSchedules ?? [];

  // 2. Load School & Tenant Profiles for official Kop Surat
  const { data: sekolahData } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });
  const sekolah = sekolahData || null;

  const { data: tenantData } = useQuery({
    queryKey: ['tenant-info', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const res = await getTenantById(user.tenant_id).catch(() => null);
      return res?.success ? res.data : null;
    },
    enabled: !!user?.tenant_id && isOpen,
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantData || null;

  const { data: strukturData } = useQuery({
    queryKey: ['struktur-organisasi-active'],
    queryFn: async () => {
      const res = await getStrukturList({ is_active: true }).catch(() => null);
      return (res?.success && res.data) ? res.data : [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });
  const strukturList = strukturData || [];

  // 3. Generate PDF Document via print engine
  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfBlob(null);
      return;
    }

    if (isLoadingSchedules) return;

    let isMounted = true;
    const generatePdf = async () => {
      setIsGenerating(true);
      try {
        // Resolve Logos
        const leftLogo = tenantInfo?.logo_daerah_url || (sekolah as any)?.logo_daerah_url;
        const rightLogo = tenantInfo?.logo_url || sekolah?.logo_url;

        const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
          leftLogo ? getBase64ImageFromUrl(leftLogo).catch(() => null) : Promise.resolve(null),
          rightLogo ? getBase64ImageFromUrl(rightLogo).catch(() => null) : Promise.resolve(null),
        ]);

        const blob = await generateGenericPdf({
          module: 'kesiswaan',
          printType: 'jadwal_pembina_upacara',
          selectedClassId: 'all',
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          checklistData: {
            current_year: { tahun: tahunAjaranNama || '' },
            current_semester: { nama_semester: semesterNama || '' },
          },
          filterData: {
            schedules: activeSchedules,
            tahunAjaranNama,
            semesterNama,
          },
        });

        if (isMounted) {
          setPdfBlob(blob);
          const newUrl = URL.createObjectURL(blob);
          setPdfUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return newUrl;
          });
        }
      } catch (err) {
        console.error('Gagal men-generate dokumen resmi upacara:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generatePdf();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    isLoadingSchedules,
    activeSchedules,
    tahunAjaranNama,
    semesterNama,
    sekolah,
    tenantInfo,
    strukturList,
    includeSchoolLogo
  ]);

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      const cleanTp = (tahunAjaranNama || 'TA').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanSem = (semesterNama || 'Sem').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Jadwal_Pembina_Upacara_${cleanTp}_${cleanSem}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Dokumen Resmi Jadwal Pembina Upacara"
      size="full"
      className="max-w-[96vw] max-h-[96vh] h-[95vh] flex flex-col"
      contentClassName="p-3 sm:p-5 flex-1 flex flex-col overflow-y-auto max-h-[calc(95vh-80px)] space-y-3 sm:space-y-4"
    >
      <div className="flex-1 flex flex-col space-y-3 sm:space-y-4 min-h-0">
        {/* Banner Konteks Akademik Aktif */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Konteks Akademik: {tahunAjaranNama || '-'} {semesterNama ? `(${semesterNama})` : ''}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Engine cetak otomatis mengambil data jadwal resmi yang terdaftar pada semester ini.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
            {isLoadingSchedules ? 'Memuat data...' : `${activeSchedules.length} Sesi Terjadwal`}
          </span>
        </div>

        {/* Header Controls & Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-school-logo-modal"
              checked={includeSchoolLogo}
              onChange={(e) => setIncludeSchoolLogo(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
            />
            <label
              htmlFor="include-school-logo-modal"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer"
            >
              Sertakan Logo Sekolah (Kanan Kop Surat)
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl || isGenerating || isLoadingSchedules}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg"
            >
              <Download size={14} />
              Unduh PDF
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              disabled={!pdfUrl || isGenerating || isLoadingSchedules}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg shadow-sm"
            >
              <Printer size={14} />
              Cetak Fisik Sekarang
            </Button>
          </div>
        </div>

        {/* Live PDF Viewer Frame */}
        <div className="relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-1 min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex items-center justify-center">
          {(isGenerating || isLoadingSchedules) && (
            <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isLoadingSchedules
                  ? 'Mengambil data jadwal upacara berdasarkan konteks akademik terpilih...'
                  : 'Me-render dokumen resmi dengan Kop Surat & Tanda Tangan...'}
              </span>
            </div>
          )}

          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&pagemode=none`}
              title="Pratinjau Dokumen Resmi Upacara"
              className="w-full h-full border-none"
            />
          ) : (
            <div className="text-center p-6 space-y-2 max-w-sm">
              <FileText className="w-10 h-10 mx-auto text-slate-400" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Menyiapkan Pratinjau
              </h4>
              <p className="text-xs text-slate-500">
                Dokumen resmi berformat Kop Surat sedang disiapkan.
              </p>
            </div>
          )}
        </div>

        {/* Info & Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 shrink-0">
          <p className="text-[11px] sm:text-xs">
            Dokumen resmi ini ditandatangani oleh Kepala Sekolah dan siap diarsipkan atau dibagikan ke dewan guru.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg shrink-0">
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});

CetakDokumenUpacaraModal.displayName = 'CetakDokumenUpacaraModal';
