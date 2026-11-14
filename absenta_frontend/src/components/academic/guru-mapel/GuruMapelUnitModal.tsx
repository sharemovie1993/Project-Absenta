import React, { useEffect, useState } from 'react';
import { Layers, Copy, Lock, AlertTriangle, Save, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Alert } from '../../ui/Alert';
import { UnitPengajaranEditor, type EditableUnitDraft } from './UnitPengajaranEditor';
import {
  getGuruMapelUnits,
  switchGuruMapelMode,
  copyUnitsToClasses,
} from '../../../api/kurikulum/guru-mapel.api';
import { getGuruList } from '../../../api/academic/guru.api';
import type { Guru, GuruMapel, TeachingMode } from '../../../types/academic';
import toast from 'react-hot-toast';

interface GuruMapelUnitModalProps {
  guruMapel: GuruMapel | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GuruMapelUnitModal: React.FC<GuruMapelUnitModalProps> = ({
  guruMapel,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [mode, setMode] = useState<TeachingMode>('SINGLE');
  const [units, setUnits] = useState<EditableUnitDraft[]>([]);
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [strukturJp, setStrukturJp] = useState<number | null>(null);
  const [policyLocked, setPolicyLocked] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !guruMapel?.id) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setConfirmPrompt(null);
        const [unitRes, guruRes] = await Promise.all([
          getGuruMapelUnits(guruMapel.id),
          getGuruList(1, 300, ''),
        ]);
        if (!active) return;

        setGuruOptions(guruRes.data || []);
        const payload = unitRes.data;
        const gm = payload.guru_mapel;
        setMode(gm.teaching_mode || 'SINGLE');
        setStrukturJp(payload.struktur_jp_per_minggu ?? null);
        setPolicyLocked(Boolean(payload.policy?.kurikulum_lock_mid_semester_split));

        const mappedUnits: EditableUnitDraft[] = (payload.units || []).map((u) => {
          const refs = (u._count?.SesiAbsensi || 0) + (u._count?.JadwalKBM || 0) + (u._count?.CbtSoal || 0);
          return {
            id: u.id,
            nama_unit: u.nama_unit || '',
            guru_id: u.guru_id,
            jp_alokasi: u.jp_alokasi || 2,
            target_sumatif_slot: u.target_sumatif_slot || '',
            is_active: u.is_active,
            _hasHistory: refs > 0,
          };
        });

        setUnits(
          mappedUnits.length > 0
            ? mappedUnits
            : [
                {
                  nama_unit: 'Unit 1',
                  guru_id: gm.guru_id,
                  jp_alokasi: 2,
                  target_sumatif_slot: 'sumatif_1',
                  is_active: true,
                },
              ]
        );
      } catch (err: any) {
        if (!active) return;
        setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal memuat konfigurasi unit pengajaran');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isOpen, guruMapel?.id]);

  const handleToggleCollaboration = (enableCollab: boolean) => {
    setErrorMsg(null);
    setConfirmPrompt(null);
    const nextMode: TeachingMode = enableCollab ? 'COLLABORATION' : 'SINGLE';
    setMode(nextMode);

    if (enableCollab && units.length < 2 && guruMapel) {
      const first = units[0] || {
        nama_unit: 'Sub-Materi 1',
        guru_id: guruMapel.guru_id,
        jp_alokasi: 2,
        target_sumatif_slot: 'sumatif_1',
        is_active: true,
      };
      setUnits([
        { ...first, nama_unit: first.nama_unit || 'Sub-Materi 1', target_sumatif_slot: first.target_sumatif_slot || 'sumatif_1' },
        {
          nama_unit: 'Sub-Materi 2',
          guru_id: guruMapel.guru_id,
          jp_alokasi: 2,
          target_sumatif_slot: 'sumatif_2',
          is_active: true,
        },
      ]);
    }
  };

  const executeSave = async (confirmMidSemesterSplit = false) => {
    if (!guruMapel?.id) return;
    if (mode === 'COLLABORATION') {
      const invalidUnit = units.find((u) => !u.guru_id || !u.nama_unit.trim());
      if (invalidUnit) {
        setErrorMsg('Setiap Unit Pengajaran kolaborasi wajib memiliki Nama Sub-Materi dan Guru Pengampu.');
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await switchGuruMapelMode(guruMapel.id, {
        teaching_mode: mode,
        confirmMidSemesterSplit,
        units:
          mode === 'COLLABORATION'
            ? units.map((u, idx) => ({
                id: u.id,
                nama_unit: u.nama_unit.trim(),
                guru_id: u.guru_id,
                jp_alokasi: Number(u.jp_alokasi || 2),
                target_sumatif_slot: u.target_sumatif_slot || null,
                urutan: idx + 1,
                is_active: u.is_active !== false,
              }))
            : undefined,
      });

      toast.success(res.message || 'Konfigurasi Unit Pengajaran berhasil disimpan!');
      if (res.data?.warning) {
        toast(res.data.warning, { icon: '⚠️', duration: 5000 });
      }
      setConfirmPrompt(null);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.code === 'MID_SEMESTER_CONFIRM_REQUIRED') {
        setConfirmPrompt(resp.message);
        return;
      }
      setErrorMsg(resp?.message || err?.message || 'Gagal menyimpan konfigurasi unit');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToParallelClasses = async () => {
    if (!guruMapel?.id) return;
    try {
      setCopying(true);
      const res = await copyUnitsToClasses(guruMapel.id);
      toast.success(
        res.message ||
          `Disalin ke ${res.data?.copied_classes ?? 0} kelas paralel (${res.data?.skipped_with_history ?? 0} dilewati karena sudah ada riwayat).`
      );
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyalin konfigurasi ke kelas paralel');
    } finally {
      setCopying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfigurasi Unit Pengajaran & Kolaborasi"
      size="4xl"
    >
      <div className="space-y-4">
        {guruMapel && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {guruMapel.Mapel?.nama_mapel} • Guru SK: {guruMapel.Guru?.nama_guru}
              </p>
              <p className="text-[11px] text-slate-500">
                Cakupan:{' '}
                {guruMapel.Kelas?.nama_kelas
                  ? `Kelas ${guruMapel.Kelas.nama_kelas}`
                  : guruMapel.Jurusan?.nama
                    ? `Jurusan ${guruMapel.Jurusan.nama}`
                    : 'Global (Semua Kelas)'}
              </p>
            </div>
            {policyLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                <Lock className="w-3 h-3" /> Safe Lock Tengah Semester Aktif
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Memuat data unit pengajaran...</div>
        ) : (
          <>
            {errorMsg && <Alert variant="destructive">{errorMsg}</Alert>}

            {confirmPrompt && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="font-medium leading-relaxed">{confirmPrompt}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmPrompt(null)}>
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={saving}
                    onClick={() => executeSave(true)}
                  >
                    Ya, Terapkan Split Forward
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    Mode Kolaborasi / Pecah Sub-Materi
                  </p>
                  <p className="text-[11px] text-slate-500">
                    1 Mapel Induk Dapodik tetap utuh, namun jadwal & sesi dipecah ke beberapa unit pengampu.
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mode === 'COLLABORATION'}
                  onChange={(e) => handleToggleCollaboration(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {mode === 'COLLABORATION' ? 'COLLABORATION' : 'SINGLE'}
                </span>
              </label>
            </div>

            {mode === 'COLLABORATION' && (
              <UnitPengajaranEditor
                units={units}
                onChange={setUnits}
                guruOptions={guruOptions}
                strukturJpPerMinggu={strukturJp}
                defaultGuruId={guruMapel?.guru_id || ''}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                {guruMapel?.kelas_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={copying || saving}
                    onClick={handleCopyToParallelClasses}
                    className="text-xs font-bold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {copying ? 'Menyalin...' : 'Salin ke Rombel Sejenis'}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>
                  <X className="w-3.5 h-3.5 mr-1" /> Tutup
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={() => executeSave(false)} disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
