import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../../ui';
import {
  ShieldCheck,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface ChairmanDelegationConfig {
  enabled: boolean;
  targetPositions: string[];
  mode: 'ALL' | 'CUSTOM';
  capabilities: string[];
  notes?: string;
  updatedAt?: string;
  updatedByUserId?: string;
  updatedByName?: string;
}

interface AvailablePosition {
  code: string;
  name: string;
  isCooperativeRole: boolean;
  holders: string[];
}

interface CapabilityGroup {
  id: string;
  label: string;
  description: string;
  capabilities: Array<{ code: string; label: string }>;
}

interface DelegationApiResponse {
  delegation: ChairmanDelegationConfig;
  isChairman: boolean;
  availablePositions: AvailablePosition[];
  capabilityGroups: CapabilityGroup[];
}

export const ChairmanDelegationSetting: React.FC = () => {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [targetPositions, setTargetPositions] = useState<string[]>([]);
  const [mode, setMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showOtherPositions, setShowOtherPositions] = useState(false);

  const { data, isLoading } = useQuery<DelegationApiResponse>({
    queryKey: ['coop-chairman-delegation'],
    queryFn: async () => {
      const res = await api.get('/cooperative/settings/delegation');
      return res.data?.data;
    },
  });

  useEffect(() => {
    if (!data?.delegation) return;
    setEnabled(Boolean(data.delegation.enabled));
    setTargetPositions(data.delegation.targetPositions || []);
    setMode(data.delegation.mode === 'CUSTOM' ? 'CUSTOM' : 'ALL');
    setSelectedCaps(data.delegation.capabilities || []);
    setNotes(data.delegation.notes || '');

    // Jika ada posisi non-koperasi yang sudah terpilih, buka daftar posisi lainnya otomatis
    const hasNonCoopSelected = (data.delegation.targetPositions || []).some((code) => {
      const pos = data.availablePositions?.find((p) => p.code === code);
      return pos && !pos.isCooperativeRole;
    });
    if (hasNonCoopSelected) setShowOtherPositions(true);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/cooperative/settings/delegation', {
        enabled,
        targetPositions,
        mode,
        capabilities: selectedCaps,
        notes,
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'Konfigurasi delegasi Ketua Koperasi berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['coop-chairman-delegation'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan konfigurasi delegasi.');
    },
  });

  const isChairman = Boolean(data?.isChairman);
  const availablePositions = data?.availablePositions || [];
  const capabilityGroups = data?.capabilityGroups || [];

  const coopPositions = useMemo(
    () => availablePositions.filter((p) => p.isCooperativeRole),
    [availablePositions]
  );
  const otherPositions = useMemo(
    () => availablePositions.filter((p) => !p.isCooperativeRole),
    [availablePositions]
  );

  const togglePosition = (code: string) => {
    if (!isChairman) return;
    setTargetPositions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleCapability = (cap: string) => {
    if (!isChairman) return;
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const toggleGroupCapabilities = (group: CapabilityGroup) => {
    if (!isChairman) return;
    const codes = group.capabilities.map((c) => c.code);
    const allSelected = codes.every((c) => selectedCaps.includes(c));
    setSelectedCaps((prev) => {
      if (allSelected) {
        return prev.filter((c) => !codes.includes(c));
      }
      return Array.from(new Set([...prev, ...codes]));
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChairman) return;
    if (enabled && targetPositions.length === 0) {
      toast.error('Pilih minimal satu posisi penerima delegasi.');
      return;
    }
    if (enabled && mode === 'CUSTOM' && selectedCaps.length === 0) {
      toast.error('Pilih minimal satu hak akses pada mode Kustomisasi.');
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[260px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Memuat pengaturan delegasi...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header & Prerogative Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delegasi Wewenang Ketua Koperasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Berlaku khusus untuk koperasi di tenant ini. Posisi penerima delegasi akan otomatis
                memperoleh menu dan hak akses Ketua Koperasi tanpa perlu login menggunakan akun Ketua.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
              data?.delegation?.enabled
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {data?.delegation?.enabled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Delegasi Aktif</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Delegasi Nonaktif</span>
              </>
            )}
          </div>
        </div>

        {!isChairman && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Mode Hanya Baca (Hak Prerogatif Ketua Koperasi)</p>
              <p className="mt-0.5 opacity-90">
                Pengaturan delegasi hanya dapat diaktifkan, diubah, atau dicabut oleh akun yang
                menjabat sebagai <strong>Ketua Koperasi</strong> di tenant ini.
              </p>
            </div>
          </div>
        )}

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Aktifkan Delegasi Hak Ketua Koperasi
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Aktifkan apabila Ketua Koperasi berhalangan melakukan aksi operasional harian di sistem.
            </p>
          </div>
          <button
            type="button"
            disabled={!isChairman}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            } ${!isChairman ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {data?.delegation?.updatedAt && (
          <p className="text-[11px] text-slate-400">
            Terakhir diperbarui oleh <span className="font-semibold text-slate-600 dark:text-slate-300">{data.delegation.updatedByName || 'Ketua Koperasi'}</span> pada{' '}
            {new Date(data.delegation.updatedAt).toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Target Positions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Pilih Posisi Penerima Delegasi
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dapat didelegasikan ke Sekretaris Koperasi maupun posisi lain sesuai prerogatif Ketua.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coopPositions.map((pos) => {
            const checked = targetPositions.includes(pos.code);
            return (
              <label
                key={pos.code}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  checked
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-500/70'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                } ${!isChairman ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!isChairman}
                  onChange={() => togglePosition(pos.code)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {pos.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {pos.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {pos.holders.length > 0
                      ? `Pejabat aktif: ${pos.holders.join(', ')}`
                      : 'Belum ada pejabat aktif ditugaskan'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {otherPositions.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOtherPositions((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showOtherPositions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>
                {showOtherPositions
                  ? 'Sembunyikan posisi struktural lain'
                  : `Tampilkan posisi struktural lain di tenant (${otherPositions.length})`}
              </span>
            </button>

            {showOtherPositions && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                {otherPositions.map((pos) => {
                  const checked = targetPositions.includes(pos.code);
                  return (
                    <label
                      key={pos.code}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition cursor-pointer ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      } ${!isChairman ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isChairman}
                        onChange={() => togglePosition(pos.code)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {pos.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {pos.holders.length > 0 ? pos.holders.join(', ') : pos.code}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scope Mode & Custom Capabilities */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Cakupan Hak Ketua yang Didelegasikan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih delegasi penuh untuk seluruh wewenang Ketua, atau kustomisasi hak tertentu saja.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!isChairman}
            onClick={() => setMode('ALL')}
            className={`text-left p-4 rounded-xl border transition ${
              mode === 'ALL'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            } ${!isChairman ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Seluruh Hak Ketua Koperasi (Penuh)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mewariskan seluruh menu & wewenang Ketua Koperasi (approval pinjaman, anggota, SHU, aset, RAT, dll).
            </p>
          </button>

          <button
            type="button"
            disabled={!isChairman}
            onClick={() => setMode('CUSTOM')}
            className={`text-left p-4 rounded-xl border transition ${
              mode === 'CUSTOM'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            } ${!isChairman ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Kustomisasi Hak Akses Tertentu
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pilih secara spesifik hak Ketua mana saja yang ingin didelegasikan ({selectedCaps.length} dipilih).
            </p>
          </button>
        </div>

        {mode === 'CUSTOM' && (
          <div className="space-y-4 pt-2">
            {capabilityGroups.map((group) => {
              const groupCodes = group.capabilities.map((c) => c.code);
              const selectedCount = groupCodes.filter((c) => selectedCaps.includes(c)).length;
              const allSelected = selectedCount === groupCodes.length && groupCodes.length > 0;

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {group.label}{' '}
                        <span className="text-indigo-600 dark:text-indigo-400">
                          ({selectedCount}/{groupCodes.length})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {group.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!isChairman}
                      onClick={() => toggleGroupCapabilities(group)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 disabled:opacity-50"
                    >
                      {allSelected ? 'Kosongkan' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3.5">
                    {group.capabilities.map((cap) => {
                      const checked = selectedCaps.includes(cap.code);
                      return (
                        <label
                          key={cap.code}
                          className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            !isChairman ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isChairman}
                            onChange={() => toggleCapability(cap.code)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-700 dark:text-slate-200 font-medium">
                            {cap.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes & Save */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Catatan / Dasar Delegasi (Opsional)
          </label>
          <textarea
            rows={2}
            disabled={!isChairman}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Operasional persetujuan harian didelegasikan kepada Sekretaris Koperasi."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
          />
        </div>

        {isChairman && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Delegasi'}</span>
            </Button>
          </div>
        )}
      </div>
    </form>
  );
};
