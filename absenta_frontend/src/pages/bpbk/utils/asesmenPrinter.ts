import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawKopSurat } from '../../../utils/print/pdfGeneric';
import type { AsesmenSiswa } from '../../../api/bpbk.api';
import type { Tenant } from '../../../api/tenants.api';
import type { Sekolah } from '../../../api/academic/sekolah.api';

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
}

export function printAsesmenBlankSheet(
  tenantInfo: Tenant | null,
  sekolah: Sekolah | null,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  printPreset: string,
  printKelas: string,
  printSiswa: Student | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Draw Kop Surat using the shared utility!
  const headerEndY = drawKopSurat(
    doc,
    pageWidth,
    sekolah,
    tenantInfo,
    logoDaerahBase64,
    logoSekolahBase64,
    true
  );

  let currentY = headerEndY + 12;

  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const namaSiswaVal = printSiswa ? printSiswa.nama_siswa : '.......................................................';
  const nisSiswaVal = printSiswa ? (printSiswa.nis || '-') : '.......................................................';
  const kelasSiswaVal = printSiswa ? (printSiswa.Kelas?.nama_kelas || printKelas) : (printKelas || '.......................................................');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`INSTRUMEN EVALUASI CETAK: ${printPreset.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Profile Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Nama Lengkap', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${namaSiswaVal}`, 45, currentY);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Hari, Tanggal', 115, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${dateStr}`, 145, currentY);

  currentY += 5;

  doc.setFont('Helvetica', 'bold');
  doc.text('NIS / NISN', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${nisSiswaVal}`, 45, currentY);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Kelas / Target', 115, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${kelasSiswaVal}`, 145, currentY);

  currentY += 10;

  // Render Questions Table based on preset
  if (printPreset.includes('Gaya Belajar')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian Gaya Belajar: Bacalah setiap pernyataan di bawah ini dengan tenang. Berikan tanda silang (X) pada salah satu pilihan jawaban (A, B, atau C) yang paling mencerminkan kebiasaan belajar Anda.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Ketika menghafal materi pelajaran, saya biasanya cenderung:\nA. Membayangkan tulisan atau gambar materi tersebut di buku.\nB. Mengucapkan secara keras atau mengeja kata-katanya.\nC. Menuliskan berulang kali di coret-coretan kertas.', '[ A ]  [ B ]  [ C ]'],
      ['2', 'Saat mendengarkan guru menjelaskan materi pelajaran di kelas, saya:\nA. Fokus memperhatikan papan tulis dan slide presentasi guru.\nB. Senang mendengar penjelasan verbal guru dan diskusi kelas.\nC. Menggerakkan pulpen, mencoret kertas, atau menggoyang kaki.', '[ A ]  [ B ]  [ C ]'],
      ['3', 'Jika ada waktu luang, aktivitas hobi yang lebih saya sukai adalah:\nA. Membaca novel, komik, majalah, atau melihat galeri foto.\nB. Mendengarkan musik, podcast, radio, atau mengobrol ringan.\nC. Berolahraga, berkebun, merakit lego, atau membuat prakarya.', '[ A ]  [ B ]  [ C ]'],
      ['4', 'Ketika mencari arah jalan ke tempat baru, saya lebih terbantu oleh:\nA. Aplikasi peta digital visual (seperti Google Maps / petunjuk gambar).\nB. Instruksi verbal penjelasan suara orang lain yang menunjukkannya.\nA. Berjalan langsung mencoba rute jalan sampai ketemu lokasinya.', '[ A ]  [ B ]  [ C ]'],
      ['5', 'Saya paling mudah mengingat teman sekelas dari aspek:\nA. Wajahnya yang khas atau penampilannya (gaya rambut/baju).\nB. Suara vokalnya saat berbicara atau nama panggilannya.\nC. Gerakan fisiknya saat berjalan, bermain, atau bercanda.', '[ A ]  [ B ]  [ C ]'],
      ['6', 'Dalam kegiatan kelompok, saya biasanya paling aktif berperan:\nA. Membuat diagram grafis, mind-mapping visual, atau poster.\nB. Melakukan presentasi lisan atau berdiskusi mematangkan ide.\nC. Mencoba alat peraga, memotong kertas, merakit alat simulasi.', '[ A ]  [ B ]  [ C ]'],
      ['7', 'Masalah utama saya yang paling mengganggu konsentrasi belajar:\nA. Kondisi sekitar berantakan, tulisan guru tidak rapi di papan.\nB. Suara bising dari luar kelas atau teman lain yang berbisik.\nC. Kursi/meja belajar tidak nyaman atau suhu kelas pengap.', '[ A ]  [ B ]  [ C ]'],
      ['8', 'Gaya berbicara saya cenderung didominasi oleh sifat:\nA. Berbicara cepat, teratur, dan sering memakai visualisasi kata.\nB. Tempo sedang, senang bercerita, dan intonasi ritmis dinamis.\nC. Tempo lambat, banyak gestur tangan, menyentuh lawan bicara.', '[ A ]  [ B ]  [ C ]'],
      ['9', 'Saat membaca buku pelajaran, kebiasaan yang paling sering muncul:\nA. Membaca cepat dalam hati tanpa bersuara atau mengerakkan bibir.\nB. Mengucapkan kata demi kata pelan atau menggerakkan bibir.\nC. Menunjuk tulisan dengan jari telunjuk atau membuat ringkasan.', '[ A ]  [ B ]  [ C ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'BUTIR EVALUASI PERILAKU SISWA (GAYA BELAJAR)', 'PILIHAN']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2.2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center', width: 25 } }
    });
  } else if (printPreset.includes('AKPD')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk AKPD: Baca pernyataan masalah/kebutuhan di bawah ini. Berikan tanda centang (V) pada kolom YA jika kondisi tersebut menggambarkan masalah yang saat ini Anda alami, atau TIDAK jika tidak dialami.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Saya belum memahami potensi diri, bakat, minat, atau kelemahan pribadi saya.', '[  ]', '[  ]'],
      ['2', 'Saya sering merasa cemas, minder, atau kurang percaya diri di depan umum.', '[  ]', '[  ]'],
      ['3', 'Saya mengalami kesulitan dalam menyesuaikan diri dengan tata tertib sekolah baru.', '[  ]', '[  ]'],
      ['4', 'Saya kurang tahu bagaimana cara menjalin pertemanan yang harmonis tanpa konflik.', '[  ]', '[  ]'],
      ['5', 'Saya belum menemukan metode belajar yang efektif untuk meningkatkan nilai rapor.', '[  ]', '[  ]'],
      ['6', 'Saya sering menunda-nunda tugas sekolah hingga menumpuk dan stres sendiri.', '[  ]', '[  ]'],
      ['7', 'Saya bingung menentukan cita-cita karir atau kelanjutan studi selepas sekolah ini.', '[  ]', '[  ]'],
      ['8', 'Saya membutuhkan informasi dunia kerja, jenis profesi masa depan, dan prospeknya.', '[  ]', '[  ]'],
      ['9', 'Saya kurang memahami dampak negatif merokok, miras, atau pergaulan bebas remaja.', '[  ]', '[  ]'],
      ['10', 'Saya kesulitan membagi waktu harian antara belajar, membantu orang tua, dan bermain.', '[  ]', '[  ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'PERNYATAAN KEBUTUHAN PESERTA DIDIK (AKPD)', 'YA', 'TIDAK']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2.2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center', width: 15 }, 3: { halign: 'center', width: 15 } }
    });
  } else if (printPreset.includes('Sosiometri')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Sosiometri BK: Asesmen ini bertujuan untuk memetakan hubungan sosial dan kekompakan antarsiswa di kelas Anda. Jawaban Anda bersifat rahasia dan hanya diketahui oleh Guru BK. Tulis nama lengkap teman pilihan Anda dengan jujur.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 8;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('I. KELOMPOK BELAJAR (Aspek Akademis)', 15, currentY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tuliskan 3 (tiga) nama teman sekelas Anda yang paling Anda inginkan untuk bekerja sama dalam kelompok belajar:', 15, currentY + 5);
    
    doc.text('1. Pilihan Pertama (Paling Disukai)  : ____________________________________________________', 20, currentY + 12);
    doc.text('2. Pilihan Kedua (Cadangan 1)        : ____________________________________________________', 20, currentY + 18);
    doc.text('3. Pilihan Ketiga (Cadangan 2)       : ____________________________________________________', 20, currentY + 24);

    currentY += 34;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('II. INTERAKSI SOSIAL (Aspek Non-Akademis / Bermain)', 15, currentY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tuliskan 3 (tiga) nama teman sekelas Anda yang paling Anda inginkan untuk diajak bermain/bersosialisasi:', 15, currentY + 5);
    
    doc.text('1. Pilihan Pertama (Paling Disukai)  : ____________________________________________________', 20, currentY + 12);
    doc.text('2. Pilihan Kedua (Cadangan 1)        : ____________________________________________________', 20, currentY + 18);
    doc.text('3. Pilihan Ketiga (Cadangan 2)       : ____________________________________________________', 20, currentY + 24);
  } else if (printPreset.includes('ITP')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian: Asesmen Inventori Tugas Perkembangan (ITP) ini mengukur pencapaian tingkat perkembangan Anda dalam 7 Aspek. Berikan penilaian diri Anda pada skala 1 (Sangat Kurang/Belum Tercapai) sampai dengan 10 (Sangat Baik/Tercapai Sempurna) pada kolom penilaian.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Landasan Hidup Religius (Ketaatan beribadah, pemahaman ajaran agama).', '[      ] / 10'],
      ['2', 'Landasan Perilaku Etis (Kejujuran, mematuhi norma/nilai sosial).', '[      ] / 10'],
      ['3', 'Kematangan Emosional (Pengendalian emosi, kematangan sikap, rasa percaya diri).', '[      ] / 10'],
      ['4', 'Kematangan Intelektual (Berpikir objektif, kemampuan analisis & pemecahan masalah).', '[      ] / 10'],
      ['5', 'Kesadaran Tanggung Jawab Sosial (Kepedulian terhadap lingkungan, kerja sama kelompok).', '[      ] / 10'],
      ['6', 'Peran Sosial Gender (Penerimaan peran diri sebagai laki-laki / perempuan secara positif).', '[      ] / 10'],
      ['7', 'Penerimaan Diri & Kembangan Diri (Sikap realistis atas kelebihan & kekurangan diri).', '[      ] / 10']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'ASPEK TUGAS PERKEMBANGAN (ITP)', 'PENILAIAN MANDIRI']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', width: 10 }, 2: { halign: 'center', width: 40 } }
    });
  } else if (printPreset.includes('RIASEC')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian Holland RIASEC: Berikan tanda centang (V) pada pernyataan di bawah ini apabila sesuai dengan ketertarikan, minat, atau hobi Anda sehari-hari.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'REALISTIC (R): Menyukai aktivitas mekanik, merakit barang, olahraga outdoor, atau memelihara hewan/tanaman.', '[  ]'],
      ['2', 'INVESTIGATIVE (I): Menyukai riset sains, memecahkan rumus matematika, teka-teki logika, dan analisis ilmiah.', '[  ]'],
      ['3', 'ARTISTIC (A): Menyukai seni rupa, desain grafis, menulis kreatif, bermain musik, drama, dan berekspresi bebas.', '[  ]'],
      ['4', 'SOCIAL (S): Senang menolong orang, mengajar/edukasi, konseling, bakti sosial, dan melayani masyarakat.', '[  ]'],
      ['5', 'ENTERPRISING (E): Senang memimpin organisasi, berwirausaha, menjual ide/produk, mempengaruhi orang, dan negosiasi.', '[  ]'],
      ['6', 'CONVENTIONAL (C): Senang merapikan arsip, memasukkan data Excel, administrasi pembukuan harian, dan ketelitian detail.', '[  ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'TIPE KEPRIBADIAN KARIR (RIASEC)', 'KETERTARIKAN']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', width: 10 }, 2: { halign: 'center', width: 30 } }
    });
  } else if (printPreset.includes('AUM Umum')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian AUM Umum: Berikan tanda centang (V) pada kolom YA jika aspek tersebut saat ini sedang menjadi kendala atau beban pikiran yang Anda hadapi.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Jasmani & Kesehatan: Sering lelah, pusing, gangguan penglihatan / pendengaran.', '[  ]', '[  ]'],
      ['2', 'Diri Pribadi: Kurang percaya diri, sulit mengambil keputusan, emosi tidak stabil.', '[  ]', '[  ]'],
      ['3', 'Hubungan Sosial: Sulit berteman, sering berbeda pendapat dengan kawan sebaya.', '[  ]', '[  ]'],
      ['4', 'Keadaan Ekonomi: Uang saku kurang, kesulitan membayar iuran/peralatan sekolah.', '[  ]', '[  ]'],
      ['5', 'Hubungan Keluarga: Suasana rumah tidak tenang, berbeda pendapat dengan orang tua.', '[  ]', '[  ]'],
      ['6', 'Pendidikan & Belajar: Nilai tugas menurun, malas membaca, metode belajar salah.', '[  ]', '[  ]'],
      ['7', 'Agama & Moral: Mengabaikan kewajiban beribadah, melanggar norma sosial/etik.', '[  ]', '[  ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'ASPEK KENDALA KEHIDUPAN (AUM UMUM)', 'YA', 'TIDAK']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', width: 10 }, 2: { halign: 'center', width: 15 }, 3: { halign: 'center', width: 15 } }
    });
  } else if (printPreset.includes('AUM PTSDL')) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian AUM PTSDL: Berikan tanda centang (V) jika pernyataan menggambarkan masalah belajar Anda saat ini.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Prasyarat Belajar (P): Kesulitan menghubungkan materi baru dengan konsep pelajaran lama.', '[  ]', '[  ]'],
      ['2', 'Keterampilan Belajar (T): Tidak tahu teknik menghafal, membaca cepat, dan mencatat materi.', '[  ]', '[  ]'],
      ['3', 'Sarana Belajar (S): Tidak memiliki tempat belajar kondusif di rumah atau perangkat belajar kurang.', '[  ]', '[  ]'],
      ['4', 'Diri Pribadi Belajar (D): Mengantuk saat belajar di kelas, sering menunda pengerjaan tugas.', '[  ]', '[  ]'],
      ['5', 'Lingkungan Belajar (L): Hubungan kurang harmonis dengan guru atau kondisi kelas bising.', '[  ]', '[  ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'ASPEK KENDALA KBM (AUM PTSDL)', 'YA', 'TIDAK']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', width: 10 }, 2: { halign: 'center', width: 15 }, 3: { halign: 'center', width: 15 } }
    });
  } else {
    // DCM
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    const petunjuk = 'Petunjuk Pengisian Lembar Inventori Masalah BK: Baca daftar pernyataan masalah di bawah ini. Berikan tanda centang (V) pada kotak jika masalah tersebut saat ini dirasakan sebagai beban pikiran bagi Anda.';
    const splitPetunjuk = doc.splitTextToSize(petunjuk, pageWidth - 30);
    doc.text(splitPetunjuk, 15, currentY);
    currentY += splitPetunjuk.length * 4.5 + 4;

    const body = [
      ['1', 'Saya sering mengalami gangguan kesehatan fisik (sering pusing, lemas, kurang tidur).', '[  ]'],
      ['2', 'Hubungan di dalam keluarga kurang harmonis / sering terjadi perselisihan pendapat.', '[  ]'],
      ['3', 'Sulit berkonsentrasi karena suasana belajar kelas yang kurang kondusif / gaduh.', '[  ]'],
      ['4', 'Merasa rendah diri atau minder dengan keadaan sosial-ekonomi keluarga saya.', '[  ]'],
      ['5', 'Mengalami kendala pembiayaan untuk membeli perlengkapan sekolah atau transportasi.', '[  ]'],
      ['6', 'Sering merasa malas untuk masuk sekolah pada mata pelajaran tertentu karena kurang menyukai gurunya.', '[  ]'],
      ['7', 'Mudah terpengaruh oleh ajakan teman sebaya untuk membolos atau nongkrong saat jam belajar.', '[  ]'],
      ['8', 'Sering menunda-nunda pekerjaan rumah sampai waktu pengumpulan mendekat.', '[  ]']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 15, right: 15 },
      head: [['NO', 'PERNYATAAN MASALAH YANG SERING DIHADAPI SISWA (DCM)', 'CEKLIST']],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8.5, font: 'Helvetica', cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center', width: 20 } }
    });
  }

  // Draw Signatures at the bottom
  let lastY = (doc as any).lastAutoTable?.finalY ?? currentY + 35;
  if (lastY > pageHeight - 55) {
    doc.addPage();
    lastY = 20;
  }

  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const kotaText = tenantInfo?.kota || 'Yogyakarta';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Mengetahui,', 40, lastY + 10, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.text('Orang Tua / Wali Siswa,', 40, lastY + 14, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.text('( _________________________________ )', 40, lastY + 38, { align: 'center' });

  doc.text(`${kotaText}, ${printDate}`, 155, lastY + 10, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.text('Guru BK / Konselor Kelas,', 155, lastY + 14, { align: 'center' });
  
  doc.text('___________________________', 155, lastY + 38, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('NIP. ___________________________', 155, lastY + 42, { align: 'center' });

  // Output PDF blob and open
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export function printAsesmenResult(
  tenantInfo: Tenant | null,
  sekolah: Sekolah | null,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  item: AsesmenSiswa,
  userFullname: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Draw Kop Surat using the shared utility!
  const headerEndY = drawKopSurat(
    doc,
    pageWidth,
    sekolah,
    tenantInfo,
    logoDaerahBase64,
    logoSekolahBase64,
    true
  );

  let currentY = headerEndY + 12;
  const testDate = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN HASIL ASESMEN BK SISWA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Profile Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Nama Siswa', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${item.Siswa?.nama_siswa}`, 45, currentY);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('NIS / NISN', 115, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${item.Siswa?.nis || '-'}`, 145, currentY);

  currentY += 5;

  doc.setFont('Helvetica', 'bold');
  doc.text('Kelas', 15, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${item.Siswa?.Kelas?.nama_kelas || '-'}`, 45, currentY);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Tanggal Tes', 115, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(`: ${testDate}`, 145, currentY);

  currentY += 10;

  // Section I: Jenis Asesmen
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('I. Jenis Asesmen / Tes Psikologis', 15, currentY);
  doc.line(15, currentY + 1.5, pageWidth - 15, currentY + 1.5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(item.nama_asesmen, 15, currentY + 6);
  
  currentY += 14;

  // Section II: Hasil Kategori / Skor Capaian
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('II. Hasil Kategori / Skor Capaian', 15, currentY);
  doc.line(15, currentY + 1.5, pageWidth - 15, currentY + 1.5);
  
  // Score Badge Box
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY + 4, 60, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, currentY + 4, 60, 8, 'S');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(item.hasil_skor || 'TIDAK ADA SKOR SPESIFIK', 45, currentY + 9.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  currentY += 20;

  // Section III: Analisis Diagnostik & Rekomendasi
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('III. Hasil Analisis Diagnostik & Rekomendasi Konselor', 15, currentY);
  doc.line(15, currentY + 1.5, pageWidth - 15, currentY + 1.5);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  const desc = item.keterangan || 'Tidak ada keterangan analisis lebih lanjut.';
  const splitDesc = doc.splitTextToSize(desc, pageWidth - 30);
  doc.text(splitDesc, 15, currentY + 6);

  // Draw Signatures at the bottom
  let lastY = currentY + 20 + (splitDesc.length * 4.5);
  if (lastY > pageHeight - 55) {
    doc.addPage();
    lastY = 20;
  }

  const printDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const kotaText = tenantInfo?.kota || 'Yogyakarta';
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Mengetahui,', 40, lastY + 10, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.text('Orang Tua / Wali Siswa,', 40, lastY + 14, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.text('( _________________________________ )', 40, lastY + 38, { align: 'center' });

  doc.text(`${kotaText}, ${printDate}`, 155, lastY + 10, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.text('Guru BK / Konselor Kelas,', 155, lastY + 14, { align: 'center' });
  
  doc.text(userFullname || '___________________________', 155, lastY + 38, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('NIP. ___________________________', 155, lastY + 42, { align: 'center' });

  // Output PDF blob and open
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
