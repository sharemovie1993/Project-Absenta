import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  User, 
  Building2, 
  CalendarCheck
} from 'lucide-react';
import { Modal, Button } from '../ui';
import type { SiswaPkl } from '../../pages/hubin/types/penempatan.types';

export type MonitoringCyclePattern = 'standard_3' | 'single' | 'monthly' | 'recorded_only';

export interface MonitoringPrintConfig {
  pattern: MonitoringCyclePattern;
  customCount?: number;
  includeEmptyRows?: boolean;
}

interface HubinPklPrintMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: SiswaPkl | null;
  onConfirmPrint: (config: MonitoringPrintConfig) => void;
}

export const HubinPklPrintMonitoringModal: React.FC<HubinPklPrintMonitoringModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedPkl,
  onConfirmPrint,
}) => {
  const [pattern, setPattern] = useState<MonitoringCyclePattern>('standard_3');

  // Hitung durasi bulan jika ada
  const durationMonths = useMemo(() => {
    if (!selectedPkl?.tanggal_mulai || !selectedPkl?.tanggal_selesai) return 3;
    const start = new Date(selectedPkl.tanggal_mulai);
    const end = new Date(selectedPkl.tanggal_selesai);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 3;

    const diffYear = end.getFullYear() - start.getFullYear();
    const diffMonth = end.getMonth() - start.getMonth();
    const months = diffYear * 12 + diffMonth + (end.getDate() >= start.getDate() ? 1 : 0);
    return Math.max(1, Math.min(12, months));
  }, [selectedPkl?.tanggal_mulai, selectedPkl?.tanggal_selesai]);

  // Hitung jumlah riwayat yang ada
  const recordedVisitsCount = useMemo(() => {
    if (!selectedPkl?.kunjungan_json) return 0;
    try {
      const list = Array.isArray(selectedPkl.kunjungan_json)
        ? selectedPkl.kunjungan_json
        : JSON.parse(selectedPkl.kunjungan_json || '[]');
      return list.length;
    } catch {
      return 0;
    }
  }, [selectedPkl?.kunjungan_json]);

  const handlePrint = () => {
    onConfirmPrint({
      pattern,
      customCount: pattern === 'monthly' ? durationMonths : (pattern === 'single' ? 1 : 3),
      includeEmptyRows: pattern !== 'recorded_only'
    });
    onClose();
  };

  if (!selectedPkl) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      zIndex={80}
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Printer size={18} className="text-indigo-600" />
          <span className="text-sm font-bold">Cetak Lembar Monitoring</span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Info Ringkas Siswa */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase truncate">
              {selectedPkl.Siswa?.nama_siswa}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              {recordedVisitsCount} Kunjungan Terisi
            </span>
          </div>
          <p className="text-slate-500 mt-0.5 truncate">
            {selectedPkl.Mitra?.nama || 'Mitra IDUKA'}
          </p>
        </div>

        {/* Pilihan Pola Siklus */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Pilih Format Siklus Kunjungan:
          </p>

          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            pattern === 'standard_3'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}>
            <input
              type="radio"
              name="pattern"
              checked={pattern === 'standard_3'}
              onChange={() => setPattern('standard_3')}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">Standar 3 Kunjungan</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Orientasi (Kunjungan 1), Progres (Kunjungan 2), Penarikan (Kunjungan 3)</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            pattern === 'single'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}>
            <input
              type="radio"
              name="pattern"
              checked={pattern === 'single'}
              onChange={() => setPattern('single')}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">1x Kunjungan (Tunggal)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Format 1 baris untuk kunjungan ringkas atau tempat PKL luar kota</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            pattern === 'monthly'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}>
            <input
              type="radio"
              name="pattern"
              checked={pattern === 'monthly'}
              onChange={() => setPattern('monthly')}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">Kunjungan Bulanan ({durationMonths} Bulan)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">1 baris per bulan (Bulan ke-1 s/d Bulan ke-{durationMonths})</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            pattern === 'recorded_only'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}>
            <input
              type="radio"
              name="pattern"
              checked={pattern === 'recorded_only'}
              onChange={() => setPattern('recorded_only')}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">Hanya Riwayat yang Sudah Diisi ({recordedVisitsCount} Baris)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Cetak riwayat yang ada tanpa menambah baris kosong</p>
            </div>
          </label>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="px-4 text-xs font-semibold"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="px-4 text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            <Printer size={14} />
            <span>Cetak Lembar Monitoring</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

