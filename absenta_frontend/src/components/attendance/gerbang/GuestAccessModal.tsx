import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Users, 
  Building2, 
  GraduationCap, 
  Briefcase,
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Loader2, 
  Check, 
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Label } from '@/components/ui';
import { recordGuestAccess, GuestAccessPayload } from '@/api/attendanceGerbang.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import { guruApi } from '@/api/academic.api';

type TabType = 'TAMU' | 'ORANG_TUA' | 'KHUSUS' | 'MANUAL';

interface GuestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
  defaultKategoriBuku?: 'UMUM' | 'KHUSUS';
  defaultTitikPencatat?: 'GERBANG' | 'TATA_USAHA';
}

const TAMU_INSTANSI_PRESETS = ['Vendor / Ekspedisi', 'Alumni', 'Masyarakat Umum', 'Instansi Swasta'];
const TAMU_KEPERLUAN_PRESETS = ['Pengiriman Barang / Paket', 'Audiensi / Pertemuan', 'Urusan Administrasi', 'Kunjungan Silaturahmi'];

const ORTU_KEPERLUAN_PRESETS = ['Menjemput Siswa Sakit', 'Izin Kepulangan Siswa', 'Konsultasi Guru / BK', 'Urusan Administrasi / SPP'];

const KHUSUS_INSTANSI_PRESETS = ['Dinas Pendidikan', 'Pengawas Pembina', 'Asesor Akreditasi (BAN-S/M)', 'Puskesmas / Dinkes', 'Polsek / Koramil', 'Mitra Industri (DU/DI)'];
const KHUSUS_JABATAN_PRESETS = ['Pengawas Pembina Sekolah', 'Asesor Akreditasi', 'Dokter / Petugas Medis', 'Pimpinan / HRD Industri', 'Staf Monev Dinas'];
const KHUSUS_KEPERLUAN_PRESETS = ['Supervisi & Pembinaan Pengawas', 'Visitasi Akreditasi Sekolah', 'Monitoring & Evaluasi KBM', 'Penyuluhan Kesehatan', 'MoU Kemitraan DU/DI'];
const KHUSUS_PEJABAT_DITUJU_OPTIONS = ['Kepala Sekolah', 'Wakasek Kurikulum', 'Wakasek Kesiswaan', 'Wakasek Hubin', 'Wakasek Sarpras', 'Kepala Tata Usaha', 'Tim Akreditasi Sekolah'];

