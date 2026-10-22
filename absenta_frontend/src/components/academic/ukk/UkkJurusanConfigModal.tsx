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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DigitalSignatureField } from '@/components/ui/DigitalSignatureField';
import { raporApi } from '@/api/rapor.api';
import { getDefaultUnitKompetensi, type UkkUnitKompetensi } from '@/utils/print/modules/pdfSertifikatUkk';
import { getAvailableRegulatoryEditions } from '@/config/ukkRegulatoryRegistry';
import { cn } from '@/lib/utils';

export interface UkkJurusanConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
}

export const UkkJurusanConfigModal: React.FC<UkkJurusanConfigModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
}) => {
  const queryClient = useQueryClient();

  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');
  const [edisiPedoman, setEdisiPedoman] = useState<string>('2026');
  const [skemaSertifikasi, setSkemaSertifikasi] = useState('');
  const [judulPenugasanId, setJudulPenugasanId] = useState('');
  const [judulPenugasanEn, setJudulPenugasanEn] = useState('');
  const [units, setUnits] = useState<UkkUnitKompetensi[]>([]);
  const [ttdKepalaSekolah, setTtdKepalaSekolah] = useState<string | null>(null);
  const [ttdAsesorEksternal, setTtdAsesorEksternal] = useState<string | null>(null);
  const [ttdAsesorInternal, setTtdAsesorInternal] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['kaprog-ukk-list'] });
      toast.success(`Pengaturan UKK Jurusan ${jurusanNama} (TA ${tahunAjaran}) berhasil disimpan!`);
      onClose();
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
      size="xl"
    >
      <div className="space-y-6">
        {/* Banner Info */}
        <div className="bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">
              Konfigurasi Dinamis Output Sertifikat UKK ({jurusanNama}):
            </span>{' '}
            Data pada form ini akan otomatis dicetak pada Lembar Depan (Judul Penugasan & Skema) dan
            Lembar Belakang (Daftar Unit Kompetensi SKKNI/KKNI) pada setiap sertifikat siswa.
          </div>
        </div>

        {/* Kontrol Fleksibilitas Versi Historis: Tahun Ajaran & Edisi Juknis Regulasi */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
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
              className="w-full px-2.5 py-1.5 text-xs bg-background border rounded-lg font-medium cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="2025/2026">2025/2026 (Aktif Berjalan)</option>
              <option value="2024/2025">2024/2025 (Arsip Historis)</option>
              <option value="2023/2024">2023/2024 (Arsip Historis)</option>
              <option value="2026/2027">2026/2027 (Mendatang)</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Pengaturan disimpan per tahun ajaran agar data arsip tidak tertimpa.
            </p>
          </div>

          <div>
            <label className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Edisi Juknis Regulasi:
            </label>
            <select
              value={edisiPedoman}
              onChange={(e) => setEdisiPedoman(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border rounded-lg font-medium cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {getAvailableRegulatoryEditions().map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Standar ambang kelulusan & klausul masa berlaku menyesuaikan edisi ini.
            </p>
          </div>
        </div>

        {/* Form Fields: Lembar Depan */}
        <div className="bg-card border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <BookOpen className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Konfigurasi Lembar Depan Sertifikat
            </h4>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Skema Sertifikasi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={skemaSertifikasi}
              onChange={(e) => setSkemaSertifikasi(e.target.value)}
              placeholder="Contoh: Skema Sertifikasi KKNI Level II Pada Kompetensi Keahlian..."
              className="mt-1.5 w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Judul Penugasan (Bahasa Indonesia) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={judulPenugasanId}
                onChange={(e) => setJudulPenugasanId(e.target.value)}
                placeholder="Contoh: Pembuatan Sistem Kendali Berbasis IoT..."
                className="mt-1.5 w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Judul Penugasan (English) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={judulPenugasanEn}
                onChange={(e) => setJudulPenugasanEn(e.target.value)}
                placeholder="Example: Development of IoT-Based Control System..."
                className="mt-1.5 w-full px-3 py-2 text-sm bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Unit Kompetensi: Lembar Belakang */}
        <div className="bg-card border rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-foreground">
                Daftar Unit Kompetensi (Lembar Belakang / SKKNI)
              </h4>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                {units.length} Unit
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoPopulateUnits}
                className="text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Rekomendasi Jurusan
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddUnit}
                className="text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Unit
              </Button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {units.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Belum ada unit kompetensi. Klik "Rekomendasi Jurusan" untuk mengisi otomatis.
              </div>
            ) : (
              units.map((unit, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border text-xs group"
                >
                  <span className="w-6 text-center font-bold text-muted-foreground">{idx + 1}</span>
                  <input
                    type="text"
                    value={unit.kode_unit}
                    onChange={(e) => handleUpdateUnit(idx, 'kode_unit', e.target.value)}
                    placeholder="Kode Unit (misal: PRK.IH01.009.01)"
                    className="w-44 px-2 py-1.5 bg-background border rounded font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                  <input
                    type="text"
                    value={unit.judul_unit}
                    onChange={(e) => handleUpdateUnit(idx, 'judul_unit', e.target.value)}
                    placeholder="Judul Unit Kompetensi..."
                    className="flex-1 px-2 py-1.5 bg-background border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveUnit(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                    title="Hapus unit ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tanda Tangan Digital Resmi Sertifikat (Pen Canvas) */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <PenTool className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Master Tanda Tangan Digital Sertifikat (Pen Stylus)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Batal
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan UKK'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
