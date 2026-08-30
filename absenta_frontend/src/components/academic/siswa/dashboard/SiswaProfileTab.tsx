import React, { useState } from 'react';
import {
  User, Camera, Check, Edit3, Key, MapPin, Heart, Users, QrCode, Eye, EyeOff
} from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { SelfMemberDocsSection } from '@/components/documents/SelfMemberDocsSection';
import { formatAlamatLengkap } from '@/lib/alamat.util';
import type { SectionEditType } from '../SiswaOnboardingModal';

export interface SiswaProfileTabProps {
  siswaProfile: any;
  user: any;
  studentPhotoUrl: string | null;
  studentInitials: string;
  currentClassName: string;
  currentJurusan: string;
  currentNisn: string;
  currentNik: string;
  currentOrtu: string;
  qrCodeDataUrl: string;
  renderValueOrUnconnectedBadge: (val: any) => React.ReactNode;
  handleOpenEditSection: (section: SectionEditType) => void;
  setShowDigitalCardModal: (show: boolean) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  oldPassword: string;
  setOldPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (val: string) => void;
  passwordSubmitting: boolean;
}

export const SiswaProfileTab: React.FC<SiswaProfileTabProps> = ({
  siswaProfile,
  user,
  studentPhotoUrl,
  studentInitials,
  currentClassName,
  currentJurusan,
  currentNisn,
  currentNik,
  currentOrtu,
  qrCodeDataUrl,
  renderValueOrUnconnectedBadge,
  handleOpenEditSection,
  setShowDigitalCardModal,
  handlePasswordSubmit,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword = '',
  setConfirmPassword = () => {},
  passwordSubmitting,
}) => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Row: Student Identity Summary Box & Account Settings Form Box */}
      <div className="grid grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Box: Student Identity Summary (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-between space-y-4">
          <div className="space-y-3 w-full flex flex-col items-center">
            {/* Photo Avatar with Interactive Camera Shortcut */}
            <div
              className="relative group cursor-pointer"
              onClick={() => handleOpenEditSection('pribadi')}
              title="Klik untuk ubah / upload foto siswa"
            >
              {studentPhotoUrl ? (
                <img
                  src={studentPhotoUrl}
                  alt={siswaProfile?.nama || 'Foto Siswa'}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const el = document.getElementById('student-avatar-initial-box-tab');
                    if (el) el.style.display = 'flex';
                  }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md group-hover:scale-105 transition-transform"
                />
              ) : null}
              <div
                id="student-avatar-initial-box-tab"
                style={{ display: studentPhotoUrl ? 'none' : 'flex' }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/40 items-center justify-center font-black text-2xl shadow-md group-hover:scale-105 transition-transform"
              >
                {studentInitials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-600 hover:bg-emerald-700 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white shadow-md transition-all group-hover:scale-110 cursor-pointer">
                <Camera size={13} />
              </span>
            </div>

            {/* Name & Active Status Badge */}
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {siswaProfile?.nama || (user as any)?.nama_siswa || user?.full_name || user?.name || '-'}
              </h3>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-block mt-1">
                Siswa Aktif — Kelas {currentClassName}
              </span>
            </div>

            {/* Summary Details Table */}
            <div className="w-full space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">NISN</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(currentNisn)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">NIK</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(currentNik)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Jurusan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px] text-right">{renderValueOrUnconnectedBadge(currentJurusan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Orang Tua / Wali</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px] text-right">{renderValueOrUnconnectedBadge(currentOrtu)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Button */}
          <Button
            type="button"
            onClick={() => setShowDigitalCardModal(true)}
            className="w-full h-10 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <QrCode size={16} />
            <span>Lihat QR Card Digital</span>
          </Button>
        </div>

        {/* Right Box: Account Settings & Change Password Form (col-span-12 lg:col-span-8) */}
        <div className="col-span-12 lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Pengaturan Akun &amp; Ganti Password
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Perbarui data diri siswa atau ganti kata sandi portal
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label htmlFor="noHpSiswa">
                    Nomor Telepon WhatsApp Siswa
                  </Label>
                  <Input
                    id="noHpSiswa"
                    type="text"
                    readOnly
                    value={siswaProfile?.no_hp || user?.phone || '-'}
                    className="font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="emailSiswa">
                    Email Pembelajaran
                  </Label>
                  <Input
                    id="emailSiswa"
                    type="email"
                    readOnly
                    value={user?.email || siswaProfile?.email || '-'}
                    className="font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  <Key size={14} className="text-amber-500" />
                  <span>Ganti Kata Sandi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <Label htmlFor="oldPassword">
                      Password Lama
                    </Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showOldPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">
                      Password Baru
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">
                      Konfirmasi Password Baru
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {passwordSubmitting ? 'Simpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Section 1: Data Pribadi */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <User size={18} />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                DATA PRIBADI
              </h3>
            </div>
            <button onClick={() => handleOpenEditSection('pribadi')} className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="Edit Data Pribadi">
              <Edit3 size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Jenis Kelamin</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {renderValueOrUnconnectedBadge(siswaProfile?.jenis_kelamin ? (siswaProfile.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan') : null)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Agama</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.agama)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Tempat Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.tempat_lahir)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Tanggal Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {renderValueOrUnconnectedBadge(
                  siswaProfile?.tanggal_lahir
                    ? new Date(siswaProfile.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : null
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Tinggi Badan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {renderValueOrUnconnectedBadge(siswaProfile?.tinggi_badan ? `${siswaProfile.tinggi_badan} cm` : null)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Berat Badan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {renderValueOrUnconnectedBadge(siswaProfile?.berat_badan ? `${siswaProfile.berat_badan} kg` : null)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Email</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{renderValueOrUnconnectedBadge(siswaProfile?.email || user?.email)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Hobi</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.hobi)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-medium">Cita-cita</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.cita_cita)}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Organisasi & Ekstrakurikuler */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Users size={18} />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                ORGANISASI DAN EKSTRAKURIKULER
              </h3>
            </div>
            <button onClick={() => handleOpenEditSection('ekskul')} className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer" title="Edit Organisasi & Ekskul">
              <Edit3 size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Anggota OSIS</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {renderValueOrUnconnectedBadge(siswaProfile?.is_osis !== undefined && siswaProfile?.is_osis !== null ? (siswaProfile.is_osis ? 'Ya' : 'Tidak') : null)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Anggota MPK</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {renderValueOrUnconnectedBadge(siswaProfile?.is_mpk !== undefined && siswaProfile?.is_mpk !== null ? (siswaProfile.is_mpk ? 'Ya' : 'Tidak') : null)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Ekstrakurikuler 1</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.ekskul_1)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Ekstrakurikuler 2</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.ekskul_2)}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Kontak & Alamat */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                KONTAK & ALAMAT
              </h3>
            </div>
            <button onClick={() => handleOpenEditSection('alamat')} className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="Edit Kontak & Alamat">
              <Edit3 size={16} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Nomor Telepon</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{renderValueOrUnconnectedBadge(siswaProfile?.no_hp || user?.phone)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Alamat</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {renderValueOrUnconnectedBadge(
                  siswaProfile ? formatAlamatLengkap(siswaProfile) : null
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Orang Tua / Wali Murid */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Heart size={18} />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                ORANG TUA / WALI MURID
              </h3>
            </div>
            <button onClick={() => handleOpenEditSection('orangtua')} className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer" title="Edit Orang Tua / Wali">
              <Edit3 size={16} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Nama Ayah & No. HP</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">{renderValueOrUnconnectedBadge(siswaProfile?.nama_ayah)}</span>
              <span className="text-slate-400 font-mono block mt-0.5">{renderValueOrUnconnectedBadge(siswaProfile?.no_hp_ayah || siswaProfile?.nik_ayah)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Nama Ibu & No. HP</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">{renderValueOrUnconnectedBadge(siswaProfile?.nama_ibu)}</span>
              <span className="text-slate-400 font-mono block mt-0.5">{renderValueOrUnconnectedBadge(siswaProfile?.no_hp_ibu || siswaProfile?.nik_ibu)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Nama Wali & No. HP</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">{renderValueOrUnconnectedBadge(siswaProfile?.nama_wali)}</span>
              <span className="text-slate-400 font-mono block mt-0.5">{renderValueOrUnconnectedBadge(siswaProfile?.no_hp_wali || siswaProfile?.hubungan_wali)}</span>
            </div>
          </div>
        </div>

        {/* Section 5: Berkas & Dokumen Digital */}
        {siswaProfile?.id && (
          <div className="col-span-1 md:col-span-2">
            <SelfMemberDocsSection
              entityType="SISWA"
              entityId={siswaProfile.id}
              entityName={siswaProfile.nama_siswa || user?.name || ''}
            />
          </div>
        )}
      </div>

      {/* Kartu Digital Siswa QR Code */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          KARTU PELAJAR DIGITAL
        </h3>
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt={`QR Code ${currentNisn}`} className="w-36 h-36 object-contain" />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center bg-slate-50 text-slate-400">
                <QrCode size={90} />
              </div>
            )}
            <span className="block mt-1.5 text-[11px] font-extrabold font-mono text-slate-800">
              NISN: {currentNisn}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
            Scan QR Code ini pada scanner sekolah untuk presensi kehadiran otomatis
          </p>
          <Button
            type="button"
            onClick={() => setShowDigitalCardModal(true)}
            className="h-10 px-5 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <QrCode size={16} />
            <span>Lihat Kartu Pelajar Lengkap</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
