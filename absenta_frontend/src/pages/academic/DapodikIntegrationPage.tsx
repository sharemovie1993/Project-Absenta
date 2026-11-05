/**
 * DapodikIntegrationPage.tsx
 * Halaman Penuh Integrasi & Audit Dapodik (URL: /academic/dapodik)
 * Standar Industri: Shopee-Grade High-Density & 100% Compliant Hardening Standards.
 */

import React, { useMemo } from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui';
import { DapodikIntegrationView } from '@/components/academic/dapodik/DapodikIntegrationView';

export const DapodikIntegrationPage: React.FC = () => {
  const breadcrumbs = useMemo(
    () => [
      { label: 'Akademik', path: '/academic' },
      { label: 'Integrasi Dapodik', path: '/academic/dapodik' },
    ],
    []
  );

  return (
    <AcademicPageLayout
      title="Integrasi & Audit Dapodik"
      description="Pusat Kerja Mandiri Operator Dapodik: Audit, Komparasi & Pemutakhiran Data Siswa antara Platform Absenta dan Dapodik Lokal (Port 5774)"
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="academic_dapodik"
      instruction={{
        title: "Panduan Operator Dapodik",
        description: (
          <div className="space-y-2">
            <p>
              Modul ini memungkinkan Operator Dapodik &amp; TU Kepegawaian melakukan <strong>self-audit</strong> mandiri secara berkala
              untuk mendeteksi selisih data siswa antara sistem riil sekolah (Absenta) dan database Dapodik nasional.
            </p>
          </div>
        ),
        items: [
          { text: "Pastikan IP Server Absenta sudah didaftarkan pada menu Pengaturan > Web Service di Dapodik." },
          { text: "Lakukan Uji Koneksi untuk memastikan Token dan Port 5774 dapat diakses." },
          { text: "Buka Tab Audit & Komparasi Siswa untuk meninjau perbedaan data dan mengeksekusi sinkronisasi." },
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 p-0 border-0 shadow-none bg-transparent">
        <DapodikIntegrationView hideLayout={true} />
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default DapodikIntegrationPage;
