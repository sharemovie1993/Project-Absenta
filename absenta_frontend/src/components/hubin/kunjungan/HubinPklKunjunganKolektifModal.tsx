import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, MapPin, Camera, CheckCircle2, Building2, ChevronLeft, ChevronRight,
  ShieldAlert, BookOpenCheck, Sparkles, FileText, Image,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { SimpleFormField } from '@/components/ui/SimpleFormField';
import { HubinGoogleDriveUploader } from '../HubinGoogleDriveUploader';
import { hubinApi } from '@/api/hubin.api';
import type { MitraTargetGroup } from './types';
import { HubinPklKolektifStudentPicker } from './HubinPklKolektifStudentPicker';
import { KunjunganStageSelector, STAGE_OPTIONS, type KunjunganOperationalStage } from './KunjunganStageSelector';
import { KunjunganWizardStrip } from './KunjunganWizardStrip';

const STEPS = [
  { id: 1, label: 'Pilih Siswa', icon: Users },
  { id: 2, label: 'Tahap & Waktu', icon: Sparkles },
  { id: 3, label: 'Catatan', icon: FileText },
  { id: 4, label: 'Dokumentasi', icon: Image },
];

export interface HubinPklKunjunganKolektifModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: MitraTargetGroup | null;
  onSuccess?: () => void;
}

