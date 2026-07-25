import React, { useState, useEffect } from 'react';
import { BookOpen, Download, Loader2, Printer, CheckCircle2, ShieldCheck, FileText, FileSpreadsheet, CheckSquare } from 'lucide-react';
import { Modal, Button, Badge } from '../../ui';
import { PrintHeader } from '../../ui/PrintHeader';
import { useAuth } from '../../../hooks/useAuth';
import { sekolahApi, type Sekolah } from '../../../api/academic/sekolah.api';
import { getTenantById } from '../../../api/tenants.api';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';






export interface PerangkatAjarItemData {
  id?: string;
  judul: string;
  jenis: string;
  status?: string;
  catatan_reviewer?: string | null;
  Guru?: { nama_guru?: string; nip?: string };
  Mapel?: { nama_mapel?: string; kode_mapel?: string };
  TahunPelajaran?: { tahun?: string };
  Semester?: { nama_semester?: string };
}

interface PreviewPdfState {
  isOpen: boolean;
  url: string | null;
  filename: string;
  title: string;
  loading: boolean;
  itemData?: PerangkatAjarItemData | null;
}

interface PerangkatAjarPdfPreviewModalProps {
  previewPdfState: PreviewPdfState;
  onClose: () => void;
  onDownload: () => void;
}

const JENIS_LABELS: Record<string, string> = {
  MODUL_AJAR: 'Modul Ajar',
  ATP: 'ATP (Alur Tujuan Pembelajaran)',
  MODUL_PROJEK: 'Modul Projek (P5)',
  PROTA: 'Program Tahunan (PROTA)',
  PROMES: 'Program Semester (PROMES)',
  KKTP: 'KKTP',
  RPP: 'RPP Legacy',
  SILABUS: 'Silabus Legacy',
};

