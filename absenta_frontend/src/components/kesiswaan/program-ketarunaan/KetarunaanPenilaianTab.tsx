import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Lock,
  Unlock,
  Save,
  Send,
  Shield,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';
import {
  getKetarunaanNilaiKelas,
  saveKetarunaanNilaiBulk,
  lockKetarunaanNilai,
  unlockKetarunaanNilai,
  getKetarunaanSkema,
  saveKetarunaanSkema,
  syncKetarunaanPresensi5Siklus,
  KetarunaanSkema,
  KetarunaanNilaiStudent,
} from '@/api/kesiswaan/programKetarunaan.api';
import { KetarunaanSkemaSettingsModal } from './KetarunaanSkemaSettingsModal';

export interface KetarunaanPenilaianTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
}

export const KetarunaanPenilaianTab: React.FC<KetarunaanPenilaianTabProps> = ({
  tahunPelajaranId,
  semesterId,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
}) => {
  const queryClient = useQueryClient();
  const [isSkemaModalOpen, setIsSkemaModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localScores, setLocalScores] = useState<Record<string, {
    samapta: number;
    pbb: number;
    disiplin: number;
    mental: number;
  }>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSyncingPresensi, setIsSyncingPresensi] = useState(false);

  // 1. Query Data Nilai Kelas
  const {
    data: nilaiResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['ketarunaan-nilai-kelas', kelasId, tahunPelajaranId, semesterId],
    queryFn: () =>
      getKetarunaanNilaiKelas({
        kelas_id: kelasId!,
        tahun_pelajaran_id: tahunPelajaranId!,
        semester_id: semesterId!,
      }),
    enabled: Boolean(kelasId && tahunPelajaranId && semesterId),
  });

  const payloadData: any =
    (nilaiResponse as any)?.students != null
      ? nilaiResponse
      : (nilaiResponse as any)?.data ?? nilaiResponse;
  const skema = payloadData?.skema || null;
  const students: KetarunaanNilaiStudent[] = payloadData?.students || [];
  const isClassLocked = Boolean(payloadData?.is_class_locked);

  // Initialize local score state when data loads
  useEffect(() => {
    if (students.length > 0) {
      const initial: Record<string, any> = {};
      students.forEach((s) => {
        initial[s.siswa_id] = {
          samapta: s.nilai_samapta ?? 0,
          pbb: s.nilai_pbb ?? 0,
          disiplin: s.nilai_disiplin ?? 0,
          mental: s.nilai_mental ?? 0,
        };
      });
      setLocalScores(initial);
      setHasChanges(false);
    }
  }, [students]);

  // Handler update skor per siswa
  const handleScoreChange = useCallback(
    (siswaId: string, aspect: 'samapta' | 'pbb' | 'disiplin' | 'mental', val: number) => {
      const sanitized = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
      setLocalScores((prev) => ({
        ...prev,
        [siswaId]: {
          ...prev[siswaId],
          [aspect]: sanitized,
        },
      }));
      setHasChanges(true);
    },
    []
  );

  // Kalkulasi live nilai akhir & predikat untuk satu siswa
  const calculateLiveFinal = useCallback(
    (scores: { samapta: number; pbb: number; disiplin: number; mental: number }) => {
      if (!skema) return { final: 0, grade: '-' };
      const raw =
        (scores.samapta * skema.bobot_samapta +
          scores.pbb * skema.bobot_pbb +
          scores.disiplin * skema.bobot_disiplin +
          scores.mental * skema.bobot_mental) /
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

  // Quick fill untuk 1 rombel sekaligus
  const handleQuickFill = (aspect: 'samapta' | 'pbb' | 'disiplin' | 'mental') => {
    const inputVal = window.prompt(`Isi nilai serentak untuk aspek ${aspect.toUpperCase()} (0 - 100):`, '80');
    if (inputVal === null) return;
    const num = Math.max(0, Math.min(100, parseInt(inputVal, 10) || 0));
    setLocalScores((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        if (!updated[s.siswa_id]) {
          updated[s.siswa_id] = { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
        }
        updated[s.siswa_id][aspect] = num;
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Handler Tarik Rekomendasi Nilai dari Presensi 5 Siklus
  const handleSyncPresensi = async () => {
    if (!kelasId || !tahunPelajaranId || !semesterId) return;
    const confirmed = window.confirm(
      'Tarik nilai kehadiran 5 siklus ketarunaan (Upacara, Ketarunaan Pagi, Pembiasaan Dhuha, Apel Sore)?\n\n' +
      'Sistem akan otomatis menghitung persentase kehadiran nyata di lapangan dan mengisi rekomendasi nilai DISIPLIN dan MENTAL untuk seluruh taruna di rombel ini.'
    );
    if (!confirmed) return;

    try {
      setIsSyncingPresensi(true);
      const res = await syncKetarunaanPresensi5Siklus({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });

      const data = (res as any)?.data ?? res;
      const rekap = data?.rekap || {};
      let updatedCount = 0;

      setLocalScores((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          const r = rekap[s.siswa_id];
          if (r) {
            next[s.siswa_id] = {
              samapta: next[s.siswa_id]?.samapta ?? s.nilai_samapta ?? 0,
              pbb: next[s.siswa_id]?.pbb ?? s.nilai_pbb ?? 0,
              disiplin: r.rekomendasi_disiplin,
              mental: r.rekomendasi_mental,
            };
            updatedCount++;
          }
        });
        return next;
      });

      setHasChanges(true);
      window.alert(
        `Berhasil menyinkronkan kehadiran 5 siklus (${data?.totalSesiTerlaksana ?? 0} sesi terlaksana) untuk ${updatedCount} taruna!\n\nNilai Disiplin & Mental telah terisi otomatis. Silakan klik 'Simpan Draf' untuk menyimpan perubahan.`
      );
    } catch (err: any) {
      window.alert('Gagal menyinkronkan presensi: ' + (err?.message || 'Terjadi kendala jaringan'));
    } finally {
      setIsSyncingPresensi(false);
    }
  };

  // Mutation: Simpan Draf
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!kelasId || !tahunPelajaranId || !semesterId) return;
      const items = students.map((s) => {
        const sc = localScores[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
        return {
          siswa_id: s.siswa_id,
          siswa_akademik_id: s.siswa_akademik_id,
          nilai_samapta: sc.samapta,
          nilai_pbb: sc.pbb,
          nilai_disiplin: sc.disiplin,
          nilai_mental: sc.mental,
        };
      });
      return saveKetarunaanNilaiBulk({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        items,
      });
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
    },
  });

  // Mutation: Kunci Nilai & Kirim ke Rapor
  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!kelasId || !tahunPelajaranId || !semesterId) return;
      // Simpan draf terlebih dahulu sebelum mengunci
      const items = students.map((s) => {
        const sc = localScores[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
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
        items,
      });

      return lockKetarunaanNilai({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
      alert('Nilai berhasil dikunci dan narasi capaian telah dikirimkan ke Rapor Kokurikuler Wali Kelas!');
    },
  });

  // Mutation: Buka Kunci Nilai
  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!kelasId || !tahunPelajaranId || !semesterId) return;
      return unlockKetarunaanNilai({
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
    },
  });

  // Filter siswa berdasarkan pencarian nama/NIS
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        (s.nama_siswa || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  if (!kelasId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        <Shield className="w-12 h-12 text-slate-400 mb-3" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
          Pilih Rombel / Kelas Terlebih Dahulu
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Gunakan filter toolbar di bagian atas untuk memilih kelas yang ingin dinilai kesamaptaan &amp; ketarunaannya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header Status Banner ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Penilaian Ketarunaan {kelasNama || ''}
                </h3>
                <Badge
                  variant={skema?.mode_pelatihan === 'FULL_TARUNA' ? 'default' : 'outline'}
                  className="font-bold text-[10px]"
                >
                  {skema?.mode_pelatihan === 'FULL_TARUNA' ? 'Murni Ketarunaan' : 'Semi Ketarunaan'}
                </Badge>
                {isClassLocked ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 text-[10px]">
                    <Lock className="w-3 h-3" /> Terkunci di Rapor
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1 text-[10px]">
                    <Unlock className="w-3 h-3" /> Draf Terbuka
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <span>
                  Bobot: Samapta {skema?.bobot_samapta ?? 25}% • PBB {skema?.bobot_pbb ?? 20}% • Disiplin {skema?.bobot_disiplin ?? 30}% • Mental {skema?.bobot_mental ?? 25}%
                </span>
                <Tooltip
                  placement="bottom"
                  content={
                    <div className="space-y-1.5 p-1 text-[11px] leading-relaxed text-left">
                      <p className="font-bold text-slate-900 dark:text-white">Rumus Nilai Akhir Komposit:</p>
                      <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        (Samapta×{skema?.bobot_samapta ?? 25}% + PBB×{skema?.bobot_pbb ?? 20}% + Disiplin×{skema?.bobot_disiplin ?? 30}% + Mental×{skema?.bobot_mental ?? 25}%) / 100
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Mode Pelatihan: <strong className="text-slate-800 dark:text-slate-100">{skema?.mode_pelatihan === 'FULL_TARUNA' ? 'Murni Ketarunaan (Porsi Fisik/PBB 70%)' : 'Semi Ketarunaan (Porsi Sikap/Karakter 55%)'}</strong>.
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Nilai Disiplin & Mental dapat disinkronkan otomatis dari 5 siklus presensi (Upacara, Ketarunaan Pagi, Dhuha Jum'at, dan Apel Sore).
                      </p>
                    </div>
                  }
                >
                  <span className="text-slate-400 hover:text-indigo-500 cursor-pointer inline-flex items-center">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSkemaModalOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Skema &amp; Bobot</span>
            </Button>

            {!isClassLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncPresensi}
                disabled={isSyncingPresensi}
                className="gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                title="Tarik nilai Disiplin & Mental otomatis dari presensi 5 siklus (Upacara, Ketarunaan, Dhuha, Apel Sore)"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${isSyncingPresensi ? 'animate-spin' : ''}`} />
                <span>{isSyncingPresensi ? 'Menghitung...' : 'Tarik Nilai 5 Siklus'}</span>
              </Button>
            )}

            {!isClassLocked ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasChanges || saveMutation.isPending}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Draf'}</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Kunci nilai rombel ini dan kirimkan narasi capaian ke lembar Rapor Kokurikuler Wali Kelas?')) {
                      lockMutation.mutate();
                    }
                  }}
                  disabled={lockMutation.isPending}
                  className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lockMutation.isPending ? 'Mengunci...' : 'Kunci & Kirim ke Rapor'}</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Buka kembali kunci nilai kelas ini untuk perbaikan/remedial?')) {
                    unlockMutation.mutate();
                  }
                }}
                disabled={unlockMutation.isPending}
                className="gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci Nilai</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Toolbar Spreadsheet ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau NIS siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {!isClassLocked && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 mr-1">Isi Cepat:</span>
            <button
              onClick={() => handleQuickFill('samapta')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
            >
              Samapta
            </button>
            <button
              onClick={() => handleQuickFill('pbb')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
            >
              PBB
            </button>
            <button
              onClick={() => handleQuickFill('disiplin')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
            >
              Disiplin
            </button>
            <button
              onClick={() => handleQuickFill('mental')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
            >
              Mental
            </button>
          </div>
        )}
      </div>

      {/* ── Tabel Spreadsheet Interaktif ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Identitas Taruna</th>
                <th className="py-3 px-3 text-center w-28">
                  <div className="flex items-center justify-center gap-1">
                    <span>Samapta</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Kesamaptaan Jasmani</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>Sumber Data:</strong> Pengujian fisik lapangan (Lari 12 menit, Push-up, Sit-up, Shuttle run) oleh Guru PJOK / Pelatih Taruna (Skala 0-100).
                          </p>
                          <p className="text-slate-500">Bobot kontribusi: <strong>{skema?.bobot_samapta ?? 25}%</strong> ke nilai akhir.</p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-400">({skema?.bobot_samapta ?? 25}%)</span>
                </th>

                <th className="py-3 px-3 text-center w-28">
                  <div className="flex items-center justify-center gap-1">
                    <span>PBB</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Peraturan Baris-Berbaris</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>Sumber Data:</strong> Uji unjuk formasi baris-berbaris di tempat, langkah tegap, defile, dan penghormatan oleh Instruktur Ketarunaan (Skala 0-100).
                          </p>
                          <p className="text-slate-500">Bobot kontribusi: <strong>{skema?.bobot_pbb ?? 20}%</strong> ke nilai akhir.</p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-400">({skema?.bobot_pbb ?? 20}%)</span>
                </th>

                <th className="py-3 px-3 text-center w-28">
                  <div className="flex items-center justify-center gap-1">
                    <span>Disiplin</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Kedisiplinan & Presensi 5 Siklus</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>Sumber Data:</strong> Integrasi Mesin Presensi Riil dari 3 siklus: Upacara Bendera (Senin), Latihan Ketarunaan Pagi (Sel/Rab/Kam/Sab), dan Apel Pulang Sore.
                          </p>
                          <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                            Rumus: (Total Hadir Disiplin / Total Sesi Terlaksana) × 100 - Penalti Terlambat
                          </p>
                          <p className="text-slate-500">Bobot kontribusi: <strong>{skema?.bobot_disiplin ?? 30}%</strong> ke nilai akhir.</p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-400">({skema?.bobot_disiplin ?? 30}%)</span>
                </th>

                <th className="py-3 px-3 text-center w-28">
                  <div className="flex items-center justify-center gap-1">
                    <span>Mental</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Mental, Karakter & Spiritual</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>Sumber Data:</strong> Presensi Pembiasaan Ibadah Dhuha Jum'at Pagi, pembinaan etika/moral, dan loyalitas jiwa korsa taruna.
                          </p>
                          <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                            Rumus: (Total Hadir Sesi Dhuha / Total Sesi Dhuha Terlaksana) × 100
                          </p>
                          <p className="text-slate-500">Bobot kontribusi: <strong>{skema?.bobot_mental ?? 25}%</strong> ke nilai akhir.</p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-400">({skema?.bobot_mental ?? 25}%)</span>
                </th>

                <th className="py-3 px-3 text-center w-24">
                  <div className="flex items-center justify-center gap-1">
                    <span>Akhir</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Nilai Akhir Komposit</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Kalkulasi gabungan 4 pilar sesuai bobot skema aktif.
                          </p>
                          <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                            (Samapta×{skema?.bobot_samapta ?? 25} + PBB×{skema?.bobot_pbb ?? 20} + Disiplin×{skema?.bobot_disiplin ?? 30} + Mental×{skema?.bobot_mental ?? 25}) / 100
                          </p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                </th>

                <th className="py-3 px-3 text-center w-20">
                  <div className="flex items-center justify-center gap-1">
                    <span>Predikat</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Skala Predikat Rapor</p>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                            <li><strong>A</strong>: Nilai Akhir ≥ 86 (Sangat Baik / Unggul)</li>
                            <li><strong>B</strong>: Nilai Akhir 71 - 85 (Baik / Memuaskan)</li>
                            <li><strong>C</strong>: Nilai Akhir 56 - 70 (Cukup / Standar)</li>
                            <li><strong>D</strong>: Nilai Akhir &lt; 56 (Perlu Pembinaan)</li>
                          </ul>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                </th>

                <th className="py-3 px-4 min-w-[260px]">
                  <div className="flex items-center gap-1">
                    <span>Catatan Capaian Rapor</span>
                    <Tooltip
                      placement="top"
                      content={
                        <div className="p-1.5 space-y-1 text-[11px] text-left leading-relaxed max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">Integrasi Rapor Kokurikuler</p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Narasi deskriptif resmi yang otomatis digenerate berbasis predikat dan mode pelatihan (Murni / Semi).
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Saat tombol <em>"Kunci & Kirim ke Rapor"</em> ditekan, narasi ini langsung diteruskan ke lembar Rapor Kokurikuler Wali Kelas.
                          </p>
                        </div>
                      }
                    >
                      <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-pointer shrink-0" />
                    </Tooltip>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={9} className="py-3 px-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data siswa terdaftar di rombel ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const current = localScores[s.siswa_id] || { samapta: 0, pbb: 0, disiplin: 0, mental: 0 };
                  const live = calculateLiveFinal(current);

                  return (
                    <tr
                      key={s.siswa_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{s.nama_siswa}</div>
                        <div className="text-[10px] font-mono text-slate-400">NIS: {s.nis} • {s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                        {s.presensi && (s.presensi.total_sesi_disiplin > 0 || s.presensi.total_sesi_duha > 0) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {s.presensi.total_sesi_disiplin > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" title="Kehadiran Upacara, Ketarunaan & Apel Sore">
                                Disiplin: {s.presensi.hadir_disiplin}/{s.presensi.total_sesi_disiplin} ({s.presensi.persen_disiplin}%)
                              </span>
                            )}
                            {s.presensi.total_sesi_duha > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" title="Kehadiran Pembiasaan Dhuha Jum'at">
                                Dhuha: {s.presensi.hadir_duha}/{s.presensi.total_sesi_duha} ({s.presensi.persen_duha}%)
                              </span>
                            )}
                            {s.presensi.terlambat_count > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" title="Total keterlambatan">
                                {s.presensi.terlambat_count}x telat
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Samapta Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isClassLocked}
                          value={current.samapta}
                          onChange={(e) => handleScoreChange(s.siswa_id, 'samapta', parseInt(e.target.value, 10))}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </td>

                      {/* PBB Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isClassLocked}
                          value={current.pbb}
                          onChange={(e) => handleScoreChange(s.siswa_id, 'pbb', parseInt(e.target.value, 10))}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </td>

                      {/* Disiplin Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isClassLocked}
                          value={current.disiplin}
                          onChange={(e) => handleScoreChange(s.siswa_id, 'disiplin', parseInt(e.target.value, 10))}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </td>

                      {/* Mental Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isClassLocked}
                          value={current.mental}
                          onChange={(e) => handleScoreChange(s.siswa_id, 'mental', parseInt(e.target.value, 10))}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </td>

                      {/* Nilai Akhir */}
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                        {live.final}
                      </td>

                      {/* Predikat */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block w-7 h-7 leading-7 text-center rounded-xl font-mono font-bold text-xs ${
                            live.grade === 'A'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : live.grade === 'B'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : live.grade === 'C'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {live.grade}
                        </span>
                      </td>

                      {/* Deskripsi Rapor */}
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {s.deskripsi_rapor || (
                          <span className="italic text-slate-400">
                            Akan otomatis digenerate saat disimpan/dikunci...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Skema Penilaian ──────────────────────────────────────────────── */}
      <KetarunaanSkemaSettingsModal
        isOpen={isSkemaModalOpen}
        onClose={() => setIsSkemaModalOpen(false)}
        skema={skema}
        onSave={async (newSkema) => {
          await saveKetarunaanSkema(newSkema);
          queryClient.invalidateQueries({ queryKey: ['ketarunaan-nilai-kelas'] });
        }}
        isSaving={false}
        tahunPelajaranId={tahunPelajaranId || ''}
        semesterId={semesterId || null}
        jurusanId={jurusanId || null}
        jurusanNama={jurusanNama}
      />
    </div>
  );
};
