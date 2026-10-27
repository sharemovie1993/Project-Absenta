import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  MapPin,
  Camera,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { hubinApi } from '@/api/hubin.api';

export type PklModalMode = 'CHECK_IN' | 'CHECK_OUT' | 'LOGBOOK' | 'IZIN_SAKIT';

interface SiswaPklAbsensiModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PklModalMode;
  myPenempatan: any;
  todayPklAbsensi: any;
  onSuccess: () => void;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const SiswaPklAbsensiModal: React.FC<SiswaPklAbsensiModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  myPenempatan,
  todayPklAbsensi,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<PklModalMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [kegiatan, setKegiatan] = useState('');
  const [isDinasLuar, setIsDinasLuar] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Izin/Sakit states
  const [izinType, setIzinType] = useState<'SAKIT' | 'IZIN'>('SAKIT');
  const [izinTglMulai, setIzinTglMulai] = useState(new Date().toISOString().substring(0, 10));
  const [izinTglSelesai, setIzinTglSelesai] = useState(new Date().toISOString().substring(0, 10));
  const [izinKeterangan, setIzinKeterangan] = useState('');

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoord, setGpsCoord] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Mitra reference coordinates
  const mitra = myPenempatan?.Mitra || {};
  const mitraLat = myPenempatan?.lat_override || mitra.latitude || null;
  const mitraLon = myPenempatan?.lon_override || mitra.longitude || null;
  const mitraRadius = myPenempatan?.radius_override || mitra.radius || 100;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      setSelectedFile(null);
      setPreviewPhotoUrl(todayPklAbsensi?.image_url || null);
      setIsDinasLuar(Boolean(todayPklAbsensi?.is_outside_radius));

      // Parse existing activities if available
      if (todayPklAbsensi?.kegiatan) {
        try {
          const parsed = JSON.parse(todayPklAbsensi.kegiatan);
          if (Array.isArray(parsed)) {
            setKegiatan(
              parsed
                .filter((p: any) => p.type !== 'FEEDBACK')
                .map((p: any) => `${p.time ? `[${p.time}] ` : ''}${p.text}`)
                .join('\n')
            );
          } else {
            setKegiatan(String(todayPklAbsensi.kegiatan));
          }
        } catch {
          setKegiatan(todayPklAbsensi.kegiatan);
        }
      } else {
        setKegiatan('');
      }

      // Automatically request GPS if in check-in or check-out mode
      if (initialMode === 'CHECK_IN' || initialMode === 'CHECK_OUT') {
        fetchGpsLocation();
      }
    }
  }, [isOpen, initialMode, todayPklAbsensi]);

  const fetchGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Perangkat Anda tidak mendukung fitur deteksi lokasi (GPS).');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoord({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
      },
      (err) => {
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi GPS ditolak oleh browser. Mohon izinkan akses lokasi di pengaturan browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi GPS tidak tersedia.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Waktu permintaan lokasi GPS habis.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // Distance computation
  const distance = useMemo(() => {
    if (!gpsCoord || !mitraLat || !mitraLon) return null;
    return calculateDistanceMeters(gpsCoord.latitude, gpsCoord.longitude, Number(mitraLat), Number(mitraLon));
  }, [gpsCoord, mitraLat, mitraLon]);

  const isWithinRadius = distance !== null ? distance <= mitraRadius : true;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewPhotoUrl(url);
    }
  };

  const uploadPhotoIfNeeded = async (): Promise<string | undefined> => {
    if (!selectedFile) return previewPhotoUrl || undefined;
    try {
      return await hubinApi.uploadPklPhoto(selectedFile);
    } catch {
      toast.error('Gagal mengunggah foto. Melanjutkan tanpa foto baru...');
      return previewPhotoUrl || undefined;
    }
  };

  // Submit Handlers
  const handleSubmitCheckIn = async () => {
    if (!myPenempatan?.id) {
      toast.error('Data penempatan PKL tidak ditemukan.');
      return;
    }
    if (!gpsCoord && (mitraLat && mitraLon)) {
      toast.error('Silakan izinkan dan tunggu deteksi lokasi GPS Anda.');
      return;
    }
    if (distance !== null && !isWithinRadius && !isDinasLuar) {
      toast.error(`Anda berada di luar radius area PKL (${distance}m dari lokasi). Centang 'Dinas Luar' jika Anda bertugas di luar.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrl = await uploadPhotoIfNeeded();
      await hubinApi.checkIn({
        siswaPklId: myPenempatan.id,
        latitude: gpsCoord?.latitude || 0,
        longitude: gpsCoord?.longitude || 0,
        kegiatan: kegiatan.trim() || undefined,
        image_url: uploadedUrl,
      });

      toast.success('Presensi Masuk PKL berhasil dicatat!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCheckOut = async () => {
    if (!myPenempatan?.id) {
      toast.error('Data penempatan PKL tidak ditemukan.');
      return;
    }
    if (!kegiatan.trim()) {
      toast.error('Wajib mengisi uraian jurnal kegiatan yang telah Anda kerjakan hari ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrl = await uploadPhotoIfNeeded();
      await hubinApi.checkOut({
        siswaPklId: myPenempatan.id,
        latitude: gpsCoord?.latitude || 0,
        longitude: gpsCoord?.longitude || 0,
        kegiatan: kegiatan.trim(),
        image_url: uploadedUrl,
      });

      toast.success('Presensi Pulang & Jurnal PKL berhasil disubmit!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan check-out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLogbookOnly = async () => {
    if (!myPenempatan?.id) {
      toast.error('Data penempatan PKL tidak ditemukan.');
      return;
    }
    if (!kegiatan.trim()) {
      toast.error('Uraian jurnal kegiatan tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrl = await uploadPhotoIfNeeded();
      await hubinApi.updateLogbook(
        myPenempatan.id,
        kegiatan.trim(),
        todayPklAbsensi?.id,
        uploadedUrl
      );

      toast.success('Jurnal kegiatan PKL berhasil disimpan!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan jurnal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitIzinSakit = async () => {
    if (!myPenempatan?.id) {
      toast.error('Data penempatan PKL tidak ditemukan.');
      return;
    }
    if (!izinKeterangan.trim()) {
      toast.error('Alasan atau keterangan permohonan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrl = await uploadPhotoIfNeeded();
      await hubinApi.submitIzinSakitPkl({
        siswaPklId: myPenempatan.id,
        status: izinType,
        tanggal_mulai: izinTglMulai,
        tanggal_selesai: izinTglSelesai || izinTglMulai,
        keterangan: izinKeterangan.trim(),
        image_url: uploadedUrl,
      });

      toast.success(`Permohonan ${izinType === 'SAKIT' ? 'Sakit' : 'Izin'} berhasil diajukan ke Pembimbing PKL!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengajukan izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Presensi & Logbook PKL
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building2 size={12} />
                {mitra.nama || 'Mitra Industri'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
              {activeMode === 'CHECK_IN'
                ? 'Presensi Masuk PKL (Check-In)'
                : activeMode === 'CHECK_OUT'
                ? 'Presensi Pulang & Jurnal PKL'
                : activeMode === 'LOGBOOK'
                ? 'Jurnal Kegiatan PKL Hari Ini'
                : 'Pengajuan Sakit / Izin PKL'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          <Button
            size="sm"
            variant={activeMode === 'CHECK_IN' ? 'primary' : 'ghost'}
            onClick={() => setActiveMode('CHECK_IN')}
            className="text-xs font-bold rounded-xl h-8 shrink-0 gap-1.5"
            disabled={Boolean(todayPklAbsensi?.jam_masuk)}
          >
            <Clock size={13} />
            <span>Presensi Masuk</span>
            {todayPklAbsensi?.jam_masuk && <CheckCircle2 size={12} className="text-emerald-400" />}
          </Button>
          <Button
            size="sm"
            variant={activeMode === 'CHECK_OUT' ? 'primary' : 'ghost'}
            onClick={() => setActiveMode('CHECK_OUT')}
            className="text-xs font-bold rounded-xl h-8 shrink-0 gap-1.5"
            disabled={!todayPklAbsensi?.jam_masuk || Boolean(todayPklAbsensi?.jam_pulang)}
          >
            <Clock size={13} />
            <span>Presensi Pulang</span>
            {todayPklAbsensi?.jam_pulang && <CheckCircle2 size={12} className="text-emerald-400" />}
          </Button>
          <Button
            size="sm"
            variant={activeMode === 'LOGBOOK' ? 'primary' : 'ghost'}
            onClick={() => setActiveMode('LOGBOOK')}
            className="text-xs font-bold rounded-xl h-8 shrink-0 gap-1.5"
          >
            <FileText size={13} />
            <span>Isi Jurnal</span>
          </Button>
          <Button
            size="sm"
            variant={activeMode === 'IZIN_SAKIT' ? 'primary' : 'ghost'}
            onClick={() => setActiveMode('IZIN_SAKIT')}
            className="text-xs font-bold rounded-xl h-8 shrink-0 gap-1.5 ml-auto text-amber-600 dark:text-amber-400"
          >
            <Calendar size={13} />
            <span>Izin/Sakit</span>
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto min-w-0">
          {/* GPS Geofencing Status (Check-in & Check-out) */}
          {(activeMode === 'CHECK_IN' || activeMode === 'CHECK_OUT') && (
            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Geolokasi Kehadiran (GPS)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchGpsLocation}
                  disabled={gpsLoading}
                  className="h-7 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <RefreshCw size={11} className={gpsLoading ? 'animate-spin' : ''} />
                  <span>Cek Ulang Lokasi</span>
                </Button>
              </div>

              {gpsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                  <RefreshCw size={13} className="animate-spin text-indigo-500" />
                  <span>Sedang mengunci koordinat GPS perangkat Anda...</span>
                </div>
              ) : gpsError ? (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              ) : gpsCoord ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Akurasi Sinyal GPS:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">±{gpsCoord.accuracy} meter</span>
                  </div>

                  {distance !== null ? (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Jarak ke {mitra.nama || 'Mitra'}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black">{distance} meter</span>
                        <Badge
                          variant={isWithinRadius ? 'success' : 'danger'}
                          className="text-[10px] font-black uppercase"
                        >
                          {isWithinRadius ? 'Dalam Radius' : 'Luar Radius'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">
                      Mitra ini belum mengatur titik koordinat GPS. Presensi akan diverifikasi oleh pembimbing.
                    </div>
                  )}
                </div>
              ) : null}

              {/* Dinas Luar Checkbox */}
              {distance !== null && !isWithinRadius && (
                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDinasLuar}
                    onChange={(e) => setIsDinasLuar(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      Tugas Lapangan / Dinas Luar
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 text-[11px] leading-tight">
                      Centang jika Anda sedang ditugaskan mentor industri bekerja di luar gedung/kantor mitra.
                    </span>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Form Jurnal Kegiatan PKL (Check-in optional, Check-out & Logbook mandatory) */}
          {activeMode !== 'IZIN_SAKIT' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeMode === 'CHECK_IN'
                    ? 'Rencana Kerja / Catatan Masuk (Opsional)'
                    : 'Uraian Jurnal Kegiatan PKL Hari Ini *'}
                </label>
                <textarea
                  rows={4}
                  value={kegiatan}
                  onChange={(e) => setKegiatan(e.target.value)}
                  placeholder={
                    activeMode === 'CHECK_IN'
                      ? 'Tuliskan rencana pekerjaan Anda hari ini (opsional)...'
                      : 'Contoh:\n08:00 - 12:00 Pengenalan sistem & observasi lapangan\n13:00 - 16:00 Praktik pengoperasian mesin dan pencatatan log...'
                  }
                  className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Catatan ini akan langsung terlihat oleh Guru Pembimbing PKL di menu Verifikasi Jurnal.
                </span>
              </div>

              {/* Upload Foto Kegiatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lampiran Foto Bukti Kegiatan PKL (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                    <Camera size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Ambil Foto / Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                  )}
                </div>

                {previewPhotoUrl && (
                  <div className="mt-2 relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={previewPhotoUrl}
                      alt="Preview Dokumentasi"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Form Pengajuan Izin / Sakit */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Pengajuan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={izinType === 'SAKIT' ? 'primary' : 'outline'}
                    onClick={() => setIzinType('SAKIT')}
                    className="h-10 rounded-xl text-xs font-bold"
                  >
                    Sakit (Surat Dokter)
                  </Button>
                  <Button
                    type="button"
                    variant={izinType === 'IZIN' ? 'primary' : 'outline'}
                    onClick={() => setIzinType('IZIN')}
                    className="h-10 rounded-xl text-xs font-bold"
                  >
                    Izin (Keperluan Mendesak)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai *
                  </label>
                  <Input
                    type="date"
                    value={izinTglMulai}
                    onChange={(e) => setIzinTglMulai(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai *
                  </label>
                  <Input
                    type="date"
                    value={izinTglSelesai}
                    onChange={(e) => setIzinTglSelesai(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Alasan Lengkap *
                </label>
                <textarea
                  rows={3}
                  value={izinKeterangan}
                  onChange={(e) => setIzinKeterangan(e.target.value)}
                  placeholder="Tuliskan alasan sakit atau keperluan izin Anda..."
                  className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unggah Surat Dokter / Bukti Izin (Opsional)
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer w-fit">
                  <Upload size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Pilih Berkas Lampiran</span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
                {selectedFile && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 block truncate">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-bold h-10 px-4"
          >
            Batal
          </Button>

          {activeMode === 'CHECK_IN' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitCheckIn}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-extrabold h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Kirim Presensi Masuk</span>
            </Button>
          )}

          {activeMode === 'CHECK_OUT' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitCheckOut}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-extrabold h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Kirim Presensi Pulang & Jurnal</span>
            </Button>
          )}

          {activeMode === 'LOGBOOK' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitLogbookOnly}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-extrabold h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>Simpan Jurnal Kegiatan</span>
            </Button>
          )}

          {activeMode === 'IZIN_SAKIT' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitIzinSakit}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-extrabold h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              <span>Kirim Permohonan</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
