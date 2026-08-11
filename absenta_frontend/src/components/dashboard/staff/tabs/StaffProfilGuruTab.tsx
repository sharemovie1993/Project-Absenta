import React from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, Key, User, Users, MapPin, Award, QrCode } from 'lucide-react';
import { Button } from '../../../ui';
import { toast } from 'react-hot-toast';

interface StaffProfilGuruTabProps {
  user: any;
  teacherInitials: string;
  nipText: string;
  waliKelasNama?: string;
}

export const StaffProfilGuruTab: React.FC<StaffProfilGuruTabProps> = ({
  user,
  teacherInitials,
  nipText,
  waliKelasNama,
}) => {
  return (
    <motion.div
      key="tab-profil"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* 1. TOP ROW: 2 COLUMNS (Avatar Card & Account Settings Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column (Avatar & Quick Info Card) - 4 cols on lg */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 text-center sm:text-left">
          <div className="space-y-4">
            {/* Photo Avatar Frame */}
            <div className="relative w-28 h-28 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-1 shadow-md flex items-center justify-center font-black text-3xl text-emerald-600 dark:text-emerald-400">
              {teacherInitials}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white shadow-sm">
                <Check size={12} strokeWidth={4} />
              </span>
            </div>

            {/* Teacher Name & Status Pill */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {user?.full_name || user?.name || 'Drs. Budi Santoso, M.Pd'}
              </h3>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Guru Aktif — {waliKelasNama || 'Wali Kelas XI RPL 1'}
              </span>
            </div>

            {/* Quick Detail Key-Value List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIP</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{nipText}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIK</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">3273101508050002</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Mata Pelajaran</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">Pemrograman Web</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Tugas Tambahan</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Wali Kelas</span>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width QR Card Digital Button */}
          <Button
            type="button"
            onClick={() => toast('Membuka QR Card Digital Guru...', { icon: '💳' })}
            className="w-full h-10 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <QrCode size={16} />
            <span>Lihat QR Card Digital</span>
          </Button>
        </div>

        {/* Right Column (Pengaturan Akun & Ganti Password Card) - 8 cols on lg */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Title with Edit Icon */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    Pengaturan Akun &amp; Ganti Password
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Perbarui data diri guru atau ganti kata sandi portal
                </p>
              </div>
            </div>

            {/* Input Fields Grid */}
            <form onSubmit={(e) => { e.preventDefault(); toast.success('Perubahan akun berhasil disimpan!'); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Nomor Telepon WhatsApp Guru
                  </label>
                  <input
                    type="text"
                    defaultValue="6287779937341"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Email Pembelajaran
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || 'guru.budi@absenta.sch.id'}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Key size={14} className="text-amber-500" />
                  <span>GANTI KATA SANDI</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Password Lama
                    </label>
                    <input
                      type="password"
                      placeholder="********"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Password Baru
                    </label>
                    <input
                      type="password"
                      placeholder="********"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM ROW: 4 GRID CARDS (DATA PRIBADI, ORGANISASI/JABATAN, KONTAK & ALAMAT, SERTIFIKASI) */}
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
            <button type="button" onClick={() => toast('Edit data pribadi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Jenis Kelamin</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Laki-laki</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Agama</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Islam</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Tempat Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Bandung</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Tanggal Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">12 April 1978</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Email</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">budi.santoso@absenta.sch.id</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Pendidikan Terakhir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">S2 Pendidikan Komputer</span>
            </div>
          </div>
        </div>

        {/* Card 2: ORGANISASI & JABATAN */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                JABATAN DAN TUGAS TAMBAHAN
              </h3>
            </div>
            <button type="button" onClick={() => toast('Edit tugas tambahan...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Status Kepegawaian</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">PNS / Guru Tetap</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Golongan / Pangkat</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">IV/a - Pembina</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Tugas Utama</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Guru Pemrograman Web</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Wali Kelas</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{waliKelasNama || 'XI RPL 1'}</span>
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
            <button type="button" onClick={() => toast('Edit kontak...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Nomor Telepon</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">6287779937341</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Alamat Rumah</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Jl. Soekarno Hatta No. 456, Bandung</span>
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
            <button type="button" onClick={() => toast('Edit sertifikasi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Sertifikasi Guru</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Pendidik Profesional (Lulus SERTIFIKASI)</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Masa Kerja Pegawai</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">16 Tahun 5 Bulan</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
