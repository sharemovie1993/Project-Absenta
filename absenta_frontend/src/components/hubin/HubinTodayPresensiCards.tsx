import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Map as MapIcon, MapPin, AlertCircle, AlertTriangle, ShieldCheck, RefreshCw, Camera, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../lib/axiosInstance';
import { Modal, Button } from '../ui';
import { PresensiLocationCard } from './PresensiLocationCard';
import { PresensiActionColumn } from './PresensiActionColumn';
import { HubinCameraModal } from './HubinCameraModal';
import { HUBIN_CONFIG } from '../../constants/HubinConstants';
import { calculateDistance, generateHubinFileName } from '../../utils/hubinUtils';
import { getTimezoneLabel } from '../../utils/attendance/time';

interface TodayAbsensi {
  id?: string;
  jam_masuk?: string;
  jam_pulang?: string;
  status?: string;
  kegiatan?: string;
  is_verified?: boolean;
  is_outside_radius?: boolean;
  distance_meters?: number;
  address_snapshot?: string;
}

interface StudentPkl {
  id: string;
  lat_override?: number;
  lon_override?: number;
  radius_override?: number;
  is_flexible_location?: boolean;
  Siswa?: {
    Kelas?: {
      nama_kelas?: string;
      nama?: string;
    };
  };
  Mitra?: {
    nama?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  };
}

interface MutationProp {
  mutateAsync: (variables: any) => Promise<any>;
}

interface HubinTodayPresensiCardsProps {
  todayAbsensi: TodayAbsensi | null;
  studentPkl: StudentPkl | null;
  location: { lat: number; lng: number; accuracy?: number } | null;
  isMockLocation?: boolean;
  checkInMutation: MutationProp;
  checkOutMutation: MutationProp;
  kegiatan: string;
  studentName?: string;
  onRefreshLocation?: () => void;
  isPklAktif?: boolean;
  onOpenIzinModal?: () => void;
}

