import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  BookOpen,
  Camera,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Switch, Loader } from '@/components/ui';
import {
  getJadwalKegiatanPolicySummary,
  updateJadwalKegiatanPolicy,
  type JadwalKegiatanPolicyItem,
  type AvailableKegiatanPosition,
} from '@/api/attendance/jadwalKegiatan.api';
import { getDayShortLabel } from '@/constants/day.constants';
import { cn } from '@/lib/utils';

export type KegiatanPolicyScope = 'ALL' | 'KETARUNAAN' | 'DHUHA' | 'ESKUL' | 'PEMBIASAAN';

export interface KegiatanWajibPolicyPanelProps {
  scope?: KegiatanPolicyScope;
  title?: string;
  description?: string;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
}

interface LocalDraft {
  wajib_tap_terminal_guru: boolean;
  wajib_guru_beririsan: boolean;
  wajib_position_ids: string[];
}

const STANDARD_PENDAMPING_CODES = new Set([
  'KETUA_PEMBINA_TARUNA',
  'PEMBINA_TARUNA',
  'KESISWAAN',
  'KAPROG',
  'BPBK',
  'WALIKELAS',
]);

const DHUHA_PENDAMPING_CODES = new Set([
  ...STANDARD_PENDAMPING_CODES,
  'KOORDINATOR_DHUHA',
  'PEMBINA_ROHIS',
]);

/** Urutan hierarki jabatan struktural sekolah dari tertinggi sampai terendah */
const POSITION_HIERARCHY_RANK: Record<string, number> = {
  KEPALA_SEKOLAH: 1,
  KURIKULUM: 10,
  KESISWAAN: 11,
  HUBIN: 12,
  SARPRAS: 13,
  TU_KEPALA: 20,
  TU: 21,
  KAPROG: 22,
  KABENG: 23,
  BPBK: 24,
  BKK: 25,
  KETUA_PEMBINA_TARUNA: 30,
  KOORDINATOR_DHUHA: 31,
  PEMBINA_ROHIS: 32,
  PEMBINA_TARUNA: 33,
  PEMBINA_ESKUL: 34,
  WALIKELAS: 35,
  KETUA_KOPERASI: 40,
  PENGAWAS_KOPERASI: 41,
  SEKRETARIS_KOPERASI: 42,
  BENDAHARA_KOPERASI: 43,
  MANAJER_TOKO_KOPERASI: 44,
  TU_KEPEGAWAIAN: 50,
  TU_KEUANGAN: 51,
  TU_PERSURATAN: 52,
  TU_SARPRAS: 53,
  TOOLMAN: 60,
  GERBANG: 61,
};

const SCOPE_EMPTY_HINT: Record<KegiatanPolicyScope, string> = {
  ALL: 'Belum ada Jadwal Kegiatan aktif.',
  KETARUNAAN: 'Belum ada jadwal Ketarunaan / Upacara / Apel yang aktif.',
  DHUHA: 'Belum ada jadwal Pembiasaan Dhuha yang aktif.',
  ESKUL: 'Belum ada jadwal Ekstrakurikuler yang aktif.',
  PEMBIASAAN: 'Belum ada jadwal Pembiasaan yang aktif.',
};

function matchesPolicyScope(p: JadwalKegiatanPolicyItem, scope: KegiatanPolicyScope): boolean {
  if (scope === 'ALL') return true;
  const nama = String(p.nama || '').toLowerCase();
  const jenis = String(p.jenis_kegiatan || '').toUpperCase();
  const isEskul = jenis === 'ESKUL';
  const isDhuha = Boolean(p.is_dhuha) || /duha|dhuha|rohis/i.test(`${jenis} ${nama}`);

  if (scope === 'ESKUL') return isEskul;
  if (scope === 'DHUHA') return isDhuha;
  if (scope === 'PEMBIASAAN') return !isEskul;
  if (scope === 'KETARUNAAN') {
    if (isEskul || isDhuha) return false;
    return /taruna|ketarunaan|upacara|apel|pembiasaan|baris|senam/i.test(`${jenis} ${nama}`) || jenis === 'PEMBIASAAN';
  }
  return true;
}

