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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { raporApi } from '@/api/rapor.api';
import { getDefaultUnitKompetensi, type UkkUnitKompetensi } from '@/utils/print/modules/pdfSertifikatUkk';
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

  const [skemaSertifikasi, setSkemaSertifikasi] = useState('');
  const [judulPenugasanId, setJudulPenugasanId] = useState('');
  const [judulPenugasanEn, setJudulPenugasanEn] = useState('');
  const [units, setUnits] = useState<UkkUnitKompetensi[]>([]);

  // Query Settings
  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ['ukk-settings', jurusanId],
    queryFn: () => (jurusanId ? raporApi.getUkkSettings(jurusanId) : Promise.resolve(null)),
    enabled: isOpen && !!jurusanId,
    staleTime: 5 * 60 * 1000,
  });

  // Populate data
  useEffect(() => {
    if (settingsRes) {
      const data = settingsRes?.data || settingsRes;
      if (data) {
        setSkemaSertifikasi(data.skema_sertifikasi || '');
        setJudulPenugasanId(data.judul_penugasan_id || '');
        setJudulPenugasanEn(data.judul_penugasan_en || '');
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
      return raporApi.saveUkkSettings(jurusanId, {
        skema_sertifikasi: skemaSertifikasi,
        judul_penugasan_id: judulPenugasanId,
        judul_penugasan_en: judulPenugasanEn,
        unit_kompetensi: units,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ukk-settings', jurusanId] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-ukk-list'] });
      toast.success('Pengaturan Sertifikat UKK Jurusan berhasil disimpan!');
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
