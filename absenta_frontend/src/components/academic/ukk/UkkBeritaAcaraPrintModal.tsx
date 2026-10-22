import React, { useRef } from 'react';
import { Printer, Download, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PrintHeader, usePrintHeaderData } from '@/components/ui/PrintHeader';
import {
  generatePdfUkkBeritaAcara,
  type UkkBeritaAcaraItem,
  type UkkBeritaAcaraPrintData,
} from '@/utils/print/modules/pdfUkkBeritaAcara';
import toast from 'react-hot-toast';

export interface UkkBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  beritaAcara: UkkBeritaAcaraItem | null;
  jurusanNama?: string;
  tahunPelajaran?: string;
  judulPenugasan?: string;
}

export const UkkBeritaAcaraPrintModal: React.FC<UkkBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  beritaAcara,
  jurusanNama = 'Kejuruan',
  tahunPelajaran,
  judulPenugasan = 'Ujian Praktik Kejuruan Mandiri',
}) => {
  const printRef = useRef<HTMLDivElement | null>(null);

  // Universal Hook: Resolves active Tenant & Sekolah data, plus pre-converts logos to Base64
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah;

  if (!beritaAcara) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const payload: UkkBeritaAcaraPrintData = {
        jurusanNama,
        tahunPelajaran: tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        judulPenugasan,
        sekolah: {
          nama: tenantInfo.name || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: tenantInfo.address || '',
          kota: (rawSekolah as any)?.kota || 'Purwakarta',
          telepon: tenantInfo.phone,
          email: tenantInfo.email,
          website: tenantInfo.website,
          kepala_sekolah: (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: (rawSekolah as any)?.nip_kepala || '-',
          nama_dinas_atas: tenantInfo.nama_dinas_atas,
          nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
          nama_cabang_dinas: tenantInfo.nama_cabang_dinas,
          print_header_lines: tenantInfo.print_header_lines,
        },
        options: {
          logoDaerahBase64,
          logoSekolahBase64,
        },
        beritaAcara,
      };

      const { blobUrl } = generatePdfUkkBeritaAcara(payload);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BERITA_ACARA_UKK_${beritaAcara.nama_sesi.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Gagal mengunduh dokumen PDF');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Berita Acara UKK"
      size="5xl"
    >
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground font-medium">Sesi:</span>
            <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-md">
              {beritaAcara.nama_sesi}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • Format Standar A4 Portrait (210 × 297 mm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh PDF (jsPDF)
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBrowserPrint}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* Printable Paper Preview (A4 Portrait Container) */}
        <div className="overflow-y-auto max-h-[78vh] p-3 sm:p-6 bg-slate-200/60 dark:bg-slate-950/70 rounded-xl border flex justify-center">
          <div
            ref={printRef}
            id="print-area-berita-acara"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-serif text-[12px] leading-relaxed select-text border border-slate-300 dark:border-slate-800"
            style={{ minHeight: '297mm' }}
          >
            {/* === KOP SURAT RESMI MENGGUNAKAN KOMPONEN PrintHeader.tsx === */}
            <PrintHeader variant="portrait" tenantInfo={tenantInfo} />

            {/* Title */}
            <div className="text-center my-4 space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                BERITA ACARA PELAKSANAAN
              </h3>
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                UJI KOMPETENSI KEAHLIAN (UKK)
              </h3>
              <p className="text-[11px] font-normal italic text-slate-700">
                Tahun Pelajaran {tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
              </p>
            </div>

            {/* Narration */}
            <p className="text-justify indent-8 my-4 text-[11.5px] leading-normal">
              Pada hari ini, tanggal <strong>{beritaAcara.tanggal}</strong>, bertempat di Ruang/Laboratorium{' '}
              <strong>{beritaAcara.ruang}</strong> {tenantInfo.name || 'SMK'}, telah diselenggarakan
              Ujian Kompetensi Keahlian (UKK) untuk Program Keahlian <strong>{jurusanNama}</strong> dengan rincian pelaksanaan sebagai berikut:
            </p>

            {/* Key Information Table */}
            <table className="w-full my-3 text-[11.5px] border-collapse">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="w-6 py-1 align-top font-bold">1.</td>
                  <td className="w-48 py-1 align-top font-semibold">Sesi Pelaksanaan</td>
                  <td className="py-1 align-top">
                    : {beritaAcara.nama_sesi} (Pukul {beritaAcara.jam_mulai} s.d {beritaAcara.jam_selesai} WIB)
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">2.</td>
                  <td className="py-1 align-top font-semibold">Program Keahlian</td>
                  <td className="py-1 align-top">: {jurusanNama}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">3.</td>
                  <td className="py-1 align-top font-semibold">Judul Penugasan / Soal</td>
                  <td className="py-1 align-top">: {judulPenugasan}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">4.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Peserta Terdaftar</td>
                  <td className="py-1 align-top">: {beritaAcara.jumlah_peserta} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">5.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Peserta Hadir</td>
                  <td className="py-1 align-top font-bold text-emerald-800">: {beritaAcara.jumlah_hadir} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">6.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Tidak Hadir</td>
                  <td className="py-1 align-top font-bold text-rose-800">: {beritaAcara.jumlah_tidak_hadir} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">7.</td>
                  <td className="py-1 align-top font-semibold">Penguji Internal (Guru)</td>
                  <td className="py-1 align-top">: {beritaAcara.penguji_internal || '-'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">8.</td>
                  <td className="py-1 align-top font-semibold">Penguji Eksternal (DU/DI)</td>
                  <td className="py-1 align-top">
                    : {beritaAcara.penguji_eksternal || '-'}{' '}
                    {beritaAcara.mitra_nama ? `(${beritaAcara.mitra_nama})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Catatan Pelaksanaan */}
            <div className="my-4">
              <p className="font-bold text-[11.5px] mb-1">Catatan Pelaksanaan & Jalannya Ujian:</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed italic">
                {beritaAcara.catatan_pelaksanaan ||
                  'Ujian UKK berjalan dengan tertib, aman, dan mematuhi seluruh standar SOP keselamatan kerja dan instrumen penilaian kejuruan.'}
              </div>
            </div>

            {/* Kendala if any */}
            {beritaAcara.kendala && (
              <div className="my-3">
                <p className="font-bold text-[11.5px] mb-1">Kendala yang Dihadapi & Solusi:</p>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed">
                  {beritaAcara.kendala}
                </div>
              </div>
            )}

            <p className="my-4 text-[11.5px] leading-normal">
              Demikian Berita Acara ini dibuat dengan sebenarnya sesuai dengan kondisi pelaksanaan di lapangan untuk dapat dipergunakan sebagaimana mestinya.
            </p>

            {/* Signature Blocks with Digital Pen Stamps */}
            <div className="mt-8 pt-2">
              <div className="text-right text-[11px] mb-4">
                {sekolahData?.kota || 'Purwakarta'}, {beritaAcara.tanggal}
              </div>

              {/* Baris 1: Penguji Internal & Penguji Eksternal */}
              <div className="grid grid-cols-2 gap-8 text-center text-[11.5px]">
                <div>
                  <p className="font-normal">Penguji Internal,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_penguji_internal ? (
                      <img
                        src={beritaAcara.ttd_penguji_internal}
                        alt="TTD Penguji Internal"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.penguji_internal || 'Penguji Internal'}</p>
                </div>

                <div>
                  <p className="font-normal">Penguji Eksternal (DU/DI),</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_penguji_eksternal ? (
                      <img
                        src={beritaAcara.ttd_penguji_eksternal}
                        alt="TTD Penguji Eksternal"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.penguji_eksternal || 'Penguji Eksternal'}</p>
                  {beritaAcara.mitra_nama && (
                    <p className="text-[10px] text-slate-600">{beritaAcara.mitra_nama}</p>
                  )}
                </div>
              </div>

              {/* Baris 2: Panitia / Kaprog & Kepala Sekolah */}
              <div className="grid grid-cols-2 gap-8 text-center text-[11.5px] mt-6">
                <div>
                  <p className="font-normal">Ketua Panitia / Kaprog,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_panitia ? (
                      <img
                        src={beritaAcara.ttd_panitia}
                        alt="TTD Panitia"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.panitia || 'Panitia UKK'}</p>
                </div>

                <div>
                  <p className="font-normal">Mengetahui,</p>
                  <p className="font-normal -mt-0.5">Kepala Sekolah,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    <div className="h-14" />
                  </div>
                  <p className="font-bold underline">{sekolahData?.kepala_sekolah || 'Kepala Sekolah'}</p>
                  <p className="text-[10px] text-slate-600">NIP. {sekolahData?.nip_kepala || '-'}</p>
                </div>
              </div>
            </div>

            {/* Lampiran Foto Dokumentasi (jika ada) */}
            {beritaAcara.foto_dokumentasi && beritaAcara.foto_dokumentasi.length > 0 && (
              <div className="mt-12 pt-8 border-t border-dashed border-slate-300 page-break-before">
                <div className="text-center mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    LAMPIRAN DOKUMENTASI VISUAL PELAKSANAAN UKK
                  </h4>
                  <p className="text-[10px] text-slate-600">
                    Sesi: {beritaAcara.nama_sesi} — Ruang: {beritaAcara.ruang} ({beritaAcara.tanggal})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {beritaAcara.foto_dokumentasi.map((foto, fIdx) => (
                    <div
                      key={fIdx}
                      className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col items-center"
                    >
                      <img
                        src={foto}
                        alt={`Dokumentasi ${fIdx + 1}`}
                        className="w-full h-44 object-cover rounded bg-white"
                      />
                      <p className="text-[10px] text-slate-600 italic mt-1.5 text-center">
                        Dokumentasi Pelaksanaan #{fIdx + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
