import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  GraduationCap, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Calendar, 
  BookOpen, 
  Sparkles,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { raporApi } from '@/api/rapor.api';
import { useJenjang } from '@/hooks/useJenjang';

export interface StudentMultiSemesterMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  siswaNama: string;
  nis?: string;
  kelasNama?: string;
  kkm?: number;
}

export const StudentMultiSemesterMatrixModal: React.FC<StudentMultiSemesterMatrixModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaId,
  siswaNama,
  nis,
  kelasNama,
  kkm = 70,
}) => {
  const { jenjang, durasiSmk } = useJenjang();

  const { data: matrixRes, isLoading } = useQuery({
    queryKey: ['matrix-lintas-semester', siswaId, kkm],
    queryFn: () => raporApi.getMatrixLintasSemester({ siswa_id: siswaId, kkm }).catch(() => ({ success: true, data: null })),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  const matrixData = matrixRes?.data || matrixRes || {};
  const headers: any[] = matrixData?.headers || [];
  const matrixRows: any[] = matrixData?.matrix || [];
  const diagnostics = matrixData?.diagnostics || {
    total_mapel: 0,
    total_mapel_merah: 0,
    daftar_mapel_merah: [],
    is_clean: true,
    kesimpulan: 'Memuat data analitik...',
  };

  const handleCopyRekap = () => {
    if (matrixRows.length === 0) return;

    let text = `*📋 MATRIKS RIWAYAT NILAI LINTAS SEMESTER*\n`;
    text += `*Nama Siswa:* ${siswaNama} (NIS: ${nis || '-'})\n`;
    text += `*Kelas Binaan:* ${kelasNama || '-'}\n`;
    text += `*Jenjang:* ${jenjang} (${durasiSmk})\n`;
    text += `*Standar KKM:* ${kkm}\n`;
    text += `--------------------------------------\n`;

    if (diagnostics.total_mapel_merah > 0) {
      text += `*🚨 PERINGATAN BLOK NILAI MERAH:*\n`;
      diagnostics.daftar_mapel_merah.forEach((dm: string, idx: number) => {
        text += `   ${idx + 1}. ${dm}\n`;
      });
      text += `--------------------------------------\n`;
    } else {
      text += `*✅ STATUS:* Seluruh semester tuntas di atas KKM.\n`;
      text += `--------------------------------------\n`;
    }

    text += `*RINCIAN NILAI:* \n`;
    matrixRows.forEach((r: any, idx: number) => {
      const scoresStr = headers
        .map((h: any) => `${h.label}: ${r.scores[h.index]?.nilai !== null ? r.scores[h.index]?.nilai : '-'}`)
        .join(' | ');
      text += `${idx + 1}. *${r.nama_mapel}* (Rata2: ${r.rata_rata ?? '-'})\n   [${scoresStr}]\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success('Pola riwayat nilai siswa berhasil disalin ke clipboard!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="max-w-5xl w-full my-auto"
      contentClassName="p-4 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Peta Riwayat &amp; Pola Nilai Lintas Semester
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase">
                {jenjang} {durasiSmk === '4_TAHUN' ? '4 Thn' : ''}
              </span>
            </div>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{siswaNama} (NIS: {nis || '-'})</span> &bull; <span>{kelasNama}</span> &bull; <span className="font-semibold text-purple-600 dark:text-purple-400">Target KKM: {kkm}</span>
            </p>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Memindai rekam jejak nilai seluruh semester siswa...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ─── Banner Diagnostik Blok Merah ─── */}
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
            diagnostics.total_mapel_merah > 0
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                diagnostics.total_mapel_merah > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-300'
              }`}>
                {diagnostics.total_mapel_merah > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div>
                <h4 className={`text-xs font-bold ${
                  diagnostics.total_mapel_merah > 0
                    ? 'text-rose-800 dark:text-rose-200'
                    : 'text-emerald-800 dark:text-emerald-200'
                }`}>
                  {diagnostics.total_mapel_merah > 0
                    ? `Perhatian: Terdeteksi ${diagnostics.total_mapel_merah} Mata Pelajaran dengan Blok Nilai Merah`
                    : 'Kondisi Akademik Prima: Seluruh Semester Tuntas'
                  }
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {diagnostics.total_mapel_merah > 0
                    ? `Ditemukan nilai di bawah KKM (${kkm}) pada: ${diagnostics.daftar_mapel_merah.join(' • ')}`
                    : 'Tidak ada catatan nilai merah pada semester lampau maupun semester berjalan.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyRekap}
              className="text-xs font-bold gap-1.5 shrink-0 self-end sm:self-auto"
            >
              <Copy size={13} />
              <span>Salin Riwayat</span>
            </Button>
          </div>

          {/* ─── Visual Heatmap Matriks Lintas Semester ─── */}
          <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[750px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[200px]">Mata Pelajaran</th>
                  <th className="py-3 px-2 text-center w-14">KKM</th>
                  {headers.map((h: any) => (
                    <th 
                      key={`header-sem-${h.index}`}
                      className={`py-3 px-2 text-center w-16 sm:w-20 ${
                        h.is_current ? 'bg-purple-100/60 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black' : ''
                      }`}
                    >
                      <div>{h.label}</div>
                      <div className="text-[9px] font-normal normal-case opacity-75">{h.sublabel}</div>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center w-16 bg-slate-100/60 dark:bg-slate-800/40">Rata2</th>
                  <th className="py-3 px-3 text-center min-w-[140px]">Status Blok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {matrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 5} className="py-12 text-center text-slate-400 text-xs">
                      Belum ada riwayat nilai tersimpan untuk siswa ini.
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row: any, idx: number) => {
                    return (
                      <tr
                        key={`row-${row.mapel_id}-${idx}`}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          row.has_red ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {row.nama_mapel}
                          </div>
                          {row.kode_mapel && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {row.kode_mapel}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {kkm}
                        </td>

                        {/* Nilai Tiap Semester (Visual Heatmap Cell) */}
                        {headers.map((h: any) => {
                          const cell = row.scores[h.index];
                          const score = cell?.nilai;
                          const isRed = cell?.status === 'red';
                          const isFuture = h.is_future;

                          return (
                            <td 
                              key={`cell-${row.mapel_id}-${h.index}`}
                              className={`py-2 px-1 text-center font-bold ${
                                h.is_current ? 'bg-purple-50/40 dark:bg-purple-950/30' : ''
                              }`}
                            >
                              {score !== null && score !== undefined ? (
                                <span
                                  className={`inline-block w-full py-1 rounded-lg text-xs font-black transition-all ${
                                    isRed
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 ring-1 ring-rose-400/80 shadow-2xs scale-105'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                  title={`${row.nama_mapel} ${h.label} (${h.sublabel}): ${score} ${isRed ? `[DIBAWAH KKM ${kkm}]` : '[TUNTAS]'}`}
                                >
                                  {score}
                                </span>
                              ) : isFuture ? (
                                <span className="text-slate-300 dark:text-slate-600 text-[11px]">-</span>
                              ) : (
                                <span className="text-amber-500/70 dark:text-amber-400/70 text-[10px] italic">Kosong</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Rata-Rata Kumulatif */}
                        <td className="py-2.5 px-2 text-center font-black text-xs bg-slate-50/60 dark:bg-slate-800/30 text-purple-700 dark:text-purple-300">
                          {row.rata_rata !== null ? row.rata_rata : '-'}
                        </td>

                        {/* Status Diagnostik Blok */}
                        <td className="py-2.5 px-3 text-center">
                          {row.has_red ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <AlertCircle size={10} className="shrink-0" />
                              <span>Merah {row.red_semesters.map((s: number) => `S${s}`).join(', ')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 size={10} className="shrink-0" />
                              <span>Tuntas Konsisten</span>
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
      )}

      {/* Footer Modal Action */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300 inline-block" />
          <span>Kotak merah = Nilai di bawah KKM ({kkm})</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="text-xs font-semibold"
        >
          Tutup Matriks
        </Button>
      </div>
    </Modal>
  );
});

StudentMultiSemesterMatrixModal.displayName = 'StudentMultiSemesterMatrixModal';
