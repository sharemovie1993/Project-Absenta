import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getStrukturTree } from '@/api/academic/strukturOrganisasi.api';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { TujuanPembelajaranItem } from '@/api/atp.api';
import { toast } from 'react-hot-toast';
import { Check } from 'lucide-react';

export interface ProtaPromesPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  docMode: 'PROTA' | 'PROMES';
  promesSemester: 'GANJIL' | 'GENAP';
  mapelNama: string;
  fase: string;
  tahunPelajaranLabel: string;
  namaAtp: string;
  guruNama: string;
  guruNip?: string;
  tpList: TujuanPembelajaranItem[];
  tpSemesterMap: Record<string, 'GANJIL' | 'GENAP'>;
  promesTpList: TujuanPembelajaranItem[];
  promesWeeks: Record<string, boolean>;
  months: string[];
  protaSummary: { ganjilJp: number; genapJp: number; totalJp: number };
}

export const ProtaPromesPrintModal: React.FC<ProtaPromesPrintModalProps> = ({
  isOpen,
  onClose,
  docMode,
  promesSemester,
  mapelNama,
  fase,
  tahunPelajaranLabel,
  namaAtp,
  guruNama,
  guruNip,
  tpList,
  tpSemesterMap,
  promesTpList,
  promesWeeks,
  months,
  protaSummary,
}) => {
  const printDeskRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profil-print'],
    queryFn: () => sekolahApi.getProfil().catch(() => null),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const { data: strukturRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-print'],
    queryFn: () => getStrukturTree().catch(() => []),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const headerData = usePrintHeaderData(sekolahRes as any);

  const signers = useMemo(() => {
    const nodes: any[] = Array.isArray(strukturRes) ? strukturRes : (strukturRes as any)?.data || [];
    const flat: any[] = [];
    const walk = (arr: any[]) => {
      for (const n of arr) {
        flat.push(n);
        if (Array.isArray(n.children)) walk(n.children);
      }
    };
    walk(nodes);

    const kepsekNode = flat.find((n) =>
      String(n.kode_posisi || n.jabatan || '').toUpperCase().includes('KEPALA_SEKOLAH') ||
      String(n.nama_jabatan || '').toLowerCase().includes('kepala sekolah')
    );
    const wakaKuriNode = flat.find((n) =>
      String(n.kode_posisi || n.jabatan || '').toUpperCase().includes('KURIKULUM') ||
      String(n.nama_jabatan || '').toLowerCase().includes('kurikulum')
    );

    const sekolahData = (sekolahRes as any)?.data || sekolahRes || {};
    const kepsekNama =
      kepsekNode?.Guru?.nama_guru ||
      kepsekNode?.nama_pejabat ||
      sekolahData?.kepala_sekolah ||
      'Kepala Sekolah';
    const kepsekNip = kepsekNode?.Guru?.nip || sekolahData?.nip_kepala_sekolah || '........................';

    const wakaNama =
      wakaKuriNode?.Guru?.nama_guru ||
      wakaKuriNode?.nama_pejabat ||
      'Wakasek Kurikulum';
    const wakaNip = wakaKuriNode?.Guru?.nip || '........................';

    const kota = sekolahData?.kabupaten_kota || sekolahData?.kota || 'Purwakarta';

    return { kepsekNama, kepsekNip, wakaNama, wakaNip, kota };
  }, [strukturRes, sekolahRes]);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const orientation = docMode === 'PROMES' ? 'landscape' : 'portrait';

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const result = await capturePrintSheetsToPdfBlob(printDeskRef.current, {
        orientation,
        fileName: `${docMode}_${mapelNama}_Fase_${fase}_${tahunPelajaranLabel}.pdf`,
        scale: 2.5,
      });

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`PDF ${docMode} True WYSIWYG berhasil diunduh!`);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal merender PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        docMode === 'PROTA'
          ? 'Pratinjau Cetak Program Tahunan (PROTA)'
          : `Pratinjau Cetak Program Semester ${promesSemester} (PROMES)`
      }
      subtitle={`${mapelNama} • Fase ${fase} • TP ${tahunPelajaranLabel}`}
      orientation={orientation}
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Merender PDF...' : 'Unduh PDF (WYSIWYG)'}
      printButtonText="Cetak Dokumen"
      size="5xl"
    >
      <div ref={printDeskRef} className="py-2">
        <div id="print-desk-canvas-area">
          <PrintDocumentSheet
            orientation={orientation}
            pageNumber={1}
            totalPages={1}
            footerText={`${docMode} ${mapelNama} — Fase ${fase} (${tahunPelajaranLabel})`}
          >
            <PrintHeader
              data={headerData}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* Judul Resmi */}
            <div className="text-center my-3 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
                {docMode === 'PROTA'
                  ? 'PROGRAM TAHUNAN (PROTA)'
                  : `PROGRAM SEMESTER ${promesSemester} (PROMES)`}
              </h2>
              <p className="text-[11px] font-bold text-slate-700">
                KURIKULUM MERDEKA • TAHUN PELAJARAN {tahunPelajaranLabel}
              </p>
            </div>

            {/* Identitas Mapel */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-800 mb-3 border border-slate-300 rounded-md p-2.5 bg-slate-50/50">
              <div><span className="font-bold">Mata Pelajaran:</span> {mapelNama}</div>
              <div><span className="font-bold">Guru Pengampu:</span> {guruNama}</div>
              <div><span className="font-bold">Fase / Tingkat:</span> Fase {fase}</div>
              <div><span className="font-bold">Sumber ATP:</span> {namaAtp || '-'}</div>
            </div>

            {/* Tabel Data */}
            {docMode === 'PROTA' ? (
              <table className="w-full border-collapse text-[10.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-800 px-2 py-1.5 w-8 text-center">No</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Kode TP</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Tujuan Pembelajaran / Materi Pokok</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Capaian Pembelajaran (CP)</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Semester</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-16 text-center">Alokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {tpList.map((tp, idx) => {
                    const key = tp.id || tp.kode_tp || String(idx);
                    const sem = tpSemesterMap[key] || 'GANJIL';
                    return (
                      <tr key={key}>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1.5 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{tp.deskripsi_tp || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">
                          {sem === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)'}
                        </td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-bold">{tp.alokasi_jp || 0} JP</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border border-slate-800 px-2 py-1.5 text-right">
                      Rekapitulasi Alokasi Jam Pelajaran (Ganjil: {protaSummary.ganjilJp} JP • Genap: {protaSummary.genapJp} JP)
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center">TOTAL</td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center">{protaSummary.totalJp} JP</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-[9.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-7 text-center">No</th>
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-14 text-center">Kode</th>
                    <th rowSpan={2} className="border border-slate-800 px-2 py-1 text-left">Tujuan Pembelajaran / Materi Pokok</th>
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-10 text-center">JP</th>
                    {months.map((m) => (
                      <th key={m} colSpan={4} className="border border-slate-800 px-1 py-1 text-center">
                        {m}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-100 font-bold text-[8.5px]">
                    {months.map((m) =>
                      [1, 2, 3, 4].map((w) => (
                        <th key={`${m}-${w}`} className="border border-slate-800 w-5 py-0.5 text-center">
                          {w}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {promesTpList.map((tp, idx) => {
                    const key = tp.id || tp.kode_tp || String(idx);
                    return (
                      <tr key={key}>
                        <td className="border border-slate-800 px-1.5 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-1.5 py-1 text-center font-bold">{tp.alokasi_jp || 0}</td>
                        {months.map((_, mIdx) =>
                          [0, 1, 2, 3].map((wIdx) => {
                            const checked = Boolean(promesWeeks[`${key}_${mIdx}_${wIdx}`]);
                            return (
                              <td
                                key={`${mIdx}-${wIdx}`}
                                className={`border border-slate-800 text-center ${checked ? 'bg-slate-200 font-black' : ''}`}
                              >
                                {checked ? <Check className="w-3 h-3 mx-auto text-slate-900" /> : ''}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Standar Tanda Tangan 2-Tier */}
            <div className="mt-6 text-[10.5px] text-slate-900 break-inside-avoid">
              {/* Baris 1: Verifikator (Kiri) + Pembuat Dokumen (Kanan) */}
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p>&nbsp;</p>
                  <p>Diverifikasi oleh,</p>
                  <p className="font-bold">Wakasek Bidang Kurikulum</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{signers.wakaNama}</p>
                  <p className="text-[9.5px]">NIP. {signers.wakaNip}</p>
                </div>
                <div className="text-center">
                  <p>{signers.kota}, {todayFormatted}</p>
                  <p>Disusun oleh,</p>
                  <p className="font-bold">Guru Mata Pelajaran</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{guruNama}</p>
                  <p className="text-[9.5px]">NIP. {guruNip || '........................'}</p>
                </div>
              </div>

              {/* Baris 2: Kepala Sekolah (Tengah Bawah) */}
              <div className="mt-4 flex justify-center">
                <div className="text-center min-w-[220px]">
                  <p>Mengetahui / Menyetujui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{signers.kepsekNama}</p>
                  <p className="text-[9.5px]">NIP. {signers.kepsekNip}</p>
                </div>
              </div>
            </div>
          </PrintDocumentSheet>
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
