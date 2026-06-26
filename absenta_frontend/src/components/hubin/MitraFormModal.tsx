import React from 'react';
import type { MitraIndustri } from '../../api/hubin.api';
import { Building2, ShieldAlert, Compass, AlertCircle, Lock, MapPin } from 'lucide-react';
import { calculateDistance } from '../../utils/hubinUtils';
import { HUBIN_CONFIG } from '../../constants/HubinConstants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SimpleFormField } from '../ui/SimpleFormField';
import { toast } from 'react-hot-toast';

interface MitraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingMitra: MitraIndustri | null;
  isPending: boolean;
  isEditKontakOnly?: boolean;
  jurusanList?: any[];
}



export const MitraFormModal: React.FC<MitraFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingMitra,
  isPending,
  isEditKontakOnly = false,
  jurusanList = []
}) => {
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

  const GPS_UPDATE_TOLERANCE_KM = 10; // Batas maksimal perubahan lokasi (10 KM) agar tidak terjadi human error / fraud

  React.useEffect(() => {
    if (!isOpen) {
      setGpsConfirmation(null);
      setMapView('standard');
    }
  }, [isOpen]);

  const handleGetGPSLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Perangkat atau browser Anda tidak mendukung layanan lokasi GPS');
      return;
    }

    const toastId = toast.loading('Mencari sinyal GPS dan mendeteksi lokasi keberadaan Anda...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const existingLatVal = document.getElementById('mitra-lat') as HTMLInputElement;
        const existingLonVal = document.getElementById('mitra-lon') as HTMLInputElement;

        let distanceInfo = '';
        let distanceValue = 0;

        if (existingLatVal && existingLonVal && existingLatVal.value && existingLonVal.value) {
          const exLat = parseFloat(existingLatVal.value);
          const exLon = parseFloat(existingLonVal.value);
          if (!isNaN(exLat) && !isNaN(exLon)) {
            const dist = calculateDistance(exLat, exLon, lat, lon);
            distanceValue = dist;
            if (dist < 1) {
              distanceInfo = 'Lokasi Anda saat ini identik dengan koordinat terdaftar (< 1 meter).';
            } else if (dist < 1000) {
              distanceInfo = `Lokasi Anda saat ini berjarak sekitar ${Math.round(dist)} meter dari koordinat terdaftar.`;
            } else {
              distanceInfo = `Lokasi Anda saat ini berjarak sekitar ${(dist / 1000).toFixed(2)} km dari koordinat terdaftar.`;
            }
          }
        }

        // Reverse Geocoding via OSM Nominatim API
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=id`)
          .then(res => res.json())
          .then(data => {
            toast.dismiss(toastId);
            const addressText = data?.display_name || 'Tidak dapat mendeteksi alamat tertulis secara detail';
            setGpsConfirmation({
              lat,
              lon,
              address: addressText,
              distanceInfo: distanceInfo || undefined,
              distanceValue: distanceValue || undefined
            });
          })
          .catch(() => {
            toast.dismiss(toastId);
            setGpsConfirmation({
              lat,
              lon,
              address: 'Gagal mendeteksi deskripsi alamat dari satelit maps.',
              distanceInfo: distanceInfo || undefined,
              distanceValue: distanceValue || undefined
            });
          });
      },
      (error) => {
        toast.dismiss(toastId);
        let errorMsg = 'Gagal mengakses GPS';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Akses lokasi GPS ditolak oleh pengguna/browser';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Sinyal lokasi GPS tidak tersedia';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu pencarian sinyal GPS habis';
        }
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Locked field inputs style helper
  const lockedInputClass = "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800/80 cursor-not-allowed select-none opacity-80 font-medium";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-600 dark:text-blue-500" size={20} />
            <span>{isEditKontakOnly ? 'Perbarui Kontak, Alamat & Koordinat Perusahaan' : editingMitra ? 'Edit Mitra Industri' : 'Tambah Mitra Industri Baru'}</span>
          </div>
        }
      >
        {isEditKontakOnly && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl flex gap-2.5 items-start">
            <ShieldAlert className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Mode Terbatas (Guru Pembimbing)</span>: Anda diperbolehkan untuk memperbarui informasi **alamat lengkap**, **nomor telepon/kontak**, dan **titik koordinat geofencing** agar pencatatan kehadiran fisik siswa tetap akurat. Detail nama perusahaan, radius wilayah presensi, dan berkas MOU resmi dikunci secara aman oleh pihak HUBIN.
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Hidden inputs to keep values for disabled fields during submission */}
          {isEditKontakOnly && editingMitra && (
            <>
              <input type="hidden" name="nama" value={editingMitra.nama} />
              <input type="hidden" name="bidang" value={editingMitra.bidang || ''} />
              <input type="hidden" name="mou_url" value={editingMitra.mou_url || ''} />
              <input type="hidden" name="radius" value={editingMitra.radius || HUBIN_CONFIG.DEFAULT_RADIUS_METERS} />
              <input type="hidden" name="pic_nama" value={editingMitra.pic_nama || ''} />
              <input type="hidden" name="pic_jabatan" value={editingMitra.pic_jabatan || ''} />
              <input type="hidden" name="pic_telepon" value={editingMitra.pic_telepon || ''} />
              <input type="hidden" name="pic_email" value={editingMitra.pic_email || ''} />
              <input type="hidden" name="mou_nomor" value={editingMitra.mou_nomor || ''} />
              <input type="hidden" name="mou_tanggal_mulai" value={editingMitra.mou_tanggal_mulai || ''} />
              <input type="hidden" name="mou_tanggal_berakhir" value={editingMitra.mou_tanggal_berakhir || ''} />
              <input type="hidden" name="mou_status" value={editingMitra.mou_status || 'AKTIF'} />
              <input type="hidden" name="kuota_pkl" value={editingMitra.kuota_pkl || 0} />
              <input type="hidden" name="kompetensi_keahlian" value={editingMitra.kompetensi_keahlian || ''} />
            </>
          )}

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
              className={isEditKontakOnly ? lockedInputClass : ""}
              placeholder="Contoh: PT. Industri Maju Selaras"
            />
          </SimpleFormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SimpleFormField 
              htmlFor="mitra-bidang"
              label={isEditKontakOnly ? "Bidang Usaha (🔒 Terkunci)" : "Bidang Usaha"}
            >
              <Input
                id="mitra-bidang"
                name="bidang"
                defaultValue={editingMitra?.bidang || ''}
                disabled={isEditKontakOnly}
                className={isEditKontakOnly ? lockedInputClass : ""}
                placeholder="Contoh: Teknologi Informasi / Otomotif"
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="mitra-kontak" label="No. Kontak (WA / Telp) *" required={isEditKontakOnly}>
              <Input
                id="mitra-kontak"
                name="kontak"
                defaultValue={editingMitra?.kontak || ''}
                required={isEditKontakOnly}
                placeholder="Contoh: 08123456789"
                autoFocus={isEditKontakOnly}
                className="bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-900"
              />
            </SimpleFormField>
          </div>

          <SimpleFormField htmlFor="mitra-alamat" label="Alamat Lengkap Perusahaan *" required={isEditKontakOnly}>
            <Textarea
              id="mitra-alamat"
              name="alamat"
              defaultValue={editingMitra?.alamat || ''}
              required={isEditKontakOnly}
              placeholder="Tulis alamat operasional lengkap perusahaan..."
              rows={2}
              className="bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-900"
            />
          </SimpleFormField>

          <SimpleFormField 
            htmlFor="mitra-mou-url"
            label={isEditKontakOnly ? "Tautan / Link Berkas MOU (🔒 Terkunci)" : "Tautan / Link Berkas MOU (Opsional)"}
          >
            <Input
              id="mitra-mou-url"
              name="mou_url"
              type="url"
              defaultValue={editingMitra?.mou_url || ''}
              disabled={isEditKontakOnly}
              className={isEditKontakOnly ? lockedInputClass : ""}
              placeholder="Contoh: https://drive.google.com/..."
            />
          </SimpleFormField>

          {/* Section: PIC Detail (Only editable by Hubin Staff) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl space-y-3 border border-slate-150/50 dark:border-slate-800/40">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">DETAIL PIC INDUSTRI (HUBIN ONLY)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SimpleFormField htmlFor="mitra-pic-nama" label="Nama PIC">
                <Input
                  id="mitra-pic-nama"
                  name="pic_nama"
                  defaultValue={editingMitra?.pic_nama || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                  placeholder="Contoh: Budi Santoso"
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-pic-jabatan" label="Jabatan PIC">
                <Input
                  id="mitra-pic-jabatan"
                  name="pic_jabatan"
                  defaultValue={editingMitra?.pic_jabatan || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                  placeholder="Contoh: HR Manager"
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-pic-telepon" label="No. Telepon/WhatsApp PIC">
                <Input
                  id="mitra-pic-telepon"
                  name="pic_telepon"
                  defaultValue={editingMitra?.pic_telepon || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                  placeholder="Contoh: 0812XXXXXXXX"
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-pic-email" label="Email PIC">
                <Input
                  id="mitra-pic-email"
                  name="pic_email"
                  type="email"
                  defaultValue={editingMitra?.pic_email || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                  placeholder="Contoh: budi@company.com"
                />
              </SimpleFormField>
            </div>
          </div>

          {/* Section: MoU & PKL Capacity (Only editable by Hubin Staff) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl space-y-3 border border-slate-150/50 dark:border-slate-800/40">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">ADMINISTRASI MoU & PKL (HUBIN ONLY)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SimpleFormField htmlFor="mitra-mou-nomor" label="Nomor Kerja Sama / MoU">
                <Input
                  id="mitra-mou-nomor"
                  name="mou_nomor"
                  defaultValue={editingMitra?.mou_nomor || ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
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
                  className={isEditKontakOnly ? lockedInputClass : ""}
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-mou-berakhir" label="Tanggal Berakhir MoU">
                <Input
                  id="mitra-mou-berakhir"
                  name="mou_tanggal_berakhir"
                  type="date"
                  defaultValue={editingMitra?.mou_tanggal_berakhir ? new Date(editingMitra.mou_tanggal_berakhir).toISOString().substring(0, 10) : ''}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-kuota" label="Kuota Penerimaan PKL (Siswa)">
                <Input
                  id="mitra-kuota"
                  name="kuota_pkl"
                  type="number"
                  defaultValue={editingMitra?.kuota_pkl || 0}
                  disabled={isEditKontakOnly}
                  className={isEditKontakOnly ? lockedInputClass : ""}
                  placeholder="Contoh: 5"
                />
              </SimpleFormField>
              <SimpleFormField label="Kesesuaian Kompetensi Keahlian / Jurusan (Pilih dari Jurusan Aktif)">
                {uniqueJurusanAbbreviations.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2.5 border border-slate-150 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                    {uniqueJurusanAbbreviations.map((abb) => {
                      const isChecked = selectedKeahlian.includes(abb);
                      return (
                        <label
                          key={abb}
                          className={`flex items-center gap-2.5 px-3 py-2 border rounded-xl cursor-pointer select-none transition-all duration-150 hover:bg-white dark:hover:bg-slate-900 ${
                            isEditKontakOnly
                              ? 'border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/10 opacity-70 cursor-not-allowed'
                              : isChecked
                                ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-650 dark:text-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-500/20'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={isEditKontakOnly ? undefined : "kompetensi_keahlian"}
                            value={abb}
                            defaultChecked={isChecked}
                            disabled={isEditKontakOnly}
                            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500/20 h-4.5 w-4.5 cursor-pointer disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-700"
                          />
                          <span className="text-[11px] font-bold tracking-wide uppercase text-slate-750 dark:text-slate-350">
                            {abb}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-400 dark:text-slate-550 italic bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-150 dark:border-slate-800/60 text-center">
                    Tidak ada data jurusan terdaftar pada tenant ini. Silakan daftarkan jurusan terlebih dahulu di menu akademik.
                  </div>
                )}
              </SimpleFormField>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">GEOFENCING PRESENSI (OPSIONAL)</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetGPSLocation}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-650 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors bg-white dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <Compass className="animate-pulse text-indigo-500" size={12} />
                  GPS Sinkron
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SimpleFormField htmlFor="mitra-lat" label="Latitude (Editable)">
                <Input
                  id="mitra-lat"
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={editingMitra?.latitude || ''}
                  placeholder="Contoh: -6.8914"
                  className="text-xs bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-900"
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="mitra-lon" label="Longitude (Editable)">
                <Input
                  id="mitra-lon"
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={editingMitra?.longitude || ''}
                  placeholder="Contoh: 107.6104"
                  className="text-xs bg-white dark:bg-slate-950 border-blue-200 dark:border-blue-900"
                />
              </SimpleFormField>
            </div>
            <SimpleFormField 
              htmlFor="mitra-radius"
              label={isEditKontakOnly ? "Radius Jangkauan Absensi (🔒 Terkunci)" : "Radius Jangkauan Absensi (Meter)"}
            >
              <Input
                id="mitra-radius"
                name="radius"
                type="number"
                defaultValue={editingMitra?.radius || HUBIN_CONFIG.DEFAULT_RADIUS_METERS}
                disabled={isEditKontakOnly}
                className={isEditKontakOnly ? `${lockedInputClass} text-xs` : "text-xs"}
                placeholder={`Radius dalam meter (default: ${HUBIN_CONFIG.DEFAULT_RADIUS_METERS})`}
              />
            </SimpleFormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
            <Button
              type="button"
              variant="toolbarOutline"
              onClick={onClose}
              className="px-5 py-2 font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              variant="toolbarPrimary"
              className="px-6 py-2 font-bold"
            >
              {isEditKontakOnly ? 'Simpan Perubahan' : editingMitra ? 'Simpan Perubahan' : 'Tambah Mitra'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Premium Overlay Confirmation Dialog (Desain Keterbacaan yang Dipolish Sempurna!) */}
      {gpsConfirmation && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5">
            
            {/* Dialog Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Compass className="animate-pulse text-indigo-500" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">Konfirmasi Titik Koordinat</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Satelit mendeteksi lokasi keberadaan Anda</p>
              </div>
            </div>

            {/* Visual Map Preview (Tabular Mode: Standard & Satellite) */}
            <div className="space-y-2">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setMapView('standard')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                    mapView === 'standard' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <MapPin size={12} />
                  Peta Standar
                </button>
                <button
                  type="button"
                  onClick={() => setMapView('satellite')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                    mapView === 'satellite' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Compass size={12} />
                  Satelit Maps
                </button>
              </div>

              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 group">
                {mapView === 'standard' ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    title="GPS Standard View"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsConfirmation.lon - 0.003}%2C${gpsConfirmation.lat - 0.0015}%2C${gpsConfirmation.lon + 0.003}%2C${gpsConfirmation.lat + 0.0015}&layer=mapnik&marker=${gpsConfirmation.lat}%2C${gpsConfirmation.lon}`}
                    className="grayscale-[0.1] contrast-[1.1] opacity-90 transition-opacity group-hover:opacity-100"
                  />
                ) : (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    title="GPS Satellite View"
                    src={`https://maps.google.com/maps?q=${gpsConfirmation.lat},${gpsConfirmation.lon}&t=k&z=18&output=embed`}
                    className="opacity-90 transition-opacity group-hover:opacity-100"
                  />
                )}
                
                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-xl shadow-[inner_0_2px_4px_rgba(0,0,0,0.05)]"></div>
                
                {/* External Link Overlay */}
                <a 
                  href={`https://www.google.com/maps?q=${gpsConfirmation.lat},${gpsConfirmation.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                >
                  Buka Google Maps
                </a>
              </div>
            </div>

            {/* Address Container (Desain & Warna pin Identik screenshot Anda!) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-905/60">
              <div className="flex items-start gap-3">
                {/* Cyan pin icon matching screenshot exactly */}
                <div className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                  <svg className="w-6 h-6 stroke-cyan-600 dark:stroke-cyan-400 fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">
                    {gpsConfirmation.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Distance comparison & Coordinates Info (Polishing Keterbacaan) */}
            <div className="text-xs space-y-2 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-950 px-3 py-2.5 rounded-lg font-mono text-[10px]">
                <span>Lat: {gpsConfirmation.lat.toFixed(6)}</span>
                <span>Lon: {gpsConfirmation.lon.toFixed(6)}</span>
              </div>
              {gpsConfirmation.distanceInfo && (
                <div className={`flex items-start gap-2 text-xs font-semibold px-3.5 py-3 rounded-lg border ${
                  gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM
                    ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30'
                }`}>
                  {gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM ? (
                    <ShieldAlert size={16} className="text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span>{gpsConfirmation.distanceInfo}</span>
                    {gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM && (
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase">
                        {isEditKontakOnly 
                          ? `⚠️ Jarak terlalu jauh! Perubahan maksimal ${GPS_UPDATE_TOLERANCE_KM} KM. Silakan hubungi HUBIN jika lokasi perusahaan bergeser jauh.`
                          : `⚠️ Peringatan: Jarak melebihi ${GPS_UPDATE_TOLERANCE_KM} KM. Sebagai HUBIN, Anda dapat mengabaikan peringatan ini jika sedang memperbaiki data.`
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions (Polishing menggunakan Komponen Button Reusable Resmi Absenta!) */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="toolbarOutline"
                className="flex-1 py-2.5 text-xs font-bold"
                onClick={() => {
                  setGpsConfirmation(null);
                  toast.error('Pembaruan lokasi dibatalkan');
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="toolbarPrimary"
                disabled={isEditKontakOnly && !!(gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM)}
                className={`flex-1 py-2.5 text-xs font-bold text-white shadow-md transition-all ${
                  isEditKontakOnly && gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM
                    ? 'bg-slate-300 dark:bg-slate-800 border-slate-300 dark:border-slate-800 cursor-not-allowed opacity-60'
                    : (gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM)
                      ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 shadow-rose-100 dark:shadow-none' // Warna merah untuk HUBIN (Bypass mode)
                      : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-600 hover:border-cyan-500 shadow-cyan-100 dark:shadow-none'
                }`}
                onClick={() => {
                  const latInput = document.getElementById('mitra-lat') as HTMLInputElement;
                  const lonInput = document.getElementById('mitra-lon') as HTMLInputElement;

                  if (latInput) latInput.value = gpsConfirmation.lat.toString();
                  if (lonInput) lonInput.value = gpsConfirmation.lon.toString();
                  
                  setGpsConfirmation(null);
                  toast.success(
                    (gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM)
                    ? 'Koordinat GPS dipaksa diperbarui (Mode Admin)!'
                    : 'Koordinat GPS berhasil diperbarui!'
                  );
                }}
              >
                { (gpsConfirmation.distanceValue && (gpsConfirmation.distanceValue / 1000) > GPS_UPDATE_TOLERANCE_KM) && !isEditKontakOnly 
                  ? 'Paksa Terapkan' 
                  : 'Terapkan Lokasi' 
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MitraFormModal;
