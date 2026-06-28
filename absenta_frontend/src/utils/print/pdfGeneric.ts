import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';

export interface GenerateGenericPdfOptions {
  module: 'kurikulum' | 'kesiswaan' | 'attendance' | 'bpbk' | 'sarpras' | 'hubin';
  printType: string;
  selectedClassId: string;
  sekolah: Sekolah | null;
  tenantInfo: Tenant | null;
  strukturList: StrukturOrganisasi[];
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  includeSchoolLogo: boolean;
  filterData?: Record<string, any>;
}

const drawKopSurat = (
  doc: jsPDF,
  pageWidth: number,
  sekolah: Sekolah | null,
  tenantInfo: Tenant | null,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  includeSchoolLogo: boolean
): number => {
  if (logoDaerahBase64) {
    try {
      doc.addImage(logoDaerahBase64, 'PNG', 15, 10, 16, 16);
    } catch (e) {
      console.warn('Failed to add logo daerah', e);
    }
  }
  if (includeSchoolLogo && logoSekolahBase64) {
    try {
      doc.addImage(logoSekolahBase64, 'PNG', pageWidth - 31, 10, 16, 16);
    } catch (e) {
      console.warn('Failed to add logo sekolah', e);
    }
  }

  const rawLines = tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
    ? tenantInfo.print_header_lines
    : [
        tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
        tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
        tenantInfo?.nama_cabang_dinas || 'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV',
        tenantInfo?.name || sekolah?.nama || 'SMK NEGERI ABSENTA'
      ];
      
  const parsedLines = rawLines.map(line => {
    if (typeof line === 'object' && line !== null) return line as any;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) return parsed;
    } catch (e) {}
    return { text: line };
  });

  let currentY = 13;
  parsedLines.forEach((line, index) => {
    const isLast = index === parsedLines.length - 1;
    const isSecondLast = index === parsedLines.length - 2 && parsedLines.length > 1;
    let fontSize = line.fontSize ? line.fontSize * 0.7 : (isLast ? 11 : (isSecondLast ? 8.5 : 7.5));
    let isBold = line.bold !== undefined ? line.bold : (isLast || isSecondLast);

    doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(String(line.text).toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += (fontSize * 0.35) + 1.2;
  });

  const address = tenantInfo?.address || sekolah?.alamat || '';
  const phone = tenantInfo?.phone || sekolah?.telepon || '';
  const email = tenantInfo?.email || sekolah?.email || '';
  const website = tenantInfo?.website || sekolah?.website || '';

  if (address) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${address}${phone ? ` | Telp: ${phone}` : ''}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3.2;
  }
  if (website || email) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${website ? `Website: ${website}` : ''}${email ? ` | Email: ${email}` : ''}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(15, currentY, pageWidth - 15, currentY);
  doc.setLineWidth(0.18);
  doc.line(15, currentY + 0.6, pageWidth - 15, currentY + 0.6);

  return currentY + 2.5;
};

