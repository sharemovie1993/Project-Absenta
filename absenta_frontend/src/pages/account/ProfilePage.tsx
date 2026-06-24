import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { User as UserIcon } from 'lucide-react';
import { 
  Card, CardHeader, CardTitle, CardContent, 
  Button, Label, Alert, AlertTitle, AlertDescription, Loader
} from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { UserCapabilityCard } from '../../components/dashboard/UserCapabilityCard';
import { MyJobdeskWidget } from '../../components/dashboard/MyJobdeskWidget';
import { guruApi, siswaApi } from '../../api/academic.api';
import type { Guru, Siswa } from '../../types/academic';
import { PageLayout } from '../../components/common/PageLayout';

const EditProfileModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.EditProfileModal })));
const ChangePasswordModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.ChangePasswordModal })));
const ChangeEmailModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.ChangeEmailModal })));

type GuruProfile = Guru;
type SiswaProfile = Siswa;

export default function ProfilePage() {
  const { user, subscription, isLoading: isAuthLoading } = useAuthStore();
  const roleName = user?.role?.name || '';
  const userId = user?.id || '';

  const [guruProfile, setGuruProfile] = useState<GuruProfile | null>(null);
  const [siswaProfile, setSiswaProfile] = useState<SiswaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'biodata' | 'jobdesk'>('biodata');

  // Load profile data
  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      if (!userId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        if (roleName === 'GURU') {
          const res = await guruApi.getAll({ limit: 1, ...( { user_id: userId } as any ) });
          const item = res.data?.[0] || null;
          if (mounted) setGuruProfile(item as any);
        } else if (roleName === 'SISWA') {
          const res = await siswaApi.getAll({ limit: 1, ...( { user_id: userId } as any ) });
          const item = res.data?.[0] || null;
          if (mounted) setSiswaProfile(item as any);
        }
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        if (mounted) setErrorMsg(err?.response?.data?.message || 'Gagal memuat profil.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => { mounted = false; };
  }, [userId, roleName]);

  const isGuru = roleName === 'GURU';
  const isSiswa = roleName === 'SISWA';

  const summaryName = user?.full_name || '';
  const summaryEmail = user?.email || '';

  // Memoize details card computation
  const details = useMemo(() => {
    if (isGuru && guruProfile) {
      return {
        utama1Label: 'Nama Guru',
        utama1: guruProfile.nama_guru || summaryName,
        utama2Label: 'NIP',
        utama2: guruProfile.nip || '-',
        kontakLabel: 'No HP',
        kontak: guruProfile.no_hp || '-',
        alamatLabel: 'Alamat',
        alamat: guruProfile.alamat || '-',
        lahirLabel: 'Tanggal Lahir',
        lahir: guruProfile.tanggal_lahir || '-',
        jkLabel: 'Jenis Kelamin',
        jk: guruProfile.jenis_kelamin || '-',
      };
    }
    if (isSiswa && siswaProfile) {
      return {
        utama1Label: 'Nama Siswa',
        utama1: siswaProfile.nama_siswa || summaryName,
        utama2Label: 'NIS',
        utama2: siswaProfile.nis || '-',
        kontakLabel: 'No HP',
        kontak: siswaProfile.no_hp || '-',
        alamatLabel: 'Alamat',
        alamat: siswaProfile.alamat || '-',
        lahirLabel: 'Tanggal Lahir',
        lahir: siswaProfile.tanggal_lahir || '-',
        jkLabel: 'Jenis Kelamin',
        jk: siswaProfile.jenis_kelamin || '-',
      };
    }
    return {
      utama1Label: 'Nama Lengkap',
      utama1: summaryName,
      utama2Label: 'Email',
      utama2: summaryEmail,
      kontakLabel: 'Role',
      kontak: roleName || '-',
      alamatLabel: 'Alamat',
      alamat: '-',
      lahirLabel: 'Tanggal Lahir',
      lahir: '-',
      jkLabel: 'Jenis Kelamin',
      jk: '-',
    };
  }, [isGuru, isSiswa, guruProfile, siswaProfile, summaryName, summaryEmail, roleName]);

  // Callbacks for modal success and error Handling
  const handleEditSuccess = useCallback((type: 'siswa' | 'guru' | 'user', updatedData: unknown) => {
    setSuccessMsg('Profil berhasil diperbarui.');
    setShowEdit(false);
    if (type === 'siswa') {
      setSiswaProfile(updatedData as SiswaProfile);
    } else if (type === 'guru') {
      setGuruProfile(updatedData as GuruProfile);
    }
  }, []);

  const handleModalSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
  }, []);

  const handleModalError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  // Memoize layout props to prevent DOM Churn
  const breadcrumbs = useMemo(() => [
    { label: 'Akun', path: '/profile' },
    { label: 'Profil Saya' }
  ], []);

  const instructions = useMemo(() => ({
    title: 'Panduan Profil Pengguna',
    items: [
      { text: 'Gunakan tombol Edit Profil untuk memperbarui biodata diri Anda.' },
      { text: 'Gunakan Ganti Password atau Ganti Email untuk mengamankan kredensial akun Anda.' },
      { text: 'Tab Jobdesk & Jabatan memuat informasi tugas operasional harian yang aktif.' }
    ]
  }), []);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <PageLayout
      title="Profil Saya"
      description="Kelola informasi pribadi, kata sandi, email, dan capabilitas Anda."
      breadcrumbs={breadcrumbs}
      instruction={instructions}
      hardeningModuleKey="profile_settings"
    >
      <div className="space-y-6 font-sans">
        <UserCapabilityCard user={user} subscription={subscription} />

        {/* Tab Navigation Profil */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-1 rounded-t-2xl">
          <button
            onClick={() => setActiveProfileTab('biodata')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeProfileTab === 'biodata'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350'
            }`}
          >
            <UserIcon size={14} />
            Biodata & Akun
          </button>
          <button
            onClick={() => setActiveProfileTab('jobdesk')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeProfileTab === 'jobdesk'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350'
            }`}
          >
            📋 Jobdesk & Jabatan
          </button>
        </div>

        {activeProfileTab === 'biodata' ? (
          <Card>
            <CardHeader>
              <CardTitle>Detail Biodata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{details.utama1Label}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.utama1}</div>
                </div>
                <div>
                  <Label>{details.utama2Label}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.utama2}</div>
                </div>
                <div>
                  <Label>{details.kontakLabel}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.kontak}</div>
                </div>
                <div>
                  <Label>{details.alamatLabel}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.alamat}</div>
                </div>
                <div>
                  <Label>{details.lahirLabel}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.lahir}</div>
                </div>
                <div>
                  <Label>{details.jkLabel}</Label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">{details.jk}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => setShowEdit(true)}>Edit Profil</Button>
                <Button variant="outline" onClick={() => setShowChangePwd(true)}>Ganti Password</Button>
                <Button variant="outline" onClick={() => setShowChangeEmail(true)}>Ganti Email</Button>
              </div>

              {loading && (
                <Alert className="mt-4">
                  <AlertTitle>Memuat</AlertTitle>
                  <AlertDescription>Memuat data profil...</AlertDescription>
                </Alert>
              )}

              {errorMsg && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Gagal</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {successMsg && (
                <Alert variant="success" className="mt-4">
                  <AlertTitle>Berhasil</AlertTitle>
                  <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <MyJobdeskWidget />

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 p-6 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                🛡️ Kapabilitas Operasional & Izin Sistem
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-medium">
                Berikut adalah daftar kapabilitas fungsional yang aktif and disematkan pada akun Anda untuk menjalankan modul-modul di platform Absenta.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {user?.capabilities && user.capabilities.length > 0 ? (
                  user?.capabilities?.map((cap: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800/60 hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 font-mono tracking-tight break-all">
                        {cap}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 text-xs text-gray-400 dark:text-gray-500 italic">
                    Tidak ada kapabilitas khusus yang terdaftar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extracted modals loaded via props */}
      <Suspense fallback={null}>
        <EditProfileModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          user={user}
          isSiswa={isSiswa}
          isGuru={isGuru}
          siswaProfile={siswaProfile}
          guruProfile={guruProfile}
          onSuccess={handleEditSuccess}
          onError={handleModalError}
        />

        <ChangePasswordModal
          isOpen={showChangePwd}
          onClose={() => setShowChangePwd(false)}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
        />

        <ChangeEmailModal
          isOpen={showChangeEmail}
          onClose={() => setShowChangeEmail(false)}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
        />
      </Suspense>
    </PageLayout>
  );
}
