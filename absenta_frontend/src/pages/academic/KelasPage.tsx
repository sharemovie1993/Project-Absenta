import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useCapabilities } from '../../hooks/useCapabilities';
import { KelasView, type UniversalKelasViewProps } from '../../components/academic/kelas/KelasView';

export const KelasPage: React.FC<UniversalKelasViewProps> = React.memo((props) => {
  const [searchParams] = useSearchParams();
  const guruIdFromUrl = searchParams.get('guru_id') || '';
  const { isKurikulum, isHomeroomTeacher, isTeacher, isAdmin, isKaprog, can } = useCapabilities();
  const canView = isAdmin || isKurikulum || isHomeroomTeacher || isTeacher || isKaprog || can('academic.structures.view.list');

  return (
    <AcademicPageLayout
      title="Data Kelas"
      description="Kelola data kelas-kelas belajar siswa. Digunakan setiap akhir tahun ajaran saat bersiap membagi kelas baru."
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Kelas', path: '/academic/kelas' }
      ]}
      instruction={{
        title: "Panduan Kelas",
        description: (
          <div className="space-y-2">
            <p>Daftar kelas belajar siswa. Kelas ini nantinya akan dihubungkan dengan wali kelas dan siswa pada tahun ajaran yang aktif.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur kelas belajar siswa.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap akhir tahun ajaran menjelang kenaikan kelas.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Hubungkan kelas dengan Jurusan dan Wali Kelas." },
          { text: "Gunakan fitur Impor untuk migrasi data massal." },
          { text: "Satu kelas bisa memiliki banyak siswa yang terdaftar aktif." }
        ]
      }}
      canView={canView}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data kelas."
      hardeningModuleKey="academic_kelas"
    >
      <KelasView {...props} guruId={props.guruId || guruIdFromUrl} isModal={false} hideHeaderStats={false} />
    </AcademicPageLayout>
  );
});

KelasPage.displayName = 'KelasPage';
export default KelasPage;

// Re-export View and types for backward compatibility
export { KelasView };
export type { UniversalKelasViewProps };
