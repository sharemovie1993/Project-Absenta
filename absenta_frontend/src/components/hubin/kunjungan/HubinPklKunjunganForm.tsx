import React, { useState } from 'react';
import { Pencil, Plus, X, MapPin, Camera, CheckCircle2, ShieldAlert, BookOpenCheck } from 'lucide-react';
import { Button, Input, Textarea } from '../../ui';
import { SimpleFormField } from '../../ui/SimpleFormField';
import { HubinGoogleDriveUploader } from '../HubinGoogleDriveUploader';
import type { KunjunganItem } from './HubinPklKunjunganTimeline';
import { KunjunganStageSelector, STAGE_OPTIONS, type KunjunganOperationalStage } from './KunjunganStageSelector';

export interface HubinPklKunjunganFormProps {
  editingKunjungan: { k: KunjunganItem; index: number } | null;
  activeCycleTitle: string;
  catatan: string;
  setCatatan: (v: string) => void;
  catatanDudi: string;
  setCatatanDudi: (v: string) => void;
  tanggal: string;
  setTanggal: (v: string) => void;
  visitFotoUrl: string;
  setVisitFotoUrl: (v: string) => void;
  visitLat: string;
  setVisitLat: (v: string) => void;
  visitLng: string;
  setVisitLng: (v: string) => void;
  isDetectingGps: boolean;
  handleGpsDetect: () => void;
  isPending: boolean;
  onCancelEdit: () => void;
  onFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  requirePhoto?: boolean;
  requireJournal?: boolean;
  requireSignature?: boolean;
  jurnalVerified: boolean;
  setJurnalVerified: (v: boolean) => void;
  tahap: KunjunganOperationalStage;
  setTahap: (v: KunjunganOperationalStage) => void;
  hasPengantaran?: boolean;
  hasMonitoring?: boolean;
  hasPenjemputan?: boolean;
  isReadyForPenjemputan?: boolean;
}

export const HubinPklKunjunganForm: React.FC<HubinPklKunjunganFormProps> = React.memo(({
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
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');

  const handleStageSelect = (newStage: KunjunganOperationalStage, draftText?: string) => {
    setTahap(newStage);
    const isBlankOrExistingDraft =
      !catatan.trim() ||
      STAGE_OPTIONS.some((s) => s.defaultDraft.trim() === catatan.trim());
    if (isBlankOrExistingDraft && draftText) {
      setCatatan(draftText);
    }
  };

  return (
    <div
      className={`bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 rounded-2xl border ${
        editingKunjungan
          ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20'
          : 'border-slate-200/70 dark:border-slate-800'
      } space-y-4 shadow-2xs`}
    >
      {/* Header Form & Cycle Phase Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          {editingKunjungan ? (
            <>
              <Pencil size={16} className="text-amber-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 block truncate">
                  Edit Kunjungan Ke-{editingKunjungan.index + 1}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  {activeCycleTitle}
                </span>
              </div>
            </>
          ) : (
            <>
              <Plus size={16} className="text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 block truncate">
                  Catat Kunjungan Baru
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
                  Target: {activeCycleTitle}
                </span>
              </div>
            </>
          )}
        </div>
        {editingKunjungan && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X size={13} />
            <span>Batal Edit</span>
          </button>
        )}
      </div>

      <form onSubmit={onFormSubmit} className="space-y-3.5">
        {/* Hidden Field Tahap Operasional */}
        <input type="hidden" name="tahap" value={tahap} />

        {/* Pemilihan Tahap Operasional Siklus (Pengantaran, Monitoring, Penjemputan, Insidental) */}
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

        <SimpleFormField htmlFor="kunjungan-catatan" label="Catatan Guru Pembimbing" required>
          <Textarea
            id="kunjungan-catatan"
            name="catatan"
            rows={3}
            required
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
            placeholder="Uraikan kondisi siswa di tempat PKL, kepatuhan, keaktifan, kendala, atau bimbingan dari guru..."
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
            placeholder="Catatan, arahan, atau masukan dari pembimbing industri DU/DI mengenai etos kerja & performa siswa..."
          />
        </SimpleFormField>

        {/* Verifikasi Jurnal PKL Siswa Checklist (Kebijakan Hubin) */}
        {requireJournal && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
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
                Saya menyatakan telah memeriksa, memvalidasi catatan capaian CP, dan paraf buku jurnal harian siswa di industri.
              </p>
            </div>
          </label>
        )}

        {/* Foto Dokumentasi Lapangan */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Foto Dokumentasi Lapangan
            </span>
            {requirePhoto ? (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldAlert size={11} /> Wajib Kebijakan Hubin
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">(Opsional)</span>
            )}
          </div>
          <HubinGoogleDriveUploader
            value={visitFotoUrl}
            onChange={setVisitFotoUrl}
            compact
            label="Unggah Foto Kunjungan Lapangan"
          />
          <input type="hidden" name="foto_url" value={visitFotoUrl} />
        </div>

        {/* Deteksi Titik Lokasi GPS & Peta */}
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
                <button
                  type="button"
                  onClick={() => setMapView('standard')}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    mapView === 'standard'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <MapPin size={10} />
                  Peta
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
                  <Camera size={10} />
                  Satelit
                </button>
              </div>

              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 animate-in fade-in slide-in-from-top-1 duration-300 group shadow-inner">
                {mapView === 'standard' ? (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    title="Visit Standard View"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(visitLng) - 0.002}%2C${parseFloat(visitLat) - 0.001}%2C${parseFloat(visitLng) + 0.002}%2C${parseFloat(visitLat) + 0.001}&layer=mapnik&marker=${visitLat}%2C${visitLng}`}
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
                    title="Visit Satellite View"
                    src={`https://maps.google.com/maps?q=${visitLat},${visitLng}&t=k&z=17&output=embed`}
                    className="opacity-90 transition-opacity group-hover:opacity-100"
                  />
                )}
                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-xl"></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <SimpleFormField htmlFor="kunjungan-latitude" label="Latitude (GPS)">
              <Input
                id="kunjungan-latitude"
                name="latitude"
                type="number"
                step="any"
                placeholder="e.g. -6.12345"
                className="text-xs h-9 rounded-xl font-mono"
                value={visitLat}
                onChange={(e) => setVisitLat(e.target.value)}
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="kunjungan-longitude" label="Longitude (GPS)">
              <Input
                id="kunjungan-longitude"
                name="longitude"
                type="number"
                step="any"
                placeholder="e.g. 106.12345"
                className="text-xs h-9 rounded-xl font-mono"
                value={visitLng}
                onChange={(e) => setVisitLng(e.target.value)}
              />
            </SimpleFormField>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className={`w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider ${
              editingKunjungan
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
            } text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            isLoading={isPending}
          >
            <CheckCircle2 size={16} />
            <span>{editingKunjungan ? 'Simpan Perubahan Kunjungan' : 'Kirim Laporan Kunjungan'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
});

export default HubinPklKunjunganForm;
