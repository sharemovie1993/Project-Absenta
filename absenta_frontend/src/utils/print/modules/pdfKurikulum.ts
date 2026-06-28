import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';

export const renderKurikulumCalendarPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
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
  return (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
};

export const renderKurikulumRosterPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  pageWidth: number,
  pageHeight: number,
  sekolah: any,
  tenantInfo: any,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  includeSchoolLogo: boolean,
  principalName: string,
  principalNip: string,
  drawKopSurat: any
): Blob => {
  const { printType, selectedClassId, selectedGuruId, filterData } = options;

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

  return doc.output('blob');
};
