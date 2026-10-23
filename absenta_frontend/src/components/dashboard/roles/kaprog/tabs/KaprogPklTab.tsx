import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Search, 
  ChevronRight, 
  ArrowUpRight,
  Users,
  CalendarCheck,
  Edit3,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { EditingMitraSlot } from '@/components/hubin/nilai-pkl/PklDeskripsiTpModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface KaprogPklTabProps {
  penilaianStatus: {
    totalSiswaPkl: number;
    sudahDinilaiDudi?: number;
    belumDinilaiDudi?: number;
    sudahSidang?: number;
  };
  tpStatus: {
    totalMitra: number;
    filledMitra: number;
    pendingMitra: number;
    completionPercentage: number;
  };
  mitraFilter: string;
  setMitraFilter: (filter: string) => void;
  filteredMitraList: Array<{
    mitra_id: string;
    nama_mitra: string;
    bidang_usaha?: string;
    siswa_count: number;
    rombel_list?: string[];
    has_tp: boolean;
    deskripsi_tp?: string;
    saved_id?: string;
  }>;
  onSelectEditingSlot: (slot: EditingMitraSlot) => void;
  onOpenPlottingModal?: () => void;
  onOpenRekapNilai?: () => void;
  onOpenMonitoringPkl?: () => void;
  jurusanNama?: string;
}

