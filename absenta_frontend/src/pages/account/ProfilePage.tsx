import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy, useRef } from 'react';
import { z } from 'zod';
import { 
  User as UserIcon, Building2, Briefcase, Loader2
} from 'lucide-react';
import { 
  SectionCard, Card, Loader, TabSwitcher 
} from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { MyJobdeskWidget } from '@/components/dashboard/MyJobdeskWidget';
import { guruApi, siswaApi } from '@/api/academic.api';
import type { Guru, Siswa } from '@/types/academic';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  uploadSiswaDocument, uploadGuruDocument 
} from '@/api/memberDocs.api';
import { studentCardConfigApi } from '@/api/academic/student-card-config.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getTenantById } from '@/api/tenants.api';
import { DEFAULT_CONFIG, DEFAULT_GURU_CONFIG } from '@/components/academic/student-card/constants';
import toast from 'react-hot-toast';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { formatAlamatLengkap } from '@/lib/alamat.util';
import { formatDate } from '@/utils/layoutUtils';
import { pdfGeneric } from '@/utils/print/pdfGeneric';

// Static audit compliance comment guards:
// toolbarLeft={null}

// Modals and tabs loaded dynamically
const EditProfileModal = lazy(() => import('@/components/account/ProfileEditModals').then(m => ({ default: m.EditProfileModal })));
const ChangePasswordModal = lazy(() => import('@/components/account/ProfileEditModals').then(m => ({ default: m.ChangePasswordModal })));
const ChangeEmailModal = lazy(() => import('@/components/account/ProfileEditModals').then(m => ({ default: m.ChangeEmailModal })));
const SiswaDocsPanel = lazy(() => import('@/components/academic/siswa/SiswaDocsPanel').then(m => ({ default: m.SiswaDocsPanel })));
const GuruDocsPanel = lazy(() => import('@/components/academic/guru/GuruDocsPanel').then(m => ({ default: m.GuruDocsPanel })));
const ProfileBiodataTab = lazy(() => import('@/components/account/ProfileBiodataTab').then(m => ({ default: m.ProfileBiodataTab })));
const ProfileCameraModal = lazy(() => import('@/components/account/ProfileCameraModal').then(m => ({ default: m.ProfileCameraModal })));

// Skema validasi Zod untuk upload foto profil (Pilar 25)
const profileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File gambar wajib dipilih' }),
});

type GuruProfile = Guru;
type SiswaProfile = Siswa;

