import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MapPin,
  Camera,
  CheckCircle2,
  Building2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { SimpleFormField } from '@/components/ui/SimpleFormField';
import { HubinGoogleDriveUploader } from '../HubinGoogleDriveUploader';
import { hubinApi } from '@/api/hubin.api';
import type { MitraTargetGroup } from './types';
import { HubinPklKolektifStudentPicker } from './HubinPklKolektifStudentPicker';
import {
  KunjunganStageSelector,
  STAGE_OPTIONS,
  type KunjunganOperationalStage,
} from './KunjunganStageSelector';

export interface HubinPklKunjunganKolektifModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: MitraTargetGroup | null;
  onSuccess?: () => void;
}

export const HubinPklKunjunganKolektifModal: React.FC<HubinPklKunjunganKolektifModalProps> = React.memo(({
  isOpen,
  onClose,
  group,
  onSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tanggal, setTanggal] = useState('');
  const [tahap, setTahap] = useState<KunjunganOperationalStage>('MONITORING');
  const [catatan, setCatatan] = useState('');
  const [catatanDudi, setCatatanDudi] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [jurnalVerified, setJurnalVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');
  const [showSpecificNotes, setShowSpecificNotes] = useState(false);
  const [specificNotes, setSpecificNotes] = useState<Record<string, string>>({});

  // 1. Resolve Academic Year ID from first student in group
  const tahunPelajaranId = useMemo(() => {
    return group?.siswaList?.[0]?.rawPkl?.tahun_pelajaran_id;
  }, [group]);

  // 2. Fetch Hubin Settings for this Academic Year
  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', tahunPelajaranId],
    queryFn: () =>
      hubinApi.getSettings(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : undefined),
    enabled: Boolean(isOpen && group),
    staleTime: 5 * 60 * 1000,
  });

  const cycleMode = hubinSettings?.visitCycleMode || 'THREE_CYCLE';
  const cycleTarget = hubinSettings?.visitCycleTarget || (cycleMode === 'FOUR_CYCLE' ? 4 : 3);
  const requirePhoto = hubinSettings?.visitRequirePhoto !== false;
  const requireJournal = hubinSettings?.visitRequireJournal !== false;

  // Initialize selected students on modal open
  useEffect(() => {
    if (isOpen && group?.siswaList) {
      setSelectedIds(group.siswaList.map((s) => s.penempatan_id));
      setTanggal(new Date().toISOString().slice(0, 16));
      setTahap(group.totalVisits === 0 ? 'PENGANTARAN' : 'MONITORING');
      setCatatan('');
      setCatatanDudi('');
      setVisitFotoUrl('');
      setVisitLat('');
      setVisitLng('');
      setJurnalVerified(true);
      setSpecificNotes({});
      setShowSpecificNotes(false);
    }
  }, [isOpen, group]);

  // Stage change handler with smart draft auto-fill
  const handleStageChange = useCallback(
    (newStage: KunjunganOperationalStage, draftText?: string) => {
      setTahap(newStage);
      const isBlankOrExistingDraft =
        !catatan.trim() || STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim());
      if (isBlankOrExistingDraft && draftText) {
        setCatatan(draftText);
      }
    },
    [catatan]
  );

  // Selection Handlers
  const handleToggleSelectAll = useCallback(() => {
    if (!group?.siswaList) return;
    if (selectedIds.length === group.siswaList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(group.siswaList.map((s) => s.penempatan_id));
    }
  }, [group, selectedIds]);

  const handleToggleStudent = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // Cycle Title calculation based on minimum visits among selected
  const calculatedCycleTitle = useMemo(() => {
    if (!group?.siswaList || selectedIds.length === 0) return 'Supervisi Kolektif';
    const selectedStudents = group.siswaList.filter((s) => selectedIds.includes(s.penempatan_id));
    const minVisits = Math.min(...selectedStudents.map((s) => s.visitsCount));

    const fourCycle = [
      'Siklus I: Monitoring Awal (Penyerahan & Orientasi DU/DI)',
      'Siklus II: Monitoring Tengah (Evaluasi Kinerja & Progres PKL)',
      'Siklus III: Monitoring Pra-Akhir (Verifikasi Jurnal & Laporan)',
      'Siklus IV: Monitoring Akhir (Evaluasi Akhir & Penjemputan)',
    ];
    const threeCycle = [
      'Siklus I: Monitoring Awal (Orientasi Siswa)',
      'Siklus II: Monitoring Tengah (Evaluasi & Kendala)',
      'Siklus III: Monitoring Akhir (Penjemputan & Penarikan)',
    ];

    if (cycleMode === 'FOUR_CYCLE') return fourCycle[minVisits] || `Siklus Khusus Ke-${minVisits + 1}`;
    if (cycleMode === 'THREE_CYCLE') return threeCycle[minVisits] || `Siklus Khusus Ke-${minVisits + 1}`;
    return `Siklus Ke-${minVisits + 1} dari ${cycleTarget}`;
  }, [group, selectedIds, cycleMode, cycleTarget]);

  // GPS Detection Handler
  const handleGpsDetect = useCallback(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Browser Anda tidak mendukung deteksi GPS!');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVisitLat(pos.coords.latitude.toString());
        setVisitLng(pos.coords.longitude.toString());
        setIsDetectingGps(false);
        toast.success('Koordinat GPS mitra berhasil dideteksi!');
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error('Gagal mendeteksi lokasi: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu siswa untuk mencatat kunjungan kolektif!');
      return;
    }
    if (!catatan.trim()) {
      toast.error('Catatan umum guru pembimbing wajib diisi!');
      return;
    }
    if (requirePhoto && !visitFotoUrl) {
      toast.error('Kebijakan Hubin mewajibkan foto dokumentasi bersama di lokasi DU/DI!');
      return;
    }

    setIsSubmitting(true);
    try {
      await hubinApi.addBulkKunjungan({
        pkl_ids: selectedIds,
        tahap,
        tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
        catatan,
        catatan_dudi: catatanDudi || undefined,
        foto_url: visitFotoUrl || undefined,
        latitude: visitLat ? parseFloat(visitLat) : undefined,
        longitude: visitLng ? parseFloat(visitLng) : undefined,
        catatan_khusus: showSpecificNotes ? specificNotes : undefined,
        jurnal_verified: jurnalVerified,
      });

      toast.success(`Kunjungan kolektif berhasil dicatat untuk ${selectedIds.length} siswa!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan kunjungan kolektif');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      zIndex={70}
      title={
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40 shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              Kunjungan Kolektif Mitra DU/DI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Catat satu kali supervisi untuk seluruh siswa di {group.nama_mitra}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fadeIn">
        {/* Banner Info Mitra & Kebijakan Siklus */}
        <div className="p-3.5 rounded-2xl bg-linear-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Building2 size={16} className="text-indigo-600 shrink-0" />
                {group.nama_mitra}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {group.siswaList.length} Siswa Ditempatkan
              </span>
            </div>
            {group.alamat_mitra && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {group.alamat_mitra}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">
                Target Siklus
              </span>
              <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1 justify-end">
                <Sparkles size={12} className="text-amber-500" />
                {calculatedCycleTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Student Selection Card (Extracted) */}
        <HubinPklKolektifStudentPicker
          siswaList={group.siswaList}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleStudent={handleToggleStudent}
        />

        {/* Tahap Operasional Kunjungan Kolektif */}
        <KunjunganStageSelector value={tahap} onChange={handleStageChange} />

        {/* Shared Visit Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom Kiri: Tanggal, Catatan Umum, Feedback DU/DI */}
          <div className="space-y-3.5">
            <SimpleFormField htmlFor="bulk-tanggal" label="Tanggal & Waktu Supervisi Bersama">
              <Input
                id="bulk-tanggal"
                type="datetime-local"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </SimpleFormField>

            <SimpleFormField htmlFor="bulk-catatan" label="Catatan Supervisi Guru Pembimbing" required>
              <Textarea
                id="bulk-catatan"
                rows={3}
                required
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Uraikan hasil bimbingan kelompok, adaptasi siswa di industri, kedisiplinan kerja, dan arahan pembimbing..."
              />
            </SimpleFormField>

            <SimpleFormField htmlFor="bulk-catatan-dudi" label="Catatan / Masukan Pembimbing DU/DI (Opsional)">
              <Textarea
                id="bulk-catatan-dudi"
                rows={2}
                value={catatanDudi}
                onChange={(e) => setCatatanDudi(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Masukan, apresiasi, atau arahan dari mentor DU/DI untuk kelompok siswa PKL..."
              />
            </SimpleFormField>

            {/* Verifikasi Jurnal PKL Siswa */}
            {requireJournal && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jurnalVerified}
                  onChange={(e) => setJurnalVerified(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Verifikasi Jurnal Harian Siswa Terpilih
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Saya menyatakan telah memeriksa dan memverifikasi buku jurnal harian seluruh siswa terpilih di lokasi ini.
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Kolom Kanan: Foto Bersama & Titik Lokasi GPS */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Foto Dokumentasi Bersama di Lokasi
                </span>
                {requirePhoto ? (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldAlert size={11} /> Wajib Hubin
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">(Opsional)</span>
                )}
              </div>
              <HubinGoogleDriveUploader value={visitFotoUrl} onChange={setVisitFotoUrl} compact label="Unggah 1 Foto Bersama Kelompok Siswa & Mentor DU/DI" />
              <p className="text-[10px] text-slate-400 ml-1">
                * Foto ini otomatis ditautkan ke lembar monitoring seluruh {selectedIds.length} siswa terpilih.
              </p>
            </div>

            {/* GPS Koordinat */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isDetectingGps}
                onClick={handleGpsDetect}
                className="w-full h-10 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <MapPin size={14} className={isDetectingGps ? 'animate-bounce text-amber-600' : 'text-amber-600'} />
                <span>{isDetectingGps ? 'Mendeteksi Koordinat...' : 'Deteksi Titik Lokasi GPS di DU/DI'}</span>
              </button>

              {visitLat && visitLng && (
                <div className="space-y-2 pt-1">
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                    <button
                      type="button"
                      onClick={() => setMapView('standard')}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        mapView === 'standard'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <MapPin size={10} /> Peta
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapView('satellite')}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        mapView === 'satellite'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Camera size={10} /> Satelit
                    </button>
                  </div>

                  <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      title="Bulk Map"
                      src={
                        mapView === 'standard'
                          ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(visitLng) - 0.002}%2C${parseFloat(visitLat) - 0.001}%2C${parseFloat(visitLng) + 0.002}%2C${parseFloat(visitLat) + 0.001}&layer=mapnik&marker=${visitLat}%2C${visitLng}`
                          : `https://maps.google.com/maps?q=${visitLat},${visitLng}&t=k&z=17&output=embed`
                      }
                      className="grayscale-[0.1] contrast-[1.1] opacity-90"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <SimpleFormField htmlFor="bulk-lat" label="Latitude">
                  <Input
                    id="bulk-lat"
                    type="number"
                    step="any"
                    placeholder="-6.1234"
                    className="text-xs h-9 rounded-xl font-mono"
                    value={visitLat}
                    onChange={(e) => setVisitLat(e.target.value)}
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="bulk-lng" label="Longitude">
                  <Input
                    id="bulk-lng"
                    type="number"
                    step="any"
                    placeholder="106.1234"
                    className="text-xs h-9 rounded-xl font-mono"
                    value={visitLng}
                    onChange={(e) => setVisitLng(e.target.value)}
                  />
                </SimpleFormField>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Accordion: Catatan Khusus Per Siswa */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSpecificNotes((v) => !v)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <span>Catatan Tambahan Khusus Per Siswa (Opsional)</span>
            {showSpecificNotes ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showSpecificNotes && (
            <div className="p-3.5 space-y-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] text-slate-500">
                Isi catatan tambahan khusus di bawah ini jika ada evaluasi spesifik untuk siswa tertentu:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {group.siswaList
                  .filter((s) => selectedIds.includes(s.penempatan_id))
                  .map((siswa) => (
                    <div key={siswa.penempatan_id} className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                        {siswa.nama_siswa} ({siswa.kelas})
                      </span>
                      <Input
                        type="text"
                        placeholder="Evaluasi khusus siswa ini..."
                        className="text-xs h-8 rounded-lg"
                        value={specificNotes[siswa.penempatan_id] || ''}
                        onChange={(e) => setSpecificNotes((p) => ({ ...p, [siswa.penempatan_id]: e.target.value }))}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 px-4 text-xs font-bold">
            Batal
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || selectedIds.length === 0}
            className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            isLoading={isSubmitting}
          >
            <CheckCircle2 size={16} />
            <span>Simpan Kunjungan Kolektif ({selectedIds.length} Siswa)</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default HubinPklKunjunganKolektifModal;
