import React, { useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Info,
  Lock,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button, Loader } from '@/components/ui';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { cbtApi } from '@/api/cbt.api';
import type { GuruMapel } from '@/types/academic';
import type { CbtBankSoal } from '@/types/cbt.types';
import { useAuthStore } from '@/store/authStore';
import { getMgmpSharedTeacherIds } from '../jadwal/cbtMgmpHelper';
import { formatTingkatRomawi } from './cbtAsesmenHelper';
import {
  resolveStrictBankTingkat,
  resolveStrictTingkat,
  resolveStrictJurusan,
  parseBankJurusanTokens,
  isGeneralBankJurusan,
} from './cbtDutyEngine';
import { cn } from '@/lib/utils';

export interface CbtSharedDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoal: CbtBankSoal | null;
  currentGuruId?: string;
}

export const CbtSharedDistributionModal: React.FC<CbtSharedDistributionModalProps> = ({
  isOpen,
  onClose,
  bankSoal,
  currentGuruId,
}) => {
  const { user } = useAuthStore();
  const effectiveGuruId = currentGuruId || user?.guru_profile?.id || user?.id;

  // 1. Query rekan pengampu mapel yang sama
  const { data: parallelTeachersRes, isLoading } = useQuery({
    queryKey: ['parallel-teachers-distribution', bankSoal?.mapel_id],
    queryFn: () => (bankSoal?.mapel_id ? listGuruMapel({ mapel_id: bankSoal.mapel_id }) : null),
    enabled: Boolean(isOpen && bankSoal?.mapel_id),
    staleTime: 60 * 1000,
  });

  // 1b. Query bank soal se-mapel untuk mendeteksi rekan yang sudah membuat bank soal mandiri
  const { data: mapelBanksRes } = useQuery({
    queryKey: ['mapel-banks-distribution', bankSoal?.mapel_id],
    queryFn: () => (bankSoal?.mapel_id ? cbtApi.getBankSoalList({ mapel_id: bankSoal.mapel_id, limit: 200 }) : null),
    enabled: Boolean(isOpen && bankSoal?.mapel_id),
    staleTime: 30 * 1000,
  });

  const targetTingkatNum = useMemo(() => {
    return resolveStrictBankTingkat(bankSoal);
  }, [bankSoal]);

  const targetJurusanTokens = useMemo(() => {
    const tokens = parseBankJurusanTokens(bankSoal?.jurusan);
    if (Array.isArray(bankSoal?.target_jurusan_ids)) {
      bankSoal.target_jurusan_ids.forEach((id) => {
        if (id && !tokens.includes(id.toUpperCase())) tokens.push(id.toUpperCase());
      });
    } else if (bankSoal?.jurusan_id && !tokens.includes(bankSoal.jurusan_id.toUpperCase())) {
      tokens.push(bankSoal.jurusan_id.toUpperCase());
    }
    return tokens;
  }, [bankSoal]);

  const guruOwnBankSet = useMemo(() => {
    const items: CbtBankSoal[] = mapelBanksRes?.items || (mapelBanksRes as any)?.data?.items || [];
    const set = new Set<string>();
    items.forEach((b) => {
      if (!b.guru_id || b.id === bankSoal?.id) return;
      const bTingkat = resolveStrictBankTingkat(b);
      if (targetTingkatNum && bTingkat && bTingkat !== targetTingkatNum) return;
      set.add(b.guru_id);
    });
    return set;
  }, [mapelBanksRes, bankSoal?.id, targetTingkatNum]);

  // 2. Ambil ID rekan yang secara eksplisit dicatat dalam Kontributor DB / Storage
  const explicitSharedIds = useMemo(() => {
    if (!bankSoal) return [];
    const fromKontributor = (bankSoal.Kontributor || [])
      .map((c) => c.guru_id)
      .filter(Boolean);
    if (fromKontributor.length > 0) {
      return Array.from(new Set(fromKontributor));
    }
    return getMgmpSharedTeacherIds(bankSoal, user?.tenant_id);
  }, [bankSoal, user?.tenant_id]);

  // 3. Olah daftar guru pengampu se-tingkat & se-jurusan
  const colleaguesData = useMemo(() => {
    if (!bankSoal) return { author: null, recipients: [], isAllCovered: false };

    const rawList: GuruMapel[] = parallelTeachersRes?.data || [];
    const map = new Map<
      string,
      {
        id: string;
        nama: string;
        nip?: string | null;
        tingkatNum?: number;
        kelasNames: string[];
        isAuthor: boolean;
        isExplicitRecipient: boolean;
      }
    >();

    const isBankGeneral = isGeneralBankJurusan(bankSoal.jurusan, bankSoal);

    rawList.forEach((gm) => {
      const gId = gm.guru_id;
      const gName = gm.Guru?.nama_guru;
      if (!gId || !gName) return;

      const gmTingkatNum = resolveStrictTingkat(gm);
      if (!gmTingkatNum) return;

      // Filter tingkat: harus sama dengan tingkat bank soal jika spesifik
      if (targetTingkatNum && gmTingkatNum !== targetTingkatNum) {
        return;
      }

      // Filter jurusan berbasis ID/kode relasi mutlak (tanpa regex nama kelas)
      const kName = gm.Kelas?.nama_kelas || '';
      const { jurusanId, jurusanKode } = resolveStrictJurusan(gm);
      const isMatchJurusan = isBankGeneral
        ? true
        : targetJurusanTokens.some(
            (tok) =>
              (jurusanId && tok === jurusanId.toUpperCase()) ||
              (jurusanKode !== 'UMUM' && tok === jurusanKode)
          );

      if (!isBankGeneral && targetJurusanTokens.length > 0 && !isMatchJurusan) {
        return;
      }

      const isAuthor = gId === bankSoal.guru_id;
      const isExplicitRecipient = explicitSharedIds.length > 0 ? explicitSharedIds.includes(gId) : true;
      const hasOwnBank = guruOwnBankSet.has(gId);

      if (!map.has(gId)) {
        map.set(gId, {
          id: gId,
          nama: gName,
          nip: gm.Guru?.nip,
          tingkatNum: gmTingkatNum,
          kelasNames: [],
          matchedJurusanKelas: [],
          isAuthor,
          isExplicitRecipient,
          hasOwnBank,
        } as any);
      }

      const entry = map.get(gId)!;
      if (kName && !entry.kelasNames.includes(kName)) {
        entry.kelasNames.push(kName);
        if (isMatchJurusan) {
          entry.matchedJurusanKelas.push(kName);
        }
      }
    });

    const allTeachers = Array.from(map.values());
    const author =
      allTeachers.find((t) => t.isAuthor) || {
        id: bankSoal.guru_id,
        nama: bankSoal.Guru?.nama_guru || 'Penyusun Utama',
        nip: bankSoal.Guru?.nip,
        kelasNames: [],
        isAuthor: true,
        isExplicitRecipient: false,
      };

    // Penerima adalah guru paralel yang mengajar di jurusan sasaran paket naskah ini
    let recipients = allTeachers.filter((t) => !t.isAuthor && t.isExplicitRecipient);

    return {
      author,
      recipients,
      isAllCovered: recipients.length > 0 && recipients.length === allTeachers.filter((t) => !t.isAuthor).length,
    };
  }, [bankSoal, parallelTeachersRes?.data, targetTingkatNum, targetJurusanTokens, explicitSharedIds, guruOwnBankSet]);

  if (!bankSoal) return null;

  const mapelTitle = bankSoal.display_mapel || bankSoal.Mapel?.nama_mapel || 'Mata Pelajaran';
  const tingkatDisplay = formatTingkatRomawi(targetTingkatNum || bankSoal.tingkat);
  const isAuthorSelf = Boolean(effectiveGuruId && bankSoal.guru_id === effectiveGuruId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center justify-between gap-3 w-full pr-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                Distribusi Rekan MGMP
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Rekan guru paralel yang otomatis terhubung &amp; bebas tugas
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            <Lock size={10} />
            <span>Read-Only</span>
          </span>
        </div>
      }
    >
      <div className="space-y-3.5 p-4 text-xs">
        {/* ── 1. Ringkasan Naskah Bank Soal (Kompak & Elegan) ── */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                {bankSoal.judul}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                {bankSoal.jumlah_soal || bankSoal._count?.Soal || 0} Butir Soal Siap
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span>Sasaran: <strong className="text-slate-700 dark:text-slate-200">{targetJurusanTokens.length > 0 ? targetJurusanTokens.join(', ') : 'Semua Jurusan'}</strong></span>
              <span>•</span>
              <span>Penyusun Utama: <strong className="text-indigo-600 dark:text-indigo-400">{colleaguesData.author?.nama || bankSoal.Guru?.nama_guru || 'Penyusun Utama'}{isAuthorSelf && ' (Anda)'}</strong></span>
            </div>
          </div>
        </div>

        {/* ── 2. Daftar Rekan Guru Paralel Penerima ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>Daftar Rekan Pengampu Ter-Cover ({colleaguesData.recipients.length} Rekan)</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader size="sm" />
              <span className="text-xs">Memuat daftar rekan guru pengampu...</span>
            </div>
          ) : colleaguesData.recipients.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1 bg-white dark:bg-slate-900">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Hanya Anda satu-satunya guru pengampu untuk mapel dan tingkat ini.
              </p>
              <p className="text-[11px] text-slate-500">
                Naskah bank soal Anda mencakup seluruh kelas binaan secara mandiri tanpa ada rekan paralel lain.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 max-h-72 overflow-y-auto shadow-2xs">
              {colleaguesData.recipients.map((teacher) => (
                <div
                  key={teacher.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {teacher.nama}
                      </span>
                      {teacher.nip && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          NIP: {teacher.nip}
                        </span>
                      )}
                    </div>

                    {/* Rombel ajar rekan */}
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      <span className="text-[10px] text-slate-500">Kelas Ajar:</span>
                      {((teacher as any).matchedJurusanKelas?.length > 0
                        ? (teacher as any).matchedJurusanKelas
                        : teacher.kelasNames
                      ).length > 0 ? (
                        ((teacher as any).matchedJurusanKelas?.length > 0
                          ? (teacher as any).matchedJurusanKelas
                          : teacher.kelasNames
                        ).map((k: string, kIdx: number) => (
                          <span
                            key={kIdx}
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
                          >
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Semua Rombel Tingkat {tingkatDisplay}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {(teacher as any).hasOwnBank ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                        <BookOpen size={12} className="text-indigo-600 shrink-0" />
                        <span>Mandiri (Buat Sendiri)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                        <span>Bebas Tugas (MGMP)</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Action Footer ── */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-4 rounded-lg font-bold cursor-pointer"
          >
            Tutup Pratinjau
          </Button>
        </div>
      </div>
    </Modal>
  );
};