export const generateGenericPdf = async (options: GenerateGenericPdfOptions): Promise<Blob> => {
  const {
    module,
    printType,
    selectedClassId,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    filterData
  } = options;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Retrieve principal details
  const principalAssign = strukturList?.find(s => s.kode === 'KEPALA_SEKOLAH');
  const principalGuru = principalAssign?.organizationalAssigns?.[0]?.User?.Guru;
  const principalName = principalGuru?.nama_guru || sekolah?.kepala_sekolah || 'DRS. H. CONTOH KEPSEK, M.Pd.';
  let principalNip = principalGuru?.nip || sekolah?.nip_kepala || '19720512 199803 1 002';
  if (principalNip && !principalNip.startsWith('NIP')) {
    principalNip = `NIP. ${principalNip}`;
  }

  // Handle Kurikulum Roster Multi-page printing
  if (module === 'kurikulum' && printType === 'roster') {
    const jadwalList = (filterData?.jadwalList || []) as any[];

    // Group schedules by class
    const classGroups = new Map<string, any[]>();
    if (selectedClassId === 'all') {
      jadwalList.forEach(j => {
        const name = j.Kelas?.nama_kelas || 'Tanpa Kelas';
        if (!classGroups.has(name)) classGroups.set(name, []);
        classGroups.get(name)!.push(j);
      });
    } else {
      // Find class name from schedules or fall back to selected ID
      const matchingJadwal = jadwalList.find(j => j.kelas_id === selectedClassId);
      const name = matchingJadwal?.Kelas?.nama_kelas || 'Kelas';
      classGroups.set(name, jadwalList);
    }

    const classNamesList = Array.from(classGroups.keys());
    const totalClasses = classNamesList.length > 0 ? classNamesList.length : 1;

    for (let classIndex = 0; classIndex < totalClasses; classIndex++) {
      const className = classNamesList[classIndex] || '---';
      const classJadwal = classGroups.get(className) || [];

      // 1. Draw Header
      const headerEndY = drawKopSurat(
        doc,
        pageWidth,
        sekolah,
        tenantInfo,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo
      );

      // 2. Draw Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('JADWAL PELAJARAN MINGGUAN KELAS', pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`KELAS: ${className.toUpperCase()}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

      // 3. Draw Timetable Grid
      const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
      const head = [['JAM KE-', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT']];

      const slots = Array.from(
        new Set(
          classJadwal.map(j => `${j.jam_mulai.substring(0, 5)} - ${j.jam_selesai.substring(0, 5)}`)
        )
      ).sort();

      let body: any[] = [];
      if (slots.length > 0) {
        body = slots.map((slot, index) => {
          const row = [`Jam ${index + 1}\n(${slot})`];
          days.forEach(day => {
            const matches = classJadwal.filter(j =>
              j.hari === day &&
              `${j.jam_mulai.substring(0, 5)} - ${j.jam_selesai.substring(0, 5)}` === slot
            );
            if (matches.length > 0) {
              row.push(
                matches.map(m => `${m.Mapel?.nama_mapel || 'Mapel'}\n(${m.Guru?.User?.full_name || 'Guru'})`).join('\n\n')
              );
            } else {
              row.push('-');
            }
          });
          return row;
        });
      } else {
        body = Array.from({ length: 8 }).map((_, i) => [
          `Jam ${i + 1}`, '-', '-', '-', '-', '-'
        ]);
      }

      autoTable(doc, {
        startY: headerEndY + 16,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 7, font: 'Helvetica', cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' }
        }
      });

      // 4. Draw Signature
      let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
      if (finalY + 35 > pageHeight) {
        doc.addPage();
        finalY = 20;
      }
      const sigY = finalY + 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(dateText, pageWidth - 65, sigY - 4, { align: 'center' });
      doc.text('Kepala Sekolah,', pageWidth - 65, sigY, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.text(principalName, pageWidth - 65, sigY + 22, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(principalNip, pageWidth - 65, sigY + 26, { align: 'center' });

      if (classIndex < totalClasses - 1) {
        doc.addPage();
      }
    }
  } else {
    // Single page document rendering (For other modules currently)
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );

    doc.setFont('Helvetica', 'bold');
    
    if (module === 'kurikulum' && printType === 'calendar') {
      doc.setFontSize(11);
      doc.text('KALENDER AKADEMIK & HARI EFEKTIF SEKOLAH', pageWidth / 2, headerEndY + 6, { align: 'center' });
      
      const head = [['BULAN', 'HARI EFEKTIF', 'HARI LIBUR', 'KEGIATAN UTAMA']];
      const body = [
        ['Juli', '18 Hari', '13 Hari', 'PLS & Awal Tahun Ajaran'],
        ['Agustus', '21 Hari', '10 Hari', 'HUT RI & Pembelajaran Efektif'],
        ['September', '19 Hari', '11 Hari', 'Asesmen Tengah Semester'],
        ['Oktober', '22 Hari', '9 Hari', 'Bulan Bahasa & Pembelajaran'],
        ['November', '21 Hari', '9 Hari', 'Praktik Industri'],
        ['Desember', '10 Hari', '21 Hari', 'PAS & Pembagian Rapor']
      ];
      autoTable(doc, {
        startY: headerEndY + 14,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      });
    } else if (module === 'kesiswaan') {
      if (printType === 'letter_summons') {
        doc.setFontSize(11);
        doc.text('SURAT PANGGILAN ORANG TUA / WALI SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        let textY = headerEndY + 16;
        doc.text('Nomor : 800 / _____ / Kesiswaan', 15, textY);
        doc.text('Hal   : Panggilan Orang Tua', 15, textY + 5);
        
        doc.text('Kepada Yth.', 15, textY + 15);
        doc.text('Orang Tua / Wali dari Siswa:', 15, textY + 20);
        doc.setFont('Helvetica', 'bold');
        doc.text('Nama Siswa : ____________________________', 15, textY + 26);
        doc.text('Kelas      : ____________________________', 15, textY + 31);
        
        doc.setFont('Helvetica', 'normal');
        doc.text('Di tempat', 15, textY + 38);
        
        doc.text('Dengan hormat, mengharap kehadiran Bapak/Ibu Orang Tua/Wali Siswa pada:', 15, textY + 48);
        doc.text('Hari/Tanggal : Senin / _____________________', 25, textY + 54);
        doc.text('Waktu        : 08.00 WIB s.d Selesai', 25, textY + 59);
        doc.text('Tempat       : Ruang Kesiswaan / BP-BK', 25, textY + 64);
        doc.text('Agenda       : Klarifikasi & Konsultasi Perkembangan Siswa', 25, textY + 69);
        
        doc.text('Demikian surat panggilan ini disampaikan, atas perhatian Bapak/Ibu kami ucapkan terima kasih.', 15, textY + 79);
      } else {
        doc.setFontSize(11);
        doc.text('REKAPITULASI DATA KESISWAAN', pageWidth / 2, headerEndY + 6, { align: 'center' });
        
        const head = [['NO', 'NAMA DOKUMEN DIBUAT', 'FORMAT BERKAS', 'TANGGAL PENGECEKAN']];
        const body = [
          ['1', 'Laporan Pelanggaran Harian', 'PDF / Lembar Fisik', new Date().toLocaleDateString('id-ID')],
          ['2', 'Rekapitulasi Prestasi Siswa', 'PDF / Excel', new Date().toLocaleDateString('id-ID')],
          ['3', 'SK Pembina & Pengurus OSIS', 'Dokumen Resmi', new Date().toLocaleDateString('id-ID')]
        ];
        autoTable(doc, {
          startY: headerEndY + 14,
          head,
          body,
          theme: 'grid',
          styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3.5 },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
        });
      }
    } else if (module === 'attendance') {
      doc.setFontSize(11);
      doc.text('REKAP KEHADIRAN & ABSENSI BULANAN', pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`KELAS: ${selectedClassId.toUpperCase() || 'SEMUA'}  |  BULAN: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

      const head = [['NO', 'NIS', 'NAMA SISWA', 'HADIR', 'SAKIT', 'IZIN', 'ALFA', 'PERSENTASE']];
      const body = [
        ['1', '1023881', 'AHMAD SULAIMAN', '20 Hari', '0 Hari', '1 Hari', '0 Hari', '95%'],
        ['2', '1023882', 'BUDI SETIAWAN', '21 Hari', '0 Hari', '0 Hari', '0 Hari', '100%'],
        ['3', '1023883', 'CITRA LESTARI', '19 Hari', '1 Hari', '1 Hari', '0 Hari', '90%'],
        ['4', '1023884', 'DEWI ANGRAENI', '21 Hari', '0 Hari', '0 Hari', '0 Hari', '100%'],
        ['5', '1023885', 'EKO PRASETYO', '18 Hari', '0 Hari', '1 Hari', '2 Hari', '85%']
      ];
      autoTable(doc, {
        startY: headerEndY + 16,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      });
    } else if (module === 'bpbk') {
      doc.setFontSize(11);
      doc.text('KARTU KONSULTASI & LAYANAN BK', pageWidth / 2, headerEndY + 6, { align: 'center' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      let textY = headerEndY + 15;
      doc.text('Nama Siswa : _________________________________  |  Kelas: ____________', 15, textY);
      
      const head = [['TANGGAL', 'PERMASALAHAN SISWA', 'TINDAK LANJUT / SOLUSI', 'PARAF BK']];
      const body = Array.from({ length: 6 }).map(() => ['', '', '', '']);
      autoTable(doc, {
        startY: textY + 6,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3, minCellHeight: 15 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      });
    } else if (module === 'sarpras') {
      doc.setFontSize(11);
      doc.text('DAFTAR INVENTARIS BARANG & ASET RUANGAN', pageWidth / 2, headerEndY + 6, { align: 'center' });
      
      const head = [['KODE BARANG', 'NAMA BARANG ASET', 'JUMLAH', 'KONDISI BAIK', 'KONDISI RUSAK']];
      const body = [
        ['INV-LAB1-001', 'Komputer PC Client Intel Core i5', '20 Unit', '19 Unit', '1 Unit'],
        ['INV-LAB1-002', 'Meja Komputer Kayu', '20 Unit', '20 Unit', '0 Unit'],
        ['INV-LAB1-003', 'Kursi Hidrolik Hitam', '20 Unit', '18 Unit', '2 Unit'],
        ['INV-LAB1-004', 'Air Conditioner (AC) Daikin 2 PK', '2 Unit', '2 Unit', '0 Unit'],
        ['INV-LAB1-005', 'Projector Epson EB-X400', '1 Unit', '1 Unit', '0 Unit']
      ];
      autoTable(doc, {
        startY: headerEndY + 14,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      });
    } else if (module === 'hubin') {
      doc.setFontSize(11);
      doc.text('SURAT PENGANTAR PRAKTEK KERJA LAPANGAN (PKL)', pageWidth / 2, headerEndY + 6, { align: 'center' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      let textY = headerEndY + 16;
      doc.text('Nomor : 800 / _____ / Hubin / ' + new Date().getFullYear(), 15, textY);
      doc.text('Hal   : Permohonan Tempat & Pengantar PKL', 15, textY + 5);
      
      doc.text('Kepada Yth.', 15, textY + 15);
      doc.setFont('Helvetica', 'bold');
      doc.text('Pimpinan / HRD DUDI / Industri Mitra', 15, textY + 20);
      doc.setFont('Helvetica', 'normal');
      doc.text('Di tempat', 15, textY + 25);
      
      doc.text('Dengan hormat,', 15, textY + 34);
      doc.text('Dalam rangka membekali keterampilan siswa, kami mengajukan permohonan agar siswa berikut:', 15, textY + 39);
      
      const head = [['NIS', 'NAMA SISWA LENGKAP', 'JURUSAN / KONSENTRASI']];
      const body = [
        ['1023881', 'AHMAD SULAIMAN', 'Teknik Komputer Jaringan (TKJ)'],
        ['1023882', 'BUDI SETIAWAN', 'Teknik Komputer Jaringan (TKJ)']
      ];
      autoTable(doc, {
        startY: textY + 44,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      });
      
      let sigY = (doc as any).lastAutoTable?.finalY ?? (textY + 65);
      doc.text('Diperkenankan melaksanakan PKL di perusahaan Bapak/Ibu mulai bulan Juli s.d Desember.', 15, sigY + 8);
    }

    // Shared Bottom Signature
    let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }
    const sigY = finalY + 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    doc.text(dateText, pageWidth - 65, sigY - 4, { align: 'center' });
    doc.text('Kepala Sekolah,', pageWidth - 65, sigY, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.text(principalName, pageWidth - 65, sigY + 22, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(principalNip, pageWidth - 65, sigY + 26, { align: 'center' });
  }

  return doc.output('blob');
};
