import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, Key, User, Users, MapPin, Award, QrCode, Save, X, Loader2 } from 'lucide-react';
import { Button, Modal } from '../../../ui';
import { toast } from 'react-hot-toast';
import { useGuruMe, useUpdateGuruMe } from '../../../../hooks/useGuruMe';

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
  // 1. Fetch live teacher profile via React Query Hook
  const { guruProfile, isLoading: isProfileLoading } = useGuruMe();
  const updateGuruMeMutation = useUpdateGuruMe();

  // 2. Account Settings Form State
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 3. Edit Data Diri Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAlamat, setEditAlamat] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editAgama, setEditAgama] = useState('');
  const [editPendidikanTerakhir, setEditPendidikanTerakhir] = useState('');

  // Populate state when live data arrives
  useEffect(() => {
    const activeGuru = guruProfile || (user as any)?.guru_profile || user;
    if (activeGuru) {
      setNoHp(activeGuru.no_hp || user?.no_hp || '6287779937341');
      setEmail(activeGuru.email || user?.email || 'guru.budi@absenta.sch.id');
      setEditAlamat(activeGuru.alamat || 'Jl. Soekarno Hatta No. 456, Bandung');
      setEditTempatLahir(activeGuru.tempat_lahir || 'Bandung');
      setEditTanggalLahir(
        activeGuru.tanggal_lahir
          ? new Date(activeGuru.tanggal_lahir).toISOString().split('T')[0]
          : '1978-04-12'
      );
      setEditJenisKelamin(activeGuru.jenis_kelamin || 'L');
      setEditAgama(activeGuru.agama || 'ISLAM');
      setEditPendidikanTerakhir(activeGuru.pendidikan_terakhir || 'S2 Pendidikan Komputer');
    }
  }, [guruProfile, user]);

  // Handle Account Settings Form Submit (Phone, Email, Password)
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, any> = {
        no_hp: noHp,
        email: email,
      };

      if (newPassword) {
        if (!oldPassword) {
          toast.error('Password lama wajib diisi!');
          return;
        }
        payload.old_password = oldPassword;
        payload.new_password = newPassword;
      }

      await updateGuruMeMutation.mutateAsync(payload);
      toast.success('Pengaturan akun & password berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui akun.');
    }
  };

  // Handle Edit Data Diri Submit
  const handleDataDiriSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        alamat: editAlamat,
        tempat_lahir: editTempatLahir,
        tanggal_lahir: editTanggalLahir,
        jenis_kelamin: editJenisKelamin,
        agama: editAgama,
        pendidikan_terakhir: editPendidikanTerakhir,
      };

      await updateGuruMeMutation.mutateAsync(payload);
      toast.success('Data pribadi berhasil diperbarui!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui data pribadi.');
    }
  };

  const activeNama = guruProfile?.nama_guru || user?.full_name || user?.name || 'Drs. Budi Santoso, M.Pd';
  const activeNip = guruProfile?.nip || nipText;

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
                {activeNama}
              </h3>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Guru Aktif — {waliKelasNama || 'Wali Kelas XI RPL 1'}
              </span>
            </div>

            {/* Quick Detail Key-Value List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIP</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{activeNip}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Jenis PTK</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {guruProfile?.jenis_ptk || 'PENDIDIK'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Status Pegawai</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {guruProfile?.status_kepegawaian || 'PNS / Guru Tetap'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Tugas Tambahan</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {waliKelasNama ? `Wali Kelas ${waliKelasNama}` : 'Guru Mata Pelajaran'}
                </span>
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
                  Perbarui nomor WhatsApp, email pembelajaran, atau ganti kata sandi portal
                </p>
              </div>
            </div>

            {/* Input Fields Grid Form */}
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Nomor Telepon WhatsApp Guru
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="628123456789"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Email Pembelajaran
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@absenta.sch.id"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Key size={14} className="text-amber-500" />
                  <span>GANTI KATA SANDI (OPSIONAL)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Password Lama
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
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
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="********"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={updateGuruMeMutation.isPending}
                  className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  {updateGuruMeMutation.isPending ? (
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
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Jenis Kelamin</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editJenisKelamin === 'L' ? 'Laki-laki' : editJenisKelamin === 'P' ? 'Perempuan' : editJenisKelamin}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Agama</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editAgama}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Tempat Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editTempatLahir}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Tanggal Lahir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editTanggalLahir}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-semibold text-slate-400 block">Pendidikan Terakhir</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editPendidikanTerakhir}</span>
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
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Status Kepegawaian</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {guruProfile?.status_kepegawaian || 'PNS / Guru Tetap'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Jenis PTK</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {guruProfile?.jenis_ptk || 'PENDIDIK'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-semibold text-slate-400 block">Jabatan Struktural</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {guruProfile?.jabatan || (waliKelasNama ? `Wali Kelas ${waliKelasNama}` : 'Guru Mata Pelajaran')}
              </span>
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
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Nomor Telepon</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{noHp}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Alamat Rumah</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editAlamat}</span>
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
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Sertifikasi Guru</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Pendidik Profesional (Lulus SERTIFIKASI)</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Status Aktivitas</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Guru Aktif Pembelajaran</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Data Diri Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Data Pribadi Guru"
        >
          <form onSubmit={handleDataDiriSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={editTempatLahir}
                  onChange={(e) => setEditTempatLahir(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={editTanggalLahir}
                  onChange={(e) => setEditTanggalLahir(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Jenis Kelamin
                </label>
                <select
                  value={editJenisKelamin}
                  onChange={(e) => setEditJenisKelamin(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Agama
                </label>
                <select
                  value={editAgama}
                  onChange={(e) => setEditAgama(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="ISLAM">Islam</option>
                  <option value="KRISTEN">Kristen</option>
                  <option value="KATHOLIK">Katholik</option>
                  <option value="HINDU">Hindu</option>
                  <option value="BUDDHA">Buddha</option>
                  <option value="KONGHUCU">Konghucu</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Pendidikan Terakhir
              </label>
              <input
                type="text"
                value={editPendidikanTerakhir}
                onChange={(e) => setEditPendidikanTerakhir(e.target.value)}
                placeholder="S1 Pendidikan Komputer"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Alamat Rumah
              </label>
              <textarea
                rows={3}
                value={editAlamat}
                onChange={(e) => setEditAlamat(e.target.value)}
                placeholder="Alamat lengkap tempat tinggal"
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-9 px-4 rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateGuruMeMutation.isPending}
                className="h-9 px-5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {updateGuruMeMutation.isPending ? (
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
      )}
    </motion.div>
  );
};
