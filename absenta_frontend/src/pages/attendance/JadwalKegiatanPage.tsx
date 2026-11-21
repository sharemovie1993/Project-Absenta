import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { JadwalKegiatanView } from '@/components/attendance/kegiatan/JadwalKegiatanView';

export default React.memo(function JadwalKegiatanPage() {
  const breadcrumbs = [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Jadwal Kegiatan & Eskul' },
  ];

  return (
    <AcademicPageLayout
      title="Jadwal Kegiatan & Eskul"
      description="Kelola jadwal jam pelaksanaan kegiatan rutin pembiasaan dan ekstrakurikuler sekolah."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      instruction={{
        title: "Panduan Jadwal Kegiatan & Matrix Jam",
        description: "Kelola jadwal jam pelaksanaan kegiatan rutin pembiasaan dan ekstrakurikuler sekolah.",
        items: [
          { text: "Atur waktu mulai dan selesai untuk masing-masing kegiatan pembiasaan/eskul." },
          { text: "Gunakan Mode Matrix untuk menentukan jam yang berbeda di hari tertentu (misal: Sabtu 06:30 - 12:00)." },
          { text: "Gunakan toggle status untuk mengaktifkan atau menonaktifkan jadwal." },
          { text: "Klik Anggota & Pembina Eskul untuk memetakan siswa dan pembina ke kegiatan." },
          { text: "Klik Jadwal Pembina Upacara untuk menyusun rotasi giliran pembina upacara Senin." },
        ],
      }}
    >
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Kegiatan Rutin"
        moduleName="KESISWAAN"
        description="Kelola jadwal kegiatan rutin pembiasaan dan eskul sekolah."
      >
        <JadwalKegiatanView hideLayout={false} />
      </PremiumFeatureGate>
    </AcademicPageLayout>
  );
});
