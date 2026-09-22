import React from 'react';
import type { MitraIndustri } from '../../api/hubin.api';
import { 
  Building2, 
  ShieldAlert, 
  Compass, 
  AlertCircle, 
  MapPin, 
  Upload, 
  X, 
  Loader2, 
  FileText, 
  Check, 
  Calendar,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { HUBIN_CONFIG } from '../../constants/HubinConstants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SimpleFormField } from '../ui/SimpleFormField';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../lib/axiosInstance';
import { resolveProfilePhotoUrl } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';

interface MitraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingMitra: MitraIndustri | null;
  isPending: boolean;
  isEditKontakOnly?: boolean;
  jurusanList?: any[];
}

export const MitraFormModal: React.FC<MitraFormModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  editingMitra,
  isPending,
  isEditKontakOnly = false,
  jurusanList = []
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState<'profil' | 'geofence' | 'mou'>('profil');

  const uniqueJurusanAbbreviations = React.useMemo(() => {
    if (!jurusanList || !Array.isArray(jurusanList)) return [];
    const set = new Set<string>();
    jurusanList.forEach((j: any) => {
      const abb = (j.singkatan || j.kode || j.nama || '').trim();
      if (abb) {
        set.add(abb);
      }
    });
    return Array.from(set).sort();
  }, [jurusanList]);

  const selectedKeahlian = React.useMemo(() => {
    if (!editingMitra?.kompetensi_keahlian) return [];
    return editingMitra.kompetensi_keahlian.split(',').map((s: string) => s.trim()).filter(Boolean);
  }, [editingMitra?.kompetensi_keahlian]);

  const [gpsConfirmation, setGpsConfirmation] = React.useState<{
    lat: number;
    lon: number;
    address: string;
    distanceInfo?: string;
    distanceValue?: number;
  } | null>(null);

  const [mapView, setMapView] = React.useState<'standard' | 'satellite'>('standard');
  const [logoUrl, setLogoUrl] = React.useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const GPS_UPDATE_TOLERANCE_KM = 10;

  React.useEffect(() => {
    if (isOpen) {
      setLogoUrl(editingMitra?.logo_url || '');
      setActiveTab('profil');
    } else {
      setLogoUrl('');
      setGpsConfirmation(null);
      setMapView('standard');
    }
  }, [isOpen, editingMitra]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file logo maksimal 2 MB');
      e.target.value = '';
      return;
    }

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        setLogoUrl(fileUrl);
        toast.success('Logo perusahaan berhasil diunggah!');
      } else {
        toast.error('Gagal mendapatkan tautan berkas logo');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengunggah file logo';
      toast.error(errorMsg);
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  const handleGetGPSLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Perangkat atau browser Anda tidak mendukung layanan lokasi GPS');
      return;
    }

    const toastId = toast.loading('Mencari sinyal GPS dan mendeteksi lokasi keberadaan Anda...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss(toastId);
        const { latitude: lat, longitude: lon } = pos.coords;

        let address = `Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (err) {
          console.error("Geocoding failed", err);
        }

        let distanceInfo: string | undefined = undefined;
        let distanceVal: number | undefined = undefined;
        if (editingMitra && editingMitra.latitude && editingMitra.longitude) {
          const d = calculateDistance(editingMitra.latitude, editingMitra.longitude, lat, lon);
          distanceVal = d;
          if (d > 1000) {
            distanceInfo = `Jarak dari titik tersimpan sebelumnya: ${(d / 1000).toFixed(2)} KM`;
          } else {
            distanceInfo = `Jarak dari titik tersimpan sebelumnya: ${Math.round(d)} meter`;
          }
        }

        setGpsConfirmation({
          lat,
          lon,
          address,
          distanceInfo,
          distanceValue: distanceVal
        });
      },
      (err) => {
        toast.dismiss(toastId);
        console.error("Geolocation error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda.');
        } else {
          toast.error('Gagal mendapatkan lokasi. Pastikan GPS perangkat Anda aktif.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [editingMitra]);

  const lockedInputClass = "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800/80 cursor-not-allowed select-none opacity-80 font-medium";

  // Calculate days remaining for MoU
  const mouExpiryInfo = React.useMemo(() => {
    if (!editingMitra?.mou_tanggal_berakhir) return null;
    const end = new Date(editingMitra.mou_tanggal_berakhir);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      dateFormatted: end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      days: diffDays,
      isExpired: diffDays <= 0,
      isExpiringSoon: diffDays > 0 && diffDays <= 30,
    };
  }, [editingMitra?.mou_tanggal_berakhir]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        placement={isMobile ? 'bottom' : 'center'}
        className="max-w-2xl"
        title={
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-600 dark:text-blue-500" size={20} />
            <span className="text-sm sm:text-base font-bold">
              {isEditKontakOnly ? 'Perbarui Kontak, Alamat & Koordinat Perusahaan' : editingMitra ? 'Edit Mitra Industri' : 'Tambah Mitra Industri Baru'}
            </span>
          </div>
        }
      >
        {isEditKontakOnly && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl flex gap-2.5 items-start">
            <ShieldAlert className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Mode Terbatas (Guru Pembimbing)</span>: Anda diperbolehkan untuk memperbarui informasi **alamat lengkap**, **kontak perusahaan / narahubung PIC (Nama, Jabatan, HP/WA, Email)**, dan **titik koordinat geofencing GPS** agar komunikasi dan validasi kehadiran siswa akurat. Nama resmi perusahaan, kuota, dan dokumen MoU dikunci oleh admin HUBIN.
            </div>
          </div>
        )}

        {/* Tab Segmented Control - Mobile Friendly */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl mb-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'profil'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 size={13} />
            <span>Profil & PIC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'geofence'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass size={13} />
            <span>Geofence GPS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mou')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'mou'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText size={13} />
            <span>MoU & Kuota {isEditKontakOnly ? '(🔒)' : ''}</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Hidden inputs for locked fields in Pembimbing mode */}
          {isEditKontakOnly && editingMitra && (
            <>
              <input type="hidden" name="nama" value={editingMitra.nama} />
              <input type="hidden" name="logo_url" value={editingMitra.logo_url || ''} />
              <input type="hidden" name="bidang" value={editingMitra.bidang || ''} />
              <input type="hidden" name="mou_url" value={editingMitra.mou_url || ''} />
              <input type="hidden" name="radius" value={editingMitra.radius || HUBIN_CONFIG.DEFAULT_RADIUS_METERS} />
              <input type="hidden" name="mou_nomor" value={editingMitra.mou_nomor || ''} />
              <input type="hidden" name="mou_tanggal_mulai" value={editingMitra.mou_tanggal_mulai || ''} />
              <input type="hidden" name="mou_tanggal_berakhir" value={editingMitra.mou_tanggal_berakhir || ''} />
              <input type="hidden" name="mou_status" value={editingMitra.mou_status || 'AKTIF'} />
              <input type="hidden" name="kuota_pkl" value={editingMitra.kuota_pkl || 0} />
              <input type="hidden" name="kompetensi_keahlian" value={editingMitra.kompetensi_keahlian || ''} />
            </>
          )}

          <input type="hidden" name="logo_url" value={logoUrl} />

          {/* ============================================================
              TAB 1: PROFIL & PIC PERUSAHAAN
          ============================================================ */}
          <div className={activeTab === 'profil' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            {/* Logo Perusahaan */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-800/60">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Logo Perusahaan
                {isEditKontakOnly && <span className="text-slate-400 font-normal ml-1">(🔒 Terkunci)</span>}
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {logoUrl ? (
                    <img
                      src={resolveProfilePhotoUrl(logoUrl)}
                      alt="Logo Perusahaan"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                      <Building2 size={24} />
                      <span className="text-[8px] font-semibold mt-0.5">No Logo</span>
                    </div>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-xs">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <p className="text-[11px] text-slate-500">Maksimum 2 MB (PNG, JPG, SVG, WEBP).</p>
                  {!isEditKontakOnly && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="sm"
                        disabled={isUploadingLogo}
                        onClick={() => logoFileInputRef.current?.click()}
                        className="text-xs h-7 px-2.5 gap-1 font-medium"
                      >
                        <Upload size={12} />
                        {logoUrl ? 'Ganti Logo' : 'Unggah Logo'}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isUploadingLogo}
                          onClick={() => setLogoUrl('')}
                          className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1 font-medium"
                        >
                          <X size={12} />
                          Hapus
                        </Button>
                      )}
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SimpleFormField 
              htmlFor="mitra-nama"
              label={isEditKontakOnly ? "Nama Perusahaan (🔒 Terkunci oleh HUBIN)" : "Nama Perusahaan"} 
              required={!isEditKontakOnly}
            >
              <Input
                id="mitra-nama"
                name="nama"
                defaultValue={editingMitra?.nama}
                required={!isEditKontakOnly}
                disabled={isEditKontakOnly}
                className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                placeholder="Contoh: PT. Industri Maju Selaras"
              />
            </SimpleFormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SimpleFormField 
                htmlFor="mitra-bidang"
                label={isEditKontakOnly ? "Bidang Usaha (🔒 Terkunci)" : "Bidang Usaha"}
              >
                <Input
                  id="mitra-bidang"
                  name="bidang"
                  defaultValue={editingMitra?.bidang || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                  placeholder="Contoh: IT / Rekayasa Perangkat Lunak"
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-kontak" label="No. Kontak Kantor (WA / Telp) *" required={isEditKontakOnly}>
                <Input
                  id="mitra-kontak"
                  name="kontak"
                  defaultValue={editingMitra?.kontak || ''}
                  required={isEditKontakOnly}
                  placeholder="Contoh: 021-123456 / 0812xxxx"
                  className="text-xs"
                />
              </SimpleFormField>
            </div>

            <SimpleFormField htmlFor="mitra-alamat" label="Alamat Lengkap Perusahaan *" required={isEditKontakOnly}>
              <Textarea
                id="mitra-alamat"
                name="alamat"
                defaultValue={editingMitra?.alamat || ''}
                required={isEditKontakOnly}
                placeholder="Tulis alamat operasional kantor / tempat PKL..."
                rows={2}
                className="text-xs"
              />
            </SimpleFormField>

            {/* Section: PIC Detail */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl space-y-2.5 border border-slate-200/60 dark:border-slate-800/40">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DETAIL PIC / NARAHUBUNG INDUSTRI</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <SimpleFormField htmlFor="mitra-pic-nama" label="Nama Lengkap PIC">
                  <Input
                    id="mitra-pic-nama"
                    name="pic_nama"
                    defaultValue={editingMitra?.pic_nama || ''}
                    className="text-xs"
                    placeholder="Contoh: Budi Santoso"
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="mitra-pic-jabatan" label="Jabatan PIC">
                  <Input
                    id="mitra-pic-jabatan"
                    name="pic_jabatan"
                    defaultValue={editingMitra?.pic_jabatan || ''}
                    className="text-xs"
                    placeholder="Contoh: HR Manager"
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="mitra-pic-telepon" label="No. HP/WhatsApp PIC">
                  <Input
                    id="mitra-pic-telepon"
                    name="pic_telepon"
                    defaultValue={editingMitra?.pic_telepon || ''}
                    className="text-xs"
                    placeholder="Contoh: 0812XXXXXXXX"
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="mitra-pic-email" label="Email PIC">
                  <Input
                    id="mitra-pic-email"
                    name="pic_email"
                    type="email"
                    defaultValue={editingMitra?.pic_email || ''}
                    className="text-xs"
                    placeholder="Contoh: budi@company.com"
                  />
                </SimpleFormField>
              </div>
            </div>
          </div>

          {/* ============================================================
              TAB 2: GEOFENCE GPS & RADIUS PRESENSI
          ============================================================ */}
          <div className={activeTab === 'geofence' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-3 border border-slate-200/70 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">TITIK KOORDINAT PRESENSI PKL</p>
                  <p className="text-[11px] text-slate-400">Digunakan untuk memvalidasi radius Check-In mandiri siswa PKL.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGetGPSLocation}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs transition-colors"
                >
                  <Compass className="text-indigo-500 animate-pulse" size={13} />
                  GPS Sinkron Perangkat
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SimpleFormField htmlFor="mitra-lat" label="Latitude">
                  <Input
                    id="mitra-lat"
                    name="latitude"
                    type="number"
                    step="any"
                    defaultValue={editingMitra?.latitude || ''}
                    className="text-xs font-mono"
                    placeholder="Contoh: -6.914744"
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="mitra-lon" label="Longitude">
                  <Input
                    id="mitra-lon"
                    name="longitude"
                    type="number"
                    step="any"
                    defaultValue={editingMitra?.longitude || ''}
                    className="text-xs font-mono"
                    placeholder="Contoh: 107.609810"
                  />
                </SimpleFormField>
              </div>

              <SimpleFormField 
                htmlFor="mitra-radius" 
                label={isEditKontakOnly ? "Radius Jangkauan Absensi (🔒 Terkunci)" : "Radius Jangkauan Presensi (Meter)"}
              >
                <Input
                  id="mitra-radius"
                  name="radius"
                  type="number"
                  defaultValue={editingMitra?.radius || HUBIN_CONFIG.DEFAULT_RADIUS_METERS}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? `${lockedInputClass} text-xs` : "text-xs"}
                  placeholder={`Default: ${HUBIN_CONFIG.DEFAULT_RADIUS_METERS} meter`}
                />
              </SimpleFormField>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <MapPin size={15} className="shrink-0 mt-0.5 text-blue-500" />
                <span>Siswa yang berada di luar radius ini saat Check-In akan ditolak secara otomatis kecuali mengaktifkan mode Dinas Luar.</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              TAB 3: DOKUMEN MOU & KUOTA PKL
          ============================================================ */}
          <div className={activeTab === 'mou' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            {/* Quick Expiry Alert Banner */}
            {mouExpiryInfo && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
                mouExpiryInfo.isExpired
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                  : mouExpiryInfo.isExpiringSoon
                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="shrink-0" />
                  <span>
                    Masa Berlaku MoU: <strong>{mouExpiryInfo.dateFormatted}</strong>
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30 font-bold uppercase">
                  {mouExpiryInfo.isExpired ? 'Expired' : mouExpiryInfo.isExpiringSoon ? `Sisa ${mouExpiryInfo.days} Hari` : 'Aktif'}
                </span>
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-3 border border-slate-200/70 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">LEGALITAS KERJA SAMA (MOU)</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SimpleFormField htmlFor="mitra-mou-nomor" label="Nomor Kerja Sama / MoU">
                  <Input
                    id="mitra-mou-nomor"
                    name="mou_nomor"
                    defaultValue={editingMitra?.mou_nomor || ''}
                    disabled={isEditKontakOnly}
                    className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                    placeholder="Contoh: 002/MOU/SMK/2026"
                  />
                </SimpleFormField>

                <SimpleFormField htmlFor="mitra-mou-status" label="Status MoU">
                  <select
                    id="mitra-mou-status"
                    name="mou_status"
                    defaultValue={editingMitra?.mou_status || 'AKTIF'}
                    disabled={isEditKontakOnly}
                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs outline-hidden ${isEditKontakOnly ? lockedInputClass : ''}`}
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
                  </select>
                </SimpleFormField>

                <SimpleFormField htmlFor="mitra-mou-mulai" label="Tanggal Mulai MoU">
                  <Input
                    id="mitra-mou-mulai"
                    name="mou_tanggal_mulai"
                    type="date"
                    defaultValue={editingMitra?.mou_tanggal_mulai ? new Date(editingMitra.mou_tanggal_mulai).toISOString().substring(0, 10) : ''}
                    disabled={isEditKontakOnly}
                    className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                  />
                </SimpleFormField>

                <SimpleFormField htmlFor="mitra-mou-berakhir" label="Tanggal Berakhir MoU">
                  <Input
                    id="mitra-mou-berakhir"
                    name="mou_tanggal_berakhir"
                    type="date"
                    defaultValue={editingMitra?.mou_tanggal_berakhir ? new Date(editingMitra.mou_tanggal_berakhir).toISOString().substring(0, 10) : ''}
                    disabled={isEditKontakOnly}
                    className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                  />
                </SimpleFormField>
              </div>

              <SimpleFormField 
                htmlFor="mitra-mou-url"
                label={isEditKontakOnly ? "Tautan Berkas MoU (🔒 Terkunci)" : "Tautan Berkas MoU (Google Drive / Cloud PDF)"}
              >
                <Input
                  id="mitra-mou-url"
                  name="mou_url"
                  type="url"
                  defaultValue={editingMitra?.mou_url || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : "text-xs font-mono"}
                  placeholder="Contoh: https://drive.google.com/file/d/..."
                />
              </SimpleFormField>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">KAPASITAS & JURUSAN PKL</p>
                
                <SimpleFormField htmlFor="mitra-kuota" label="Kuota Penerimaan Siswa PKL (Total)">
                  <Input
                    id="mitra-kuota"
                    name="kuota_pkl"
                    type="number"
                    defaultValue={editingMitra?.kuota_pkl || 0}
                    disabled={isEditKontakOnly}
                    className={isEditKontakOnly ? lockedInputClass : "text-xs"}
                    placeholder="Contoh: 5"
                  />
                </SimpleFormField>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kesesuaian Jurusan (Pilih dari Jurusan Aktif)
                  </label>
                  {uniqueJurusanAbbreviations.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950">
                      {uniqueJurusanAbbreviations.map((abb) => {
                        const isChecked = selectedKeahlian.includes(abb);
                        return (
                          <label
                            key={abb}
                            className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg cursor-pointer text-xs transition-all ${
                              isEditKontakOnly
                                ? 'border-slate-200 opacity-60 cursor-not-allowed'
                                : isChecked
                                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-bold'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={isEditKontakOnly ? undefined : "kompetensi_keahlian"}
                              value={abb}
                              defaultChecked={isChecked}
                              disabled={isEditKontakOnly}
                              className="rounded text-indigo-600 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="truncate uppercase">{abb}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Belum ada jurusan terdaftar.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="toolbarOutline"
              onClick={onClose}
              className="text-xs h-9 px-4 rounded-xl font-bold"
            >
              Batal
            </Button>

            <div className="flex items-center gap-2">
              {/* Tab Navigation Shortcuts */}
              {activeTab === 'profil' && (
                <Button
                  type="button"
                  variant="toolbarOutline"
                  onClick={() => setActiveTab('geofence')}
                  className="text-xs h-9 px-3.5 rounded-xl gap-1 font-bold text-slate-700 dark:text-slate-200"
                >
                  <span>Geofence</span>
                  <ChevronRight size={13} />
                </Button>
              )}
              {activeTab === 'geofence' && (
                <>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    onClick={() => setActiveTab('profil')}
                    className="text-xs h-9 px-3 rounded-xl gap-1 font-bold text-slate-600"
                  >
                    <ChevronLeft size={13} />
                    <span>Profil</span>
                  </Button>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    onClick={() => setActiveTab('mou')}
                    className="text-xs h-9 px-3.5 rounded-xl gap-1 font-bold text-slate-700 dark:text-slate-200"
                  >
                    <span>MoU & Kuota</span>
                    <ChevronRight size={13} />
                  </Button>
                </>
              )}
              {activeTab === 'mou' && (
                <Button
                  type="button"
                  variant="toolbarOutline"
                  onClick={() => setActiveTab('geofence')}
                  className="text-xs h-9 px-3 rounded-xl gap-1 font-bold text-slate-600"
                >
                  <ChevronLeft size={13} />
                  <span>Geofence</span>
                </Button>
              )}

              {/* Main Submit Button (Always accessible) */}
              <Button
                type="submit"
                isLoading={isPending}
                variant="toolbarPrimary"
                className="text-xs h-9 px-5 rounded-xl font-bold gap-1.5"
              >
                <Check size={14} />
                <span>{isEditKontakOnly ? 'Simpan Kontak' : editingMitra ? 'Simpan Perubahan' : 'Tambah Mitra'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* GPS Confirmation Dialog */}
      {gpsConfirmation && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
                <Compass size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Konfirmasi Titik Koordinat</h3>
                <p className="text-[10px] text-slate-400">Deteksi lokasi satelit GPS</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {gpsConfirmation.address}
              </p>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
                <span>Lat: {gpsConfirmation.lat.toFixed(6)}</span>
                <span>Lon: {gpsConfirmation.lon.toFixed(6)}</span>
              </div>
            </div>

            {gpsConfirmation.distanceInfo && (
              <div className="text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200/60 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{gpsConfirmation.distanceInfo}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="toolbarOutline"
                className="flex-1 text-xs h-9 font-bold"
                onClick={() => setGpsConfirmation(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="toolbarPrimary"
                className="flex-1 text-xs h-9 font-bold"
                onClick={() => {
                  const latInput = document.getElementById('mitra-lat') as HTMLInputElement;
                  const lonInput = document.getElementById('mitra-lon') as HTMLInputElement;
                  if (latInput) latInput.value = gpsConfirmation.lat.toString();
                  if (lonInput) lonInput.value = gpsConfirmation.lon.toString();
                  setGpsConfirmation(null);
                  toast.success('Koordinat GPS berhasil diterapkan!');
                }}
              >
                Terapkan Lokasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default MitraFormModal;
