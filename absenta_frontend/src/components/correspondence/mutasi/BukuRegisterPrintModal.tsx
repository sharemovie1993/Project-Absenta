import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  mutasiApi,
  mutasiQueryKeys,
  type BukuRegisterResponse,
} from '@/api/correspondence/mutasi.api';
import { BukuRegisterMutasiSheet } from './BukuRegisterMutasiSheet';

interface BukuRegisterPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaran?: string;
  semester?: string;
  tipe?: 'ALL' | 'MASUK' | 'KELUAR';
}

export const BukuRegisterPrintModal: React.FC<BukuRegisterPrintModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranId,
  semesterId,
  tahunPelajaran,
  semester,
  tipe = 'ALL',
}) => {
  const { tenantInfo } = usePrintHeaderData();

  const { data: response, isLoading } = useQuery({
    queryKey: mutasiQueryKeys.bukuRegister({ tahunPelajaranId, semesterId, tipe }),
    queryFn: () =>
      mutasiApi.getBukuRegister({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        tipe,
      }),
    enabled: isOpen,
  });

  const registerData: BukuRegisterResponse | undefined = response?.data;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Buku Register Mutasi Peserta Didik"
      subtitle="Buku kendali mutasi masuk dan keluar resmi akreditasi sekolah"
      allowLogoToggles={true}
      orientation="landscape"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        {isLoading ? (
          <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-bold">Menyiapkan lembar register mutasi akreditasi...</p>
          </div>
        ) : registerData ? (
          <BukuRegisterMutasiSheet
            data={registerData}
            tahunPelajaran={tahunPelajaran}
            semester={semester}
            tenantInfo={tenantInfo}
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
            Gagal memuat data buku register mutasi
          </div>
        )}
      </div>
    </UniversalDocumentModal>
  );
};
