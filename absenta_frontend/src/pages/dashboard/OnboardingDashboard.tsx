import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Loader } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/lib/axiosInstance';
import { guruApi, siswaApi, kelasApi, mapelApi, tahunPelajaranApi, semesterApi } from '@/api/academic.api';
import { getJurusanList } from '@/api/academic/jurusan.api';
import { getAcademicStats } from '@/api/academic-stats.api';
import { getSesiAbsensiList, getAttendanceFeed, getGerbangStats } from '@/api/attendanceGerbang.api';
import { jenisKegiatanMasterApi } from '@/api/academic/jenisKegiatanMaster.api';
import { CheckCircle } from 'lucide-react';

export default function OnboardingDashboard({ mode = 'page', onClose }: { mode?: 'page' | 'modal'; onClose?: () => void }) {
  const navigate = useNavigate();
  const { user, subscription, tenantMode, markOnboardingCompleted, isLoading: isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  const tenantName = user?.full_name ? user.full_name : user?.email || '';
  const isTrial = subscription?.status === 'TRIAL';
  const planName = isTrial ? 'Free Trial' : (subscription?.Plan?.name || subscription?.plan?.name || '');

  const [checks, setChecks] = useState({
    profileCompleted: false,
    hasGuru: false,
    hasSiswa: false,
    hasKelas: false,
    hasTahunPelajaran: false,
    hasSemester: false,
    hasJurusan: false,
    hasMapel: false,
    hasWaliKelas: false,
    hasSesi: false,
    hasAttendance: false,
    hasJenisKegiatan: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [tenantInfoRes, statsRes, guruRes, siswaRes, kelasRes, tahunRes, semesterRes, jurusanRes, mapelRes, waliRes, sesiRes, feedRes, gerbangRes, jenisRes] = await Promise.allSettled([
          axiosInstance.get('/auth/tenant-info'),
          getAcademicStats(),
          guruApi.getAll({ limit: 1 }),
          siswaApi.getAll({ limit: 1 }),
          kelasApi.getAll({ limit: 1 }),
          tahunPelajaranApi.getAll({ limit: 1 }),
          semesterApi.getAll({ limit: 1 }),
          getJurusanList(1, 1),
          mapelApi.getAll({ limit: 1 }),
          getWaliKelasListSafe(),
          tenantMode !== 'SIMPLE' ? getSesiAbsensiList({ tanggal: today }) : Promise.resolve({ success: true, data: [] } as any),
          getAttendanceFeed({ tanggal: today }),
          getGerbangStats(),
          jenisKegiatanMasterApi.getAll({ limit: 1 }),
        ]);

        const profileCompleted = tenantInfoRes.status === 'fulfilled' && !!tenantInfoRes.value.data?.data?.logo_url;
        const hasGuru = guruRes.status === 'fulfilled' && ((guruRes.value.data?.length || guruRes.value.pagination?.total || 0) > 0);
        const hasSiswa = siswaRes.status === 'fulfilled' && ((siswaRes.value.data?.length || siswaRes.value.pagination?.total || 0) > 0);
        const hasKelas = kelasRes.status === 'fulfilled' && ((kelasRes.value.data?.length || kelasRes.value.pagination?.total || 0) > 0);
        const hasTahunPelajaran = tahunRes.status === 'fulfilled' && ((tahunRes.value.data?.length || tahunRes.value.pagination?.total || 0) > 0);
        const hasSemester = semesterRes.status === 'fulfilled' && ((semesterRes.value.data?.length || semesterRes.value.pagination?.total || 0) > 0);
        const hasJurusan = jurusanRes.status === 'fulfilled' && ((jurusanRes.value.data?.length || jurusanRes.value.pagination?.total || 0) > 0);
        const hasMapel = mapelRes.status === 'fulfilled' && ((mapelRes.value.data?.length || mapelRes.value.pagination?.total || 0) > 0);
        const hasWaliKelas = waliRes.status === 'fulfilled' && ((waliRes.value.data?.length || waliRes.value.pagination?.total || 0) > 0);
        const hasSesiList = sesiRes.status === 'fulfilled' && Array.isArray(sesiRes.value.data) && sesiRes.value.data.length > 0;
        const hasFeed = feedRes.status === 'fulfilled' && Array.isArray(feedRes.value.data) && feedRes.value.data.length > 0;
        const hasTaps = gerbangRes.status === 'fulfilled' && Number(gerbangRes.value.data?.total_taps_today || 0) > 0;
        const hasJenisKegiatan = jenisRes.status === 'fulfilled' && ((jenisRes.value.data?.length || jenisRes.value.pagination?.total || 0) > 0);

        if (!mounted) return;
        setChecks({
          profileCompleted,
          hasGuru,
          hasSiswa,
          hasKelas,
          hasTahunPelajaran,
          hasSemester,
          hasJurusan,
          hasMapel,
          hasWaliKelas,
          hasSesi: hasSesiList,
          hasAttendance: hasFeed || hasTaps,
          hasJenisKegiatan,
        });
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  async function getWaliKelasListSafe() {
    try {
      const mod = await import('@/api/academic/waliKelas.api');
      return mod.getWaliKelasStrukturList(1, 1);
    } catch (e) {
      return { data: [], pagination: { total: 0 } } as any;
    }
  }

  const Item = ({ label, done, onClick, to }: { label: string; done: boolean; onClick?: () => void; to?: string }) => (
    <div className="flex items-center justify-between p-2 md:p-3 bg-white dark:bg-gray-800 rounded-md border">
      <div className="flex items-center gap-2">
        <CheckCircle className={done ? 'text-green-600' : 'text-gray-400'} size={20} />
        <p className="text-sm md:text-base">{label}</p>
      </div>
      <div className="shrink-0">
        <Button size="sm" variant="secondary" onClick={onClick || (() => to && navigate(to))}>Buka</Button>
      </div>
    </div>
  );

  const handleContinue = () => {
    markOnboardingCompleted();
    if (mode === 'modal') {
      onClose && onClose();
      return;
    }
    navigate('/dashboard');
  };

  const content = (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">🎉 Selamat Datang di Sistem Absensi & Monitoring Sekolah</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300">Akun {tenantName} telah aktif.</p>
              <p className="text-gray-700 dark:text-gray-300">{isTrial ? 'Anda sedang berada dalam masa Free Trial 30 Hari.' : 'Silakan mulai menyiapkan data sekolah Anda.'}</p>
              <p className="text-gray-700 dark:text-gray-300">Paket aktif: {planName || (isTrial ? 'Free Trial' : '—')}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Checklist Onboarding</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span><span className="font-semibold">A. Lengkapi Profil Sekolah</span></div>
                  <div className="space-y-2">
                    <Item label="Lengkapi Profil Sekolah (1x — selamanya)" done={checks.profileCompleted} to="/settings?tab=sekolah" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className="inline-block w-2 h-2 rounded-full bg-green-500"></span><span className="font-semibold">B. Isi Data Academic</span></div>
                  <div className="space-y-2">
                    <Item label="Tambah Tahun Pelajaran" done={checks.hasTahunPelajaran} to="/academic/tahun-pelajaran" />
                    <Item label="Tambah Semester" done={checks.hasSemester} to="/academic/semester" />
                    <Item label="Tambah Jurusan" done={checks.hasJurusan} to="/academic/jurusan" />
                    <Item label="Tambah Mata Pelajaran" done={checks.hasMapel} to="/academic/mapel" />
                    <Item label="Tambah Kelas" done={checks.hasKelas} to="/academic/kelas" />
                    <Item label="Tambah Guru" done={checks.hasGuru} to="/academic/guru" />
                    <Item label="Tambah Siswa" done={checks.hasSiswa} to="/academic/siswa" />
                    <Item label="Tetapkan Wali Kelas" done={checks.hasWaliKelas} to="/academic/wali-kelas" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className="inline-block w-2 h-2 rounded-full bg-red-500"></span><span className="font-semibold">C. Absensi</span></div>
                  <div className="space-y-2">
                    <Item label="Atur Jenis Kegiatan Absensi" done={checks.hasJenisKegiatan} to="/attendance/jenis-kegiatan" />
                    <Item label="Mulai Lakukan Absensi" done={checks.hasAttendance || checks.hasSesi} to="/attendance/sesi" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span><span className="font-semibold">D. Kembangkan Layanan Sekolah</span></div>
                  <div className="space-y-2">
                    <Item label="Eksplorasi Modul Berbayar (Keuangan, Koperasi, dll)" done={false} to="/service-center?tab=catalog" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Langkah-langkah memulai:</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Lengkapi data akademik dasar (siswa, guru, kelas).</li>
                <li>Atur sesi dan jenis kegiatan untuk absensi.</li>
                <li>Uji alur absensi dan tinjau laporan awal.</li>
              </ol>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => navigate('/academic/siswa')}>Kelola Data Siswa</Button>
              <Button onClick={() => navigate('/attendance/sesi')} variant="secondary">Atur Sesi Absensi</Button>
              <Button onClick={() => navigate('/dashboard')} variant="outline">Buka Dashboard</Button>
            </div>
          <div className="pt-2">
            <Button className="w-full" onClick={handleContinue}>Saya sudah paham, lanjutkan ke Dashboard</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === 'modal') {
    return content;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      {content}
    </div>
  );
}
