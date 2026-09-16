import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { renderSertifikatFront, renderSertifikatBack, SertifikatPklPrintData } from './pdfSertifikatPkl';

export const renderHubinPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { filterData, printType, sekolah, tenantInfo, logoDaerahBase64 } = options;

  // Handle Certificate Print Type
  if (printType === 'pkl_sertifikat' || printType === 'pkl_certificate') {
    const penempatanList = filterData?.penempatanList || filterData?.penempatanMap?.[options.selectedClassId] || [];
    
    // If we have students, render certificates for them
    if (penempatanList.length > 0) {
      penempatanList.forEach((p: any, idx: number) => {
        if (idx > 0) {
          doc.addPage('a4', 'landscape');
        }
        const certData: SertifikatPklPrintData = {
          nomor_sertifikat: p.nomor_sertifikat || `425.1/${String(idx + 1).padStart(4, '0')}/SMKN1PLD-KCD Wil.IV`,
          durasi_jp: 792,
          tanggal_terbit: `${sekolah?.kota || 'Purwakarta'}, 22 Desember 2025`,
          sekolah: {
            nama: sekolah?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED',
            alamat: sekolah?.alamat || tenantInfo?.address || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta',
            kota: sekolah?.kota || 'Purwakarta',
            kode_pos: sekolah?.kode_pos || '41162',
            telepon: sekolah?.telepon || tenantInfo?.phone || '(0264) 7504001',
            email: sekolah?.email || tenantInfo?.email || 'smkneple@gmail.com',
            website: sekolah?.website || tenantInfo?.website || 'smknegeri1plered.sch.id',
            kepala_sekolah: sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.',
            nip_kepala: sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001',
          },
          siswa: {
            nama_siswa: p.Siswa?.nama_siswa || 'AHMAD FADILAH',
            nis: p.Siswa?.nis || '-',
            nisn: p.Siswa?.nisn || '-',
            tempat_lahir: p.Siswa?.tempat_lahir || 'Purwakarta',
            tanggal_lahir: p.Siswa?.tanggal_lahir || new Date('2008-10-15'),
            foto: p.Siswa?.foto || null,
            program_keahlian: p.Siswa?.Jurusan?.ProgramKeahlian?.nama || 'Teknik Otomotif',
            konsentrasi_keahlian: p.Siswa?.Jurusan?.nama || p.Siswa?.Kelas?.nama_kelas || 'Teknik Sepeda Motor',
            nama_kelas: p.Siswa?.Kelas?.nama_kelas || '-',
          },
          mitra: {
            nama: p.Mitra?.nama || p.mitra_nama || 'POST MITRA',
            alamat: p.alamat_dudi || p.Mitra?.alamat || 'Jl. Raya Citeko-Plered-Purwakarta',
            penanggung_jawab_nama: p.penanggung_jawab_nama || p.Mitra?.pic_nama || '',
          },
          penilaian: {
            hard_kompetensi_teknis: p.hard_kompetensi_teknis ?? 88,
            hard_sop_k3lh: p.hard_sop_k3lh ?? 89,
            hard_alur_bisnis: p.hard_alur_bisnis ?? 87,
            soft_kedisiplinan: p.soft_kedisiplinan ?? 83,
            soft_kerajinan_inisiatif: p.soft_kerajinan_inisiatif ?? 84,
            soft_kerjasama: p.soft_kerjasama ?? 86,
            soft_kejujuran: p.soft_kejujuran ?? 88,
            soft_tanggung_jawab: p.soft_tanggung_jawab ?? 85,
            nilai_akhir_pkl: p.nilai_akhir_pkl ?? 86.25,
            predikat_pkl: p.predikat_pkl || 'BAIK',
          },
        };

        // Render front page
        renderSertifikatFront(doc, certData, { logoDaerahBase64 });
        
        // Render back page
        doc.addPage('a4', 'landscape');
        renderSertifikatBack(doc, certData);
      });

      return pageHeight - 20;
    }
  }

  // Default: Surat Pengantar PKL
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
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
  
  const penempatanList = filterData?.penempatanList || [];
  let body = [];
  
  if (penempatanList.length > 0) {
    body = penempatanList.map((p: any) => [
      p.Siswa?.nis || '-',
      p.Siswa?.nama_siswa || '-',
      p.Siswa?.Kelas?.nama_kelas || '-'
    ]);
  } else {
    body = [
      ['1023881', 'AHMAD SULAIMAN', 'Teknik Komputer Jaringan (TKJ)'],
      ['1023882', 'BUDI SETIAWAN', 'Teknik Komputer Jaringan (TKJ)']
    ];
  }

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
  
  return sigY + 12;
};
