import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy, useRef } from 'react';
import { 
  User as UserIcon, Mail, Phone, MapPin, Calendar, Building2, 
  Key, ShieldAlert, BadgeInfo, Edit3, Settings, Briefcase, Camera, Loader2,
  GraduationCap, Award, ShieldCheck, Tag, Download, FileText, X, RefreshCw
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
import { getTenantById } from '../../api/tenants.api';
import { PrintableCard } from '../../components/academic/student-card/PrintableCard';
import { CardBackPreview } from '../../components/academic/student-card/CardBackPreview';
import { DEFAULT_CONFIG, DEFAULT_GURU_CONFIG } from '../../components/academic/student-card/constants';
import toast from 'react-hot-toast';
import { resolveProfilePhotoUrl } from '../../lib/utils';

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

  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);

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

      const fileName = `Kartu_Pelajar_${(siswaProfile?.nama_siswa || user?.full_name || 'Siswa').replace(/\s+/g, '_')}_${cardSide === 'front' ? 'Depan' : 'Belakang'}`;

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

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, cardWidth, cardHeight);
        pdf.save(`${fileName}.pdf`);
        toast.success('Kartu berhasil disimpan sebagai PDF!', { id: toastId });
      }
    } catch (error: any) {
      console.error('Download card error:', error);
      toast.error(`Gagal: ${error?.message || String(error)}`, { id: toastId, duration: 6000 });
    } finally {
      setIsDownloading(false);
    }
  };

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

  // Bangun URL preview foto profil dengan token otentikasi menggunakan helper terpusat
  const fotoUrl = useMemo(() => {
    if (!fotoDoc || !entityId) return null;
    const raw = getMemberDocPreviewUrl(isSiswa ? 'SISWA' : 'GURU', entityId, fotoDoc.id);
    return resolveProfilePhotoUrl(raw);
  }, [fotoDoc, entityId, isSiswa]);

  // Muat konfigurasi kartu kustom Tenant dari Database (siswa / guru)
  const { data: cardConfig, isLoading: isLoadingCardConfig } = useQuery({
    queryKey: ['student-card-config-my', entityId],
    queryFn: () => studentCardConfigApi.getConfig(),
    enabled: (isSiswa || isGuru) && !!entityId,
  });

  // Muat profil sekolah Tenant (siswa / guru)
  const { data: sekolahRes } = useQuery({
    queryKey: ['school-profile-my', entityId],
    queryFn: () => sekolahApi.getProfile(),
    enabled: (isSiswa || isGuru) && !!entityId,
  });

  // Fetch tenant info — same source as kopsurat (letterhead)
  const { data: tenantResponse } = useQuery({
    queryKey: ['tenant-info-my', user?.tenant_id],
    queryFn: () => getTenantById(user!.tenant_id),
    enabled: !!user?.tenant_id && (isSiswa || isGuru),
  });
  const tenantInfo = tenantResponse?.data || tenantResponse || null;

  const sekolahProfile = useMemo(() => {
    return sekolahRes?.data || sekolahRes || null;
  }, [sekolahRes]);

  const resolvedConfig = useMemo(() => {
    const defaultConf = isGuru ? DEFAULT_GURU_CONFIG : DEFAULT_CONFIG;
    if (!cardConfig) {
      return defaultConf;
    }

    let activeConfig: any = { ...cardConfig };

    // Parse layout presets if they exist (just like in StudentCardPage)
    let savedPresetConfig = null;
    if (cardConfig.layout_presets) {
      try {
        const presets = JSON.parse(cardConfig.layout_presets);
        if (isGuru && presets.guru_active_config) {
          savedPresetConfig = presets.guru_active_config;
        } else if (isSiswa && presets.siswa_active_config) {
          savedPresetConfig = presets.siswa_active_config;
        }
      } catch (e) {
        console.error('Error parsing layout presets in profile:', e);
      }
    }

    if (savedPresetConfig) {
      activeConfig = {
        ...defaultConf,
        ...cardConfig,
        ...savedPresetConfig,
      };
    } else {
      activeConfig = {
        ...defaultConf,
        ...cardConfig,
      };
    }

    // Merge tenantInfo & sekolahProfile metadata (consistent with StudentCardPage)
    const sekolahData = sekolahProfile;
    const resolvedName: string    = (tenantInfo as any)?.name    || sekolahData?.nama    || '';
    const resolvedAddress: string = (tenantInfo as any)?.address || sekolahData?.alamat  || '';
    const resolvedLogo: string    = (tenantInfo as any)?.logo_url || sekolahData?.logo_url || '';
    const resolvedHeader: string  = (tenantInfo as any)?.nama_dinas_atas   || '';
    const resolvedSubheader: string = (tenantInfo as any)?.nama_dinas_bawah || '';

    const resolvedKepsek = sekolahData?.kepala_sekolah || '';
    const resolvedNipKepsek = sekolahData?.nip_kepala || '';

    const finalKepsek = resolvedKepsek || 
      (activeConfig.back_principal_name === 'Nama Kepala Sekolah, M.Pd' ? '' : activeConfig.back_principal_name) || 
      'Nama Kepala Sekolah, M.Pd';
    
    const finalNip = resolvedNipKepsek || 
      (activeConfig.back_principal_nip === 'NIP. 198001012005011001' ? '' : activeConfig.back_principal_nip) || 
      'NIP. 198001012005011001';

    return {
      ...activeConfig,
      school_name: resolvedName || activeConfig.school_name || '',
      school_address: resolvedAddress || activeConfig.school_address || '',
      logo_url: resolvedLogo || activeConfig.logo_url || '',
      header_text: resolvedHeader || activeConfig.header_text || '',
      subheader_text: resolvedSubheader || activeConfig.subheader_text || '',
      back_signature_title: activeConfig.back_signature_title || 'Kepala Sekolah',
      back_principal_name: finalKepsek,
      back_principal_nip: finalNip,
      back_stamp_image_url: activeConfig.back_stamp_image_url || resolvedLogo || undefined,
    };
  }, [cardConfig, sekolahProfile, tenantInfo]);

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

  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
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

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get 2D canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion returned null'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      toast.error('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const closeCameraModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedImage) return;
    setUploadingFoto(true);
    const toastId = toast.loading('Mengompresi dan mengunggah foto kamera...');
    
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      
      const compressedBlob = await compressImage(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 800, 800, 0.85);
      const compressedFile = new File([compressedBlob], `formal_photo_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      const namePrefix = isSiswa ? (siswaProfile?.nama_siswa || user?.full_name) : (guruProfile?.nama_guru || user?.full_name);
      const autoTitle = `Foto Formal - Kamera Instan - ${namePrefix}`;
      
      if (isSiswa) {
        await uploadSiswaDocument({ siswaId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      } else {
        await uploadGuruDocument({ guruId: entityId, file: compressedFile, judul: autoTitle, kategori: 'FOTO' });
      }
      
      toast.success('Foto profil berhasil diperbarui', { id: toastId });
      queryClient.invalidateQueries({ queryKey: [isSiswa ? 'siswa-docs' : 'guru-docs', entityId] });
      closeCameraModal();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui foto profil', { id: toastId });
    } finally {
      setUploadingFoto(false);
    }
  };

  // Upload Foto Profil secara instan (mengisi slot FOTO)
  const handleUploadFotoDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMime.includes(file.type)) {
      toast.error('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      return;
    }

    setUploadingFoto(true);
    const toastId = toast.loading('Memproses dan mengompresi foto kamera...');
    try {
      // Compress client-side to maximum 800x800 resolution at 85% quality (usually resulting in ~100KB)
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
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui foto profil', { id: toastId });
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
              
              {isSiswa || isGuru ? (
                /* PROXY KARTU IDENTITAS RESMI (Siswa / Guru) */
                <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-full overflow-hidden">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-4">
                    💳 Kartu {isSiswa ? 'Pelajar' : 'Pegawai'} Digital Resmi
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
                        <div ref={cardRef}>
                          {cardSide === 'front' ? (
                            <PrintableCard 
                              student={{
                                ...(isSiswa ? siswaProfile : guruProfile),
                                nama_siswa: isSiswa 
                                  ? (siswaProfile?.nama_siswa || user?.full_name) 
                                  : (guruProfile?.nama_guru || user?.full_name),
                                foto: fotoUrl || user?.avatar || (isSiswa ? (siswaProfile as any)?.foto : (guruProfile as any)?.foto) || undefined
                              } as any}
                              config={resolvedConfig}
                              sekolah={sekolahProfile as any}
                            />
                          ) : (
                            <CardBackPreview config={resolvedConfig} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hidden print/download wrapper (unscaled and off-screen for perfect html2canvas capturing) */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -9999, pointerEvents: 'none' }}>
                    <div ref={downloadCardRef} style={{ transform: 'none', margin: 0, padding: 0 }}>
                      {cardSide === 'front' ? (
                        <PrintableCard 
                          student={{
                            ...(isSiswa ? siswaProfile : guruProfile),
                            nama_siswa: isSiswa 
                              ? (siswaProfile?.nama_siswa || user?.full_name) 
                              : (guruProfile?.nama_guru || user?.full_name),
                            foto: fotoUrl || user?.avatar || (isSiswa ? (siswaProfile as any)?.foto : (guruProfile as any)?.foto) || undefined
                          } as any}
                          config={resolvedConfig}
                          sekolah={sekolahProfile as any}
                        />
                      ) : (
                        <CardBackPreview config={resolvedConfig} />
                      )}
                    </div>
                  </div>

                  {/* Tombol Kamera/Upload Foto di bawah Kartu Pelajar */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center justify-center">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleUploadFotoDirect}
                      accept="image/*" 
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFoto}
                      variant="outline"
                      size="xs"
                      className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900"
                    >
                      Pilih dari Galeri
                    </Button>

                    <Button
                      onClick={() => {
                        setIsCameraOpen(true);
                        startCamera(cameraFacing);
                      }}
                      disabled={uploadingFoto}
                      variant="outline"
                      size="xs"
                      className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900"
                    >
                      <Camera size={11} className="mr-1.5" />
                      Ambil dari Kamera
                    </Button>

                    <Button
                      onClick={() => downloadCard('png')}
                      disabled={isDownloading}
                      variant="outline"
                      size="xs"
                      className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900"
                    >
                      <Download size={11} className="mr-1.5" />
                      Download PNG
                    </Button>

                    <Button
                      onClick={() => downloadCard('pdf')}
                      disabled={isDownloading}
                      variant="outline"
                      size="xs"
                      className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900"
                    >
                      <FileText size={11} className="mr-1.5" />
                      Download PDF
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
      {/* CAMERA CAPTURE MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col items-center">
            
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
                📷 Kamera Instan Absenta
              </h3>
              <button 
                onClick={closeCameraModal}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Feed or Captured Preview */}
            <div className="w-full aspect-square bg-black rounded-2xl overflow-hidden relative shadow-inner border border-slate-800 flex items-center justify-center">
              {!capturedImage ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]" // mirror effect
                  />
                  {/* Square center cropping guide */}
                  <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-full border-2 border-dashed border-indigo-500/80 rounded-xl" />
                  </div>
                </>
              ) : (
                <img 
                  src={capturedImage} 
                  alt="Captured Preview" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Actions Footer */}
            <div className="w-full flex flex-col gap-3 mt-6">
              {!capturedImage ? (
                <div className="flex gap-2 w-full justify-between items-center">
                  <Button
                    onClick={toggleCameraFacing}
                    variant="outline"
                    className="flex-1 h-11 text-xs font-bold rounded-2xl border-slate-800 hover:bg-slate-850 text-slate-300"
                  >
                    <RefreshCw size={13} className="mr-1.5" />
                    Kamera {cameraFacing === 'user' ? 'Belakang' : 'Depan'}
                  </Button>
                  
                  <button
                    onClick={capturePhoto}
                    className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border-4 border-white/20"
                  >
                    <div className="w-6 h-6 bg-white rounded-full" />
                  </button>

                  <Button
                    onClick={closeCameraModal}
                    variant="outline"
                    className="flex-1 h-11 text-xs font-bold rounded-2xl border-slate-800 hover:bg-slate-850 text-slate-300"
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera(cameraFacing);
                    }}
                    disabled={uploadingFoto}
                    variant="outline"
                    className="flex-1 h-11 text-xs font-black rounded-2xl border-slate-800 hover:bg-slate-850 text-slate-300"
                  >
                    Ulangi Foto
                  </Button>
                  <Button
                    onClick={uploadCapturedPhoto}
                    disabled={uploadingFoto}
                    className="flex-1 h-11 text-xs font-black rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                  >
                    {uploadingFoto ? (
                      <Loader2 size={13} className="animate-spin mr-1.5" />
                    ) : (
                      <Camera size={13} className="mr-1.5" />
                    )}
                    Simpan & Upload
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </PageLayout>
  );
}
