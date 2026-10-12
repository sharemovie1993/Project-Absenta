import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Printer, Download, Loader2, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getTenantById } from '@/api/tenants.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { useAuthStore } from '@/store/authStore';
import { getBase64ImageFromUrl } from '@/utils/cooperative/coopDocUtils';
import { generateGenericPdf } from '@/utils/print/pdfGeneric';
import type { JadwalPembinaUpacaraItem } from '@/api/attendance/pembinaUpacara.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedules: JadwalPembinaUpacaraItem[];
  tahunAjaranNama?: string;
  semesterNama?: string;
}

export const CetakDokumenUpacaraModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  schedules,
  tahunAjaranNama,
  semesterNama,
}) => {
  const { user } = useAuthStore();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [includeSchoolLogo, setIncludeSchoolLogo] = useState<boolean>(true);

  // Load School & Tenant Profiles
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

  // Generate PDF Document
  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfBlob(null);
      return;
    }

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
            schedules,
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
  }, [isOpen, schedules, tahunAjaranNama, semesterNama, sekolah, tenantInfo, strukturList, includeSchoolLogo]);

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
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Header Controls & Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl || isGenerating}
              className="flex items-center gap-1.5 text-xs font-bold rounded-lg"
            >
              <Download size={14} />
              Unduh PDF
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              disabled={!pdfUrl || isGenerating}
              className="flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-sm"
            >
              <Printer size={14} />
              Cetak Fisik Sekarang
            </Button>
          </div>
        </div>

        {/* Live PDF Viewer Frame */}
        <div className="relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[560px] flex items-center justify-center">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Memproses format resmi & kop surat dokumen...
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
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <p>
            Total <strong>{schedules.length}</strong> sesi upacara siap diterbitkan untuk arsip Kesiswaan & dibagikan ke dewan guru.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});

CetakDokumenUpacaraModal.displayName = 'CetakDokumenUpacaraModal';
