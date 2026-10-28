import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, History, Plus, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Modal, Button } from '../ui';
import { HubinPklHeaderInfo } from './HubinPklHeaderInfo';
import { useIsMobile } from '../../hooks/useIsMobile';
import { hubinApi } from '../../api/hubin.api';
import {
  HubinPklKunjunganTimeline,
  type KunjunganItem,
} from './kunjungan/HubinPklKunjunganTimeline';
import { HubinPklKunjunganForm } from './kunjungan/HubinPklKunjunganForm';
import { type KunjunganOperationalStage } from './kunjungan/KunjunganStageSelector';

export interface HubinPklKunjunganModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: {
    id: string;
    tahun_pelajaran_id?: string;
    Siswa?: { nama_siswa: string };
    Mitra?: { nama: string };
    Pembimbing?: { nama_guru: string };
  } | null;
  selectedKunjunganList: KunjunganItem[];
  handleKunjunganSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    editingKunjunganId?: string,
    onSuccess?: () => void
  ) => void;
  onDeleteKunjungan?: (kunjunganId: string) => void;
  handleDeleteKunjungan?: (kunjunganId: string) => void;
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
  selectedKunjunganList = [],
  handleKunjunganSubmit,
  onDeleteKunjungan,
  handleDeleteKunjungan,
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
  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'history'>('form');
  const [editingKunjungan, setEditingKunjungan] = useState<{ k: KunjunganItem; index: number } | null>(null);
  const [catatan, setCatatan] = useState('');
  const [catatanDudi, setCatatanDudi] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jurnalVerified, setJurnalVerified] = useState(true);
  const [tahap, setTahap] = useState<KunjunganOperationalStage>('MONITORING');
  const isMobile = useIsMobile();

  // 1. Fetch Hubin Visit Cycle Policy & Requirements for this Academic Year
  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', selectedPkl?.tahun_pelajaran_id],
    queryFn: () =>
      hubinApi.getSettings(
        selectedPkl?.tahun_pelajaran_id ? { tahun_pelajaran_id: selectedPkl.tahun_pelajaran_id } : undefined
      ),
    enabled: Boolean(isOpen && selectedPkl),
    staleTime: 5 * 60 * 1000,
  });

  const cycleMode = hubinSettings?.visitCycleMode || 'THREE_CYCLE';
  const cycleTarget = hubinSettings?.visitCycleTarget || (cycleMode === 'FOUR_CYCLE' ? 4 : 3);
  const requirePhoto = hubinSettings?.visitRequirePhoto !== false;
  const requireSignature = hubinSettings?.visitRequireSignature !== false;
  const requireJournal = hubinSettings?.visitRequireJournal !== false;

  // Resolve Smart Default Stage based on cycle count
  const resolveDefaultStage = useCallback(
    (count: number): KunjunganOperationalStage => {
      if (count === 0) return 'PENGANTARAN';
      if (count >= cycleTarget - 1) return 'PENJEMPUTAN';
      return 'MONITORING';
    },
    [cycleTarget]
  );

  // 2. Dynamic Cycle Title Resolver
  const getCycleLabel = useCallback(
    (index: number) => {
      if (cycleMode === 'FOUR_CYCLE') {
        const titles = [
          'Siklus I: Monitoring Awal (Penyerahan & Orientasi DU/DI)',
          'Siklus II: Monitoring Tengah (Evaluasi Kinerja & Progres PKL)',
          'Siklus III: Monitoring Pra-Akhir (Verifikasi Jurnal & Laporan)',
          'Siklus IV: Monitoring Akhir (Evaluasi Akhir & Penjemputan)',
        ];
        return titles[index] || `Siklus Khusus Ke-${index + 1}: Supervisi Lanjutan`;
      }
      if (cycleMode === 'THREE_CYCLE') {
        const titles = [
          'Siklus I: Monitoring Awal (Orientasi Siswa)',
          'Siklus II: Monitoring Tengah (Evaluasi & Kendala)',
          'Siklus III: Monitoring Akhir (Penjemputan & Penarikan)',
        ];
        return titles[index] || `Siklus Khusus Ke-${index + 1}: Supervisi Tambahan`;
      }
      return `Siklus Ke-${index + 1} dari ${cycleTarget}: Supervisi Terjadwal`;
    },
    [cycleMode, cycleTarget]
  );

  // Active Title for Form Header
  const activeCycleTitle = useMemo(() => {
    if (editingKunjungan) {
      return getCycleLabel(editingKunjungan.index);
    }
    return getCycleLabel(selectedKunjunganList.length);
  }, [editingKunjungan, selectedKunjunganList.length, getCycleLabel]);

  // Reset form helper
  const handleCancelEdit = useCallback(() => {
    setEditingKunjungan(null);
    setCatatan('');
    setCatatanDudi('');
    setTanggal('');
    setJurnalVerified(true);
    setTahap(resolveDefaultStage(selectedKunjunganList.length));
    setVisitFotoUrl('');
    setVisitLat('');
    setVisitLng('');
  }, [selectedKunjunganList.length, resolveDefaultStage, setVisitFotoUrl, setVisitLat, setVisitLng]);

  useEffect(() => {
    if (!isOpen) {
      setActiveMobileTab('form');
      handleCancelEdit();
    } else if (!editingKunjungan) {
      setTahap(resolveDefaultStage(selectedKunjunganList.length));
    }
  }, [isOpen, editingKunjungan, selectedKunjunganList.length, resolveDefaultStage, handleCancelEdit]);

  const handleStartEdit = useCallback(
    (k: KunjunganItem, index: number) => {
      setEditingKunjungan({ k, index });
      setCatatan(k.catatan || '');
      setCatatanDudi(k.catatan_dudi || '');
      setTanggal(k.tanggal ? format(new Date(k.tanggal), "yyyy-MM-dd'T'HH:mm") : '');
      setVisitFotoUrl(k.foto_url || '');
      setVisitLat(k.latitude !== undefined && k.latitude !== null ? String(k.latitude) : '');
      setVisitLng(k.longitude !== undefined && k.longitude !== null ? String(k.longitude) : '');
      setJurnalVerified(k.jurnal_verified !== false);
      setTahap((k.tahap as KunjunganOperationalStage) || resolveDefaultStage(index));
      if (isMobile) {
        setActiveMobileTab('form');
      }
    },
    [isMobile, resolveDefaultStage, setVisitFotoUrl, setVisitLat, setVisitLng]
  );

  const deleteFn = onDeleteKunjungan || handleDeleteKunjungan;
  const handleDeleteItem = useCallback(
    (k: KunjunganItem, index: number) => {
      if (!deleteFn) return;
      const kunjunganId = k.id || String(index);
      if (window.confirm(`Apakah Anda yakin ingin menghapus catatan kunjungan ke-${index + 1}?`)) {
        deleteFn(kunjunganId);
        if (editingKunjungan?.index === index) {
          handleCancelEdit();
        }
      }
    },
    [deleteFn, editingKunjungan, handleCancelEdit]
  );

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Guard: Validate required photo if mandated by Hubin policy
    if (requirePhoto && !visitFotoUrl) {
      toast.error('Kebijakan Hubin mewajibkan lampiran foto dokumentasi kunjungan lapangan!');
      return;
    }

    const editingId = editingKunjungan ? editingKunjungan.k.id || String(editingKunjungan.index) : undefined;
    handleKunjunganSubmit(e, editingId, () => {
      toast.success(
        editingKunjungan ? 'Perubahan kunjungan berhasil disimpan!' : 'Laporan kunjungan berhasil ditambahkan!'
      );
      handleCancelEdit();
      if (isMobile) {
        setActiveMobileTab('history');
      }
    });
  };

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
        toast.success('Koordinat GPS berhasil dideteksi!');
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error('Gagal mendeteksi lokasi: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setIsDetectingGps, setVisitLat, setVisitLng]);

  const progressPercent = Math.min(100, Math.round((selectedKunjunganList.length / cycleTarget) * 100));

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
              Monitoring langsung progres siswa di industri dan pencatatan bimbingan berkala
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

          {/* Hubin Cycle Policy & Progress Banner */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-linear-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-600 text-white shrink-0">
                  <ShieldCheck size={14} />
                </span>
                <div>
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-200">
                    Kebijakan Hubin:{' '}
                    {cycleMode === 'FOUR_CYCLE'
                      ? '4 Siklus Intensif Vokasi'
                      : cycleMode === 'CUSTOM'
                      ? `Kustom (${cycleTarget} Kunjungan)`
                      : '3 Siklus Standar Kemendikbud'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                    (Target: {cycleTarget} Kali Kunjungan)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Capaian: {selectedKunjunganList.length} / {cycleTarget} Siklus
                </span>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Progress Bar & Required Instruments */}
            <div className="space-y-1.5 pt-1 border-t border-indigo-100/80 dark:border-indigo-900/60">
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles size={12} className="text-amber-500" />
                  Tahap aktif:{' '}
                  <strong className="text-indigo-950 dark:text-indigo-200 truncate">{activeCycleTitle}</strong>
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                      requirePhoto
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {requirePhoto ? '✓ Foto GPS Wajib' : '— Foto Opsional'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                      requireJournal
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {requireJournal ? '✓ Jurnal Siswa Wajib' : '— Jurnal Bebas'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                      requireSignature
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {requireSignature ? '✓ Paraf DU/DI Wajib' : '— Paraf Bebas'}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
                <span>Form Laporan</span>
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

          {/* Responsive Layout: 2 Columns on Tablet/Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Riwayat Kunjungan (Timeline) - Left Column */}
            <div className={`md:col-span-7 ${isMobile && activeMobileTab !== 'history' ? 'hidden' : 'block'}`}>
              <HubinPklKunjunganTimeline
                kunjunganList={selectedKunjunganList}
                editingKunjungan={editingKunjungan}
                onStartEdit={handleStartEdit}
                onDeleteItem={handleDeleteItem}
                onPrintMonitoring={
                  onPrintMonitoring && selectedPkl ? () => onPrintMonitoring(selectedPkl) : undefined
                }
                getCycleLabel={getCycleLabel}
                requireJournal={requireJournal}
                requirePhoto={requirePhoto}
              />
            </div>

            {/* Form Input Kunjungan - Right Column */}
            <div className={`md:col-span-5 ${isMobile && activeMobileTab !== 'form' ? 'hidden' : 'block'}`}>
              <HubinPklKunjunganForm
                editingKunjungan={editingKunjungan}
                activeCycleTitle={activeCycleTitle}
                catatan={catatan}
                setCatatan={setCatatan}
                catatanDudi={catatanDudi}
                setCatatanDudi={setCatatanDudi}
                tanggal={tanggal}
                setTanggal={setTanggal}
                visitFotoUrl={visitFotoUrl}
                setVisitFotoUrl={setVisitFotoUrl}
                visitLat={visitLat}
                setVisitLat={setVisitLat}
                visitLng={visitLng}
                setVisitLng={setVisitLng}
                isDetectingGps={isDetectingGps}
                handleGpsDetect={handleGpsDetect}
                isPending={isPending}
                onCancelEdit={handleCancelEdit}
                onFormSubmit={onFormSubmit}
                requirePhoto={requirePhoto}
                requireJournal={requireJournal}
                requireSignature={requireSignature}
                jurnalVerified={jurnalVerified}
                setJurnalVerified={setJurnalVerified}
                tahap={tahap}
                setTahap={setTahap}
              />
            </div>
          </div>

          {/* Modal Close Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Setiap laporan kunjungan tersimpan permanen sebagai bukti logbook monitoring pembimbing.
            </span>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-9 px-4 text-xs font-bold ml-auto">
              Tutup Jurnal
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
});

export default HubinPklKunjunganModal;
