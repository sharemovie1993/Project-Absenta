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
  selectedGuruId?: string;
  selectedStudentId?: string;
  eventDetails?: Record<string, string>;
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
    selectedGuruId,
    selectedStudentId,
    eventDetails,
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
  const principalName = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || principalGuru?.nama_guru || 'DRS. H. CONTOH KEPSEK, M.Pd.';
  let principalNip = sekolah?.nip_kepala || tenantInfo?.nip_kepala || principalGuru?.nip || '19720512 199803 1 002';
  if (principalNip && !principalNip.startsWith('NIP')) {
    principalNip = `NIP. ${principalNip}`;
  }

  // Handle coming soon documents
  const comingSoonDocs = ['leger', 'kkm', 'rpp', 'osis_sk', 'attendance_recap_semester', 'bk_case_recap', 'stock_card', 'pkl_certificate'];
  if (comingSoonDocs.includes(printType)) {
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );
    
    const getRequiredModule = (type: string): string => {
      switch (type) {
        case 'leger': return 'Rapor & Nilai';
        case 'kkm': return 'Kriteria Ketuntasan Minimal (KKM)';
        case 'rpp': return 'Supervisi & Modul Ajar (RPP)';
        case 'osis_sk': return 'Kesiswaan & Ekstrakurikuler';
        case 'attendance_recap_semester': return 'Absensi Lanjutan';
        case 'bk_case_recap': return 'Kasus Lanjutan BP/BK';
        case 'stock_card': return 'Manajemen Gudang Sarpras';
        case 'pkl_certificate': return 'Sertifikat & Penilaian DUDI';
        default: return 'Modul Tambahan';
      }
    };
    
    const getDocName = (type: string): string => {
      switch (type) {
        case 'leger': return 'Leger Nilai Semester';
        case 'kkm': return 'KKM / KKTP Mata Pelajaran';
        case 'rpp': return 'Blanko Format RPP / Modul Ajar';
        case 'osis_sk': return 'SK Kepengurusan OSIS';
        case 'attendance_recap_semester': return 'Rekapitulasi Kehadiran Semester';
        case 'bk_case_recap': return 'Laporan & Rekapitulasi Kasus BK';
        case 'stock_card': return 'Kartu Kontrol Stok Barang';
        case 'pkl_certificate': return 'Sertifikat Praktik Kerja Lapangan (PKL)';
        default: return 'Dokumen Fisik';
      }
    };

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(getDocName(printType).toUpperCase(), pageWidth / 2, headerEndY + 12, { align: 'center' });

    // Draw coming soon box
    doc.setFillColor(254, 243, 199); // light amber
    doc.setDrawColor(245, 158, 11); // amber border
    doc.setLineWidth(0.3);
    doc.rect(20, headerEndY + 22, pageWidth - 40, 24, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text('FITUR SEGERA HADIR (COMING SOON)', pageWidth / 2, headerEndY + 28, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`Dokumen ini memerlukan Modul "${getRequiredModule(printType)}" yang saat ini belum aktif di sistem Anda.`, pageWidth / 2, headerEndY + 34, { align: 'center' });
    doc.text('Hubungi Administrator untuk mengaktifkan modul ini.', pageWidth / 2, headerEndY + 39, { align: 'center' });

    // Draw mockup table placeholder
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.text('CONTOH PREVIEW DOKUMEN:', 20, headerEndY + 54);

    const head = [['KOLOM A', 'KOLOM B', 'KOLOM C', 'KOLOM D']];
    const body = Array.from({ length: 4 }).map((_, i) => [
      `Data Contoh ${i+1}-A`, `Data Contoh ${i+1}-B`, `Data Contoh ${i+1}-C`, `Data Contoh ${i+1}-D`
    ]);
    
    autoTable(doc, {
      startY: headerEndY + 58,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139] }
    });

    // Draw Signature
    let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
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

    return doc.output('blob');
  }

  if (module === 'kurikulum' && ['roster', 'roster_teacher'].includes(printType)) {
    const jadwalList = (filterData?.jadwalList || []) as any[];
    const jenisKegiatanList = (filterData?.jenisKegiatanList || []) as any[];

    const getActivityInfo = (id?: string) => {
      if (!id) return null;
      return jenisKegiatanList.find(k => k.id === id);
    };

    const groups = new Map<string, any[]>();
    if (printType === 'roster_teacher') {
      if (selectedGuruId === 'all') {
        jadwalList.forEach(j => {
          const name = j.Guru?.User?.full_name || 'Guru Tanpa Nama';
          if (!groups.has(name)) groups.set(name, []);
          groups.get(name)!.push(j);
        });
      } else {
        const g = (filterData?.gurus as any[])?.find(x => x.id === selectedGuruId);
        const name = g?.nama_guru || 'Guru';
        groups.set(name, jadwalList);
      }
    } else {
      if (selectedClassId === 'all') {
        jadwalList.forEach(j => {
          const name = j.Kelas?.nama_kelas || 'Tanpa Kelas';
          if (!groups.has(name)) groups.set(name, []);
          groups.get(name)!.push(j);
        });
      } else {
        const cls = (filterData?.classes as any[])?.find(c => c.id === selectedClassId);
        const name = cls?.nama_kelas || 'Kelas';
        groups.set(name, jadwalList);
      }
    }

    const groupNamesList = Array.from(groups.keys());
    const totalGroups = groupNamesList.length > 0 ? groupNamesList.length : 1;

    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
      const groupName = groupNamesList[groupIndex] || '---';
      const groupJadwal = groups.get(groupName) || [];

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
      const titleText = printType === 'roster_teacher' ? 'JADWAL MENGAJAR GURU' : 'JADWAL PELAJARAN MINGGUAN KELAS';
      doc.text(titleText, pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      const subTitleText = printType === 'roster_teacher' ? `NAMA GURU: ${groupName.toUpperCase()}` : `KELAS: ${groupName.toUpperCase()}`;
      doc.text(subTitleText, pageWidth / 2, headerEndY + 11, { align: 'center' });

      // Clean separator line below title
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.2);
      doc.line(15, headerEndY + 14, pageWidth - 15, headerEndY + 14);

      // 3. Draw Timetable Grid
      const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
      const head = [['JAM KE-', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT']];

      const slots = Array.from(
        new Set(
          groupJadwal.map(j => `${j.jam_mulai.substring(0, 5)} - ${j.jam_selesai.substring(0, 5)}`)
        )
      ).sort();

      let body: any[] = [];
      if (slots.length > 0) {
        body = slots.map((slot, index) => {
          // Check if this slot is a break/istirahat or upacara
          const slotSchedules = groupJadwal.filter(j =>
            `${j.jam_mulai.substring(0, 5)} - ${j.jam_selesai.substring(0, 5)}` === slot
          );
          
          const slotActivities = slotSchedules.map(j => getActivityInfo(j.jenis_kegiatan));
          
          const isIstirahat = slotActivities.length > 0 && slotActivities.every(act => 
            act?.tipe?.toUpperCase() === 'ISTIRAHAT' || act?.nama?.toUpperCase()?.includes('ISTIRAHAT')
          );
          const isUpacara = slotActivities.length > 0 && slotActivities.every(act => 
            act?.tipe?.toUpperCase() === 'UPACARA' || act?.nama?.toUpperCase()?.includes('UPACARA') || act?.nama?.toUpperCase()?.includes('APEL')
          );

          if (isIstirahat) {
            const actLabel = slotActivities[0]?.nama || 'ISTIRAHAT';
            return [
              `Jam ${index + 1}\n(${slot})`,
              { content: actLabel.toUpperCase(), colSpan: 5, styles: { fillColor: [248, 250, 252], fontStyle: 'bold', halign: 'center', textColor: [71, 85, 105] } }
            ];
          }
          if (isUpacara) {
            const actLabel = slotActivities[0]?.nama || 'UPACARA';
            return [
              `Jam ${index + 1}\n(${slot})`,
              { content: actLabel.toUpperCase(), colSpan: 5, styles: { fillColor: [248, 250, 252], fontStyle: 'bold', halign: 'center', textColor: [71, 85, 105] } }
            ];
          }

          const row: any[] = [`Jam ${index + 1}\n(${slot})`];
          days.forEach(day => {
            const matches = groupJadwal.filter(j =>
              j.hari === day &&
              `${j.jam_mulai.substring(0, 5)} - ${j.jam_selesai.substring(0, 5)}` === slot
            );
            if (matches.length > 0) {
              if (printType === 'roster_teacher') {
                row.push(
                  matches.map(m => {
                    const act = getActivityInfo(m.jenis_kegiatan);
                    const isKbm = !m.jenis_kegiatan || act?.tipe?.toUpperCase() === 'KBM';
                    const subjectName = isKbm && m.Mapel?.nama_mapel ? m.Mapel.nama_mapel : (act?.nama || 'KEGIATAN');
                    const targetClass = m.Kelas?.nama_kelas || 'Kelas';
                    return `${subjectName.toUpperCase()}\n(${targetClass})`;
                  }).join('\n\n')
                );
              } else {
                row.push(
                  matches.map(m => {
                    const act = getActivityInfo(m.jenis_kegiatan);
                    const isKbm = !m.jenis_kegiatan || act?.tipe?.toUpperCase() === 'KBM';
                    const subjectName = isKbm && m.Mapel?.nama_mapel ? m.Mapel.nama_mapel : (act?.nama || 'KEGIATAN');
                    const teacher = m.Guru?.User?.full_name || 'Guru';
                    return `${subjectName.toUpperCase()}\n(${teacher})`;
                  }).join('\n\n')
                );
              }
            } else {
              row.push('');
            }
          });
          return row;
        });
      } else {
        body = Array.from({ length: 8 }).map((_, i) => [
          `Jam ${i + 1}`, '', '', '', '', ''
        ]);
      }

      autoTable(doc, {
        startY: headerEndY + 17,
        head,
        body,
        theme: 'grid',
        styles: { 
          fontSize: 6.5, 
          font: 'Helvetica', 
          cellPadding: 2.2, 
          halign: 'center', 
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15
        },
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { cellWidth: 31 },
          2: { cellWidth: 31 },
          3: { cellWidth: 31 },
          4: { cellWidth: 31 },
          5: { cellWidth: 31 }
        }
      });

      // 4. Draw Signature
      let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
      if (finalY + 38 > pageHeight) {
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

      if (groupIndex < totalGroups - 1) {
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

    let currentY = headerEndY;
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
      currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
    } else if (module === 'kesiswaan') {
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
        const tempat = details.tempatPertemuan || 'Ruang Piket / Kesiswaan';
        const agenda = details.agendaPertemuan || 'Klarifikasi & Pembinaan Khusus Siswa';

        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text('SURAT PANGGILAN ORANG TUA / WALI SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        let textY = headerEndY + 16;
        doc.text(`Nomor : ${nomor}`, 15, textY);
        doc.text('Hal   : Panggilan Orang Tua / Wali Siswa', 15, textY + 5);
        
        doc.text('Kepada Yth.', 15, textY + 14);
        doc.setFont('Helvetica', 'bold');
        doc.text('Orang Tua / Wali dari Siswa:', 15, textY + 19);
        
        // Student Info Block
        doc.setFont('Helvetica', 'normal');
        doc.text('Nama Siswa  :', 20, textY + 26);
        doc.setFont('Helvetica', 'bold');
        doc.text(studentName.toUpperCase(), 48, textY + 26);
        
        doc.setFont('Helvetica', 'normal');
        doc.text('NIS / NISN   :', 20, textY + 31);
        doc.text(studentNis, 48, textY + 31);
        
        doc.text('Kelas        :', 20, textY + 36);
        doc.text(studentClass, 48, textY + 36);
        
        doc.setFont('Helvetica', 'normal');
        doc.text('Di Tempat', 15, textY + 44);
        
        doc.text('Dengan hormat,', 15, textY + 53);
        doc.text('Sehubungan dengan adanya hal penting yang perlu dikonsultasikan terkait perkembangan', 15, textY + 58);
        doc.text('dan kedisiplinan putra/putri Bapak/Ibu di sekolah, dengan ini kami mengharap kehadiran', 15, textY + 63);
        doc.text('Bapak/Ibu Orang Tua / Wali Siswa pada:', 15, textY + 68);
        
        // Meeting details
        doc.setFont('Helvetica', 'bold');
        doc.text('Hari / Tanggal  :', 25, textY + 76);
        doc.text(formattedDate, 60, textY + 76);
        
        doc.text('Waktu           :', 25, textY + 81);
        doc.text(waktu, 60, textY + 81);
        
        doc.text('Tempat          :', 25, textY + 86);
        doc.text(tempat, 60, textY + 86);
        
        doc.text('Agenda          :', 25, textY + 91);
        doc.text(agenda, 60, textY + 91);
        
        doc.setFont('Helvetica', 'normal');
        doc.text('Demikian undangan ini kami sampaikan. Mengingat pentingnya agenda tersebut, kehadiran', 15, textY + 99);
        doc.text('Bapak/Ibu sangat kami harapkan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.', 15, textY + 104);
        
        const violationsList = (filterData?.violations || []) as any[];
        let lastContentY = textY + 106;
        if (violationsList.length > 0) {
          doc.setFont('Helvetica', 'bold');
          doc.text('Catatan Pelanggaran Terakhir Siswa:', 15, textY + 112);
          
          let listY = textY + 117;
          violationsList.slice(0, 3).forEach((v, idx) => {
            const dateStr = new Date(v.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            doc.setFont('Helvetica', 'normal');
            doc.text(`${idx + 1}. [${dateStr}] ${v.jenis_pelanggaran} (${v.keterangan || '-'}) - Poin: ${v.poin}`, 20, listY);
            listY += 5;
          });
          lastContentY = listY + 5;
        }
        currentY = lastContentY;
      } else if (printType === 'recap_violations') {
        const violations = (filterData?.violations || []) as any[];
        
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text('LAPORAN REKAPITULASI PELANGGARAN SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        
        const className = selectedClassId === 'all' ? 'SEMUA KELAS' : (filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || 'Kelas');
        doc.text(`KELAS: ${className.toUpperCase()}`, pageWidth / 2, headerEndY + 11, { align: 'center' });
        
        const head = [['NO', 'NIS', 'NAMA SISWA', 'KELAS', 'TANGGAL', 'PELANGGARAN', 'POIN', 'STATUS']];
        let body = [];
        if (violations.length > 0) {
          body = violations.map((v, idx) => [
            String(idx + 1),
            v.Siswa?.nis || '-',
            v.Siswa?.nama_siswa?.toUpperCase() || 'SISWA',
            v.Siswa?.Kelas?.nama_kelas || '-',
            new Date(v.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            v.jenis_pelanggaran || '-',
            String(v.poin || 0),
            v.status || 'BARU'
          ]);
        } else {
          body = [['-', '-', 'TIDAK ADA DATA PELANGGARAN', '-', '-', '-', '-', '-']];
        }
        
        autoTable(doc, {
          startY: headerEndY + 16,
          head,
          body,
          theme: 'grid',
          styles: { 
            fontSize: 7.5, 
            font: 'Helvetica', 
            cellPadding: 2.5, 
            halign: 'center', 
            valign: 'middle',
            lineColor: [203, 213, 225],
            lineWidth: 0.15
          },
          headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'left', fontStyle: 'bold' },
            5: { halign: 'left' }
          }
        });
        currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
      } else if (printType === 'recap_achievements') {
        const achievements = (filterData?.achievements || []) as any[];
        
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text('LAPORAN REKAPITULASI PRESTASI SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        
        const className = selectedClassId === 'all' ? 'SEMUA KELAS' : (filterData?.classes?.find((c: any) => c.id === selectedClassId)?.nama_kelas || 'Kelas');
        doc.text(`KELAS: ${className.toUpperCase()}`, pageWidth / 2, headerEndY + 11, { align: 'center' });
        
        const head = [['NO', 'NIS', 'NAMA SISWA', 'KELAS', 'TANGGAL', 'NAMA PRESTASI', 'POIN', 'KETERANGAN']];
        let body = [];
        if (achievements.length > 0) {
          body = achievements.map((a, idx) => [
            String(idx + 1),
            a.Siswa?.nis || '-',
            a.Siswa?.nama_siswa?.toUpperCase() || 'SISWA',
            a.Siswa?.Kelas?.nama_kelas || '-',
            new Date(a.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            a.nama_prestasi || '-',
            String(a.poin || 0),
            a.keterangan || '-'
          ]);
        } else {
          body = [['-', '-', 'TIDAK ADA DATA PRESTASI', '-', '-', '-', '-', '-']];
        }
        
        autoTable(doc, {
          startY: headerEndY + 16,
          head,
          body,
          theme: 'grid',
          styles: { 
            fontSize: 7.5, 
            font: 'Helvetica', 
            cellPadding: 2.5, 
            halign: 'center', 
            valign: 'middle',
            lineColor: [203, 213, 225],
            lineWidth: 0.15
          },
          headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'left', fontStyle: 'bold' },
            5: { halign: 'left' }
          }
        });
        currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
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
      currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
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
      currentY = (doc as any).lastAutoTable?.finalY ?? (textY + 50);
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
      currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
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
      currentY = sigY + 12;
    }

    // Shared Bottom Signature
    let finalY = currentY;
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
