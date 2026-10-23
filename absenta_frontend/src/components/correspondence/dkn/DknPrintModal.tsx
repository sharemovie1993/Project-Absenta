import React from 'react';
import { UniversalDocumentModal, usePrintHeaderData } from '@/components/ui/PrintHeader';
import type { DknMatriksData } from '@/api/correspondence/dkn.api';
import { DknSheet } from './DknSheet';
import { Loader2 } from 'lucide-react';

interface DknPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: DknMatriksData;
  isLoading?: boolean;
  tahunPelajaran?: string;
}

export const DknPrintModal: React.FC<DknPrintModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
  tahunPelajaran,
}) => {
  const { tenantInfo } = usePrintHeaderData();

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Daftar Kolektif Nilai (DKN) Kelulusan"
      subtitle="Dokumen resmi multi-kolom arsip Dinas Pendidikan & dasar ijazah"
      allowLogoToggles={true}
      orientation="landscape"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Menyusun matriks DKN kelulusan...</p>
          </div>
        ) : data ? (
          <DknSheet data={data} tahunPelajaran={tahunPelajaran} tenantInfo={tenantInfo} />
        ) : (
          <div className="py-16 text-center text-slate-500">
            Data matriks DKN tidak tersedia untuk dicetak.
          </div>
        )}
      </div>
    </UniversalDocumentModal>
  );
};
