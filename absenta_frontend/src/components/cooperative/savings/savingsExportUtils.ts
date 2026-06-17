import XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import {
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatTerbilangIndonesian,
  getBase64ImageFromUrl,
  fetchCoopSettings,
  drawCoopPDFHeader
} from '../../../utils/cooperative/coopDocUtils';
import type { Saving, Transaction } from './types';

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export interface FlatTransaction {
  date: string;
  memberNo: string;
  memberName: string;
  savingType: string;
  type: string;
  amount: string | number;
  description?: string;
}

export interface PrintThermalSlipData {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  date: string;
  description: string;
  savingType: string;
  memberName: string;
  memberNo: string;
  newBalance: number;
}

export interface CellStyle {
  font?: { name?: string; sz?: number; bold?: boolean; italic?: boolean; color?: { rgb?: string } };
  alignment?: { horizontal?: string; vertical?: string };
  fill?: { fgColor?: { rgb?: string } };
  border?: {
    top?: { style?: string; color?: { rgb?: string } };
    bottom?: { style?: string; color?: { rgb?: string } };
  };
}

export interface XLSXCell {
  s?: CellStyle;
  z?: string;
  v?: string | number;
  t?: string;
}

/** Print thermal receipt slip */
export const printThermalSlip = async (txData: PrintThermalSlipData, operatorName: string) => {
  try {
    let currentCoopName = 'KOPERASI SEKOLAH';
    try {
      const settingsRes = await fetchCoopSettings();
      currentCoopName = settingsRes.cooperative_name || 'KOPERASI SEKOLAH';
    } catch (e) {
      console.warn('Failed to load coop settings for slip', e);
    }

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [58, 110]
    });

    doc.setFont('Helvetica', 'normal');

    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(currentCoopName.toUpperCase(), 29, 8, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('BUKTI TRANSAKSI TABUNGAN', 29, 12, { align: 'center' });
    doc.text('----------------------------------------------------', 29, 15, { align: 'center' });

    // Details
    let y = 19;
    doc.setFontSize(6);
    doc.text(`No. Slip : SLP-${txData.id.slice(-8).toUpperCase()}`, 4, y);
    y += 3.5;
    doc.text(`Tanggal  : ${formatIndonesianDateTime(txData.date)}`, 4, y);
    y += 3.5;
    doc.text(`Operator : ${operatorName}`, 4, y);
    y += 4;
    doc.text('----------------------------------------------------', 29, y, { align: 'center' });

    // Member details
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('ANGGOTA:', 4, y);
    y += 3.5;
    doc.setFont('Helvetica', 'normal');
    doc.text(`Nama     : ${txData.memberName.toUpperCase()}`, 4, y);
    y += 3.5;
    doc.text(`No. Angg : ${txData.memberNo}`, 4, y);
    y += 3.5;
    doc.text(`Rekening : ${txData.savingType} SAVINGS`, 4, y);
    y += 4;
    doc.text('----------------------------------------------------', 29, y, { align: 'center' });

    // Transaction Info
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    const isDeposit = txData.type === 'DEPOSIT';
    doc.text(isDeposit ? 'SETORAN TUNAI (+)' : 'PENARIKAN TUNAI (-)', 4, y);
    y += 4.5;
    doc.setFontSize(9);
    if (isDeposit) {
      doc.setTextColor(16, 185, 129); // emerald
    } else {
      doc.setTextColor(239, 68, 68); // rose
    }
    doc.text(`Rp ${txData.amount.toLocaleString('id-ID')}`, 4, y);
    doc.setTextColor(15, 23, 42); // reset color

    y += 4;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.text(`Terbilang: ${formatTerbilangIndonesian(txData.amount)}`, 4, y, { maxWidth: 50 });

    if (txData.description) {
      y += 4;
      doc.setFont('Helvetica', 'normal');
      doc.text(`Memo: "${txData.description}"`, 4, y, { maxWidth: 50 });
    }

    y += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('----------------------------------------------------', 29, y, { align: 'center' });

    // Balance Info
    y += 4.5;
    doc.setFont('Helvetica', 'bold');
    doc.text('SALDO AKHIR REKENING:', 4, y);
    y += 4.5;
    doc.setFontSize(8.5);
    doc.text(`Rp ${txData.newBalance.toLocaleString('id-ID')}`, 4, y);

    y += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('----------------------------------------------------', 29, y, { align: 'center' });

    // Footer
    y += 4;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(6);
    doc.text('Terima Kasih atas partisipasi Anda', 29, y, { align: 'center' });
    y += 3;
    doc.setFontSize(5);
    doc.text('Simpan slip ini sebagai bukti transaksi yang sah.', 29, y, { align: 'center' });

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    };

    toast.success('Slip transaksi berhasil dikirim ke printer!');
  } catch (error) {
    console.error(error);
    toast.error('Gagal mencetak slip thermal.');
  }
};

