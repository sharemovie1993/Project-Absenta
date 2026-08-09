import React, { lazy, Suspense } from 'react';
import { Modal, Input, Label, Button, SearchableSelect } from '@/components/ui';

const SmartStudentPicker = lazy(() => import('@/components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedId: string | null;
  selectedSiswa: any;
  setSelectedSiswa: (s: any) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const CaseFormModal: React.FC<CaseFormModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  selectedId,
  selectedSiswa,
  setSelectedSiswa,
  formData,
  setFormData
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedId ? 'Perbarui Kasus BK' : 'Buka Kasus BK Baru'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-1">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
          {selectedId ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
              <div className="font-bold text-xs">{selectedSiswa?.nama_siswa}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedSiswa?.nis}</div>
            </div>
          ) : (
            <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
              <SmartStudentPicker
                onSelect={(s) => {
                  setSelectedSiswa(s);
                  setFormData((prev: any) => ({ ...prev, siswa_id: s.id }));
                }}
                mode="siswa"
                placeholder="Ketik nama atau NIS siswa..."
              />
            </Suspense>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Judul Kasus</Label>
          <Input
            placeholder="Contoh: Sering Membolos di Jam Ke-5 atau Gangguan Kecemasan Belajar"
            value={formData.judul}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, judul: e.target.value }))}
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori Kasus</Label>
            <SearchableSelect
              options={[
                { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
                { value: 'AKADEMIS', label: 'Akademis' },
                { value: 'PRIBADI', label: 'Pribadi' },
                { value: 'SOSIAL', label: 'Sosial' }
              ]}
              value={formData.kategori}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, kategori: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Prioritas Tindakan</Label>
            <SearchableSelect
              options={[
                { value: 'RENDAH', label: 'Rendah' },
                { value: 'SEDANG', label: 'Sedang' },
                { value: 'TINGGI', label: 'Tinggi (Darurat)' }
              ]}
              value={formData.prioritas}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, prioritas: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 col-span-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Awal</Label>
            <SearchableSelect
              options={[
                { value: 'TERBUKA', label: 'Terbuka' },
                { value: 'PROSES', label: 'Pendampingan' },
                { value: 'RUJUKAN', label: 'Rujukan' },
                { value: 'SELESAI', label: 'Selesai' }
              ]}
              value={formData.status}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, status: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2 col-span-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Level Visibilitas</Label>
            <SearchableSelect
              options={[
                { value: 'SENSITIVE', label: 'Sensitif (Hanya BK)' },
                { value: 'LIMITED', label: 'Terbatas (BK + Wali Kelas)' },
                { value: 'PUBLIC', label: 'Publik (Seluruh Guru)' }
              ]}
              value={formData.visibility}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, visibility: val }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-2 col-span-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Kasus</Label>
            <Input
              type="date"
              value={formData.tanggal_kasus}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, tanggal_kasus: e.target.value }))}
              className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keterangan-kasus" className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Kronologi Detil</Label>
          <textarea
            id="keterangan-kasus"
            rows={3}
            placeholder="Tuliskan latar belakang masalah, perilaku menyimpang yang diamati, atau aduan awal..."
            value={formData.keterangan}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, keterangan: e.target.value }))}
            className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs font-bold h-10 px-4 rounded-xl">
            Batal
          </Button>
          <Button type="submit" variant="primary" className="text-xs font-bold h-10 px-6 rounded-xl">
            {selectedId ? 'Simpan Perubahan' : 'Buka Kasus'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});
