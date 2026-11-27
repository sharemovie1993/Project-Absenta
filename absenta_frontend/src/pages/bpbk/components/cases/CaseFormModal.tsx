import React, { lazy, Suspense } from 'react';
import { Modal, Input, Label, Button, SearchableSelect } from '@/components/ui';
import { FolderPlus } from 'lucide-react';

const SmartStudentPicker = lazy(() => import('@/components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedId: string | null;
  selectedSiswa: unknown;
  setSelectedSiswa: (s: unknown) => void;
  formData: unknown;
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
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-purple-50/60 to-indigo-50 dark:from-rose-950/30 dark:to-indigo-950/30 border border-rose-200/70 dark:border-rose-800/50">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FolderPlus size={17} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Manajemen Kasus Induk BK</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Menyatukan seluruh rangkaian konseling, panggilan orang tua, home visit, dan rujukan.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Pilih Siswa</Label>
          {selectedId ? (
            <div className="flex items-center gap-2.5 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {((selectedSiswa as any)?.nama_siswa || 'S').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-white">{(selectedSiswa as any)?.nama_siswa}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold uppercase tracking-wider">NIS: {(selectedSiswa as any)?.nis || '-'}</div>
              </div>
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

        <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Judul Kasus</Label>
          <Input
            placeholder="Contoh: Sering Membolos di Jam Ke-5 atau Gangguan Kecemasan Belajar"
            value={(formData as any).judul}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, judul: e.target.value }))}
            className="h-10 text-xs bg-white dark:bg-slate-900 border-indigo-200/80 dark:border-slate-800 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/50">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Kategori Kasus</Label>
            <SearchableSelect
              options={[
                { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
                { value: 'AKADEMIS', label: 'Akademis' },
                { value: 'PRIBADI', label: 'Pribadi' },
                { value: 'SOSIAL', label: 'Sosial' }
              ]}
              value={(formData as any).kategori}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, kategori: val }))}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-rose-200/80 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Prioritas Tindakan</Label>
            <SearchableSelect
              options={[
                { value: 'RENDAH', label: 'Rendah' },
                { value: 'SEDANG', label: 'Sedang' },
                { value: 'TINGGI', label: 'Tinggi (Darurat)' }
              ]}
              value={(formData as any).prioritas}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, prioritas: val }))}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-rose-200/80 dark:border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status Awal</Label>
            <SearchableSelect
              options={[
                { value: 'TERBUKA', label: 'Terbuka' },
                { value: 'PROSES', label: 'Pendampingan' },
                { value: 'RUJUKAN', label: 'Rujukan' },
                { value: 'SELESAI', label: 'Selesai' }
              ]}
              value={(formData as any).status}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, status: val }))}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Level Visibilitas</Label>
            <SearchableSelect
              options={[
                { value: 'SENSITIVE', label: 'Sensitif (Hanya BK)' },
                { value: 'LIMITED', label: 'Terbatas (BK + Wali Kelas)' },
                { value: 'PUBLIC', label: 'Publik (Seluruh Guru)' }
              ]}
              value={(formData as any).visibility}
              onValueChange={(val) => setFormData((prev: any) => ({ ...prev, visibility: val }))}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Tanggal Kasus</Label>
            <Input
              type="date"
              value={(formData as any).tanggal_kasus}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, tanggal_kasus: e.target.value }))}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50">
          <Label htmlFor="keterangan-kasus" className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Keterangan / Kronologi Detil</Label>
          <textarea
            id="keterangan-kasus"
            rows={3}
            placeholder="Tuliskan latar belakang masalah, perilaku menyimpang yang diamati, atau aduan awal..."
            value={formData.keterangan}
            onChange={(e) => setFormData((prev: unknown) => ({ ...prev, keterangan: e.target.value }))}
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
