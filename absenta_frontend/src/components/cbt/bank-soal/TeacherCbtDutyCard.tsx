import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Plus,
  Eye,
  FileEdit,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { resolveBankTingkatNumber } from '../jadwal/cbtJadwalHelper';
import { formatTingkatRomawi, isAssignmentMatchingJurusan, resolveCbtEventShortPill, formatDisplayJudulBankSoal } from './cbtAsesmenHelper';
import { useTeacherCbtDutyStatus, type TeacherDutyItem } from './useTeacherCbtDutyStatus';
import type { CbtBankSoal } from '@/types/cbt.types';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { CbtSharedDistributionModal } from './CbtSharedDistributionModal';

interface TeacherCbtDutyCardProps {
  guruId?: string;
  overrideEvent?: any;
  variant?: 'detailed' | 'compact';
  onNavigateToCbt?: () => void;
  onCreateBankSoal?: (mapelId: string, tingkatRoman: string, jurusan?: string) => void;
  onPreviewBankSoal?: (bankSoal: CbtBankSoal) => void;
  className?: string;
}

export const TeacherCbtDutyCard: React.FC<TeacherCbtDutyCardProps> = ({
  guruId,
  overrideEvent,
  variant = 'detailed',
  onNavigateToCbt,
  onCreateBankSoal,
  onPreviewBankSoal,
  className,
}) => {
  const { user } = useAuthStore();

  const {
    isLoading,
    activeEventName,
    hasActiveEvent,
    teacherName,
    totalDuties,
    coveredDuties,
    draftDuties,
    uncreatedDuties,
    pendingDuties,
    completionPercentage,
    isFullyExempt,
    hasNoDuties,
    items,
    pendingJurusanSummary,
  } = useTeacherCbtDutyStatus(guruId, overrideEvent);

  // Ambil nama lengkap guru yang login/ditugaskan
  const isCurrentUser = Boolean(!guruId || guruId === user?.guru_profile?.id || guruId === user?.id);
  const teacherFullName =
    (isCurrentUser && (user?.full_name || (user as any)?.nama_guru)) ||
    teacherName ||
    user?.full_name ||
    (user as any)?.nama_guru ||
    (user as any)?.nama_lengkap ||
    user?.name ||
    (user as any)?.username ||
    'Bapak/Ibu Guru';

  const teacherShortName = teacherFullName.includes(',')
    ? teacherFullName.split(',')[0].trim()
    : teacherFullName.trim();

  // Default tertutup (compact self-reminder banner) agar tidak menutupi daftar naskah bank soal utama.
  // Guru dapat membuka rincian kelas kapan saja dengan tombol 'Lihat Rincian'.
  const [isExpanded, setIsExpanded] = useState(false);
  const [distributionBank, setDistributionBank] = useState<CbtBankSoal | null>(null);

  const effectiveGuruId = guruId || user?.guru_profile?.id || user?.id;

  // Query seluruh data penugasan guru paralel untuk memetakan nama penerima MGMP secara instan (tanpa modal)
  const { data: parallelTeachersRes } = useQuery({
    queryKey: ['parallel-teachers-duty-card'],
    queryFn: () => listGuruMapel(),
    staleTime: 60 * 1000,
  });

  const allGuruMapelList = parallelTeachersRes?.data || [];

  // Helper pemeta nama guru penerima MGMP
  const resolveRecipientsForItem = (
    item: TeacherDutyItem,
    activeBank: CbtBankSoal | undefined,
    currentTeacherId?: string
  ) => {
    if (!activeBank) return [];

    const isSharedMgmp =
      Boolean(activeBank.is_shared) ||
      Boolean(activeBank.Kontributor && activeBank.Kontributor.length > 0) ||
      Boolean(activeBank.is_kolaborasi_resmi) ||
      Boolean(activeBank.kolaborasi_badge);

    if (!isSharedMgmp) return [];

    const targetTingkatNum = resolveBankTingkatNumber(activeBank) || item.tingkat;
    const targetJurusanTokens = (activeBank.jurusan || '')
      .toUpperCase()
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const explicitSharedIds = (activeBank.Kontributor || [])
      .map((c) => c.guru_id)
      .filter(Boolean);

    const map = new Map<
      string,
      {
        id: string;
        nama: string;
        isSelf: boolean;
        kelasNames: string[];
      }
    >();

    allGuruMapelList.forEach((gm) => {
      const gId = gm.guru_id;
      const gName = gm.Guru?.nama_guru;
      if (!gId || !gName) return;

      // Filter Mapel
      const isMatchMapel = gm.mapel_id === item.mapelId || gm.mapel_id === activeBank.mapel_id;
      if (!isMatchMapel) return;

      // Filter Tingkat
      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      let gmTingkatNum = Number(rawTingkat);
      if (!gmTingkatNum && gm.Kelas?.nama_kelas) {
        const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          gmTingkatNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }
      if (targetTingkatNum && gmTingkatNum && gmTingkatNum !== targetTingkatNum) {
        return;
      }

      // Filter Jurusan
      const isMatchJurusan = isAssignmentMatchingJurusan(gm, targetJurusanTokens);
      if (
        targetJurusanTokens.length > 0 &&
        !targetJurusanTokens.includes('SEMUA') &&
        !targetJurusanTokens.includes('UMUM') &&
        !isMatchJurusan
      ) {
        return;
      }

      // Jangan masukkan pembuat/penyusun utama paket (karena beliau adalah sumber, bukan penerima)
      if (gId === activeBank.guru_id) {
        return;
      }

      // Cek kontributor eksplisit jika ada
      if (explicitSharedIds.length > 0 && !explicitSharedIds.includes(gId)) {
        return;
      }

      const kName = gm.Kelas?.nama_kelas || '';
      const isSelf = Boolean(currentTeacherId && gId === currentTeacherId);

      if (!map.has(gId)) {
        map.set(gId, {
          id: gId,
          nama: gName,
          isSelf,
          kelasNames: [],
        });
      }

      const entry = map.get(gId)!;
      if (kName && !entry.kelasNames.includes(kName)) {
        entry.kelasNames.push(kName);
      }
    });

    // Fallback jika belum terpetakan di SK KBM tapi ada di relasi Kontributor DB
    if (map.size === 0 && activeBank.Kontributor && activeBank.Kontributor.length > 0) {
      activeBank.Kontributor.forEach((c) => {
        if (!c.guru_id || c.guru_id === activeBank.guru_id) return;
        const gName = c.Guru?.nama_guru || 'Rekan Guru';
        const isSelf = Boolean(currentTeacherId && c.guru_id === currentTeacherId);
        map.set(c.guru_id, {
          id: c.guru_id,
          nama: gName,
          isSelf,
          kelasNames: [],
        });
      });
    }

    return Array.from(map.values());
  };

  // Jika tidak sedang loading dan guru tidak punya penugasan mengajar di tingkat aktif
  if (isLoading || hasNoDuties || totalDuties === 0) {
    return null;
  }

  // Total seluruh rombel yang terhitung
  const totalRombelCount = items.reduce((acc, it) => acc + (it.rombelNames?.length || 0), 0);

  // ── VARIANT COMPACT (Untuk Beranda Utama Guru / StaffBerandaTab) ──
  if (variant === 'compact') {
    if (isFullyExempt) {
      return (
        <div
          className={cn(
            'p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-2xs',
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs">Bebas Tugas Bank Soal CBT</span>
                {activeEventName && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {activeEventName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                Seluruh {totalDuties} bank soal penugasan Anda telah siap pakai.
              </p>
            </div>
          </div>

          {onNavigateToCbt && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateToCbt}
              className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 font-bold shrink-0 flex items-center gap-1"
            >
              <span>Meja CBT</span>
              <ArrowRight size={11} />
            </Button>
          )}
        </div>
      );
    }

    // Masih ada tugas
    return (
      <div
        className={cn(
          'p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-2xs',
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            {uncreatedDuties > 0 ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-amber-900 dark:text-amber-100">
                {uncreatedDuties > 0
                  ? `Tugas CBT: ${uncreatedDuties} Bank Soal Belum Dibuat${draftDuties > 0 ? `, ${draftDuties} Masih Draf` : ''}`
                  : `Tugas CBT: ${draftDuties} Bank Soal Masih 0 Butir Soal`}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                {coveredDuties}/{totalDuties} Siap ({completionPercentage}%)
              </span>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 truncate">
              {pendingJurusanSummary
                ? `Perlu perhatian: ${pendingJurusanSummary}`
                : 'Buka Meja CBT untuk melengkapi pembuatan & pengisian butir soal.'}
            </p>
          </div>
        </div>

        {onNavigateToCbt && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onNavigateToCbt}
            className="text-xs h-7 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <span>Buka CBT</span>
            <ArrowRight size={11} />
          </Button>
        )}
      </div>
    );
  }

  // ── VARIANT DETAILED: MATRIKS PENUGASAN MENGAJAR HUMANIS & KOMPAK ──
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all overflow-hidden shadow-2xs',
        isFullyExempt
          ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-500/25 dark:border-emerald-800/80'
          : uncreatedDuties === 0
          ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-800/80'
          : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-white dark:from-rose-950/25 dark:via-slate-900 dark:to-slate-900 border-rose-200 dark:border-rose-900/60',
        className
      )}
    >
      {/* ── 1. Header Banner Humanis, Personal & Kompak ── */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={cn(
                'w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5',
                isFullyExempt
                  ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none'
                  : uncreatedDuties === 0
                  ? 'bg-amber-500 text-white shadow-amber-200 dark:shadow-none'
                  : 'bg-rose-500 text-white shadow-rose-200 dark:shadow-none'
              )}
            >
              {isFullyExempt ? (
                <CheckCircle2 size={16} />
              ) : uncreatedDuties === 0 ? (
                <AlertTriangle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {isFullyExempt
                    ? `Bagus sekali, ${teacherShortName}! Anda Bebas Tugas CBT 🎉`
                    : uncreatedDuties > 0
                    ? `Halo ${teacherShortName}, Ada ${uncreatedDuties} Bank Soal Belum Dibuat`
                    : `Halo ${teacherShortName}, Ada ${draftDuties} Bank Soal Masih Draf (0 Soal)`}
                </h3>

                <span
                  className={cn(
                    'text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider',
                    isFullyExempt
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  )}
                >
                  {isFullyExempt ? 'Bebas Tugas' : `${coveredDuties}/${totalDuties} Siap (${completionPercentage}%)`}
                </span>

                {activeEventName && (
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {resolveCbtEventShortPill(activeEventName)}
                  </span>
                )}
              </div>

              {isFullyExempt ? (
                <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-1 leading-relaxed">
                  Seluruh rombel binaan Anda ({items.length} mata pelajaran, {totalRombelCount} kelas) telah memiliki naskah bank soal siap pakai.
                </p>
              ) : uncreatedDuties > 0 && onCreateBankSoal ? (
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto no-scrollbar py-0.5 mt-1.5">
                  <span className="text-[10.5px] font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                    Aksi Cepat:
                  </span>
                  {items
                    .filter((it) => it.status === 'PENDING')
                    .map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => onCreateBankSoal(it.mapelId, it.tingkatRoman, it.targetJurusan)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 shadow-2xs transition-all cursor-pointer group shrink-0"
                        title={`Klik untuk buat bank soal ${it.mapelName} ${it.targetJurusan ? `Jurusan ${it.targetJurusan}` : `Tingkat ${it.tingkatRoman}`}`}
                      >
                        <Plus size={10} className="text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                        <span>
                          Buat {it.mapelName} {it.targetJurusan && it.targetJurusan !== 'UMUM' ? `(${it.targetJurusan})` : `(${it.tingkatRoman})`}
                        </span>
                      </button>
                    ))}
                </div>
              ) : uncreatedDuties === 0 && draftDuties > 0 && onPreviewBankSoal ? (
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto no-scrollbar py-0.5 mt-1.5">
                  <span className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                    Perlu Diisi:
                  </span>
                  {items
                    .filter((it) => (it.status === 'DRAFT_OWN' || it.status === 'DRAFT_MGMP') && it.bankSoal)
                    .map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => onPreviewBankSoal(it.bankSoal!)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 shadow-2xs transition-all cursor-pointer group shrink-0"
                        title={`Klik untuk kelola butir soal ${it.mapelName}`}
                      >
                        <FileEdit size={10} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>
                          Kelola Soal {it.mapelName} {it.targetJurusan && it.targetJurusan !== 'UMUM' ? `(${it.targetJurusan})` : `(${it.tingkatRoman})`}
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed truncate">
                  {pendingJurusanSummary
                    ? `Perlu perhatian: ${pendingJurusanSummary}.`
                    : 'Terdapat kelas binaan yang belum memiliki bank soal siap pakai.'}
                </p>
              )}
            </div>
          </div>

          {/* Toggle Compact Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] h-7 px-2 sm:px-2.5 rounded-lg border-slate-300 dark:border-slate-700 font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Layers size={11} className="text-slate-500" />
            <span className="hidden sm:inline">{isExpanded ? 'Sembunyikan Rincian' : `Lihat Rincian (${items.length} Mapel)`}</span>
            <span className="sm:hidden">{isExpanded ? 'Tutup' : 'Rincian'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        </div>
      </div>

      {/* ── 2. Matriks Ramping & Humanis (Hanya muncul saat dibuka) ── */}
      {isExpanded && (
        <div className="p-3 sm:p-4 pt-0 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
          {/* Desktop Table View: Ramping 4 Kolom, Bebas Redundansi */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-bold text-[10.5px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Mata Pelajaran &amp; Rombel Binaan</th>
                  <th className="py-2.5 px-3">Naskah Bank Soal Terhubung</th>
                  <th className="py-2.5 px-3">Dibagikan Kepada</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item, idx) => {
                  const isCovered = item.status === 'COVERED_OWN' || item.status === 'COVERED_MGMP';
                  const isDraft = item.status === 'DRAFT_OWN' || item.status === 'DRAFT_MGMP';
                  const activeBank = item.ownBank || item.mgmpBank;
                  const count = activeBank?.jumlah_soal || activeBank?._count?.Soal || 0;
                  const isOwn = Boolean(item.ownBank);

                  const isSharedMgmp =
                    activeBank &&
                    (Boolean(activeBank.is_shared) ||
                      Boolean(activeBank.Kontributor && activeBank.Kontributor.length > 0) ||
                      Boolean(activeBank.is_kolaborasi_resmi) ||
                      Boolean(activeBank.kolaborasi_badge));

                  const recipients = resolveRecipientsForItem(item, activeBank, effectiveGuruId);

                  return (
                    <tr
                      key={item.key}
                      className={cn(
                        'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors',
                        isCovered
                          ? 'bg-emerald-50/15 dark:bg-emerald-950/10'
                          : isDraft
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : 'bg-rose-50/20 dark:bg-rose-950/10'
                      )}
                    >
                      {/* # */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Mapel & Rombel Binaan */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {item.mapelName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Tingkat {item.tingkatRoman}
                          </span>
                          {item.targetJurusan && item.targetJurusan !== 'UMUM' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                              Jurusan {item.targetJurusan}
                            </span>
                          ) : null}
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          {/* Rombel chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.rombelNames && item.rombelNames.length > 0 ? (
                              item.rombelNames.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700"
                                >
                                  {r}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">
                                Semua Rombel Tingkat {item.tingkatRoman}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Naskah Bank Soal Terhubung */}
                      <td className="py-2.5 px-3">
                        {activeBank ? (
                          <div className="space-y-1">
                            <div
                              className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[280px]"
                              title={activeBank.judul}
                            >
                              {activeBank.judul}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                              <span
                                className={cn(
                                  'font-bold px-1.5 py-0.2 rounded border',
                                  count > 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                )}
                              >
                                {count} Soal {count > 0 ? '(Siap)' : '(Draf)'}
                              </span>

                              <span className="text-slate-500 dark:text-slate-400">
                                {isOwn ? (
                                  <strong className="text-emerald-700 dark:text-emerald-300">Mandiri (Anda)</strong>
                                ) : (
                                  <span>
                                    MGMP (Oleh:{' '}
                                    <strong className="text-indigo-700 dark:text-indigo-300">
                                      {item.masterAuthorName || activeBank.Guru?.nama_guru || 'Rekan'}
                                    </strong>
                                    )
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            Belum ada naskah bank soal
                          </span>
                        )}
                      </td>

                      {/* Dibagikan Kepada (Rekan Penerima Langsung) */}
                      <td className="py-2.5 px-3">
                        {recipients.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {recipients.map((r) => (
                                <span
                                  key={r.id}
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                                    r.isSelf
                                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  )}
                                  title={
                                    r.kelasNames && r.kelasNames.length > 0
                                      ? `Kelas Ajar: ${r.kelasNames.join(', ')}`
                                      : undefined
                                  }
                                >
                                  <Users size={10} className={r.isSelf ? 'text-indigo-600' : 'text-slate-400'} />
                                  <span>{r.nama}</span>
                                  {r.isSelf && (
                                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                                      (Anda)
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            <div className="text-[9.5px] text-slate-400 dark:text-slate-500">
                              {recipients.length} rekan guru terhubung otomatis
                            </div>
                          </div>
                        ) : isSharedMgmp ? (
                          <span className="text-slate-400 italic text-[10.5px]">
                            Semua Rekan Se-Jurusan
                          </span>
                        ) : activeBank ? (
                          <span className="text-slate-400 italic text-[10.5px]">
                            Mandiri (Hanya Anda)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isCovered && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                            <span>Siap Diuji</span>
                          </span>
                        )}

                        {isDraft && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                            <span>Perlu Diisi (0 Soal)</span>
                          </span>
                        )}

                        {item.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                            <AlertCircle size={11} className="text-rose-600 shrink-0" />
                            <span>Belum Dibuat</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-2.5 px-3 text-right">
                        {item.status === 'PENDING' && onCreateBankSoal && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              onCreateBankSoal(item.mapelId, item.tingkatRoman, item.targetJurusan)
                            }
                            className="text-[11px] h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-2xs ml-auto cursor-pointer"
                            title={`Buat Bank Soal untuk ${item.mapelName}`}
                          >
                            <Plus size={11} />
                            <span>Buat</span>
                          </Button>
                        )}

                        {isDraft && item.bankSoal && onPreviewBankSoal && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onPreviewBankSoal(item.bankSoal!)}
                            className="text-[11px] h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 shadow-2xs ml-auto cursor-pointer"
                            title={`Isi Butir Soal untuk ${item.mapelName}`}
                          >
                            <FileEdit size={11} />
                            <span>Kelola Soal</span>
                          </Button>
                        )}

                        {isCovered && item.bankSoal && onPreviewBankSoal && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onPreviewBankSoal(item.bankSoal!)}
                            className="text-[11px] h-7 px-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                            title="Lihat Butir Soal"
                          >
                            <Eye size={11} className="mr-1" />
                            <span>Lihat</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (Kompak, Bersih & Sesuai Hirarki Desktop) */}
          <div className="md:hidden space-y-2.5">
            {items.map((item) => {
              const isCovered = item.status === 'COVERED_OWN' || item.status === 'COVERED_MGMP';
              const isDraft = item.status === 'DRAFT_OWN' || item.status === 'DRAFT_MGMP';
              const activeBank = item.ownBank || item.mgmpBank;
              const count = activeBank?.jumlah_soal || activeBank?._count?.Soal || 0;
              const isOwn = Boolean(item.ownBank);
              const recipients = resolveRecipientsForItem(item, activeBank, effectiveGuruId);

              return (
                <div
                  key={item.key}
                  className={cn(
                    'p-3.5 rounded-xl border text-xs space-y-2.5 transition-all shadow-2xs',
                    isCovered
                      ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
                      : isDraft
                      ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                      : 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  )}
                >
                  {/* 1. Mata Pelajaran & Rombel Binaan + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                          {item.mapelName}
                        </span>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.tingkatRoman}
                        </span>
                        {item.targetJurusan && item.targetJurusan !== 'UMUM' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono">
                            {item.targetJurusan}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium">Kelas: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.rombelNames?.join(', ') || `Semua Rombel Tingkat ${item.tingkatRoman}`}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isCovered ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 size={10} />
                          <span>Siap Diuji</span>
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                          <AlertTriangle size={10} />
                          <span>Draf (0 Soal)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-800 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                          <AlertCircle size={10} />
                          <span>Belum Dibuat</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Naskah Bank Soal Terhubung */}
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/70 space-y-1">
                    {activeBank ? (
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-snug line-clamp-2" title={activeBank.judul}>
                          {formatDisplayJudulBankSoal(activeBank.judul, activeBank.kode_bank, activeBank.tingkat)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                            {count} Soal ({count > 0 ? 'Siap' : 'Draf'})
                          </span>
                          <span>•</span>
                          <span>
                            {isOwn ? 'Mandiri (Anda)' : `MGMP (Oleh: ${(item.masterAuthorName || activeBank.Guru?.nama_guru || 'Rekan').split(',')[0]})`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic text-[11px] block py-0.5">
                        Belum ada naskah bank soal
                      </span>
                    )}
                  </div>

                  {/* 3. Dibagikan Kepada (Rekan Penerima Langsung) */}
                  {recipients.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap text-[10px] px-0.5">
                      <span className="text-slate-400 shrink-0 font-medium">Dibagikan ke:</span>
                      {recipients.map((r, rIdx) => (
                        <span
                          key={r.id}
                          className={cn(
                            'font-semibold',
                            r.isSelf
                              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'text-slate-600 dark:text-slate-300'
                          )}
                        >
                          {r.nama.split(',')[0]}{r.isSelf ? ' (Anda)' : ''}{rIdx < recipients.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 4. Aksi Baris Bawah */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    {item.status === 'PENDING' && onCreateBankSoal && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          onCreateBankSoal(item.mapelId, item.tingkatRoman, item.targetJurusan)
                        }
                        className="text-[11px] h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Plus size={11} />
                        <span>+ Buat Bank Soal</span>
                      </Button>
                    )}

                    {isDraft && item.bankSoal && onPreviewBankSoal && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPreviewBankSoal(item.bankSoal!)}
                        className="text-[11px] h-7 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <FileEdit size={11} />
                        <span>Kelola Butir Soal</span>
                      </Button>
                    )}

                    {isCovered && item.bankSoal && onPreviewBankSoal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewBankSoal(item.bankSoal!)}
                        className="text-[11px] h-7 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                      >
                        <Eye size={11} />
                        <span>Lihat Naskah</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Distribusi Rekan MGMP (Read-Only & Bebas Human Error) */}
      <CbtSharedDistributionModal
        isOpen={Boolean(distributionBank)}
        onClose={() => setDistributionBank(null)}
        bankSoal={distributionBank}
        currentGuruId={guruId}
      />
    </div>
  );
};
