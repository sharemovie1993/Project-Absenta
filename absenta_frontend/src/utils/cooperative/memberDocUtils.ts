// @ts-ignore
import XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

import type { Member, CoopProfile } from '../../components/cooperative/members/types';
import {
  formatIndonesianDate,
  getBase64ImageFromUrl,
  fetchCoopSettings,
  drawCoopPDFHeader
} from './coopDocUtils';
import { generateImportTemplate } from '../export.utils';
import type { ExcelColumnConfig } from '../export.utils';

interface AutoTableJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface MemberImportTemplateRow {
  memberNo: string;
  type: string;
  identityNo: string;
  email: string;
  phone: string;
  address: string;
}

export const handleDownloadTemplate = () => {
  try {
    const columns: ExcelColumnConfig<MemberImportTemplateRow>[] = [
      { header: 'memberNo', accessor: (r) => r.memberNo, required: true },
      { header: 'type', accessor: (r) => r.type, required: true },
      { header: 'identityNo', accessor: (r) => r.identityNo, required: true },
      { header: 'email', accessor: (r) => r.email, required: false },
      { header: 'phone', accessor: (r) => r.phone, required: false },
      { header: 'address', accessor: (r) => r.address, required: false },
    ];
    
    const sampleData: MemberImportTemplateRow[] = [
      {
        memberNo: '001',
        type: 'SISWA',
        identityNo: '123456',
        email: 'siswa1@sekolah.sch.id',
        phone: '08123456789',
        address: 'Jl. Pendidikan No. 1',
      },
      {
        memberNo: '002',
        type: 'GURU',
        identityNo: '987654321',
        email: 'guru1@sekolah.sch.id',
        phone: '08987654321',
        address: 'Jl. Guru No. 2',
      },
    ];

    generateImportTemplate(
      columns,
      sampleData,
      'Template_Impor_Anggota_Koperasi',
      'Isi kolom bertanda kuning (Wajib). Kolom optional dapat dikosongkan.'
    );
    toast.success('Template impor berhasil diunduh!');
  } catch (err) {
    console.error(err);
    toast.error('Gagal mengunduh template.');
  }
};

