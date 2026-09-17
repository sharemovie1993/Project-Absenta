import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../lib/axiosInstance';
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

  // -- Action Logic --
  const triggerCamera = useCallback((type: 'IN' | 'OUT') => {
    setActiveType(type);
    setIsCameraOpen(true);
  }, []);

  const handleCapture = useCallback(async (file: File | null) => {
    const type = activeType;
    if (!type) return;

    let uploadedUrl = '';
    let uploadToast: string | undefined = undefined;

    try {
      // Get address snapshot if outside radius
      let addressSnapshot = '';
      if (!distanceInfo.inRange || isDinasLuarMode) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location?.lat}&lon=${location?.lng}&accept-language=id`);
          const data = await res.json();
          addressSnapshot = data?.display_name || '';
        } catch (e) {
          console.warn('Gagal mengambil snapshot alamat');
        }
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
        // Presensi tanpa foto
        setIsUploading(type);
      }

      if (type === 'IN') {
        const initialActivities = kegiatan.trim() 
          ? [{ time: format(new Date(), 'HH:mm'), text: kegiatan.trim() }]
          : [];
        await checkInMutation.mutateAsync({ 
          siswaPklId: studentPkl?.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          kegiatan: initialActivities.length ? JSON.stringify(initialActivities) : '', 
          image_url: uploadedUrl || undefined,
          is_dinas_luar: isDinasLuarMode,
          address_snapshot: addressSnapshot
        });
      } else {
        await checkOutMutation.mutateAsync({ 
          siswaPklId: studentPkl?.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          image_url: uploadedUrl || undefined,
          is_dinas_luar: isDinasLuarMode,
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
  }, [activeType, distanceInfo.inRange, isDinasLuarMode, location, className, studentName, kegiatan, checkInMutation, checkOutMutation, studentPkl]);

  const isCheckedIn = !!todayAbsensi?.jam_masuk;
  const isCheckedOut = !!todayAbsensi?.jam_pulang;
  const isComplete = isCheckedIn && isCheckedOut;
  const isIzinOrSakit = todayAbsensi?.status === 'SAKIT' || todayAbsensi?.status === 'IZIN';

  // Is location restricted or can they bypass with "Dinas Luar"?
  const canAction = useMemo(() => {
    if (!isPklAktif) return false;
    if (isIzinOrSakit) return false; // KUNCI: Tidak boleh check-in hadir jika sedang izin atau sakit
    if (!location || !!isMockLocation) return false;
    if (distanceInfo.inRange) return true;
    if (isDinasLuarMode || studentPkl?.is_flexible_location) return true;
    return false;
  }, [isPklAktif, isIzinOrSakit, location, isMockLocation, distanceInfo.inRange, isDinasLuarMode, studentPkl]);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl text-slate-900 dark:text-white shadow-2xl relative overflow-hidden flex flex-col items-center p-0 border border-slate-100 dark:border-slate-800 animate-fadeIn">
      <HubinCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
        title={activeType === 'IN' ? 'Foto Bukti Masuk' : 'Foto Bukti Pulang'}
      />

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

      {/* Dinas Luar Mode Switcher (Smart SaaS Feature) */}
      {!distanceInfo.inRange && location && !isMockLocation && !isCheckedOut && !isIzinOrSakit && (
        <div className="w-full px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Dinas Luar Kota / Field Work</span>
            <span className="text-[7px] sm:text-[8px] font-medium text-amber-600 dark:text-amber-500 italic">Membutuhkan verifikasi pembimbing</span>
          </div>
          <button
            onClick={handleToggleDinasLuar}
            className={`px-2.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all border ${
              isDinasLuarMode 
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                : 'bg-white dark:bg-slate-900 text-amber-600 border-amber-200 dark:border-amber-800 hover:border-amber-500'
            }`}
          >
            {isDinasLuarMode ? 'Mode Aktif' : 'Aktifkan'}
          </button>
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
          onAction={() => triggerCamera('IN')}
          isDisabled={!canAction}
          isLoading={isUploading === 'IN'}
        />
        <PresensiActionColumn
          type="OUT"
          label="Check-Out Pulang"
          scheduleTime={HUBIN_CONFIG.SCHEDULE.CHECK_OUT_TIME}
          actualTime={todayAbsensi?.jam_pulang}
          isChecked={isCheckedOut}
          onAction={() => triggerCamera('OUT')}
          isDisabled={!isCheckedIn || !canAction}
          isLoading={isUploading === 'OUT'}
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
