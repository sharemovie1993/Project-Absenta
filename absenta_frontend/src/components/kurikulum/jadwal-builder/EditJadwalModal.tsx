import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  User, 
  Clock, 
  GraduationCap, 
  Trash2, 
  Save, 
  AlertTriangle, 
  Layers, 
  Sparkles
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Badge } from '../../ui/Badge';
import { type JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { type UnitPengajaran } from '../../../types/academic';

export interface EditJadwalPayload {
  id: string;
  guru_id: string;
  mapel_id: string;
  unit_pengajaran_id?: string | null;
  applyToAllSpans: boolean;
  spanIds: string[];
}

interface EditJadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: JadwalKBM | null;
  relatedJadwals?: JadwalKBM[];
  day: string;
  slotIndex: number;
  kelasName: string;
  kelasId: string;
  slotTime: { start: string; end: string };
  guruList: Array<{ id: string; nama_guru: string; nip?: string }>;
  mapelList: Array<{ id: string; nama_mapel: string; kode_mapel?: string }>;
  allUnitsList?: UnitPengajaran[];
  onSave: (payload: EditJadwalPayload) => Promise<void>;
  onDelete?: (id: string, spanIds?: string[]) => Promise<void>;
  isSaving?: boolean;
  activePaint?: {
    guruId?: string;
    guruName?: string;
    mapelId?: string;
    mapelName?: string;
  };
}