export default function PerangkatAjarPdfPreviewModal({
  previewPdfState,
  onClose,
  onDownload,
}: PerangkatAjarPdfPreviewModalProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'PDF_NATIVE' | 'NASKAH_RESMI'>('PDF_NATIVE');
  const [tenantData, setTenantData] = useState<any>(user?.tenant || null);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);


  const item = previewPdfState.itemData;

  // Deteksi dokumen makro yang butuh orientasi LANDSCAPE
  const isMacroDoc = ['ATP', 'PROTA', 'PROMES'].includes((item?.jenis || '').toUpperCase());

  useEffect(() => {
    const loadTenantDetails = async () => {
      let merged: any = { ...user?.tenant };

      if (user?.tenant_id) {
        try {
          const res = await getTenantById(user.tenant_id);
          if (res.success && res.data) {
            merged = { ...merged, ...res.data };
          }
        } catch (e) {}
      }

      try {
        const sek = await sekolahApi.getProfile();
        if (sek) {
          merged.logo_url = merged.logo_url || (sek as any).logo_sekolah_url || (sek as any).logo_url;
          merged.logo_daerah_url = merged.logo_daerah_url || (sek as any).logo_daerah_url;
          merged.address = merged.address || sek.alamat;
          merged.phone = merged.phone || sek.telepon;
          merged.email = merged.email || sek.email;
          merged.website = merged.website || sek.website;
        }
      } catch (e) {}

      // Fallback logo if tenant hasn't set custom logos yet
      if (!merged.logo_daerah_url && !merged.logo_url) {
        merged.logo_daerah_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
        merged.logo_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
      }

      setTenantData(merged);
    };

    loadTenantDetails();
  }, [user?.tenant_id]);




  const handlePrintDocument = () => {
    const printElement = document.getElementById('printable-official-document');
    if (!printElement) {
      // Fallback: buka file PDF asli jika ada
      if (previewPdfState.url) {
        window.open(previewPdfState.url, '_blank');
      } else {
        toast.error('Dokumen belum dimuat, silakan tunggu...');
      }
      return;
    }

    // Buka window print baru dengan orientasi yang tepat
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      toast.error('Popup diblokir browser. Izinkan popup untuk mencetak.');
      return;
    }

    const pageSize = isMacroDoc
      ? 'size: A4 landscape; margin: 1.5cm 2cm 2cm 2.5cm;'
      : 'size: A4 portrait; margin: 2.5cm 2.5cm 2.5cm 3cm;';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${item?.judul || 'Perangkat Ajar Kurikulum Merdeka'}</title>
        <style>
          @page { ${pageSize} }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
          th, td { border: 1px solid #475569; padding: 5pt 7pt; vertical-align: top; font-size: 10pt; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
          h1, h2, h3 { font-family: Arial, sans-serif; margin: 0 0 6pt; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${printElement.innerHTML}
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };






  const handleExportToWord = () => {

    const printElement = document.getElementById('printable-official-document');
    if (!printElement) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${item?.judul || 'Dokumen Resmi Perangkat Ajar'}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: ${isMacroDoc ? '29.7cm 21.0cm' : '21.0cm 29.7cm'};
            mso-page-orientation: ${isMacroDoc ? 'landscape' : 'portrait'};
            margin: ${isMacroDoc ? '1.5cm 2cm 2cm 2.5cm' : '2.5cm 2.5cm 2.5cm 3cm'};
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #0f172a;
          }
          h1, h2, h3, h4 {
            font-family: 'Arial', sans-serif;
            font-weight: bold;
          }
          .page-card {
            page-break-after: always;
            margin-bottom: 25pt;
            padding-bottom: 15pt;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 8pt;
            margin-bottom: 12pt;
          }
          th, td {
            border: 1px solid #475569;
            padding: 6pt 8pt;
            vertical-align: top;
            font-size: 10pt;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: left;
          }
          .border-b-2 { border-bottom: 3px double #000; padding-bottom: 8pt; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .underline { text-decoration: underline; }
          .bg-slate-100, .bg-slate-50 { background-color: #f8fafc; }
          .bg-slate-900 { background-color: #0f172a; color: #ffffff; }
          .bg-emerald-100 { background-color: #d1fae5; color: #065f46; }
          ul { margin-top: 4pt; margin-bottom: 4pt; padding-left: 18pt; }
          li { margin-bottom: 2pt; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          ${printElement.innerHTML}
        </div>
      </body>
      </html>
    `;


    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });

    const safeTitle = (item?.judul || previewPdfState.title || 'perangkat_ajar').toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_dokumen_resmi.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={previewPdfState.isOpen}
      onClose={onClose}
      title={previewPdfState.title || 'Pratinjau Perangkat Ajar Dokumen Resmi Kurikulum Merdeka'}
      size={isMacroDoc ? 'full' : '5xl'}
      disableClose={true}
    >
      <div className="space-y-4">
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
              Dokumen Resmi Kurikulum Merdeka (Siap Cetak &amp; Siap Pakai)
            </span>
            {/* Orientasi badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isMacroDoc
                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {isMacroDoc ? '📜 LANDSCAPE A4 (297×210mm)' : '📄 PORTRAIT A4 (210×297mm)'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintDocument}
              disabled={isRenderingPdf}
              className="text-xs font-bold border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 text-slate-800"
            >
              {isRenderingPdf ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin text-indigo-600" />
                  Merender PDF...
                </>
              ) : (
                <>
                  <Printer size={14} className="mr-1.5 text-indigo-600" />
                  🖨️ Cetak / Buka PDF Viewer
                </>
              )}
            </Button>


            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportToWord}
              className="text-xs font-bold border-blue-300 dark:border-blue-700 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <FileSpreadsheet size={14} className="mr-1.5 text-blue-600" />
              📄 Ekspor ke Word (.doc)
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-3"
            >
              TUTUP [ X ]
            </Button>
          </div>
        </div>



        {/* Content View */}
        <div
          className="relative min-h-[75vh] max-h-[80vh] w-full bg-slate-200 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto overflow-y-auto p-4 md:p-8"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {previewPdfState.loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
              <Loader2 size={36} className="animate-spin text-indigo-500" />
              <span className="text-xs font-bold">Memuat naskah dokumen Kurikulum Merdeka 5 Halaman...</span>
            </div>
          ) : (
            /* OFFICIAL FULL 5-PAGE KURIKULUM MERDEKA PRINTED PAPER DOCUMENT */
            <div
              id="printable-official-document"
              className="space-y-12 mx-auto select-text font-serif text-slate-900 text-sm leading-relaxed"
              style={{ maxWidth: isMacroDoc ? '297mm' : '210mm' }}
            >


              
              {/* ==================== HALAMAN 1: INFORMASI UMUM & IDENTITAS LENGKAP ==================== */}
              <div className="page-card bg-white shadow-2xl rounded-none border border-slate-300 p-8 md:p-12 space-y-6 relative print:shadow-none print:p-0 print:border-0">
                <div className="absolute top-3 right-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Halaman 1 dari 5 — Informasi Umum
                </div>

                {/* Kop Surat Header Terpusat (Integrated PrintHeader Component) */}
                <div className="border-b-2 border-slate-900 pb-3">
                  <PrintHeader variant="portrait" tenantInfo={tenantData || user?.tenant || undefined} />
                </div>





                {/* Title Section */}
                <div className="text-center py-2 space-y-2">
                  <h2 className="text-base font-bold underline uppercase font-sans tracking-wide">
                    {item?.judul || previewPdfState.title}
                  </h2>
                  <div className="flex items-center justify-center gap-2 font-sans">
                    <Badge className="bg-slate-900 text-white font-bold text-[10px]">
                      {JENIS_LABELS[item?.jenis || 'MODUL_AJAR'] || item?.jenis || 'MODUL AJAR'}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                      <ShieldCheck size={12} className="mr-1 inline text-emerald-600" /> VERIFIED PLATFORM
                    </Badge>
                  </div>
                </div>

                {/* I. INFORMASI UMUM (Formal Bordered Table Grid) */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    I. INFORMASI UMUM PERANGKAT AJAR
                  </h3>
                  <table className="w-full text-xs border border-slate-400 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="w-1/3 p-2 font-bold bg-slate-100 border-r border-slate-300">Nama Penyusun / Guru Pengampu</td>
                        <td className="p-2 font-semibold">{item?.Guru?.nama_guru || 'Guru Pengajar Utama'} (NIP. {item?.Guru?.nip || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Mata Pelajaran & Kode Mapel</td>
                        <td className="p-2 font-semibold">{item?.Mapel?.nama_mapel || 'Mata Pelajaran Umum'} ({item?.Mapel?.kode_mapel || 'KBM-01'})</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Fase / Kelas / Jenjang</td>
                        <td className="p-2 font-semibold">Fase F / Kelas XI - XII / SMK-SMA</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Tahun Pelajaran & Semester</td>
                        <td className="p-2 font-semibold">Tahun Pelajaran {item?.TahunPelajaran?.tahun || '2025/2026'} ({item?.Semester?.nama_semester || 'Semester Genap'})</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Alokasi Waktu & Elemen CP</td>
                        <td className="p-2 font-semibold">2 x 45 Menit (4 JP / Minggu) — Elemen Keterampilan & Analisis Konsep</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Model & Metode Pembelajaran</td>
                        <td className="p-2 font-semibold">Problem-Based Learning (PBL) & Project-Based Learning (PjBL)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* II. SARANA PRASARANA & TARGET PESERTA DIDIK */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    II. SARANA PRASARANA & TARGET PESERTA DIDIK
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-1">
                      <span className="font-bold block text-slate-900">A. Sarana & Media Belajar:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        <li>Laptop, LCD Projector, & Akses Internet Sekolah</li>
                        <li>Slide Presentasi Interaktif & Modul Digital</li>
                        <li>Lembar Kerja Peserta Didik (LKPD) Cetak/Digital</li>
                        <li>Perangkat Software IDE / Alat Simulasi KBM</li>
                      </ul>
                    </div>

                    <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-1">
                      <span className="font-bold block text-slate-900">B. Target Peserta Didik:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        <li><b>Peserta Didik Reguler/Tipikal:</b> Umum, tidak ada kesulitan belajar (80%)</li>
                        <li><b>Kesulitan Belajar:</b> Pendampingan khusus dan tugas terintegrasi (10%)</li>
                        <li><b>Pencapaian Tinggi:</b> Pengayaan studi kasus tingkat lanjut (10%)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* III. PROFIL PELAJAR PANCASILA */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    III. DIMENSI PROFIL PELAJAR PANCASILA
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-xs">
                    {[
                      { title: 'Beriman & Bertaqwa', desc: 'Akhlak mulia & integritas' },
                      { title: 'Bernalar Kritis', desc: 'Menganalisis masalah rasional' },
                      { title: 'Gotong Royong', desc: 'Kolaborasi & kerja kelompok' },
                      { title: 'Kreatif', desc: 'Merancang solusi inovatif' },
                      { title: 'Mandiri', desc: 'Tanggung jawab atas tugas' },
                      { title: 'Kebinekaan Global', desc: 'Menghargai keragaman' }
                    ].map((item, idx) => (
                      <div key={idx} className="border border-slate-300 p-2 rounded bg-slate-50">
                        <div className="font-bold text-slate-900 text-[11px]">✓ {item.title}</div>
                        <div className="text-[10px] text-slate-600">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


              {/* ==================== HALAMAN 2: SINKRONISASI CAPAIAN & TUJUAN PEMBELAJARAN (CP, TP, ATP) ==================== */}
              <div className="page-card bg-white shadow-2xl rounded-none border border-slate-300 p-8 md:p-12 space-y-6 relative print:shadow-none print:p-0 print:border-0">
                <div className="absolute top-3 right-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Halaman 2 dari 5 — Capaian & Tujuan
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    IV. CAPAIAN PEMBELAJARAN (CP) & ALUR TUJUAN (ATP)
                  </h3>
                  
                  <div className="border border-slate-300 p-3 bg-slate-50 text-xs space-y-2">
                    <div>
                      <span className="font-bold text-slate-900">A. Elemen & Deskripsi Capaian Pembelajaran (CP):</span>
                      <p className="text-slate-800 italic mt-1 pl-2 border-l-2 border-slate-900">
                        "Pada akhir Fase F, peserta didik mampu memahami, menganalisis, serta mengaplikasikan pengetahuan dan keterampilan secara kritis, kreatif, dan mandiri sesuai standar kompetensi Kurikulum Merdeka yang relevan dengan tantangan abad ke-21."
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-xs text-slate-900">B. Alur Tujuan Pembelajaran (ATP Sub-Topik):</span>
                    <table className="w-full text-xs border border-slate-400 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-400">
                          <th className="p-2 border-r border-slate-300 w-16 text-center">Kode ATP</th>
                          <th className="p-2 border-r border-slate-300">Indikator Tujuan Pembelajaran (TP)</th>
                          <th className="p-2 w-24 text-center">Ranah / Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="p-2 font-bold text-center border-r border-slate-300 bg-slate-50">ATP 1.1</td>
                          <td className="p-2">Peserta didik mampu mengidentifikasi dan mendeskripsikan elemen-elemen utama topik pembelajaran secara komprehensif.</td>
                          <td className="p-2 text-center font-semibold">C3 (Menerapkan)</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2 font-bold text-center border-r border-slate-300 bg-slate-50">ATP 1.2</td>
                          <td className="p-2">Peserta didik mampu merancang, membangun, dan mempresentasikan karya/projek nyata hasil kolaborasi kelompok.</td>
                          <td className="p-2 text-center font-semibold">C4 (Menganalisis)</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-center border-r border-slate-300 bg-slate-50">ATP 1.3</td>
                          <td className="p-2">Peserta didik mampu mengevaluasi hasil karya, menguji kebenaran solusi, serta melakukan refleksi secara analitis.</td>
                          <td className="p-2 text-center font-semibold">C5 (Mengevaluasi)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* V. PEMAHAMAN BERMAKNA & PERTANYAAN PEMANTIK */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    V. PEMAHAMAN BERMAKNA & PERTANYAAN PEMANTIK
                  </h3>

                  <div className="border border-slate-300 p-3 rounded bg-slate-50 text-xs space-y-1">
                    <span className="font-bold text-slate-900">A. Pemahaman Bermakna (Contextual Life Benefits):</span>
                    <p className="text-slate-700 pl-2">
                      Dengan menguasai topik pembelajaran ini, peserta didik dapat menerapkan pemikiran analitis dan keterampilan teknis dalam memecahkan permasalahan riil di dunia kerja, lingkungan bermasyarakat, maupun pengembangan karir masa depan.
                    </p>
                  </div>

                  <div className="border border-slate-300 p-3 rounded bg-slate-50 text-xs space-y-1">
                    <span className="font-bold text-slate-900">B. Pertanyaan Pemantik (Pemicu Rasa Ingin Tahu):</span>
                    <ol className="list-decimal pl-5 text-slate-800 space-y-1 mt-1">
                      <li>Mengapa topik pembelajaran ini sangat esensial dan digunakan luas dalam pemecahan masalah dunia nyata?</li>
                      <li>Bagaimana dampak yang terjadi jika kita tidak memperhatikan prinsip efisiensi dan analisis yang tepat?</li>
                      <li>Strategi inovatif seperti apa yang bisa kalian kembangkan untuk menciptakan solusi yang efektif?</li>
                      <li>Bagaimana hasil karya kelompok kalian dapat dipresentasikan secara meyakinkan kepada publik?</li>
                    </ol>
                  </div>
                </div>
              </div>


              {/* ==================== HALAMAN 3: SKENARIO DETAIL KEGIATAN PEMBELAJARAN (KBM 3 PERTEMUAN) ==================== */}
              <div className="page-card bg-white shadow-2xl rounded-none border border-slate-300 p-8 md:p-12 space-y-6 relative print:shadow-none print:p-0 print:border-0">
                <div className="absolute top-3 right-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Halaman 3 dari 5 — Kegiatan Pembelajaran (KBM)
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    VI. SKENARIO KEGIATAN PEMBELAJARAN (3 PERTEMUAN / 4 JP)
                  </h3>

                  <table className="w-full text-xs border border-slate-400 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-400">
                        <th className="p-2 border-r border-slate-300 w-24">Tahapan KBM</th>
                        <th className="p-2 border-r border-slate-300">Deskripsi Kegiatan Guru & Peserta Didik</th>
                        <th className="p-2 w-20 text-center">Alokasi Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Pertemuan 1 */}
                      <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                        <td colSpan={3} className="p-2 text-slate-900 uppercase font-sans">
                          PERTEMUAN 1: ORIENTASI MASALAH & EKSPLORASI KONSEP (2 JP x 45 MENIT)
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Pendahuluan</td>
                        <td className="p-2">
                          • Guru menyapa, memimpin doa, dan memeriksa kehadiran peserta didik.<br />
                          • Apersepsi dan tayangan materi pemantik untuk membangkitkan rasa ingin tahu.<br />
                          • Guru menyampaikan Alur Tujuan Pembelajaran (ATP 1.1) dan sistem asesmen.
                        </td>
                        <td className="p-2 text-center font-bold">15 Menit</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Kegiatan Inti</td>
                        <td className="p-2">
                          • <b>Orientasi Sintaks 1:</b> Guru memaparkan studi kasus nyata di dunia industri.<br />
                          • <b>Eksplorasi Mandiri:</b> Peserta didik membaca modul digital dan referensi.<br />
                          • <b>Pembentukan Kelompok:</b> Guru membagi kelompok (4-5 siswa) dan membagikan LKPD 1.
                        </td>
                        <td className="p-2 text-center font-bold">60 Menit</td>
                      </tr>
                      <tr className="border-b border-slate-400">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Penutup</td>
                        <td className="p-2">
                          • Refleksi pembelajaran per individu tentang konsep dasar yang dipahami.<br />
                          • Guru memberikan simpulan dan menyampaikan tugas persiapan Pertemuan 2.
                        </td>
                        <td className="p-2 text-center font-bold">15 Menit</td>
                      </tr>

                      {/* Pertemuan 2 */}
                      <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                        <td colSpan={3} className="p-2 text-slate-900 uppercase font-sans">
                          PERTEMUAN 2: KOLABORASI KELOMPOK & PENGEMBANGAN PROJEK (2 JP x 45 MENIT)
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Pendahuluan</td>
                        <td className="p-2">
                          • Salam, review singkat hasil KBM Pertemuan 1, dan penjelasan target Pertemuan 2.<br />
                          • Pembagian fokus peran masing-masing anggota kelompok dalam menyelesaikan LKPD 2.
                        </td>
                        <td className="p-2 text-center font-bold">15 Menit</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Kegiatan Inti</td>
                        <td className="p-2">
                          • <b>Desain & Manufaktur/Coding:</b> Kelompok mengolah data dan membangun karya.<br />
                          • <b>Bimbingan Guru:</b> Guru berkeliling melakukan asistensi, asesmen formatif observasi.<br />
                          • <b>Finalisasi Produk:</b> Kelompok menyiapkan bahan presentasi dan modul uji.
                        </td>
                        <td className="p-2 text-center font-bold">60 Menit</td>
                      </tr>
                      <tr className="border-b border-slate-400">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Penutup</td>
                        <td className="p-2">
                          • Guru memberikan penguatan atas progres karya setiap kelompok.<br />
                          • Doa penutup dan merapikan kembali perangkat laboratorium/sarana KBM.
                        </td>
                        <td className="p-2 text-center font-bold">15 Menit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>


              {/* ==================== HALAMAN 4: LEMBAR KERJA PESERTA DIDIK (LKPD - WORKBOOK SISWA) ==================== */}
              <div className="page-card bg-white shadow-2xl rounded-none border border-slate-300 p-8 md:p-12 space-y-6 relative print:shadow-none print:p-0 print:border-0">
                <div className="absolute top-3 right-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Halaman 4 dari 5 — Lembar Kerja Siswa (LKPD)
                </div>

                <div className="space-y-4">
                  <div className="border-b-2 border-slate-900 pb-2 text-center">
                    <h3 className="font-bold text-base uppercase tracking-wider text-slate-900 font-sans">
                      VII. LEMBAR KERJA PESERTA DIDIK (LKPD - WORKBOOK)
                    </h3>
                    <p className="text-xs text-slate-600 font-sans">Aktivitas Kolaboratif & Penugasan Berbasis Studi Kasus</p>
                  </div>

                  {/* Header Identitas Kelompok Siswa */}
                  <table className="w-full text-xs border border-slate-400 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="w-1/4 p-2 font-bold bg-slate-100 border-r border-slate-300">Nama Kelompok</td>
                        <td className="p-2 font-semibold">Kelompok : ..............................................................</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Nama Anggota Kelompok</td>
                        <td className="p-2 font-semibold">1. .................... 2. .................... 3. .................... 4. ....................</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-100 border-r border-slate-300">Fase / Kelas / Tanggal KBM</td>
                        <td className="p-2 font-semibold">Fase F / Kelas XI / Tanggal : ...........................................</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Petunjuk & Langkah Kerja */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-slate-900">A. Petunjuk Pengerjaan LKPD:</span>
                    <ol className="list-decimal pl-5 text-slate-800 space-y-1">
                      <li>Bacalah studi kasus di bawah ini secara cermat bersama anggota kelompok Anda.</li>
                      <li>Gunakan modul digital, referensi buku, atau pencarian internet terarah untuk menemukan solusi.</li>
                      <li>Tuliskan rancangan jawaban dan langkah penyelesaian pada lembar kerja yang disediakan.</li>
                      <li>Siapkan slide presentasi ringkas untuk dipaparkan di depan kelas pada sesi pameran karya.</li>
                    </ol>
                  </div>

                  {/* Studi Kasus & Lembar Jawaban Siswa */}
                  <div className="border border-slate-400 p-4 rounded bg-slate-50 space-y-3 text-xs">
                    <span className="font-bold block text-slate-900 border-b border-slate-300 pb-1">
                      B. Studi Kasus Aktivitas Siswa:
                    </span>
                    <p className="text-slate-800 italic">
                      "Sebuah perusahaan penyedia layanan membutuhkan sistem otomatisasi yang efisien untuk mengolah data dan menyajikan informasi secara tepat waktu. Sebagai tim pengembang, kelompok kalian diminta untuk merancang alur logika, struktur data, dan antarmuka pengguna yang aman dan responsif."
                    </p>

                    <div className="space-y-2 pt-2">
                      <span className="font-bold block text-slate-900">C. Lembar Jawab & Hasil Analisis Kelompok:</span>
                      <div className="w-full h-36 border border-dashed border-slate-400 rounded bg-white p-3 text-slate-400 font-sans text-[11px]">
                        ( Tuliskan rancangan solusi, diagram alur, atau sketsa produk di sini ... )
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* ==================== HALAMAN 5: ASESMEN, RUBRIK EVALUASI, GLOSARIUM & LEGALITAS DIGITAL ==================== */}
              <div className="bg-white shadow-2xl rounded-none border border-slate-300 p-8 md:p-12 space-y-6 relative print:shadow-none print:p-0 print:border-0">
                <div className="absolute top-3 right-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Halaman 5 dari 5 — Asesmen & Legalitas
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    VIII. RUBRİK PENILAIAN & INSTRUMEN ASESMEN
                  </h3>

                  <table className="w-full text-xs border border-slate-400 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-400">
                        <th className="p-2 border-r border-slate-300 w-24">Aspek Penilaian</th>
                        <th className="p-2 border-r border-slate-300">Indikator Kriteria Ketercapaian (KKTP)</th>
                        <th className="p-2 w-24 text-center">Teknik Asesmen</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">1. Sikap (Profil Pancasila)</td>
                        <td className="p-2">Menunjukkan sikap bernalar kritis, gotong royong, dan integritas selama diskusi KBM.</td>
                        <td className="p-2 text-center font-semibold">Observasi Jurnal</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">2. Pengetahuan (Kognitif)</td>
                        <td className="p-2">Mampu menganalisis konsep dan menjawab soal pemahaman materi dengan tepat.</td>
                        <td className="p-2 text-center font-semibold">Tes Formatif / Kuis</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">3. Keterampilan (Psikomotor)</td>
                        <td className="p-2">Kelengkapan hasil karya projek LKPD, estetika presentasi, dan kemampuan komutatif.</td>
                        <td className="p-2 text-center font-semibold">Unjuk Kerja / Produk</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* IX. GLOSARIUM & DAFTAR PUSTAKA */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-sans">
                    IX. GLOSARIUM & DAFTAR PUSTAKA
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-1">
                      <span className="font-bold block text-slate-900">A. Glosarium Istilah:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        <li><b>CP:</b> Capaian Pembelajaran Kurikulum Merdeka</li>
                        <li><b>ATP:</b> Alur Tujuan Pembelajaran sub-kompetensi</li>
                        <li><b>LKPD:</b> Lembar Kerja Peserta Didik panduan KBM</li>
                        <li><b>PBL:</b> Problem-Based Learning berbasis masalah</li>
                      </ul>
                    </div>

                    <div className="border border-slate-300 p-3 rounded bg-slate-50 space-y-1">
                      <span className="font-bold block text-slate-900">B. Daftar Pustaka:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        <li>Panduan Pembelajaran dan Asesmen (PPA) BSKAP Kemendikbudristek (2024)</li>
                        <li>Buku Teks Utama Siswa & Guru Kemendikbudristek</li>
                        <li>Repositori Pembelajaran Digital Platform Absenta</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* X. DIGITAL SIGNATURE & VERIFICATION BLOCK */}
                <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-xs font-sans">
                  <div className="text-center space-y-10">
                    <div>
                      Mengetahui,<br />
                      <b>Kepala Sekolah</b>
                    </div>
                    <div>
                      <span className="font-bold underline">Dr. H. Mulyadi, M.Pd.</span><br />
                      NIP. 19780512 200312 1 002
                    </div>
                  </div>

                  <div className="text-center border border-emerald-500 bg-emerald-50 p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-center gap-1 font-bold text-emerald-800 text-[11px]">
                      <CheckCircle2 size={16} className="text-emerald-600" /> REPOSITORI ABSENTA VERIFIED
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      Status: <b>{item?.status || 'APPROVED'}</b><br />
                      Terkonfirmasi Resmi oleh Wakasek Kurikulum
                    </div>
                  </div>

                  <div className="text-center space-y-10">
                    <div>
                      Guru Pengampu,<br />
                      <b>Mata Pelajaran</b>
                    </div>
                    <div>
                      <span className="font-bold underline">{item?.Guru?.nama_guru || 'Guru Pengajar'}</span><br />
                      NIP. {item?.Guru?.nip || '-'}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

