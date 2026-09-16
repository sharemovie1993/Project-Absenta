import React, { useCallback, useState, useEffect } from 'react';
import { MapPin, History, Plus, Camera, ExternalLink, CheckCircle2, Printer, Pencil, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Textarea, Timeline, TimelineItem } from '../ui';
import { SimpleFormField } from '../ui/SimpleFormField';
import { getDriveThumbnailUrl, resolveAttachmentUrl } from '../../utils/hubinUtils';
import { HubinPklHeaderInfo } from './HubinPklHeaderInfo';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import { useIsMobile } from '../../hooks/useIsMobile';

interface Kunjungan {
  id?: string;
  tanggal?: string;
  catatan: string;
  catatan_dudi?: string;
  foto_url?: string;
  latitude?: string | number;
  longitude?: string | number;
}

interface HubinPklKunjunganModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: {
    id: string;
    Siswa?: { nama_siswa: string };
    Mitra?: { nama: string };
    Pembimbing?: { nama_guru: string };
  } | null;
  selectedKunjunganList: Kunjungan[];
  handleKunjunganSubmit: (e: React.FormEvent<HTMLFormElement>, editingKunjunganId?: string, onSuccess?: () => void) => void;
  onDeleteKunjungan?: (kunjunganId: string) => void;
  isPending: boolean;
  isDetectingGps: boolean;
  setIsDetectingGps: (val: boolean) => void;
  visitLat: string;
  setVisitLat: (val: string) => void;
  visitLng: string;
  setVisitLng: (val: string) => void;
  visitFotoUrl: string;
  setVisitFotoUrl: (val: string) => void;
  onPrintMonitoring?: (row: any) => void;
}