export const EditJadwalModal: React.FC<EditJadwalModalProps> = ({
  isOpen,
  onClose,
  jadwal,
  relatedJadwals = [],
  day,
  slotIndex,
  kelasName,
  kelasId,
  slotTime,
  guruList,
  mapelList,
  allUnitsList = [],
  onSave,
  onDelete,
  isSaving = false,
  activePaint,
}) => {
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [applyToAllSpans, setApplyToAllSpans] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteApplyToAll, setDeleteApplyToAll] = useState<boolean>(true);

  // Reset form when modal opens with new jadwal
  useEffect(() => {
    if (jadwal) {
      setSelectedGuruId(jadwal.guru_id || '');
      setSelectedMapelId(jadwal.mapel_id || '');
      setSelectedUnitId(jadwal.unit_pengajaran_id || '');
      setApplyToAllSpans(relatedJadwals.length > 1);
      setShowDeleteConfirm(false);
      setDeleteApplyToAll(relatedJadwals.length > 1);
    }
  }, [jadwal, relatedJadwals.length]);

  // Format span slots
  const spanSlots = useMemo(() => {
    if (!relatedJadwals || relatedJadwals.length <= 1) return [];
    return (relatedJadwals || [])
      ?.map((j) => j.slot_index ?? 0)
      .sort((a, b) => a - b);
  }, [relatedJadwals]);

  const spanIds = useMemo(() => {
    return (relatedJadwals && relatedJadwals.length > 0)
      ? (relatedJadwals || [])?.map((j) => j.id)
      : (jadwal ? [jadwal.id] : []);
  }, [relatedJadwals, jadwal]);

  // Unit pengajaran options based on selected mapel & kelas
  const matchingUnits = useMemo(() => {
    if (!selectedMapelId) return [];
    return (allUnitsList || []).filter((u) => {
      if (u.mapel_id !== selectedMapelId) return false;
      if (kelasId && u.GuruMapel?.kelas_id && u.GuruMapel.kelas_id !== kelasId) return false;
      if (selectedGuruId && u.guru_id && u.guru_id !== selectedGuruId) return false;
      return true;
    });
  }, [allUnitsList, selectedMapelId, kelasId, selectedGuruId]);

  const unitOptions = useMemo(() => {
    const list = [{ value: '', label: 'Tanpa Unit Pengajaran (Umum)' }];
    matchingUnits.forEach((u) => {
      list.push({
        value: u.id,
        label: `${u.nama_unit || 'Unit'} (${u.Guru?.nama_guru || 'Guru'})`,
      });
    });
    return list;
  }, [matchingUnits]);

  // Options for Mapel & Guru
  const mapelOptions = useMemo(() => {
    return (mapelList || [])?.map((m) => ({
      value: m.id,
      label: `${m.nama_mapel}${m.kode_mapel ? ` (${m.kode_mapel})` : ''}`,
    }));
  }, [mapelList]);

  const guruOptions = useMemo(() => {
    return (guruList || [])?.map((g) => ({
      value: g.id,
      label: `${g.nama_guru}${g.nip ? ` • NIP. ${g.nip}` : ''}`,
    }));
  }, [guruList]);

  // Is form dirty (changed)
  const isDirty = useMemo(() => {
    if (!jadwal) return false;
    const initialGuru = jadwal.guru_id || '';
    const initialMapel = jadwal.mapel_id || '';
    const initialUnit = jadwal.unit_pengajaran_id || '';
    return (
      selectedGuruId !== initialGuru ||
      selectedMapelId !== initialMapel ||
      selectedUnitId !== initialUnit
    );
  }, [jadwal, selectedGuruId, selectedMapelId, selectedUnitId]);

  const canSave = Boolean(selectedGuruId && selectedMapelId && isDirty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jadwal || !selectedGuruId || !selectedMapelId) return;

    await onSave({
      id: jadwal.id,
      guru_id: selectedGuruId,
      mapel_id: selectedMapelId,
      unit_pengajaran_id: selectedUnitId || null,
      applyToAllSpans: relatedJadwals.length > 1 && applyToAllSpans,
      spanIds,
    });
  };

  const handleApplyQuickPaint = () => {
    if (activePaint?.guruId) setSelectedGuruId(activePaint.guruId);
    if (activePaint?.mapelId) setSelectedMapelId(activePaint.mapelId);
  };

  const handleDelete = async () => {
    if (!jadwal || !onDelete) return;
    const targetSpanIds = deleteApplyToAll && spanIds.length > 1 ? spanIds : [jadwal.id];
    await onDelete(jadwal.id, targetSpanIds);
  };

  if (!isOpen || !jadwal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Jadwal Pelajaran"
      size="md"
      zIndex={160}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 pt-2">
        {/* Banner Info Slot Waktu & Kelas */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="indigo" className="font-extrabold uppercase px-2 py-0.5 text-xs">
                {day}
              </Badge>
              <Badge variant="outline" className="font-bold text-xs">
                Jam ke-{slotIndex}
              </Badge>
              {slotTime?.start && slotTime?.end && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {slotTime.start} - {slotTime.end}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Kelas:</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {kelasName || jadwal.Kelas?.nama_kelas || `Kelas ${kelasId}`}
              </span>
            </div>
          </div>

          {/* Sesi Multi-JP Info jika lebih dari 1 JP */}
          {relatedJadwals.length > 1 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                <Layers className="w-3.5 h-3.5" />
                <span>Terhubung dalam satu blok {relatedJadwals.length} JP:</span>
              </div>
              <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px]">
                Jam ke-{spanSlots.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Quick Paint Auto-Fill Pill jika ada kuas cat aktif yang berbeda */}
        {activePaint?.guruId && activePaint?.mapelId && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 dark:text-slate-400">Kuas Aktif: </span>
                <span className="font-black text-amber-900 dark:text-amber-200">{activePaint.mapelName}</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{activePaint.guruName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyQuickPaint}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs shrink-0 transition-all cursor-pointer"
            >
              Terapkan Kuas
            </button>
          </div>
        )}

        {/* Field 1: Mata Pelajaran */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              Mata Pelajaran <span className="text-rose-500">*</span>
            </span>
            {jadwal.Mapel?.nama_mapel && (
              <span className="text-[11px] font-medium text-slate-400">
                Saat ini: <strong className="text-slate-600 dark:text-slate-300">{jadwal.Mapel.nama_mapel}</strong>
              </span>
            )}
          </label>
          <SearchableSelect
            options={mapelOptions}
            value={selectedMapelId}
            onChange={(val) => setSelectedMapelId(val)}
            placeholder="-- Pilih Mata Pelajaran --"
          />
        </div>

        {/* Field 2: Guru Pengampu */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Guru Pengampu <span className="text-rose-500">*</span>
            </span>
            {(jadwal.Guru?.nama_guru || jadwal.Guru?.User?.full_name) && (
              <span className="text-[11px] font-medium text-slate-400">
                Saat ini: <strong className="text-slate-600 dark:text-slate-300">{jadwal.Guru?.nama_guru || jadwal.Guru?.User?.full_name}</strong>
              </span>
            )}
          </label>
          <SearchableSelect
            options={guruOptions}
            value={selectedGuruId}
            onChange={(val) => setSelectedGuruId(val)}
            placeholder="-- Pilih Guru Pengampu --"
          />
        </div>

        {/* Field 3: Unit Pengajaran (Opsional) jika tersedia */}
        {unitOptions.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              Unit Pengajaran / Materi Spesifik (Opsional)
            </label>
            <SearchableSelect
              options={unitOptions}
              value={selectedUnitId}
              onChange={(val) => setSelectedUnitId(val)}
              placeholder="-- Pilih Unit Pengajaran (Opsional) --"
            />
          </div>
        )}

        {/* Checkbox Terapkan ke Seluruh Blok jika Terhubung Multi-JP */}
        {relatedJadwals.length > 1 && (
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllSpans}
                onChange={(e) => setApplyToAllSpans(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Terapkan ke seluruh {relatedJadwals.length} JP sekaligus (Jam ke-{spanSlots.join(', ')})
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Jika dicentang, nama guru dan mata pelajaran akan diperbarui pada seluruh slot jam di blok sesi KBM ini.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Konfirmasi Hapus Inline */}
        {showDeleteConfirm && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>Konfirmasi Pengosongan Jadwal</span>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus/mengosongkan jadwal KBM ini dari jadwal pelajaran?
            </p>
            {spanIds.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={deleteApplyToAll}
                  onChange={(e) => setDeleteApplyToAll(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Hapus seluruh {spanIds.length} JP di blok ini (Jam ke-{spanSlots.join(', ')})</span>
              </label>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isSaving ? 'Menghapus...' : 'Ya, Hapus Jadwal'}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            {!showDeleteConfirm && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Jadwal</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!canSave || isSaving}
              className="text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
