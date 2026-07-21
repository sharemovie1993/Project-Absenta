import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy, useRef } from 'react';
import { 
  User as UserIcon, Mail, Phone, MapPin, Calendar, Building2, 
  Key, ShieldAlert, BadgeInfo, Edit3, Settings, Briefcase, Camera, Loader2,
  GraduationCap, Award, ShieldCheck, Tag
} from 'lucide-react';
import { 
  Card, CardContent, Button, Alert, AlertTitle, AlertDescription, Loader 
} from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { MyJobdeskWidget } from '../../components/dashboard/MyJobdeskWidget';
import { guruApi, siswaApi } from '../../api/academic.api';
import type { Guru, Siswa } from '../../types/academic';
import { PageLayout } from '../../components/common/PageLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  listSiswaDocuments, listGuruDocuments, 
  uploadSiswaDocument, uploadGuruDocument, 
  getMemberDocPreviewUrl 
} from '../../api/memberDocs.api';
import { studentCardConfigApi } from '../../api/academic/student-card-config.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { PrintableCard } from '../../components/academic/student-card/PrintableCard';
import { CardBackPreview } from '../../components/academic/student-card/CardBackPreview';
import { DEFAULT_CONFIG } from '../../components/academic/student-card/constants';
import toast from 'react-hot-toast';

const EditProfileModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.EditProfileModal })));
const ChangePasswordModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.ChangePasswordModal })));
const ChangeEmailModal = lazy(() => import('./components/ProfileEditModals').then(m => ({ default: m.ChangeEmailModal })));

const SiswaDocsPanel = lazy(() => import('../../components/academic/siswa/SiswaDocsPanel').then(m => ({ default: m.SiswaDocsPanel })));
const GuruDocsPanel = lazy(() => import('../../components/academic/guru/GuruDocsPanel').then(m => ({ default: m.GuruDocsPanel })));