/** Export Transactions report (EXCEL / PDF) */
export const exportTransactions = async (
  formatType: 'EXCEL' | 'PDF',
  exportStartDate: string,
  exportEndDate: string,
  logoUrl?: string,
  onStartExport?: () => void,
  onEndExport?: () => void
) => {
  const newTab = formatType === 'PDF' ? window.open('', '_blank') : null;
  if (newTab) {
    newTab.document.title = "Memuat Laporan PDF...";
    newTab.document.body.innerHTML = "<div style='display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#475569;background-color:#f8fafc;'><div style='width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;'></div><div>Memuat laporan mutasi kas, mohon tunggu...</div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style></div>";
  }

  if (onStartExport) onStartExport();

  try {
    const response = await api.get(`/cooperative/savings/transactions`, {
      params: {
        startDate: exportStartDate,
        endDate: exportEndDate
      }
    });
    const txData: FlatTransaction[] = response.data || [];

    if (txData.length === 0) {
      toast.error('Tidak ada transaksi pada periode yang dipilih.');
      if (newTab) newTab.close();
      if (onEndExport) onEndExport();
      return;
    }

    const coopSettings = await fetchCoopSettings();
    const currentCoopName = coopSettings.cooperative_name || 'KOPERASI SEKOLAH';
    const coopLegalNo = coopSettings.cooperative_legal_no;
    const bendaharaName = coopSettings.signatures.bendahara || 'Bendahara';
    const ketuaName = coopSettings.signatures.ketua || 'Ketua';
    const kepsekName = coopSettings.signatures.kepsek || 'Kepala Sekolah';
    const coopLogoUrl = coopSettings.cooperative_logo_url;

    const totalDeposit = txData.reduce((sum: number, t: FlatTransaction) => t.type === 'DEPOSIT' || t.type === 'INTEREST' ? sum + Number(t.amount) : sum, 0);
    const totalWithdrawal = txData.reduce((sum: number, t: FlatTransaction) => t.type === 'WITHDRAWAL' || t.type === 'ADMIN_FEE' ? sum + Number(t.amount) : sum, 0);

    const periodStr = `${formatIndonesianDate(exportStartDate)} s/d ${formatIndonesianDate(exportEndDate)}`;
    const dateStrPrint = formatIndonesianDateTime(new Date());

    if (formatType === 'EXCEL') {
      const rowData = txData.map((t: FlatTransaction, idx: number) => [
        idx + 1,
        formatIndonesianDateTime(t.date),
        t.memberNo,
        t.memberName,
        t.savingType,
        t.type === 'DEPOSIT' ? 'SETOR' : t.type === 'WITHDRAWAL' ? 'TARIK' : t.type,
        Number(t.amount),
        t.description || '-'
      ]);

      const aoaData = [
        [currentCoopName.toUpperCase()],
        [coopLegalNo ? `Badan Hukum: ${coopLegalNo}` : 'LAPORAN REKAPITULASI MUTASI KAS SIMPANAN'],
        [coopLegalNo ? 'LAPORAN REKAPITULASI MUTASI KAS SIMPANAN' : `Periode: ${periodStr}`],
        [coopLegalNo ? `Periode: ${periodStr}` : `Dicetak Pada: ${dateStrPrint}`],
        [coopLegalNo ? `Dicetak Pada: ${dateStrPrint}` : ''],
        [],
        ['RINGKASAN MUTASI KAS'],
        ['Total Setoran (Deposit)', totalDeposit, '', 'Total Penarikan (Withdrawal)', totalWithdrawal],
        [],
        ['No.', 'Tanggal & Waktu', 'No. Anggota', 'Nama Anggota', 'Jenis Simpanan', 'Tipe Transaksi', 'Nominal (Rp)', 'Keterangan / Memo'],
        ...rowData,
        [],
        ['TOTAL MUTASI KAS', '', '', '', '', '', `Setoran: Rp ${totalDeposit.toLocaleString('id-ID')} | Penarikan: Rp ${totalWithdrawal.toLocaleString('id-ID')}`, '']
      ] as (string | number | undefined)[][];

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mutasi Kas Simpanan');

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cell_address] as XLSXCell | undefined;
          if (!cell) continue;

          cell.s = {};

          if (R >= 0 && R <= 4) {
            if (R === 0) {
              cell.s = {
                font: { name: 'Arial', sz: 14, bold: true, color: { rgb: "1E3A8A" } },
                alignment: { horizontal: 'left', vertical: 'center' }
              };
            } else if (R === 1) {
              cell.s = {
                font: { name: 'Arial', sz: 11, bold: true, color: { rgb: "475569" } },
                alignment: { horizontal: 'left', vertical: 'center' }
              };
            } else {
              cell.s = {
                font: { name: 'Arial', sz: 10, italic: true, color: { rgb: "94A3B8" } },
                alignment: { horizontal: 'left', vertical: 'center' }
              };
            }
          }

          if (R >= 6 && R <= 7) {
            if (R === 6) {
              cell.s = {
                font: { name: 'Arial', sz: 11, bold: true, color: { rgb: "1E3A8A" } }
              };
            } else {
              cell.s = {
                font: { name: 'Arial', sz: 10, bold: true },
                fill: { fgColor: { rgb: "F8FAFC" } },
                border: {
                  top: { style: 'thin', color: { rgb: "E2E8F0" } },
                  bottom: { style: 'thin', color: { rgb: "E2E8F0" } }
                }
              };
              if (C === 1 || C === 4) {
                cell.z = 'Rp #,##0';
              }
            }
          }

          const tableHeaderIndex = 9;
          if (R === tableHeaderIndex) {
            cell.s = {
              font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4F46E5" } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: "312E81" } },
                bottom: { style: 'double', color: { rgb: "312E81" } }
              }
            };
          }

          if (R > tableHeaderIndex && R < aoaData.length - 2) {
            const bg = (R % 2 === 0) ? "F8FAFC" : "FFFFFF";
            cell.s = {
              font: { name: 'Arial', sz: 10 },
              fill: { fgColor: { rgb: bg } },
              border: {
                bottom: { style: 'thin', color: { rgb: "F1F5F9" } }
              },
              alignment: { vertical: 'center' }
            };

            if (C === 0 || C === 1 || C === 2 || C === 4 || C === 5) {
              cell.s.alignment = { horizontal: 'center' };
            } else if (C === 6) {
              cell.s.alignment = { horizontal: 'right' };
              cell.z = 'Rp #,##0';
            }
          }

          if (R === aoaData.length - 1) {
            cell.s = {
              font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "1E3A8A" } },
              fill: { fgColor: { rgb: "EEF2F6" } },
              alignment: { vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: "CBD5E1" } },
                bottom: { style: 'double', color: { rgb: "94A3B8" } }
              }
            };
            if (C === 0) {
              cell.s.alignment = { horizontal: 'left' };
            } else if (C === 6) {
              cell.s.alignment = { horizontal: 'right' };
            }
          }
        }
      }

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 30 }
      ];

      XLSX.writeFile(workbook, `Rekap_Mutasi_Kas_${exportStartDate}_sd_${exportEndDate}.xlsx`);
      toast.success('Laporan Excel berhasil diunduh!');
    } else {
      const effectiveLogo = coopLogoUrl || logoUrl;

      let base64Logo: string | null = null;
      if (effectiveLogo) {
        let absoluteLogoUrl = effectiveLogo;
        if (effectiveLogo.startsWith('/')) {
          absoluteLogoUrl = window.location.origin + effectiveLogo;
        }
        base64Logo = await getBase64ImageFromUrl(absoluteLogoUrl);
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      let startY = drawCoopPDFHeader(doc, coopSettings, base64Logo, 15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('LAPORAN REKAPITULASI MUTASI KAS SIMPANAN', 105, startY, { align: 'center' });

      startY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Periode: ${periodStr}`, 105, startY, { align: 'center' });

      startY += 10;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, startY, 180, 18, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('RINGKASAN MUTASI PERIODE:', 18, startY + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Setoran Tunai (Kredit):`, 18, startY + 11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`Rp ${totalDeposit.toLocaleString('id-ID')}`, 63, startY + 11);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Penarikan Tunai (Debet):`, 105, startY + 11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(`Rp ${totalWithdrawal.toLocaleString('id-ID')}`, 153, startY + 11);

      const tableColumns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal & Waktu', dataKey: 'date' },
        { header: 'No. Anggota', dataKey: 'memberNo' },
        { header: 'Nama Anggota', dataKey: 'name' },
        { header: 'Simpanan', dataKey: 'savingType' },
        { header: 'Transaksi', dataKey: 'type' },
        { header: 'Nominal (Rp)', dataKey: 'amount' }
      ];

      const tableRows = txData.map((t: FlatTransaction, idx: number) => ({
        no: idx + 1,
        date: formatIndonesianDateTime(t.date),
        memberNo: t.memberNo,
        name: t.memberName.toUpperCase(),
        savingType: t.savingType,
        type: t.type === 'DEPOSIT' ? 'SETORAN' : t.type === 'WITHDRAWAL' ? 'PENARIKAN' : t.type,
        amount: parseFloat(String(t.amount)).toLocaleString('id-ID')
      }));

      autoTable(doc, {
        columns: tableColumns,
        body: tableRows,
        startY: startY + 22,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          no: { halign: 'center', cellWidth: 8 },
          date: { halign: 'center', cellWidth: 32 },
          memberNo: { halign: 'center', cellWidth: 20 },
          name: { halign: 'left' },
          savingType: { halign: 'center', cellWidth: 20 },
          type: { halign: 'center', cellWidth: 22 },
          amount: { halign: 'right', cellWidth: 25 }
        },
        margin: { left: 15, right: 15 }
      });

      let finalY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? (startY + 22);
      if (finalY > 240) {
        doc.addPage();
        finalY = 25;
      }

      const dateCityText = `Purwakarta, ${formatIndonesianDate(new Date())}`;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      doc.text('Melaporkan,', 15, finalY + 4);
      doc.text('Bendahara Koperasi', 15, finalY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.text(bendaharaName, 15, finalY + 28);
      doc.setFont('Helvetica', 'normal');
      doc.line(15, finalY + 29, 65, finalY + 29);

      doc.text('Menyetujui,', 80, finalY + 4);
      doc.text('Kepala Sekolah (Pembina)', 80, finalY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.text(kepsekName, 80, finalY + 28);
      doc.setFont('Helvetica', 'normal');
      doc.line(80, finalY + 29, 130, finalY + 29);

      doc.text(dateCityText, 145, finalY);
      doc.text('Mengetahui,', 145, finalY + 4);
      doc.text('Ketua Koperasi', 145, finalY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.text(ketuaName, 145, finalY + 28);
      doc.setFont('Helvetica', 'normal');
      doc.line(145, finalY + 29, 195, finalY + 29);

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      if (newTab) {
        newTab.location.href = blobUrl;
        newTab.document.title = `Laporan_Mutasi_Kas_${exportStartDate}_sd_${exportEndDate}.pdf`;
      } else {
        window.open(blobUrl, '_blank');
      }
      toast.success('Laporan PDF berhasil dimuat!');
    }
  } catch (err) {
    if (newTab) newTab.close();
    console.error(err);
    const error = err as Error & { response?: { data?: { message?: string } } };
    const errMsg = error.response?.data?.message || error.message || 'Gagal mengekspor laporan mutasi';
    toast.error(errMsg);
  } finally {
    if (onEndExport) onEndExport();
  }
};

/** Export single account mutations report */
export const exportSingleSavingPdf = async (saving: Saving, logoUrl?: string) => {
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.title = "Memuat Mutasi Rekening...";
    newTab.document.body.innerHTML = "<div style='display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#475569;background-color:#f8fafc;'><div style='width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;'></div><div>Memuat mutasi rekening, mohon tunggu...</div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style></div>";
  }

  const toastId = toast.loading('Menyiapkan mutasi rekening...');
  try {
    const coopSettings = await fetchCoopSettings();
    const coopLogoUrl = coopSettings.cooperative_logo_url;
    const bendaharaName = coopSettings.signatures.bendahara || 'Bendahara';
    const ketuaName = coopSettings.signatures.ketua || 'Ketua';

    // Fetch fresh details with transactions
    const res = await api.get(`/cooperative/savings/${saving.id}`);
    const targetTransactions: Transaction[] = res.data.transactions || [];

    const doc = new jsPDF('p', 'mm', 'a4');
    const effectiveLogo = coopLogoUrl || logoUrl;

    let base64Logo: string | null = null;
    if (effectiveLogo) {
      let absoluteLogoUrl = effectiveLogo;
      if (effectiveLogo.startsWith('/')) {
        absoluteLogoUrl = window.location.origin + effectiveLogo;
      }
      base64Logo = await getBase64ImageFromUrl(absoluteLogoUrl);
    }

    let startY = drawCoopPDFHeader(doc, coopSettings, base64Logo, 15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN MUTASI REKENING SIMPANAN', 105, startY, { align: 'center' });

    startY += 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, startY, 180, 24, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Nama Anggota', 18, startY + 6);
    doc.text('No. Anggota', 18, startY + 12);
    doc.text('Jenis Rekening', 18, startY + 18);

    doc.text(':', 45, startY + 6);
    doc.text(':', 45, startY + 12);
    doc.text(':', 45, startY + 18);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(saving.member.name.toUpperCase(), 48, startY + 6);
    doc.text(saving.member.memberNo, 48, startY + 12);
    doc.text(`${saving.category?.name || saving.type || 'SIMPANAN'}`.toUpperCase(), 48, startY + 18);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Saldo Akhir', 115, startY + 6);
    doc.text('Tanggal Cetak', 115, startY + 12);

    doc.text(':', 140, startY + 6);
    doc.text(':', 140, startY + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Rp ${parseFloat(saving.amount).toLocaleString('id-ID')}`, 143, startY + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatIndonesianDateTime(new Date()), 143, startY + 12);

    const tableColumns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Tanggal & Waktu', dataKey: 'date' },
      { header: 'Transaksi', dataKey: 'type' },
      { header: 'Nominal (Rp)', dataKey: 'amount' },
      { header: 'Keterangan / Memo', dataKey: 'description' }
    ];

    const tableRows = targetTransactions.map((t: Transaction, idx: number) => ({
      no: idx + 1,
      date: formatIndonesianDateTime(t.date),
      type: t.type === 'DEPOSIT' ? 'SETORAN (+)' : t.type === 'WITHDRAWAL' ? 'PENARIKAN (-)' : t.type,
      amount: parseFloat(t.amount).toLocaleString('id-ID'),
      description: t.description || '-'
    }));

    autoTable(doc, {
      columns: tableColumns,
      body: tableRows,
      startY: startY + 28,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        date: { halign: 'center', cellWidth: 35 },
        type: { halign: 'center', cellWidth: 25 },
        amount: { halign: 'right', cellWidth: 30 },
        description: { halign: 'left' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? (startY + 28);
    if (finalY > 240) {
      doc.addPage();
      finalY = 25;
    }

    const dateCityText = `Purwakarta, ${formatIndonesianDate(new Date())}`;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Penerima / Anggota,', 15, finalY + 4);
    doc.setFont('Helvetica', 'bold');
    doc.text(saving.member.name.toUpperCase(), 15, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(15, finalY + 25, 65, finalY + 25);

    doc.text('Mengetahui,', 80, finalY + 4);
    doc.text('Bendahara Koperasi,', 80, finalY + 8);
    doc.setFont('Helvetica', 'bold');
    doc.text(bendaharaName, 80, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(80, finalY + 25, 130, finalY + 25);

    doc.text(dateCityText, 145, finalY);
    doc.text('Menyetujui,', 145, finalY + 4);
    doc.text('Ketua Koperasi,', 145, finalY + 8);
    doc.setFont('Helvetica', 'bold');
    doc.text(ketuaName, 145, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(145, finalY + 25, 195, finalY + 25);

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    if (newTab) {
      newTab.location.href = blobUrl;
      newTab.document.title = `Mutasi_Simpanan_${saving.category?.code || saving.type || 'Simpanan'}_${saving.member.memberNo}.pdf`;
    } else {
      window.open(blobUrl, '_blank');
    }
    toast.success('Mutasi rekening berhasil dimuat!', { id: toastId });
  } catch (error) {
    if (newTab) newTab.close();
    console.error(error);
    toast.error('Gagal mencetak mutasi rekening.', { id: toastId });
  }
};

/** Export consolidated passbook report for all member accounts */
export const exportAllSavingsPdf = async (saving: Saving, savingsList: Saving[], logoUrl?: string) => {
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.title = "Memuat Rekap Buku Tabungan...";
    newTab.document.body.innerHTML = "<div style='display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#475569;background-color:#f8fafc;'><div style='width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;'></div><div>Memuat rekap buku tabungan, mohon tunggu...</div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style></div>";
  }

  const toastId = toast.loading('Menyiapkan rekap buku tabungan...');
  try {
    const memberSavings = savingsList.filter(s => s.member.memberNo === saving.member.memberNo);

    if (memberSavings.length === 0) {
      toast.error('Tidak ada rekening simpanan ditemukan untuk anggota ini.', { id: toastId });
      if (newTab) newTab.close();
      return;
    }

    const detailedSavings: Saving[] = await Promise.all(
      memberSavings.map(async (s) => {
        const res = await api.get(`/cooperative/savings/${s.id}`);
        return res.data;
      })
    );

    const coopSettings = await fetchCoopSettings();
    const coopLogoUrl = coopSettings.cooperative_logo_url;
    const bendaharaName = coopSettings.signatures.bendahara || 'Bendahara';
    const ketuaName = coopSettings.signatures.ketua || 'Ketua';

    const doc = new jsPDF('p', 'mm', 'a4');
    const effectiveLogo = coopLogoUrl || logoUrl;

    let base64Logo: string | null = null;
    if (effectiveLogo) {
      let absoluteLogoUrl = effectiveLogo;
      if (effectiveLogo.startsWith('/')) {
        absoluteLogoUrl = window.location.origin + effectiveLogo;
      }
      base64Logo = await getBase64ImageFromUrl(absoluteLogoUrl);
    }

    let startY = drawCoopPDFHeader(doc, coopSettings, base64Logo, 15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN REKAPITULASI BUKU TABUNGAN ANGGOTA', 105, startY, { align: 'center' });

    let totalAllSavings = 0;
    detailedSavings.forEach((ds: Saving) => {
      totalAllSavings += parseFloat(ds.amount || '0');
    });

    startY += 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, startY, 180, 18, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Nama Anggota', 18, startY + 6);
    doc.text('No. Anggota', 18, startY + 12);

    doc.text(':', 42, startY + 6);
    doc.text(':', 42, startY + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(saving.member.name.toUpperCase(), 45, startY + 6);
    doc.text(saving.member.memberNo, 45, startY + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Tanggal Cetak', 115, startY + 6);
    doc.text('Total Saldo Gabungan', 115, startY + 12);

    doc.text(':', 150, startY + 6);
    doc.text(':', 150, startY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(formatIndonesianDateTime(new Date()), 153, startY + 6);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Rp ${totalAllSavings.toLocaleString('id-ID')}`, 153, startY + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text('RINGKASAN SALDO REKENING GABUNGAN', 15, startY + 25);

    const summaryColumns = [
      { header: 'Jenis Simpanan', dataKey: 'type' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Saldo Akhir (Rp)', dataKey: 'balance' }
    ];

    const summaryRows = detailedSavings.map((ds: Saving) => ({
      type: ds.category?.name || `Simpanan ${(ds.type || '').charAt(0) + (ds.type || '').slice(1).toLowerCase()}`,
      status: 'Aktif',
      balance: parseFloat(ds.amount || '0').toLocaleString('id-ID')
    }));

    summaryRows.push({
      type: 'TOTAL SALDO GABUNGAN',
      status: '',
      balance: totalAllSavings.toLocaleString('id-ID')
    });

    autoTable(doc, {
      columns: summaryColumns,
      body: summaryRows,
      startY: startY + 27,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        type: { halign: 'left' },
        status: { halign: 'center', cellWidth: 25 },
        balance: { halign: 'right', cellWidth: 40 }
      },
      margin: { left: 15, right: 15 },
      didParseCell: function (data) {
        if (data.row.index === summaryRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [30, 58, 138];
        }
      }
    });

    let nextY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? (startY + 27);
    if (nextY > 260) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text('MUTASI TRANSAKSI GABUNGAN (KRONOLOGIS)', 15, nextY);

    const allTransactions: Transaction[] = [];
    detailedSavings.forEach((ds: Saving) => {
      if (ds.transactions && Array.isArray(ds.transactions)) {
        ds.transactions.forEach((tx: Transaction) => {
          allTransactions.push({
            ...tx,
            savingType: ds.category?.name || ds.type
          });
        });
      }
    });

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const formatTxType = (type: string) => {
      switch (type) {
        case 'DEPOSIT': return 'SETORAN (+)';
        case 'WITHDRAWAL': return 'PENARIKAN (-)';
        case 'INTEREST': return 'BUNGA (+)';
        case 'ADMIN_FEE': return 'BIAYA ADM (-)';
        default: return type;
      }
    };

    const txColumns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Tanggal & Waktu', dataKey: 'date' },
      { header: 'Rekening', dataKey: 'savingType' },
      { header: 'Transaksi', dataKey: 'type' },
      { header: 'Nominal (Rp)', dataKey: 'amount' },
      { header: 'Keterangan / Memo', dataKey: 'description' }
    ];

    const txRows = allTransactions.map((t: Transaction, idx: number) => ({
      no: idx + 1,
      date: formatIndonesianDateTime(t.date),
      savingType: t.savingType || '',
      type: formatTxType(t.type),
      amount: parseFloat(t.amount).toLocaleString('id-ID'),
      description: t.description || '-'
    }));

    autoTable(doc, {
      columns: txColumns,
      body: txRows,
      startY: nextY + 3,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        no: { halign: 'center', cellWidth: 8 },
        date: { halign: 'center', cellWidth: 32 },
        savingType: { halign: 'center', cellWidth: 20 },
        type: { halign: 'center', cellWidth: 22 },
        amount: { halign: 'right', cellWidth: 25 },
        description: { halign: 'left' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? nextY;
    if (finalY > 240) {
      doc.addPage();
      finalY = 25;
    }

    const dateCityText = `Purwakarta, ${formatIndonesianDate(new Date())}`;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Penerima / Anggota,', 15, finalY + 4);
    doc.setFont('Helvetica', 'bold');
    doc.text(saving.member.name.toUpperCase(), 15, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(15, finalY + 25, 65, finalY + 25);

    doc.text('Mengetahui,', 80, finalY + 4);
    doc.text('Bendahara Koperasi,', 80, finalY + 8);
    doc.setFont('Helvetica', 'bold');
    doc.text(bendaharaName, 80, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(80, finalY + 25, 130, finalY + 25);

    doc.text(dateCityText, 145, finalY);
    doc.text('Menyetujui,', 145, finalY + 4);
    doc.text('Ketua Koperasi,', 145, finalY + 8);
    doc.setFont('Helvetica', 'bold');
    doc.text(ketuaName, 145, finalY + 24);
    doc.setFont('Helvetica', 'normal');
    doc.line(145, finalY + 25, 195, finalY + 25);

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    if (newTab) {
      newTab.location.href = blobUrl;
      newTab.document.title = `Rekap_Buku_Tabungan_${saving.member.memberNo}.pdf`;
    } else {
      window.open(blobUrl, '_blank');
    }
    toast.success('Rekap buku tabungan berhasil dimuat!', { id: toastId });
  } catch (error) {
    if (newTab) newTab.close();
    console.error(error);
    toast.error('Gagal mencetak rekap buku tabungan.', { id: toastId });
  }
};