export const handleExportPdf = async (members: Member[], subscription: any) => {
  try {
    const coopSettings = await fetchCoopSettings();
    const coopLogoUrl = coopSettings.cooperative_logo_url;
    const bendaharaName = coopSettings.signatures.bendahara;
    const ketuaName = coopSettings.signatures.ketua;
    const kepsekName = coopSettings.signatures.kepsek;

    const doc = new jsPDF('l', 'mm', 'a4');
    const schoolLogo = (subscription as { logo_url?: string } | null)?.logo_url || '/logo.png';
    const effectiveLogo = coopLogoUrl || schoolLogo;
    
    let base64Logo: string | null = null;
    if (effectiveLogo) {
      let absoluteLogoUrl = effectiveLogo;
      if (effectiveLogo.startsWith('/')) {
        absoluteLogoUrl = window.location.origin + effectiveLogo;
      }
      base64Logo = await getBase64ImageFromUrl(absoluteLogoUrl);
    }

    const headerEndY = drawCoopPDFHeader(doc, coopSettings, base64Logo, 15, 282);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN REKAPITULASI KEANGGOTAAN & SALDO TABUNGAN', 15, headerEndY - 1);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Dicetak Pada: ${dateStr}`, 15, headerEndY + 3);

    const activeCount = (members || []).filter(m => m.status === 'ACTIVE').length;
    const inactiveCount = (members || []).filter(m => m.status !== 'ACTIVE').length;
    const overallPokok = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'POKOK')?.amount || 0), 0);
    const overallWajib = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'WAJIB')?.amount || 0), 0);
    const overallSukarela = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'SUKARELA')?.amount || 0), 0);
    const overallTotal = overallPokok + overallWajib + overallSukarela;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    doc.text('Total Anggota', 15, headerEndY + 10);
    doc.text('Anggota Aktif', 15, headerEndY + 15);
    doc.text('Anggota Nonaktif', 15, headerEndY + 20);
    
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${members.length} Orang`, 45, headerEndY + 10);
    doc.text(`: ${activeCount} Orang`, 45, headerEndY + 15);
    doc.text(`: ${inactiveCount} Orang`, 45, headerEndY + 20);
    
    doc.setTextColor(71, 85, 105);
    doc.text('Total Simpanan Pokok', 140, headerEndY + 10);
    doc.text('Total Simpanan Wajib', 140, headerEndY + 15);
    doc.text('Total Simpanan Sukarela', 140, headerEndY + 20);
    doc.text('Total Simpanan Terkumpul', 140, headerEndY + 25);
    
    doc.setTextColor(15, 23, 42);
    doc.text(`: Rp ${overallPokok.toLocaleString('id-ID')}`, 185, headerEndY + 10);
    doc.text(`: Rp ${overallWajib.toLocaleString('id-ID')}`, 185, headerEndY + 15);
    doc.text(`: Rp ${overallSukarela.toLocaleString('id-ID')}`, 185, headerEndY + 20);
    doc.setTextColor(79, 70, 229);
    doc.text(`: Rp ${overallTotal.toLocaleString('id-ID')}`, 185, headerEndY + 25);

    const tableBody = (members || []).map((m, idx) => {
      const pokok = (m.savings || []).find(s => s.type === 'POKOK')?.amount || 0;
      const wajib = (m.savings || []).find(s => s.type === 'WAJIB')?.amount || 0;
      const sukarela = (m.savings || []).find(s => s.type === 'SUKARELA')?.amount || 0;
      const total = pokok + wajib + sukarela;

      return [
        idx + 1,
        m.memberNo,
        m.name,
        m.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF',
        m.status === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
        `Rp ${pokok.toLocaleString('id-ID')}`,
        `Rp ${wajib.toLocaleString('id-ID')}`,
        `Rp ${sukarela.toLocaleString('id-ID')}`,
        `Rp ${total.toLocaleString('id-ID')}`,
        formatIndonesianDate(m.createdAt)
      ];
    });

    tableBody.push([
      '', 'TOTAL AKUMULASI', '', '', '',
      `Rp ${overallPokok.toLocaleString('id-ID')}`,
      `Rp ${overallWajib.toLocaleString('id-ID')}`,
      `Rp ${overallSukarela.toLocaleString('id-ID')}`,
      `Rp ${overallTotal.toLocaleString('id-ID')}`,
      ''
    ]);

    autoTable(doc, {
      startY: headerEndY + 30,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 1.8 },
      headStyles: { 
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 35 },
        6: { halign: 'right', cellWidth: 35 },
        7: { halign: 'right', cellWidth: 35 },
        8: { halign: 'right', cellWidth: 35 },
        9: { halign: 'center', cellWidth: 25 }
      },
      head: [['No', 'No. Anggota', 'Nama Anggota', 'Klasifikasi', 'Status', 'Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela', 'Total Simpanan', 'Bergabung']],
      body: tableBody,
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 242, 246];
          data.cell.styles.textColor = [30, 27, 75];
        }
      }
    });

    const finalY = ((doc as AutoTableJsPDF).lastAutoTable?.finalY ?? 0) + 12;
    let sigY = finalY;

    if (sigY + 35 > 200) {
      doc.addPage();
      sigY = 25;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    const colLeftX = 59.5;
    const colCenterX = 148.5;
    const colRightX = 237.5;

    const todayStr = formatIndonesianDate(new Date());
    
    doc.text('Melaporkan,', colLeftX, sigY, { align: 'center' });
    doc.text('Bendahara Koperasi', colLeftX, sigY + 5, { align: 'center' });

    doc.text('Menyetujui,', colCenterX, sigY, { align: 'center' });
    doc.text('Kepala Sekolah (Pembina)', colCenterX, sigY + 5, { align: 'center' });

    doc.text(`Purwakarta, ${todayStr}`, colRightX, sigY, { align: 'center' });
    doc.text('Ketua Koperasi', colRightX, sigY + 5, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(bendaharaName, colLeftX, sigY + 23, { align: 'center' });
    doc.text(kepsekName, colCenterX, sigY + 23, { align: 'center' });
    doc.text(ketuaName, colRightX, sigY + 23, { align: 'center' });

    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.line(colLeftX - 25, sigY + 24, colLeftX + 25, sigY + 24);
    doc.line(colCenterX - 25, sigY + 24, colCenterX + 25, sigY + 24);
    doc.line(colRightX - 25, sigY + 24, colRightX + 25, sigY + 24);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Pengurus Koperasi', colLeftX, sigY + 28, { align: 'center' });
    doc.text('Pimpinan Sekolah', colCenterX, sigY + 28, { align: 'center' });
    doc.text('Pimpinan Koperasi', colRightX, sigY + 28, { align: 'center' });

    doc.save(`Laporan_Anggota_Koperasi_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Laporan keanggotaan berhasil di-ekspor ke PDF!');
  } catch (err) {
    console.error('Error exporting PDF:', err);
    toast.error('Gagal mengekspor data laporan ke PDF.');
  }
};

