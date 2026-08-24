import React from 'react';
import {
  User as UserIcon, Mail, Phone, MapPin, Calendar, Building2,
  Key, BadgeInfo, Edit3, Briefcase, Camera, Loader2,
  GraduationCap, Award, ShieldCheck, Tag, Download, FileText
} from 'lucide-react';
import { Button, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { PrintableCard } from '@/components/academic/student-card/PrintableCard';
import { CardBackPreview } from '@/components/academic/student-card/CardBackPreview';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import type { Guru, Siswa } from '@/types/academic';

interface ProfileBiodataTabProps {
  user: any;
  isSiswa: boolean;
  isGuru: boolean;
  siswaProfile: Siswa | null;
  guruProfile: Guru | null;
  sekolahProfile: any;
  resolvedConfig: any;
  isLoadingCardConfig: boolean;
  cardSide: 'front' | 'back';
  setCardSide: (side: 'front' | 'back') => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
  downloadCardRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUploadFotoDirect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  downloadCard: (format: 'png' | 'pdf') => void;
  uploadingFoto: boolean;
  isDownloading: boolean;
  setIsCameraOpen: (open: boolean) => void;
  startCamera: (facing: 'user' | 'environment') => void;
  cameraFacing: 'user' | 'environment';
  fotoUrl: string | null;
  summaryName: string;
  summaryEmail: string;
  tenantName: string;
  initialChar: string;
  details: {
    utama2Label: string;
    utama2: string;
    jk: string;
    lahir: string;
    kontak: string;
    alamat: string;
    kelas?: string;
    tingkat?: string;
    jurusan?: string;
    nisn?: string;
    nik?: string;
    tinggiBadan?: string;
    beratBadan?: string;
    statusPegawai?: string;
    pendidikan?: string;
    agama?: string;
  };
  setShowEdit: (show: boolean) => void;
  setShowChangePwd: (show: boolean) => void;
  setShowChangeEmail: (show: boolean) => void;
  loading: boolean;
  errorMsg: string | null;
  successMsg: string | null;
}

export const ProfileBiodataTab: React.FC<ProfileBiodataTabProps> = React.memo(({
  user,
  isSiswa,
  isGuru,
  siswaProfile,
  guruProfile,
  sekolahProfile,
  resolvedConfig,
  isLoadingCardConfig,
  cardSide,
  setCardSide,
  cardRef,
  downloadCardRef,
  fileInputRef,
  handleUploadFotoDirect,
  downloadCard,
  uploadingFoto,
  isDownloading,
  setIsCameraOpen,
  startCamera,
  cameraFacing,
  fotoUrl,
  summaryName,
  summaryEmail,
  tenantName,
  initialChar,
  details,
  setShowEdit,
  setShowChangePwd,
  setShowChangeEmail,
  loading,
  errorMsg,
  successMsg,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* KOLOM KIRI: Proxy Kartu Identitas Digital / Avatar Card */}
      <div className="lg:col-span-5 space-y-6">
        {isSiswa || isGuru ? (
          <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-full overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
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
              <div className="w-full overflow-auto py-1 scrollbar-none flex justify-center items-center">
                <div className="origin-center scale-[0.82] sm:scale-95 md:scale-100 transition-all duration-300 shrink-0">
                  <div ref={cardRef as React.RefObject<HTMLDivElement>}>
                    {cardSide === 'front' ? (
                      <PrintableCard
                        student={{
                          ...(isSiswa ? siswaProfile : guruProfile),
                          nama_siswa: isSiswa
                            ? (siswaProfile?.nama_siswa || user?.full_name)
                            : (guruProfile?.nama_guru || user?.full_name),
                          foto: fotoUrl || resolveProfilePhotoUrl(user?.avatar) || resolveProfilePhotoUrl(isSiswa ? (siswaProfile as any)?.foto : (guruProfile as any)?.foto) || undefined
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

            {/* Hidden print/download wrapper */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -9999, pointerEvents: 'none' }}>
              <div ref={downloadCardRef as React.RefObject<HTMLDivElement>} style={{ transform: 'none', margin: 0, padding: 0 }}>
                {cardSide === 'front' ? (
                  <PrintableCard
                    student={{
                      ...(isSiswa ? siswaProfile : guruProfile),
                      nama_siswa: isSiswa
                        ? (siswaProfile?.nama_siswa || user?.full_name)
                        : (guruProfile?.nama_guru || user?.full_name),
                      foto: fotoUrl || resolveProfilePhotoUrl(user?.avatar) || resolveProfilePhotoUrl(isSiswa ? (siswaProfile as any)?.foto : (guruProfile as any)?.foto) || undefined
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
                id="profileGalleryUpload"
                aria-label="Upload Foto dari Galeri"
                type="file"
                ref={fileInputRef as React.RefObject<HTMLInputElement>}
                onChange={handleUploadFotoDirect}
                accept="image/*"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFoto}
                variant="outline"
                size="xs"
                className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
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
                className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Camera size={11} className="mr-1.5" />
                Ambil dari Kamera
              </Button>

              <Button
                onClick={() => downloadCard('png')}
                disabled={isDownloading}
                variant="outline"
                size="xs"
                className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Download size={11} className="mr-1.5" />
                Download PNG
              </Button>

              <Button
                onClick={() => downloadCard('pdf')}
                disabled={isDownloading}
                variant="outline"
                size="xs"
                className="h-8.5 text-[10px] font-black rounded-xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <FileText size={11} className="mr-1.5" />
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center">
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
                id="profileAvatarUpload"
                aria-label="Ganti Foto Profil"
                type="file"
                ref={fileInputRef as React.RefObject<HTMLInputElement>}
                onChange={handleUploadFotoDirect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <button
                type="button"
                aria-label="Ganti Foto Profil"
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
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4 text-center">
          <div className="text-left">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manajemen Akun</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Kelola kredensial dan akses masuk sistem Anda</p>
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

      {/* KOLOM KANAN: Detail Informasi Lengkap */}
      <div className="lg:col-span-7 space-y-6">
        {isSiswa && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
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
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
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
              <>
                <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                    <Award size={11} className="text-indigo-500" /> NISN
                  </span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.nisn}</p>
                </div>
                <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                    <Award size={11} className="text-indigo-500" /> NIK
                  </span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.nik}</p>
                </div>
                <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                    <UserIcon size={11} className="text-indigo-500" /> Tinggi Badan
                  </span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.tinggiBadan}</p>
                </div>
                <div className="p-3.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                    <UserIcon size={11} className="text-indigo-500" /> Berat Badan
                  </span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{details.beratBadan}</p>
                </div>
              </>
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
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
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
  );
});