export const HubinPklKunjunganKolektifModal: React.FC<HubinPklKunjunganKolektifModalProps> = React.memo(({
  isOpen, onClose, group, onSuccess,
}) => {
  const [step, setStep] = useState(1);
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
  const [specificNotes, setSpecificNotes] = useState<Record<string, string>>({});

  const tahunPelajaranId = useMemo(() => group?.siswaList?.[0]?.rawPkl?.tahun_pelajaran_id, [group]);

  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', tahunPelajaranId],
    queryFn: () => hubinApi.getSettings(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : undefined),
    enabled: Boolean(isOpen && group),
    staleTime: 5 * 60 * 1000,
  });

  const cycleMode = hubinSettings?.visitCycleMode || 'THREE_CYCLE';
  const cycleTarget = hubinSettings?.visitCycleTarget || (cycleMode === 'FOUR_CYCLE' ? 4 : 3);
  const requirePhoto = hubinSettings?.visitRequirePhoto !== false;
  const requireJournal = hubinSettings?.visitRequireJournal !== false;

  const selectedStudents = useMemo(() => {
    return group?.siswaList.filter((s) => selectedIds.includes(s.penempatan_id)) || [];
  }, [group, selectedIds]);

  const hasPengantaranDone = useMemo(() => {
    if (selectedStudents.length === 0) return (group?.totalVisits || 0) > 0;
    return selectedStudents.every((s) => {
      let kList: any[] = [];
      if (Array.isArray(s.rawPkl?.kunjungan_json)) kList = s.rawPkl.kunjungan_json;
      else if (typeof s.rawPkl?.kunjungan_json === 'string') {
        try { kList = JSON.parse(s.rawPkl.kunjungan_json); } catch { kList = []; }
      }
      return kList.some((k: any) => k.tahap === 'PENGANTARAN') || s.visitsCount > 0;
    });
  }, [selectedStudents, group?.totalVisits]);

  const hasMonitoringDone = useMemo(() => {
    if (selectedStudents.length === 0) return (group?.totalVisits || 0) >= 2;
    return selectedStudents.every((s) => {
      let kList: any[] = [];
      if (Array.isArray(s.rawPkl?.kunjungan_json)) kList = s.rawPkl.kunjungan_json;
      else if (typeof s.rawPkl?.kunjungan_json === 'string') {
        try { kList = JSON.parse(s.rawPkl.kunjungan_json); } catch { kList = []; }
      }
      return kList.some((k: any) => k.tahap === 'MONITORING') || s.visitsCount >= 2;
    });
  }, [selectedStudents, group?.totalVisits]);

  const hasPenjemputanDone = useMemo(() => {
    if (selectedStudents.length === 0) return false;
    return selectedStudents.every((s) => {
      let kList: any[] = [];
      if (Array.isArray(s.rawPkl?.kunjungan_json)) kList = s.rawPkl.kunjungan_json;
      else if (typeof s.rawPkl?.kunjungan_json === 'string') {
        try { kList = JSON.parse(s.rawPkl.kunjungan_json); } catch { kList = []; }
      }
      return kList.some((k: any) => k.tahap === 'PENJEMPUTAN');
    });
  }, [selectedStudents]);

  const isPenjemputanReady = useMemo(() => {
    if (hasPenjemputanDone) return false;
    return hasPengantaranDone && hasMonitoringDone;
  }, [hasPengantaranDone, hasMonitoringDone, hasPenjemputanDone]);

  useEffect(() => {
    if (isOpen && group?.siswaList) {
      setStep(1);
      setSelectedIds(group.siswaList.map((s) => s.penempatan_id));
      setTanggal(new Date().toISOString().slice(0, 16));
      setTahap(group.totalVisits === 0 ? 'PENGANTARAN' : 'MONITORING');
      setCatatan(''); setCatatanDudi(''); setVisitFotoUrl('');
      setVisitLat(''); setVisitLng(''); setJurnalVerified(true); setSpecificNotes({});
    }
  }, [isOpen, group]);

  // Otomatis sesuaikan tahap jika kondisi proteksi siklus berubah
  useEffect(() => {
    if (!isOpen) return;
    if (!hasPengantaranDone) {
      if (tahap !== 'PENGANTARAN') {
        setTahap('PENGANTARAN');
        const draft = STAGE_OPTIONS.find((s) => s.id === 'PENGANTARAN')?.defaultDraft;
        if (draft && !catatan.trim()) setCatatan(draft);
      }
    } else if (hasPenjemputanDone) {
      if (tahap !== 'INSIDENTAL' && tahap !== 'PENJEMPUTAN') {
        setTahap('INSIDENTAL');
      }
    } else if (isPenjemputanReady) {
      if (tahap !== 'PENJEMPUTAN') {
        setTahap('PENJEMPUTAN');
        const draft = STAGE_OPTIONS.find((s) => s.id === 'PENJEMPUTAN')?.defaultDraft;
        if (draft && (!catatan.trim() || STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim()))) {
          setCatatan(draft);
        }
      }
    } else {
      if (tahap !== 'MONITORING') {
        setTahap('MONITORING');
        const draft = STAGE_OPTIONS.find((s) => s.id === 'MONITORING')?.defaultDraft;
        if (draft && (!catatan.trim() || STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim()))) {
          setCatatan(draft);
        }
      }
    }
  }, [hasPengantaranDone, hasMonitoringDone, hasPenjemputanDone, isPenjemputanReady, isOpen]);

  const handleStageChange = useCallback((newStage: KunjunganOperationalStage, draftText?: string) => {
    setTahap(newStage);
    const isBlankOrDraft = !catatan.trim() || STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim());
    if (isBlankOrDraft && draftText) setCatatan(draftText);
  }, [catatan]);

  const handleToggleSelectAll = useCallback(() => {
    if (!group?.siswaList) return;
    setSelectedIds(selectedIds.length === group.siswaList.length ? [] : group.siswaList.map((s) => s.penempatan_id));
  }, [group, selectedIds]);

  const handleToggleStudent = useCallback((id: string) => {
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }, []);

  const calculatedCycleTitle = useMemo(() => {
    if (!group?.siswaList || selectedIds.length === 0) return 'Supervisi Kolektif';
    const minVisits = Math.min(...group.siswaList.filter((s) => selectedIds.includes(s.penempatan_id)).map((s) => s.visitsCount));
    const four = ['Siklus I (Penyerahan)', 'Siklus II (Evaluasi)', 'Siklus III (Pra-Akhir)', 'Siklus IV (Penjemputan)'];
    const three = ['Siklus I (Orientasi)', 'Siklus II (Evaluasi)', 'Siklus III (Penjemputan)'];
    if (cycleMode === 'FOUR_CYCLE') return four[minVisits] || `Siklus Ke-${minVisits + 1}`;
    if (cycleMode === 'THREE_CYCLE') return three[minVisits] || `Siklus Ke-${minVisits + 1}`;
    return `Siklus Ke-${minVisits + 1} dari ${cycleTarget}`;
  }, [group, selectedIds, cycleMode, cycleTarget]);

  const handleGpsDetect = useCallback(() => {
    if (!('geolocation' in navigator)) { toast.error('GPS tidak didukung browser ini!'); return; }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setVisitLat(pos.coords.latitude.toString()); setVisitLng(pos.coords.longitude.toString()); setIsDetectingGps(false); toast.success('Koordinat GPS terdeteksi!'); },
      (err) => { setIsDetectingGps(false); toast.error('Gagal deteksi lokasi: ' + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSubmit = async () => {
    if (!catatan.trim()) { toast.error('Catatan guru wajib diisi!'); return; }
    if (requirePhoto && !visitFotoUrl) { toast.error('Foto dokumentasi wajib diunggah (Kebijakan Hubin)!'); return; }
    setIsSubmitting(true);
    try {
      await hubinApi.addBulkKunjungan({
        pkl_ids: selectedIds, tahap,
        tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
        catatan, catatan_dudi: catatanDudi || undefined,
        foto_url: visitFotoUrl || undefined,
        latitude: visitLat ? parseFloat(visitLat) : undefined,
        longitude: visitLng ? parseFloat(visitLng) : undefined,
        catatan_khusus: Object.keys(specificNotes).length ? specificNotes : undefined,
        jurnal_verified: jurnalVerified,
      });
      toast.success(`Kunjungan kolektif dicatat untuk ${selectedIds.length} siswa!`);
      onSuccess?.(); onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan kunjungan kolektif');
    } finally { setIsSubmitting(false); }
  };

  const canGoNext = () => {
    if (step === 1) return selectedIds.length > 0;
    if (step === 2) return !!tahap && !!tanggal;
    if (step === 3) return !!catatan.trim();
    return true;
  };

  const currentStage = STAGE_OPTIONS.find((s) => s.id === tahap);

  if (!isOpen || !group) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" zIndex={70}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200/50 dark:border-indigo-900/40 shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Kunjungan Kolektif — {group.nama_mitra}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{selectedIds.length} siswa terpilih • {calculatedCycleTitle}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Wizard Step Strip */}
        <KunjunganWizardStrip steps={STEPS} currentStep={step} />

        {/* Context recap chip (step 2+) */}
        {step >= 3 && currentStage && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${currentStage.activeBg} w-fit`}>
            <currentStage.icon size={12} />
            <span>{currentStage.label}</span>
            <span className="opacity-60">• {tanggal ? new Date(tanggal).toLocaleDateString('id-ID') : '-'}</span>
            <span className="opacity-60">• {selectedIds.length} siswa</span>
          </div>
        )}

        {/* ===== STEP 1: Pilih Siswa ===== */}
        {step === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs">
              <Building2 size={14} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block">{group.nama_mitra}</span>
                {group.alamat_mitra && <span className="text-slate-500 line-clamp-1">{group.alamat_mitra}</span>}
              </div>
            </div>
            <HubinPklKolektifStudentPicker
              siswaList={group.siswaList}
              selectedIds={selectedIds}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleStudent={handleToggleStudent}
            />
          </div>
        )}

        {/* ===== STEP 2: Tahap & Waktu ===== */}
        {step === 2 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            <KunjunganStageSelector
              value={tahap}
              onChange={handleStageChange}
              hasPengantaran={hasPengantaranDone}
              hasMonitoring={hasMonitoringDone}
              hasPenjemputan={hasPenjemputanDone}
              isReadyForPenjemputan={isPenjemputanReady}
            />
            <SimpleFormField htmlFor="bulk-tanggal" label="Tanggal & Waktu Supervisi Bersama">
              <Input
                id="bulk-tanggal" type="datetime-local" value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </SimpleFormField>
          </div>
        )}

        {/* ===== STEP 3: Catatan & Jurnal ===== */}
        {step === 3 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            <SimpleFormField htmlFor="bulk-catatan" label="Catatan Supervisi Guru Pembimbing" required>
              <Textarea
                id="bulk-catatan" rows={4} required value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Uraikan hasil bimbingan kelompok, adaptasi siswa, kedisiplinan kerja, dan arahan pembimbing..."
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="bulk-catatan-dudi" label="Catatan / Masukan Pembimbing DU/DI (Opsional)">
              <Textarea
                id="bulk-catatan-dudi" rows={2} value={catatanDudi}
                onChange={(e) => setCatatanDudi(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Masukan atau apresiasi dari mentor DU/DI untuk kelompok siswa PKL..."
              />
            </SimpleFormField>

            {requireJournal && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors">
                <input type="checkbox" checked={jurnalVerified} onChange={(e) => setJurnalVerified(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                <div className="text-xs">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <BookOpenCheck size={13} className="text-indigo-600 shrink-0" /> Verifikasi Jurnal Siswa Terpilih
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Saya menyatakan telah memeriksa jurnal harian seluruh siswa terpilih di lokasi ini.</p>
                </div>
              </label>
            )}

            {/* Catatan khusus per siswa (collapsible) */}
            <details className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <summary className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/40 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 list-none flex items-center justify-between">
                <span>Catatan Khusus Per Siswa (Opsional)</span>
                <ChevronRight size={14} className="text-slate-400" />
              </summary>
              <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
                {group.siswaList.filter((s) => selectedIds.includes(s.penempatan_id)).map((siswa) => (
                  <div key={siswa.penempatan_id} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-32 shrink-0 truncate">{siswa.nama_siswa}</span>
                    <Input type="text" placeholder="Evaluasi khusus..." className="text-xs h-8 rounded-lg flex-1"
                      value={specificNotes[siswa.penempatan_id] || ''}
                      onChange={(e) => setSpecificNotes((p) => ({ ...p, [siswa.penempatan_id]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ===== STEP 4: Dokumentasi ===== */}
        {step === 4 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto Dokumentasi Bersama di Lokasi</span>
                {requirePhoto
                  ? <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><ShieldAlert size={11} /> Wajib Hubin</span>
                  : <span className="text-[10px] text-slate-400">(Opsional)</span>}
              </div>
              <HubinGoogleDriveUploader value={visitFotoUrl} onChange={setVisitFotoUrl} compact label="Unggah 1 Foto Bersama Kelompok Siswa & Mentor DU/DI" />
              <p className="text-[10px] text-slate-400 ml-1">* Foto ini ditautkan ke lembar monitoring seluruh {selectedIds.length} siswa terpilih.</p>
            </div>

            <div className="space-y-2">
              <button type="button" disabled={isDetectingGps} onClick={handleGpsDetect}
                className="w-full h-10 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50">
                <MapPin size={14} className={isDetectingGps ? 'animate-bounce text-amber-600' : 'text-amber-600'} />
                <span>{isDetectingGps ? 'Mendeteksi Koordinat...' : 'Deteksi Titik Lokasi GPS di DU/DI'}</span>
              </button>

              {visitLat && visitLng && (
                <div className="space-y-1.5">
                  <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                    {(['standard', 'satellite'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setMapView(v)}
                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1 cursor-pointer ${mapView === v ? 'bg-white dark:bg-slate-900 text-indigo-600 border border-slate-200 dark:border-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {v === 'standard' ? <MapPin size={9} /> : <Camera size={9} />}{v === 'standard' ? 'Peta' : 'Satelit'}
                      </button>
                    ))}
                  </div>
                  <div className="w-full h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" title="GPS Map"
                      src={mapView === 'standard'
                        ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(visitLng) - 0.002}%2C${parseFloat(visitLat) - 0.001}%2C${parseFloat(visitLng) + 0.002}%2C${parseFloat(visitLat) + 0.001}&layer=mapnik&marker=${visitLat}%2C${visitLng}`
                        : `https://maps.google.com/maps?q=${visitLat},${visitLng}&t=k&z=17&output=embed`}
                      className="grayscale-[0.1] contrast-[1.1] opacity-90" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <SimpleFormField htmlFor="bulk-lat" label="Latitude">
                  <Input id="bulk-lat" type="number" step="any" placeholder="-6.1234" className="text-xs h-9 rounded-xl font-mono" value={visitLat} onChange={(e) => setVisitLat(e.target.value)} />
                </SimpleFormField>
                <SimpleFormField htmlFor="bulk-lng" label="Longitude">
                  <Input id="bulk-lng" type="number" step="any" placeholder="106.1234" className="text-xs h-9 rounded-xl font-mono" value={visitLng} onChange={(e) => setVisitLng(e.target.value)} />
                </SimpleFormField>
              </div>
            </div>
          </div>
        )}

        {/* ===== Navigation ===== */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 px-4 text-xs font-bold text-slate-500">Batal</Button>

          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer">
              <ChevronLeft size={14} /> Kembali
            </button>
          )}

          {step < 4 ? (
            <button type="button" disabled={!canGoNext()} onClick={() => setStep((s) => s + 1)}
              className="flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <span>Lanjut — {STEPS[step]?.label}</span><ChevronRight size={14} />
            </button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || selectedIds.length === 0}
              className="flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              isLoading={isSubmitting}>
              <CheckCircle2 size={15} />
              <span>Simpan Kunjungan Kolektif ({selectedIds.length} Siswa)</span>
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400">
          Langkah {step} dari {STEPS.length} — {STEPS[step - 1]?.label}
          {requirePhoto && !visitFotoUrl && step === 4 && <span className="text-amber-600 ml-2">• Foto wajib diunggah</span>}
        </p>
      </div>
    </Modal>
  );
});

export default HubinPklKunjunganKolektifModal;