export const HubinTodayPresensiCards: React.FC<HubinTodayPresensiCardsProps> = React.memo(({
  todayAbsensi,
  studentPkl,
  location,
  isMockLocation,
  checkInMutation,
  checkOutMutation,
  kegiatan,
  studentName,
  onRefreshLocation,
  isPklAktif = true,
  onOpenIzinModal,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUploading, setIsUploading] = useState<'IN' | 'OUT' | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeType, setActiveType] = useState<'IN' | 'OUT' | null>(null);
  const [isDinasLuarMode, setIsDinasLuarMode] = useState(false);

  // Dialog Konfirmasi Presensi Luar Radius
  const [isConfirmDispensationOpen, setIsConfirmDispensationOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'IN' | 'OUT' | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [dispensationReason, setDispensationReason] = useState<'DINAS_LUAR' | 'KENDALA_GPS' | 'WFH' | 'LAINNYA'>('DINAS_LUAR');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleDinasLuar = useCallback(() => {
    setIsDinasLuarMode((prev) => !prev);
  }, []);

  const className = studentPkl?.Siswa?.Kelas?.nama_kelas || studentPkl?.Siswa?.Kelas?.nama;

  // -- Distance Logic --
  const mitraCoords = useMemo(() => {
    // Priority: Override -> Mitra
    if (studentPkl?.lat_override && studentPkl?.lon_override) {
      return { lat: studentPkl.lat_override, lng: studentPkl.lon_override };
    }
    if (studentPkl?.Mitra?.latitude && studentPkl?.Mitra?.longitude) {
      return { lat: studentPkl.Mitra.latitude, lng: studentPkl.Mitra.longitude };
    }
    return null;
  }, [studentPkl]);

  const distanceInfo = useMemo(() => {
    // Priority: Override -> Mitra -> Default
    const defaultRadius = studentPkl?.radius_override || studentPkl?.Mitra?.radius || HUBIN_CONFIG.DEFAULT_RADIUS_METERS;
    if (!location || !mitraCoords) return { distance: null, inRange: false, radius: defaultRadius };
    const dist = calculateDistance(location.lat, location.lng, mitraCoords.lat, mitraCoords.lng);
    return { distance: dist, inRange: dist <= defaultRadius, radius: defaultRadius };
  }, [location, mitraCoords, studentPkl]);

  const isGpsNotSet = !mitraCoords;
  const isOutsideRadius = !isGpsNotSet && !distanceInfo.inRange;

  // Helper untuk fetch reverse geocoding address (Nama Jalan)
  const resolveCurrentAddress = useCallback(async () => {
    if (!location?.lat || !location?.lng) return '';
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=id`);
      const data = await res.json();
      const addr = data?.display_name || '';
      if (addr) {
        setDetectedAddress(addr);
        return addr;
      }
    } catch (e) {
      console.warn('Gagal mengambil snapshot alamat OpenStreetMap');
    } finally {
      setIsResolvingAddress(false);
    }
    return '';
  }, [location?.lat, location?.lng]);

  // Otomatis fetch alamat sekali saat terdeteksi luar radius / no GPS
  useEffect(() => {
    if ((isOutsideRadius || isGpsNotSet) && location && !detectedAddress && !isResolvingAddress) {
      resolveCurrentAddress();
    }
  }, [isOutsideRadius, isGpsNotSet, location, detectedAddress, isResolvingAddress, resolveCurrentAddress]);

  // -- Action Logic --
  const triggerCamera = useCallback((type: 'IN' | 'OUT') => {
    setActiveType(type);
    setIsCameraOpen(true);
  }, []);

  const handleActionClick = useCallback((type: 'IN' | 'OUT') => {
    if (!isPklAktif || !location || isMockLocation) return;

    // 1. Jika GPS mitra belum disetel oleh sekolah:
    // Langsung buka kamera selfie! Jangan bebani siswa dengan dialog konfirmasi tugas luar.
    if (isGpsNotSet) {
      triggerCamera(type);
      return;
    }

    // 2. Jika dalam radius atau sudah aktif mode dispensasi atau flexible location:
    if (distanceInfo.inRange || isDinasLuarMode || studentPkl?.is_flexible_location) {
      triggerCamera(type);
      return;
    }

    // 3. Hanya jika mitra ada GPS dan siswa nyata-nyata di luar radius:
    setPendingActionType(type);
    setIsConfirmDispensationOpen(true);
    if (!detectedAddress) {
      resolveCurrentAddress();
    }
  }, [isPklAktif, location, isMockLocation, isGpsNotSet, distanceInfo.inRange, isDinasLuarMode, studentPkl?.is_flexible_location, triggerCamera, detectedAddress, resolveCurrentAddress]);

  const handleConfirmDispensation = useCallback(() => {
    setIsDinasLuarMode(true);
    setIsConfirmDispensationOpen(false);
    if (pendingActionType) {
      triggerCamera(pendingActionType);
    }
  }, [pendingActionType, triggerCamera]);

  const handleCapture = useCallback(async (file: File | null) => {
    const type = activeType;
    if (!type) return;

    let uploadedUrl = '';
    let uploadToast: string | undefined = undefined;

    try {
      // Dapatkan address snapshot
      let addressSnapshot = detectedAddress;
      if (!addressSnapshot && (!distanceInfo.inRange || isDinasLuarMode)) {
        addressSnapshot = await resolveCurrentAddress();
      }

      if (file) {
        uploadToast = toast.loading(`Mengunggah foto bukti ${type === 'IN' ? 'Masuk' : 'Pulang'}...`);
        setIsUploading(type);

        const formData = new FormData();
        if (className) formData.append('folder_name', className);
        const customFileName = generateHubinFileName(studentName, className, type === 'IN' ? 'CheckIn' : 'CheckOut');
        formData.append('file', file, customFileName);

        const res = await axiosInstance.post('/hubin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        uploadedUrl = res.data?.data?.url || res.data?.url || '';
        if (!uploadedUrl) throw new Error('Gagal mendapatkan URL foto');
      } else {
        setIsUploading(type);
      }

      // Format keterangan alasan jika di luar radius
      let combinedKegiatan = kegiatan.trim();
      if (isOutsideRadius) {
        const reasonMap: Record<string, string> = {
          DINAS_LUAR: 'Tugas Lapangan / Luar',
          KENDALA_GPS: 'Sinyal GPS Lemah di Gedung',
          WFH: 'Bekerja Daring / WFH',
          LAINNYA: customReasonNote.trim() || 'Luar Radius'
        };
        const reasonTitle = reasonMap[dispensationReason] || 'Tugas Luar';
        const noteDetail = customReasonNote.trim() && dispensationReason !== 'LAINNYA' ? ` - ${customReasonNote.trim()}` : '';
        const tagText = `[Alasan Presensi: ${reasonTitle}${noteDetail}]`;
        
        combinedKegiatan = combinedKegiatan ? `${tagText} ${combinedKegiatan}` : tagText;
      }

      if (type === 'IN') {
        const initialActivities = combinedKegiatan
          ? [{ time: format(new Date(), 'HH:mm'), text: combinedKegiatan }]
          : [];
        await checkInMutation.mutateAsync({ 
          siswaPklId: studentPkl?.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          kegiatan: initialActivities.length ? JSON.stringify(initialActivities) : '', 
          image_url: uploadedUrl || undefined,
          is_dinas_luar: isDinasLuarMode || isOutsideRadius || isGpsNotSet,
          address_snapshot: addressSnapshot
        });
      } else {
        await checkOutMutation.mutateAsync({ 
          siswaPklId: studentPkl?.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          image_url: uploadedUrl || undefined,
          is_dinas_luar: isDinasLuarMode || isOutsideRadius || isGpsNotSet,
          address_snapshot: addressSnapshot
        });
      }
      if (uploadToast) toast.dismiss(uploadToast);
    } catch (err: any) {
      if (uploadToast) toast.dismiss(uploadToast);
      if (!err.response?.data?.message || !err.config?.url?.includes('/absensi/')) {
        toast.error('Gagal: ' + (err.response?.data?.message || err.message || 'Error Unknown'));
      }
      console.error('Presensi Error:', err);
    } finally {
      setIsUploading(null);
    }
  }, [activeType, detectedAddress, distanceInfo.inRange, isDinasLuarMode, isOutsideRadius, isGpsNotSet, resolveCurrentAddress, className, studentName, kegiatan, checkInMutation, checkOutMutation, studentPkl, location, dispensationReason, customReasonNote]);

  const isCheckedIn = !!todayAbsensi?.jam_masuk;
  const isCheckedOut = !!todayAbsensi?.jam_pulang;
  const isComplete = isCheckedIn && isCheckedOut;
  const isIzinOrSakit = todayAbsensi?.status === 'SAKIT' || todayAbsensi?.status === 'IZIN';

  // Status ketersediaan tombol
  const hasBaseRequirements = isPklAktif && !isIzinOrSakit && !!location && !isMockLocation;

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl text-slate-900 dark:text-white shadow-2xl relative overflow-hidden flex flex-col items-center p-0 border border-slate-100 dark:border-slate-800 animate-fadeIn">
      <HubinCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
        title={activeType === 'IN' ? 'Foto Bukti Masuk' : 'Foto Bukti Pulang'}
      />

      {/* Modal Konfirmasi Absen Luar Jangkauan yang Ramah & Jelas bagi Siswa */}
      <Modal
        isOpen={isConfirmDispensationOpen}
        onClose={() => setIsConfirmDispensationOpen(false)}
        title="Presensi di Luar Radius Mitra"
        size="md"
      >
        <div className="space-y-4 py-1">
          {/* Info Status Jarak */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={18} />
            </div>
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-black text-sm">
                Posisi Anda Terdeteksi di Luar Radius Mitra
              </p>
              <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                Jarak Anda saat ini berjarak <strong className="font-bold">{Math.round(distanceInfo.distance || 0)} meter</strong> dari lokasi <strong className="font-bold">{studentPkl?.Mitra?.nama || 'Mitra PKL'}</strong>.
              </p>
            </div>
          </div>

          {/* Alamat Riil Terdeteksi */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Lokasi Anda Saat Ini:</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    GPS Terdeteksi
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                  {isResolvingAddress 
                    ? 'Mendeteksi nama jalan...' 
                    : detectedAddress || (location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Koordinat GPS')}
                </p>
              </div>
            </div>
          </div>

          {/* Pemilihan Alasan Presensi Luar Radius */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Pilih Alasan Kehadiran Anda:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'DINAS_LUAR', label: '🏢 Tugas Lapangan / Luar', desc: 'Kunjungan mitra / proyek luar' },
                { key: 'KENDALA_GPS', label: '📶 Sinyal GPS Melompat', desc: 'Sudah di lokasi / gedung' },
                { key: 'WFH', label: '💻 Bekerja Daring / WFH', desc: 'Penugasan jarak jauh' },
                { key: 'LAINNYA', label: '✏️ Keterangan Lain', desc: 'Catatan tertulis' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDispensationReason(opt.key as any)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    dispensationReason === opt.key
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-bold block">{opt.label}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Input Keterangan Tambahan / Lainnya */}
            <div className="pt-1">
              <input
                type="text"
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                placeholder={dispensationReason === 'LAINNYA' ? 'Tuliskan alasan kehadiran luar radius Anda...' : 'Catatan tambahan untuk Guru Pembimbing (opsional)...'}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* Jaminan Ketenangan untuk Siswa */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Presensi Anda tetap sah tercatat dan diteruskan ke Guru Pembimbing untuk verifikasi.</span>
          </div>

          <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsConfirmDispensationOpen(false);
                onRefreshLocation?.();
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Coba Refresh GPS</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmDispensation}
              className="text-xs flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
            >
              <Camera size={13} />
              <span>Lanjutkan &amp; Ambil Foto</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className="w-full py-2.5 sm:py-3 px-4 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <h2 className="text-[11px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: localeID })} | {format(currentTime, 'HH:mm:ss')} {getTimezoneLabel()}
        </h2>
      </div>

      {/* Location */}
      <PresensiLocationCard 
        mitraName={studentPkl?.Mitra?.nama} 
        distanceInfo={distanceInfo} 
        location={location} 
        onRefresh={onRefreshLocation}
      />

      {/* Proteksi Absen Ganda: Banner Khusus Sakit & Izin */}
      {isIzinOrSakit && (
        <div className="w-full px-4 py-3 bg-amber-50/90 dark:bg-amber-950/40 border-y border-amber-200 dark:border-amber-800/80 flex items-start sm:items-center gap-2.5 text-amber-800 dark:text-amber-200">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold text-xs">
            ⚠️
          </div>
          <div className="text-[11px] leading-snug font-medium">
            <span className="font-bold">Presensi Kehadiran Terkunci:</span> Anda tercatat berstatus <strong className="uppercase font-black text-amber-700 dark:text-amber-300">{todayAbsensi?.status}</strong> hari ini. Tombol check-in masuk dan pulang dinonaktifkan untuk mencegah presensi ganda.
          </div>
        </div>
      )}

      {/* Banner Ramah: Sebelum Check-In (Jika GPS Mitra Belum Disetel Sekolah) */}
      {isGpsNotSet && location && !isMockLocation && !isCheckedIn && !isIzinOrSakit && (
        <div className="w-full px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/30 border-y border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Camera size={12} />
          </div>
          <div className="text-[9px] sm:text-[10px] text-indigo-900 dark:text-indigo-200 leading-tight">
            <span className="font-bold">Info Presensi:</span> Titik GPS mitra belum disetel sekolah. Presensi Anda hari ini cukup menggunakan <strong className="text-indigo-700 dark:text-indigo-300">foto selfie kehadiran</strong>.
          </div>
        </div>
      )}

      {/* Banner Ramah: Sebelum Check-In (Jika Siswa Berada di Luar Radius Mitra) */}
      {isOutsideRadius && location && !isMockLocation && !isCheckedIn && !isIzinOrSakit && (
        <div className="w-full px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-y border-amber-200/80 dark:border-amber-900/40 flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <MapPin size={12} />
          </div>
          <div className="text-[9px] sm:text-[10px] text-amber-900 dark:text-amber-200 leading-tight">
            <span className="font-bold">Di Luar Radius:</span> Anda berjarak {Math.round(distanceInfo.distance || 0)}m dari mitra. Jika sedang tugas luar, silakan check-in menggunakan foto selfie.
          </div>
        </div>
      )}

      {/* Banner Status Menenangkan: Setelah Check-In Berhasil */}
      {isCheckedIn && !isCheckedOut && !isIzinOrSakit && (
        <div className={`w-full px-4 py-2.5 border-y flex items-center justify-between gap-2.5 ${
          todayAbsensi?.is_outside_radius
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {todayAbsensi?.is_outside_radius ? (
              <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="text-[10px] sm:text-[11px] leading-tight font-medium">
              <span className="font-black">
                {todayAbsensi?.is_outside_radius ? 'Presensi Masuk Tercatat (Di Luar Radius):' : 'Presensi Masuk Berhasil:'}
              </span>{' '}
              {todayAbsensi?.is_outside_radius ? (
                <span>
                  Lokasi tersimpan &amp; siap diverifikasi Guru Pembimbing. Anda dapat melakukan Check-Out saat jam pulang.
                </span>
              ) : (
                <span>
                  Tercatat di area mitra. Silakan lanjutkan aktivitas PKL Anda dan lakukan Check-Out saat jam pulang.
                </span>
              )}
            </div>
          </div>
          {todayAbsensi?.is_outside_radius && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
              todayAbsensi?.is_verified
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
            }`}>
              {todayAbsensi?.is_verified ? 'TERVERIFIKASI' : 'MENUNGGU VERIFIKASI'}
            </span>
          )}
        </div>
      )}

      {/* Actions: 2 Columns */}
      <div className="w-full grid grid-cols-2 border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/20">
        <PresensiActionColumn
          type="IN"
          label="Check-In Masuk"
          scheduleTime={HUBIN_CONFIG.SCHEDULE.CHECK_IN_TIME}
          actualTime={todayAbsensi?.jam_masuk}
          isChecked={isCheckedIn}
          onAction={() => handleActionClick('IN')}
          isDisabled={!hasBaseRequirements}
          isLoading={isUploading === 'IN'}
          isHighlighted={!isCheckedIn}
          statusHint={
            isCheckedIn 
              ? undefined 
              : !location 
              ? 'Mencari sinyal GPS...' 
              : distanceInfo.inRange 
              ? '✓ Dalam Radius Mitra' 
              : isGpsNotSet
              ? '✓ Foto selfie kehadiran'
              : 'Di luar radius (Foto selfie)'
          }
        />
        <PresensiActionColumn
          type="OUT"
          label="Check-Out Pulang"
          scheduleTime={HUBIN_CONFIG.SCHEDULE.CHECK_OUT_TIME}
          actualTime={todayAbsensi?.jam_pulang}
          isChecked={isCheckedOut}
          onAction={() => handleActionClick('OUT')}
          isDisabled={!isCheckedIn || !hasBaseRequirements}
          isLoading={isUploading === 'OUT'}
          isHighlighted={isCheckedIn && !isCheckedOut}
          statusHint={
            !isCheckedIn 
              ? 'Menunggu Check-In Masuk' 
              : isCheckedOut 
              ? undefined 
              : distanceInfo.inRange 
              ? '✓ Dalam Radius Mitra' 
              : isGpsNotSet
              ? '✓ Foto selfie pulang'
              : 'Di luar radius (Foto selfie)'
          }
        />
      </div>

      {/* Done Overlay */}
      {isComplete && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="bg-emerald-500 text-white px-8 py-2 rotate-[-12deg] shadow-2xl border-4 border-white dark:border-slate-900 transform scale-110 font-black text-2xl tracking-[0.25em] opacity-90">
            DONE
          </div>
        </div>
      )}

      {/* Banner Selesai Hari Ini untuk Presensi Luar Radius */}
      {isComplete && todayAbsensi?.is_outside_radius && !isIzinOrSakit && (
        <div className="w-full px-4 py-2 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck size={14} className="text-indigo-500 shrink-0" />
            <span>Presensi Hari Ini Telah Lengkap (Di Luar Radius).</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
            todayAbsensi?.is_verified
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
          }`}>
            {todayAbsensi?.is_verified ? 'TERVERIFIKASI' : 'MENUNGGU VERIFIKASI PEMBIMBING'}
          </span>
        </div>
      )}

      {/* Status Banner jika siswa sedang Izin atau Sakit hari ini */}
      {(todayAbsensi?.status === 'SAKIT' || todayAbsensi?.status === 'IZIN') && (
        <div className={`w-full px-4 py-2.5 border-t flex items-center justify-between gap-2 ${
          todayAbsensi.status === 'SAKIT'
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            : 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase tracking-wider">
              Status Hari Ini: {todayAbsensi.status}
            </span>
            {todayAbsensi.is_verified ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                TERVERIFIKASI
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                MENUNGGU VERIFIKASI PEMBIMBING
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic uppercase tracking-wider">
          {todayAbsensi?.status === 'SAKIT'
            ? 'Anda telah mengajukan izin sakit'
            : todayAbsensi?.status === 'IZIN'
            ? 'Anda telah mengajukan izin keperluan'
            : !isCheckedIn
            ? 'Silakan melakukan check-in masuk'
            : !isCheckedOut
            ? 'Anda sedang dalam masa PKL'
            : 'Presensi hari ini telah selesai'}
        </p>

        {onOpenIzinModal && isPklAktif && (
          isIzinOrSakit ? (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-none">
              ✓ Izin / Sakit Terdaftar
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenIzinModal}
              disabled={isCheckedIn}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 transition-all shadow-2xs ${
                isCheckedIn
                  ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer'
              }`}
              title={isCheckedIn ? 'Anda sudah melakukan check-in hadir hari ini' : undefined}
            >
              <span>Ajukan Izin / Sakit</span>
            </button>
          )
        )}
      </div>
    </div>
  );
});
