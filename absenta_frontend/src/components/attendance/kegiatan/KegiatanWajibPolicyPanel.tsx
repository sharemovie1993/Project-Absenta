import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  Users,
  BookOpen,
  Camera,
  Radio,
  Sparkles,
  CheckCircle2,
  Link2,
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

const SCOPE_META: Record<KegiatanPolicyScope, { title: string; description: string; emptyHint: string }> = {
  ALL: {
    title: 'Aturan Wajib Tap Terminal & Posisi Pendamping Kegiatan',
    description:
      'Atur per kegiatan (Tier 1: Wajib Tap Terminal vs Selfie Mandiri di Universal KBM, lalu Tier 2: pilih unsur Guru KBM Beririsan & posisi jabatan dari Struktur Organisasi). Tersimpan relasional dan otomatis sinkron dengan masing-masing dashboard kegiatan.',
    emptyHint: 'Belum ada Jadwal Kegiatan aktif. Tambahkan jadwal kegiatan terlebih dahulu di menu Jadwal Kegiatan Kesiswaan.',
  },
  KETARUNAAN: {
    title: 'Aturan Presensi Guru — Program Ketarunaan & Apel',
    description:
      'Kelola kewajiban kehadiran guru untuk seluruh jadwal siklus Ketarunaan (Ketarunaan, Upacara, Apel Pagi/Sore). Pilih mode Wajib Tap Terminal atau Selfie Mandiri di Universal KBM beserta posisi jabatan yang diwajibkan.',
    emptyHint: 'Belum ada jadwal kegiatan Ketarunaan / Upacara / Apel yang aktif. Tambahkan jadwal di menu Jadwal Kegiatan Kesiswaan.',
  },
  DHUHA: {
    title: 'Aturan Presensi Guru — Pembiasaan Dhuha & Rohis',
    description:
      'Kelola kewajiban kehadiran guru & pendamping khusus jadwal Pembiasaan Dhuha / Rohis. Pengaturan tersimpan relasional dan sinkron langsung dengan Jadwal Kegiatan & Aturan Absensi.',
    emptyHint: 'Belum ada jadwal Pembiasaan Dhuha yang aktif. Tambahkan jadwal Dhuha di menu Jadwal Kegiatan Kesiswaan.',
  },
  ESKUL: {
    title: 'Aturan Presensi Guru — Ekstrakurikuler',
    description:
      'Kelola kewajiban kehadiran pembina & guru pendamping pada seluruh jadwal Ekstrakurikuler sekolah. Tersimpan relasional dan otomatis sinkron ke seluruh modul.',
    emptyHint: 'Belum ada jadwal Ekstrakurikuler aktif. Tambahkan jadwal eskul di menu Jadwal Kegiatan Kesiswaan.',
  },
  PEMBIASAAN: {
    title: 'Aturan Presensi Guru — Kegiatan Pembiasaan',
    description:
      'Kelola kewajiban kehadiran guru untuk seluruh kegiatan pembiasaan rutin sekolah (Tier 1: Wajib Tap Terminal vs Selfie Mandiri, Tier 2: Posisi Jabatan & Guru Beririsan).',
    emptyHint: 'Belum ada jadwal Pembiasaan aktif.',
  },
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

export const KegiatanWajibPolicyPanel: React.FC<KegiatanWajibPolicyPanelProps> = React.memo(({
  scope = 'ALL',
  title,
  description,
  readOnly = false,
  compact = false,
  className,
}) => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LocalDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: summaryRes, isLoading, refetch } = useQuery({
    queryKey: ['jadwal-kegiatan-policy-summary'],
    queryFn: getJadwalKegiatanPolicySummary,
    staleTime: 30_000,
  });

  const availablePositions: AvailableKegiatanPosition[] = useMemo(
    () => summaryRes?.data?.available_positions || [],
    [summaryRes]
  );
  const allPolicies: JadwalKegiatanPolicyItem[] = useMemo(
    () => summaryRes?.data?.policies || [],
    [summaryRes]
  );
  const policies: JadwalKegiatanPolicyItem[] = useMemo(
    () => allPolicies.filter((p) => matchesPolicyScope(p, scope)),
    [allPolicies, scope]
  );
  const scopeMeta = SCOPE_META[scope] || SCOPE_META.ALL;

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
      toast.success(res?.message || `Aturan presensi "${variables.policy.nama}" berhasil disimpan`);
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
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan aturan presensi kegiatan';
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
      <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <Loader size="md" />
        <span>Memuat aturan presensi kegiatan...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Banner */}
      <div
        className={cn(
          'rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 flex items-start justify-between gap-3 flex-wrap',
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {title || scopeMeta.title}
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Link2 size={10} />
                Sinkron 2 Arah • Relasional
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {description || scopeMeta.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          title="Muat ulang aturan kegiatan"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-indigo-600 cursor-pointer shrink-0"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          {scopeMeta.emptyHint}
        </div>
      ) : (
        <div className="space-y-3">
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
                    ? 'border-slate-200/80 dark:border-slate-800 opacity-85'
                    : dirty
                    ? 'border-indigo-400 dark:border-indigo-600 shadow-sm shadow-indigo-500/10'
                    : 'border-slate-200/90 dark:border-slate-800 shadow-2xs'
                )}
              >
                {/* ── TIER 1 HEADER ROW ── */}
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => !policy.is_apel_pulang && setExpandedId(isExpanded ? null : policy.id)}
                    className={cn(
                      'flex items-start gap-3 text-left min-w-0 flex-1',
                      policy.is_apel_pulang ? 'cursor-default' : 'cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        policy.is_apel_pulang
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : draft.wajib_tap_terminal_guru
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                      )}
                    >
                      {draft.wajib_tap_terminal_guru ? <Radio size={17} /> : <Camera size={17} />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {policy.nama}
                        </span>
                        {policy.is_apel_pulang ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Apel Pulang • Tidak Mewajibkan Guru
                          </span>
                        ) : (
                          <>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                draft.wajib_tap_terminal_guru
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                              )}
                            >
                              {draft.wajib_tap_terminal_guru ? 'WAJIB TAP TERMINAL' : 'SELFIE MANDIRI KBM'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {totalSelected} unsur aktif
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold">
                          <Clock size={11} />
                          {policy.waktu_mulai}{policy.waktu_selesai ? `–${policy.waktu_selesai}` : ''} WIB
                        </span>
                        <span>•</span>
                        <span>
                          {(policy.hari || []).map((h) => getDayShortLabel(h)).join(', ') || 'Jadwal aktif'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Tier 1 Switch + Expand Chevron */}
                  {!policy.is_apel_pulang && (
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          Wajib Tap Terminal
                        </span>
                        <Switch
                          disabled={readOnly || isSavingThis}
                          checked={draft.wajib_tap_terminal_guru}
                          onCheckedChange={(checked) => {
                            if (readOnly) return;
                            updateDraft(policy, (curr) => ({ ...curr, wajib_tap_terminal_guru: checked }));
                            if (checked) {
                              setExpandedId(policy.id);
                            }
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title={isExpanded ? 'Tutup detail posisi (Tier 2)' : 'Atur posisi yang diwajibkan (Tier 2)'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── TIER 2 BODY: PILIH UNSUR & POSISI JABATAN ── */}
                {!policy.is_apel_pulang && isExpanded && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <Sparkles size={12} />
                          <span>
                            Tier 2 — {draft.wajib_tap_terminal_guru ? 'Siapa yang Wajib Tap di Terminal?' : 'Siapa yang Mendapat Kartu Selfie Kegiatan?'}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {draft.wajib_tap_terminal_guru
                            ? `Aktifkan unsur guru & posisi jabatan organisasi yang diwajibkan tap di Terminal Unified untuk kegiatan ${policy.nama}.`
                            : `Mode Wajib Tap Terminal nonaktif. Unsur yang diaktifkan di bawah akan menerima kartu Selfie Mandiri ${policy.nama} di Universal KBM.`}
                        </p>
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                          >
                            Standar Pendamping
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
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            Pilih Semua
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
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-rose-50 dark:bg-slate-900 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            Kosongkan
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unsur 1: Guru KBM Beririsan */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <BookOpen size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Guru KBM Beririsan
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Guru yang jadwal mengajarnya beririsan jam dengan {policy.nama} (mendapat pengampunan telat KBM pertama)
                          </p>
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

                    {/* Unsur 2: Grid Toggle Posisi Jabatan Organisasi (Dynamic Relational FK) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Users size={12} className="text-indigo-500" />
                          Posisi Jabatan Struktur Organisasi ({draft.wajib_position_ids.length}/{availablePositions.length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Relasi langsung ke OrganizationalPosition
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availablePositions.map((pos) => {
                          const isChecked = draft.wajib_position_ids.includes(pos.id);
                          return (
                            <div
                              key={pos.id}
                              className={cn(
                                'px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors',
                                isChecked
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                              )}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {pos.name}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 truncate">
                                  {pos.code}
                                </p>
                              </div>
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
                    </div>

                    {/* Footer Save Bar per Kegiatan */}
                    {!readOnly && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className={dirty ? 'text-amber-500' : 'text-emerald-500'} />
                          {dirty
                            ? 'Ada perubahan belum disimpan'
                            : `Tersimpan (${totalSelected}/${totalAvailable} unsur aktif)`}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!dirty || isSavingThis}
                          onClick={() => saveMutation.mutate({ policy, draft })}
                          className={cn(
                            'h-8 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border-none transition-all',
                            dirty
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer active:scale-95'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          )}
                        >
                          {isSavingThis ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                          <span>Simpan Aturan {policy.nama}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

KegiatanWajibPolicyPanel.displayName = 'KegiatanWajibPolicyPanel';
export default KegiatanWajibPolicyPanel;
