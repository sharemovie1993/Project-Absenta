import React, { useRef, useState, useEffect } from 'react';
import { Hash, User as UserIcon, Phone, MapPin, Calendar, Users, Bus, Radio, Home, Mail, Camera, Upload, Trash2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Label } from '../../../ui/Label';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { Controller, UseFormRegister, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { JENIS_KELAMIN_OPTIONS, TRANSPORTASI_OPTIONS } from '../../../../api/dropdown.api';
import { SiswaFormValues } from '../../../../schemas/academic/siswa.schema';
import { SectionCard, DetailRow } from './FormShared';
import { requestWithFallback } from '../../../../api/apiUtils';
import toast from 'react-hot-toast';

interface PersonalSectionProps {
    register: UseFormRegister<SiswaFormValues>;
    control: Control<SiswaFormValues>;
    errors: FieldErrors<SiswaFormValues>;
    isViewMode: boolean;
    watch: UseFormWatch<SiswaFormValues>;
    setValue: any;
}

export const PersonalSection: React.FC<PersonalSectionProps> = React.memo(({
    register,
    control,
    errors,
    isViewMode,
    watch,
    setValue
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await requestWithFallback<{ success: boolean; message: string; data: { url: string } }>('post', '/upload/file', {
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (res.success && res.data?.url) {
                setValue('foto', res.data.url);
                toast.success('Foto berhasil diperbarui', { id: 'upload-photo' });
            } else {
                toast.error('Gagal mengunggah foto', { id: 'upload-photo' });
            }
        } catch (err) {
            console.error('Error uploading photo:', err);
            toast.error('Gagal mengunggah foto', { id: 'upload-photo' });
        }
    };

    const handleWebcamTrigger = () => {
        setIsWebcamOpen(true);
        setTimeout(() => {
            startWebcam();
        }, 100);
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

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
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

    const handleRemovePhoto = () => {
        setValue('foto', '');
        toast.success('Foto dihapus');
    };

    if (isViewMode) {
        return (
            <div className="space-y-6">
                {/* Premium Photo Header View */}
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                    <div className="relative w-32 h-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 group">
                        {watch('foto') ? (
                            <img src={watch('foto')} alt="Foto Siswa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="text-center p-3 text-slate-400">
                                <UserIcon size={32} className="mx-auto mb-2 opacity-40" />
                                <span className="text-[8px] font-black uppercase tracking-wider block">Belum ada foto</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h4 className="text-xs font-black text-slate-950 dark:text-slate-100 uppercase tracking-widest">Foto Resmi Siswa</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter leading-relaxed max-w-md">
                            Foto ini terintegrasi penuh ke semua modul, termasuk kartu identitas elektronik dan verifikasi absensi gerbang otomatis.
                        </p>
                        <div className="pt-2">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${watch('foto') ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                {watch('foto') ? 'Terverifikasi' : 'Belum Terunggah'}
                            </span>
                        </div>
                    </div>
                </div>

                <SectionCard title="Informasi Pribadi Siswa" icon={UserIcon}>
                    <DetailRow icon={<Hash size={16} />} label="NIS" value={watch('nis')} />
                    <DetailRow icon={<Hash size={16} />} label="NISN" value={watch('nisn') || '-'} />
                    <DetailRow icon={<UserIcon size={16} />} label="Nama Lengkap" value={watch('nama_siswa')} />
                    <DetailRow icon={<Mail size={16} />} label="Email Pengguna (User)" value={watch('email') || '-'} />
                    <DetailRow icon={<Phone size={16} />} label="Nomor HP" value={watch('no_hp')} />
                    <DetailRow icon={<MapPin size={16} />} label="Tempat Lahir" value={watch('tempat_lahir')} />
                    <DetailRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={watch('tanggal_lahir')} />
                    <DetailRow icon={<Users size={16} />} label="Jenis Kelamin" value={(JENIS_KELAMIN_OPTIONS || []).find(o => o.value === watch('jenis_kelamin'))?.label} />
                    <DetailRow icon={<Bus size={16} />} label="Transportasi" value={(TRANSPORTASI_OPTIONS || []).find(o => o.value === watch('transportasi'))?.label} />
                    <DetailRow icon={<Radio size={16} />} label="No RFID" value={watch('no_rfid')} />
                    <DetailRow icon={<Home size={16} />} label="Alamat" value={watch('alamat')} />
                </SectionCard>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Photo Header Edit/Capture Panel */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="relative w-32 h-40 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0 group">
                    {watch('foto') ? (
                        <img src={watch('foto')} alt="Foto Siswa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                        {watch('foto') && (
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

                <div className="md:col-span-2 space-y-2 group">
                    <div className="flex items-center justify-between px-1">
                        <Label htmlFor="alamat" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            Alamat Lengkap Domisili
                        </Label>
                    </div>
                    <Textarea
                        id="alamat"
                        {...register('alamat')}
                        placeholder="Masukkan alamat lengkap RT/RW/Kelurahan/Kecamatan..."
                        disabled={isViewMode}
                        className="text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl min-h-[80px]"
                    />
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
                            onClick={capturePhoto}
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
