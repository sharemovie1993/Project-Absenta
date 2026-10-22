import React, { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';
import { SiswaView, type UniversalSiswaViewProps } from '../../components/academic/siswa/SiswaView';

export { SiswaView, type UniversalSiswaViewProps };

export const SiswaPage: React.FC<UniversalSiswaViewProps> = React.memo((props) => {
  const [searchParams] = useSearchParams();
  const urlContext = searchParams.get('context') || searchParams.get('tab') || searchParams.get('mode');
  const isWaliKelasContext = urlContext === 'walikelas';
  const canView = true;

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Akademik', path: '/academic' },
    { label: isWaliKelasContext ? 'Kelas Saya' : 'Data Siswa', path: '/academic/siswa' }
  ], [isWaliKelasContext]);

  const instruction = useMemo(() => ({
    title: "Panduan Siswa",
    description: (
      <div className="space-y-2">
        <p>Tempat penyimpanan data diri utama siswa secara lengkap. Data di sini wajib diisi sebelum siswa dimasukkan ke dalam kelas.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Mengatur biodata utama siswa.</p>
          <p><strong>Waktu Penggunaan:</strong> Saat penerimaan siswa baru atau pemutakhiran biodata berkala.</p>
        </div>
      </div>
    ),
    items: [
      { text: "Tambahkan data siswa baru melalui tombol Tambah Siswa." },
      { text: "Lakukan aktivasi akademik berkala di menu Pembagian Kelas." },
      { text: "Kelola akun login (LMS) siswa melalui tombol Detail/Edit." }
    ]
  }), []);

  const handleRefresh = useCallback(() => {}, []);

  return (
    <AcademicPageLayout
      title={isWaliKelasContext ? "Siswa Kelas Saya" : "Master Data Siswa Sekolah"}
      description={isWaliKelasContext 
        ? "Direktori & pemantauan khusus data siswa rombel binaan Anda." 
        : "Pusat pengelolaan & pemantauan biodata lengkap siswa seluruh sekolah."}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      canView={canView}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data siswa."
      hardeningModuleKey="academic_siswa"
    >
      <SectionCard fullWidth noPadding className="w-full max-w-full min-w-0">
        <SiswaView {...props} hideLayout={true} isModal={false} />
      </SectionCard>
    </AcademicPageLayout>
  );
});

SiswaPage.displayName = 'SiswaPage';
export default SiswaPage;
