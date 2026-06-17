import React, { useState, useMemo, useEffect } from 'react';
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

interface HubinTodayPresensiCardsProps {
  todayAbsensi: any;
  studentPkl: any;
  location: { lat: number; lng: number; accuracy?: number } | null;
  isMockLocation?: boolean;
  checkInMutation: any;
  checkOutMutation: any;
  kegiatan: string;
  studentName?: string;
  onRefreshLocation?: () => void;
}

export const HubinTodayPresensiCards: React.FC<HubinTodayPresensiCardsProps> = ({
  todayAbsensi,
  studentPkl,
  location,
  isMockLocation,
  checkInMutation,
  checkOutMutation,
  kegiatan,
  studentName,
  onRefreshLocation,
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
  const triggerCamera = (type: 'IN' | 'OUT') => {
    setActiveType(type);
    setIsCameraOpen(true);
  };

  const handleCapture = async (file: File) => {
    const type = activeType;
    if (!file || !type) return;

    const uploadToast = toast.loading(`Mengunggah foto bukti ${type === 'IN' ? 'Masuk' : 'Pulang'}...`);
    setIsUploading(type);

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

      const formData = new FormData();
      if (className) formData.append('folder_name', className);
      const customFileName = generateHubinFileName(studentName, className, type === 'IN' ? 'CheckIn' : 'CheckOut');
      formData.append('file', file, customFileName);

      const res = await axiosInstance.post('/hubin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data?.data?.url || res.data?.url || '';
      if (!uploadedUrl) throw new Error('Gagal mendapatkan URL foto');

      if (type === 'IN') {
        const initialActivities = kegiatan.trim() 
          ? [{ time: format(new Date(), 'HH:mm'), text: kegiatan.trim() }]
          : [];
        await checkInMutation.mutateAsync({ 
          siswaPklId: studentPkl.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          kegiatan: initialActivities.length ? JSON.stringify(initialActivities) : '', 
          image_url: uploadedUrl,
          is_dinas_luar: isDinasLuarMode,
          address_snapshot: addressSnapshot
        });
      } else {
        await checkOutMutation.mutateAsync({ 
          siswaPklId: studentPkl.id, 
          latitude: location?.lat, 
          longitude: location?.lng, 
          image_url: uploadedUrl,
          is_dinas_luar: isDinasLuarMode,
          address_snapshot: addressSnapshot
        });
      }
      toast.dismiss(uploadToast);
    } catch (err: any) {
      toast.dismiss(uploadToast);
      if (!err.response?.data?.message || !err.config?.url?.includes('/absensi/')) {
        toast.error('Gagal: ' + (err.response?.data?.message || err.message || 'Error Unknown'));
      }
      console.error('Presensi Error:', err);
    } finally {
      setIsUploading(null);
    }
  };

  const isCheckedIn = !!todayAbsensi?.jam_masuk;
  const isCheckedOut = !!todayAbsensi?.jam_pulang;
  const isComplete = isCheckedIn && isCheckedOut;

  // Is location restricted or can they bypass with "Dinas Luar"?
  const canAction = useMemo(() => {
    if (!location || !!isMockLocation) return false;
    if (distanceInfo.inRange) return true;
    if (isDinasLuarMode || studentPkl?.is_flexible_location) return true;
    return false;
  }, [location, isMockLocation, distanceInfo.inRange, isDinasLuarMode, studentPkl]);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl text-slate-900 dark:text-white shadow-2xl relative overflow-hidden flex flex-col items-center p-0 border border-slate-100 dark:border-slate-800 animate-fadeIn">
      <HubinCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
        title={activeType === 'IN' ? 'Foto Bukti Masuk' : 'Foto Bukti Pulang'}
      />

      {/* Header */}
      <div className="w-full pt-6 pb-4 px-6 text-center border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <h2 className="text-[11px] md:text-[13px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
          {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: localeID })} | {format(currentTime, 'HH:mm:ss')} WIB
        </h2>
      </div>

      {/* Location */}
      <PresensiLocationCard 
        mitraName={studentPkl?.Mitra?.nama} 
        distanceInfo={distanceInfo} 
        location={location} 
        onRefresh={onRefreshLocation}
      />

      {/* Dinas Luar Mode Switcher (Smart SaaS Feature) */}
      {!distanceInfo.inRange && location && !isMockLocation && !isCheckedOut && (
        <div className="w-full px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Dinas Luar Kota / Field Work</span>
            <span className="text-[8px] font-medium text-amber-600 dark:text-amber-500 italic">Membutuhkan verifikasi pembimbing</span>
          </div>
          <button
            onClick={() => setIsDinasLuarMode(!isDinasLuarMode)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
              isDinasLuarMode 
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-amber-600 border-amber-200 dark:border-amber-800 hover:border-amber-500'
            }`}
          >
            {isDinasLuarMode ? 'Mode Aktif' : 'Aktifkan'}
          </button>
        </div>
      )}

      {/* Actions: 2 Columns */}
      <div className="w-full grid grid-cols-2 border-t border-slate-50 dark:border-white/5 divide-x divide-slate-50 dark:divide-white/5 bg-white dark:bg-white/[0.01]">
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
          <div className="bg-emerald-500 text-white px-10 py-3 rotate-[-15deg] shadow-2xl border-4 border-white dark:border-slate-900 transform scale-125 font-black text-3xl tracking-[0.3em] opacity-90">
            DONE
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full py-4 text-center bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-50 dark:border-white/5">
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 italic uppercase tracking-wider">
          {!isCheckedIn ? 'Silakan melakukan check-in masuk' : !isCheckedOut ? 'Anda sedang dalam masa PKL' : 'Presensi hari ini telah selesai'}
        </p>
      </div>
    </div>
  );
};
