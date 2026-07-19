import React, { lazy, Suspense } from 'react';
import { Button, Input, Label, Loader } from '../../components/ui';
import { Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import type { Supervisi } from '../../api/kurikulum.api';

const SearchableSelect = lazy(() =>
  import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);
const Modal = lazy(() =>
  import('../../components/ui/Modal').then(m => ({ default: m.Modal }))
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupervisiFormState {
  guru_id: string;
  tanggal: string;
  jam_ke: number;
  kelas: string;
  mapel: string;
  catatan: string;
  nilai: number | '';
  status: string;
  supervisor_id: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface RecommendationSlot {
  id: string;
  jam_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  kelas: string;
  mapel: string;
  recommended_supervisors: Array<{ id: string; nama_guru: string }>;
}

interface SupervisiFormModalProps {
  isOpen: boolean;
  isEditMode: boolean;
  formData: SupervisiFormState;
  onFormChange: (data: SupervisiFormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  guruOptions: SelectOption[];
  kelasOptions: SelectOption[];
  mapelOptions: SelectOption[];
  filteredSupervisorOptions: SelectOption[];
  recommendations: RecommendationSlot[];
  loadingRecs: boolean;
  selectedRecId: string | null;
  onSelectRec: (rec: RecommendationSlot) => void;
  onFetchRecommendations: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SupervisiFormModal: React.FC<SupervisiFormModalProps> = ({
  isOpen,
  isEditMode,
  formData,
  onFormChange,
  onClose,
  onSubmit,
  guruOptions,
  kelasOptions,
  mapelOptions,
  filteredSupervisorOptions,
  recommendations,
  loadingRecs,
  selectedRecId,
  onSelectRec,
  onFetchRecommendations,
}) => {
  const set = (partial: Partial<SupervisiFormState>) => onFormChange({ ...formData, ...partial });

  return (
    <Suspense fallback={null}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? 'Edit Jadwal Supervisi' : 'Tambah Jadwal Supervisi'}
      >
        <form onSubmit={onSubmit} className="space-y-4">

          {/* Guru */}
          <div>
            <Label htmlFor="guru-select">Guru</Label>
            <Suspense fallback={<Loader />}>
              <SearchableSelect
                id="guru-select"
                value={formData.guru_id}
                onValueChange={(val) => set({ guru_id: val })}
                options={guruOptions}
                placeholder="Pilih Guru"
                searchPlaceholder="Cari Guru..."
              />
            </Suspense>
          </div>

          {/* Tanggal & Jam */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tanggal-input">Tanggal</Label>
              <Input
                id="tanggal-input"
                type="date"
                value={formData.tanggal}
                onChange={(e) => set({ tanggal: e.target.value })}
                required
                aria-label="Tanggal supervisi"
              />
            </div>
            <div>
              <Label htmlFor="jam-ke-input">Jam Ke</Label>
              <Input
                id="jam-ke-input"
                type="number"
                min="1"
                max="15"
                value={formData.jam_ke}
                onChange={(e) => set({ jam_ke: Number(e.target.value) })}
                required
                aria-label="Jam ke berapa"
              />
            </div>
          </div>

          {/* Automasi Rekomendasi Jadwal */}
          {formData.guru_id && formData.tanggal && !isEditMode && (
            <div className="space-y-2 border border-indigo-50 dark:border-indigo-950/40 rounded-2xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12} /> Automasi Jadwal
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onFetchRecommendations}
                  loading={loadingRecs}
                  className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl px-2 h-7"
                >
                  Cari Jadwal Mengajar Guru
                </Button>
              </div>

              {recommendations.length > 0 && (
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                    Pilih Slot Jam Mengajar:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {recommendations?.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => {
                          onSelectRec(rec);
                          toast.success(`Slot dipilih: Jam Ke-${rec.jam_ke} - Kelas ${rec.kelas}`);
                        }}
                        className={cn(
                          'p-3 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col gap-1',
                          selectedRecId === rec.id
                            ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-950/50'
                        )}
                      >
                        <div className="flex items-center justify-between font-black text-slate-700 dark:text-slate-200">
                          <span>Jam Ke-{rec.jam_ke} ({rec.jam_mulai} - {rec.jam_selesai})</span>
                          <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                            {rec.kelas}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{rec.mapel}</div>
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                          ✓ {rec.recommended_supervisors.length} supervisor bebas bentrok tersedia
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mapel */}
          <div>
            <Label htmlFor="mapel-select">Mata Pelajaran</Label>
            <Suspense fallback={<Loader />}>
              <SearchableSelect
                id="mapel-select"
                value={formData.mapel}
                onValueChange={(val) => set({ mapel: val })}
                options={mapelOptions}
                placeholder="Pilih Mata Pelajaran"
              />
            </Suspense>
          </div>

          {/* Kelas */}
          <div>
            <Label htmlFor="kelas-select">Kelas</Label>
            <Suspense fallback={<Loader />}>
              <SearchableSelect
                id="kelas-select"
                value={formData.kelas}
                onValueChange={(val) => set({ kelas: val })}
                options={kelasOptions}
                placeholder="Pilih Kelas"
              />
            </Suspense>
          </div>

          {/* Supervisor */}
          <div>
            <Label htmlFor="supervisor-select">Supervisor / Penilai</Label>
            <Suspense fallback={<Loader />}>
              <SearchableSelect
                id="supervisor-select"
                value={formData.supervisor_id}
                onValueChange={(val) => set({ supervisor_id: val })}
                options={filteredSupervisorOptions}
                placeholder="Pilih Supervisor"
                searchPlaceholder="Cari Supervisor..."
              />
            </Suspense>
          </div>

          {/* Catatan */}
          <div>
            <Label htmlFor="catatan-input">Catatan Observasi (Opsional)</Label>
            <Input
              id="catatan-input"
              value={formData.catatan}
              onChange={(e) => set({ catatan: e.target.value })}
              aria-label="Catatan hasil supervisi"
              placeholder="Contoh: Pembelajaran interaktif, perlu peningkatan manajemen kelas."
            />
          </div>

          {/* Status & Nilai */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-select">Status</Label>
              <Suspense fallback={<Loader />}>
                <SearchableSelect
                  id="status-select"
                  value={formData.status}
                  onValueChange={(val) => set({ status: val })}
                  options={[
                    { label: 'SCHEDULED (Terjadwal)', value: 'SCHEDULED' },
                    { label: 'COMPLETED (Selesai)', value: 'COMPLETED' },
                  ]}
                  placeholder="Pilih Status"
                />
              </Suspense>
            </div>
            <div>
              <Label htmlFor="nilai-input">Nilai Kinerja (0-100)</Label>
              <Input
                id="nilai-input"
                type="number"
                min="0"
                max="100"
                disabled={formData.status !== 'COMPLETED'}
                value={formData.nilai}
                onChange={(e) =>
                  set({ nilai: e.target.value === '' ? '' : Number(e.target.value) })
                }
                placeholder={formData.status !== 'COMPLETED' ? 'Set SELESAI dulu' : 'Skor 0-100'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </Suspense>
  );
};

export default SupervisiFormModal;
