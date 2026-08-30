import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Edit3, 
  Key, 
  User, 
  Users, 
  MapPin, 
  Award, 
  QrCode, 
  Save, 
  Loader2, 
  Camera, 
  Upload, 
  X, 
  RotateCcw, 
  AlertCircle, 
  Briefcase, 
  Shield, 
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  FileText
} from 'lucide-react';
import { Button, Modal, SearchableSelect, Input, Label, Textarea, Loader } from '../../ui';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGuruDetail, updateGuru, guruQueryKeys } from '../../../api/academic/guru.api';
import { listGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { useProvinsiOptions, useKabupatenOptions, useKecamatanOptions, useKelurahanOptions } from '../../../hooks/useWilayahOptions';
import { formatAlamatLengkap } from '../../../lib/alamat.util';
import { getStrukturList } from '../../../api/academic/strukturOrganisasi.api';
import { uploadGuruDocument, getMemberDocPreviewUrl } from '../../../api/memberDocs.api';
import { resolveProfilePhotoUrl } from '../../../lib/utils';
import { SelfMemberDocsSection } from '../../documents/SelfMemberDocsSection';
import { studentCardConfigApi } from '../../../api/academic/student-card-config.api';
import { PrintOverlay } from '@/components/academic/student-card/PrintOverlay';
import { DEFAULT_GURU_CONFIG, PAPER_SIZES } from '@/components/academic/student-card/constants';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { useAuthStore } from '../../../store/authStore';
import { getTenantById } from '../../../api/tenants.api';

// ─── Webcam Modal ─────────────────────────────────────────────────────────────
interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    if (!isOpen) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung fitur kamera live.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.'));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen, facingMode]);

  const handleSnap = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) onCapture(new File([blob], `foto_guru_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onClose();
      }, 'image/jpeg', 0.9);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <Camera size={18} className="text-emerald-400" />
            <span>Kamera — Foto Guru</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
              <RotateCcw size={13} /><span>Switch</span>
            </button>
            <button type="button" onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-xs font-bold text-rose-400 text-center space-y-2">
              <AlertCircle size={24} className="mx-auto" /><p>{cameraError}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`} />
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold border-slate-700 text-slate-300 cursor-pointer">Batal</Button>
          {!cameraError && (
            <button type="button" onClick={handleSnap}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
              <Camera size={16} /><span>📸 Jepret Foto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Jabatan Badge ─────────────────────────────────────────────────────────────
interface JabatanBadgeProps { nama: string; color?: string; icon?: React.ReactNode; }
const JabatanBadge: React.FC<JabatanBadgeProps> = ({ nama, color, icon }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl border text-[10px] font-bold ${color ?? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
    {icon}<span>{nama}</span>
  </span>
);

function getJabatanColor(kode: string) {
  const k = kode.toUpperCase();
  if (k.includes('KEPALA') || k.includes('PRINCIPAL')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  if (k.includes('WALI') || k.includes('WALAS')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (k.includes('WAKASEK') || k.includes('WAKIL')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  if (k.includes('BK') || k.includes('KONSELOR')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  if (k.includes('KURIKULUM')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
}

function getJabatanIcon(kode: string): React.ReactNode {
  const k = kode.toUpperCase();
  if (k.includes('KEPALA') || k.includes('WAKASEK') || k.includes('WAKIL')) return <Shield size={11} />;
  if (k.includes('WALI') || k.includes('WALAS')) return <Users size={11} />;
  if (k.includes('EKSKUL') || k.includes('PEMBINA')) return <BookOpen size={11} />;
  return <Briefcase size={11} />;
}

interface GuruDetailViewProps {
  guruId: string;
  onBack: () => void;
  onEdit?: (guruId: string) => void;
  canEdit?: boolean;
}

export const GuruDetailView: React.FC<GuruDetailViewProps> = ({
  guruId,
  onBack,
  canEdit = true,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Guru Detail
  const { data: guru, isLoading, refetch, isFetching } = useQuery({
    queryKey: guruQueryKeys.detail(guruId),
    queryFn: () => getGuruDetail(guruId),
    enabled: !!guruId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch Jabatan Struktural Guru
  const { data: jabatanList = [], isLoading: isJabatanLoading } = useQuery({
    queryKey: ['guru-jabatan', guruId],
    queryFn: async () => {
      try {
        const res = await getStrukturList({ limit: 100 });
        const list: Array<{ id: string; nama: string; kode: string; kelas?: string }> = [];
        for (const s of (res?.data || [])) {
          if (s.guru_id === guruId || s.Guru?.id === guruId) {
            const kelasName = s.Kelas?.nama_kelas || s.kelas?.nama_kelas;
            list.push({ id: s.id, nama: s.nama, kode: s.kode, kelas: kelasName });
          }
        }
        return list;
      } catch { return []; }
    },
    enabled: !!guruId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Mapel Penugasan
  const { data: guruMapelRes, isLoading: isMapelLoading } = useQuery({
    queryKey: ['guru-mapel-list', guruId],
    queryFn: () => listGuruMapel({ guru_id: guruId }),
    enabled: !!guruId,
    staleTime: 5 * 60 * 1000,
  });
  const guruMapelList = guruMapelRes?.data || [];

  // Local photo upload states
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Account Settings Form State
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Per-Section Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<'pribadi' | 'kepegawaian' | 'alamat' | 'sertifikasi'>('pribadi');
  const [isSavingSection, setIsSavingSection] = useState(false);

  // Editable Form Fields
  const [editAlamat, setEditAlamat] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editAgama, setEditAgama] = useState('');
  const [editPendidikanTerakhir, setEditPendidikanTerakhir] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNamaIbuKandung, setEditNamaIbuKandung] = useState('');
  const [editStatusKepegawaian, setEditStatusKepegawaian] = useState('');
  const [editPangkatGolongan, setEditPangkatGolongan] = useState('');
  const [editJenisPtk, setEditJenisPtk] = useState('');
  const [editTmtGuru, setEditTmtGuru] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editNuptk, setEditNuptk] = useState('');
  const [editNpwp, setEditNpwp] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editKabupaten, setEditKabupaten] = useState('');
  const [editProvinsi, setEditProvinsi] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editKodePos, setEditKodePos] = useState('');

  // Cascading Wilayah Hooks
  const { options: provinsiOptions } = useProvinsiOptions();
  const { options: kabupatenOptions } = useKabupatenOptions(editProvinsi);
  const { options: kecamatanOptions } = useKecamatanOptions(editKabupaten);
  const { options: kelurahanOptions } = useKelurahanOptions(editKecamatan, editKabupaten);

  // Sync state when guru data arrives
  useEffect(() => {
    if (guru) {
      const formatDateForInput = (val?: string | null) => {
        if (!val) return '';
        try {
          const str = String(val);
          if (str.includes('T')) return str.split('T')[0];
          const d = new Date(str);
          return isNaN(d.getTime()) ? str : d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setNoHp(guru.no_hp || '');
      setEmail(guru.email || '');
      setEditAlamat(guru.alamat || '');
      setEditTempatLahir(guru.tempat_lahir || '');
      setEditTanggalLahir(formatDateForInput(guru.tanggal_lahir));
      setEditJenisKelamin(guru.jenis_kelamin || 'L');
      setEditAgama(guru.agama || 'ISLAM');
      setEditPendidikanTerakhir(guru.pendidikan_terakhir || '');
      setEditNoKk(guru.no_kk || '');
      setEditNik(guru.nik || '');
      setEditNamaIbuKandung(guru.nama_ibu_kandung || '');
      setEditStatusKepegawaian(guru.status_kepegawaian || '');
      setEditPangkatGolongan(guru.pangkat_golongan || '');
      setEditJenisPtk(guru.jenis_ptk || '');
      setEditTmtGuru(formatDateForInput(guru.tmt_guru));
      setEditNip(guru.nip || '');
      setEditNuptk(guru.nuptk || '');
      setEditNpwp(guru.npwp || '');
      setEditDusun(guru.dusun || '');
      setEditKelurahan(guru.kelurahan || '');
      setEditKecamatan(guru.kecamatan || '');
      setEditKabupaten(guru.kabupaten || '');
      setEditProvinsi(guru.provinsi || '');
      setEditRt(guru.rt || '');
      setEditRw(guru.rw || '');
      setEditKodePos(guru.kode_pos || '');
    }
  }, [guru]);

  const handleOpenEditSection = (section: 'pribadi' | 'kepegawaian' | 'alamat' | 'sertifikasi') => {
    setActiveEditSection(section);
    setIsEditModalOpen(true);
  };

  // Submit Section Update
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruId) return;

    try {
      setIsSavingSection(true);
      const payload: any = {
        alamat: editAlamat,
        tempat_lahir: editTempatLahir,
        tanggal_lahir: editTanggalLahir,
        jenis_kelamin: editJenisKelamin,
        agama: editAgama,
        pendidikan_terakhir: editPendidikanTerakhir,
        no_kk: editNoKk,
        nik: editNik,
        nama_ibu_kandung: editNamaIbuKandung,
        status_kepegawaian: editStatusKepegawaian,
        pangkat_golongan: editPangkatGolongan,
        jenis_ptk: editJenisPtk,
        tmt_guru: editTmtGuru,
        nip: editNip,
        nuptk: editNuptk,
        npwp: editNpwp,
        dusun: editDusun,
        kelurahan: editKelurahan,
        kecamatan: editKecamatan,
        kabupaten: editKabupaten,
        provinsi: editProvinsi,
        rt: editRt,
        rw: editRw,
        kode_pos: editKodePos,
      };

      await updateGuru(guruId, payload);
      toast.success('Data guru berhasil diperbarui!');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: guruQueryKeys.detail(guruId) });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui data guru.');
    } finally {
      setIsSavingSection(false);
    }
  };

  // Submit Account Update
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruId) return;

    try {
      setIsSavingAccount(true);
      const payload: any = {
        no_hp: noHp,
        email: email,
      };
      if (passwordBaru) {
        payload.password = passwordBaru;
      }

      await updateGuru(guruId, payload);
      toast.success('Pengaturan akun & kontak guru berhasil disimpan!');
      setPasswordBaru('');
      queryClient.invalidateQueries({ queryKey: guruQueryKeys.detail(guruId) });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui akun guru.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Photo upload handler
  const handleUploadPhoto = useCallback(async (file: File) => {
    if (!guruId) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar (JPG, PNG, WebP).'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimum 5 MB.'); return; }

    const blobUrl = URL.createObjectURL(file);
    setLocalPhotoPreview(blobUrl);
    setIsUploadingPhoto(true);
    const tid = toast.loading('Mengunggah foto profil guru...');
    try {
      const res = await uploadGuruDocument({ guruId, file, judul: 'Foto Profil Guru', kategori: 'FOTO' });
      if (res.success && res.data?.id) {
        const servedUrl = getMemberDocPreviewUrl('GURU', guruId, res.data.id);
        setLocalPhotoPreview(servedUrl);
        toast.success('Foto profil berhasil diunggah!', { id: tid });
        queryClient.invalidateQueries({ queryKey: guruQueryKeys.detail(guruId) });
        refetch();
      } else {
        toast.error(res.message || 'Gagal mengunggah foto.', { id: tid });
        setLocalPhotoPreview(null);
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah foto.', { id: tid });
      setLocalPhotoPreview(null);
    } finally {
      setIsUploadingPhoto(false);
      URL.revokeObjectURL(blobUrl);
    }
  }, [guruId, queryClient, refetch]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleUploadPhoto(f); e.target.value = '';
  }, [handleUploadPhoto]);

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-4">
        <Loader size="lg" />
        <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat profil lengkap guru...</p>
      </div>
    );
  }

  if (!guru) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-bold text-red-500">Data guru tidak ditemukan.</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={14} className="mr-1.5" /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const rawGuruPhoto = guru.foto || (guru as any).foto_url || null;
  const resolvedPhotoUrl = rawGuruPhoto ? resolveProfilePhotoUrl(rawGuruPhoto) : null;
  const displayPhotoUrl = localPhotoPreview ?? resolvedPhotoUrl;
  const guruInitials = (guru.nama_guru || 'Guru').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const alamatLengkapFormatted = formatAlamatLengkap({
    alamat: editAlamat,
    rt: editRt,
    rw: editRw,
    dusun: editDusun,
    kelurahan: editKelurahan,
    kecamatan: editKecamatan,
    kabupaten: editKabupaten,
    provinsi: editProvinsi,
    kode_pos: editKodePos,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Webcam Modal */}
      <WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleUploadPhoto} />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Top Breadcrumb & Action Navigation Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Daftar Guru</span>
          </Button>
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="hidden sm:block">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Profil &amp; Biodata: {guru.nama_guru}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium font-mono">
              NIP: {guru.nip || '-'} • NUPTK: {guru.nuptk || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 rounded-xl text-xs font-bold"
            title="Segarkan Data"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 1. TOP ROW: 2 COLUMNS (Avatar Card & Account Settings Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column (Avatar & Quick Info Card) - 4 cols on lg */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 text-center sm:text-left">
          <div className="space-y-4">
            {/* Photo Avatar Frame with hover overlay */}
            <div className="relative w-28 h-28 mx-auto group cursor-pointer">
              <div className="w-full h-full rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-md">
                {isUploadingPhoto ? (
                  <div className="w-full h-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                    <Loader2 size={28} className="text-emerald-500 animate-spin" />
                  </div>
                ) : displayPhotoUrl ? (
                  <img src={displayPhotoUrl} alt={guru.nama_guru}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {guruInitials}
                    </span>
                  </div>
                )}
              </div>

              {/* Hover overlay for Camera / Upload */}
              <div className="absolute inset-0 rounded-3xl bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2">
                <button type="button" onClick={() => setIsWebcamOpen(true)}
                  className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer">
                  <Camera size={11} /><span>Kamera</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer border border-slate-700">
                  <Upload size={11} /><span>Galeri</span>
                </button>
              </div>

              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <Camera size={10} className="text-white" />
              </span>
            </div>

            <p className="text-[10px] text-slate-400 text-center font-medium">
              Hover foto untuk ubah via kamera atau galeri
            </p>

            {/* Nama & Status Guru */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                {guru.nama_guru}
              </h3>
              
              {/* Badges Jabatan */}
              {isJabatanLoading ? (
                <div className="flex justify-center"><Loader2 size={13} className="animate-spin text-slate-400" /></div>
              ) : jabatanList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 justify-center pt-0.5">
                  {jabatanList.map((j) => (
                    <JabatanBadge key={j.id}
                      nama={j.kelas ? `${j.nama} — ${j.kelas}` : j.nama}
                      color={getJabatanColor(j.kode)}
                      icon={getJabatanIcon(j.kode)}
                    />
                  ))}
                </div>
              ) : (
                <JabatanBadge nama={guru.jenis_ptk || 'Guru Mata Pelajaran'} icon={<Briefcase size={11} />} />
              )}
            </div>

            {/* Quick Detail Key-Value List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIP</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{guru.nip || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIK (KTP)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNik || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NUPTK</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNuptk || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Golongan / Pangkat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{editPangkatGolongan || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Jenis PTK</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{editJenisPtk || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Status Pegawai</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{editStatusKepegawaian || '-'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width QR Card Digital Button */}
          <Button
            type="button"
            onClick={() => toast('Membuka Cetak Kartu Digital Guru...', { icon: '💳' })}
            className="w-full h-10 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <QrCode size={16} />
            <span>Lihat QR Card Digital</span>
          </Button>
        </div>

        {/* Right Column (Pengaturan Akun & Ganti Password Card) - 8 cols on lg */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Title */}
            <div className="space-y-0.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  Pengaturan Akun &amp; Ganti Password
                </h3>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Perbarui nomor WhatsApp, email pembelajaran, atau set kata sandi baru untuk akun guru ini
              </p>
            </div>

            {/* Input Fields Grid Form */}
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="noHpGuru">
                    Nomor Telepon WhatsApp Guru
                  </Label>
                  <Input
                    id="noHpGuru"
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="628123456789"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emailGuru">
                    Email Pembelajaran
                  </Label>
                  <Input
                    id="emailGuru"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@absenta.sch.id"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Key size={14} className="text-amber-500" />
                  <span>SET KATA SANDI BARU (OPSIONAL)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="passwordBaru">
                      Kata Sandi Baru (Kosongkan jika tidak ingin mengubah)
                    </Label>
                    <Input
                      id="passwordBaru"
                      type="password"
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Masukkan kata sandi baru untuk guru..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSavingAccount}
                  className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  {isSavingAccount ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan Akun</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM ROW: 4 GRID CARDS (DATA PRIBADI, JABATAN & KEPEGAWAIAN, KONTAK & ALAMAT, SERTIFIKASI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Card 1: DATA PRIBADI */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                DATA PRIBADI
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('pribadi')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Data Pribadi"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {editJenisKelamin === 'L' ? 'Laki - laki' : 'Perempuan'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Agama</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editAgama || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tempat Lahir</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editTempatLahir || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Lahir</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editTanggalLahir || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editPendidikanTerakhir || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">No. Kartu Keluarga (KK)</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNoKk || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NIK (KTP)</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNik || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Ibu Kandung</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editNamaIbuKandung || '-'}</p>
            </div>
          </div>
        </div>

        {/* Card 2: JABATAN DAN KEPEGAWAIAN */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                JABATAN DAN KEPEGAWAIAN
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('kepegawaian')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Kepegawaian"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status Kepegawaian</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editStatusKepegawaian || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Golongan / Pangkat</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editPangkatGolongan || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jenis PTK</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editJenisPtk || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">TMT Guru</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editTmtGuru || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NIP</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNip || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NUPTK</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNuptk || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NPWP</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNpwp || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jabatan Struktural</p>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {jabatanList.length > 0 ? jabatanList.map(j => j.nama).join(', ') : 'Guru Mata Pelajaran'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: KONTAK & ALAMAT */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                KONTAK &amp; ALAMAT
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('alamat')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Kontak & Alamat"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor Telepon</p>
              <p className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{noHp || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</p>
              <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                {alamatLengkapFormatted || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: SERTIFIKASI & MASA KERJA */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                SERTIFIKASI &amp; MASA KERJA
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('kepegawaian')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Sertifikasi"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sertifikasi Guru</p>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {editNuptk ? 'Pendidik Profesional (Lulus SERTIFIKASI)' : 'Belum Tersertifikasi'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status Aktivitas</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Guru Aktif Pembelajaran</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PENUGASAN MATA PELAJARAN */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Mata Pelajaran yang Diampu</h3>
              <p className="text-xs text-slate-400">Daftar penugasan mata pelajaran, rombel kelas, dan jurusan untuk guru ini</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-xl border border-emerald-500/20">
            Total {guruMapelList.length} Mapel
          </span>
        </div>

        {isMapelLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={24} className="text-emerald-500 animate-spin" />
            <p className="text-xs text-slate-400 font-bold">Memuat data penugasan mapel...</p>
          </div>
        ) : guruMapelList.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-400">Belum ada mata pelajaran yang ditugaskan kepada guru ini.</p>
            <p className="text-[11px] text-slate-400 mt-1">Penugasan dapat diatur melalui Menu Kurikulum &gt; Guru Mapel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {guruMapelList.map((gm: any) => (
              <div key={gm.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {gm.Mapel?.nama_mapel || gm.mapel?.nama_mapel || 'Mata Pelajaran'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {gm.Mapel?.kode_mapel || gm.mapel?.kode_mapel || ''}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-2">
                  {gm.Kelas?.nama_kelas && (
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Kelas: {gm.Kelas.nama_kelas}
                    </span>
                  )}
                  {gm.Jurusan?.nama && (
                    <span className="text-slate-400 font-medium">
                      ({gm.Jurusan.nama})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. DOKUMEN & BERKAS KEPEGAWAIAN */}
      <SelfMemberDocsSection
        memberType="GURU"
        memberId={guruId}
        memberName={guru.nama_guru}
      />

      {/* ── Modal Edit Per Bagian ────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={
          activeEditSection === 'pribadi' ? 'Edit Data Pribadi Guru' :
          activeEditSection === 'kepegawaian' ? 'Edit Jabatan & Kepegawaian Guru' :
          'Edit Kontak & Alamat Lengkap Guru'
        }
        size="2xl"
      >
        <form onSubmit={handleSaveSection} className="p-5 space-y-4">
          {/* Section: Data Pribadi */}
          {activeEditSection === 'pribadi' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editJenisKelamin">Jenis Kelamin</Label>
                  <SearchableSelect
                    value={editJenisKelamin}
                    onValueChange={setEditJenisKelamin}
                    options={[
                      { value: 'L', label: 'Laki - laki' },
                      { value: 'P', label: 'Perempuan' }
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editAgama">Agama</Label>
                  <SearchableSelect
                    value={editAgama}
                    onValueChange={setEditAgama}
                    options={[
                      { value: 'ISLAM', label: 'Islam' },
                      { value: 'KRISTEN', label: 'Kristen' },
                      { value: 'KATOLIK', label: 'Katolik' },
                      { value: 'HINDU', label: 'Hindu' },
                      { value: 'BUDDHA', label: 'Buddha' },
                      { value: 'KONGHUCU', label: 'Konghucu' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editTempatLahir">Tempat Lahir</Label>
                  <Input
                    id="editTempatLahir"
                    value={editTempatLahir}
                    onChange={(e) => setEditTempatLahir(e.target.value)}
                    placeholder="Kota Lahir"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editTanggalLahir">Tanggal Lahir</Label>
                  <Input
                    id="editTanggalLahir"
                    type="date"
                    value={editTanggalLahir}
                    onChange={(e) => setEditTanggalLahir(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editNik">NIK (KTP)</Label>
                  <Input
                    id="editNik"
                    value={editNik}
                    onChange={(e) => setEditNik(e.target.value)}
                    placeholder="16 Digit NIK"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editNoKk">No. Kartu Keluarga (KK)</Label>
                  <Input
                    id="editNoKk"
                    value={editNoKk}
                    onChange={(e) => setEditNoKk(e.target.value)}
                    placeholder="16 Digit No KK"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editNamaIbuKandung">Nama Ibu Kandung</Label>
                  <Input
                    id="editNamaIbuKandung"
                    value={editNamaIbuKandung}
                    onChange={(e) => setEditNamaIbuKandung(e.target.value)}
                    placeholder="Nama lengkap ibu kandung"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editPendidikanTerakhir">Pendidikan Terakhir</Label>
                  <Input
                    id="editPendidikanTerakhir"
                    value={editPendidikanTerakhir}
                    onChange={(e) => setEditPendidikanTerakhir(e.target.value)}
                    placeholder="S1 Pendidikan..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Kepegawaian */}
          {activeEditSection === 'kepegawaian' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editNip">NIP</Label>
                  <Input
                    id="editNip"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    placeholder="18 Digit NIP (Opsional)"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editNuptk">NUPTK</Label>
                  <Input
                    id="editNuptk"
                    value={editNuptk}
                    onChange={(e) => setEditNuptk(e.target.value)}
                    placeholder="16 Digit NUPTK (Opsional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editNpwp">NPWP</Label>
                  <Input
                    id="editNpwp"
                    value={editNpwp}
                    onChange={(e) => setEditNpwp(e.target.value)}
                    placeholder="NPWP Guru"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editStatusKepegawaian">Status Kepegawaian</Label>
                  <SearchableSelect
                    value={editStatusKepegawaian}
                    onValueChange={setEditStatusKepegawaian}
                    options={[
                      { value: 'PNS', label: 'PNS' },
                      { value: 'PPPK', label: 'PPPK' },
                      { value: 'GTY', label: 'Guru Tetap Yayasan (GTY)' },
                      { value: 'GTT', label: 'Guru Tidak Tetap (GTT)' },
                      { value: 'HONORER', label: 'Honorer' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editPangkatGolongan">Pangkat / Golongan</Label>
                  <Input
                    id="editPangkatGolongan"
                    value={editPangkatGolongan}
                    onChange={(e) => setEditPangkatGolongan(e.target.value)}
                    placeholder="Penata Muda / III-a"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editJenisPtk">Jenis PTK</Label>
                  <Input
                    id="editJenisPtk"
                    value={editJenisPtk}
                    onChange={(e) => setEditJenisPtk(e.target.value)}
                    placeholder="Guru Mapel / Guru Kelas / Guru BK"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editTmtGuru">TMT Pengangkatan Guru</Label>
                <Input
                  id="editTmtGuru"
                  type="date"
                  value={editTmtGuru}
                  onChange={(e) => setEditTmtGuru(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Section: Kontak & Alamat */}
          {activeEditSection === 'alamat' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="editAlamatJalan">Alamat Jalan / Tempat Tinggal</Label>
                <Textarea
                  id="editAlamatJalan"
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, patokan..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editRt">RT</Label>
                  <Input
                    id="editRt"
                    value={editRt}
                    onChange={(e) => setEditRt(e.target.value)}
                    placeholder="001"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editRw">RW</Label>
                  <Input
                    id="editRw"
                    value={editRw}
                    onChange={(e) => setEditRw(e.target.value)}
                    placeholder="002"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editDusun">Dusun / Lingkungan</Label>
                  <Input
                    id="editDusun"
                    value={editDusun}
                    onChange={(e) => setEditDusun(e.target.value)}
                    placeholder="Nama Dusun"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Provinsi</Label>
                  <SearchableSelect
                    value={editProvinsi}
                    onValueChange={(val) => {
                      setEditProvinsi(val);
                      setEditKabupaten('');
                      setEditKecamatan('');
                      setEditKelurahan('');
                    }}
                    options={provinsiOptions}
                    placeholder="Pilih Provinsi..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Kabupaten / Kota</Label>
                  <SearchableSelect
                    value={editKabupaten}
                    onValueChange={(val) => {
                      setEditKabupaten(val);
                      setEditKecamatan('');
                      setEditKelurahan('');
                    }}
                    options={kabupatenOptions}
                    placeholder="Pilih Kab/Kota..."
                    disabled={!editProvinsi}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kecamatan</Label>
                  <SearchableSelect
                    value={editKecamatan}
                    onValueChange={(val) => {
                      setEditKecamatan(val);
                      setEditKelurahan('');
                    }}
                    options={kecamatanOptions}
                    placeholder="Pilih Kecamatan..."
                    disabled={!editKabupaten}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Kelurahan / Desa</Label>
                  <SearchableSelect
                    value={editKelurahan}
                    onValueChange={setEditKelurahan}
                    options={kelurahanOptions}
                    placeholder="Pilih Kelurahan..."
                    disabled={!editKecamatan}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editKodePos">Kode Pos</Label>
                <Input
                  id="editKodePos"
                  value={editKodePos}
                  onChange={(e) => setEditKodePos(e.target.value)}
                  placeholder="Contoh: 40123"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSavingSection}
              className="rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {isSavingSection ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default GuruDetailView;
