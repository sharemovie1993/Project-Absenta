import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  X, 
  ShieldCheck, 
  Ruler, 
  Weight, 
  CreditCard, 
  Phone, 
  Calendar,
  AlertCircle,
  Heart,
  Edit3,
  Camera,
  Upload,
  RotateCcw
} from 'lucide-react';
import { uploadSiswaDocument } from '@/api/memberDocs.api';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jenisKegiatanMasterApi } from '@/api/academic/jenisKegiatanMaster.api';
import { updateSiswa, updateSiswaMe, siswaQueryKeys } from '@/api/academic/siswa.api';
import { useSiswaMe, useUpdateSiswaMe, SISWA_ME_QUERY_KEY } from '@/hooks/useSiswaMe';
import { 
  AGAMA_OPTIONS, 
  TRANSPORTASI_OPTIONS, 
  PEKERJAAN_OPTIONS, 
  HUBUNGAN_WALI_OPTIONS,
  PROVINSI_INDONESIA_OPTIONS,
  getProvinsiOptions,
  getKabupatenOptions,
  getKecamatanOptions,
  getKelurahanOptions,
  getSmartKodePos,
  DropdownOption
} from '@/api/dropdown.api';
import { 
  useProvinsiOptions, 
  useKabupatenOptions, 
  useKecamatanOptions, 
  useKelurahanOptions 
} from '@/hooks/useWilayahOptions';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// ─── Live Webcam Capture Modal Component ─────────────────────────────────────

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Discover connected video input devices
  React.useEffect(() => {
    if (!isOpen) return;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const inputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(inputs);
      }).catch(console.error);
    }
  }, [isOpen]);

  // Start video stream when facingMode or currentDeviceId changes
  React.useEffect(() => {
    if (!isOpen) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setCameraError(null);

    const constraints: MediaTrackConstraints = currentDeviceId
      ? { deviceId: { exact: currentDeviceId } }
      : { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 640 } };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: constraints })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser Anda.');
        });
    } else {
      setCameraError('Browser ini tidak mendukung fitur kamera live.');
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode, currentDeviceId]);

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      setCurrentDeviceId(videoDevices[nextIndex].deviceId);
    } else {
      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
      setCurrentDeviceId(null);
    }
  };

  const isUserFacing = facingMode === 'user' && !currentDeviceId;

  const handleTakeSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (isUserFacing) {
        // Mirror image horizontally for natural selfie view
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `pas_foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full text-center space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <Camera size={18} className="text-emerald-400" />
            <span>Kamera Live (Ambil Pas Foto)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwitchCamera}
              title="Ganti / Switch Kamera (Depan / Belakang / Kamera Lain)"
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all shadow-xs"
            >
              <RotateCcw size={13} />
              <span>Switch Kamera</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border-2 border-emerald-500/50 shadow-inner flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-xs font-bold text-rose-400 text-center space-y-2">
              <AlertCircle size={24} className="mx-auto" />
              <p>{cameraError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover", isUserFacing && "transform -scale-x-100")}
            />
          )}
        </div>

        <div className="flex justify-center gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold border-slate-700 text-slate-300">
            Batal
          </Button>

          {!cameraError && (
            <button
              type="button"
              onClick={handleTakeSnap}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
            >
              <Camera size={16} />
              <span>📸 Jepret Foto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export type SectionEditType = 'pribadi' | 'ekskul' | 'alamat' | 'orangtua' | 'all';

export interface SiswaOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswa?: any;
  siswaData?: any;
  onSuccess?: () => void;
  initialStep?: number;
  activeSection?: SectionEditType;
}

export function calculateProfileCompleteness(siswa: any) {
  if (!siswa) return { percent: 0, isComplete: false, missingFields: ['Semua data'] };

  const fieldChecks = [
    { key: 'nik', label: 'NIK (Nomor Induk Kependudukan)', isFilled: !!siswa.nik?.trim() },
    { key: 'nisn', label: 'NISN', isFilled: !!siswa.nisn?.trim() },
    { key: 'tempat_lahir', label: 'Tempat Lahir', isFilled: !!siswa.tempat_lahir?.trim() },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', isFilled: !!siswa.tanggal_lahir },
    { key: 'no_hp', label: 'Nomor HP / WhatsApp', isFilled: !!siswa.no_hp?.trim() },
    { key: 'alamat', label: 'Alamat Tempat Tinggal', isFilled: !!siswa.alamat?.trim() },
    { key: 'tinggi_badan', label: 'Tinggi Badan (cm)', isFilled: siswa.tinggi_badan !== null && siswa.tinggi_badan !== undefined && siswa.tinggi_badan !== '' },
    { key: 'berat_badan', label: 'Berat Badan (kg)', isFilled: siswa.berat_badan !== null && siswa.berat_badan !== undefined && siswa.berat_badan !== '' },
    { key: 'nama_ayah', label: 'Nama Ayah Kandung', isFilled: !!siswa.nama_ayah?.trim() },
    { key: 'nama_ibu', label: 'Nama Ibu Kandung', isFilled: !!siswa.nama_ibu?.trim() },
  ];

  const filledCount = fieldChecks.filter(f => f.isFilled).length;
  const percent = Math.round((filledCount / fieldChecks.length) * 100);
  const missingFields = fieldChecks.filter(f => !f.isFilled).map(f => f.label);

  return {
    percent,
    isComplete: percent === 100,
    missingFields,
  };
}

export const SiswaOnboardingModal: React.FC<SiswaOnboardingModalProps> = ({
  isOpen,
  onClose,
  siswa: siswaProp,
  siswaData,
  onSuccess,
  initialStep = 1,
  activeSection = 'all',
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(initialStep);

  const { siswaProfile: siswaFromHook, isApiConnected } = useSiswaMe();

  const siswa = useMemo(() => {
    return siswaProp || siswaData || siswaFromHook || null;
  }, [siswaProp, siswaData, siswaFromHook]);

  const studentName = useMemo(() => {
    return siswa?.nama_siswa || siswa?.nama || siswa?.name || '';
  }, [siswa]);

  const studentNisn = useMemo(() => {
    return siswa?.nisn || siswa?.nis || '';
  }, [siswa]);

  const studentKelas = useMemo(() => {
    return siswa?.Kelas?.nama_kelas || siswa?.nama_kelas || siswa?.kelas || '';
  }, [siswa]);

  const renderFieldStatusBadge = (_value: any) => {
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Form State
  const [formData, setFormData] = useState({
    nik: '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    no_hp: '',
    tinggi_badan: '' as number | string,
    berat_badan: '' as number | string,
    agama: 'Islam',
    hobi: '',
    cita_cita: '',

    alamat: '',
    dusun: '',
    kelurahan: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
    rt: '',
    rw: '',
    kode_pos: '',
    transportasi: '',

    is_osis: false,
    is_mpk: false,
    ekskul_1: '',
    ekskul_2: '',

    nama_ayah: '',
    nik_ayah: '',
    pekerjaan_ayah: '',
    no_hp_ayah: '',
    nama_ibu: '',
    nik_ibu: '',
    pekerjaan_ibu: '',
    no_hp_ibu: '',
    nama_wali: '',
    hubungan_wali: '',
  });

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  // TanStack Query Hooks untuk data wilayah
  const { options: provinsiOptions } = useProvinsiOptions();
  const { options: kabupatenOptions, isLoading: loadingKabupaten } = useKabupatenOptions(formData.provinsi);
  const { options: kecamatanOptions, isLoading: loadingKecamatan } = useKecamatanOptions(formData.kabupaten);
  const { options: kelurahanOptions, isLoading: loadingKelurahan } = useKelurahanOptions(formData.kecamatan, formData.kabupaten);

  // TanStack Query Hook untuk data Master Ekstrakurikuler (Modul Anggota & Ekskul)
  const eskulQuery = useQuery({
    queryKey: ['jenis-kegiatan-eskul-options'],
    queryFn: async () => {
      const res = await jenisKegiatanMasterApi.getAll({ limit: 100 });
      const eskulOnly = (res.data ?? []).filter(e => e.tipe !== 'KBM' && e.aktif);
      return eskulOnly.map(e => ({ value: e.nama, label: e.nama }));
    },
    staleTime: 5 * 60 * 1000,
  });
  const eskulOptions = eskulQuery.data || [];

  useEffect(() => {
    if (formData.kecamatan) {
      getSmartKodePos(formData.kecamatan, formData.kelurahan, formData.kabupaten).then(code => {
        if (code) {
          setFormData(prev => ({ ...prev, kode_pos: code }));
        }
      });
    }
  }, [formData.kecamatan, formData.kelurahan, formData.kabupaten]);

const matchOptionValue = (val: string | null | undefined, options: Array<{ value: string; label: string }>): string => {
  if (!val) return '';
  const cleanVal = String(val).trim().toLowerCase();
  
  const byLabel = options.find(o => o.label.toLowerCase() === cleanVal);
  if (byLabel) return byLabel.label;

  const byValue = options.find(o => o.value.toLowerCase() === cleanVal);
  if (byValue) return byValue.label;

  const normVal = cleanVal.replace(/[\s\-_]+/g, '');
  const byNorm = options.find(o => 
    o.label.toLowerCase().replace(/[\s\-_]+/g, '') === normVal ||
    o.value.toLowerCase().replace(/[\s\-_]+/g, '') === normVal
  );
  if (byNorm) return byNorm.label;

  return val;
};

// Populate data when modal opens
  useEffect(() => {
    if (siswa) {
      setFormData({
        nik: siswa.nik || '',
        nisn: siswa.nisn || '',
        tempat_lahir: siswa.tempat_lahir || '',
        tanggal_lahir: siswa.tanggal_lahir ? String(siswa.tanggal_lahir).split('T')[0] : '',
        jenis_kelamin: siswa.jenis_kelamin || 'L',
        no_hp: siswa.no_hp || '',
        tinggi_badan: siswa.tinggi_badan ?? '',
        berat_badan: siswa.berat_badan ?? '',
        agama: matchOptionValue(siswa.agama, AGAMA_OPTIONS) || 'Islam',
        hobi: siswa.hobi || '',
        cita_cita: siswa.cita_cita || '',

        alamat: siswa.alamat || '',
        dusun: siswa.dusun || '',
        kelurahan: siswa.kelurahan || '',
        kecamatan: siswa.kecamatan || '',
        kabupaten: siswa.kabupaten || '',
        provinsi: matchOptionValue(siswa.provinsi, PROVINSI_INDONESIA_OPTIONS) || 'Jawa Barat',
        rt: siswa.rt || '',
        rw: siswa.rw || '',
        kode_pos: siswa.kode_pos || '',
        transportasi: matchOptionValue(siswa.transportasi, TRANSPORTASI_OPTIONS),

        is_osis: !!siswa.is_osis,
        is_mpk: !!siswa.is_mpk,
        ekskul_1: siswa.ekskul_1 || '',
        ekskul_2: siswa.ekskul_2 || '',

        nama_ayah: siswa.nama_ayah || '',
        nik_ayah: siswa.nik_ayah || '',
        pekerjaan_ayah: matchOptionValue(siswa.pekerjaan_ayah, PEKERJAAN_OPTIONS),
        no_hp_ayah: siswa.no_hp_ayah || '',
        nama_ibu: siswa.nama_ibu || '',
        nik_ibu: siswa.nik_ibu || '',
        pekerjaan_ibu: matchOptionValue(siswa.pekerjaan_ibu, PEKERJAAN_OPTIONS),
        no_hp_ibu: siswa.no_hp_ibu || '',
        nama_wali: siswa.nama_wali || '',
        nik_wali: siswa.nik_wali || '',
        hubungan_wali: matchOptionValue(siswa.hubungan_wali, HUBUNGAN_WALI_OPTIONS),
        pekerjaan_wali: matchOptionValue(siswa.pekerjaan_wali, PEKERJAAN_OPTIONS),
        no_hp_wali: siswa.no_hp_wali || '',
      });
      setSelectedPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [siswa, isOpen]);

  // Live completeness calculation
  const liveCompleteness = useMemo(() => {
    return calculateProfileCompleteness({ ...siswa, ...formData });
  }, [siswa, formData]);

  const updateMutationMe = useUpdateSiswaMe();

  const getPreparedPayload = () => {
    return {
      ...formData,
      tinggi_badan: formData.tinggi_badan === '' || formData.tinggi_badan === null ? null : Number(formData.tinggi_badan),
      berat_badan: formData.berat_badan === '' || formData.berat_badan === null ? null : Number(formData.berat_badan),
      anak_ke: formData.anak_ke === '' || formData.anak_ke === null ? null : Number(formData.anak_ke),
      tanggal_lahir: formData.tanggal_lahir || null,
    };
  };

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmitFinal = async () => {
    try {
      if (selectedPhotoFile && siswa?.id) {
        try {
          await uploadSiswaDocument({
            siswaId: siswa.id,
            file: selectedPhotoFile,
            kategori: 'FOTO',
            judul: `Foto Profil - ${siswa.nama || 'Siswa'}`,
          });
        } catch (err) {
          console.error('Failed uploading photo document', err);
        }
      }

      if (siswa?.id === 'demo-siswa-id') {
        toast.success('Data profil berhasil disimpan!');
        onClose();
        return;
      }

      const payload = getPreparedPayload();
      
      // If siswaId is explicitly provided (e.g. edited by Wali Kelas or Admin)
      if (siswa?.id) {
        await updateSiswa(siswa.id, payload as any);
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
        queryClient.invalidateQueries({ queryKey: ['walas-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['siswa-detail'] });
        queryClient.invalidateQueries({ queryKey: ['siswa-detail', siswa.id] });
      } else {
        await updateMutationMe.mutateAsync(payload as any);
        queryClient.invalidateQueries({ queryKey: SISWA_ME_QUERY_KEY });
      }
      
      toast.success('Biodata siswa berhasil diperbarui!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui data siswa');
    }
  };

  const sectionMeta = {
    pribadi: {
      title: 'Edit Data Pribadi',
      badge: 'SEKSI DATA PRIBADI',
      icon: User,
      color: 'emerald',
    },
    ekskul: {
      title: 'Edit Organisasi & Ekstrakurikuler',
      badge: 'SEKSI ORGANISASI & EKSKUL',
      icon: Users,
      color: 'indigo',
    },
    identitas: {
      title: 'Edit Identitas & Foto Profil Siswa',
      badge: 'SEKSI IDENTITAS & FOTO',
      icon: User,
      color: 'emerald',
    },
    biodata: {
      title: 'Edit Identitas & Foto Profil Siswa',
      badge: 'SEKSI IDENTITAS & FOTO',
      icon: User,
      color: 'emerald',
    },
    kontak: {
      title: 'Edit Kontak & Alamat Rumah',
      badge: 'SEKSI KONTAK & ALAMAT',
      icon: MapPin,
      color: 'sky',
    },
    orangtua: {
      title: 'Edit Data Orang Tua / Wali',
      badge: 'SEKSI ORANG TUA / WALI',
      icon: Heart,
      color: 'amber',
    },
    all: {
      title: step === 1 ? 'Data Pribadi & Identitas Induk' : step === 2 ? 'Alamat & Domisili Tempat Tinggal' : 'Data Orang Tua / Wali Murid & Ekskul',
      badge: 'EDIT PROFIL SISWA',
      icon: Sparkles,
      color: 'emerald',
    }
  }[activeSection] || {
    title: 'Edit Profil Siswa',
    badge: 'EDIT PROFIL SISWA',
    icon: Sparkles,
    color: 'emerald',
  };

  const SectionIcon = sectionMeta.icon || Sparkles;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto text-slate-800 dark:text-slate-100"
      >
        {/* CLEAN MINIMALIST HEADER */}
        <div className="px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {studentName ? `Edit Biodata: ${studentName}` : sectionMeta.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {studentKelas ? `Kelas ${studentKelas}` : ''} {studentNisn ? `• NISN: ${studentNisn}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* CLEAN STEP TABS (Only visible when editing full profile) */}
        {activeSection === 'all' && (
          <div className="px-5 pt-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  "pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  step === 1
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <span>1. Data Pribadi</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={cn(
                  "pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  step === 2
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <span>2. Alamat & Domisili</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={cn(
                  "pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  step === 3
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                <span>3. Orang Tua & Wali</span>
              </button>
            </div>
          </div>
        )}

        {/* BODY CONTENT AREA */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* FOCUSED SECTION 1: DATA PRIBADI & IDENTITAS */}
          {(activeSection === 'pribadi' || activeSection === 'identitas' || activeSection === 'biodata' || (activeSection === 'all' && step === 1)) && (
            <motion.div
              key="sec-pribadi"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              {/* Compact Photo Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {photoPreview || (siswa as any)?.foto || (siswa as any)?.foto_url ? (
                    <img
                      src={photoPreview || resolveProfilePhotoUrl((siswa as any)?.foto || (siswa as any)?.foto_url)}
                      alt="Foto Profil Siswa"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-lg shadow-xs">
                      {siswa?.nama ? siswa.nama.charAt(0) : 'S'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Foto Profil / Pas Foto</h4>
                  <p className="text-[11px] text-slate-400">JPG/PNG maks. 5 MB untuk raport & kartu pelajar</p>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowWebcamModal(true)}
                      className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      <Camera size={13} />
                      <span>Kamera</span>
                    </button>

                    <label className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95">
                      <Upload size={13} />
                      <span>Pilih File</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    {selectedPhotoFile && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        ✓ Siap Disimpan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <CreditCard size={13} className="text-emerald-500" />
                    <span>NIK (Nomor Induk Kependudukan)</span>
                    {renderFieldStatusBadge(formData.nik)}
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nik}
                    onChange={e => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="16 digit NIK..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <CreditCard size={13} className="text-indigo-500" />
                    <span>NISN (Nasional)</span>
                    {renderFieldStatusBadge(formData.nisn)}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.nisn}
                    onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="10 digit NISN..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <Phone size={13} className="text-emerald-500" />
                    <span>No. HP / WhatsApp Siswa</span>
                    {renderFieldStatusBadge(formData.no_hp)}
                  </label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                    placeholder="Contoh: 087713346462"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <User size={13} className="text-indigo-500" />
                    <span>Jenis Kelamin</span>
                    {renderFieldStatusBadge(formData.jenis_kelamin)}
                  </label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={e => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <MapPin size={13} className="text-sky-500" />
                    <span>Tempat Lahir</span>
                    {renderFieldStatusBadge(formData.tempat_lahir)}
                  </label>
                  <input
                    type="text"
                    value={formData.tempat_lahir}
                    onChange={e => setFormData({ ...formData, tempat_lahir: e.target.value })}
                    placeholder="Kota/Kabupaten kelahiran..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <Calendar size={13} className="text-amber-500" />
                    <span>Tanggal Lahir</span>
                    {renderFieldStatusBadge(formData.tanggal_lahir)}
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={e => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <Ruler size={13} className="text-emerald-500" />
                    <span>Tinggi Badan (cm)</span>
                    {renderFieldStatusBadge(formData.tinggi_badan)}
                  </label>
                  <input
                    type="number"
                    value={formData.tinggi_badan}
                    onChange={e => setFormData({ ...formData, tinggi_badan: e.target.value })}
                    placeholder="Contoh: 168"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <Weight size={13} className="text-blue-500" />
                    <span>Berat Badan (kg)</span>
                    {renderFieldStatusBadge(formData.berat_badan)}
                  </label>
                  <input
                    type="number"
                    value={formData.berat_badan}
                    onChange={e => setFormData({ ...formData, berat_badan: e.target.value })}
                    placeholder="Contoh: 55"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <span>Agama</span>
                    {renderFieldStatusBadge(formData.agama)}
                  </label>
                  <select
                    value={formData.agama}
                    onChange={e => setFormData({ ...formData, agama: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="">-- Pilih Agama --</option>
                    {AGAMA_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.label}>{opt.label}</option>
                    ))}
                    {formData.agama && !AGAMA_OPTIONS.some(o => o.label.toLowerCase() === formData.agama.toLowerCase() || o.value.toLowerCase() === formData.agama.toLowerCase()) && (
                      <option value={formData.agama}>{formData.agama}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <span>Hobi / Kegemaran</span>
                    {renderFieldStatusBadge(formData.hobi)}
                  </label>
                  <input
                    type="text"
                    value={formData.hobi}
                    onChange={e => setFormData({ ...formData, hobi: e.target.value })}
                    placeholder="Contoh: Main Bola, Membaca..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <span>Cita-cita</span>
                    {renderFieldStatusBadge(formData.cita_cita)}
                  </label>
                  <input
                    type="text"
                    value={formData.cita_cita}
                    onChange={e => setFormData({ ...formData, cita_cita: e.target.value })}
                    placeholder="Contoh: Ingin menjadi TNI, Dokter, Programmer..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* FOCUSED SECTION 2: ORGANISASI DAN EKSTRAKURIKULER */}
          {(activeSection === 'ekskul' || (activeSection === 'all' && step === 3)) && (
            <motion.div
              key="sec-ekskul"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Users size={14} /> Keanggotaan Organisasi
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Anggota OSIS</span>
                    <select
                      value={formData.is_osis ? '1' : '0'}
                      onChange={e => setFormData({ ...formData, is_osis: e.target.value === '1' })}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                    >
                      <option value="0">Tidak</option>
                      <option value="1">Ya (Aktif)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Anggota MPK</span>
                    <select
                      value={formData.is_mpk ? '1' : '0'}
                      onChange={e => setFormData({ ...formData, is_mpk: e.target.value === '1' })}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                    >
                      <option value="0">Tidak</option>
                      <option value="1">Ya (Aktif)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Pilihan Ekstrakurikuler
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Ekstrakurikuler 1 (Utama)</label>
                    {eskulOptions.length > 0 ? (
                      <select
                        value={formData.ekskul_1}
                        onChange={e => setFormData({ ...formData, ekskul_1: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">-- Pilih Ekstrakurikuler Utama --</option>
                        {formData.ekskul_1 && !eskulOptions.some(o => o.value === formData.ekskul_1) && (
                          <option value={formData.ekskul_1}>{formData.ekskul_1}</option>
                        )}
                        {eskulOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.ekskul_1}
                        onChange={e => setFormData({ ...formData, ekskul_1: e.target.value })}
                        placeholder="Contoh: Pramuka, PMR..."
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Ekstrakurikuler 2 (Pilihan)</label>
                    {eskulOptions.length > 0 ? (
                      <select
                        value={formData.ekskul_2}
                        onChange={e => setFormData({ ...formData, ekskul_2: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">-- Pilih Ekstrakurikuler Pilihan (Opsional) --</option>
                        {formData.ekskul_2 && !eskulOptions.some(o => o.value === formData.ekskul_2) && (
                          <option value={formData.ekskul_2}>{formData.ekskul_2}</option>
                        )}
                        {eskulOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.ekskul_2}
                        onChange={e => setFormData({ ...formData, ekskul_2: e.target.value })}
                        placeholder="Contoh: Futsal, Basket, Paskibra..."
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FOCUSED SECTION 3: KONTAK & ALAMAT (HIERARCHICAL CASCADING FLOW) */}
          {(activeSection === 'alamat' || (activeSection === 'all' && step === 2)) && (
            <motion.div
              key="sec-alamat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. PROVINSI (Paling Utama / Pertama) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    1. Provinsi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.provinsi}
                    onChange={e => setFormData({ ...formData, provinsi: e.target.value, kabupaten: '', kecamatan: '', kelurahan: '' })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="">-- Pilih Provinsi --</option>
                    {PROVINSI_INDONESIA_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 2. KABUPATEN / KOTA (Tersaring Otomatis Berdasarkan Provinsi) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Kabupaten / Kota
                  </label>
                  <select
                    value={formData.kabupaten}
                    onChange={e => setFormData({ ...formData, kabupaten: e.target.value, kecamatan: '', kelurahan: '' })}
                    disabled={!formData.provinsi}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  >
                    <option value="">{formData.provinsi ? (kabupatenOptions.length > 0 ? '-- Pilih Kabupaten/Kota --' : 'Memuat Kota...') : '-- Pilih Provinsi Terlebih Dahulu --'}</option>
                    {kabupatenOptions.map(opt => (
                      <option key={opt.value} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 3. KECAMATAN (Tersaring Otomatis Berdasarkan Kabupaten / Fallback Text Input) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Kecamatan
                    </label>
                    {formData.kabupaten && !loadingKecamatan && kecamatanOptions.length === 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Ketik nama kecamatan
                      </span>
                    )}
                  </div>

                  {formData.kabupaten && !loadingKecamatan && kecamatanOptions.length === 0 ? (
                    <input
                      type="text"
                      value={formData.kecamatan}
                      onChange={e => setFormData({ ...formData, kecamatan: e.target.value, kelurahan: '', kode_pos: '' })}
                      placeholder="Ketik nama Kecamatan..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  ) : (
                    <select
                      value={formData.kecamatan}
                      onChange={e => setFormData({ ...formData, kecamatan: e.target.value, kelurahan: '', kode_pos: '' })}
                      disabled={!formData.kabupaten || loadingKecamatan}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {!formData.kabupaten
                          ? '-- Pilih Kota/Kabupaten Terlebih Dahulu --'
                          : loadingKecamatan
                          ? 'Memuat Kecamatan...'
                          : '-- Pilih Kecamatan --'}
                      </option>
                      {formData.kecamatan && !kecamatanOptions.some(o => o.value === formData.kecamatan || o.label === formData.kecamatan) && (
                        <option value={formData.kecamatan}>{formData.kecamatan}</option>
                      )}
                      {kecamatanOptions.map(opt => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. KELURAHAN / DESA (Tersaring Otomatis Berdasarkan Database / Fallback Text Input) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      4. Kelurahan / Desa
                    </label>
                    {formData.kecamatan && !loadingKelurahan && kelurahanOptions.length === 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Ketik nama desa
                      </span>
                    )}
                  </div>

                  {formData.kecamatan && !loadingKelurahan && kelurahanOptions.length === 0 ? (
                    <input
                      type="text"
                      value={formData.kelurahan}
                      onChange={e => setFormData({ ...formData, kelurahan: e.target.value })}
                      placeholder="Ketik nama Kelurahan / Desa..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  ) : (
                    <select
                      value={formData.kelurahan}
                      onChange={e => setFormData({ ...formData, kelurahan: e.target.value })}
                      disabled={!formData.kecamatan || loadingKelurahan}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {!formData.kecamatan
                          ? '-- Pilih Kecamatan Terlebih Dahulu --'
                          : loadingKelurahan
                          ? 'Memuat Desa...'
                          : '-- Pilih Kelurahan/Desa --'}
                      </option>
                      {formData.kelurahan && !kelurahanOptions.some(o => o.value === formData.kelurahan || o.label === formData.kelurahan) && (
                        <option value={formData.kelurahan}>{formData.kelurahan}</option>
                      )}
                      {kelurahanOptions.map(opt => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* RT & RW (Tepat Setelah Kelurahan/Desa) & KODE POS (Auto-Detect) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">RT</label>
                  <input
                    type="text"
                    value={formData.rt}
                    onChange={e => setFormData({ ...formData, rt: e.target.value })}
                    placeholder="001"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">RW</label>
                  <input
                    type="text"
                    value={formData.rw}
                    onChange={e => setFormData({ ...formData, rw: e.target.value })}
                    placeholder="002"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Kode Pos <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.kode_pos}
                    onChange={e => setFormData({ ...formData, kode_pos: e.target.value })}
                    placeholder="41162"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* 5. ALAMAT JALAN / KAMPUNG / PATOKAN RUMAH */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  5. Alamat Jalan / Kampung / Patokan Rumah
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat || formData.dusun}
                  onChange={e => setFormData({ ...formData, alamat: e.target.value, dusun: e.target.value })}
                  placeholder="Contoh: Kp. Cihampelas No. 11 atau Jl. Merdeka No. 45..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Moda Transportasi Ke Sekolah</label>
                <select
                  value={formData.transportasi}
                  onChange={e => setFormData({ ...formData, transportasi: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  <option value="">-- Pilih Transportasi --</option>
                  {TRANSPORTASI_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.label}>{opt.label}</option>
                  ))}
                  {formData.transportasi && !TRANSPORTASI_OPTIONS.some(o => o.label.toLowerCase() === formData.transportasi.toLowerCase() || o.value.toLowerCase() === formData.transportasi.toLowerCase()) && (
                    <option value={formData.transportasi}>{formData.transportasi}</option>
                  )}
                </select>
              </div>
            </motion.div>
          )}

          {/* FOCUSED SECTION 4: ORANG TUA / WALI MURID */}
          {(activeSection === 'orangtua' || (activeSection === 'all' && step === 3)) && (
            <motion.div
              key="sec-orangtua"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AYAH */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <User size={14} /> Data Ayah Kandung
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Nama Ayah</label>
                    <input
                      type="text"
                      value={formData.nama_ayah}
                      onChange={e => setFormData({ ...formData, nama_ayah: e.target.value })}
                      placeholder="Nama lengkap ayah..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">No. HP / WA Ayah</label>
                    <input
                      type="text"
                      value={formData.no_hp_ayah}
                      onChange={e => setFormData({ ...formData, no_hp_ayah: e.target.value })}
                      placeholder="087779902007..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Pekerjaan Ayah</label>
                    <select
                      value={formData.pekerjaan_ayah}
                      onChange={e => setFormData({ ...formData, pekerjaan_ayah: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">-- Pilih Pekerjaan Ayah --</option>
                      {PEKERJAAN_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                      {formData.pekerjaan_ayah && !PEKERJAAN_OPTIONS.some(o => o.label.toLowerCase() === formData.pekerjaan_ayah.toLowerCase() || o.value.toLowerCase() === formData.pekerjaan_ayah.toLowerCase()) && (
                        <option value={formData.pekerjaan_ayah}>{formData.pekerjaan_ayah}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* IBU */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <User size={14} /> Data Ibu Kandung
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Nama Ibu</label>
                    <input
                      type="text"
                      value={formData.nama_ibu}
                      onChange={e => setFormData({ ...formData, nama_ibu: e.target.value })}
                      placeholder="Nama lengkap ibu..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">No. HP / WA Ibu</label>
                    <input
                      type="text"
                      value={formData.no_hp_ibu}
                      onChange={e => setFormData({ ...formData, no_hp_ibu: e.target.value })}
                      placeholder="082122319562..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Pekerjaan Ibu</label>
                    <select
                      value={formData.pekerjaan_ibu}
                      onChange={e => setFormData({ ...formData, pekerjaan_ibu: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">-- Pilih Pekerjaan Ibu --</option>
                      {PEKERJAAN_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                      ))}
                      {formData.pekerjaan_ibu && !PEKERJAAN_OPTIONS.some(o => o.label.toLowerCase() === formData.pekerjaan_ibu.toLowerCase() || o.value.toLowerCase() === formData.pekerjaan_ibu.toLowerCase()) && (
                        <option value={formData.pekerjaan_ibu}>{formData.pekerjaan_ibu}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* WALI MURID */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 sm:col-span-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <User size={14} /> Data Wali Murid (Opsional)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Nama Wali</label>
                      <input
                        type="text"
                        value={formData.nama_wali}
                        onChange={e => setFormData({ ...formData, nama_wali: e.target.value })}
                        placeholder="Nama lengkap wali (jika ada)..."
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Hubungan Dengan Siswa</label>
                      <select
                        value={formData.hubungan_wali}
                        onChange={e => setFormData({ ...formData, hubungan_wali: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">-- Pilih Hubungan --</option>
                        {HUBUNGAN_WALI_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.label}>{opt.label}</option>
                        ))}
                        {formData.hubungan_wali && !HUBUNGAN_WALI_OPTIONS.some(o => o.label.toLowerCase() === formData.hubungan_wali.toLowerCase() || o.value.toLowerCase() === formData.hubungan_wali.toLowerCase()) && (
                          <option value={formData.hubungan_wali}>{formData.hubungan_wali}</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">No. HP / WA Wali</label>
                      <input
                        type="text"
                        value={formData.no_hp_wali}
                        onChange={e => setFormData({ ...formData, no_hp_wali: e.target.value })}
                        placeholder="No HP / WhatsApp wali..."
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Pekerjaan Wali</label>
                      <select
                        value={formData.pekerjaan_wali}
                        onChange={e => setFormData({ ...formData, pekerjaan_wali: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">-- Pilih Pekerjaan Wali --</option>
                        {PEKERJAAN_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.label}>{opt.label}</option>
                        ))}
                        {formData.pekerjaan_wali && !PEKERJAAN_OPTIONS.some(o => o.label.toLowerCase() === formData.pekerjaan_wali.toLowerCase() || o.value.toLowerCase() === formData.pekerjaan_wali.toLowerCase()) && (
                          <option value={formData.pekerjaan_wali}>{formData.pekerjaan_wali}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <span>Batal</span>
            </Button>

            {activeSection === 'all' && step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Sebelumnya</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeSection === 'all' && step < 3 && (
              <Button
                type="button"
                onClick={handleNext}
                className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5"
              >
                <span>Selanjutnya</span>
                <ArrowRight size={14} />
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSubmitFinal}
              disabled={updateMutationMe.isPending}
              className="h-10 px-5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Save size={14} />
              <span>{updateMutationMe.isPending ? 'Simpan Data...' : 'Simpan Perubahan'}</span>
            </Button>
          </div>
        </div>
      </motion.div>
      <WebcamModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onCapture={(file) => {
          setSelectedPhotoFile(file);
          setPhotoPreview(URL.createObjectURL(file));
        }}
      />
    </div>
  );
};