export const KaprogPklTab: React.FC<KaprogPklTabProps> = React.memo(({
  penilaianStatus,
  tpStatus,
  mitraFilter,
  setMitraFilter,
  filteredMitraList = [],
  onSelectEditingSlot,
  onOpenPlottingModal,
  onOpenRekapNilai,
  onOpenMonitoringPkl,
  jurusanNama = 'Kejuruan',
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');

  const totalSiswa = penilaianStatus?.totalSiswaPkl || 0;
  const sudahDinilaiDudi = penilaianStatus?.sudahDinilaiDudi || 0;
  const sudahSidang = penilaianStatus?.sudahSidang || 0;
  const pendingMitra = tpStatus?.pendingMitra || 0;

  const dudiPercent = useMemo(() => {
    return totalSiswa > 0 ? Math.round((sudahDinilaiDudi / totalSiswa) * 100) : 0;
  }, [sudahDinilaiDudi, totalSiswa]);

  const sidangPercent = useMemo(() => {
    return totalSiswa > 0 ? Math.round((sudahSidang / totalSiswa) * 100) : 0;
  }, [sudahSidang, totalSiswa]);

  const displayedMitraList = useMemo(() => {
    return (filteredMitraList || []).filter((mitra) => {
      if (statusFilter === 'SUDAH') return mitra.has_tp;
      if (statusFilter === 'BELUM') return !mitra.has_tp;
      return true;
    });
  }, [filteredMitraList, statusFilter]);

  const totalCount = (filteredMitraList || []).length;
  const pendingCount = (filteredMitraList || []).filter((m) => !m.has_tp).length;
  const filledCount = (filteredMitraList || []).filter((m) => m.has_tp).length;

  return (
    <div className="space-y-6">
      {/* KPI Metrik: AnalyticsCard Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Siswa PKL"
          value={totalSiswa}
          icon={<Building2 className="w-5 h-5 text-indigo-400" />}
          description="Peserta aktif PKL"
          gradient="from-indigo-600 to-blue-600"
        />

        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Nilai Industri"
          value={sudahDinilaiDudi}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          description={`${dudiPercent}% telah dinilai DUDI`}
          gradient="from-emerald-600 to-teal-700"
        />

        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Belum Diisi TP"
          value={pendingMitra}
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
          description={`${pendingMitra} mitra perlu rumusan`}
          gradient="from-amber-500 to-orange-600"
        />

        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Lulus Sidang"
          value={sudahSidang}
          icon={<Award className="w-5 h-5 text-purple-400" />}
          description={`${sidangPercent}% selesai sidang`}
          gradient="from-purple-600 to-indigo-700"
        />
      </div>

      {/* Progress Capaian Penilaian (Simplified, Low Noise) */}
      <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Progres Penilaian PKL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring capaian nilai industri dan kelulusan sidang peserta PKL {jurusanNama}.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onOpenPlottingModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenPlottingModal}
                className="text-xs font-bold rounded-xl gap-1.5 shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Plotting Siswa PKL</span>
              </Button>
            )}
            {onOpenMonitoringPkl && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenMonitoringPkl}
                className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Monitoring Presensi</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenRekapNilai || (() => navigate('/hubin/nilai-pkl?tab=dudi'))}
              className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
            >
              <span>Rekap Nilai</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* 2-Column Progress Grid (Reduced Visual Noise) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Nilai Mentor Industri
              </span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {sudahDinilaiDudi} / {totalSiswa} ({dudiPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${dudiPercent}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Ujian Sidang PKL
              </span>
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {sudahSidang} / {totalSiswa} ({sidangPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${sidangPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabel & Kartu Mobile List Mitra Industri & Status TP */}
      <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Pengisian Tujuan Pembelajaran</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rumuskan deskripsi capaian TP per mitra DUDI untuk pencetakan rapor PKL {jurusanNama}.
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Cari mitra atau rombel..."
              placeholder="Cari mitra atau rombel..."
              value={mitraFilter}
              onChange={(e) => setMitraFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Quick Filter Tabs (Semua, Belum Diisi, Sudah Diisi) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'flex-1 sm:flex-none text-center px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BELUM')}
            className={cn(
              'flex-1 sm:flex-none text-center px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
              statusFilter === 'BELUM'
                ? 'bg-amber-500 text-white shadow-2xs font-bold'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50/50'
            )}
          >
            Belum Diisi ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SUDAH')}
            className={cn(
              'flex-1 sm:flex-none text-center px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
              statusFilter === 'SUDAH'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50'
            )}
          >
            Sudah Diisi ({filledCount})
          </button>
        </div>

        {/* View Switcher: Mobile Cards Deck vs Desktop Table */}
        {isMobile ? (
          <div className="space-y-3">
            {displayedMitraList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada data perusahaan yang cocok dengan pencarian atau filter ini.
              </div>
            ) : (
              displayedMitraList.map((mitra) => (
                <div
                  key={mitra.mitra_id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Card Header: Nama Mitra & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">
                        {mitra.nama_mitra}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {mitra.bidang_usaha || 'Mitra Industri'}
                      </p>
                    </div>
                    {mitra.has_tp ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tersedia</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                        <AlertCircle className="w-3 h-3" />
                        <span>Belum Ada</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata: Siswa & Rombel */}
                  <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="inline-flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{mitra.siswa_count} Siswa PKL</span>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center">
                      {(mitra.rombel_list || []).map((r: string, rIdx: number) => (
                        <span
                          key={rIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Deskripsi TP Preview */}
                  {mitra.has_tp && mitra.deskripsi_tp ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                      "{mitra.deskripsi_tp}"
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-400/90 italic">
                      Belum ada rumusan deskripsi capaian pembelajaran (TP).
                    </div>
                  )}

                  {/* CTA Button Touch Target */}
                  <Button
                    type="button"
                    variant={mitra.has_tp ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() =>
                      onSelectEditingSlot({
                        mitra_id: mitra.mitra_id,
                        mitra_nama: mitra.nama_mitra,
                        siswa_count: mitra.siswa_count,
                        rombel_list: mitra.rombel_list || [],
                        deskripsi_tp: mitra.deskripsi_tp || '',
                        saved_id: mitra.saved_id,
                      })
                    }
                    className={cn(
                      'w-full text-xs font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs',
                      !mitra.has_tp
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-none'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {mitra.has_tp ? (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah Deskripsi TP</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Rumuskan Tujuan Pembelajaran</span>
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mitra Industri</th>
                  <th className="py-3 px-4">Bidang</th>
                  <th className="py-3 px-4 text-center">Siswa</th>
                  <th className="py-3 px-4">Kelas / Rombel</th>
                  <th className="py-3 px-4 text-center">Status TP</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {displayedMitraList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data perusahaan yang cocok dengan pencarian atau filter ini.
                    </td>
                  </tr>
                ) : (
                  displayedMitraList.map((mitra) => (
                    <tr
                      key={mitra.mitra_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                        {mitra.nama_mitra}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {mitra.bidang_usaha || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {mitra.siswa_count}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(mitra.rombel_list || []).map((r: string, rIdx: number) => (
                            <span
                              key={rIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {mitra.has_tp ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                            <AlertCircle className="w-3 h-3" />
                            <span>Belum Ada</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectEditingSlot({
                              mitra_id: mitra.mitra_id,
                              mitra_nama: mitra.nama_mitra,
                              siswa_count: mitra.siswa_count,
                              rombel_list: mitra.rombel_list || [],
                              deskripsi_tp: mitra.deskripsi_tp || '',
                              saved_id: mitra.saved_id,
                            })
                          }
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{mitra.has_tp ? 'Edit TP' : 'Rumuskan'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
});

KaprogPklTab.displayName = 'KaprogPklTab';