export const KegiatanWajibPolicyPanel: React.FC<KegiatanWajibPolicyPanelProps> = React.memo(({
  scope = 'ALL',
  readOnly = false,
  compact = false,
  className,
}) => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LocalDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: summaryRes, isLoading } = useQuery({
    queryKey: ['jadwal-kegiatan-policy-summary'],
    queryFn: getJadwalKegiatanPolicySummary,
    staleTime: 30_000,
  });

  const availablePositions: AvailableKegiatanPosition[] = useMemo(() => {
    const raw = summaryRes?.data?.available_positions || [];
    return [...raw].sort((a, b) => {
      const ra = POSITION_HIERARCHY_RANK[String(a.code || '').toUpperCase()] ?? 100;
      const rb = POSITION_HIERARCHY_RANK[String(b.code || '').toUpperCase()] ?? 100;
      if (ra !== rb) return ra - rb;
      return String(a.name || '').localeCompare(String(b.name || ''), 'id');
    });
  }, [summaryRes]);
  const allPolicies: JadwalKegiatanPolicyItem[] = useMemo(
    () => summaryRes?.data?.policies || [],
    [summaryRes]
  );
  const policies: JadwalKegiatanPolicyItem[] = useMemo(
    () => allPolicies.filter((p) => matchesPolicyScope(p, scope)),
    [allPolicies, scope]
  );

  // Sinkronkan draft lokal setiap kali data server berubah
  useEffect(() => {
    if (policies.length === 0) return;
    setDrafts((prev) => {
      const next: Record<string, LocalDraft> = {};
      policies.forEach((p) => {
        next[p.id] = prev[p.id] ?? {
          wajib_tap_terminal_guru: p.wajib_tap_terminal_guru,
          wajib_guru_beririsan: p.wajib_guru_beririsan,
          wajib_position_ids: [...p.wajib_position_ids],
        };
      });
      return next;
    });
    setExpandedId((prev) => {
      if (prev && policies.some((p) => p.id === prev)) return prev;
      const firstNonApel = policies.find((p) => !p.is_apel_pulang);
      return firstNonApel?.id || policies[0]?.id || null;
    });
  }, [policies]);

  const invalidateRelated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-policy-summary'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan'] });
    queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
    queryClient.invalidateQueries({ queryKey: ['unified-kegiatan-pendamping'] });
    queryClient.invalidateQueries({ queryKey: ['ketarunaan-pendamping'] });
    queryClient.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (params: { policy: JadwalKegiatanPolicyItem; draft: LocalDraft }) => {
      setSavingId(params.policy.id);
      return updateJadwalKegiatanPolicy(params.policy.id, {
        wajib_tap_terminal_guru: params.draft.wajib_tap_terminal_guru,
        wajib_guru_beririsan: params.draft.wajib_guru_beririsan,
        wajib_position_ids: params.draft.wajib_position_ids,
        jadwal_kegiatan_ids: params.policy.jadwal_kegiatan_ids,
      });
    },
    onSuccess: (res, variables) => {
      toast.success(res?.message || `Aturan "${variables.policy.nama}" disimpan`);
      setDrafts((prev) => ({
        ...prev,
        [variables.policy.id]: {
          wajib_tap_terminal_guru: variables.draft.wajib_tap_terminal_guru,
          wajib_guru_beririsan: variables.draft.wajib_guru_beririsan,
          wajib_position_ids: [...variables.draft.wajib_position_ids],
        },
      }));
      invalidateRelated();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan aturan kegiatan';
      toast.error(msg);
    },
    onSettled: () => {
      setSavingId(null);
    },
  });

  const updateDraft = useCallback((policy: JadwalKegiatanPolicyItem, updater: (curr: LocalDraft) => LocalDraft) => {
    setDrafts((prev) => {
      const curr: LocalDraft = prev[policy.id] || {
        wajib_tap_terminal_guru: policy.wajib_tap_terminal_guru,
        wajib_guru_beririsan: policy.wajib_guru_beririsan,
        wajib_position_ids: [...policy.wajib_position_ids],
      };
      return {
        ...prev,
        [policy.id]: updater(curr),
      };
    });
  }, []);

  const isDirty = useCallback(
    (policy: JadwalKegiatanPolicyItem): boolean => {
      const d = drafts[policy.id];
      if (!d) return false;
      if (d.wajib_tap_terminal_guru !== policy.wajib_tap_terminal_guru) return true;
      if (d.wajib_guru_beririsan !== policy.wajib_guru_beririsan) return true;
      const a = [...d.wajib_position_ids].sort().join(',');
      const b = [...policy.wajib_position_ids].sort().join(',');
      return a !== b;
    },
    [drafts]
  );

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader size="sm" />
        <span>Memuat aturan kegiatan...</span>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className={cn('p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400', className)}>
        {SCOPE_EMPTY_HINT[scope] || SCOPE_EMPTY_HINT.ALL}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {compact && (
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Aturan Presensi Guru per Kegiatan
          </span>
          <span className="text-[11px] text-slate-400">
            {policies.length} agenda aktif
          </span>
        </div>
      )}

      {policies.map((policy) => {
        const draft: LocalDraft = drafts[policy.id] || {
          wajib_tap_terminal_guru: policy.wajib_tap_terminal_guru,
          wajib_guru_beririsan: policy.wajib_guru_beririsan,
          wajib_position_ids: [...policy.wajib_position_ids],
        };
        const isExpanded = expandedId === policy.id;
        const dirty = isDirty(policy);
        const isSavingThis = savingId === policy.id;
        const totalSelected = (draft.wajib_guru_beririsan ? 1 : 0) + draft.wajib_position_ids.length;
        const totalAvailable = 1 + availablePositions.length;

        return (
          <div
            key={policy.id}
            className={cn(
              'rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-900',
              policy.is_apel_pulang
                ? 'border-slate-200/70 dark:border-slate-800/70 opacity-75'
                : dirty
                ? 'border-indigo-400 dark:border-indigo-600'
                : 'border-slate-200/80 dark:border-slate-800'
            )}
          >
            {/* ── HEADER KEGIATAN (TIER 1) ── */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => !policy.is_apel_pulang && setExpandedId(isExpanded ? null : policy.id)}
                className={cn(
                  'flex items-center gap-3 text-left min-w-0 flex-1',
                  policy.is_apel_pulang ? 'cursor-default' : 'cursor-pointer'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    policy.is_apel_pulang
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : draft.wajib_tap_terminal_guru
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                  )}
                >
                  {draft.wajib_tap_terminal_guru ? <Radio size={15} /> : <Camera size={15} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {policy.nama}
                    </span>
                    {policy.is_apel_pulang ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Apel Pulang • Non-Wajib
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold',
                          draft.wajib_tap_terminal_guru
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                        )}
                      >
                        {draft.wajib_tap_terminal_guru ? 'Wajib Tap Terminal' : 'Selfie Mandiri KBM'} · {totalSelected} unsur
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <Clock size={11} />
                    <span className="font-mono">
                      {policy.waktu_mulai}{policy.waktu_selesai ? `–${policy.waktu_selesai}` : ''}
                    </span>
                    <span>·</span>
                    <span className="truncate">
                      {(policy.hari || []).map((h) => getDayShortLabel(h)).join(', ') || 'Aktif'}
                    </span>
                  </div>
                </div>
              </button>

              {!policy.is_apel_pulang && (
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Wajib Tap Terminal
                    </span>
                    <Switch
                      disabled={readOnly || isSavingThis}
                      checked={draft.wajib_tap_terminal_guru}
                      onCheckedChange={(checked) => {
                        if (readOnly) return;
                        updateDraft(policy, (curr) => ({ ...curr, wajib_tap_terminal_guru: checked }));
                        if (checked) setExpandedId(policy.id);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    aria-label={isExpanded ? 'Tutup rincian posisi' : 'Buka rincian posisi'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              )}
            </div>

            {/* ── BODY TIER 2: UNSUR & POSISI JABATAN (3 KOLOM DESKTOP) ── */}
            {!policy.is_apel_pulang && isExpanded && (
              <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                {/* Baris Toolbar Ringkas */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {draft.wajib_tap_terminal_guru
                      ? 'Unsur Wajib Tap Terminal'
                      : 'Unsur Penerima Kartu Selfie'}
                    <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                      ({totalSelected}/{totalAvailable})
                    </span>
                  </span>

                  {!readOnly && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetCodes = policy.is_dhuha ? DHUHA_PENDAMPING_CODES : STANDARD_PENDAMPING_CODES;
                          const ids = availablePositions
                            .filter((pos) => targetCodes.has(pos.code.toUpperCase()))
                            .map((pos) => pos.id);
                          updateDraft(policy, (curr) => ({
                            ...curr,
                            wajib_guru_beririsan: true,
                            wajib_position_ids: ids,
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
                      >
                        Standar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft(policy, (curr) => ({
                            ...curr,
                            wajib_guru_beririsan: true,
                            wajib_position_ids: availablePositions.map((pos) => pos.id),
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft(policy, (curr) => ({
                            ...curr,
                            wajib_guru_beririsan: false,
                            wajib_position_ids: [],
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Unsur Khusus Jadwal: Guru KBM Beririsan */}
                <div
                  className={cn(
                    'px-3 py-2 rounded-xl border flex items-center justify-between gap-3 transition-colors',
                    draft.wajib_guru_beririsan
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/90 dark:border-emerald-800/70'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen size={14} className={draft.wajib_guru_beririsan ? 'text-emerald-600 dark:text-emerald-400 shrink-0' : 'text-slate-400 shrink-0'} />
                    <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Guru KBM Beririsan
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Jam mengajar beririsan dengan {policy.nama}
                      </span>
                    </div>
                  </div>
                  <Switch
                    disabled={readOnly || isSavingThis}
                    checked={draft.wajib_guru_beririsan}
                    onCheckedChange={(checked) => {
                      if (readOnly) return;
                      updateDraft(policy, (curr) => ({ ...curr, wajib_guru_beririsan: checked }));
                    }}
                  />
                </div>

                {/* Grid 3 Kolom Desktop — Posisi Jabatan Organisasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availablePositions.map((pos) => {
                    const isChecked = draft.wajib_position_ids.includes(pos.id);
                    return (
                      <div
                        key={pos.id}
                        title={pos.code}
                        className={cn(
                          'px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-colors',
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80'
                            : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <span
                          className={cn(
                            'text-xs truncate',
                            isChecked
                              ? 'font-bold text-indigo-950 dark:text-indigo-100'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {pos.name}
                        </span>
                        <Switch
                          disabled={readOnly || isSavingThis}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (readOnly) return;
                            updateDraft(policy, (curr) => {
                              const nextIds = checked
                                ? Array.from(new Set([...curr.wajib_position_ids, pos.id]))
                                : curr.wajib_position_ids.filter((id) => id !== pos.id);
                              return { ...curr, wajib_position_ids: nextIds };
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Footer Simpan Ringkas */}
                {!readOnly && (
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className={dirty ? 'text-amber-500' : 'text-emerald-500'} />
                      {dirty ? 'Perubahan belum disimpan' : 'Tersimpan'}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!dirty || isSavingThis}
                      onClick={() => saveMutation.mutate({ policy, draft })}
                      className={cn(
                        'h-8 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border-none transition-all',
                        dirty
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer active:scale-95'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      {isSavingThis ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Simpan</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

KegiatanWajibPolicyPanel.displayName = 'KegiatanWajibPolicyPanel';
export default KegiatanWajibPolicyPanel;
