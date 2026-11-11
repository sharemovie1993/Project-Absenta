import React from 'react';
import { Plus, Trash2, AlertTriangle, Users, Layers } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { SearchableSelect } from '../../ui/SearchableSelect';
import type { Guru } from '../../../types/academic';

export interface EditableUnitDraft {
  id?: string;
  nama_unit: string;
  guru_id: string;
  jp_alokasi: number;
  target_sumatif_slot: string;
  is_active?: boolean;
  _hasHistory?: boolean;
}

interface UnitPengajaranEditorProps {
  units: EditableUnitDraft[];
  onChange: (nextUnits: EditableUnitDraft[]) => void;
  guruOptions: Guru[];
  strukturJpPerMinggu?: number | null;
  defaultGuruId?: string;
}

const SUMATIF_OPTIONS = [
  { value: '', label: 'Fleksibel (Auto)' },
  { value: 'sumatif_1', label: 'SUM 1 (Sumatif 1)' },
  { value: 'sumatif_2', label: 'SUM 2 (Sumatif 2)' },
  { value: 'sumatif_3', label: 'SUM 3 (Sumatif 3)' },
  { value: 'sumatif_4', label: 'SUM 4 (Sumatif 4)' },
];

export const UnitPengajaranEditor: React.FC<UnitPengajaranEditorProps> = ({
  units,
  onChange,
  guruOptions,
  strukturJpPerMinggu,
  defaultGuruId = '',
}) => {
  const activeJpTotal = units
    .filter((u) => u.is_active !== false)
    .reduce((sum, u) => sum + Number(u.jp_alokasi || 0), 0);

  const selectOptions = guruOptions.map((g) => ({
    value: g.id,
    label: g.nama_guru,
  }));

  const handleAddUnit = () => {
    const nextIdx = units.length + 1;
    const nextSlot = nextIdx <= 4 ? `sumatif_${nextIdx}` : '';
    onChange([
      ...units,
      {
        nama_unit: `Sub-Materi ${nextIdx}`,
        guru_id: defaultGuruId,
        jp_alokasi: 2,
        target_sumatif_slot: nextSlot,
        is_active: true,
      },
    ]);
  };

  const handleUpdateField = (idx: number, patch: Partial<EditableUnitDraft>) => {
    const next = units.map((u, i) => (i === idx ? { ...u, ...patch } : u));
    onChange(next);
  };

  const handleRemoveOrToggle = (idx: number) => {
    const target = units[idx];
    if (units.length <= 1) return;
    if (target._hasHistory) {
      handleUpdateField(idx, { is_active: target.is_active === false });
      return;
    }
    onChange(units.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
              Daftar Unit Pengajaran (Sub-Materi Kolaborasi)
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Total Alokasi: <strong>{activeJpTotal} JP</strong>
              {typeof strukturJpPerMinggu === 'number' && (
                <span> / Struktur Resmi: <strong>{strukturJpPerMinggu} JP/mgg</strong></span>
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddUnit}
          className="h-8 px-2.5 text-xs font-bold border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Tambah Unit
        </Button>
      </div>

      {typeof strukturJpPerMinggu === 'number' && activeJpTotal > strukturJpPerMinggu && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <span>
            Peringatan: Total alokasi unit ({activeJpTotal} JP) melebihi kuota Struktur Kurikulum ({strukturJpPerMinggu} JP/minggu). Tetap dapat disimpan bila disepakati secara internal.
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {units.map((unit, idx) => (
          <div
            key={unit.id || `draft-unit-${idx}`}
            className={`rounded-xl border p-3 bg-white dark:bg-slate-900 transition-all ${
              unit.is_active === false
                ? 'opacity-60 border-slate-200 dark:border-slate-800'
                : 'border-slate-200 dark:border-slate-800 shadow-xs'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              <div className="md:col-span-4 space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">
                  Nama Sub-Materi / Unit #{idx + 1}
                </Label>
                <Input
                  value={unit.nama_unit}
                  onChange={(e) => handleUpdateField(idx, { nama_unit: e.target.value })}
                  placeholder="cth. CNC / Teknik Gambar"
                  className="h-9 text-xs font-semibold rounded-lg"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Guru Pengampu Unit
                </Label>
                <SearchableSelect
                  value={unit.guru_id}
                  onValueChange={(val) => handleUpdateField(idx, { guru_id: val })}
                  options={selectOptions}
                  placeholder="Pilih Guru..."
                  searchPlaceholder="Cari guru..."
                  triggerClassName="h-9 text-xs font-semibold rounded-lg"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Porsi JP</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={unit.jp_alokasi}
                  onChange={(e) => handleUpdateField(idx, { jp_alokasi: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-9 text-xs font-bold text-center rounded-lg"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-1.5">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Slot Sumatif</Label>
                  <select
                    value={unit.target_sumatif_slot}
                    onChange={(e) => handleUpdateField(idx, { target_sumatif_slot: e.target.value })}
                    className="w-full h-9 px-2 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  >
                    {SUMATIF_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {units.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveOrToggle(idx)}
                    title={
                      unit._hasHistory
                        ? unit.is_active === false
                          ? 'Aktifkan kembali unit'
                          : 'Nonaktifkan unit (memiliki riwayat sesi/jadwal)'
                        : 'Hapus unit'
                    }
                    className={`h-9 w-9 p-0 mt-5 shrink-0 rounded-lg ${
                      unit._hasHistory
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            {unit._hasHistory && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                Unit ini memiliki riwayat jadwal/sesi aktif sehingga tidak dapat dihapus permanen (hanya dapat dinonaktifkan).
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