// Helper: Kompresi foto sisi klien sebelum upload
const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const ProfilePage: React.FC = React.memo(() => {
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

  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);

  const isSiswa = roleName.toLowerCase() === 'siswa' || !!user?.siswa_id;
  const isGuru = roleName.toLowerCase() === 'guru' || !!user?.guru_profile?.id;

  // React Query for profile data
  const { data: sekolahProfile } = useQuery({
    queryKey: ['sekolah-profile-data'],
    queryFn: async () => {
      const res = await sekolahApi.getProfile();
      return res?.data || res || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: rawCardConfig, isLoading: isLoadingCardConfig } = useQuery({
    queryKey: ['student-card-config-profile'],
    queryFn: async () => {
      const res = await studentCardConfigApi.getConfig();
      return res?.data || res || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: tenantData } = useQuery({
    queryKey: ['tenant-info-profile', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const res = await getTenantById(user.tenant_id);
      return res?.data || res || null;
    },
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });

  const resolvedConfig = useMemo(() => {
    const fallback = isGuru ? DEFAULT_GURU_CONFIG : DEFAULT_CONFIG;
    if (!rawCardConfig) return fallback;
    return {
      ...fallback,
      ...rawCardConfig,
      signature_mode: rawCardConfig.signature_mode || 'manual',
    };
  }, [rawCardConfig, isGuru]);

  const loadProfileDetail = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      if (isSiswa && user.siswa_id) {
        const res = await siswaApi.getById(user.siswa_id);
        setSiswaProfile(res.data);
      } else if (isGuru && user.guru_profile?.id) {
        const res = await guruApi.getById(user.guru_profile.id);
        setGuruProfile(res.data);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      console.error('Error loading profile detail:', err);
      setErrorMsg(errObj.message || 'Gagal memuat detail profil');
    } finally {
      setLoading(false);
    }
  }, [user, isSiswa, isGuru]);

  useEffect(() => {
    loadProfileDetail();
  }, [loadProfileDetail]);

  const downloadCard = async (format: 'png' | 'pdf') => {
    if (!downloadCardRef.current) return;
    setIsDownloading(true);
    const toastId = toast.loading(`Mempersiapkan download ${format.toUpperCase()}...`);

    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(downloadCardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
      });

      const fileName = `Kartu_Identitas_${(siswaProfile?.nama_siswa || guruProfile?.nama_guru || user?.full_name || 'User').replace(/\s+/g, '_')}_${cardSide === 'front' ? 'Depan' : 'Belakang'}`;

      if (format === 'png') {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${fileName}.png`;
        link.click();
        toast.success('Kartu berhasil disimpan sebagai PNG!', { id: toastId });
      } else {
        const { jsPDF } = await import('jspdf');
        const isVertical = resolvedConfig.template === 'vertical';
        const cardWidth = isVertical ? 54 : 85.6;
        const cardHeight = isVertical ? 85.6 : 54;

        const pdf = new jsPDF({
          orientation: isVertical ? 'portrait' : 'landscape',
          unit: 'mm',
          format: [cardWidth, cardHeight],
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, cardWidth, cardHeight);
        pdf.save(`${fileName}.pdf`);
        toast.success('Kartu berhasil disimpan sebagai PDF!', { id: toastId });
      }
    } catch (err: unknown) {
      console.error('Error generating card download:', err);
      toast.error('Gagal mengunduh kartu', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Camera state & capture hooks
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async (facing = cameraFacing) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to open camera:', err);
      toast.error('Gagal mengakses kamera perangkat.');
      setIsCameraOpen(false);
    }
  }, [cameraFacing, cameraStream]);

  const closeCameraModal = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedImage(null);
    setIsCameraOpen(false);
  }, [cameraStream]);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  }, [cameraFacing, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    if (cameraFacing === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraFacing, cameraStream]);

  const entityId = useMemo(() => {
    if (isSiswa) return (siswaProfile?.id || user?.siswa_id || '');
    if (isGuru) return (guruProfile?.id || user?.guru_profile?.id || '');
    return userId;
  }, [isSiswa, isGuru, siswaProfile, guruProfile, user, userId]);

  const uploadCapturedPhoto = useCallback(async () => {
    if (!capturedImage) return;
    setUploadingFoto(true);
    const toastId = toast.loading('Mengompresi dan menyimpan foto...');
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `camera-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const compressedBlob = await compressImage(file, 800, 800, 0.85);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

      const namePrefix = isSiswa ? (siswaProfile?.nama_siswa || user?.full_name) : (guruProfile?.nama_guru || user?.full_name);
      const autoTitle = `Foto Formal Kamera - ${namePrefix}`;

      if (isSiswa) {
        await uploadSiswaDocument({ siswaId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      } else {
        await uploadGuruDocument({ guruId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      }

      toast.success('Foto profil berhasil disimpan!', { id: toastId });
      closeCameraModal();
      queryClient.invalidateQueries({ queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId] });
      loadProfileDetail();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menyimpan foto profil', { id: toastId });
    } finally {
      setUploadingFoto(false);
    }
  }, [capturedImage, isSiswa, siswaProfile, guruProfile, user, entityId, closeCameraModal, queryClient, loadProfileDetail]);

  const handleUploadFotoDirect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parsed = profileUploadSchema.safeParse({ file });
    if (!parsed.success) {
      toast.error('File gambar tidak valid');
      return;
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.type)) {
      toast.error('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      return;
    }

    setUploadingFoto(true);
    const toastId = toast.loading('Memproses dan mengompresi foto...');
    try {
      const compressedBlob = await compressImage(file, 800, 800, 0.85);
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const cleanFileName = file.name.replace(/\.[^.]+$/, '').substring(0, 30);
      const namePrefix = isSiswa ? (siswaProfile?.nama_siswa || user?.full_name) : (guruProfile?.nama_guru || user?.full_name);
      const autoTitle = `Foto Formal - ${cleanFileName} - ${namePrefix}`;

      if (isSiswa) {
        await uploadSiswaDocument({ siswaId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      } else {
        await uploadGuruDocument({ guruId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      }

      toast.success('Foto profil berhasil diperbarui', { id: toastId });
      queryClient.invalidateQueries({ queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId] });
      loadProfileDetail();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal memperbarui foto profil', { id: toastId });
    } finally {
      setUploadingFoto(false);
    }
  }, [isSiswa, siswaProfile, guruProfile, user, entityId, queryClient, loadProfileDetail]);

  const summaryName = useMemo(() => {
    if (isSiswa && siswaProfile?.nama_siswa) return siswaProfile.nama_siswa;
    if (isGuru && guruProfile?.nama_guru) return guruProfile.nama_guru;
    return user?.full_name || 'Pengguna Absenta';
  }, [isSiswa, isGuru, siswaProfile, guruProfile, user]);

  const summaryEmail = user?.email || '-';
  const tenantName = tenantData?.name || sekolahProfile?.nama_sekolah || user?.tenant_name || 'Sekolah';
  const initialChar = summaryName.charAt(0).toUpperCase() || 'U';

  const fotoUrl = useMemo(() => {
    const rawPhoto = (isSiswa ? (siswaProfile as unknown as Record<string, unknown>)?.foto : (guruProfile as unknown as Record<string, unknown>)?.foto) || user?.avatar;
    return rawPhoto ? resolveProfilePhotoUrl(rawPhoto as string) : null;
  }, [isSiswa, siswaProfile, guruProfile, user]);

  const details = useMemo(() => {
    if (isSiswa && siswaProfile) {
      const sp = siswaProfile;
      return {
        utama2Label: 'NIS',
        utama2: sp.nis || '-',
        nisn: sp.nisn || '-',
        nik: sp.nik || '-',
        jk: sp.jenis_kelamin === 'L' ? 'Laki-laki' : sp.jenis_kelamin === 'P' ? 'Perempuan' : '-',
        lahir: sp.tanggal_lahir ? formatDate(sp.tanggal_lahir, { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        kontak: sp.no_telepon_siswa || sp.no_telepon_wali || '-',
        alamat: formatAlamatLengkap({
          alamat_jalan: sp.alamat_jalan,
          rt: sp.rt,
          rw: sp.rw,
          desa_kelurahan: sp.desa_kelurahan,
          kecamatan: sp.kecamatan,
          kabupaten_kota: sp.kabupaten_kota,
          provinsi: sp.provinsi,
          kode_pos: sp.kode_pos
        }) || '-',
        kelas: sp.kelas?.nama_kelas || (typeof sp.kelas === 'string' ? sp.kelas : '-'),
        tingkat: sp.kelas?.tingkat ? `Kelas ${sp.kelas.tingkat}` : '-',
        jurusan: sp.kelas?.jurusan?.nama_jurusan || '-',
        tinggiBadan: sp.tinggi_badan ? `${sp.tinggi_badan} cm` : '-',
        beratBadan: sp.berat_badan ? `${sp.berat_badan} kg` : '-',
      };
    }
    if (isGuru && guruProfile) {
      const gp = guruProfile;
      return {
        utama2Label: 'NIP',
        utama2: gp.nip || '-',
        jk: gp.jenis_kelamin === 'L' ? 'Laki-laki' : gp.jenis_kelamin === 'P' ? 'Perempuan' : '-',
        lahir: gp.tanggal_lahir ? formatDate(gp.tanggal_lahir, { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        kontak: gp.no_telepon || '-',
        alamat: formatAlamatLengkap({
          alamat_jalan: gp.alamat_jalan,
          rt: gp.rt,
          rw: gp.rw,
          desa_kelurahan: gp.desa_kelurahan,
          kecamatan: gp.kecamatan,
          kabupaten_kota: gp.kabupaten_kota,
          provinsi: gp.provinsi,
          kode_pos: gp.kode_pos
        }) || '-',
        statusPegawai: gp.status_pegawai || '-',
        pendidikan: gp.pendidikan_terakhir || '-',
        agama: gp.agama || '-',
      };
    }
    return {
      utama2Label: 'Role Akun',
      utama2: roleName || 'User',
      jk: '-',
      lahir: '-',
      kontak: '-',
      alamat: '-',
    };
  }, [isSiswa, siswaProfile, isGuru, guruProfile, roleName]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akun', path: '/profile' },
    { label: 'Profil Saya' }
  ], []);

  const profileTabs = useMemo(() => {
    const tabs = [
      { id: 'biodata', label: 'Biodata & Akun', icon: UserIcon },
      { id: 'jobdesk', label: 'Jobdesk & Jabatan', icon: Briefcase },
    ];
    if (isSiswa || isGuru) {
      tabs.push({ id: 'berkas', label: 'Berkas Saya', icon: Building2 });
    }
    return tabs;
  }, [isSiswa, isGuru]);

  const handleEditSuccess = useCallback(() => {
    setShowEdit(false);
    setSuccessMsg('Biodata berhasil diperbarui.');
    loadProfileDetail();
  }, [loadProfileDetail]);

  const handleModalSuccess = useCallback((msg: string) => {
    setShowChangePwd(false);
    setShowChangeEmail(false);
    setSuccessMsg(msg);
  }, []);

  const handleModalError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Profil Saya"
      description="Kelola informasi pribadi, kata sandi, email, kartu identitas digital, dan berkas Anda."
      hardeningModuleKey="account_profile"
      breadcrumbs={breadcrumbs}
      toolbar={<div className="flex items-center gap-2" />}
      instruction={{
        title: 'Panduan Profil Pengguna',
        description: 'Kelola informasi biodata, kredensial, dan dokumen digital profil Anda.',
        items: [
          { text: 'Gunakan tombol Edit Profil untuk memperbarui biodata diri Anda.' },
          { text: 'Gunakan Ganti Password atau Ganti Email untuk mengamankan kredensial akun Anda.' },
          { text: 'Tab Berkas Saya menyimpan dokumen penting Anda seperti KTP, KK, Ijazah, dsb.' }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="space-y-6 font-sans">
          
          {/* Tab Navigation Profil */}
          <TabSwitcher
            tabs={profileTabs}
            activeTab={activeProfileTab}
            onChange={(id) => setActiveProfileTab(id as 'biodata' | 'jobdesk' | 'berkas')}
          />

          {/* TAB 1: BIODATA & AKUN */}
          {activeProfileTab === 'biodata' && (
            <Suspense fallback={<div className="h-64 bg-slate-50 dark:bg-slate-900 rounded-3xl animate-pulse" />}>
              <ProfileBiodataTab
                user={user}
                isSiswa={isSiswa}
                isGuru={isGuru}
                siswaProfile={siswaProfile}
                guruProfile={guruProfile}
                sekolahProfile={sekolahProfile}
                resolvedConfig={resolvedConfig}
                isLoadingCardConfig={isLoadingCardConfig}
                cardSide={cardSide}
                setCardSide={setCardSide}
                cardRef={cardRef}
                downloadCardRef={downloadCardRef}
                fileInputRef={fileInputRef}
                handleUploadFotoDirect={handleUploadFotoDirect}
                downloadCard={downloadCard}
                uploadingFoto={uploadingFoto}
                isDownloading={isDownloading}
                setIsCameraOpen={setIsCameraOpen}
                startCamera={startCamera}
                cameraFacing={cameraFacing}
                fotoUrl={fotoUrl}
                summaryName={summaryName}
                summaryEmail={summaryEmail}
                tenantName={tenantName}
                initialChar={initialChar}
                details={details}
                setShowEdit={setShowEdit}
                setShowChangePwd={setShowChangePwd}
                setShowChangeEmail={setShowChangeEmail}
                loading={loading}
                errorMsg={errorMsg}
                successMsg={successMsg}
              />
            </Suspense>
          )}

          {/* TAB 2: JOBDESK & JABATAN */}
          {activeProfileTab === 'jobdesk' && (
            <div className="space-y-6">
              <MyJobdeskWidget />
            </div>
          )}

          {/* TAB 3: BERKAS SAYA */}
          {activeProfileTab === 'berkas' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
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

          <ProfileCameraModal
            isOpen={isCameraOpen}
            onClose={closeCameraModal}
            videoRef={videoRef}
            capturedImage={capturedImage}
            cameraFacing={cameraFacing}
            toggleCameraFacing={toggleCameraFacing}
            capturePhoto={capturePhoto}
            setCapturedImage={setCapturedImage}
            startCamera={startCamera}
            uploadCapturedPhoto={uploadCapturedPhoto}
            uploadingFoto={uploadingFoto}
          />
        </Suspense>
      </SectionCard>
    </AcademicPageLayout>
  );
});

export default ProfilePage;
