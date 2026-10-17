import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TabSwitcher, TabOption } from '@/components/ui/TabSwitcher';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RaporStagingDetail } from '@/api/rapor.api';

export interface LocalSumatifScore {
  sumatif_1?: number | null;
  sumatif_2?: number | null;
  sumatif_3?: number | null;
  rata_rata?: number | null;
  nilai_akhir?: number | null;
}

export interface LocalSumatifStudent {
  no: number;
  nis: string;
  nisn: string;
  nama: string;
  scores: Record<string, LocalSumatifScore>;
}

export interface LocalCpGrade {
  nilai_rapor: number | null;
  capaian_kompetensi: string;
}

export interface LocalEkskulItem {
  nama: string;
  predikat: string;
  keterangan: string;
}

export interface LocalCpStudent {
  no: number;
  nis: string;
  nisn: string;
  nama: string;
  mapelGrades?: Record<string, LocalCpGrade>;
  scores?: Record<string, LocalCpGrade>;
  kehadiran?: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  absensi?: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  catatanWali?: string;
  catatanWalas?: string;
  ekskul?: LocalEkskulItem[];
}

export interface RaporStagingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: RaporStagingDetail | null;
  isLoading: boolean;
  onSync: (id: string) => void;
}

export const RaporStagingDetailModal: React.FC<RaporStagingDetailModalProps> = React.memo(
  function RaporStagingDetailModal({
    isOpen,
    onClose,
    previewData,
    isLoading,
    onSync,
  }) {
    const [activeTab, setActiveTab] = useState('sumatif');

    const previewTabOptions: TabOption[] = useMemo(() => {
      const totalSumatif = (previewData?.sumatif_sheet_data || []).length;
      return [
        { id: 'sumatif', label: `Nilai Sumatif (${totalSumatif} Siswa)` },
        { id: 'cp', label: 'Nilai Rapor & Deskripsi CP' },
        { id: 'absensi', label: 'Absensi, Ekskul & Catatan' },
      ];
    }, [previewData]);

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-6 sm:pr-8 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet size={18} className="text-indigo-600 shrink-0" aria-hidden="true" />
              <span className="truncate">Pratinjau Data Kelas: {previewData?.nama_kelas || 'Memuat...'}</span>
            </div>
            {previewData && (
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  onSync(previewData.id);
                  onClose();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl gap-1 shadow-xs font-semibold shrink-0"
                aria-label="Sinkronkan data kelas ini ke e-Rapor resmi"
              >
                <RefreshCw size={12} aria-hidden="true" />
                <span>Sinkronkan ke e-Rapor</span>
              </Button>
            )}
          </div>
        }
        description={`Tahun Ajaran ${previewData?.tahun_pelajaran_nama || ''} • Semester ${previewData?.semester || ''} • Wali Kelas: ${previewData?.wali_kelas_nama || '-'}`}
      >
        <div className="p-4 sm:p-6 pt-2 max-h-[75vh] overflow-y-auto space-y-4 w-full min-w-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-500" size={20} aria-hidden="true" />
              <p className="text-xs font-medium">Mengambil pratinjau data siswa dan nilai...</p>
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              {/* Reusable TabSwitcher Terstandar (Pilar 27 & Responsivitas Pilar 30) */}
              <div className="w-full overflow-x-auto no-scrollbar flex-nowrap">
                <TabSwitcher
                  options={previewTabOptions}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              {/* ── Tab 1: Nilai Sumatif ── */}
              {activeTab === 'sumatif' && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-24">NIS / NISN</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Nilai Sumatif Rombel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {((previewData?.sumatif_sheet_data || []) as LocalSumatifStudent[])?.map((s) => {
                        const scoredSubjects = Object.entries(s.scores || {})
                          ?.filter(
                            ([_, sc]) =>
                              sc &&
                              (sc.rata_rata !== null || sc.nilai_akhir !== null || sc.sumatif_1 !== null)
                          )
                          .slice(0, 4);

                        return (
                          <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                            <td className="p-2.5 font-mono text-slate-500">{s.nis || s.nisn || '-'}</td>
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">
                              {(scoredSubjects?.length || 0) > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {scoredSubjects?.map(([mapel, sc]) => (
                                    <span
                                      key={mapel}
                                      className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]"
                                    >
                                      <strong>{mapel}</strong>: {sc.rata_rata ?? sc.nilai_akhir ?? sc.sumatif_1}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Nilai sumatif dihitung dari asesmen sumatif</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tab 2: CP & Rapor ── */}
              {activeTab === 'cp' && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">
                          Nilai Akhir Rapor & Capaian Kompetensi (CP)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {((previewData?.cp_sheet_data || []) as LocalCpStudent[])?.map((s) => {
                        const grades = s.mapelGrades || s.scores || {};
                        const validGrades = Object.entries(grades)?.filter(
                          ([_, g]) => g && (g.nilai_rapor !== null || g.capaian_kompetensi)
                        );

                        return (
                          <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                            <td className="p-2.5 space-y-1.5">
                              {(validGrades?.length || 0) > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    {validGrades?.map(([mapel, g]) => (
                                      <Badge
                                        key={mapel}
                                        variant="secondary"
                                        className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60"
                                      >
                                        {mapel}: {g.nilai_rapor ?? '-'}
                                      </Badge>
                                    ))}
                                  </div>
                                  {validGrades[0] && validGrades[0][1]?.capaian_kompetensi && (
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2">
                                      <strong className="text-slate-800 dark:text-slate-200 not-italic">
                                        {validGrades[0][0]}:
                                      </strong>{' '}
                                      "{validGrades[0][1].capaian_kompetensi}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Belum ada nilai CP</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tab 3: Absensi & Catatan ── */}
              {activeTab === 'absensi' && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-24 text-center">
                          Kehadiran (S/I/A)
                        </th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">
                          Catatan Wali Kelas & Ekskul
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {((previewData?.cp_sheet_data || []) as LocalCpStudent[])?.map((s) => {
                        const kehadiran = s.kehadiran || s.absensi || { sakit: 0, izin: 0, alpa: 0 };
                        const catatan = s.catatanWali || s.catatanWalas || '';
                        const ekskulList = (s.ekskul || [])?.filter((e) => e.nama && e.nama !== '-');

                        return (
                          <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                            <td className="p-2.5 text-center font-mono">
                              <span className="text-sky-600 font-bold" title="Sakit">
                                {kehadiran.sakit ?? 0}
                              </span>{' '}
                              /{' '}
                              <span className="text-amber-600 font-bold" title="Izin">
                                {kehadiran.izin ?? 0}
                              </span>{' '}
                              /{' '}
                              <span className="text-rose-600 font-bold" title="Alpa">
                                {kehadiran.alpa ?? 0}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                              {catatan ? (
                                <p className="font-medium text-slate-700 dark:text-slate-200">"{catatan}"</p>
                              ) : (
                                <span className="text-slate-400 italic">Tidak ada catatan</span>
                              )}
                              {(ekskulList?.length || 0) > 0 && (
                                <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                                  {ekskulList?.map((e, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                    >
                                      {e.nama} ({e.predikat || 'Baik'})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }
);
