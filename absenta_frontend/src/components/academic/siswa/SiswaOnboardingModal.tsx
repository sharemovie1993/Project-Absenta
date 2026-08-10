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
  AlertCircle
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSiswa, siswaQueryKeys } from '@/api/academic/siswa.api';
import toast from 'react-hot-toast';

export interface SiswaOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswa: any;
  onSuccess?: () => void;
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
  siswa,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(1);

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

    nama_ayah: '',
    nik_ayah: '',
    pekerjaan_ayah: '',
    nama_ibu: '',
    nik_ibu: '',
    pekerjaan_ibu: '',
    nama_wali: '',
    hubungan_wali: '',
  });

  // Populate data when modal opens
  useEffect(() => {
    if (siswa) {
      setFormData({
        nik: siswa.nik || '',
        nisn: siswa.nisn || '',
        tempat_lahir: siswa.tempat_lahir || '',
        tanggal_lahir: siswa.tanggal_lahir ? siswa.tanggal_lahir.split('T')[0] : '',
        jenis_kelamin: siswa.jenis_kelamin || 'L',
        no_hp: siswa.no_hp || '',
        tinggi_badan: siswa.tinggi_badan ?? '',
        berat_badan: siswa.berat_badan ?? '',

        alamat: siswa.alamat || '',
        dusun: siswa.dusun || '',
        kelurahan: siswa.kelurahan || '',
        kecamatan: siswa.kecamatan || '',
        kabupaten: siswa.kabupaten || '',
        provinsi: siswa.provinsi || '',
        rt: siswa.rt || '',
        rw: siswa.rw || '',
        kode_pos: siswa.kode_pos || '',
        transportasi: siswa.transportasi || '',

        nama_ayah: siswa.nama_ayah || '',
        nik_ayah: siswa.nik_ayah || '',
        pekerjaan_ayah: siswa.pekerjaan_ayah || '',
        nama_ibu: siswa.nama_ibu || '',
        nik_ibu: siswa.nik_ibu || '',
        pekerjaan_ibu: siswa.pekerjaan_ibu || '',
        nama_wali: siswa.nama_wali || '',
        hubungan_wali: siswa.hubungan_wali || '',
      });
    }
  }, [siswa, isOpen]);

  // Live completeness calculation
  const liveCompleteness = useMemo(() => {
    return calculateProfileCompleteness({ ...siswa, ...formData });
  }, [siswa, formData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!siswa?.id) throw new Error('ID Siswa tidak ditemukan');
      const payload = {
        ...formData,
        tinggi_badan: formData.tinggi_badan === '' ? undefined : Number(formData.tinggi_badan),
        berat_badan: formData.berat_badan === '' ? undefined : Number(formData.berat_badan),
        tanggal_lahir: formData.tanggal_lahir || undefined,
      };
      return updateSiswa(siswa.id, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['siswa-profile-me'] });
      toast.success('Profil berhasil diperbarui!');
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui data siswa');
    },
  });

  if (!isOpen || !siswa) return null;

  const handleNext = () => {
    if (step < 3) setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmitFinal = async () => {
    await updateMutation.mutateAsync();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto"
      >
        {/* HEADER & METER BAR */}
        <div className="p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Onboarding Siswa Baru
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Langkah {step} dari 3
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white mt-1">
                Lengkapi Profil Data Induk Siswa
              </h2>
            </div>
          </div>

          {/* Progress Bar Completeness */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                Kelengkapan Profil Siswa
              </span>
              <span className="text-emerald-400 font-bold">{liveCompleteness.percent}% Complete</span>
            </div>
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${liveCompleteness.percent}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* BODY STEP CONTENT */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* STEP TABS HEADER */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Identitas & Fisik', icon: User },
              { num: 2, label: 'Alamat & Domisili', icon: MapPin },
              { num: 3, label: 'Orang Tua & Wali', icon: Users },
            ].map(s => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isPast = step > s.num;

              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                      : isPast
                      ? 'bg-slate-800/60 text-slate-300 border-slate-700/60'
                      : 'bg-slate-950/40 text-slate-500 border-slate-800/40'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.num}</span>
                  {isPast && <CheckCircle2 size={12} className="text-emerald-400 ml-auto" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: IDENTITAS & FISIK */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-xs"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>
                    Mohon isi NIK (16 digit) dan fisik terbaru Anda. Data ini penting untuk pencatatan DAPODIK dan verifikasi identitas resmi sekolah.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-blue-400" />
                      NIK (Nomor Induk Kependudukan)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={formData.nik}
                      onChange={e => setFormData({ ...formData, nik: e.target.value })}
                      placeholder="16 digit NIK..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-blue-400" />
                      NISN (Nasional)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.nisn}
                      onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                      placeholder="10 digit NISN..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-400" />
                      No. HP / WhatsApp Siswa
                    </label>
                    <input
                      type="text"
                      value={formData.no_hp}
                      onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <User size={13} className="text-indigo-400" />
                      Jenis Kelamin
                    </label>
                    <select
                      value={formData.jenis_kelamin}
                      onChange={e => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin size={13} className="text-amber-400" />
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={formData.tempat_lahir}
                      onChange={e => setFormData({ ...formData, tempat_lahir: e.target.value })}
                      placeholder="Kota/Kabupaten kelahiran..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Calendar size={13} className="text-amber-400" />
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal_lahir}
                      onChange={e => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* TINGGI & BERAT BADAN */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Ruler size={13} className="text-purple-400" />
                      Tinggi Badan (cm)
                    </label>
                    <input
                      type="number"
                      value={formData.tinggi_badan}
                      onChange={e => setFormData({ ...formData, tinggi_badan: e.target.value })}
                      placeholder="Contoh: 165"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Weight size={13} className="text-rose-400" />
                      Berat Badan (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.berat_badan}
                      onChange={e => setFormData({ ...formData, berat_badan: e.target.value })}
                      placeholder="Contoh: 55"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: ALAMAT & DOMISILI */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Alamat Tempat Tinggal Lengkap</label>
                  <textarea
                    rows={3}
                    value={formData.alamat}
                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Nama jalan, nomor rumah, RT/RW..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">RT</label>
                    <input
                      type="text"
                      value={formData.rt}
                      onChange={e => setFormData({ ...formData, rt: e.target.value })}
                      placeholder="001"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">RW</label>
                    <input
                      type="text"
                      value={formData.rw}
                      onChange={e => setFormData({ ...formData, rw: e.target.value })}
                      placeholder="002"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-slate-300">Dusun / Kampung</label>
                    <input
                      type="text"
                      value={formData.dusun}
                      onChange={e => setFormData({ ...formData, dusun: e.target.value })}
                      placeholder="Nama dusun/kampung..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Kelurahan / Desa</label>
                    <input
                      type="text"
                      value={formData.kelurahan}
                      onChange={e => setFormData({ ...formData, kelurahan: e.target.value })}
                      placeholder="Nama kelurahan..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Kecamatan</label>
                    <input
                      type="text"
                      value={formData.kecamatan}
                      onChange={e => setFormData({ ...formData, kecamatan: e.target.value })}
                      placeholder="Nama kecamatan..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Kabupaten / Kota</label>
                    <input
                      type="text"
                      value={formData.kabupaten}
                      onChange={e => setFormData({ ...formData, kabupaten: e.target.value })}
                      placeholder="Nama kabupaten..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Kode Pos</label>
                    <input
                      type="text"
                      value={formData.kode_pos}
                      onChange={e => setFormData({ ...formData, kode_pos: e.target.value })}
                      placeholder="Kode pos..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300">Moda Transportasi Ke Sekolah</label>
                    <input
                      type="text"
                      value={formData.transportasi}
                      onChange={e => setFormData({ ...formData, transportasi: e.target.value })}
                      placeholder="Motor, Sepeda, Jalan Kaki, dsb."
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: ORANG TUA & WALI */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* AYAH */}
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                      <User size={14} /> Data Ayah Kandung
                    </h4>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Nama Ayah</label>
                      <input
                        type="text"
                        value={formData.nama_ayah}
                        onChange={e => setFormData({ ...formData, nama_ayah: e.target.value })}
                        placeholder="Nama lengkap ayah..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">NIK Ayah</label>
                      <input
                        type="text"
                        maxLength={16}
                        value={formData.nik_ayah}
                        onChange={e => setFormData({ ...formData, nik_ayah: e.target.value })}
                        placeholder="16 digit NIK Ayah..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Pekerjaan Ayah</label>
                      <input
                        type="text"
                        value={formData.pekerjaan_ayah}
                        onChange={e => setFormData({ ...formData, pekerjaan_ayah: e.target.value })}
                        placeholder="Pekerjaan..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* IBU */}
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-indigo-400 flex items-center gap-1.5">
                      <User size={14} /> Data Ibu Kandung
                    </h4>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Nama Ibu</label>
                      <input
                        type="text"
                        value={formData.nama_ibu}
                        onChange={e => setFormData({ ...formData, nama_ibu: e.target.value })}
                        placeholder="Nama lengkap ibu..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">NIK Ibu</label>
                      <input
                        type="text"
                        maxLength={16}
                        value={formData.nik_ibu}
                        onChange={e => setFormData({ ...formData, nik_ibu: e.target.value })}
                        placeholder="16 digit NIK Ibu..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-300">Pekerjaan Ibu</label>
                      <input
                        type="text"
                        value={formData.pekerjaan_ibu}
                        onChange={e => setFormData({ ...formData, pekerjaan_ibu: e.target.value })}
                        placeholder="Pekerjaan..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
          >
            <ArrowLeft size={14} />
            <span>Sebelumnya</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition"
              >
                <span>Lanjutkan</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
              >
                <Save size={14} />
                <span>{updateMutation.isPending ? 'Simpan Data...' : 'Simpan & Selesaikan Onboarding'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
