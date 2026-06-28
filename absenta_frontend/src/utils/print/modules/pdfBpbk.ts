import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { drawClassHeaderInfo } from '../pdfGeneric';

export const renderBpbkPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { printType, selectedClassId, eventDetails, filterData } = options;

  let currentY = headerEndY;
  const selectedClassObj = filterData?.classes?.find((c: any) => c.id === selectedClassId);

  if (printType === 'letter_bk_call') {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';
    const studentNis = student?.nis || '__________';
    const studentClass = student?.Kelas?.nama_kelas || filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || '________________';
    
    const details = eventDetails || {};
    const nomor = details.nomorSurat || `800 / ${studentNis ? studentNis.substring(0,4) : '___'} / BK / ${new Date().getFullYear()}`;
    
    let formattedDate = '';
    if (details.tanggalPertemuan) {
      try {
        const dt = new Date(details.tanggalPertemuan);
        const dayName = dt.toLocaleDateString('id-ID', { weekday: 'long' });
        const dateStr = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        formattedDate = `${dayName} / ${dateStr}`;
      } catch (e) {
        formattedDate = details.tanggalPertemuan;
      }
    } else {
      const tomorrow = new Date(Date.now() + 24*60*60*1000);
      const dayName = tomorrow.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = tomorrow.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      formattedDate = `${dayName} / ${dateStr}`;
    }
    
    const waktu = details.waktuPertemuan || '08.00 WIB s.d. Selesai';
    const tempat = details.tempatPertemuan || 'Ruang Konseling / BP-BK';
    const agenda = details.agendaPertemuan || 'Konsultasi Perkembangan & Layanan BK Siswa';

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('SURAT PANGGILAN ORANG TUA / WALI SISWA (BK)', pageWidth / 2, headerEndY + 6, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let textY = headerEndY + 16;
    doc.text(`Nomor : ${nomor}`, 15, textY);
    doc.text('Hal   : Panggilan Orang Tua / Wali Siswa (BK)', 15, textY + 5);
    
    doc.text('Kepada Yth.', 15, textY + 14);
    doc.setFont('Helvetica', 'bold');
    doc.text('Orang Tua / Wali dari Siswa:', 15, textY + 19);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Nama Siswa', 20, textY + 26);
    doc.text(':', 43, textY + 26);
    doc.setFont('Helvetica', 'bold');
    doc.text(studentName.toUpperCase(), 46, textY + 26);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('NIS / NISN', 20, textY + 31);
    doc.text(':', 43, textY + 31);
    doc.text(studentNis, 46, textY + 31);
    
    doc.text('Kelas', 20, textY + 36);
    doc.text(':', 43, textY + 36);
    doc.text(studentClass, 46, textY + 36);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Di Tempat', 15, textY + 44);
    
    doc.text('Dengan hormat,', 15, textY + 53);
    doc.text('Sehubungan dengan perlunya koordinasi dan konsultasi bersama Guru Bimbingan Konseling (BK)', 15, textY + 58);
    doc.text('terkait perkembangan dan bimbingan belajar/kepribadian putra/putri Bapak/Ibu di sekolah,', 15, textY + 63);
    doc.text('kami mengharap kehadiran Bapak/Ibu Orang Tua / Wali Siswa pada:', 15, textY + 68);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Hari / Tanggal', 25, textY + 76);
    doc.text(':', 55, textY + 76);
    doc.text(formattedDate, 58, textY + 76);
    
    doc.text('Waktu', 25, textY + 81);
    doc.text(':', 55, textY + 81);
    doc.text(waktu, 58, textY + 81);
    
    doc.text('Tempat', 25, textY + 86);
    doc.text(':', 55, textY + 86);
    doc.text(tempat, 58, textY + 86);
    
    doc.text('Agenda', 25, textY + 91);
    doc.text(':', 55, textY + 91);
    doc.text(agenda, 58, textY + 91);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Demikian undangan panggilan ini kami sampaikan, atas perhatian dan kehadiran Bapak/Ibu', 15, textY + 101);
    doc.text('kami mengucapkan terima kasih.', 15, textY + 106);
    
    currentY = textY + 112;
  } else if (printType === 'bk_minutes') {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';
    const studentNis = student?.nis || '__________';
    const studentClass = student?.Kelas?.nama_kelas || filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || '________________';
    
    const details = eventDetails || {};
    const nomor = details.nomorSurat || `800 / ${studentNis ? studentNis.substring(0,4) : '___'} / BK-BA / ${new Date().getFullYear()}`;
    
    let formattedDate = '';
    if (details.tanggalPertemuan) {
      try {
        const dt = new Date(details.tanggalPertemuan);
        const dayName = dt.toLocaleDateString('id-ID', { weekday: 'long' });
        const dateStr = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        formattedDate = `${dayName} / ${dateStr}`;
      } catch (e) {
        formattedDate = details.tanggalPertemuan;
      }
    } else {
      const today = new Date();
      const dayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      formattedDate = `${dayName} / ${dateStr}`;
    }

    const agenda = details.agendaPertemuan || 'Konsultasi Masalah Absensi / Kedisiplinan Siswa';

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('BERITA ACARA PERTEMUAN WALI SISWA (BK)', pageWidth / 2, headerEndY + 6, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let textY = headerEndY + 16;
    doc.text(`Nomor : ${nomor}`, 15, textY);
    
    doc.text('Pada hari ini, ' + formattedDate + ' telah dilaksanakan pertemuan di Ruang BK antara pihak', 15, textY + 10);
    doc.text('sekolah dengan Orang Tua / Wali Siswa dari:', 15, textY + 15);
    
    doc.rect(15, textY + 18, pageWidth - 30, 20);
    doc.setFont('Helvetica', 'bold');
    doc.text('Nama Siswa', 20, textY + 23);
    doc.text(':', 50, textY + 23);
    doc.text(studentName.toUpperCase(), 53, textY + 23);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('NIS / NISN', 20, textY + 28);
    doc.text(':', 50, textY + 28);
    doc.text(studentNis, 53, textY + 28);
    
    doc.text('Kelas', 20, textY + 33);
    doc.text(':', 50, textY + 33);
    doc.text(studentClass, 53, textY + 33);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('A. MASALAH / TOPIK YANG DIBAHAS:', 15, textY + 44);
    doc.setFont('Helvetica', 'normal');
    doc.text(agenda, 15, textY + 49, { maxWidth: pageWidth - 30 });
    
    doc.setFont('Helvetica', 'bold');
    doc.text('B. HASIL KESEPAKATAN & TINDAK LANJUT:', 15, textY + 62);
    doc.setFont('Helvetica', 'normal');
    doc.text('1. Orang Tua bersedia mengawasi kehadiran dan pergaulan putra/putrinya di luar jam sekolah.', 15, textY + 68);
    doc.text('2. Siswa berjanji tidak akan mengulangi perbuatan membolos/melanggar aturan sekolah.', 15, textY + 73);
    doc.text('3. Sekolah (BK & Wali Kelas) akan terus memantau presensi dan memberikan bimbingan berkala.', 15, textY + 78);
    
    doc.text('Demikian berita acara pertemuan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan', 15, textY + 89);
    doc.text('sebagaimana mestinya.', 15, textY + 94);
    
    currentY = textY + 104;
  } else if (printType === 'bk_statement') {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';
    const studentNis = student?.nis || '__________';
    const studentClass = student?.Kelas?.nama_kelas || filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || '________________';
    
    const details = eventDetails || {};
    const nomor = details.nomorSurat || `800 / ${studentNis ? studentNis.substring(0,4) : '___'} / BK-SP / ${new Date().getFullYear()}`;

    const agenda = details.agendaPertemuan || 'Sering Membolos / Terlambat Masuk Sekolah';

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('SURAT PERNYATAAN / PERJANJIAN ORANG TUA SISWA (BK)', pageWidth / 2, headerEndY + 6, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let textY = headerEndY + 16;
    doc.text(`Nomor : ${nomor}`, 15, textY);
    
    doc.text('Saya yang bertanda tangan di bawah ini, selaku Orang Tua / Wali dari siswa:', 15, textY + 10);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Nama Siswa', 25, textY + 18);
    doc.text(':', 55, textY + 18);
    doc.text(studentName.toUpperCase(), 58, textY + 18);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('NIS', 25, textY + 23);
    doc.text(':', 55, textY + 23);
    doc.text(studentNis, 58, textY + 23);
    
    doc.text('Kelas', 25, textY + 28);
    doc.text(':', 55, textY + 28);
    doc.text(studentClass, 58, textY + 28);
    
    doc.text('Menyatakan dengan sesungguhnya bahwa terkait tindakan putra/putri kami berupa:', 15, textY + 36);
    doc.setFont('Helvetica', 'bold');
    doc.text(`"${agenda}"`, 15, textY + 41, { maxWidth: pageWidth - 30 });
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Maka saya berjanji dan sanggup untuk:', 15, textY + 50);
    doc.text('1. Melakukan pembinaan, pengawasan, dan bimbingan lebih ketat di rumah.', 15, textY + 56);
    doc.text('2. Memastikan putra/putri kami hadir di sekolah tepat waktu setiap hari efektif.', 15, textY + 61);
    doc.text('3. Menerima keputusan sekolah jika di kemudian hari putra/putri kami melanggar perjanjian ini.', 15, textY + 66);
    
    doc.text('Surat pernyataan ini saya buat dengan sadar, penuh tanggung jawab, tanpa paksaan dari pihak mana pun,', 15, textY + 76);
    doc.text('serta bersedia ditempel materai Rp 10.000,-.', 15, textY + 81);
    
    currentY = textY + 90;
  } else if (printType === 'student_attendance_card') {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';
    const studentNis = student?.nis || '__________';

    const tableStartY = drawClassHeaderInfo(
      doc,
      'KARTU KONTROL KEHADIRAN SISWA TERBINA (BK)',
      selectedClassObj,
      headerEndY,
      pageWidth,
      options.checklistData
    );

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Nama Siswa : ${studentName.toUpperCase()}  |  NIS: ${studentNis}`, 15, tableStartY - 1);
    
    const head = [['HARI / TANGGAL', 'JAM DATANG', 'PARAF PIKET', 'JAM PULANG', 'PARAF PIKET', 'CATATAN']];
    const body = Array.from({ length: 12 }).map(() => ['', '', '', '', '', '']);
    
    autoTable(doc, {
      startY: tableStartY + 3,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2.2, minCellHeight: 8.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225], fontStyle: 'bold' },
      bodyStyles: { lineWidth: 0.15, lineColor: [203, 213, 225] }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? (tableStartY + 50);
  } else {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';

    const tableStartY = drawClassHeaderInfo(
      doc,
      'KARTU KONSULTASI & LAYANAN BK',
      selectedClassObj,
      headerEndY,
      pageWidth,
      options.checklistData
    );

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Nama Siswa : ${studentName.toUpperCase()}`, 15, tableStartY - 1);
    
    const head = [['TANGGAL', 'PERMASALAHAN SISWA', 'TINDAK LANJUT / SOLUSI', 'PARAF BK']];
    
    const counselings = filterData?.counselings || [];
    let body = [];
    
    if (counselings.length > 0) {
      body = counselings.map((c: any) => [
        new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        c.permasalahan || c.alasan || '-',
        c.tindak_lanjut || c.solusi || '-',
        ''
      ]);
    } else {
      body = Array.from({ length: 6 }).map(() => ['', '', '', '']);
    }
    
    autoTable(doc, {
      startY: tableStartY + 3,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3, minCellHeight: counselings.length > 0 ? 8 : 15 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? (tableStartY + 50);
  }

  return currentY;
};
