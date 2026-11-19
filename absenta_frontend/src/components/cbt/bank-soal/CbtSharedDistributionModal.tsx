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
import type { GuruMapel } from '@/types/academic';
import type { CbtBankSoal } from '@/types/cbt.types';
import { useAuthStore } from '@/store/authStore';
import { getMgmpSharedTeacherIds } from '../jadwal/cbtMgmpHelper';
import { resolveBankTingkatNumber } from '../jadwal/cbtJadwalHelper';
import { formatTingkatRomawi } from './cbtAsesmenHelper';
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

  const targetTingkatNum = useMemo(() => {
    return resolveBankTingkatNumber(bankSoal);
  }, [bankSoal]);

  const targetJurusanTokens = useMemo(() => {
    if (!bankSoal?.jurusan) return [];
    return (bankSoal.jurusan || '')
      .toUpperCase()
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [bankSoal?.jurusan]);

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

    rawList.forEach((gm) => {
      const gId = gm.guru_id;
      const gName = gm.Guru?.nama_guru;
      if (!gId || !gName) return;

      // Ekstraksi tingkat
      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      let gmTingkatNum = Number(rawTingkat);
      if (!gmTingkatNum && gm.Kelas?.nama_kelas) {
        const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          gmTingkatNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }

      // Filter tingkat: harus sama dengan tingkat bank soal jika spesifik
      if (targetTingkatNum && gmTingkatNum && gmTingkatNum !== targetTingkatNum) {
        return;
      }

      // Filter jurusan jika bank soal spesifik untuk jurusan tertentu (mendukung multi-jurusan)
      const kName = gm.Kelas?.nama_kelas || '';
      const jName = (gm.Jurusan?.nama || '').toUpperCase();
      const isMatchJurusan =
        targetJurusanTokens.length === 0 ||
        targetJurusanTokens.includes('SEMUA') ||
        targetJurusanTokens.includes('UMUM') ||
        targetJurusanTokens.some((tok) => {
          return (
            (kName && new RegExp(`\\b${tok}\\b`, 'i').test(kName)) ||
            (jName && jName.includes(tok))
          );
        });

      if (targetJurusanTokens.length > 0 && !targetJurusanTokens.includes('SEMUA') && !targetJurusanTokens.includes('UMUM') && !isMatchJurusan) {
        return;
      }

      const isAuthor = gId === bankSoal.guru_id;
      const isExplicitRecipient = explicitSharedIds.length > 0 ? explicitSharedIds.includes(gId) : true;

      if (!map.has(gId)) {
        map.set(gId, {
          id: gId,
          nama: gName,
          nip: gm.Guru?.nip,
          tingkatNum: gmTingkatNum,
          kelasNames: [],
          isAuthor,
          isExplicitRecipient,
        });
      }

      const entry = map.get(gId)!;
      if (kName && !entry.kelasNames.includes(kName)) {
        entry.kelasNames.push(kName);
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
  }, [bankSoal, parallelTeachersRes?.data, targetTingkatNum, targetJurusanTokens, explicitSharedIds]);

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Distribusi Rekan Bank Soal MGMP
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Lock size={10} />
                <span>Read-Only (Aman)</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              Pratinjau rekan guru paralel yang terhubung dan bebas tugas dengan naskah bank soal ini.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-4 text-xs">
        {/* â”€â”€ 1. Ringkasan Naskah Bank Soal â”€â”€ */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Paket Bank Soal MGMP
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                {bankSoal.judul}
              </h4>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
              {bankSoal.jumlah_soal || bankSoal._count?.Soal || 0} Butir Soal Siap
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">Mata Pelajaran:</span>
              <strong className="text-slate-800 dark:text-slate-200">{mapelTitle}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Sasaran:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                Tingkat {tingkatDisplay} {targetJurusanUpper ? `• Jurusan ${targetJurusanUpper}` : '• Semua Jurusan'}
              </strong>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-500 block text-[10px]">Penyusun Utama:</span>
              <strong className="text-indigo-700 dark:text-indigo-300">
                {colleaguesData.author?.nama || bankSoal.Guru?.nama_guru || 'Penyusun Utama'}
                {isAuthorSelf && ' (Anda)'}
              </strong>
            </div>
          </div>
        </div>

        {/* â”€â”€ 2. Daftar Rekan Guru Paralel Penerima â”€â”€ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Daftar Rekan Guru Pengampu Paralel Ter-Cover ({colleaguesData.recipients.length} Rekan)</span>
            </div>
            <span className="text-[10.5px] font-medium text-slate-500">
              Otomatis sinkron dengan Jadwal KBM &amp; SK
            </span>
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
              {colleaguesData.recipients.map((teacher, idx) => (
                <div
                  key={teacher.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </div>

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
                        {teacher.kelasNames.length > 0 ? (
                          teacher.kelasNames.map((k, kIdx) => (
                            <span
                              key={kIdx}
                              className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                            >
                              {k}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Semua Rombel Tingkat {tingkatDisplay}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                      <span>Bebas Tugas (MGMP)</span>
                    </span>
                    <span className="text-[9.5px] text-slate-400 block mt-0.5">
                      Otomatis siap diuji
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ 3. Jaminan Bebas Human Error Banner â”€â”€ */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold">Keamanan Distribusi:</span> Halaman ini bersifat <strong>hanya lihat (read-only)</strong>.
            Anda dapat memastikan seluruh rekan sejawat telah ter-cover tanpa risiko mengubah setelan ujian, tanpa tombol simpan, dan tanpa risiko salah klik.
          </div>
        </div>

        {/* â”€â”€ 4. Action Footer â”€â”€ */}
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
