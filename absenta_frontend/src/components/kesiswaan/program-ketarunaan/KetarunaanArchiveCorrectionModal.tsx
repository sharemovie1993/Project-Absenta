import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Save,
  Lock,
  Search,
  CheckCircle2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  saveKetarunaanNilaiBulk,
  lockKetarunaanNilai,
  KetarunaanSkema,
  KetarunaanNilaiStudent,
} from '@/api/kesiswaan/programKetarunaan.api';

export interface KetarunaanArchiveCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasId: string;
  kelasNama: string;
  tahunPelajaranId: string;
  tahunPelajaranNama: string;
  semesterId: string;
  semesterNama: string;
  skema: KetarunaanSkema | null;
  students: KetarunaanNilaiStudent[];
  isClassLocked: boolean;
}

export const KetarunaanArchiveCorrectionModal: React.FC<KetarunaanArchiveCorrectionModalProps> = ({
  isOpen,
  onClose,
  kelasId,
  kelasNama,
  tahunPelajaranId,
  tahunPelajaranNama,
  semesterId,
  semesterNama,
  skema,
  students,
  isClassLocked,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState<
    Record<string, { samapta: number; pbb: number; disiplin: number; mental: number }>
  >({});
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, { samapta: number; pbb: number; disiplin: number; mental: number }> = {};
      students.forEach((s) => {
        init[s.siswa_id] = {
          samapta: s.nilai_samapta ?? 0,
          pbb: s.nilai_pbb ?? 0,
          disiplin: s.nilai_disiplin ?? 0,
          mental: s.nilai_mental ?? 0,
        };
      });
      setScores(init);
      setHasEdited(false);
      setReason('');
      setConfirmCheck(false);
      setSearchQuery('');
    }
  }, [isOpen, students]);

  const handleScoreChange = useCallback(
    (siswaId: string, aspect: 'samapta' | 'pbb' | 'disiplin' | 'mental', val: number) => {
      const sanitized = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
      setScores((prev) => ({
        ...prev,
        [siswaId]: {
          ...prev[siswaId],
          [aspect]: sanitized,
        },
      }));
      setHasEdited(true);
    },
    []
  );

  const calculateLiveFinal = useCallback(
    (sc: { samapta: number; pbb: number; disiplin: number; mental: number }) => {
      const bSamapta = skema?.bobot_samapta ?? 25;
      const bPbb = skema?.bobot_pbb ?? 20;
      const bDisiplin = skema?.bobot_disiplin ?? 30;
      const bMental = skema?.bobot_mental ?? 25;
      const raw =
        (sc.samapta * bSamapta + sc.pbb * bPbb + sc.disiplin * bDisiplin + sc.mental * bMental) /
        100;
      const final = Math.round(raw * 10) / 10;
      let grade = 'D';
      if (final >= 86) grade = 'A';
      else if (final >= 71) grade = 'B';
      else if (final >= 56) grade = 'C';
      return { final, grade };
    },
    [skema]
  );

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        (s.nama_siswa || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const isReasonValid = reason.trim().length >= 5;
  const canSubmit = isReasonValid && confirmCheck && students.length > 0;

  const saveCorrectionMutation = useMutation({
    mutationFn: async (alsoLockToRapor: boolean) => {
      if (!kelasId || !tahunPelajaranId || !semesterId) {
        throw new Error('Konteks akademik tidak lengkap.');
      }
      if (!isReasonValid) {
        throw new Error('Alasan koreksi arsip wajib diisi minimal 5 karakter.');
      }

      const items = students.map((s) => {
        const sc = scores[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
        return {
          siswa_id: s.siswa_id,
          siswa_akademik_id: s.siswa_akademik_id,
          nilai_samapta: sc.samapta,
          nilai_pbb: sc.pbb,
          nilai_disiplin: sc.disiplin,
          nilai_mental: sc.mental,
        };
      });

      await saveKetarunaanNilaiBulk({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        is_archive_correction: true,
        correction_reason: reason.trim(),
        items,
      });

      if (alsoLockToRapor) {
        await lockKetarunaanNilai({
          kelas_id: kelasId,
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId,
          is_archive_correction: true,
          correction_reason: reason.trim(),
        });
      }

      return { alsoLockToRapor };
    },
    onSuccess: ({ alsoLockToRapor }) => {
      setHasEdited(false);
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
      window.alert(
        alsoLockToRapor
          ? `Koreksi nilai arsip ${kelasNama} (TP ${tahunPelajaranNama} ${semesterNama}) berhasil disimpan, dikunci ulang ke Rapor Kokurikuler, dan dicatat di log audit!`
          : `Koreksi nilai arsip ${kelasNama} (TP ${tahunPelajaranNama} ${semesterNama}) berhasil disimpan dan dicatat di log audit!`
      );
      onClose();
    },
    onError: (err: any) => {
      window.alert(
        'Gagal menyimpan koreksi arsip: ' +
          (err?.response?.data?.message || err?.message || 'Terjadi kendala')
      );
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/70 dark:border-amber-600/70 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Dapur Khusus */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 dark:from-amber-950/70 dark:via-orange-950/50 dark:to-rose-950/40 border-b border-amber-200 dark:border-amber-800/80 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Dapur Khusus Koreksi Nilai Arsip (Pembina)
                </h2>
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 font-bold text-[10px]"
                >
                  <History className="w-3 h-3 mr-1" /> Mode Audit Arsip
                </Badge>
                {isClassLocked && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]"
                  >
                    <Lock className="w-3 h-3 mr-1" /> Sebelumnya Terkunci di Rapor
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Ruang terisolasi untuk memperbaiki nilai ketarunaan pada tahun pelajaran / semester yang sudah lewat. Setiap perubahan tercatat di Log Aktivitas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (hasEdited && !window.confirm('Tutup Dapur Koreksi Arsip? Perubahan yang belum disimpan akan dibatalkan.')) {
                return;
              }
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Konteks Terkunci + Input Berita Acara / Alasan */}
        <div className="px-5 py-3.5 bg-amber-50/70 dark:bg-amber-950/25 border-b border-amber-200/70 dark:border-amber-800/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Target Konteks Arsip:
              </span>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-amber-300 dark:border-amber-700 shadow-2xs">
                Rombel {kelasNama || '-'} • TP {tahunPelajaranNama || '-'} • Semester {semesterNama || '-'} ({students.length} Taruna)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Bobot: Samapta {skema?.bobot_samapta ?? 25}% • PBB {skema?.bobot_pbb ?? 20}% • Disiplin {skema?.bobot_disiplin ?? 30}% • Mental {skema?.bobot_mental ?? 25}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Alasan Koreksi Arsip / Berita Acara <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Susulan tes samapta taruna sakit / Koreksi salah ketik nilai PBB..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                Cari Taruna di Rombel Ini
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama / NIS..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Koreksi Nilai */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">No</th>
                <th className="py-2.5 px-4 min-w-[200px]">Nama Taruna &amp; NIS</th>
                <th className="py-2.5 px-3 text-center w-24">Samapta</th>
                <th className="py-2.5 px-3 text-center w-24">PBB</th>
                <th className="py-2.5 px-3 text-center w-24">Disiplin</th>
                <th className="py-2.5 px-3 text-center w-24">Mental</th>
                <th className="py-2.5 px-3 text-center w-20">Akhir</th>
                <th className="py-2.5 px-3 text-center w-20">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    Tidak ada data taruna untuk dikoreksi.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const current = scores[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
                  const live = calculateLiveFinal(current);
                  const isRowChanged =
                    current.samapta !== (s.nilai_samapta ?? 0) ||
                    current.pbb !== (s.nilai_pbb ?? 0) ||
                    current.disiplin !== (s.nilai_disiplin ?? 0) ||
                    current.mental !== (s.nilai_mental ?? 0);

                  return (
                    <tr
                      key={s.siswa_id}
                      className={
                        isRowChanged
                          ? 'bg-amber-50/60 dark:bg-amber-950/30 transition-colors'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors'
                      }
                    >
                      <td className="py-2 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{s.nama_siswa}</span>
                          {isRowChanged && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                              Diubah
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">NIS: {s.nis}</div>
                      </td>
                      {(['samapta', 'pbb', 'disiplin', 'mental'] as const).map((aspect) => (
                        <td key={aspect} className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={current[aspect]}
                            onChange={(e) =>
                              handleScoreChange(s.siswa_id, aspect, parseInt(e.target.value, 10))
                            }
                            className="w-18 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="py-2 px-3 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                        {live.final}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block w-6 h-6 leading-6 text-center rounded-lg font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          {live.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Konfirmasi & Aksi */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="flex items-start sm:items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmCheck}
              onChange={(e) => setConfirmCheck(e.target.checked)}
              className="mt-0.5 sm:mt-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              Saya memastikan koreksi ini benar untuk <strong>{kelasNama}</strong> pada{' '}
              <strong>TP {tahunPelajaranNama} ({semesterNama})</strong>.
            </span>
          </label>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saveCorrectionMutation.isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!canSubmit || saveCorrectionMutation.isPending}
              onClick={() => saveCorrectionMutation.mutate(false)}
              className="gap-1.5 text-xs font-bold border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saveCorrectionMutation.isPending ? 'Menyimpan...' : 'Simpan Koreksi Arsip'}
              </span>
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={!canSubmit || saveCorrectionMutation.isPending}
              onClick={() => saveCorrectionMutation.mutate(true)}
              className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {saveCorrectionMutation.isPending
                  ? 'Memproses...'
                  : 'Simpan & Kunci Ulang ke Rapor'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
