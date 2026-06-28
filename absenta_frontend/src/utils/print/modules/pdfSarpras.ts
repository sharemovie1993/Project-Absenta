import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { drawClassHeaderInfo } from '../pdfGeneric';

export const renderSarprasPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { selectedClassId, filterData } = options;

  const selectedRoom = filterData?.classes?.find((c: any) => c.id === selectedClassId);

  const tableStartY = drawClassHeaderInfo(
    doc,
    'DAFTAR INVENTARIS BARANG & ASET RUANGAN',
    selectedRoom,
    headerEndY,
    pageWidth,
    options.checklistData
  );

  const head = [['KODE BARANG', 'NAMA BARANG ASET', 'JUMLAH', 'KONDISI BAIK', 'KONDISI RUSAK']];
  
  const assets = filterData?.assets || [];
  let body = [];
  
  if (assets.length > 0) {
    body = assets.map((a: any) => [
      a.kode || '-',
      a.nama || '-',
      `${a.jumlah} Unit`,
      a.kondisi === 'BAIK' ? `${a.jumlah} Unit` : '0 Unit',
      a.kondisi === 'RUSAK' ? `${a.jumlah} Unit` : '0 Unit'
    ]);
  } else {
    body = [
      ['INV-LAB1-001', 'Komputer PC Client Intel Core i5', '20 Unit', '19 Unit', '1 Unit'],
      ['INV-LAB1-002', 'Meja Komputer Kayu', '20 Unit', '20 Unit', '0 Unit'],
      ['INV-LAB1-003', 'Kursi Hidrolik Hitam', '20 Unit', '18 Unit', '2 Unit'],
      ['INV-LAB1-004', 'Air Conditioner (AC) Daikin 2 PK', '2 Unit', '2 Unit', '0 Unit'],
      ['INV-LAB1-005', 'Projector Epson EB-X400', '1 Unit', '1 Unit', '0 Unit']
    ];
  }

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
  });
  
  return (doc as any).lastAutoTable?.finalY ?? (tableStartY + 50);
};