type GuruProfile = Guru;
type SiswaProfile = Siswa;

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const roleName = user?.role?.name || '';
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [guruProfile, setGuruProfile] = useState<GuruProfile | null>(null);
  const [siswaProfile, setSiswaProfile] = useState<SiswaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'biodata' | 'jobdesk' | 'berkas'>('biodata');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load profile data
  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      if (!userId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        if (roleName === 'GURU') {
          const res = await guruApi.getAll({ limit: 1, ...({ user_id: userId } as any) });
          const item = res.data?.[0] || null;
          if (mounted) setGuruProfile(item as any);
        } else if (roleName === 'SISWA') {
          const res = await siswaApi.getAll({ limit: 1, ...({ user_id: userId } as any) });
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

  const entityId = useMemo(() => {
    if (isSiswa) return siswaProfile?.id || user?.siswa_id || '';
    if (isGuru) return guruProfile?.id || user?.guru_profile?.id || '';
    return '';
  }, [isSiswa, isGuru, siswaProfile, guruProfile, user]);

  // Load dokumen (termasuk FOTO) secara sinkron menggunakan React Query untuk sinkronisasi avatar & slot berkas
  const { data: docsData } = useQuery({
    queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId],
    queryFn: () => isSiswa ? listSiswaDocuments(entityId) : listGuruDocuments(entityId),
    enabled: !!entityId,
  });

  const docs = docsData?.data ?? [];

  // Cari file foto formal yang terunggah
  const fotoDoc = useMemo(() => {
    return docs.find(d => d.kategori === 'FOTO');
  }, [docs]);

  // Bangun URL preview foto profil dengan token otentikasi
  const fotoUrl = useMemo(() => {
    if (!fotoDoc || !entityId) return null;
    const raw = getMemberDocPreviewUrl(isSiswa ? 'SISWA' : 'GURU', entityId, fotoDoc.id);
    const tok = localStorage.getItem('access_token');
    return raw && tok ? `${raw}?token=${encodeURIComponent(tok)}` : raw;
  }, [fotoDoc, entityId, isSiswa]);

  // Muat konfigurasi kartu kustom Tenant dari Database (khusus siswa)
  const { data: cardConfig, isLoading: isLoadingCardConfig } = useQuery({
    queryKey: ['student-card-config-my', entityId],
    queryFn: () => studentCardConfigApi.getConfig(),
    enabled: isSiswa && !!entityId,
  });

  // Muat profil sekolah Tenant (khusus siswa)
  const { data: sekolahRes } = useQuery({
    queryKey: ['school-profile-my', entityId],
    queryFn: () => sekolahApi.getProfile(),
    enabled: isSiswa && !!entityId,
  });

  const sekolahProfile = useMemo(() => {
    return sekolahRes?.data || sekolahRes || null;
  }, [sekolahRes]);

  const resolvedConfig = useMemo(() => {
    const base = cardConfig || DEFAULT_CONFIG;
    return {
      ...DEFAULT_CONFIG,
      ...base,
      back_principal_name: base.back_principal_name || sekolahProfile?.kepala_sekolah || base.back_principal_name,
      back_principal_nip: base.back_principal_nip || sekolahProfile?.nip_kepala || base.back_principal_nip,
      back_stamp_image_url: base.back_stamp_image_url || sekolahProfile?.logo_url || base.back_stamp_image_url,
    };
  }, [cardConfig, sekolahProfile]);

  const summaryName = user?.full_name || '';
  const summaryEmail = user?.email || '';
  const tenantName = user?.Tenant?.name || user?.tenantName || 'Absenta School';

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
        lahir: guruProfile.tanggal_lahir ? new Date(guruProfile.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
        jkLabel: 'Jenis Kelamin',
        jk: guruProfile.jenis_kelamin === 'L' ? 'Laki-laki' : (guruProfile.jenis_kelamin === 'P' ? 'Perempuan' : '-'),
        
        // Tambahan Kepegawaian Guru
        statusPegawai: guruProfile.status_kepegawaian || '-',
        pendidikan: guruProfile.pendidikan_terakhir || '-',
        agama: guruProfile.agama || '-',
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
        lahir: siswaProfile.tanggal_lahir ? new Date(siswaProfile.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
        jkLabel: 'Jenis Kelamin',
        jk: siswaProfile.jenis_kelamin === 'L' ? 'Laki-laki' : (siswaProfile.jenis_kelamin === 'P' ? 'Perempuan' : '-'),
        
        // Tambahan Akademik Siswa
        kelas: siswaProfile.Kelas?.nama_kelas || '-',
        tingkat: siswaProfile.Kelas?.tingkat ? `Tingkat ${siswaProfile.Kelas.tingkat}` : '-',
        jurusan: siswaProfile.Jurusan?.nama || '-',
        nisn: siswaProfile.nisn || '-',
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
      statusPegawai: '-',
      pendidikan: '-',
      agama: '-',
      kelas: '-',
      tingkat: '-',
      jurusan: '-',
      nisn: '-',
    };
  }, [isGuru, isSiswa, guruProfile, siswaProfile, summaryName, summaryEmail, roleName]);

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

  // Upload Foto Profil secara instan (mengisi slot FOTO)
  const handleUploadFotoDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024; // 5MB limit

    if (!allowedMime.includes(file.type)) {
      toast.error('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > maxBytes) {
      toast.error('Ukuran foto terlalu besar (maksimal 5MB).');
      return;
    }

    setUploadingFoto(true);
    try {
      const cleanFileName = file.name.replace(/\.[^.]+$/, '').substring(0, 30);
      const namePrefix = isSiswa ? (siswaProfile?.nama_siswa || user?.full_name) : (guruProfile?.nama_guru || user?.full_name);
      const autoTitle = `Foto Formal - ${cleanFileName} - ${namePrefix}`;

      if (isSiswa) {
        await uploadSiswaDocument({ siswaId: entityId, file, judul: autoTitle, kategori: 'FOTO' });
      } else {
        await uploadGuruDocument({ guruId: entityId, file, judul: autoTitle, kategori: 'FOTO' });
      }

      toast.success('Foto profil berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId] });
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui foto profil');
    } finally {
      setUploadingFoto(false);
    }
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Akun', path: '/profile' },
    { label: 'Profil Saya' }
  ], []);

  const instructions = useMemo(() => ({
    title: 'Panduan Profil Pengguna',
    items: [
      { text: 'Gunakan tombol Edit Profil untuk memperbarui biodata diri Anda.' },
      { text: 'Gunakan Ganti Password atau Ganti Email untuk mengamankan kredensial akun Anda.' },
      { text: 'Tab Berkas Saya menyimpan dokumen penting Anda seperti KTP, KK, Ijazah, dsb.' }
    ]
  }), []);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // Helper untuk inisial nama
  const initialChar = summaryName.charAt(0).toUpperCase() || 'U';

  return (
    <PageLayout
      title="Profil Saya"
      description="Kelola informasi pribadi, kata sandi, email, dan berkas Anda."
      breadcrumbs={breadcrumbs}
      instruction={instructions}
    >
      <div className="space-y-6 font-sans">
        
        {/* Tab Navigation Profil */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-850 p-1.5 rounded-2xl shadow-sm">
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
            <Briefcase size={14} />
            Jobdesk & Jabatan
          </button>
          {(isSiswa || isGuru) && (
            <button
              onClick={() => setActiveProfileTab('berkas')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeProfileTab === 'berkas'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350'
              }`}
            >
              <Building2 size={14} />
              Berkas Saya
            </button>
          )}
        </div>

        {activeProfileTab === 'biodata' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* KOLOM KIRI: Proxy Kartu Identitas Digital / Avatar Card */}
            <div className="lg:col-span-5 space-y-6">
              
              {isSiswa ? (
                /* PROXY KARTU PELAJAR RESMI (Menghormati Konfigurasi Desain Tenant) */
                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-full overflow-hidden">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-4">
                    💳 Kartu Pelajar Digital Resmi
                  </span>
                  
                  {/* Switcher Sisi Kartu */}
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-4 text-[10px] font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setCardSide('front')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${cardSide === 'front' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                      Sisi Depan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardSide('back')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${cardSide === 'back' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                      Sisi Belakang
                    </button>
                  </div>
                  
                  {isLoadingCardConfig ? (
                    <div className="w-full aspect-[1.58/1] bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                  ) : (
                    /* Pembungkus Mencegah Overflow & Mengskala Sesuai Resolusi */
                    <div className="w-full overflow-auto py-1 scrollbar-none flex justify-center items-center">
                      <div className="origin-center scale-[0.82] sm:scale-95 md:scale-100 transition-all duration-300 shrink-0">
                        {cardSide === 'front' ? (
                          <PrintableCard 
                            student={{
                              ...siswaProfile,
                              nama_siswa: siswaProfile?.nama_siswa || user?.full_name,
                              foto: fotoUrl || user?.avatar || (siswaProfile as any)?.foto || (siswaProfile as any)?.foto_url || undefined
                            } as any}
                            config={resolvedConfig}
                            sekolah={sekolahProfile as any}
                          />
                        ) : (
                          <CardBackPreview config={resolvedConfig} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tombol Kamera/Upload Foto di bawah Kartu Pelajar */}
                  <div className="mt-4 flex items-center justify-center">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleUploadFotoDirect}
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFoto}
                      variant="outline"
                      size="xs"
                      className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900"
                    >
                      {uploadingFoto ? (
                        <Loader2 size={11} className="animate-spin mr-1.5" />
                      ) : (
                        <Camera size={11} className="mr-1.5" />
                      )}
                      Ganti Foto Kartu Pelajar
                    </Button>
                  </div>
                </div>
              ) : (
                /* USER CARD GURU / ADMIN / STAF */
                <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center">
                  {/* Avatar Bulat Guru */}
                  <div className="relative group mb-4">
                    {fotoUrl ? (
                      <img 
                        src={fotoUrl} 
                        alt={summaryName} 
                        className="w-24 h-24 rounded-full object-cover shadow-md border-4 border-white dark:border-slate-800 transition-all duration-300 group-hover:brightness-90"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black shadow-md border-4 border-white dark:border-slate-800 transition-all duration-300 group-hover:brightness-90">
                        {initialChar}
                      </div>
                    )}

                    {uploadingFoto && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center text-white">
                        <Loader2 size={24} className="animate-spin text-white" />
                      </div>
                    )}

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleUploadFotoDirect}
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFoto}
                      title="Ganti Foto Profil"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center border-2 border-white dark:border-slate-800 transition-all duration-200"
                    >
                      <Camera size={14} />
                    </button>
                  </div>

                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">{summaryName}</h3>
                  <span className="mt-1 text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 uppercase px-3 py-1 rounded-full">
                    Tenaga Pendidik
                  </span>

                  <div className="w-full mt-6 space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800/60 text-left">
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate font-semibold">{summaryEmail}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate font-semibold">{tenantName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AKSI EDIT BIODATA & KEAMANAN AKUN */}
              <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4 text-center">
                <div className="text-left">
                  <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Manajemen Akun</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Kelola kredensial and akses masuk sistem Anda</p>
                </div>
                <div className="space-y-2">
                  <Button variant="primary" className="w-full h-9.5 text-xs rounded-xl flex items-center justify-center gap-2 font-bold shadow-md shadow-indigo-500/10" onClick={() => setShowEdit(true)}>
                    <Edit3 size={13} />
                    Edit Informasi Biodata
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-9 text-[10px] rounded-xl flex items-center justify-center gap-1.5 font-bold border-slate-100 dark:border-slate-800" onClick={() => setShowChangePwd(true)}>
                      <Key size={11} />
                      Ganti Password
                    </Button>
                    <Button variant="outline" className="h-9 text-[10px] rounded-xl flex items-center justify-center gap-1.5 font-bold border-slate-100 dark:border-slate-800" onClick={() => setShowChangeEmail(true)}>
                      <Mail size={11} />
                      Ganti Email
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Detail Informasi Lengkap & Terstruktur */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* CARD 1: INFORMASI AKADEMIK (SISWA) / STATUS & PENDIDIKAN (GURU) */}
              {isSiswa && (
                <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                    <GraduationCap size={15} className="text-indigo-500" />
                    Informasi Akademik Siswa
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Award size={11} className="text-indigo-500" /> Kelas Aktif
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.kelas}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Tag size={11} className="text-indigo-500" /> Tingkat Kelas
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.tingkat}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Briefcase size={11} className="text-indigo-500" /> Kompetensi Keahlian (Jurusan)
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.jurusan}</p>
                    </div>
                  </div>
                </div>
              )}

              {isGuru && (
                <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                    <GraduationCap size={15} className="text-indigo-500" />
                    Kualifikasi & Status Kepegawaian
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Award size={11} className="text-indigo-500" /> Status Pegawai
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.statusPegawai}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <GraduationCap size={11} className="text-indigo-500" /> Pendidikan Terakhir
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.pendidikan}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <ShieldCheck size={11} className="text-indigo-500" /> Agama
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.agama}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 2: INFORMASI PERSONAL */}
              <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <BadgeInfo size={15} className="text-indigo-500" />
                  Informasi Diri & Identitas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                      <Award size={11} className="text-indigo-500" /> {details.utama2Label}
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.utama2}</p>
                  </div>
                  {isSiswa && (
                    <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Award size={11} className="text-indigo-500" /> NISN
                      </span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.nisn}</p>
                    </div>
                  )}
                  <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                      <UserIcon size={11} className="text-indigo-500" /> Jenis Kelamin
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.jk}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                      <Calendar size={11} className="text-indigo-500" /> Tempat & Tanggal Lahir
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                      {isSiswa ? (siswaProfile?.tempat_lahir || '-') : (guruProfile?.tempat_lahir || '-')}, {details.lahir}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 3: KONTAK & ALAMAT */}
              <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                  <Phone size={15} className="text-indigo-500" />
                  Kontak & Domisili
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3.5 p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <Phone size={14} className="text-indigo-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Telepon / WhatsApp</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.kontak}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5 p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <MapPin size={14} className="text-indigo-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Alamat Rumah Tinggal</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">{details.alamat}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Alerts */}
              {loading && (
                <div className="flex items-center gap-2 p-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-2xl text-xs font-bold">
                  <Loader2 size={13} className="animate-spin" /> Memuat data profil terbaru...
                </div>
              )}
              {errorMsg && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTitle>Kesalahan</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              {successMsg && (
                <Alert variant="success" className="rounded-2xl">
                  <AlertTitle>Pemberitahuan</AlertTitle>
                  <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {activeProfileTab === 'jobdesk' && (
          <div className="space-y-6">
            <MyJobdeskWidget />
          </div>
        )}

        {activeProfileTab === 'berkas' && (
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <Suspense fallback={<div className="h-40 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
              {isSiswa && (siswaProfile?.id || user?.siswa_id) && (
                <SiswaDocsPanel
                  siswaId={siswaProfile?.id || user?.siswa_id || ''}
                  siswaName={siswaProfile?.nama_siswa || user?.full_name}
                  nis={siswaProfile?.nis}
                  nisn={siswaProfile?.nisn}
                  mode="full"
                  canManage={true}
                />
              )}
              {isGuru && (guruProfile?.id || user?.guru_profile?.id) && (
                <GuruDocsPanel
                  guruId={guruProfile?.id || user?.guru_profile?.id || ''}
                  guruName={guruProfile?.nama_guru || user?.full_name}
                  mode="full"
                  canManage={true}
                />
              )}
            </Suspense>
          </div>
        )}
      </div>

      {/* Modals loaded dynamically */}
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
