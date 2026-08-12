import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, Key, User, Users, MapPin, Award, QrCode, Save, Loader2 } from 'lucide-react';
import { Button, Modal, SearchableSelect } from '../../../ui';
import { toast } from 'react-hot-toast';
import { useGuruMe, useUpdateGuruMe } from '../../../../hooks/useGuruMe';
import { useProvinsiOptions, useKabupatenOptions, useKecamatanOptions, useKelurahanOptions } from '../../../../hooks/useWilayahOptions';

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
  const { guruProfile } = useGuruMe();
  const updateGuruMeMutation = useUpdateGuruMe();

  // 2. Account Settings Form State
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 3. Edit Data Diri & Kepegawaian Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAlamat, setEditAlamat] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editAgama, setEditAgama] = useState('');
  const [editPendidikanTerakhir, setEditPendidikanTerakhir] = useState('');
  const [editStatusKepegawaian, setEditStatusKepegawaian] = useState('');
  const [editPangkatGolongan, setEditPangkatGolongan] = useState('');
  const [editTmtGuru, setEditTmtGuru] = useState('');
  const [editJenisPtk, setEditJenisPtk] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editNuptk, setEditNuptk] = useState('');
  const [editNpwp, setEditNpwp] = useState('');
  const [editNamaIbuKandung, setEditNamaIbuKandung] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editKabupaten, setEditKabupaten] = useState('');
  const [editProvinsi, setEditProvinsi] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editKodePos, setEditKodePos] = useState('');

  // Active section state for modal editing ('pribadi' | 'kepegawaian' | 'alamat')
  const [activeEditSection, setActiveEditSection] = useState<'pribadi' | 'kepegawaian' | 'alamat'>('pribadi');

  const handleOpenEditSection = (section: 'pribadi' | 'kepegawaian' | 'alamat') => {
    setActiveEditSection(section);
    setIsEditModalOpen(true);
  };

  // Cascading Wilayah Hooks
  const { options: provinsiOptions, isLoading: loadingProv } = useProvinsiOptions();
  const { options: kabupatenOptions, isLoading: loadingKab } = useKabupatenOptions(editProvinsi);
  const { options: kecamatanOptions, isLoading: loadingKec } = useKecamatanOptions(editKabupaten);
  const { options: kelurahanOptions, isLoading: loadingKel } = useKelurahanOptions(editKecamatan, editKabupaten);

  // Populate state when live data arrives
  useEffect(() => {
    const activeGuru = guruProfile || (user as any)?.guru_profile || user;
    if (activeGuru) {
      setNoHp(activeGuru.no_hp || user?.no_hp || '');
      setEmail(activeGuru.email || user?.email || '');
      setEditAlamat(activeGuru.alamat || '');
      setEditTempatLahir(activeGuru.tempat_lahir || '');
      setEditTanggalLahir(
        activeGuru.tanggal_lahir
          ? new Date(activeGuru.tanggal_lahir).toISOString().split('T')[0]
          : ''
      );
      setEditJenisKelamin(activeGuru.jenis_kelamin || 'L');
      setEditAgama(activeGuru.agama || 'ISLAM');
      setEditPendidikanTerakhir(activeGuru.pendidikan_terakhir || '');
      setEditStatusKepegawaian(activeGuru.status_kepegawaian || 'PNS');
      setEditPangkatGolongan(activeGuru.pangkat_golongan || '');
      setEditTmtGuru(
        activeGuru.tmt_guru
          ? new Date(activeGuru.tmt_guru).toISOString().split('T')[0]
          : ''
      );
      setEditJenisPtk(activeGuru.jenis_ptk || 'PENDIDIK');
      setEditNik(activeGuru.nik || '');
      setEditNoKk(activeGuru.no_kk || '');
      setEditNuptk(activeGuru.nuptk || '');
      setEditNpwp(activeGuru.npwp || '');
      setEditNamaIbuKandung(activeGuru.nama_ibu_kandung || '');
      setEditDusun(activeGuru.dusun || '');
      setEditKelurahan(activeGuru.kelurahan || '');
      setEditKecamatan(activeGuru.kecamatan || '');
      setEditKabupaten(activeGuru.kabupaten || '');
      setEditProvinsi(activeGuru.provinsi || '');
      setEditRt(activeGuru.rt || '');
      setEditRw(activeGuru.rw || '');
      setEditKodePos(activeGuru.kode_pos || '');
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

  // Handle Edit Data Diri & Kepegawaian Submit
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
        status_kepegawaian: editStatusKepegawaian,
        pangkat_golongan: editPangkatGolongan,
        tmt_guru: editTmtGuru,
        jenis_ptk: editJenisPtk,
        nik: editNik,
        no_kk: editNoKk,
        nuptk: editNuptk,
        npwp: editNpwp,
        nama_ibu_kandung: editNamaIbuKandung,
        dusun: editDusun,
        kelurahan: editKelurahan,
        kecamatan: editKecamatan,
        kabupaten: editKabupaten,
        provinsi: editProvinsi,
        rt: editRt,
        rw: editRw,
        kode_pos: editKodePos,
      };

      await updateGuruMeMutation.mutateAsync(payload);
      toast.success('Data pribadi & kepegawaian berhasil diperbarui!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui data.');
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
                <span className="text-slate-400 font-bold">NIK (KTP)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNik || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NUPTK</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNuptk || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Golongan / Pangkat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editPangkatGolongan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Jenis PTK</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editJenisPtk}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Status Pegawai</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editStatusKepegawaian}
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
              onClick={() => handleOpenEditSection('pribadi')}
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
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">NIK (KTP)</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNik || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">No. Kartu Keluarga (KK)</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNoKk || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Nama Ibu Kandung</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editNamaIbuKandung || '-'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: ORGANISASI & JABATAN */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                JABATAN DAN KEPEGAWAIAN
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('kepegawaian')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Status Kepegawaian</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editStatusKepegawaian}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Golongan / Pangkat</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editPangkatGolongan}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Jenis PTK</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editJenisPtk}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">TMT Guru</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editTmtGuru}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">NUPTK</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNuptk || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">NPWP</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNpwp || '-'}</span>
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
              onClick={() => handleOpenEditSection('alamat')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Nomor Telepon</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{noHp}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Kode Pos</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editKodePos || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-semibold text-slate-400 block">Alamat Jalan / Kampung</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editAlamat || editDusun || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">RT / RW</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {editRt || editRw ? `RT ${editRt || '00'} / RW ${editRw || '00'}` : '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Desa / Kelurahan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editKelurahan || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Kecamatan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editKecamatan || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">Kabupaten / Kota</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editKabupaten || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-semibold text-slate-400 block">Provinsi</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editProvinsi || '-'}</span>
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

      {/* Edit Data Diri & Kepegawaian Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={
            activeEditSection === 'pribadi'
              ? 'Edit Data Pribadi Guru'
              : activeEditSection === 'kepegawaian'
              ? 'Edit Kepegawaian & Dapodik Guru'
              : 'Edit Kontak & Alamat Guru'
          }
        >
          <form onSubmit={handleDataDiriSubmit} className="space-y-4 pt-2">
            {activeEditSection === 'pribadi' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      NIK (KTP 16 Digit)
                    </label>
                    <input
                      type="text"
                      value={editNik}
                      onChange={(e) => setEditNik(e.target.value)}
                      placeholder="3204xxxxxxxxxxxx"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      No. Kartu Keluarga (KK)
                    </label>
                    <input
                      type="text"
                      value={editNoKk}
                      onChange={(e) => setEditNoKk(e.target.value)}
                      placeholder="16-digit No. KK"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Nama Ibu Kandung (Sesuai Dapodik)
                  </label>
                  <input
                    type="text"
                    value={editNamaIbuKandung}
                    onChange={(e) => setEditNamaIbuKandung(e.target.value)}
                    placeholder="Nama Ibu Kandung"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

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
              </>
            )}

            {activeEditSection === 'kepegawaian' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      NUPTK
                    </label>
                    <input
                      type="text"
                      value={editNuptk}
                      onChange={(e) => setEditNuptk(e.target.value)}
                      placeholder="16-digit NUPTK"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      NPWP
                    </label>
                    <input
                      type="text"
                      value={editNpwp}
                      onChange={(e) => setEditNpwp(e.target.value)}
                      placeholder="Nomor NPWP Guru"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Status Kepegawaian
                    </label>
                    <select
                      value={editStatusKepegawaian}
                      onChange={(e) => setEditStatusKepegawaian(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PNS">PNS / Pegawai Negeri Sipil</option>
                      <option value="PPPK">PPPK / PPPK Guru</option>
                      <option value="GTY">GTY / Guru Tetap Yayasan</option>
                      <option value="GTT">GTT / Guru Tidak Tetap</option>
                      <option value="HONORER">Honorer Sekolah</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Golongan / Pangkat
                    </label>
                    <input
                      type="text"
                      value={editPangkatGolongan}
                      onChange={(e) => setEditPangkatGolongan(e.target.value)}
                      placeholder="IV/a - Pembina"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Jenis PTK
                    </label>
                    <select
                      value={editJenisPtk}
                      onChange={(e) => setEditJenisPtk(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PENDIDIK">PENDIDIK (Guru)</option>
                      <option value="TENAGA_KEPENDIDIKAN">TENAGA KEPENDIDIKAN (Staf / TU)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      TMT Guru (Terhitung Mulai Tanggal)
                    </label>
                    <input
                      type="date"
                      value={editTmtGuru}
                      onChange={(e) => setEditTmtGuru(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            {activeEditSection === 'alamat' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      1. Provinsi
                    </label>
                    <SearchableSelect
                      value={editProvinsi}
                      onValueChange={(val) => {
                        setEditProvinsi(val);
                        setEditKabupaten('');
                        setEditKecamatan('');
                        setEditKelurahan('');
                      }}
                      options={provinsiOptions}
                      placeholder={loadingProv ? 'Memuat Provinsi...' : 'Pilih Provinsi...'}
                      disabled={loadingProv}
                      triggerClassName="h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      2. Kabupaten / Kota
                    </label>
                    <SearchableSelect
                      value={editKabupaten}
                      onValueChange={(val) => {
                        setEditKabupaten(val);
                        setEditKecamatan('');
                        setEditKelurahan('');
                      }}
                      options={kabupatenOptions}
                      placeholder={loadingKab ? 'Memuat Kab/Kota...' : 'Pilih Kab/Kota...'}
                      disabled={!editProvinsi || loadingKab}
                      triggerClassName="h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      3. Kecamatan
                    </label>
                    <SearchableSelect
                      value={editKecamatan}
                      onValueChange={(val) => {
                        setEditKecamatan(val);
                        setEditKelurahan('');
                      }}
                      options={kecamatanOptions}
                      placeholder={loadingKec ? 'Memuat Kecamatan...' : 'Pilih Kecamatan...'}
                      disabled={!editKabupaten || loadingKec}
                      triggerClassName="h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      4. Kelurahan / Desa
                    </label>
                    <SearchableSelect
                      value={editKelurahan}
                      onValueChange={(val) => setEditKelurahan(val)}
                      options={kelurahanOptions}
                      placeholder={loadingKel ? 'Memuat Desa/Kel...' : 'Pilih Desa/Kel...'}
                      disabled={!editKecamatan || loadingKel}
                      triggerClassName="h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      RT
                    </label>
                    <input
                      type="text"
                      value={editRt}
                      onChange={(e) => setEditRt(e.target.value)}
                      placeholder="001"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      RW
                    </label>
                    <input
                      type="text"
                      value={editRw}
                      onChange={(e) => setEditRw(e.target.value)}
                      placeholder="002"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={editKodePos}
                      onChange={(e) => setEditKodePos(e.target.value)}
                      placeholder="41162"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Alamat Jalan / Blok (Lengkap dengan Nomor Rumah / Gang)
                  </label>
                  <textarea
                    rows={2}
                    value={editAlamat}
                    onChange={(e) => setEditAlamat(e.target.value)}
                    placeholder="Jl. Raya No. 123 / Gang Masjid"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Dusun / Kampung
                  </label>
                  <input
                    type="text"
                    value={editDusun}
                    onChange={(e) => setEditDusun(e.target.value)}
                    placeholder="Kampung Krajan / Dusun Mekar"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
