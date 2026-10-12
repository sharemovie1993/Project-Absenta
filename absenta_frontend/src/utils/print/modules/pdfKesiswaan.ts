import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { drawClassHeaderInfo } from '../pdfGeneric';

export const renderKesiswaanPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { printType, selectedClassId, eventDetails, filterData } = options;

  let currentY = headerEndY;

  if (printType === 'letter_summons') {
    const student = filterData?.selectedStudent;
    const studentName = student?.nama_siswa || '____________________________';
    const studentNis = student?.nis || '__________';
    const studentClass = filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || '________________';
    
    const details = eventDetails || {};
    const nomor = details.nomorSurat || `800 / ${studentNis ? studentNis.substring(0,4) : '___'} / Kesiswaan / ${new Date().getFullYear()}`;
    
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
    const tempat = details.tempatPertemuan || 'Ruang Wakil Kepala Sekolah / Staf Kesiswaan';
    const agenda = details.agendaPertemuan || 'Koordinasi Kedisiplinan & Perkembangan Siswa';

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('SURAT PANGGILAN ORANG TUA / WALI SISWA (KESISWAAN)', pageWidth / 2, headerEndY + 6, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let textY = headerEndY + 16;
    doc.text(`Nomor : ${nomor}`, 15, textY);
    doc.text('Hal   : Panggilan Orang Tua / Wali Siswa', 15, textY + 5);
    
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
    doc.text('Sehubungan dengan adanya hal penting yang perlu dikoordinasikan bersama jajaran kesiswaan', 15, textY + 58);
    doc.text('terkait ketertiban, kedisiplinan, and perkembangan proses KBM putra/putri Bapak/Ibu di sekolah,', 15, textY + 63);
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
    doc.text('Demikian undangan panggilan ini kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu', 15, textY + 101);
    doc.text('kami mengucapkan terima kasih.', 15, textY + 106);
    
    currentY = textY + 112;
  } else if (printType === 'jadwal_pembina_upacara') {
    // ── DOKUMEN RESMI: JADWAL PEMBINA UPACARA BENDERA ──
    const schedulesList: any[] = filterData?.schedules || [];
    const tahunAjar = filterData?.tahunAjaranNama || options.checklistData?.current_year?.tahun || getAcademicYearFromPeriod();
    const semesterNama = filterData?.semesterNama || 'Ganjil';

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DAFTAR PENUGASAN PEMBINA & PETUGAS UPACARA BENDERA', pageWidth / 2, headerEndY + 6, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text(`SEMESTER ${semesterNama.toUpperCase()} TAHUN PELAJARAN ${tahunAjar}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    const subDesc = 'Lampiran resmi rotasi penugasan pembina upacara bendera hari Senin dan rombel petugas pelaksana upacara.';
    doc.text(subDesc, pageWidth / 2, headerEndY + 16, { align: 'center' });

    const tableStartY = headerEndY + 20;

    const head = [[
      { content: 'NO', styles: { halign: 'center' } },
      { content: 'HARI / TANGGAL', styles: { halign: 'center' } },
      { content: 'PEMBINA UPACARA UTAMA' },
      { content: 'ROMBEL PETUGAS UPACARA', styles: { halign: 'center' } },
      { content: 'TEMA / AMANAT UPACARA' },
      { content: 'KETERANGAN / STATUS', styles: { halign: 'center' } },
    ]];

    let body: any[] = [];
    if (schedulesList.length > 0) {
      body = schedulesList.map((item: any, idx: number) => {
        let tglFormatted = '-';
        try {
          const dt = new Date(item.tanggal);
          tglFormatted = dt.toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        } catch {
          tglFormatted = item.tanggal || '-';
        }

        const pembinaName = item.GuruUtama?.nama_guru || '-';
        const pembinaNip = item.GuruUtama?.nip ? `\nNIP: ${item.GuruUtama.nip}` : '';
        const penggantiName = item.GuruPengganti?.nama_guru 
          ? `\n(Digantikan: ${item.GuruPengganti.nama_guru})` 
          : '';

        const rombel = item.KelasPetugas?.nama_kelas || '-';
        const tema = item.tema_amanat || '-';
        const status = item.status === 'SELESAI' 
          ? 'Terlaksana' 
          : item.status === 'DIGANTIKAN' 
            ? 'Handover / Digantikan' 
            : item.status === 'DIBATALKAN' 
              ? 'Dibatalkan' 
              : 'Dijadwalkan';

        return [
          (idx + 1).toString(),
          tglFormatted,
          `${pembinaName}${pembinaNip}${penggantiName}`,
          rombel,
          tema,
          status,
        ];
      });
    } else {
      body = [
        ['1', 'Senin, 21 Jul 2026', 'Drs. H. Mulyono\nNIP: 19680512 199403 1 004', 'X PPLG 1', 'Disiplin dan Integritas Siswa', 'Dijadwalkan'],
        ['2', 'Senin, 28 Jul 2026', 'Siti Aminah, S.Pd.\nNIP: 19750211 200003 2 003', 'X PPLG 2', 'Semangat Belajar di Era Digital', 'Dijadwalkan'],
        ['3', 'Senin, 04 Agu 2026', 'Ahmad Dahlan, M.Kom.\nNIP: 19820419 200801 1 012', 'XI TKJ 1', 'Mencegah Perundungan (Anti-Bullying)', 'Dijadwalkan'],
      ];
    }

    autoTable(doc, {
      startY: tableStartY,
      head: head as any,
      body: body as any,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2.5 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        lineWidth: 0.15,
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        lineWidth: 0.15,
        lineColor: [0, 0, 0],
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 55 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 42 },
        5: { cellWidth: 22, halign: 'center' },
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY ?? (tableStartY + 50);
  } else {
    // Default Kesiswaan: Violations / Achievements Recap
    const isAchievements = printType === 'recap_achievements';
    const documentTitle = isAchievements 
      ? 'LAPORAN REKAPITULASI PRESTASI SISWA KELAS' 
      : 'LAPORAN REKAPITULASI PELANGGARAN KELAS';
    
    const selectedClassObj = filterData?.classes?.find((c: any) => c.id === selectedClassId);
    
    const tableStartY = drawClassHeaderInfo(
      doc,
      documentTitle,
      selectedClassObj,
      headerEndY,
      pageWidth,
      options.checklistData
    );

    const head = isAchievements 
      ? [['NO', 'TANGGAL', 'NAMA SISWA', 'PRESTASI / PENGHARGAAN', 'KATEGORI / TINGKAT']]
      : [['NO', 'TANGGAL', 'NAMA SISWA', 'JENIS PELANGGARAN', 'POIN INFR']];
    
    const listPelanggaran = filterData?.violations || [];
    const listAchievements = filterData?.achievements || [];
    let body = [];
    
    if (isAchievements) {
      if (listAchievements.length > 0) {
        body = listAchievements.map((p: any, idx: number) => [
          (idx + 1).toString(),
          new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          p.Siswa?.nama_siswa || '-',
          p.nama_prestasi || '-',
          p.tingkat_prestasi || '-'
        ]);
      } else {
        body = [
          ['1', '28 Jun 2026', 'AHMAD SULAIMAN', 'Juara 1 Lomba LKS Cloud Computing', 'Kabupaten'],
          ['2', '27 Jun 2026', 'CITRA LESTARI', 'Juara 3 Pencak Silat Piala Dispora', 'Provinsi']
        ];
      }
    } else {
      if (listPelanggaran.length > 0) {
        body = listPelanggaran.map((p: any, idx: number) => [
          (idx + 1).toString(),
          new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          p.Siswa?.nama_siswa || '-',
          p.JenisPelanggaran?.nama_pelanggaran || '-',
          `${p.JenisPelanggaran?.poin || 0} Poin`
        ]);
      } else {
        body = [
          ['1', '28 Jun 2026', 'AHMAD SULAIMAN', 'Keterlambatan masuk kelas > 15 menit', '5 Poin'],
          ['2', '28 Jun 2026', 'BUDI SETIAWAN', 'Atribut seragam sekolah tidak lengkap', '2 Poin'],
          ['3', '27 Jun 2026', 'CITRA LESTARI', 'Keluar lingkungan sekolah tanpa izin', '10 Poin']
        ];
      }
    }

    autoTable(doc, {
      startY: tableStartY,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? (tableStartY + 50);
  }

  return currentY;
};
