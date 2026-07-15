
/**
 * @deprecated Halaman ini sudah digabungkan ke JadwalTemplatePage.
 * Gunakan /attendance/jadwal-template sebagai entry point utama.
 * File ini dipertahankan untuk kompatibilitas routing lama dan langsung
 * melakukan redirect ke halaman baru.
 */
import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';
import { Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const JadwalPelajaranPage: React.FC = () => {
  const navigate = useNavigate();


  // Redirect otomatis ke halaman baru setelah 1.5 detik
  const handleManualRedirect = useCallback(() => {
    navigate('/attendance/jadwal-template', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      toast('Halaman Jadwal Pelajaran telah dipindahkan. Anda diarahkan ke halaman baru.', { icon: 'ℹ️' });
      navigate('/attendance/jadwal-template', { replace: true });
    }, 1500);

    // Cleanup timer saat unmount (Pillar 5 – Memory Leak Prevention)
    return () => clearTimeout(timer);
  }, [navigate]);

  const redirectStats = useMemo(() => [
    {
      title: 'Mengalihkan...',
      value: 'Jadwal Pelajaran',
      icon: <Clock size={14} />,
      gradient: 'from-slate-500 to-slate-700',
      subtitle: 'Halaman baru tersedia'
    }
  ], []);

  return (
    <AcademicPageLayout
      title="Jadwal Pelajaran"
      description="Halaman ini telah dipindahkan. Anda akan diarahkan secara otomatis ke Jadwal Template."
      stats={redirectStats}
      hardeningModuleKey="jadwalpelajaranpage"
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Jadwal Pelajaran' }
      ]}
      instruction={{
        title: 'Halaman Dipindahkan',
        description: 'Fitur Jadwal Pelajaran telah diintegrasikan ke dalam modul Jadwal Template yang lebih lengkap.',
        items: [
          { text: 'Anda akan diarahkan otomatis dalam 1-2 detik.' },
          { text: 'Atau klik tombol di bawah untuk langsung menuju halaman baru.' }
        ]
      }}
    >
      <div className="p-6 lg:p-8">
        <SectionCard>
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-black italic tracking-tight">Halaman Dipindahkan</h3>
            <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
              Jadwal Pelajaran sekarang tersedia di halaman <strong>Jadwal Template</strong> yang lebih lengkap.
              Anda akan diarahkan secara otomatis...
            </p>
            <button
              onClick={handleManualRedirect}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Pergi Sekarang →
            </button>
          </div>
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
};

export default JadwalPelajaranPage;
