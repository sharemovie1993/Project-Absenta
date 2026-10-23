import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  bastIjazahApi,
  bastIjazahQueryKeys,
  type BukuEkspedisiResponse,
} from '@/api/correspondence/bastIjazah.api';
import { BukuEkspedisiSheet } from './BukuEkspedisiSheet';

interface BukuEkspedisiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId?: string;
  tahunPelajaran?: string;
}

export const BukuEkspedisiPrintModal: React.FC<BukuEkspedisiPrintModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranId,
  tahunPelajaran,
}) => {
  const { tenantInfo } = usePrintHeaderData();

  const { data: response, isLoading } = useQuery({
    queryKey: bastIjazahQueryKeys.bukuEkspedisi({ tahunPelajaranId }),
    queryFn: () =>
      bastIjazahApi.getBukuEkspedisi({
        tahun_pelajaran_id: tahunPelajaranId,
      }),
    enabled: isOpen,
  });

  const ekspedisiData: BukuEkspedisiResponse | undefined = response?.data;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Buku Register Ekspedisi Penyerahan Ijazah"
      subtitle="Buku kendali akreditasi BAN-PDM & status brankas ijazah sekolah"
      allowLogoToggles={true}
      orientation="landscape"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        {isLoading ? (
          <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-bold">Menyiapkan lembar register ekspedisi ijazah...</p>
          </div>
        ) : ekspedisiData ? (
          <BukuEkspedisiSheet
            data={ekspedisiData}
            tahunPelajaran={tahunPelajaran}
            tenantInfo={tenantInfo}
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
            Gagal memuat data buku ekspedisi ijazah
          </div>
        )}
      </div>
    </UniversalDocumentModal>
  );
};
