import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings2,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  PenTool,
  Calendar,
  ShieldCheck,
  TableIcon,
  Cloud,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DigitalSignatureField } from '@/components/ui/DigitalSignatureField';
import { raporApi } from '@/api/rapor.api';
import { getDefaultUnitKompetensi, type UkkUnitKompetensi } from '@/utils/print/modules/pdfSertifikatUkk';
import { getAvailableRegulatoryEditions } from '@/config/ukkRegulatoryRegistry';
import { UkkSettingsRekapTable } from './UkkSettingsRekapTable';
import { UkkSkkniCloudModal, type AdoptedSkkniData } from './UkkSkkniCloudModal';
import { cn } from '@/lib/utils';

export interface UkkJurusanConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  initialTahunAjaran?: string;
}

export const UkkJurusanConfigModal: React.FC<UkkJurusanConfigModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  initialTahunAjaran,
}) => {
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<'form' | 'rekap'>('rekap');
  const [tahunAjaran, setTahunAjaran] = useState<string>(initialTahunAjaran || '2025/2026');
  const [edisiPedoman, setEdisiPedoman] = useState<string>('2026');
  const [skemaSertifikasi, setSkemaSertifikasi] = useState('');
  const [judulPenugasanId, setJudulPenugasanId] = useState('');

  useEffect(() => {
    if (isOpen && initialTahunAjaran) {
      setTahunAjaran(initialTahunAjaran);
    }
  }, [isOpen, initialTahunAjaran]);
  const [judulPenugasanEn, setJudulPenugasanEn] = useState('');
  const [units, setUnits] = useState<UkkUnitKompetensi[]>([]);
  const [ttdKepalaSekolah, setTtdKepalaSekolah] = useState<string | null>(null);
  const [ttdAsesorEksternal, setTtdAsesorEksternal] = useState<string | null>(null);
  const [ttdAsesorInternal, setTtdAsesorInternal] = useState<string | null>(null);
  const [cloudModalOpen, setCloudModalOpen] = useState<boolean>(false);

  const handleAdoptFromCloud = (adopted: AdoptedSkkniData) => {
    if (adopted.skemaSertifikasi) {
      setSkemaSertifikasi(adopted.skemaSertifikasi);
    }
    if (adopted.judulPenugasanId) {
      setJudulPenugasanId(adopted.judulPenugasanId);
    }
    if (adopted.judulPenugasanEn) {
      setJudulPenugasanEn(adopted.judulPenugasanEn);
    }
    if (Array.isArray(adopted.units) && adopted.units.length > 0) {
      setUnits(adopted.units);
    }
  };

  // Query Settings with year scope support
  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ['ukk-settings', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkSettings(jurusanId, tahunAjaran) : Promise.resolve(null)),
    enabled: isOpen && !!jurusanId,
    staleTime: 5 * 60 * 1000,
  });

  // Populate data
  useEffect(() => {
    if (settingsRes) {
      const data = settingsRes?.data || settingsRes;
      if (data) {
        if (data.edisi_pedoman) setEdisiPedoman(data.edisi_pedoman);
        setSkemaSertifikasi(data.skema_sertifikasi || '');
        setJudulPenugasanId(data.judul_penugasan_id || '');
        setJudulPenugasanEn(data.judul_penugasan_en || '');
        setTtdKepalaSekolah(data.ttd_kepala_sekolah || null);
        setTtdAsesorEksternal(data.ttd_asesor_eksternal || null);
        setTtdAsesorInternal(data.ttd_asesor_internal || null);
        if (Array.isArray(data.unit_kompetensi) && data.unit_kompetensi.length > 0) {
          setUnits(data.unit_kompetensi);
          return;
        }
      }
    }

    // Default units based on jurusan if empty
    if (isOpen && units.length === 0) {
      handleAutoPopulateUnits();
    }
  }, [settingsRes, isOpen]);

  const handleAutoPopulateUnits = () => {
    const defaultUnits = getDefaultUnitKompetensi(jurusanNama, jurusanNama);
    setUnits(defaultUnits);

    if (!skemaSertifikasi) {
      setSkemaSertifikasi(`Skema Sertifikasi KKNI Level II Pada Kompetensi Keahlian ${jurusanNama}`);
    }
    if (!judulPenugasanId) {
      setJudulPenugasanId(`Ujian Praktik Kejuruan Mandiri Bidang ${jurusanNama}`);
      setJudulPenugasanEn(`Independent Vocational Practical Examination in ${jurusanNama}`);
    }
    toast.success(`Daftar unit kompetensi diselaraskan dengan standar ${jurusanNama}`);
  };

  const handleAddUnit = () => {
    setUnits((prev) => [
      ...prev,
      {
        kode_unit: `KOD.${String(prev.length + 1).padStart(3, '0')}.01`,
        judul_unit: 'Unit Kompetensi Baru',
      },
    ]);
  };

  const handleUpdateUnit = (index: number, field: keyof UkkUnitKompetensi, value: string) => {
    setUnits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveUnit = (index: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== index));
  };

  // Mutation Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!jurusanId) throw new Error('Jurusan ID tidak ditemukan');
      return raporApi.saveUkkSettings(
        jurusanId,
        {
          tahun_ajaran: tahunAjaran,
          edisi_pedoman: edisiPedoman,
          skema_sertifikasi: skemaSertifikasi,
          judul_penugasan_id: judulPenugasanId,
          judul_penugasan_en: judulPenugasanEn,
          unit_kompetensi: units,
          ttd_kepala_sekolah: ttdKepalaSekolah,
          ttd_asesor_eksternal: ttdAsesorEksternal,
          ttd_asesor_internal: ttdAsesorInternal,
        },
        tahunAjaran
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ukk-settings', jurusanId] });
      queryClient.invalidateQueries({ queryKey: ['ukk-settings-rekap', jurusanId] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-ukk-list'] });
      toast.success(`Pengaturan UKK Jurusan ${jurusanNama} (TA ${tahunAjaran}) berhasil disimpan!`);
      setActiveView('rekap');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan pengaturan UKK');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Sertifikat & Unit Kompetensi UKK"
      size="5xl"
    >
      <div className="space-y-5">
        {/* Banner Info */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <FileCheck2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-900 dark:text-white">
              Konfigurasi Dinamis Output Sertifikat UKK ({jurusanNama}):
            </span>{' '}
            Data pada form ini akan otomatis dicetak pada Lembar Depan (Judul Penugasan & Skema) dan
            Lembar Belakang (Daftar Unit Kompetensi SKKNI/KKNI) pada setiap sertifikat siswa.
          </div>
        </div>

        {/* Tab Switcher: Rekap | Edit (Mobile Touch-Friendly) */}
        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-1 text-xs font-semibold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView('rekap')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer',
              activeView === 'rekap'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <TableIcon className="w-3.5 h-3.5 shrink-0" />
            Rekap Semua Tahun
          </button>
          <button
            type="button"
            onClick={() => setActiveView('form')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer',
              activeView === 'form'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            Edit Konfigurasi
            {tahunAjaran && (
              <span className="ml-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md text-[10px] font-mono">
                {tahunAjaran}
              </span>
            )}
          </button>
        </div>

        {/* ===== VIEW: REKAP TABEL ===== */}
        {activeView === 'rekap' && (
          <>
            <UkkSettingsRekapTable
              jurusanId={jurusanId}
              jurusanNama={jurusanNama}
              activeTahunAjaran={initialTahunAjaran}
              onEditYear={(tahun) => {
                setTahunAjaran(tahun);
                // Auto-set edisi pedoman sesuai tahun
                if (tahun === '2023/2024') setEdisiPedoman('2023_2024');
                else if (tahun === '2024/2025') setEdisiPedoman('2025');
                else setEdisiPedoman('2026');
                setActiveView('form');
              }}
            />
            <div className="flex items-center justify-end pt-2">
              <Button variant="outline" onClick={onClose} className="h-9 px-4 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                Tutup
              </Button>
            </div>
          </>
        )}

        {/* ===== VIEW: FORM EDIT ===== */}
        {activeView === 'form' && (<>

        {/* Kontrol Fleksibilitas Versi Historis: Tahun Ajaran & Edisi Juknis Regulasi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shadow-xs">
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Tahun Ajaran Target:
            </label>
            <select
              value={tahunAjaran}
              onChange={(e) => {
                const newYear = e.target.value;
                setTahunAjaran(newYear);
                if (newYear === '2023/2024') setEdisiPedoman('2023_2024');
                else if (newYear === '2024/2025') setEdisiPedoman('2025');
                else setEdisiPedoman('2026');
              }}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-medium cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
            >
              <option value="2025/2026">2025/2026 (Aktif Berjalan)</option>
              <option value="2024/2025">2024/2025 (Arsip Historis)</option>
              <option value="2023/2024">2023/2024 (Arsip Historis)</option>
              <option value="2026/2027">2026/2027 (Mendatang)</option>
            </select>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Pengaturan disimpan per tahun ajaran agar data arsip tidak tertimpa.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Edisi Juknis Regulasi:
            </label>
            <select
              value={edisiPedoman}
              onChange={(e) => setEdisiPedoman(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-medium cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
            >
              {getAvailableRegulatoryEditions().map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Standar ambang kelulusan & klausul masa berlaku menyesuaikan edisi ini.
            </p>
          </div>
        </div>

        {/* Form Fields: Lembar Depan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Konfigurasi Lembar Depan Sertifikat
            </h4>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Skema Sertifikasi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={skemaSertifikasi}
              onChange={(e) => setSkemaSertifikasi(e.target.value)}
              placeholder="Contoh: Skema Sertifikasi KKNI Level II Pada Kompetensi Keahlian..."
              className="mt-1.5 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Judul Penugasan (Bahasa Indonesia) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={judulPenugasanId}
                onChange={(e) => setJudulPenugasanId(e.target.value)}
                placeholder="Contoh: Pembuatan Sistem Kendali Berbasis IoT..."
                className="mt-1.5 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Judul Penugasan (English) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={judulPenugasanEn}
                onChange={(e) => setJudulPenugasanEn(e.target.value)}
                placeholder="Example: Development of IoT-Based Control System..."
                className="mt-1.5 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Unit Kompetensi: Lembar Belakang */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Unit Kompetensi (Lembar Belakang / SKKNI)
              </h4>
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                {units.length} Unit
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCloudModalOpen(true)}
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 cursor-pointer shadow-2xs"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-600" />
                Impor dari Cloud SKKNI
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoPopulateUnits}
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Rekomendasi Jurusan
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddUnit}
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Unit
              </Button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {units.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada unit kompetensi. Klik "Rekomendasi Jurusan" untuk mengisi otomatis.
              </div>
            ) : (
              units.map((unit, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-2 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs group"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="w-5 text-center font-bold text-slate-400 shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={unit.kode_unit}
                      onChange={(e) => handleUpdateUnit(idx, 'kode_unit', e.target.value)}
                      placeholder="Kode Unit (misal: PRK.IH01.009.01)"
                      className="w-full sm:w-48 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(idx)}
                      className="sm:hidden p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0 ml-auto cursor-pointer"
                      title="Hapus unit ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-1 w-full pl-7 sm:pl-0">
                    <input
                      type="text"
                      value={unit.judul_unit}
                      onChange={(e) => handleUpdateUnit(idx, 'judul_unit', e.target.value)}
                      placeholder="Judul Unit Kompetensi..."
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(idx)}
                      className="hidden sm:block p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Hapus unit ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tanda Tangan Digital Resmi Sertifikat (Pen Canvas) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <PenTool className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Master Tanda Tangan Digital Sertifikat (Pen Stylus)
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tanda tangan yang digoreskan di sini akan otomatis distempel pada output fisik cetak Sertifikat UKK (Lembar Depan & Belakang).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DigitalSignatureField
              label="TTD Kepala Sekolah"
              penName="Kepala Sekolah"
              value={ttdKepalaSekolah}
              onChange={(sig) => setTtdKepalaSekolah(sig)}
            />

            <DigitalSignatureField
              label="TTD Penguji Eksternal (DU/DI)"
              penName="Penguji Eksternal"
              value={ttdAsesorEksternal}
              onChange={(sig) => setTtdAsesorEksternal(sig)}
            />

            <DigitalSignatureField
              label="TTD Penguji Internal"
              penName="Penguji Internal"
              value={ttdAsesorInternal}
              onChange={(sig) => setTtdAsesorInternal(sig)}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending} className="h-9 px-4 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer">
            Batal
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan UKK'}
          </Button>
        </div>
        </>
      )}
      </div>

      {/* Modal Impor Master Katalog SKKNI Terpusat (License Cloud) */}
      <UkkSkkniCloudModal
        isOpen={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
        jurusanNama={jurusanNama}
        onAdopt={handleAdoptFromCloud}
      />
    </Modal>
  );
};
