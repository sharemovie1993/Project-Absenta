import React, { useState } from 'react';
import {
  Pencil, Plus, X, MapPin, Camera, CheckCircle2, ShieldAlert,
  BookOpenCheck, ChevronRight, ChevronLeft, Send, Activity, FileText,
} from 'lucide-react';
import { Button, Input, Textarea } from '../../ui';
import { SimpleFormField } from '../../ui/SimpleFormField';
import { HubinGoogleDriveUploader } from '../HubinGoogleDriveUploader';
import type { KunjunganItem } from './HubinPklKunjunganTimeline';
import { KunjunganStageSelector, STAGE_OPTIONS, type KunjunganOperationalStage } from './KunjunganStageSelector';
import { KunjunganWizardStrip } from './KunjunganWizardStrip';
import type { HubinPklKunjunganFormProps } from './HubinPklKunjunganForm';

const STEPS = [
  { id: 1, label: 'Tahap & Waktu', icon: Send },
  { id: 2, label: 'Catatan', icon: FileText },
  { id: 3, label: 'Dokumentasi', icon: Camera },
] as const;

export const KunjunganWizardForm: React.FC<HubinPklKunjunganFormProps> = React.memo(({
  editingKunjungan,
  activeCycleTitle,
  catatan,
  setCatatan,
  catatanDudi,
  setCatatanDudi,
  tanggal,
  setTanggal,
  visitFotoUrl,
  setVisitFotoUrl,
  visitLat,
  setVisitLat,
  visitLng,
  setVisitLng,
  isDetectingGps,
  handleGpsDetect,
  isPending,
  onCancelEdit,
  onFormSubmit,
  requirePhoto = true,
  requireJournal = true,
  requireSignature = true,
  jurnalVerified,
  setJurnalVerified,
  tahap,
  setTahap,
  hasPengantaran = false,
  hasMonitoring = false,
  hasPenjemputan = false,
  isReadyForPenjemputan = false,
}) => {
  const [step, setStep] = useState<number>(1);
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');

  // Reset to step 1 when editingKunjungan changes
  React.useEffect(() => {
    setStep(1);
  }, [editingKunjungan?.k?.id]);

  const handleStageSelect = (newStage: KunjunganOperationalStage, draftText?: string) => {
    setTahap(newStage);
    const isBlankOrDraft = !catatan.trim() || STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim());
    if (isBlankOrDraft && draftText) setCatatan(draftText);
  };

  const canGoNext = (): boolean => {
    if (step === 1) return !!tahap && !!tanggal;
    if (step === 2) return !!catatan.trim();
    return true;
  };

  const stepLabel = STEPS.find((s) => s.id === step)?.label || '';
  const currentStage = STAGE_OPTIONS.find((s) => s.id === tahap);

  return (
    <div
      className={`bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 rounded-2xl border ${
        editingKunjungan
          ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20'
          : 'border-slate-200/70 dark:border-slate-800'
      } space-y-3 shadow-2xs`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          {editingKunjungan ? (
            <Pencil size={15} className="text-amber-500 shrink-0" />
          ) : (
            <Plus size={15} className="text-emerald-500 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 block truncate">
              {editingKunjungan ? `Edit Kunjungan Ke-${editingKunjungan.index + 1}` : 'Catat Kunjungan Baru'}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
              {activeCycleTitle}
            </span>
          </div>
        </div>
        {editingKunjungan && (
          <button
            type="button"
            onClick={() => { onCancelEdit(); setStep(1); }}
            className="text-[11px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X size={13} />
            <span>Batal</span>
          </button>
        )}
      </div>

      {/* Step Indicator — shared component */}
      <KunjunganWizardStrip steps={STEPS} currentStep={step} />

      {/* Current stage context chip (shown on steps 2 & 3) */}
      {step > 1 && currentStage && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${currentStage.activeBg} w-fit`}
        >
          <currentStage.icon size={12} />
          <span>{currentStage.label}</span>
          <span className="opacity-60">• {tanggal ? new Date(tanggal).toLocaleDateString('id-ID') : '-'}</span>
        </div>
      )}

      {/* ---- FORM WRAPPER ---- */}
      <form
        onSubmit={(e) => {
          if (step < 3) { e.preventDefault(); return; }
          onFormSubmit(e);
        }}
        className="space-y-3.5"
      >
        <input type="hidden" name="tahap" value={tahap} />

        {/* ===== STEP 1: Tahap & Waktu ===== */}
        {step === 1 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            <KunjunganStageSelector
              value={tahap}
              onChange={handleStageSelect}
              hasPengantaran={hasPengantaran}
              hasMonitoring={hasMonitoring}
              hasPenjemputan={hasPenjemputan}
              isReadyForPenjemputan={isReadyForPenjemputan}
              isEditing={Boolean(editingKunjungan)}
            />
            <SimpleFormField htmlFor="kunjungan-tanggal" label="Tanggal & Jam Kunjungan">
              <Input
                id="kunjungan-tanggal"
                name="tanggal"
                type="datetime-local"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </SimpleFormField>
          </div>
        )}

        {/* ===== STEP 2: Catatan & Jurnal ===== */}
        {step === 2 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            <SimpleFormField htmlFor="kunjungan-catatan" label="Catatan Guru Pembimbing" required>
              <Textarea
                id="kunjungan-catatan"
                name="catatan"
                rows={4}
                required
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Uraikan kondisi siswa di tempat PKL, kepatuhan, keaktifan, kendala, atau bimbingan..."
              />
            </SimpleFormField>

            <SimpleFormField
              htmlFor="kunjungan-catatan-dudi"
              label={
                <span className="flex items-center justify-between w-full">
                  <span>Catatan / Masukan DU/DI</span>
                  {requireSignature && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                      (Disarankan untuk bukti paraf mitra)
                    </span>
                  )}
                </span>
              }
            >
              <Textarea
                id="kunjungan-catatan-dudi"
                name="catatan_dudi"
                rows={2}
                value={catatanDudi}
                onChange={(e) => setCatatanDudi(e.target.value)}
                className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                placeholder="Masukan atau arahan dari pembimbing DU/DI..."
              />
            </SimpleFormField>

            {requireJournal && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors">
                <input
                  type="checkbox"
                  checked={jurnalVerified}
                  onChange={(e) => setJurnalVerified(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <BookOpenCheck size={14} className="text-indigo-600 shrink-0" />
                    Verifikasi Jurnal Harian PKL Siswa
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Saya menyatakan telah memeriksa, memvalidasi catatan capaian CP, dan paraf buku jurnal harian siswa.
                  </p>
                </div>
              </label>
            )}
          </div>
        )}

        {/* ===== STEP 3: Dokumentasi & Lokasi ===== */}
        {step === 3 && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Foto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Foto Dokumentasi Lapangan
                </span>
                {requirePhoto ? (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldAlert size={11} /> Wajib Hubin
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">(Opsional)</span>
                )}
              </div>
              <HubinGoogleDriveUploader value={visitFotoUrl} onChange={setVisitFotoUrl} compact label="Unggah Foto Kunjungan Lapangan" />
              <input type="hidden" name="foto_url" value={visitFotoUrl} />
            </div>

            {/* GPS */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isDetectingGps}
                onClick={handleGpsDetect}
                className="w-full h-10 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <MapPin size={14} className={isDetectingGps ? 'animate-bounce text-amber-600' : 'text-amber-600'} />
                <span>{isDetectingGps ? 'Mendeteksi Koordinat...' : 'Gunakan Titik Lokasi GPS Saya'}</span>
              </button>

              {visitLat && visitLng && (
                <div className="space-y-2 pt-1">
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                    {(['standard', 'satellite'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMapView(v)}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                          mapView === v
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {v === 'standard' ? <MapPin size={10} /> : <Camera size={10} />}
                        {v === 'standard' ? 'Peta' : 'Satelit'}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
                    <iframe
                      width="100%" height="100%" frameBorder="0" scrolling="no"
                      title={`Visit ${mapView} View`}
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
                <SimpleFormField htmlFor="kunjungan-latitude" label="Latitude">
                  <Input id="kunjungan-latitude" name="latitude" type="number" step="any" placeholder="-6.12345"
                    className="text-xs h-9 rounded-xl font-mono" value={visitLat} onChange={(e) => setVisitLat(e.target.value)} />
                </SimpleFormField>
                <SimpleFormField htmlFor="kunjungan-longitude" label="Longitude">
                  <Input id="kunjungan-longitude" name="longitude" type="number" step="any" placeholder="106.12345"
                    className="text-xs h-9 rounded-xl font-mono" value={visitLng} onChange={(e) => setVisitLng(e.target.value)} />
                </SimpleFormField>
              </div>
            </div>
          </div>
        )}

        {/* ===== Navigation Buttons ===== */}
        <div className="flex items-center gap-2 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className="flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Kembali
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={!canGoNext()}
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              className="flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25"
            >
              <span>Lanjut — {WIZARD_STEPS[step]?.label}</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <Button
              type="submit"
              disabled={isPending || (requirePhoto && !visitFotoUrl)}
              className={`flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-wider ${
                editingKunjungan
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              } text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
              isLoading={isPending}
            >
              <CheckCircle2 size={15} />
              <span>{editingKunjungan ? 'Simpan Perubahan' : 'Kirim Laporan Kunjungan'}</span>
            </Button>
          )}
        </div>

        {/* Progress hint */}
        <p className="text-center text-[10px] text-slate-400 font-medium">
          Langkah {step} dari {WIZARD_STEPS.length} — {stepLabel}
          {requirePhoto && !visitFotoUrl && step === 3 && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">• Foto wajib diisi</span>
          )}
        </p>
      </form>
    </div>
  );
});

export default KunjunganWizardForm;
