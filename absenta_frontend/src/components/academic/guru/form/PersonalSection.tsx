import React, { useRef, useState, useEffect } from 'react';
import { User, Hash, Mail, Phone, MapPin, Calendar, Activity, Building2, Camera, Upload, Trash2, FileText, CreditCard } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { Textarea } from '../../../ui/Textarea';
import { DatePicker } from '../../../ui/DatePicker';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { Controller } from 'react-hook-form';
import { JENIS_KELAMIN_OPTIONS, AGAMA_OPTIONS } from '../../../../api/dropdown.api';
import { useProvinsiOptions, useKabupatenOptions, useKecamatanOptions, useKelurahanOptions } from '../../../../hooks/useWilayahOptions';
import { SectionCard, DetailRow } from './FormShared';
import { requestWithFallback } from '../../../../api/apiUtils';
import toast from 'react-hot-toast';
import { resolveProfilePhotoUrl } from '../../../../lib/utils';

interface PersonalSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  setValue: any;
  guruId?: string;
  getLabel: (value: string | undefined, options: any[]) => string;
}

export const PersonalSection = React.memo<PersonalSectionProps>(({
  register,
  control,
  errors,
  isViewMode,
  watch,
  setValue,
  guruId,
  getLabel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFoto, setCurrentFoto] = useState<string>(watch('foto') || '');

  // Cascading Wilayah Hooks
  const selectedProvinsi = watch('provinsi');
  const selectedKabupaten = watch('kabupaten');
  const selectedKecamatan = watch('kecamatan');

  const { options: provinsiOptions, isLoading: loadingProv } = useProvinsiOptions();
  const { options: kabupatenOptions, isLoading: loadingKab } = useKabupatenOptions(selectedProvinsi);
  const { options: kecamatanOptions, isLoading: loadingKec } = useKecamatanOptions(selectedKabupaten);
  const { options: kelurahanOptions, isLoading: loadingKel } = useKelurahanOptions(selectedKecamatan, selectedKabupaten);

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
      
      if (guruId) {
        const { uploadGuruDocument } = await import('../../../../api/memberDocs.api');
        const uploadRes = await uploadGuruDocument({
          guruId,
          file,
          judul: 'Foto Formal - Guru',
          kategori: 'FOTO'
        });
        
        if (uploadRes.success && uploadRes.data) {
          const downloadUrl = `/academic/guru/${guruId}/documents/${uploadRes.data.id}/download`;
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

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      toast.error('Gagal mengakses kamera. Pastikan izin kamera aktif.');
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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 300;
        canvas.height = 400;
        ctx.drawImage(video, 0, 0, 300, 400);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `guru-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleCloseWebcam();
            await handleUploadFile(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleRemovePhoto = async () => {
    setValue('foto', '');
    setCurrentFoto('');
    toast.success('Foto dihapus dari form');
    if (guruId) {
      try {
        toast.loading('Menghapus dari database...', { id: 'save-photo' });
        const { updateGuru } = await import('../../../../api/academic/guru.api');
        await updateGuru(guruId, { foto: '' });
        toast.success('Foto berhasil dihapus dari database', { id: 'save-photo' });
      } catch (dbErr) {
        console.error('Failed to remove photo from DB:', dbErr);
        toast.error('Gagal menghapus foto dari database', { id: 'save-photo' });
      }
    }
  };

  const photoUrl = currentFoto;

  const PhotoHeaderCard = (
    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm mb-6">
      <div className="relative w-32 h-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 group">
        {photoUrl ? (
          <img src={resolveProfilePhotoUrl(photoUrl)} alt="Foto Guru" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="text-center p-3 text-slate-400">
            <User size={32} className="mx-auto mb-2 opacity-40" />
            <span className="text-[8px] font-black uppercase tracking-wider block">Belum ada foto</span>
          </div>
        )}
      </div>
      <div className="flex-1 space-y-3 text-center md:text-left">
        <h4 className="text-xs font-black text-slate-950 dark:text-slate-100 uppercase tracking-widest">Foto Resmi Pegawai / Guru</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter leading-relaxed max-w-md">
          Foto ini terintegrasi penuh ke semua modul, termasuk kartu identitas elektronik pegawai dan verifikasi absensi gerbang otomatis.
        </p>
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start pt-1">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${photoUrl ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
            {photoUrl ? 'Terverifikasi' : 'Belum Terunggah'}
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
          {photoUrl && (
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
  );

  return (
    <>
      {PhotoHeaderCard}

      {/* Webcam Camera Capture Modal Overlay */}
      <Modal
        isOpen={isWebcamOpen}
        onClose={handleCloseWebcam}
        title="Ambil Foto Pegawai / Guru"
        size="md"
      >
        <div className="space-y-6 pt-4 text-center">
          <div className="relative aspect-[3/4] max-w-[300px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="absolute inset-0 border-2 border-dashed border-white/40 pointer-events-none rounded-xl m-4 flex items-center justify-center">
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Posisi Wajah di Tengah Frame</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-center gap-3 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseWebcam}
              className="rounded-xl px-5 text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              className="rounded-xl px-6 text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              <Camera size={14} />
              Ambil Foto
            </Button>
          </div>
        </div>
      </Modal>

      {isViewMode ? (
        <>
          <SectionCard title="Identitas Personal" icon={User}>
            <DetailRow icon={<Hash size={16} />} label="NIP" value={watch('nip')} />
            <DetailRow icon={<CreditCard size={16} />} label="NIK (KTP)" value={watch('nik')} />
            <DetailRow icon={<CreditCard size={16} />} label="No. Kartu Keluarga" value={watch('no_kk')} />
            <DetailRow icon={<CreditCard size={16} />} label="NUPTK" value={watch('nuptk')} />
            <DetailRow icon={<CreditCard size={16} />} label="NPWP" value={watch('npwp')} />
            <DetailRow icon={<User size={16} />} label="Nama Lengkap" value={watch('nama')} />
            <DetailRow icon={<User size={16} />} label="Nama Ibu Kandung" value={watch('nama_ibu_kandung')} />
            <DetailRow icon={<Mail size={16} />} label="Email" value={watch('email')} />
            <DetailRow icon={<Phone size={16} />} label="Nomor WhatsApp" value={watch('no_hp')} />
            <DetailRow icon={<MapPin size={16} />} label="Tempat Lahir" value={watch('tempat_lahir')} />
            <DetailRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={watch('tanggal_lahir')} />
            <DetailRow icon={<Activity size={16} />} label="Jenis Kelamin" value={getLabel(watch('jenis_kelamin'), JENIS_KELAMIN_OPTIONS)} />
            <DetailRow icon={<Building2 size={16} />} label="Agama" value={getLabel(watch('agama'), AGAMA_OPTIONS)} />
          </SectionCard>
          <SectionCard title="Domisili Pendidik" icon={MapPin}>
            <DetailRow icon={<MapPin size={16} />} label="Alamat Jalan / Kampung" value={watch('alamat') || watch('dusun')} />
            <DetailRow icon={<MapPin size={16} />} label="RT / RW" value={watch('rt') || watch('rw') ? `RT ${watch('rt') || '00'} / RW ${watch('rw') || '00'}` : '-'} />
            <DetailRow icon={<MapPin size={16} />} label="Desa / Kelurahan" value={watch('kelurahan')} />
            <DetailRow icon={<MapPin size={16} />} label="Kecamatan" value={watch('kecamatan')} />
            <DetailRow icon={<MapPin size={16} />} label="Kabupaten / Kota" value={watch('kabupaten')} />
            <DetailRow icon={<MapPin size={16} />} label="Provinsi" value={watch('provinsi')} />
            <DetailRow icon={<MapPin size={16} />} label="Kode Pos" value={watch('kode_pos')} />
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard title="Identitas Personal" icon={User}>
            <div className="space-y-2 group">
              <Label htmlFor="nip" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">NIP</Label>
              <Input id="nip" {...register('nip')} placeholder="Entry NIP..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
              {errors.nip && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nip.message}</p>}
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="nik" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">NIK (KTP 16 Digit)</Label>
              <Input id="nik" {...register('nik')} placeholder="3204xxxxxxxxxxxx" disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="no_kk" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">No. Kartu Keluarga (KK)</Label>
              <Input id="no_kk" {...register('no_kk')} placeholder="16-digit No. KK..." disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="nuptk" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">NUPTK</Label>
              <Input id="nuptk" {...register('nuptk')} placeholder="16-digit NUPTK..." disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="npwp" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">NPWP</Label>
              <Input id="npwp" {...register('npwp')} placeholder="Nomor NPWP Guru..." disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="nama" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap <span className="text-rose-500">*</span></Label>
              <Input id="nama" {...register('nama')} placeholder="Entry Nama Lengkap..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl shadow-inner" />
              {errors.nama && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama.message}</p>}
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="nama_ibu_kandung" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nama Ibu Kandung</Label>
              <Input id="nama_ibu_kandung" {...register('nama_ibu_kandung')} placeholder="Entry Nama Ibu Kandung..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="email" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email Aktif</Label>
              <Input id="email" {...register('email')} type="email" placeholder="Entry Email..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
              {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="no_hp" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">No WhatsApp</Label>
              <Input id="no_hp" {...register('no_hp')} placeholder="Entry Nomor HP..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
              {errors.no_hp && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.no_hp.message}</p>}
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="tempat_lahir" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tempat Lahir</Label>
              <Input id="tempat_lahir" {...register('tempat_lahir')} placeholder="Entry Tempat Lahir..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="tanggal_lahir" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tanggal Lahir</Label>
              <Controller control={control} name="tanggal_lahir" render={({ field }) => (
                <DatePicker id="tanggal_lahir" value={field.value} onChange={field.onChange} disabled={isViewMode} placeholder="Pilih Tanggal..." className="h-10 font-bold rounded-xl" />
              )} />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="jenis_kelamin" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</Label>
              <Controller control={control} name="jenis_kelamin" render={({ field }) => (
                <SearchableSelect id="jenis_kelamin" value={field.value} onValueChange={field.onChange} options={JENIS_KELAMIN_OPTIONS} placeholder="Pilih JK..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
              )} />
            </div>
            <div className="space-y-2 group">
              <Label htmlFor="agama" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Agama</Label>
              <Controller control={control} name="agama" render={({ field }) => (
                <SearchableSelect id="agama" value={field.value} onValueChange={field.onChange} options={AGAMA_OPTIONS} placeholder="Pilih Agama..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
              )} />
            </div>
          </SectionCard>

          <SectionCard title="Domisili Pendidik (Sesuai Wilayah)" icon={MapPin}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="alamat" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Alamat Jalan / Kampung</Label>
              <Textarea id="alamat" {...register('alamat')} placeholder="Jl. Raya No. 123 / Kampung Krajan..." disabled={isViewMode} rows={2} className="text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-blue-500/30 rounded-2xl resize-none p-4 shadow-inner" />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="rt" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">RT</Label>
              <Input id="rt" {...register('rt')} placeholder="001" disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="rw" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">RW</Label>
              <Input id="rw" {...register('rw')} placeholder="002" disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="provinsi" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Provinsi</Label>
              <Controller control={control} name="provinsi" render={({ field }) => (
                <SearchableSelect
                  id="provinsi"
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue('kabupaten', '');
                    setValue('kecamatan', '');
                    setValue('kelurahan', '');
                  }}
                  options={provinsiOptions}
                  placeholder={loadingProv ? 'Memuat Provinsi...' : 'Pilih Provinsi...'}
                  disabled={isViewMode || loadingProv}
                  triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              )} />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="kabupaten" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kabupaten / Kota</Label>
              <Controller control={control} name="kabupaten" render={({ field }) => (
                <SearchableSelect
                  id="kabupaten"
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue('kecamatan', '');
                    setValue('kelurahan', '');
                  }}
                  options={kabupatenOptions}
                  placeholder={loadingKab ? 'Memuat Kab/Kota...' : 'Pilih Kab/Kota...'}
                  disabled={isViewMode || !selectedProvinsi || loadingKab}
                  triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              )} />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="kecamatan" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kecamatan</Label>
              <Controller control={control} name="kecamatan" render={({ field }) => (
                <SearchableSelect
                  id="kecamatan"
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue('kelurahan', '');
                  }}
                  options={kecamatanOptions}
                  placeholder={loadingKec ? 'Memuat Kecamatan...' : 'Pilih Kecamatan...'}
                  disabled={isViewMode || !selectedKabupaten || loadingKec}
                  triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              )} />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="kelurahan" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Desa / Kelurahan</Label>
              <Controller control={control} name="kelurahan" render={({ field }) => (
                <SearchableSelect
                  id="kelurahan"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={kelurahanOptions}
                  placeholder={loadingKel ? 'Memuat Desa/Kel...' : 'Pilih Desa/Kel...'}
                  disabled={isViewMode || !selectedKecamatan || loadingKel}
                  triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              )} />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="kode_pos" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kode Pos</Label>
              <Input id="kode_pos" {...register('kode_pos')} placeholder="41162" disabled={isViewMode} className="h-10 text-[13px] font-mono font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
});

PersonalSection.displayName = 'PersonalSection';
