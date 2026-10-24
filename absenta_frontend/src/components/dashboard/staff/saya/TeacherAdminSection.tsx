import React, { useMemo } from 'react';
import { FileText, CreditCard, FolderArchive, Shield } from 'lucide-react';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';

interface TeacherAdminSectionProps {
  onOpenAjukanIzin: () => void;
  onOpenIdCard: () => void;
  onOpenDocuments: () => void;
  onOpenSecurity: () => void;
  className?: string;
}

export const TeacherAdminSection: React.FC<TeacherAdminSectionProps> = React.memo(({
  onOpenAjukanIzin,
  onOpenIdCard,
  onOpenDocuments,
  onOpenSecurity,
  className,
}) => {
  const cells: HubBentoCell[] = useMemo(() => [
    {
      id: 'admin-izin',
      title: 'Ajukan Cuti / Izin',
      value: '',
      subtext: 'Dinas, Sakit & Cuti Mandiri',
      icon: FileText,
      iconColorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
      showChevron: true,
      onClick: onOpenAjukanIzin,
    },
    {
      id: 'admin-idcard',
      title: 'Kartu ID Digital',
      value: '',
      subtext: 'Barcode, QR & ID RFID',
      icon: CreditCard,
      iconColorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
      showChevron: true,
      onClick: onOpenIdCard,
    },
    {
      id: 'admin-docs',
      title: 'Berkas Dokumen & SK',
      value: '',
      subtext: 'Arsip Sertifikasi & Ijazah',
      icon: FolderArchive,
      iconColorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
      showChevron: true,
      onClick: onOpenDocuments,
    },
    {
      id: 'admin-security',
      title: 'Keamanan Akun',
      value: '',
      subtext: 'Ganti Kata Sandi & Akses',
      icon: Shield,
      iconColorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50',
      showChevron: true,
      onClick: onOpenSecurity,
    },
  ], [onOpenAjukanIzin, onOpenIdCard, onOpenDocuments, onOpenSecurity]);

  return (
    <HubCard
      title="Administrasi & Dokumen Pegawai"
      className={className}
      noPadding
    >
      <HubBentoGrid cells={cells} columns={2} />
    </HubCard>
  );
});

TeacherAdminSection.displayName = 'TeacherAdminSection';