export const handleExportSinglePdf = async (m: Member, subscription: any) => {
  try {
    const coopSettings = await fetchCoopSettings();
    const coopLogoUrl = coopSettings.cooperative_logo_url;
    const bendaharaName = coopSettings.signatures.bendahara;
    const ketuaName = coopSettings.signatures.ketua;
    const kepsekName = coopSettings.signatures.kepsek;

    const doc = new jsPDF('p', 'mm', 'a4');
    const schoolLogo = (subscription as { logo_url?: string } | null)?.logo_url || '/logo.png';
    const effectiveLogo = coopLogoUrl || schoolLogo;
    
    let base64Logo: string | null = null;
    if (effectiveLogo) {
      let absoluteLogoUrl = effectiveLogo;
      if (effectiveLogo.startsWith('/')) {
        absoluteLogoUrl = window.location.origin + effectiveLogo;
      }
      base64Logo = await getBase64ImageFromUrl(absoluteLogoUrl);
    }

    const headerEndY = drawCoopPDFHeader(doc, coopSettings, base64Logo, 15);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN SALDO & DATA ANGGOTA KOPERASI', 15, headerEndY - 1);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const dateStrSingle = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Dicetak Pada: ${dateStrSingle}`, 15, headerEndY + 3);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(15, headerEndY + 8, 180, 50, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PROFIL ANGGOTA', 20, headerEndY + 14);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Nama Lengkap', 20, headerEndY + 22);
    doc.text('No. Anggota', 20, headerEndY + 28);
    doc.text('Klasifikasi', 20, headerEndY + 34);
    doc.text('Tanggal Gabung', 20, headerEndY + 40);

    doc.setFont('Helvetica', 'bold');
    doc.text(`: ${m.name}`, 50, headerEndY + 22);
    doc.text(`: ${m.memberNo}`, 50, headerEndY + 28);
    doc.text(`: ${m.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF'}`, 50, headerEndY + 34);
    doc.text(`: ${formatIndonesianDate(m.createdAt)}`, 50, headerEndY + 40);

    doc.setFont('Helvetica', 'normal');
    doc.text('Alamat Email', 110, headerEndY + 22);
    doc.text('No. Telepon', 110, headerEndY + 28);
    doc.text('Alamat Rumah', 110, headerEndY + 34);

    doc.setFont('Helvetica', 'bold');
    doc.text(`: ${m.email || '-'}`, 135, headerEndY + 22);
    doc.text(`: ${m.phone || '-'}`, 135, headerEndY + 28);
    
    const addr = m.address || '-';
    const addressLines = doc.splitTextToSize(`: ${addr}`, 55);
    doc.text(addressLines, 135, headerEndY + 34);

    const pokok = (m.savings || []).find(s => s.type === 'POKOK')?.amount || 0;
    const wajib = (m.savings || []).find(s => s.type === 'WAJIB')?.amount || 0;
    const sukarela = (m.savings || []).find(s => s.type === 'SUKARELA')?.amount || 0;
    const total = pokok + wajib + sukarela;

    const tableBody = [
      ['1', 'Simpanan Pokok', 'Setoran awal saat pertama kali mendaftar sebagai anggota.', `Rp ${pokok.toLocaleString('id-ID')}`],
      ['2', 'Simpanan Wajib', 'Iuran wajib yang disetor setiap bulan secara berkala.', `Rp ${wajib.toLocaleString('id-ID')}`],
      ['3', 'Simpanan Sukarela', 'Tabungan bebas/sukarela yang dapat disetor & diambil kapan saja.', `Rp ${sukarela.toLocaleString('id-ID')}`],
      ['', 'TOTAL SIMPANAN TERKUMPUL', 'Total akumulasi saldo kas tabungan anggota.', `Rp ${total.toLocaleString('id-ID')}`]
    ];

    autoTable(doc, {
      startY: headerEndY + 64,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 2.5 },
      headStyles: { 
        fillColor: [79, 70, 229], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 40 },
        2: { textColor: [100, 116, 139], cellWidth: 90 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      },
      head: [['No', 'Jenis Simpanan', 'Deskripsi Simpanan', 'Saldo Tabungan']],
      body: tableBody,
      didParseCell: (data) => {
        if (data.row.index === 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 242, 246];
          data.cell.styles.textColor = [30, 27, 75];
        }
      }
    });

    const finalY = ((doc as AutoTableJsPDF).lastAutoTable?.finalY ?? 0) + 15;
    let sigY = finalY;

    if (sigY + 35 > 280) {
      doc.addPage();
      sigY = 25;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    const colLeftX = 45;
    const colCenterX = 105;
    const colRightX = 165;

    const todayStr = formatIndonesianDate(new Date());
    
    doc.text('Melaporkan,', colLeftX, sigY, { align: 'center' });
    doc.text('Bendahara Koperasi', colLeftX, sigY + 5, { align: 'center' });

    doc.text('Menyetujui,', colCenterX, sigY, { align: 'center' });
    doc.text('Kepala Sekolah (Pembina)', colCenterX, sigY + 5, { align: 'center' });

    doc.text(`Purwakarta, ${todayStr}`, colRightX, sigY, { align: 'center' });
    doc.text('Ketua Koperasi', colRightX, sigY + 5, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(bendaharaName, colLeftX, sigY + 23, { align: 'center' });
    doc.text(kepsekName, colCenterX, sigY + 23, { align: 'center' });
    doc.text(ketuaName, colRightX, sigY + 23, { align: 'center' });

    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.line(colLeftX - 22, sigY + 24, colLeftX + 22, sigY + 24);
    doc.line(colCenterX - 22, sigY + 24, colCenterX + 22, sigY + 24);
    doc.line(colRightX - 22, sigY + 24, colRightX + 22, sigY + 24);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Pengurus Koperasi', colLeftX, sigY + 28, { align: 'center' });
    doc.text('Pimpinan Sekolah', colCenterX, sigY + 28, { align: 'center' });
    doc.text('Pimpinan Koperasi', colRightX, sigY + 28, { align: 'center' });

    doc.save(`Laporan_Anggota_${m.memberNo}_${m.name.replace(/\s+/g, '_')}.pdf`);
    toast.success(`Laporan saldo untuk ${m.name} berhasil di-ekspor ke PDF!`);
  } catch (err) {
    console.error('Error exporting single member PDF:', err);
    toast.error('Gagal mengekspor data laporan anggota ke PDF.');
  }
};

