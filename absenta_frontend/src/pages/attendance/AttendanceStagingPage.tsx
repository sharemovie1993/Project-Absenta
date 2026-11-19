import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { AttendanceStagingView } from '@/components/attendance/staging/AttendanceStagingView';

export default React.memo(function AttendanceStagingPage() {
  return (
    <AcademicPageLayout
      title="Wadah Penampung Presensi (Attendance Staging Hub)"
      subtitle="Hubungkan dan sinkronkan tautan Google Spreadsheet presensi mingguan multi-sheet ke agenda resmi"
      hardeningModuleKey="attendance-staging"
      instruction={{
        title: 'Panduan Wadah Penampung Google Spreadsheet Presensi',
        items: [
          'Salin dan tempel tautan berkas Google Spreadsheet mingguan (format multi-sheet per rombel).',
          'Pastikan akses spreadsheet telah disetel ke "Siapa saja yang memiliki link dapat melihat (Viewer)".',
          'Sistem otomatis mengekstrak seluruh tab sheet rombel (TE, TM, TKR, TSM, TJKT, AKL, dll.) dan memvalidasi kecocokan NIS/NISN siswa.',
          'Smart Dispatcher memetakan otomatis: Senin Pagi (UPACARA), Selasa-Kamis & Sabtu Pagi (KETARUNAAN), Jum\'at Pagi (DUHA), dan Sore (APEL PULANG).',
          'Gunakan tombol "Pratinjau" untuk memeriksa matriks sesi presensi sebelum melakukan 1-Click Sync atau Bulk Sync.',
        ],
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 shadow-2xs p-0 border-0 bg-transparent">
        <AttendanceStagingView />
      </SectionCard>
    </AcademicPageLayout>
  );
});
