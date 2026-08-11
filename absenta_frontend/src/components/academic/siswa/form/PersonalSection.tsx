import React, { useRef, useState, useEffect } from 'react';
import { Hash, User as UserIcon, Phone, MapPin, Calendar, Users, Bus, Radio, Home, Mail, Camera, Upload, Trash2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Label } from '../../../ui/Label';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { Controller, UseFormRegister, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { 
  JENIS_KELAMIN_OPTIONS, 
  TRANSPORTASI_OPTIONS, 
  PROVINSI_INDONESIA_OPTIONS,
  getProvinsiOptions,
  getKabupatenOptions,
  getKecamatanOptions,
  getKelurahanOptions,
  getSmartKodePos,
  DropdownOption
} from '../../../../api/dropdown.api';
import { SiswaFormValues } from '../../../../schemas/academic/siswa.schema';
import { SectionCard, DetailRow } from './FormShared';
import { requestWithFallback } from '../../../../api/apiUtils';
import toast from 'react-hot-toast';
import { resolveProfilePhotoUrl } from '../../../../lib/utils';

interface PersonalSectionProps {
    register: UseFormRegister<SiswaFormValues>;
    control: Control<SiswaFormValues>;
    errors: FieldErrors<SiswaFormValues>;
    isViewMode: boolean;
    watch: UseFormWatch<SiswaFormValues>;
    setValue: any;
    siswaId?: string;
}

export const PersonalSection: React.FC<PersonalSectionProps> = React.memo(({
    register,
    control,
    errors,
    isViewMode,
    watch,
    setValue,
    siswaId
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentFoto, setCurrentFoto] = useState<string>(watch('foto') || '');
    const [adminProvinsiOptions, setAdminProvinsiOptions] = useState<DropdownOption[]>(PROVINSI_INDONESIA_OPTIONS);
    const [adminKabupatenOptions, setAdminKabupatenOptions] = useState<DropdownOption[]>([]);
    const [adminKecamatanOptions, setAdminKecamatanOptions] = useState<DropdownOption[]>([]);
    const [adminKelurahanOptions, setAdminKelurahanOptions] = useState<DropdownOption[]>([]);
    const selectedProvinsi = watch('provinsi');
    const selectedKabupaten = watch('kabupaten');
    const selectedKecamatan = watch('kecamatan');
    const selectedKelurahan = watch('kelurahan');

    useEffect(() => {
        getProvinsiOptions().then(opts => {
            if (opts && opts.length > 0) {
                setAdminProvinsiOptions(opts);
            }
        });
    }, []);

    const getEffectiveOptions = (options: DropdownOption[], currentValue?: string): DropdownOption[] => {
        if (!currentValue) return options;
        const exists = options.some(opt => 
            opt.value.toLowerCase() === currentValue.toLowerCase() || 
            opt.label.toLowerCase() === currentValue.toLowerCase()
        );
        if (!exists) {
            return [{ value: currentValue, label: currentValue }, ...options];
        }
        return options;
    };

    useEffect(() => {
        if (selectedProvinsi) {
            getKabupatenOptions(selectedProvinsi).then(opts => setAdminKabupatenOptions(opts));
        } else {
            setAdminKabupatenOptions([]);
        }
    }, [selectedProvinsi]);

    useEffect(() => {
        if (selectedKabupaten) {
            getKecamatanOptions(selectedKabupaten).then(opts => setAdminKecamatanOptions(opts));
        } else {
            setAdminKecamatanOptions([]);
        }
    }, [selectedKabupaten]);

    useEffect(() => {
        if (selectedKecamatan) {
            getKelurahanOptions(selectedKecamatan, selectedKabupaten).then(opts => setAdminKelurahanOptions(opts));
        } else {
            setAdminKelurahanOptions([]);
        }
    }, [selectedKecamatan, selectedKabupaten]);

    useEffect(() => {
        if (selectedKecamatan) {
            getSmartKodePos(selectedKecamatan, selectedKelurahan, selectedKabupaten).then(code => {
                if (code) {
                    setValue('kode_pos', code);
                }
            });
        }
    }, [selectedKecamatan, selectedKelurahan, selectedKabupaten]);

    useEffect(() => {
        setCurrentFoto(watch('foto') || '');
    }, [watch('foto')]);
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const handleUploadTrigger = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleUploadFile(file);
        }
    };

    const handleUploadFile = async (file: File) => {
        try {
            toast.loading('Mengunggah foto...', { id: 'upload-photo' });
            
            if (siswaId) {
                const { uploadSiswaDocument } = await import('../../../../api/memberDocs.api');
                const uploadRes = await uploadSiswaDocument({
                    siswaId,
                    file,
                    judul: 'Foto Formal - Siswa',
                    kategori: 'FOTO'
                });
                
                if (uploadRes.success && uploadRes.data) {
                    const downloadUrl = `/academic/siswa/${siswaId}/documents/${uploadRes.data.id}/download`;
                    setValue('foto', downloadUrl);
                    setCurrentFoto(downloadUrl);
                    toast.success('Foto berhasil diperbarui & disinkronkan', { id: 'upload-photo' });
                } else {
                    toast.error('Gagal mengunggah foto', { id: 'upload-photo' });
                }
            } else {
                const formData = new FormData();
                formData.append('file', file);
                
                const res = await requestWithFallback<{ success: boolean; message: string; data: { url: string } }>('post', '/upload', {
                    data: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (res.success && res.data?.url) {
                    setValue('foto', res.data.url);
                    setCurrentFoto(res.data.url);
                    toast.success('Foto berhasil diperbarui', { id: 'upload-photo' });
                } else {
                    toast.error(res?.message || 'Gagal mengunggah foto. Layanan penyimpanan media belum siap.', { id: 'upload-photo', duration: 5000 });
                }
            }
        } catch (err: any) {
            console.error('Error uploading photo:', err);
            const status = err?.response?.status;
            const backendMsg = err?.response?.data?.message || err?.message || '';

            if (status === 500 || backendMsg.includes('storage') || backendMsg.includes('500') || backendMsg.includes('Internal Server Error')) {
                toast.error('Layanan Penyimpanan File (Storage Server) belum aktif atau mengalami kendala internal. Harap hubungi Administrator.', { id: 'upload-photo', duration: 6000 });
            } else if (status === 413 || backendMsg.includes('too large')) {
                toast.error('Ukuran file terlalu besar. Maksimum ukuran file foto adalah 5MB.', { id: 'upload-photo', duration: 5000 });
            } else {
                toast.error(`Gagal mengunggah foto: ${backendMsg || 'Koneksi ke server terputus.'}`, { id: 'upload-photo', duration: 5000 });
            }
        }
    };

    const handleWebcamTrigger = () => {
        setIsWebcamOpen(true);
        setTimeout(() => {
            startWebcam();
        }, 100);
    };

    const handleStartCamera = () => {
        startWebcam();
    };

    const startWebcam = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 480, height: 640, facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Error starting webcam:', err);
            toast.error('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
            setIsWebcamOpen(false);
        }
    };

    const stopWebcam = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCloseWebcam = () => {
        setIsWebcamOpen(false);
        stopWebcam();
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 300;
                canvas.height = 400;
                
                const vW = video.videoWidth;
                const vH = video.videoHeight;
                const targetAspect = 3 / 4;
                
                let sourceX = 0;
                let sourceY = 0;
                let sourceW = vW;
                let sourceH = vH;
                
                if (vW / vH > targetAspect) {
                    sourceW = vH * targetAspect;
                    sourceX = (vW - sourceW) / 2;
                } else {
                    sourceH = vW / targetAspect;
                    sourceY = (vH - sourceH) / 2;
                }
                
                ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, 300, 400);
                
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' });
                        await handleUploadFile(file);
                    }
                }, 'image/jpeg', 0.9);
                
                setIsWebcamOpen(false);
                stopWebcam();
            }
        }
    };

    const handleRemovePhoto = async () => {
        setValue('foto', '');
        setCurrentFoto('');
        toast.success('Foto dihapus');

        if (isViewMode && siswaId) {
            try {
                toast.loading('Menghapus dari database...', { id: 'save-photo' });
                const { updateSiswa } = await import('../../../../api/academic/siswa.api');
                await updateSiswa(siswaId, { foto: '' });
                toast.success('Foto berhasil dihapus dari database', { id: 'save-photo' });
            } catch (dbErr) {
                console.error('Failed to remove photo from DB:', dbErr);
                toast.error('Gagal menghapus foto dari database', { id: 'save-photo' });
            }
        }
    };

    if (isViewMode) {
        return (
            <div className="space-y-6">
                {/* Premium Photo Header View */}
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                    <div className="relative w-32 h-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 group">
                        {currentFoto ? (
                            <img src={resolveProfilePhotoUrl(currentFoto)} alt="Foto Siswa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="text-center p-3 text-slate-400">
                                <UserIcon size={32} className="mx-auto mb-2 opacity-40" />
                                <span className="text-[8px] font-black uppercase tracking-wider block">Belum ada foto</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <h4 className="text-xs font-black text-slate-955 dark:text-slate-100 uppercase tracking-widest">Foto Resmi Siswa</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter leading-relaxed max-w-md">
                            Foto ini terintegrasi penuh ke semua modul, termasuk kartu identitas elektronik dan verifikasi absensi gerbang otomatis.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start pt-1">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${currentFoto ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                {currentFoto ? 'Terverifikasi' : 'Belum Terunggah'}
                            </span>
                            <Button
                                type="button"
                                onClick={handleUploadTrigger}
                                className="rounded-xl h-9 px-3.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5"
                            >
                                <Upload size={12} />
                                Upload Foto
                            </Button>
                            <Button
                                type="button"
                                onClick={handleWebcamTrigger}
                                className="rounded-xl h-9 px-3.5 text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 bg-white dark:bg-slate-900"
                            >
                                <Camera size={12} />
                                Ambil dari Kamera
                            </Button>
                            {currentFoto && (
                                <Button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="rounded-xl h-9 px-3.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5"
                                >
                                    <Trash2 size={12} />
                                    Hapus
                                </Button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Webcam Camera Capture Modal Overlay */}
                <Modal
                    isOpen={isWebcamOpen}
                    onClose={handleCloseWebcam}
                    title="Ambil Foto Siswa"
                    size="md"
                >
                    <div className="space-y-6 pt-4 text-center">
                        <div className="relative aspect-[3/4] max-w-[300px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover scale-x-[-1]"
                            />
                            <div className="absolute inset-0 border-2 border-dashed border-white/60 pointer-events-none rounded-xl m-4 flex items-center justify-center">
                                <div className="text-[9px] font-black text-white/50 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">
                                    Posisikan Wajah di Tengah
                                </div>
                            </div>
                        </div>
                        
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                type="button"
                                onClick={handleCloseWebcam}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800"
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCapture}
                                className="flex-1 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/15 flex items-center justify-center gap-2"
                            >
                                <Camera size={14} />
                                Ambil Foto
                            </Button>
                        </div>
                    </div>
                </Modal>

                <SectionCard title="Informasi Pribadi Siswa" icon={UserIcon}>
                    <DetailRow icon={<Hash size={16} />} label="NIS" value={watch('nis')} />
                    <DetailRow icon={<Hash size={16} />} label="NISN" value={watch('nisn') || '-'} />
                    <DetailRow icon={<Hash size={16} />} label="NIK" value={watch('nik') || '-'} />
                    <DetailRow icon={<UserIcon size={16} />} label="Nama Lengkap" value={watch('nama_siswa')} />
                    <DetailRow icon={<UserIcon size={16} />} label="Tinggi Badan" value={watch('tinggi_badan') ? `${watch('tinggi_badan')} cm` : '-'} />
                    <DetailRow icon={<UserIcon size={16} />} label="Berat Badan" value={watch('berat_badan') ? `${watch('berat_badan')} kg` : '-'} />
                    <DetailRow icon={<Mail size={16} />} label="Email Pengguna (User)" value={watch('email') || '-'} />
                    <DetailRow icon={<Phone size={16} />} label="Nomor HP" value={watch('no_hp')} />
                    <DetailRow icon={<MapPin size={16} />} label="Tempat Lahir" value={watch('tempat_lahir')} />
                    <DetailRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={watch('tanggal_lahir')} />
                    <DetailRow icon={<Users size={16} />} label="Jenis Kelamin" value={(JENIS_KELAMIN_OPTIONS || []).find(o => o.value === watch('jenis_kelamin'))?.label} />
                    <DetailRow icon={<Bus size={16} />} label="Transportasi" value={(TRANSPORTASI_OPTIONS || []).find(o => o.value === watch('transportasi'))?.label} />
                    <DetailRow icon={<Home size={16} />} label="Alamat" value={watch('alamat')} />
                    <DetailRow icon={<MapPin size={16} />} label="Lintang (Latitude)" value={watch('lintang') || '-'} />
                    <DetailRow icon={<MapPin size={16} />} label="Bujur (Longitude)" value={watch('bujur') || '-'} />
                    <DetailRow icon={<MapPin size={16} />} label="Koordinat" value={watch('koordinat') || (watch('lintang') ? `${watch('lintang')}, ${watch('bujur')}` : '-')} />
                </SectionCard>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Photo Header Edit/Capture Panel */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="relative w-32 h-40 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0 group">
                    {currentFoto ? (
                        <img src={resolveProfilePhotoUrl(currentFoto)} alt="Foto Siswa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="text-center p-3 text-slate-400">
                            <UserIcon size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-wider block">Belum ada foto</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Foto Profil Siswa</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tighter leading-relaxed max-w-md">
                        Unggah foto berformat JPG/PNG atau tangkap langsung dari webcam untuk memperbarui foto pelajar siswa.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start pt-1">
                        <Button
                            type="button"
                            onClick={handleUploadTrigger}
                            className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10 flex items-center gap-2"
                        >
                            <Upload size={12} />
                            Upload Foto
                        </Button>
                        <Button
                            type="button"
                            onClick={handleWebcamTrigger}
                            className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
                        >
                            <Camera size={12} />
                            Ambil dari Kamera
                        </Button>
                        {currentFoto && (
                            <Button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                            >
                                <Trash2 size={12} />
                                Hapus
                            </Button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            <SectionCard title="Informasi Utama Siswa" icon={UserIcon}>
                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="nis" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Nomor Induk Siswa (NIS)
                        </Label>
                    </div>
                    <Input
                        id="nis"
                        {...register('nis')}
                        placeholder="Masukkan NIS..."
                        disabled={isViewMode}
                        className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nis ? 'border-red-500' : ''}`}
                    />
                    {errors.nis && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nis.message}</p>
                    )}
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="nisn" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            NISN (Nasional)
                        </Label>
                    </div>
                    <Input
                        id="nisn"
                        {...register('nisn')}
                        placeholder="Masukkan NISN..."
                        disabled={isViewMode}
                        className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nisn ? 'border-red-500' : ''}`}
                    />
                    {errors.nisn && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nisn.message}</p>
                    )}
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="nik" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            NIK (Nomor Induk Kependudukan)
                        </Label>
                    </div>
                    <Input
                        id="nik"
                        {...register('nik')}
                        placeholder="16 digit NIK..."
                        disabled={isViewMode}
                        className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nik ? 'border-red-500' : ''}`}
                    />
                    {errors.nik && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nik.message}</p>
                    )}
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="tinggi_badan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Tinggi Badan (cm)
                        </Label>
                    </div>
                    <Input
                        id="tinggi_badan"
                        type="number"
                        {...register('tinggi_badan')}
                        placeholder="Contoh: 165"
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="berat_badan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Berat Badan (kg)
                        </Label>
                    </div>
                    <Input
                        id="berat_badan"
                        type="number"
                        {...register('berat_badan')}
                        placeholder="Contoh: 55"
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="agama" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Agama
                        </Label>
                    </div>
                    <Input
                        id="agama"
                        {...register('agama')}
                        placeholder="Contoh: Islam..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="hobi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Hobi / Kegemaran
                        </Label>
                    </div>
                    <Input
                        id="hobi"
                        {...register('hobi')}
                        placeholder="Contoh: Membaca, Olahraga..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="cita_cita" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Cita-cita
                        </Label>
                    </div>
                    <Input
                        id="cita_cita"
                        {...register('cita_cita')}
                        placeholder="Contoh: Programmer, TNI, Dokter..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="ekskul_1" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Ekstrakulikuler 1 / Utama
                        </Label>
                    </div>
                    <Input
                        id="ekskul_1"
                        {...register('ekskul_1')}
                        placeholder="Contoh: Pramuka..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="ekskul_2" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Ekstrakulikuler 2 (Opsional)
                        </Label>
                    </div>
                    <Input
                        id="ekskul_2"
                        {...register('ekskul_2')}
                        placeholder="Contoh: Paskibra..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="nama_siswa" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Nama Lengkap <span className="text-rose-500">*</span>
                        </Label>
                    </div>
                    <Input
                        id="nama_siswa"
                        {...register('nama_siswa')}
                        placeholder="Nama sesuai ijazah..."
                        disabled={isViewMode}
                        className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama_siswa ? 'border-red-500' : ''}`}
                    />
                    {errors.nama_siswa && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama_siswa.message}</p>
                    )}
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="email" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Email Pengguna (Akses Log In)
                        </Label>
                    </div>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="nama@sekolah.sch.id"
                        disabled={isViewMode}
                        className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="no_hp" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Nomor HP / WhatsApp
                        </Label>
                    </div>
                    <Input
                        id="no_hp"
                        {...register('no_hp')}
                        placeholder="628xxxx..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="tempat_lahir" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Tempat Lahir
                        </Label>
                    </div>
                    <Input
                        id="tempat_lahir"
                        {...register('tempat_lahir')}
                        placeholder="Kota kelahiran..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="tanggal_lahir" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Tanggal Lahir
                        </Label>
                    </div>
                    <Input
                        id="tanggal_lahir"
                        type="date"
                        {...register('tanggal_lahir')}
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="jenis_kelamin" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Jenis Kelamin <span className="text-rose-500">*</span>
                        </Label>
                    </div>
                    <Controller
                        name="jenis_kelamin"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="jenis_kelamin"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={JENIS_KELAMIN_OPTIONS}
                                placeholder="Pilih Gender"
                                disabled={isViewMode}
                                triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.jenis_kelamin ? 'border-red-500' : ''}`}
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="transportasi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Moda Transportasi
                        </Label>
                    </div>
                    <Controller
                        name="transportasi"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="transportasi"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={TRANSPORTASI_OPTIONS}
                                placeholder="Pilih Transportasi"
                                disabled={isViewMode}
                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="no_rfid" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Nomor Kartu RFID
                        </Label>
                    </div>
                    <Input
                        id="no_rfid"
                        {...register('no_rfid')}
                        placeholder="Scan kartu RFID..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                {/* HIERARCHICAL CASCADING ADDRESS SECTION */}
                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="provinsi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            1. Provinsi <span className="text-rose-500">*</span>
                        </Label>
                    </div>
                    <Controller
                        name="provinsi"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="provinsi"
                                value={field.value || ''}
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    setValue('kabupaten', '');
                                    setValue('kecamatan', '');
                                    setValue('kelurahan', '');
                                    setValue('kode_pos', '');
                                }}
                                options={getEffectiveOptions(adminProvinsiOptions, field.value)}
                                placeholder="-- Pilih Provinsi --"
                                disabled={isViewMode}
                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="kabupaten" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            2. Kabupaten / Kota
                        </Label>
                    </div>
                    <Controller
                        name="kabupaten"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="kabupaten"
                                value={field.value || ''}
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    setValue('kecamatan', '');
                                    setValue('kelurahan', '');
                                    setValue('kode_pos', '');
                                }}
                                options={getEffectiveOptions(adminKabupatenOptions, field.value)}
                                placeholder={selectedProvinsi ? (adminKabupatenOptions.length > 0 ? "-- Pilih Kabupaten/Kota --" : "Memuat Kota...") : "-- Pilih Provinsi Terlebih Dahulu --"}
                                disabled={isViewMode || !selectedProvinsi}
                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="kecamatan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            3. Kecamatan
                        </Label>
                    </div>
                    <Controller
                        name="kecamatan"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="kecamatan"
                                value={field.value || ''}
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    setValue('kelurahan', '');
                                    setValue('kode_pos', '');
                                }}
                                options={getEffectiveOptions(adminKecamatanOptions, field.value)}
                                placeholder={selectedKabupaten ? (adminKecamatanOptions.length > 0 ? "-- Pilih Kecamatan --" : "Ketik / Memuat Kecamatan...") : "-- Pilih Kabupaten Terlebih Dahulu --"}
                                disabled={isViewMode || !selectedKabupaten}
                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                            />
                        )}
                    />
                </div>

                {/* 4. KELURAHAN / DESA */}
                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="kelurahan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            4. Kelurahan / Desa
                        </Label>
                    </div>
                    <Controller
                        name="kelurahan"
                        control={control}
                        render={({ field }) => (
                            <SearchableSelect
                                id="kelurahan"
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                options={getEffectiveOptions(adminKelurahanOptions, field.value)}
                                placeholder={selectedKecamatan ? (adminKelurahanOptions.length > 0 ? "-- Pilih Kelurahan/Desa --" : "Ketik / Memuat Desa...") : "-- Pilih Kecamatan Terlebih Dahulu --"}
                                disabled={isViewMode || !selectedKecamatan}
                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                            />
                        )}
                    />
                </div>

                {/* RT & RW (Tepat Setelah Kelurahan/Desa) */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="rt" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                RT
                            </Label>
                        </div>
                        <Input
                            id="rt"
                            {...register('rt')}
                            placeholder="001"
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>

                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="rw" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                RW
                            </Label>
                        </div>
                        <Input
                            id="rw"
                            {...register('rw')}
                            placeholder="002"
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>
                </div>

                {/* KODE POS (Pintar Auto-Detect) */}
                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="kode_pos" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter flex items-center gap-1.5">
                            Kode Pos <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Auto-Detect)</span>
                        </Label>
                    </div>
                    <Input
                        id="kode_pos"
                        {...register('kode_pos')}
                        placeholder="Contoh: 41162"
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl font-mono"
                    />
                </div>

                {/* ALAMAT JALAN / KAMPUNG / PATOKAN RUMAH */}
                <div className="md:col-span-2 space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="alamat" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Alamat Jalan / Kampung / Patokan Rumah
                        </Label>
                    </div>
                    <Textarea
                        id="alamat"
                        {...register('alamat', {
                            onChange: (e) => {
                                setValue('dusun', e.target.value);
                            }
                        })}
                        placeholder="Contoh: Kp. Cihampelas No. 11 atau Jl. Merdeka No. 45..."
                        disabled={isViewMode}
                        className="text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl min-h-[80px]"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="rt" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            RT
                        </Label>
                    </div>
                    <Input
                        id="rt"
                        {...register('rt')}
                        placeholder="001"
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="rw" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            RW
                        </Label>
                    </div>
                    <Input
                        id="rw"
                        {...register('rw')}
                        placeholder="002"
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                    />
                </div>

                <div className="space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="kode_pos" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Kode Pos
                        </Label>
                    </div>
                    <Input
                        id="kode_pos"
                        {...register('kode_pos')}
                        placeholder="Kode pos..."
                        disabled={isViewMode}
                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl font-mono"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="lintang" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                Lintang (Latitude)
                            </Label>
                        </div>
                        <Input
                            id="lintang"
                            {...register('lintang')}
                            placeholder="Contoh: -6.9174639"
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>
                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="bujur" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                Bujur (Longitude)
                            </Label>
                        </div>
                        <Input
                            id="bujur"
                            {...register('bujur')}
                            placeholder="Contoh: 107.6191228"
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>
                </div>
            </SectionCard>

            {/* Webcam Camera Capture Modal Overlay */}
            <Modal
                isOpen={isWebcamOpen}
                onClose={handleCloseWebcam}
                title="Ambil Foto Siswa"
                size="md"
            >
                <div className="space-y-6 pt-4 text-center">
                    <div className="relative aspect-[3/4] max-w-[300px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800">
                        {/* Video Feed */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* 3x4 Aspect Guideline Overlay */}
                        <div className="absolute inset-0 border-2 border-dashed border-white/60 pointer-events-none rounded-xl m-4 flex items-center justify-center">
                            <div className="text-[9px] font-black text-white/50 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">
                                Posisikan Wajah di Tengah
                            </div>
                        </div>
                    </div>
                    
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            onClick={handleCloseWebcam}
                            variant="outline"
                            className="flex-1 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCapture}
                            className="flex-1 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/15 flex items-center justify-center gap-2"
                        >
                            <Camera size={14} />
                            Ambil Foto
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

PersonalSection.displayName = 'PersonalSection';