export const handleExportExcel = async (members: Member[]) => {
  try {
    let currentCoopName = 'KOPERASI SEKOLAH ABSENTA';
    let coopLegalNo = '';
    try {
      const coopSettings = await fetchCoopSettings();
      currentCoopName = coopSettings.cooperative_name.toUpperCase();
      if (coopSettings.cooperative_legal_no) {
        coopLegalNo = `Badan Hukum: ${coopSettings.cooperative_legal_no}`;
      }
    } catch (e) {
      console.warn('Failed to load coop settings for excel export, using defaults', e);
    }

    const activeCount = (members || []).filter(m => m.status === 'ACTIVE').length;
    const inactiveCount = (members || []).filter(m => m.status !== 'ACTIVE').length;

    const overallPokok = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'POKOK')?.amount || 0), 0);
    const overallWajib = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'WAJIB')?.amount || 0), 0);
    const overallSukarela = (members || []).reduce((sum, m) => sum + ((m.savings || []).find(s => s.type === 'SUKARELA')?.amount || 0), 0);
    const overallTotal = overallPokok + overallWajib + overallSukarela;

    const dateStrExcel = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const rowData = (members || []).map((m, idx) => {
      const pokok = (m.savings || []).find(s => s.type === 'POKOK')?.amount || 0;
      const wajib = (m.savings || []).find(s => s.type === 'WAJIB')?.amount || 0;
      const sukarela = (m.savings || []).find(s => s.type === 'SUKARELA')?.amount || 0;
      const total = pokok + wajib + sukarela;

      return [
        idx + 1,
        m.memberNo,
        m.name,
        m.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF',
        m.status === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
        pokok,
        wajib,
        sukarela,
        total,
        formatIndonesianDate(m.createdAt)
      ];
    });

    const aoaData: (string | number | null | undefined)[][] = [
      [currentCoopName],
      [coopLegalNo || 'LAPORAN REKAPITULASI DATA KEANGGOTAAN & TABUNGAN'],
      [coopLegalNo ? 'LAPORAN REKAPITULASI DATA KEANGGOTAAN & TABUNGAN' : `Dicetak Pada: ${dateStrExcel}`],
      [coopLegalNo ? `Dicetak Pada: ${dateStrExcel}` : ''],
      [],
      ['RINGKASAN OPERASIONAL KOPERASI'],
      ['Total Anggota', `${members.length} Orang`, '', 'Total Pokok Terkumpul', overallPokok],
      ['Anggota Aktif', `${activeCount} Orang`, '', 'Total Wajib Terkumpul', overallWajib],
      ['Anggota Nonaktif', `${inactiveCount} Orang`, '', 'Total Sukarela Terkumpul', overallSukarela],
      ['', '', '', 'Total Simpanan Terkumpul', overallTotal],
      [],
      ['No.', 'No. Anggota', 'Nama Lengkap', 'Klasifikasi', 'Status', 'Simpanan Pokok (Rp)', 'Simpanan Wajib (Rp)', 'Simpanan Sukarela (Rp)', 'Total Simpanan (Rp)', 'Bergabung Pada'],
      ...rowData,
      [],
      ['TOTAL AKUMULASI', '', '', '', '', overallPokok, overallWajib, overallSukarela, overallTotal, '']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keanggotaan');

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cell_address];
        if (!cell) continue;

        cell.s = {};

        if (R >= 0 && R <= 3) {
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
          } else if (R === 2) {
            cell.s = {
              font: { name: 'Arial', sz: 10, bold: !coopLegalNo, color: { rgb: coopLegalNo ? "475569" : "94A3B8" }, italic: !coopLegalNo },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          } else if (R === 3) {
            cell.s = {
              font: { name: 'Arial', sz: 9, italic: true, color: { rgb: "94A3B8" } },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          }
        }

        else if (R === 5) {
          cell.s = {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "0F172A" } },
            fill: { fgColor: { rgb: "F1F5F9" } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              bottom: { style: 'thin', color: { rgb: "CBD5E1" } }
            }
          };
        }

        else if (R >= 6 && R <= 9) {
          const isLabel = C === 0 || C === 3;
          if (isLabel) {
            cell.s = {
              font: { name: 'Arial', sz: 9, bold: true, color: { rgb: "475569" } },
              fill: { fgColor: { rgb: "F8FAFC" } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: {
                bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
                right: { style: 'thin', color: { rgb: "E2E8F0" } }
              }
            };
          } else {
            cell.s = {
              font: { name: 'Arial', sz: 9, bold: true, color: { rgb: "0F172A" } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: {
                bottom: { style: 'thin', color: { rgb: "E2E8F0" } }
              }
            };
            if (C === 4 && typeof cell.v === 'number') {
              cell.z = '"Rp"#,##0';
            }
          }
        }

        else if (R === 11) {
          cell.s = {
            font: { name: 'Arial', sz: 9, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: "4F46E5" } },
              bottom: { style: 'medium', color: { rgb: "312E81" } },
              left: { style: 'thin', color: { rgb: "6366F1" } },
              right: { style: 'thin', color: { rgb: "6366F1" } }
            }
          };
        }

        else if (R > 11 && R < range.e.r - 1) {
          const isEven = R % 2 === 0;
          const bgHex = isEven ? "F8FAFC" : "FFFFFF";

          cell.s = {
            font: { name: 'Arial', sz: 9, color: { rgb: "334155" } },
            fill: { fgColor: { rgb: bgHex } },
            border: {
              bottom: { style: 'thin', color: { rgb: "F1F5F9" } },
              left: { style: 'thin', color: { rgb: "F1F5F9" } },
              right: { style: 'thin', color: { rgb: "F1F5F9" } }
            }
          };

          if (C === 0 || C === 1 || C === 4 || C === 9) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          } else if (C === 2 || C === 3) {
            cell.s.alignment = { horizontal: 'left', vertical: 'center' };
          } else if (C >= 5 && C <= 8) {
            cell.s.alignment = { horizontal: 'right', vertical: 'center' };
            cell.z = '"Rp"#,##0';
          }
        }

        else if (R === range.e.r) {
          cell.s = {
            font: { name: 'Arial', sz: 9, bold: true, color: { rgb: "1E1B4B" } },
            fill: { fgColor: { rgb: "EEF2F6" } },
            alignment: C >= 5 && C <= 8 ? { horizontal: 'right', vertical: 'center' } : { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: "CBD5E1" } },
              bottom: { style: 'double', color: { rgb: "1E1B4B" } }
            }
          };

          if (C >= 5 && C <= 8) {
            cell.z = '"Rp"#,##0';
          }
        }
      }
    }

    const maxLen = (aoaData || [])?.reduce((acc: number[], row) => {
      if (!row) return acc;
      row.forEach((val, i) => {
        const str = val !== null && val !== undefined ? String(val) : '';
        acc[i] = Math.max(acc[i] || 0, str.length);
      });
      return acc;
    }, [] as number[]) || [];

    worksheet['!cols'] = (maxLen || [])?.map((len: number) => ({ wch: Math.max(len + 3, 10) })) || [];

    XLSX.writeFile(workbook, `Laporan_Keanggotaan_Koperasi_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Laporan keanggotaan koperasi berhasil di-ekspor ke Excel!');
  } catch (err) {
    console.error('Error exporting members to Excel:', err);
    toast.error('Gagal meng-ekspor data laporan anggota.');
  }
};

export const handleDownloadCardPdf = async (m: Member, coopName: string, coopProfile: CoopProfile) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54]
    });

    // ================= TAMPAK DEPAN =================
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, 85.6, 54, 'F');

    doc.setFillColor(79, 70, 229);
    doc.ellipse(85.6, 0, 40, 20, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(224, 231, 255);
    doc.text(coopName.toUpperCase(), 6, 8);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const nameToShow = m.name.length > 20 ? m.name.substring(0, 18) + '..' : m.name;
    doc.text(nameToShow.toUpperCase(), 6, 17);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(199, 210, 254);
    doc.text(`Klasifikasi: ${m.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF'}`, 6, 22);

    doc.setFont('Courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(m.memberNo, 6, 35);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    const joinDateStr = formatIndonesianDate(m.createdAt);
    doc.text(`Bergabung: ${joinDateStr}`, 6, 40);

    const qrDataUrl = await QRCode.toDataURL(m.memberNo, { margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', 55, 12, 24, 24);

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 52, 85.6, 2, 'F');

    // ================= TAMPAK BELAKANG =================
    doc.addPage([85.6, 54], 'landscape');

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 85.6, 54, 'F');

    doc.setFillColor(10, 10, 10); 
    doc.rect(0, 0, 85.6, 6, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(248, 250, 252); 
    doc.text('KETENTUAN PENGGUNAAN KARTU ANGGOTA', 6, 10);
    
    if (coopProfile.legalNo) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`B.H: ${coopProfile.legalNo}`, 52, 10);
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(203, 213, 225); 
    doc.text('1. Kartu ini merupakan bukti keanggotaan resmi Koperasi.', 6, 14);
    doc.text('2. Wajib dibawa saat bertransaksi simpan-pinjam atau belanja di POS Koperasi.', 6, 17.5);
    doc.text('3. Kartu ini tidak dapat dipindahtangankan kepada orang lain.', 6, 21);

    doc.setFillColor(241, 245, 249);
    doc.rect(6, 24, 30, 4, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.1);
    doc.rect(6, 24, 30, 4, 'D');
    doc.setFont('Courier', 'italic');
    doc.setFontSize(3.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Tanda Tangan Anggota', 9, 27);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(251, 191, 36);
    doc.text('JIKA HILANG / DITEMUKAN, MOHON DIKIRIMKAN KEMBALI KEPADA:', 6, 31.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(coopName.toUpperCase(), 6, 35.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(226, 232, 240);

    let addrY = 39;
    const addrLines = doc.splitTextToSize(`Alamat Pos/Kurir: ${coopProfile.address}`, 73);
    doc.text(addrLines, 6, addrY);
    
    const lineOffset = Array.isArray(addrLines) ? addrLines.length * 2.5 : 2.5;
    addrY += lineOffset;

    doc.text(`Hubungi: ${coopProfile.phone} | ${coopProfile.email}`, 6, addrY);
    addrY += 2.8;
    doc.text(`Website: ${coopProfile.website}`, 6, addrY);

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 52, 85.6, 2, 'F');

    doc.save(`Kartu_Anggota_${m.memberNo}.pdf`);
    toast.success('Kartu anggota (2 Sisi) berhasil diunduh!');
  } catch (err) {
    console.error(err);
    toast.error('Gagal mengunduh kartu anggota.');
  }
};

export const handleDownloadBulkCardsPdf = async (params: {
  filteredMembers: Member[];
  coopName: string;
  coopProfile: CoopProfile;
  onStart?: () => void;
  onProgress?: (processed: number, total: number, toastId: string) => void;
  onSuccess?: (total: number, toastId: string) => void;
  onError?: (err: any, toastId: string) => void;
  onEnd?: () => void;
  checkMounted: () => boolean;
}) => {
  const { filteredMembers, coopName, coopProfile, onStart, onProgress, onSuccess, onError, onEnd, checkMounted } = params;
  
  if (filteredMembers.length === 0) {
    toast.error('Tidak ada data anggota untuk dicetak.');
    return;
  }

  if (onStart) onStart();
  const toastId = toast.loading(`Sedang memproses ${filteredMembers.length} kartu anggota...`);

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54]
    });

    for (let i = 0; i < filteredMembers.length; i++) {
      if (!checkMounted()) break;
      const m = filteredMembers[i];

      if (i > 0) {
        doc.addPage([85.6, 54], 'landscape');
      }

      // ================= TAMPAK DEPAN =================
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, 85.6, 54, 'F');

      doc.setFillColor(79, 70, 229);
      doc.ellipse(85.6, 0, 40, 20, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(224, 231, 255);
      doc.text(coopName.toUpperCase(), 6, 8);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const nameToShow = m.name.length > 20 ? m.name.substring(0, 18) + '..' : m.name;
      doc.text(nameToShow.toUpperCase(), 6, 17);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(199, 210, 254);
      doc.text(`Klasifikasi: ${m.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF'}`, 6, 22);

      doc.setFont('Courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(m.memberNo, 6, 35);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(156, 163, 175);
      const joinDateStr = formatIndonesianDate(m.createdAt);
      doc.text(`Bergabung: ${joinDateStr}`, 6, 40);

      const qrDataUrl = await QRCode.toDataURL(m.memberNo, { margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', 55, 12, 24, 24);

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 52, 85.6, 2, 'F');

      // ================= TAMPAK BELAKANG =================
      doc.addPage([85.6, 54], 'landscape');

      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 85.6, 54, 'F');

      doc.setFillColor(10, 10, 10); 
      doc.rect(0, 0, 85.6, 6, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(248, 250, 252); 
      doc.text('KETENTUAN PENGGUNAAN KARTU ANGGOTA', 6, 10);
      
      if (coopProfile.legalNo) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`B.H: ${coopProfile.legalNo}`, 52, 10);
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(203, 213, 225); 
      doc.text('1. Kartu ini merupakan bukti keanggotaan resmi Koperasi.', 6, 14);
      doc.text('2. Wajib dibawa saat bertransaksi simpan-pinjam atau belanja di POS Koperasi.', 6, 17.5);
      doc.text('3. Kartu ini tidak dapat dipindahtangankan kepada orang lain.', 6, 21);

      doc.setFillColor(241, 245, 249);
      doc.rect(6, 24, 30, 4, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.1);
      doc.rect(6, 24, 30, 4, 'D');
      doc.setFont('Courier', 'italic');
      doc.setFontSize(3.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Tanda Tangan Anggota', 9, 27);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(251, 191, 36);
      doc.text('JIKA HILANG / DITEMUKAN, MOHON DIKIRIMKAN KEMBALI KEPADA:', 6, 31.5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(coopName.toUpperCase(), 6, 35.5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(226, 232, 240);

      let addrY = 39;
      const addrLines = doc.splitTextToSize(`Alamat Pos/Kurir: ${coopProfile.address}`, 73);
      doc.text(addrLines, 6, addrY);
      
      const lineOffset = Array.isArray(addrLines) ? addrLines.length * 2.5 : 2.5;
      addrY += lineOffset;

      doc.text(`Hubungi: ${coopProfile.phone} | ${coopProfile.email}`, 6, addrY);
      addrY += 2.8;
      doc.text(`Website: ${coopProfile.website}`, 6, addrY);

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 52, 85.6, 2, 'F');

      if (i % 15 === 0 && i > 0) {
        if (onProgress) {
          onProgress(i, filteredMembers.length, toastId);
        } else {
          toast.loading(`Memproses: ${i} dari ${filteredMembers.length} kartu...`, { id: toastId });
        }
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    if (checkMounted()) {
      doc.save(`Kartu_Anggota_Massal_${new Date().toISOString().split('T')[0]}.pdf`);
      if (onSuccess) {
        onSuccess(filteredMembers.length, toastId);
      } else {
        toast.success(`Berhasil mencetak ${filteredMembers.length} kartu anggota (2 sisi)!`, { id: toastId });
      }
    }
  } catch (err) {
    console.error(err);
    if (onError) {
      onError(err, toastId);
    } else {
      toast.error('Gagal mencetak kartu massal.', { id: toastId });
    }
  } finally {
    if (onEnd) onEnd();
  }
};

export const parseImportExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSXStyle = await import('xlsx-js-style');
        const wb = XLSXStyle.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSXStyle.utils.sheet_to_json(ws);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