export const HubinPklKunjunganModal: React.FC<HubinPklKunjunganModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedPkl,
  selectedKunjunganList,
  handleKunjunganSubmit,
  onDeleteKunjungan,
  isPending,
  isDetectingGps,
  setIsDetectingGps,
  visitLat,
  setVisitLat,
  visitLng,
  setVisitLng,
  visitFotoUrl,
  setVisitFotoUrl,
  onPrintMonitoring,
}) => {
  const [mapView, setMapView] = useState<'standard' | 'satellite'>('standard');
  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'history'>('form');
  const [editingKunjungan, setEditingKunjungan] = useState<{ k: Kunjungan; index: number } | null>(null);
  const [catatan, setCatatan] = useState('');
  const [catatanDudi, setCatatanDudi] = useState('');
  const [tanggal, setTanggal] = useState('');
  const isMobile = useIsMobile();

  const handleCancelEdit = useCallback(() => {
    setEditingKunjungan(null);
    setCatatan('');
    setCatatanDudi('');
    setTanggal('');
    setVisitFotoUrl('');
    setVisitLat('');
    setVisitLng('');
  }, [setVisitFotoUrl, setVisitLat, setVisitLng]);

  useEffect(() => {
    if (!isOpen) {
      setMapView('standard');
      setActiveMobileTab('form');
      handleCancelEdit();
    }
  }, [isOpen, handleCancelEdit]);

  const handleStartEdit = useCallback((k: Kunjungan, index: number) => {
    setEditingKunjungan({ k, index });
    setCatatan(k.catatan || '');
    setCatatanDudi(k.catatan_dudi || '');
    setTanggal(k.tanggal ? format(new Date(k.tanggal), "yyyy-MM-dd'T'HH:mm") : '');
    setVisitFotoUrl(k.foto_url || '');
    setVisitLat(k.latitude !== undefined && k.latitude !== null ? String(k.latitude) : '');
    setVisitLng(k.longitude !== undefined && k.longitude !== null ? String(k.longitude) : '');
    if (isMobile) {
      setActiveMobileTab('form');
    }
  }, [isMobile, setVisitFotoUrl, setVisitLat, setVisitLng]);

  const handleDeleteItem = useCallback((k: Kunjungan, index: number) => {
    if (!onDeleteKunjungan) return;
    const kunjunganId = k.id || String(index);
    if (window.confirm(`Apakah Anda yakin ingin menghapus catatan kunjungan ke-${index + 1}?`)) {
      onDeleteKunjungan(kunjunganId);
      if (editingKunjungan?.index === index) {
        handleCancelEdit();
      }
    }
  }, [onDeleteKunjungan, editingKunjungan, handleCancelEdit]);

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const editingId = editingKunjungan ? (editingKunjungan.k.id || String(editingKunjungan.index)) : undefined;
    handleKunjunganSubmit(e, editingId, () => {
      handleCancelEdit();
      if (isMobile) {
        setActiveMobileTab('history');
      }
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setMapView('standard');
      setActiveMobileTab('form');
    }
  }, [isOpen]);

  const handleGpsDetect = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Browser Anda tidak mendukung deteksi GPS!");
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVisitLat(pos.coords.latitude.toString());
        setVisitLng(pos.coords.longitude.toString());
        setIsDetectingGps(false);
        toast.success("Koordinat GPS berhasil dideteksi!");
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error("Gagal mendeteksi lokasi: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setIsDetectingGps, setVisitLat, setVisitLng]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      zIndex={70}
      title={
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 shrink-0">
            <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              Jurnal Kunjungan Guru Pembimbing
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal hidden sm:block truncate">
              Monitoring langsung progres siswa di industri dan pencatatan riwayat bimbingan
            </p>
          </div>
        </div>
      }
    >
      {selectedPkl && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          {/* Header Info Reusable */}
          <HubinPklHeaderInfo
            siswaName={selectedPkl.Siswa?.nama_siswa}
            mitraName={selectedPkl.Mitra?.nama}
            pembimbingName={selectedPkl.Pembimbing?.nama_guru}
            totalKunjungan={selectedKunjunganList.length}
          />

          {/* Mobile Segmented Tab Switcher */}
          {isMobile && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveMobileTab('form')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMobileTab === 'form'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Plus size={14} />
                <span>Laporan Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('history')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMobileTab === 'history'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <History size={14} />
                <span>Riwayat ({selectedKunjunganList.length})</span>
              </button>
            </div>
          )}

          {/* Responsive Layout: 2 Columns on Tablet/Desktop, Tabbed/Stacked on Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
            
            {/* Riwayat Kunjungan (Timeline) - Left Column on Desktop */}
            <div className={`space-y-3.5 md:col-span-7 ${isMobile && activeMobileTab !== 'history' ? 'hidden' : 'block'}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 min-w-0">
                  <History size={15} className="text-indigo-500 shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider truncate">Riwayat Kunjungan</span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
                    {selectedKunjunganList.length}
                  </span>
                </div>
                {onPrintMonitoring && (
                  <button
                    type="button"
                    onClick={() => onPrintMonitoring(selectedPkl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Cetak Lembar Monitoring Kunjungan (PDF)"
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">Cetak Lembar Monitoring</span>
                    <span className="sm:hidden">Cetak</span>
                  </button>
                )}
              </div>

              {selectedKunjunganList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5">
                    <MapPin size={22} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Catatan Kunjungan</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                    Gunakan formulir laporan baru untuk mendokumentasikan kunjungan monitoring pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto pr-2 space-y-2">
                  <Timeline>
                    {selectedKunjunganList?.map((k, index) => {
                      const isBeingEdited = editingKunjungan?.index === index;
                      return (
                        <TimelineItem 
                          key={k.id || index}
                          title={`KUNJUNGAN KE-${index + 1}`}
                          time={k.tanggal ? format(new Date(k.tanggal), 'd MMMM yyyy, HH:mm', { locale: localeID }) : '-'}
                          status={isBeingEdited ? "success" : "warning"}
                          content={(
                            <div className={`space-y-2.5 mt-1.5 p-3.5 rounded-xl border transition-all ${
                              isBeingEdited 
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-xs ring-2 ring-amber-400/30' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-2xs'
                            }`}>
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  {isBeingEdited ? 'Sedang Diedit' : 'Catatan Kunjungan'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(k, index)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                                      isBeingEdited
                                        ? 'bg-amber-600 text-white border border-amber-600'
                                        : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/70 dark:border-amber-800/60'
                                    }`}
                                    title="Edit laporan kunjungan ini"
                                  >
                                    <Pencil size={11} />
                                    <span>{isBeingEdited ? 'Mengedit...' : 'Edit'}</span>
                                  </button>
                                  {onDeleteKunjungan && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(k, index)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800/60 transition-all cursor-pointer shadow-2xs"
                                      title="Hapus kunjungan ini"
                                    >
                                      <Trash2 size={11} />
                                      <span>Hapus</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                {k.catatan}
                              </p>

                              {k.catatan_dudi && (
                                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                    Catatan / Masukan DU/DI:
                                  </p>
                                  <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed italic whitespace-pre-wrap">
                                    "{k.catatan_dudi}"
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                {k.foto_url && (() => {
                                  const resolvedUrl = resolveAttachmentUrl(k.foto_url);
                                  const driveThumb = getDriveThumbnailUrl(k.foto_url);
                                  const displayThumb = driveThumb || resolvedUrl;
                                  return (
                                    <div className="flex items-center gap-2.5">
                                      <a 
                                        href={resolvedUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="block w-16 h-16 sm:w-20 sm:h-20 relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:ring-2 hover:ring-indigo-600 transition-all shrink-0 bg-slate-100 dark:bg-slate-800"
                                        title="Klik untuk melihat foto ukuran penuh"
                                      >
                                        <img 
                                          src={displayThumb} 
                                          alt="Dokumentasi Kunjungan" 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                          <ExternalLink size={13} />
                                          <span>Lihat</span>
                                        </div>
                                      </a>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                        <p className="font-semibold text-slate-700 dark:text-slate-200">Foto Dokumentasi</p>
                                        <p className="text-[10px] text-slate-400">Sentuh/klik foto untuk memperbesar</p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {(k.latitude || k.longitude) && (
                                  <a
                                    href={`https://maps.google.com/maps?q=${k.latitude},${k.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 transition-colors w-fit"
                                    title="Buka lokasi di Google Maps"
                                  >
                                    <MapPin size={11} className="text-amber-500 shrink-0" />
                                    <span>{k.latitude || '-'}, {k.longitude || '-'}</span>
                                    <ExternalLink size={9} className="text-slate-400" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        />
                      );
                    })}
                  </Timeline>
                </div>
              )}
            </div>

            {/* Form Input Kunjungan - Right Column on Desktop */}
            <div className={`md:col-span-5 bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 rounded-2xl border ${
              editingKunjungan ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20' : 'border-slate-200/70 dark:border-slate-800'
            } space-y-4 shadow-2xs ${isMobile && activeMobileTab !== 'form' ? 'hidden' : 'block'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  {editingKunjungan ? (
                    <>
                      <Pencil size={16} className="text-amber-500" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Edit Kunjungan Ke-{editingKunjungan.index + 1}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="text-emerald-500" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Catat Kunjungan Baru
                      </span>
                    </>
                  )}
                </div>
                {editingKunjungan && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={13} />
                    <span>Batal Edit</span>
                  </button>
                )}
              </div>

              <form onSubmit={onFormSubmit} className="space-y-3.5">
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

                <SimpleFormField htmlFor="kunjungan-catatan-dudi" label="Catatan / Masukan DU/DI (Opsional)">
                  <Textarea
                    id="kunjungan-catatan-dudi"
                    name="catatan_dudi"
                    rows={3}
                    value={catatanDudi}
                    onChange={(e) => setCatatanDudi(e.target.value)}
                    className="text-xs rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                    placeholder="Catatan, arahan, atau masukan dari pembimbing industri/DU/DI mengenai perkembangan siswa..."
                  />
                </SimpleFormField>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto Dokumentasi</span>
                  <HubinGoogleDriveUploader
                    value={visitFotoUrl}
                    onChange={setVisitFotoUrl}
                    compact
                    label="Unggah Foto Kunjungan Lapangan"
                  />
                  {/* Hidden input to ensure value is submitted with form */}
                  <input type="hidden" name="foto_url" value={visitFotoUrl} />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isDetectingGps}
                    onClick={handleGpsDetect}
                    className="w-full h-10 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <MapPin size={14} className={isDetectingGps ? "animate-bounce text-amber-600" : "text-amber-600"} />
                    <span>{isDetectingGps ? "Mendeteksi Koordinat..." : "Gunakan Titik Lokasi GPS Saya"}</span>
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

          </div>

          {/* Modal Close Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Setiap laporan kunjungan tersimpan permanen sebagai bukti logbook monitoring pembimbing.
            </span>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl h-9 px-4 text-xs font-bold ml-auto"
            >
              Tutup Jurnal
            </Button>
          </div>

        </div>
      )}
    </Modal>
  );
});
