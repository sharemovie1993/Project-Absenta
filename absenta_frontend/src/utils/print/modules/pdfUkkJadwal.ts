import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UkkJadwalSesi {
  id: string;
  nama_sesi: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  ruang: string;
  asesor_internal: string;
  asesor_eksternal: string;
  mitra_nama?: string;
  siswa_list: Array<{
    id: string;
    nis?: string;
    nama_siswa: string;
    kelas?: string;
  }>;
}

export interface UkkJadwalPrintData {
  jurusanNama: string;
  tahunPelajaran?: string;
  skemaSertifikasi?: string;
  judulPenugasan?: string;
  sekolah: {
    nama: string;
    alamat?: string;
    kota?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
  };
  kaprog?: {
    nama: string;
    nip?: string;
  };
  sesiList: UkkJadwalSesi[];
}

export const generatePdfUkkJadwal = (data: UkkJadwalPrintData): { doc: jsPDF; blobUrl: string } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header / Kop
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text((data.sekolah.nama || 'SEKOLAH MENENGAH KEJURUAN').toUpperCase(), pageWidth / 2, 18, {
    align: 'center',
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  if (data.sekolah.alamat) {
    doc.text(data.sekolah.alamat, pageWidth / 2, 23, { align: 'center' });
  }

  doc.setLineWidth(0.8);
  doc.line(margin, 27, pageWidth - margin, 27);
  doc.setLineWidth(0.3);
  doc.line(margin, 28, pageWidth - margin, 28);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('JADWAL PELAKSANAAN & PLOTING PESERTA UJI KOMPETENSI KEAHLIAN (UKK)', pageWidth / 2, 36, {
    align: 'center',
  });
  doc.setFontSize(10);
  doc.setFont('times', 'italic');
  doc.text(`Program Keahlian: ${data.jurusanNama || '-'}`, pageWidth / 2, 41, { align: 'center' });

  // Meta Info Box
  let currentY = 47;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Tahun Pelajaran : ${data.tahunPelajaran || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}`, margin, currentY);
  if (data.skemaSertifikasi) {
    doc.text(`Skema Sertifikasi: ${data.skemaSertifikasi}`, margin + 90, currentY);
  }
  currentY += 5;
  if (data.judulPenugasan) {
    doc.text(`Judul Penugasan : ${data.judulPenugasan}`, margin, currentY, { maxWidth: contentWidth });
    currentY += 6;
  }

  // Iterate Sesi
  if (!data.sesiList || data.sesiList.length === 0) {
    doc.setFont('times', 'italic');
    doc.text('Belum ada jadwal sesi yang diplotkan.', margin, currentY + 10);
  } else {
    data.sesiList.forEach((sesi, index) => {
      // Check space on page
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      // Sesi Title Header Banner
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'S');

      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `${index + 1}. ${sesi.nama_sesi.toUpperCase()} — Ruang: ${sesi.ruang || '-'} | Tanggal: ${sesi.tanggal} (${sesi.jam_mulai} - ${sesi.jam_selesai} WIB)`,
        margin + 4,
        currentY + 5
      );

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const mitraText = sesi.mitra_nama ? ` [${sesi.mitra_nama}]` : '';
      doc.text(
        `Penguji Internal: ${sesi.asesor_internal || '-'}   |   Penguji Eksternal (DU/DI): ${sesi.asesor_eksternal || '-'}${mitraText}`,
        margin + 4,
        currentY + 9.5
      );

      currentY += 15;

      // Table of Students in this Session
      const studentRows = (sesi.siswa_list || []).map((s, idx) => [
        String(idx + 1),
        s.nis || '-',
        s.nama_siswa,
        s.kelas || '-',
        '..............................',
      ]);

      if (studentRows.length === 0) {
        studentRows.push(['-', '-', 'Belum ada peserta diplotkan pada sesi ini', '-', '-']);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'NIS', 'Nama Peserta Ujian', 'Kelas', 'Paraf Kehadiran']],
        body: studentRows,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          font: 'times',
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
        },
        styles: {
          font: 'times',
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: [200, 200, 200],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 35 },
        },
      });

      // Update currentY after table
      currentY = (doc as any).lastAutoTable.finalY + 8;
    });
  }

  // Tanda Tangan Section
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY += 6;
  }

  const signDate = `${data.sekolah.kota || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);

  // Left Sign: Kaprog / Ketua Panitia
  doc.text('Mengetahui / Memverifikasi,', margin + 10, currentY);
  doc.text('Ketua Program Keahlian,', margin + 10, currentY + 5);

  // Right Sign: Kepala Sekolah
  doc.text(signDate, pageWidth - margin - 60, currentY);
  doc.text('Kepala Sekolah,', pageWidth - margin - 60, currentY + 5);

  currentY += 22;

  // Signer Names
  doc.setFont('times', 'bold');
  doc.text(data.kaprog?.nama || 'Ketua Program Keahlian', margin + 10, currentY);
  doc.text(data.sekolah.kepala_sekolah || 'Kepala Sekolah', pageWidth - margin - 60, currentY);

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, margin + 10, currentY + 4);
  doc.text(`NIP. ${data.sekolah.nip_kepala || '-'}`, pageWidth - margin - 60, currentY + 4);

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
};
