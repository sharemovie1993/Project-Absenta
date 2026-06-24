import React, { useCallback } from 'react';
import { MapPin, History, Plus, Camera, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Textarea, Timeline, TimelineItem } from '../ui';
import { SimpleFormField } from '../ui/SimpleFormField';
import { getDriveThumbnailUrl } from '../../utils/hubinUtils';
import { HubinPklHeaderInfo } from './HubinPklHeaderInfo';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';

interface Kunjungan {
  id?: string;
  tanggal?: string;
  catatan: string;
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
  handleKunjunganSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  isDetectingGps: boolean;
  setIsDetectingGps: (val: boolean) => void;
  visitLat: string;
  setVisitLat: (val: string) => void;
  visitLng: string;
  setVisitLng: (val: string) => void;
  visitFotoUrl: string;
  setVisitFotoUrl: (val: string) => void;
}

export const HubinPklKunjunganModal: React.FC<HubinPklKunjunganModalProps> = ({
  isOpen,
  onClose,
  selectedPkl,
  selectedKunjunganList,
  handleKunjunganSubmit,
  isPending,
  isDetectingGps,
  setIsDetectingGps,
  visitLat,
  setVisitLat,
  visitLng,
  setVisitLng,
  visitFotoUrl,
  setVisitFotoUrl,
}) => {
  const [mapView, setMapView] = React.useState<'standard' | 'satellite'>('standard');

  React.useEffect(() => {
    if (!isOpen) {
      setMapView('standard');
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
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-amber-600 dark:text-amber-400" />
          <span>Jurnal Kunjungan Guru Pembimbing</span>
        </div>
      }
    >
      {selectedPkl && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Info Reusable */}
          <HubinPklHeaderInfo
            siswaName={selectedPkl.Siswa?.nama_siswa}
            mitraName={selectedPkl.Mitra?.nama}
            pembimbingName={selectedPkl.Pembimbing?.nama_guru}
            totalKunjungan={selectedKunjunganList.length}
          />
 
          {/* Grid 2 Columns: History & Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Riwayat Kunjungan (Timeline) - 7 cols */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-450">
                <History size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Riwayat Monitoring Kunjungan</span>
              </div>
 
              {selectedKunjunganList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <MapPin size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada catatan kunjungan monitoring.</p>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto pr-2">
                  <Timeline>
                    {selectedKunjunganList?.map((k, index) => (
                      <TimelineItem 
                        key={k.id || index}
                        title={`KUNJUNGAN KE-${index + 1}`}
                        time={k.tanggal ? format(new Date(k.tanggal), 'd MMMM yyyy, HH:mm', { locale: localeID }) : '-'}
                        status="warning"
                        content={(
                          <div className="space-y-2 mt-1">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                              {k.catatan}
                            </p>
 
                            {k.foto_url && (() => {
                              const thumbUrl = getDriveThumbnailUrl(k.foto_url);
                              return (
                                <div className="pt-1">
                                  {thumbUrl ? (
                                    <a 
                                      href={k.foto_url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="block w-14 h-14 relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:ring-2 hover:ring-indigo-650 transition-all shrink-0"
                                    >
                                      <img 
                                        src={thumbUrl} 
                                        alt="Dokumentasi Kunjungan" 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                      />
                                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ExternalLink size={12} className="text-white" />
                                      </div>
                                    </a>
                                  ) : (
                                    <a 
                                      href={k.foto_url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded-lg"
                                    >
                                      <Camera size={10} />
                                      Foto Kunjungan
                                    </a>
                                  )}
                                </div>
                              );
                            })()}
 
                            {(k.latitude || k.longitude) && (
                              <div className="flex items-center gap-1 text-[9px] text-slate-450 font-bold bg-slate-50 dark:bg-slate-950/30 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 w-fit">
                                <MapPin size={10} className="text-slate-400" />
                                <span>GPS: {k.latitude || '-'}, {k.longitude || '-'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      />
                    ))}
                  </Timeline>
                </div>
              )}
            </div>
 
            {/* Form Input Kunjungan - 5 cols */}
            <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3 h-fit">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-450">
                <Plus size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Laporan Baru</span>
              </div>
 
              <form onSubmit={handleKunjunganSubmit} className="space-y-3">
                <SimpleFormField htmlFor="kunjungan-catatan" label="Catatan Hasil Pemantauan" required>
                  <Textarea
                    id="kunjungan-catatan"
                    name="catatan"
                    rows={3}
                    required
                    className="text-xs"
                    placeholder="Uraikan kondisi siswa di tempat PKL, kepatuhan, keaktifan..."
                  />
                </SimpleFormField>

                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto Dokumentasi</span>
                  <HubinGoogleDriveUploader
                    value={visitFotoUrl}
                    onChange={setVisitFotoUrl}
                    compact
                    label="Unggah Foto Kunjungan"
                  />
                  {/* Hidden input to ensure value is submitted with form */}
                  <input type="hidden" name="foto_url" value={visitFotoUrl} />
                </div>

                <Button
                  type="button"
                  variant="toolbarOutline"
                  disabled={isDetectingGps}
                  onClick={handleGpsDetect}
                  className="w-full text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 font-bold shadow-sm"
                >
                  <MapPin size={12} className={isDetectingGps ? "animate-bounce text-amber-500" : "text-amber-500"} />
                  {isDetectingGps ? "Mendeteksi..." : "Gunakan Lokasi GPS Saya"}
                </Button>

                {visitLat && visitLng && (
                  <div className="space-y-2">
                    <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                      <button
                        type="button"
                        onClick={() => setMapView('standard')}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${
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
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${
                          mapView === 'satellite' 
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <Camera size={10} />
                        Satelit
                      </button>
                    </div>

                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 animate-in fade-in slide-in-from-top-1 duration-300 group">
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
                      
                      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-lg"></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <SimpleFormField htmlFor="kunjungan-latitude" label="Latitude (GPS)">
                    <Input
                      id="kunjungan-latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      placeholder="e.g. -6.12"
                      className="text-xs"
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
                      placeholder="e.g. 106.3"
                      className="text-xs"
                      value={visitLng}
                      onChange={(e) => setVisitLng(e.target.value)}
                    />
                  </SimpleFormField>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full text-xs py-2 rounded-lg"
                  isLoading={isPending}
                >
                  Kirim Laporan Kunjungan
                </Button>
              </form>
            </div>

          </div>

          {/* Modal Close Action */}
          <div className="flex justify-end pt-4 border-t border-gray-150 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup Jurnal
            </Button>
          </div>

        </div>
      )}
    </Modal>
  );
};
