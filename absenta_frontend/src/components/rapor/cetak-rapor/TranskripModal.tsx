import React, { useState } from 'react';
import { 
  Award, 
  BookOpen, 
  Loader2, 
  Sparkles, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LegerStudent, TranskripNilaiData } from '../../../types/cetakRapor.types';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { usePrintHeaderData } from '@/components/ui';
import { generatePdfTranskripNilai } from '@/utils/print/modules/pdfTranskripNilai';
import { normalizeStudentIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { toast } from 'sonner';

interface TranskripModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  transkripData?: TranskripNilaiData | null;
  isLoading: boolean;
}

export const TranskripModal: React.FC<TranskripModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  transkripData,
  isLoading,
}) => {
  const isMobile = useIsMobile();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Ambil data resmi sekolah & logo kop dari database tenant
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();

  if (!isOpen || !selectedStudent) return null;

  const data = transkripData as any;
  const headers = data?.headers || [
    { index: 1, label: 'Smt 1' },
    { index: 2, label: 'Smt 2' },
    { index: 3, label: 'Smt 3' },
    { index: 4, label: 'Smt 4' },
    { index: 5, label: 'Smt 5' },
    { index: 6, label: 'Smt 6' },
  ];

  const handleDownloadPdf = () => {
    if (!data) return;
    try {
      setIsExportingPdf(true);
      const studentIdentity = normalizeStudentIdentity({
        ...(selectedStudent || {}),
        ...(data.siswa || {}),
      });

      const printPayload = {
        sekolah: {
          nama: tenantInfo.name || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: tenantInfo.address || '',
          kota: (rawSekolah as any)?.kota || 'Kota',
          telepon: tenantInfo.phone,
          email: tenantInfo.email,
          website: tenantInfo.website,
          kepala_sekolah: (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: (rawSekolah as any)?.nip_kepala || '-',
          nama_dinas_atas: tenantInfo.nama_dinas_atas,
          nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
          nama_cabang_dinas: tenantInfo.nama_cabang_dinas,
        },
        siswa: {
          id: studentIdentity.id,
          nama_siswa: studentIdentity.nama,
          nis: studentIdentity.nis,
          nisn: studentIdentity.nisn,
          tempat_lahir: studentIdentity.tempatLahir || '-',
          tanggal_lahir: studentIdentity.tanggalLahir || '-',
          kelas: studentIdentity.namaKelas,
          jurusan: studentIdentity.namaJurusan,
          program_keahlian: studentIdentity.programKeahlian,
        },
        headers: headers.map((h: any) => ({ index: h.index, label: h.label, sublabel: h.sublabel || '' })),
        mata_pelajaran: (data.transkrip || data.mata_pelajaran || []).map((m: any) => ({
          mapel_id: m.mapel_id,
          mapel_name: m.mapel_name || m.nama_mapel,
          kode_mapel: m.kode_mapel,
          kelompok_mapel: m.kelompok_mapel,
          nilai_per_semester: m.nilai_per_semester,
          rata_rata_mapel: m.rata_rata_mapel ?? m.rata_rata ?? 0,
        })),
        ringkasan: {
          rata_rata_ijazah: data.ringkasan?.rata_rata_ijazah || data.rata_rata_ijazah_kumulatif || 0,
          total_mapel: data.ringkasan?.total_mapel || (data.transkrip || []).length,
          status_kelulusan: data.ringkasan?.status_kelulusan || 'MEMENUHI KRITERIA',
          nomor_ijazah: data.ringkasan?.nomor_ijazah,
          nilai_ukk: data.ringkasan?.nilai_ukk,
          nilai_pkl: data.ringkasan?.nilai_pkl,
        },
        options: {
          logoDaerahBase64,
          logoSekolahBase64,
        },
      };

      const { blobUrl, filename } = generatePdfTranskripNilai(printPayload);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Dokumen Transkrip Nilai resmi berhasil diunduh!');
    } catch (err: any) {
      toast.error(`Gagal menghasilkan PDF transkrip: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-transkrip"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl rounded-2xl border-none">
        {/* Header Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Award size={22} />
            </div>
            <div>
              <h3
                id="modal-title-transkrip"
                className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2"
              >
                Transkrip Nilai Kumulatif & Rekapitulasi Ijazah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Peserta Didik: <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.nama_siswa}</strong> (NIS: {selectedStudent.nis || '-'} • NISN: {selectedStudent.nisn || '-'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading || !data}
              className="rounded-xl border-slate-200 text-xs font-bold gap-1.5"
            >
              <Printer size={13} />
              <span>Cetak (A4)</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isLoading || !data || isExportingPdf}
              className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Unduh PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              Tutup
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="animate-spin text-amber-600" size={26} />
            <p className="text-xs font-semibold text-slate-400">Mengagregasi data transkrip nilai lintas semester...</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Header Ringkasan Ijazah & GPA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block uppercase">
                  Rata-Rata Ijazah (GPA)
                </span>
                <span className="text-2xl font-black text-amber-800 dark:text-amber-300">
                  {data.ringkasan?.rata_rata_ijazah || data.rata_rata_ijazah_kumulatif || 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Total Mata Pelajaran
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  {data.ringkasan?.total_mapel || (data.transkrip || []).length}
                </span>
              </div>

              <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 block uppercase">
                  Nilai UKK (Praktik)
                </span>
                <span className="text-base font-black text-purple-800 dark:text-purple-300 truncate block mt-1">
                  {data.ringkasan?.nilai_ukk?.nilai_praktik ? `${data.ringkasan.nilai_ukk.nilai_praktik} (${data.ringkasan.nilai_ukk.predikat || 'BAIK'})` : 'Terintegrasi'}
                </span>
              </div>

              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                  Status Kelulusan
                </span>
                <Badge variant="outline" className="mt-1 bg-emerald-100 dark:bg-emerald-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold text-[11px]">
                  {data.ringkasan?.status_kelulusan || 'MEMENUHI KRITERIA'}
                </Badge>
              </div>
            </div>

            {/* Tabel Transkrip Nilai Lintas Semester */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="p-3 text-center w-10">No</th>
                    <th className="p-3 min-w-[200px]">Mata Pelajaran</th>
                    <th className="p-3 text-center w-24">Kelompok</th>
                    {headers.map((h: any) => (
                      <th key={`transkrip-header-${h.index}`} className="p-3 text-center w-16 sm:w-20">
                        {h.label}
                      </th>
                    ))}
                    <th className="p-3 text-center w-24 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                      Rata-Rata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(data.transkrip || data.mata_pelajaran || []).map((t: any, idx: number) => {
                    const cleanKode = t.kode_mapel && t.kode_mapel.length > 10 && t.kode_mapel.includes('_')
                      ? t.kode_mapel.split('_')[0]
                      : t.kode_mapel;

                    return (
                      <tr key={t.mapel_id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {t.mapel_name || t.nama_mapel}
                          </div>
                          {cleanKode && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {cleanKode}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                            {t.kelompok_mapel || 'A (UMUM)'}
                          </span>
                        </td>

                        {/* Nilai Per Semester */}
                        {headers.map((h: any) => {
                          const val = t.nilai_per_semester?.[h.label] ?? t.scores?.[h.index]?.nilai;
                          const hasVal = val !== null && val !== undefined && val > 0;

                          return (
                            <td key={`transkrip-cell-${t.mapel_id}-${h.index}`} className="p-2 text-center font-bold">
                              {hasVal ? (
                                <span className="font-mono text-slate-800 dark:text-slate-200">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-mono text-xs">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Rata-Rata Mapel */}
                        <td className="p-2.5 text-center font-black text-amber-700 dark:text-amber-400 text-sm font-mono bg-amber-50/30 dark:bg-amber-950/10">
                          {(t.rata_rata_mapel || t.rata_rata) ? (t.rata_rata_mapel || t.rata_rata) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-10">Data transkrip nilai belum tersedia untuk siswa ini.</p>
        )}
      </Card>
    </div>
  );
});

TranskripModal.displayName = 'TranskripModal';