export const GuestAccessModal: React.FC<GuestAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultKategoriBuku = 'UMUM',
  defaultTitikPencatat = 'GERBANG',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultKategoriBuku === 'KHUSUS' ? 'KHUSUS' : 'TAMU');
  const [arah, setArah] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [manualType, setManualType] = useState<'SISWA' | 'GURU'>('SISWA');

  // Form Fields
  const [nama, setNama] = useState('');
  const [instansi, setInstansi] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [kontak, setKontak] = useState('');
  const [catatan, setCatatan] = useState('');

  // Khusus Fields
  const [jabatan, setJabatan] = useState('');
  const [pejabatDituju, setPejabatDituju] = useState('Kepala Sekolah');
  const [nomorSuratTugas, setNomorSuratTugas] = useState('');
  const [pesanKesan, setPesanKesan] = useState('');

  // Autocomplete Siswa / Guru
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultKategoriBuku === 'KHUSUS') {
        setActiveTab('KHUSUS');
        setInstansi('Dinas Pendidikan');
        setJabatan('Pengawas Pembina Sekolah');
        setKeperluan('Supervisi & Pembinaan Pengawas');
      } else {
        setActiveTab('TAMU');
      }
    }
  }, [isOpen, defaultKategoriBuku]);

  // Handle live search for Siswa / Guru
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (activeTab === 'ORANG_TUA' || (activeTab === 'MANUAL' && manualType === 'SISWA')) {
          const res = await getSiswaList(1, 6, searchQuery.trim(), '', 'AKTIF');
          const list = Array.isArray(res) ? res : (res as any)?.data || [];
          setSearchResults(list);
        } else if (activeTab === 'MANUAL' && manualType === 'GURU') {
          const res = await guruApi.getAll({ search: searchQuery.trim(), limit: 6 });
          const list = Array.isArray(res) ? res : (res as any)?.data || [];
          setSearchResults(list);
        }
      } catch (err) {
        console.error('Error in guest search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, activeTab, manualType]);

  const resetForm = () => {
    setNama('');
    setInstansi('');
    setKeperluan('');
    setKontak('');
    setCatatan('');
    setJabatan('');
    setPejabatDituju('Kepala Sekolah');
    setNomorSuratTugas('');
    setPesanKesan('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEntity(null);
    setArah('MASUK');
  };

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    resetForm();
    if (newTab === 'KHUSUS') {
      setInstansi('Dinas Pendidikan');
      setJabatan('Pengawas Pembina Sekolah');
      setKeperluan('Supervisi & Pembinaan Pengawas');
    } else if (newTab === 'MANUAL') {
      setKeperluan('Lupa / Tidak Membawa Kartu RFID');
    }
  };

  const handleSelectStudent = (s: any) => {
    setSelectedEntity(s);
    setSearchQuery('');
    setSearchResults([]);
    const sName = s.nama_siswa || '';
    const kName = s.Kelas?.nama_kelas || s.kelas?.nama_kelas || '';

    if (activeTab === 'ORANG_TUA') {
      setInstansi(`Orang Tua Siswa (${sName} - Kelas ${kName || 'Aktif'})`);
      if (!keperluan) setKeperluan('Menjemput Siswa Sakit');
    } else if (activeTab === 'MANUAL') {
      setNama(sName);
      setInstansi(kName ? `Kelas ${kName}` : 'Siswa Aktif');
      if (!keperluan) setKeperluan('Lupa / Tidak Membawa Kartu RFID');
    }
  };

  const handleSelectTeacher = (g: any) => {
    setSelectedEntity(g);
    setSearchQuery('');
    setSearchResults([]);
    const gName = g.nama_guru || '';
    setNama(gName);
    setInstansi(g.jabatan || 'Dewan Guru');
    if (!keperluan) setKeperluan('Lupa / Tidak Membawa Kartu RFID');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNama = (activeTab === 'MANUAL' && selectedEntity 
      ? (manualType === 'SISWA' ? selectedEntity.nama_siswa : selectedEntity.nama_guru)
      : nama).trim();

    if (!trimmedNama) {
      toast.error(
        activeTab === 'MANUAL' ? `Silakan pilih ${manualType === 'SISWA' ? 'siswa' : 'guru'} terlebih dahulu` :
        activeTab === 'KHUSUS' ? 'Nama pejabat / tamu kedinasan wajib diisi' :
        activeTab === 'ORANG_TUA' ? 'Nama orang tua / wali wajib diisi' :
        'Nama lengkap tamu wajib diisi'
      );
      return;
    }

    if (!keperluan.trim()) {
      toast.error('Keperluan kunjungan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const isKhusus = activeTab === 'KHUSUS';
      const isSiswaManual = activeTab === 'MANUAL' && manualType === 'SISWA';
      const isGuruManual = activeTab === 'MANUAL' && manualType === 'GURU';

      const payload: GuestAccessPayload = {
        nama_tamu: trimmedNama,
        instansi_tamu: instansi.trim() || undefined,
        keperluan_tamu: keperluan.trim(),
        kontak_tamu: kontak.trim() || undefined,
        arah,
        catatan: catatan.trim() || undefined,
        tipe_orang: isSiswaManual ? 'SISWA' : isGuruManual ? 'GURU' : 'TAMU',
        siswa_id: isSiswaManual ? selectedEntity?.id : undefined,
        guru_id: isGuruManual ? selectedEntity?.id : undefined,
        kelas_snapshot: isSiswaManual 
          ? (selectedEntity?.Kelas?.nama_kelas || selectedEntity?.kelas?.nama_kelas) 
          : (activeTab === 'ORANG_TUA' && selectedEntity 
              ? (selectedEntity?.Kelas?.nama_kelas || selectedEntity?.kelas?.nama_kelas) 
              : undefined),
        kategori_buku: isKhusus ? 'KHUSUS' : 'UMUM',
        jabatan_tamu: isKhusus ? (jabatan.trim() || undefined) : undefined,
        pejabat_dituju: isKhusus ? (pejabatDituju.trim() || undefined) : undefined,
        nomor_surat_tugas: isKhusus ? (nomorSuratTugas.trim() || undefined) : undefined,
        pesan_kesan: isKhusus ? (pesanKesan.trim() || undefined) : undefined,
        titik_pencatat: defaultTitikPencatat,
      };

      const res = await recordGuestAccess(payload);
      toast.success(`Akses ${trimmedNama} berhasil dicatat`);
      resetForm();
      onClose();
      if (onSuccess) onSuccess(res?.data || payload);
    } catch (err: any) {
      console.error('Error recording access:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mencatat akses');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Catat Tamu & Akses"
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
        
        {/* Top Control: Segmented Tabs & Arah */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Category Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => handleTabChange('TAMU')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'TAMU'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User size={13} />
              <span>Tamu</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('ORANG_TUA')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'ORANG_TUA'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users size={13} />
              <span>Orang Tua</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('KHUSUS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'KHUSUS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Building2 size={13} />
              <span>Kedinasan</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('MANUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'MANUAL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap size={13} />
              <span>Tanpa Kartu</span>
            </button>
          </div>

          {/* Direction Toggle */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setArah('MASUK')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                arah === 'MASUK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={13} />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => setArah('KELUAR')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                arah === 'KELUAR'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            1. TAB: TAMU UMUM
        ============================================================ */}
        {activeTab === 'TAMU' && (
          <div className="space-y-3.5">
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Nama Tamu <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                autoFocus
                className="text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Asal Instansi / Perusahaan
              </Label>
              <Input
                type="text"
                value={instansi}
                onChange={(e) => setInstansi(e.target.value)}
                placeholder="Contoh: J&T Express / Alumni 2023"
                className="text-xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {TAMU_INSTANSI_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setInstansi(p)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Keperluan Kunjungan <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Contoh: Mengantar paket dokumen"
                className="text-xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {TAMU_KEPERLUAN_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setKeperluan(p)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  No. WhatsApp / HP
                </Label>
                <Input
                  type="tel"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Catatan / No. Kendaraan
                </Label>
                <Input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: D 1234 ABC"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            2. TAB: ORANG TUA / WALI
        ============================================================ */}
        {activeTab === 'ORANG_TUA' && (
          <div className="space-y-3.5">
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Nama Orang Tua / Wali <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Ibu Rina Marlina"
                autoFocus
                className="text-xs"
              />
            </div>

            {/* Siswa yang dikunjungi */}
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Nama Siswa (Anak yang Dikunjungi)
              </Label>
              {selectedEntity ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {selectedEntity.nama_siswa}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        NIS: {selectedEntity.nis || '-'} • Kelas: {selectedEntity.Kelas?.nama_kelas || selectedEntity.kelas?.nama_kelas || '-'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEntity(null);
                      setInstansi('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama siswa..."
                    leftIcon={isSearching ? <Loader2 size={13} className="animate-spin text-slate-400" /> : <Search size={13} className="text-slate-400" />}
                    className="text-xs"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.nama_siswa}</span>
                          <span className="text-[11px] text-slate-500">
                            Kelas {s.Kelas?.nama_kelas || s.kelas?.nama_kelas || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Keperluan Kunjungan <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Contoh: Menjemput siswa izin sakit"
                className="text-xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ORTU_KEPERLUAN_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setKeperluan(p)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  No. WhatsApp / HP
                </Label>
                <Input
                  type="tel"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Catatan Tambahan
                </Label>
                <Input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Opsional"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            3. TAB: TAMU KEDINASAN / VIP
        ============================================================ */}
        {activeTab === 'KHUSUS' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Nama Pejabat & Gelar <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Dr. H. Ahmad Sudrajat, M.Pd."
                  autoFocus
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Jabatan Tamu
                </Label>
                <Input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Pengawas Pembina"
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {KHUSUS_JABATAN_PRESETS.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setJabatan(p)}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Instansi / Lembaga Dinas
                </Label>
                <Input
                  type="text"
                  value={instansi}
                  onChange={(e) => setInstansi(e.target.value)}
                  placeholder="Contoh: Dinas Pendidikan Provinsi"
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {KHUSUS_INSTANSI_PRESETS.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInstansi(p)}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Pejabat Dituju
                </Label>
                <select
                  value={pejabatDituju}
                  onChange={(e) => setPejabatDituju(e.target.value)}
                  className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {KHUSUS_PEJABAT_DITUJU_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Keperluan / Agenda <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={keperluan}
                  onChange={(e) => setKeperluan(e.target.value)}
                  placeholder="Contoh: Supervisi & Pembinaan"
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {KHUSUS_KEPERLUAN_PRESETS.slice(0, 2).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setKeperluan(p)}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  No. Surat Tugas (Opsional)
                </Label>
                <Input
                  type="text"
                  value={nomorSuratTugas}
                  onChange={(e) => setNomorSuratTugas(e.target.value)}
                  placeholder="Contoh: 800/123/Disdik/2026"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Pesan & Rekomendasi Dinas (Untuk Bukti Fisik Akreditasi)
              </Label>
              <textarea
                value={pesanKesan}
                onChange={(e) => setPesanKesan(e.target.value)}
                placeholder="Catatan hasil supervisi, rekomendasi akreditasi, atau pesan tindak lanjut..."
                rows={2}
                className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        )}

        {/* ============================================================
            4. TAB: SISWA / GURU (MANUAL / TANPA KARTU)
        ============================================================ */}
        {activeTab === 'MANUAL' && (
          <div className="space-y-3.5">
            {/* Sub-selector: Siswa vs Guru */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualType('SISWA');
                  setSelectedEntity(null);
                  setNama('');
                  setInstansi('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  manualType === 'SISWA'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Siswa Sekolah
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualType('GURU');
                  setSelectedEntity(null);
                  setNama('');
                  setInstansi('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  manualType === 'GURU'
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Guru / Pegawai
              </button>
            </div>

            {/* Entity Selection */}
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Cari {manualType === 'SISWA' ? 'Nama Siswa / NIS' : 'Nama Guru / NIP'} <span className="text-red-500">*</span>
              </Label>
              {selectedEntity ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs">
                      {manualType === 'SISWA' ? 'S' : 'G'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {manualType === 'SISWA' ? selectedEntity.nama_siswa : selectedEntity.nama_guru}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {manualType === 'SISWA' 
                          ? `NIS: ${selectedEntity.nis || '-'} • Kelas: ${selectedEntity.Kelas?.nama_kelas || selectedEntity.kelas?.nama_kelas || '-'}`
                          : `NIP: ${selectedEntity.nip || '-'} • ${selectedEntity.jabatan || 'Dewan Guru'}`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEntity(null);
                      setNama('');
                      setInstansi('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Ketik nama atau ${manualType === 'SISWA' ? 'NIS' : 'NIP'}...`}
                    autoFocus
                    leftIcon={isSearching ? <Loader2 size={13} className="animate-spin text-slate-400" /> : <Search size={13} className="text-slate-400" />}
                    className="text-xs"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map((ent) => (
                        <div
                          key={ent.id}
                          onClick={() => manualType === 'SISWA' ? handleSelectStudent(ent) : handleSelectTeacher(ent)}
                          className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {manualType === 'SISWA' ? ent.nama_siswa : ent.nama_guru}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {manualType === 'SISWA' 
                              ? `Kelas ${ent.Kelas?.nama_kelas || ent.kelas?.nama_kelas || '-'}`
                              : (ent.jabatan || 'Guru')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Keterangan / Alasan
              </Label>
              <Input
                type="text"
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Lupa / Tidak Membawa Kartu RFID"
                className="text-xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['Lupa / Tidak Membawa Kartu RFID', 'Kartu RFID Rusak / Hilang', 'Izin Keluar Sekolah', 'Terlambat Hadir'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setKeperluan(p)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 px-4 rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="text-xs h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Catat Akses</span>
              </>
            )}
          </Button>
        </div>

      </form>
    </Modal>
  );
};
