import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  bukuIndukApi,
  bukuIndukQueryKeys,
} from '@/api/academic/buku-induk.api';
import { BukuIndukSheet1 } from './BukuIndukSheet1';
import { BukuIndukSheet2 } from './BukuIndukSheet2';
import { BukuIndukSheet3 } from './BukuIndukSheet3';
import { BukuIndukSheet4 } from './BukuIndukSheet4';

interface BukuIndukPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
}

export const BukuIndukPrintModal: React.FC<BukuIndukPrintModalProps> = ({
  isOpen,
  onClose,
  siswaId,
}) => {
  const { tenantInfo } = usePrintHeaderData();

  const { data, isLoading } = useQuery({
    queryKey: bukuIndukQueryKeys.detail(siswaId),
    queryFn: () => bukuIndukApi.getDetail(siswaId),
    enabled: isOpen && Boolean(siswaId),
  });

  const siswa = data?.data;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Buku Induk Siswa${siswa ? ` — ${siswa.nama_siswa}` : ''}`}
      subtitle={siswa ? `NIS: ${siswa.nis} | NISN: ${siswa.nisn || '-'}` : undefined}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-sm text-slate-500">Memuat data buku induk...</span>
          </div>
        ) : siswa ? (
          <>
            {/* Sheet 1: Identitas Pribadi & Orang Tua/Wali */}
            <PrintDocumentSheet pageNumber={1} totalPages={4} footerText="Buku Induk Siswa">
              <PrintHeader documentTitle="BUKU INDUK PESERTA DIDIK" tenantInfo={tenantInfo} />
              <BukuIndukSheet1 siswa={siswa} />
            </PrintDocumentSheet>

            {/* Sheet 2: Riwayat Pendidikan & Prestasi */}
            <PrintDocumentSheet pageNumber={2} totalPages={4} footerText="Buku Induk Siswa">
              <PrintHeader documentTitle="BUKU INDUK PESERTA DIDIK" tenantInfo={tenantInfo} />
              <BukuIndukSheet2 siswa={siswa} />
            </PrintDocumentSheet>

            {/* Sheet 3: Nilai Semester 1-3, P5, Eskul */}
            <PrintDocumentSheet pageNumber={3} totalPages={4} footerText="Buku Induk Siswa">
              <PrintHeader documentTitle="BUKU INDUK PESERTA DIDIK" tenantInfo={tenantInfo} />
              <BukuIndukSheet3 siswa={siswa} />
            </PrintDocumentSheet>

            {/* Sheet 4: Nilai Semester 4-6, PKL, UKK, Kelulusan, Tracer */}
            <PrintDocumentSheet pageNumber={4} totalPages={4} footerText="Buku Induk Siswa">
              <PrintHeader documentTitle="BUKU INDUK PESERTA DIDIK" tenantInfo={tenantInfo} />
              <BukuIndukSheet4 siswa={siswa} tenantInfo={tenantInfo} />
            </PrintDocumentSheet>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            Data siswa tidak ditemukan
          </div>
        )}
      </div>
    </UniversalDocumentModal>
  );
};
