import React, { useState, useRef, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import toast from 'react-hot-toast';

export interface PklMatriksTpPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanNama?: string;
  tahunPelajaran?: string;
  mitraList: Array<{
    mitra_id: string;
    nama_mitra: string;
    bidang_usaha?: string;
    alamat?: string;
    siswa_count: number;
    rombel_list?: string[];
    has_tp: boolean;
    deskripsi_tp?: string;
  }>;
  kaprogNama?: string;
  kaprogNip?: string;
  wakasekHubinNama?: string;
  wakasekHubinNip?: string;
  kepsekNama?: string;
  kepsekNip?: string;
}

export const PklMatriksTpPrintModal: React.FC<PklMatriksTpPrintModalProps> = ({
  isOpen,
  onClose,
  jurusanNama = 'Kejuruan',
  tahunPelajaran,
  mitraList = [],
  kaprogNama: propKaprogNama,
  kaprogNip: propKaprogNip,
  wakasekHubinNama: propHubinNama,
  wakasekHubinNip: propHubinNip,
  kepsekNama: propKepsekNama,
  kepsekNip: propKepsekNip,
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Penandatangan yang dapat disesuaikan
  const [kaprogNama, setKaprogNama] = useState<string>('');
  const [kaprogNip, setKaprogNip] = useState<string>('');
  const [wakasekHubinNama, setWakasekHubinNama] = useState<string>('');
  const [wakasekHubinNip, setWakasekHubinNip] = useState<string>('');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState<string>('');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState<string>('');

  const printSheetRef = useRef<HTMLDivElement>(null);

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah;

  useEffect(() => {
    setKaprogNama(propKaprogNama || 'Ketua Program Keahlian');
    setKaprogNip(propKaprogNip || '-');
    setWakasekHubinNama(propHubinNama || 'Wakasek Bidang Hubinmas');
    setWakasekHubinNip(propHubinNip || '-');
    setKepalaSekolahNama(propKepsekNama || (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah');
    setKepalaSekolahNip(propKepsekNip || (rawSekolah as any)?.nip_kepala || '-');
  }, [propKaprogNama, propKaprogNip, propHubinNama, propHubinNip, propKepsekNama, propKepsekNip, rawSekolah]);

  if (!isOpen) return null;

  const totalSiswa = mitraList.reduce((acc, curr) => acc + (curr.siswa_count || 0), 0);
  const totalMitra = mitraList.length;
  const filledMitra = mitraList.filter((m) => m.has_tp).length;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const sheetElement = (printSheetRef.current?.querySelector('.print-sheet') as HTMLElement) || printSheetRef.current;
      if (sheetElement) {
        toast.loading('Menyiapkan dokumen PDF presisi A4 Landscape...', { id: 'pdf-tp-export' });
        const html2canvas = (await import('html2canvas-pro')).default;
        const { jsPDF } = await import('jspdf');

        const canvas = await html2canvas(sheetElement, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
        const filename = `MATRIKS_TP_PKL_${jurusanNama.replace(/\s+/g, '_')}_TA_${(tahunPelajaran || 'TA').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        pdf.save(filename);
        toast.success('Dokumen PDF berhasil diunduh (Presisi 100% Layar)', { id: 'pdf-tp-export' });
      }
    } catch (err) {
      console.error('Canvas export error:', err);
      toast.error('Gagal mengunduh dokumen PDF', { id: 'pdf-tp-export' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Matriks Rumusan Tujuan Pembelajaran (TP) PKL"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Konsentrasi Keahlian:</span>
          <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
            {jurusanNama}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Format Resmi KOSP/Akreditasi (A4 Landscape 297 × 210 mm)
          </span>
        </div>
      }
      orientation="landscape"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Mengunduh...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
    >
      <div ref={printSheetRef} className="w-full flex flex-col items-center">
        <PrintDocumentSheet
          orientation="landscape"
          pageNumber={1}
          totalPages={1}
          footerText={`Matriks Capaian & Tujuan Pembelajaran PKL — ${jurusanNama} (${tahunPelajaran || '-'})`}
        >
          {/* KOP SURAT RESMI SEKOLAH */}
          <PrintHeader
            variant="landscape"
            tenantInfo={tenantInfo}
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
          />

          {/* JUDUL DOKUMEN RESMI */}
          <div className="text-center my-3 space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              MATRIKS RUMUSAN TUJUAN PEMBELAJARAN (TP)
            </h3>
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              MATA PELAJARAN PRAKTIK KERJA LAPANGAN (PKL)
            </h3>
            <p className="text-[11px] font-medium text-slate-700">
              Tahun Pelajaran {tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`} • Fase F (Kelas XII)
            </p>
          </div>

          {/* METADATA DOKUMEN */}
          <div className="my-2.5 p-2 bg-slate-50 border border-slate-300 rounded text-[10.5px]">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-44 font-semibold text-slate-700 py-0.5">Program / Konsentrasi Keahlian</td>
                  <td className="font-bold text-slate-900 py-0.5">: {jurusanNama}</td>
                  <td className="w-40 font-semibold text-slate-700 py-0.5">Total Mitra Industri (DUDI)</td>
                  <td className="font-bold text-slate-900 py-0.5">: {totalMitra} Perusahaan ({filledMitra} Terisi TP)</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700 py-0.5">Mata Pelajaran / Elemen</td>
                  <td className="text-slate-900 py-0.5">: Praktik Kerja Lapangan (Elemen Teknis Kejuruan & Budaya Kerja)</td>
                  <td className="font-semibold text-slate-700 py-0.5">Total Peserta PKL</td>
                  <td className="font-bold text-slate-900 py-0.5">: {totalSiswa} Siswa</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL MATRIKS TP DUDI */}
          <div className="my-2 overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-black font-bold border-b border-black text-center">
                  <th className="border-r border-black p-1.5 w-8">No</th>
                  <th className="border-r border-black p-1.5 w-56 text-left">Mitra Industri (DUDI)</th>
                  <th className="border-r border-black p-1.5 w-32">Bidang Usaha</th>
                  <th className="border-r border-black p-1.5 w-28">Peserta & Rombel</th>
                  <th className="p-1.5 text-left">Rumusan Capaian & Tujuan Pembelajaran (TP) Khusus DUDI</th>
                </tr>
              </thead>
              <tbody>
                {mitraList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                      Belum ada mitra penempatan PKL pada tahun pelajaran ini.
                    </td>
                  </tr>
                ) : (
                  mitraList.map((mitra, index) => (
                    <tr key={mitra.mitra_id} className="border-b border-black/70 align-top">
                      <td className="border-r border-black p-1.5 text-center font-medium">{index + 1}</td>
                      <td className="border-r border-black p-1.5">
                        <div className="font-bold text-black">{mitra.nama_mitra}</div>
                        {mitra.alamat && (
                          <div className="text-[9px] text-slate-600 line-clamp-1 mt-0.5">
                            {mitra.alamat}
                          </div>
                        )}
                      </td>
                      <td className="border-r border-black p-1.5 text-slate-700 text-center">
                        {mitra.bidang_usaha || '-'}
                      </td>
                      <td className="border-r border-black p-1.5 text-center">
                        <div className="font-bold text-black">{mitra.siswa_count} Siswa</div>
                        <div className="text-[9px] text-slate-600">
                          {mitra.rombel_list?.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="p-1.5 text-black leading-relaxed">
                        {mitra.has_tp && mitra.deskripsi_tp ? (
                          <div className="font-normal italic">
                            "{mitra.deskripsi_tp}"
                          </div>
                        ) : (
                          <div className="text-slate-400 italic font-normal">
                            Belum ada rumusan deskripsi capaian pembelajaran khusus yang ditetapkan.
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* CATATAN RESMI */}
          <div className="my-2 p-1.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] text-slate-600">
            <strong>Catatan Kepatuhan Kurikulum:</strong> Rumusan Tujuan Pembelajaran (TP) di atas diselaraskan berdasarkan Standard Operating Procedure (SOP) mitra dunia usaha/industri dan disahkan untuk dicetak pada buku Rapor PKL serta Sertifikat Praktik Kerja Lapangan siswa.
          </div>

          {/* TANDA TANGAN RESMI 3-TIER */}
          <div className="mt-4 pt-1">
            <div className="grid grid-cols-2 gap-8 text-center text-[10px]">
              {/* Kolom Kiri: Verifikator (Wakasek Hubin) */}
              <div>
                <p className="text-slate-800">Diverifikasi oleh,</p>
                <p className="font-bold text-black -mt-0.5">Wakil Kepala Sekolah Bidang Hubinmas</p>
                <div className="h-12 flex items-center justify-center my-0.5" />
                <p className="font-bold underline text-black">{wakasekHubinNama}</p>
                <p className="text-[9px] text-slate-600">NIP. {wakasekHubinNip}</p>
              </div>

              {/* Kolom Kanan: Penyusun (Kaprog) */}
              <div>
                <div className="text-[10px] text-black mb-0.5">
                  {(sekolahData as any)?.kota || 'Purwakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <p className="text-slate-800">Dibuat oleh,</p>
                <p className="font-bold text-black -mt-0.5">Ketua Program Keahlian {jurusanNama}</p>
                <div className="h-12 flex items-center justify-center my-0.5" />
                <p className="font-bold underline text-black">{kaprogNama}</p>
                <p className="text-[9px] text-slate-600">NIP. {kaprogNip}</p>
              </div>
            </div>

            {/* Baris 2: Pengesahan Kepala Sekolah (Di Tengah Bawah) */}
            <div className="mt-3 flex justify-center text-center text-[10px]">
              <div className="w-80">
                <p className="text-slate-800">Mengetahui / Mengesahkan,</p>
                <p className="font-bold text-black -mt-0.5">Kepala Sekolah</p>
                <div className="h-12 flex items-center justify-center my-0.5" />
                <p className="font-bold underline text-black">
                  {kepalaSekolahNama || (sekolahData as any)?.kepala_sekolah || 'Kepala Sekolah'}
                </p>
                <p className="text-[9px] text-slate-600">
                  NIP. {kepalaSekolahNip || (sekolahData as any)?.nip_kepala || '-'}
                </p>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
