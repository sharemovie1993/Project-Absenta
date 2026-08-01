import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface AdvancedColumnConfig {
  header: string;
  key: string;
  width?: number;
  required?: boolean;
  isDate?: boolean; // Force TEXT format to prevent Excel serial number conversion
  dropdown?: {
    refKey: string; // Key in referenceData object
    allowCustom?: boolean;
  };
}

export interface AdvancedTemplateOptions {
  fileName: string;
  instructions?: string[];
  referenceData?: Record<string, string[]>;
}

/**
 * Generate a professional Excel template with Data Validation (Dropdowns)
 */
export const generateAdvancedTemplate = async (
  columns: AdvancedColumnConfig[],
  options: AdvancedTemplateOptions
) => {
  const workbook = new ExcelJS.Workbook();
  const mainSheet = workbook.addWorksheet('Input Data');
  const refSheet = workbook.addWorksheet('REFERENSI', { state: 'hidden' });

  // 1. Setup Instructions (Optional)
  if (options.instructions && options.instructions.length > 0) {
    options.instructions.forEach((text, i) => {
      const row = mainSheet.getRow(i + 1);
      row.getCell(1).value = `• ${text}`;
      row.getCell(1).font = { italic: true, color: { argb: 'FF555555' }, size: 9 };
    });
    // Add space after instructions
    mainSheet.addRow([]);
  }

  // 2. Setup Headers
  const headerRowNumber = (options.instructions?.length || 0) + (options.instructions ? 2 : 1);
  const headerRow = mainSheet.getRow(headerRowNumber);
  
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header.toUpperCase();
    
    // Style Header
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.required ? 'FFFFD700' : 'FF334155' } // Gold for required, Slate for optional
    };
    cell.font = {
      bold: true,
      color: { argb: col.required ? 'FF000000' : 'FFFFFFFF' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    mainSheet.getColumn(i + 1).width = col.width || 20;
  });

  // 3. Setup Reference Data
  const refMap: Record<string, { col: number; count: number }> = {};
  if (options.referenceData) {
    let colIdx = 1;
    Object.entries(options.referenceData).forEach(([key, values]) => {
      refSheet.getColumn(colIdx).values = [key.toUpperCase(), ...values];
      refMap[key] = { col: colIdx, count: values.length };
      colIdx++;
    });
  }

  // 4. Apply Text Formatting & Data Validation (Dropdowns)
  const startDataRow = headerRowNumber + 1;
  const endDataRow = 3000; // Standard for large Indonesian schools (SMK/SMA)

  columns.forEach((col, i) => {
    const mainCol = mainSheet.getColumn(i + 1);
    mainCol.numFmt = '@'; // Force column format as TEXT in Excel

    const ref = col.dropdown && options.referenceData?.[col.dropdown.refKey] ? refMap[col.dropdown.refKey] : null;

    for (let rowIdx = startDataRow; rowIdx <= endDataRow; rowIdx++) {
      const cell = mainSheet.getCell(rowIdx, i + 1);

      // For date columns: force TEXT format so Excel never converts pasted
      // dates (e.g. 23/12/2026) into serial numbers (e.g. 46388).
      // Setting numFmt='@' AND explicitly assigning an empty string value
      // locks the cell type as text BEFORE the user pastes anything.
      if (col.isDate) {
        cell.numFmt = '@';
        cell.value = { text: '', type: 'string' } as any;
      } else {
        cell.numFmt = '@'; // Force cell format as TEXT ('@')
      }

      if (ref) {
        const colLetter = refSheet.getColumn(ref.col).letter;
        const refRange = `'REFERENSI'!$${colLetter}$2:$${colLetter}$${ref.count + 1}`;
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [refRange],
          showErrorMessage: true,
          errorTitle: 'Data Tidak Valid',
          error: 'Silahkan pilih data dari daftar yang tersedia.'
        };
      }
        
      // Add subtle border to data cells for better UX
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }
      };
    }
  });

  // 5. Freeze Header
  mainSheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: headerRowNumber }
  ];

  // 6. Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, options.fileName.endsWith('.xlsx') ? options.fileName : `${options.fileName}.xlsx`);
};

export interface StyledGradeTemplateOptions {
  nama_kelas: string;
  nama_mapel: string;
  tahun_pelajaran: string;
  semester: string;
  students: { nis: string; nama: string }[];
}

/**
 * Generate a styled Excel template specifically for e-Rapor grade entry with school metadata
 */
export const generateStyledExcelTemplate = async (opts: StyledGradeTemplateOptions): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Format Nilai Rapor');

  // Title Header
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `FORMAT IMPOR NILAI RAPOR — ${opts.nama_mapel.toUpperCase()} (${opts.nama_kelas.toUpperCase()})`;
  titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:G2');
  const subTitleCell = sheet.getCell('A2');
  subTitleCell.value = `Tahun Pelajaran: ${opts.tahun_pelajaran} | Semester: ${opts.semester}`;
  subTitleCell.font = { italic: true, size: 10, color: { argb: 'FFE2E8F0' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.addRow([]);

  // Column Headers
  const headers = ['NO', 'NIS', 'NAMA SISWA', 'SUMATIF 1', 'SUMATIF 2', 'SUMATIF 3', 'SUMATIF AKHIR', 'CAPAIAN KOMPETENSI (CP)'];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF6366F1' } },
      bottom: { style: 'medium', color: { argb: 'FF312E81' } },
      left: { style: 'thin', color: { argb: 'FF6366F1' } },
      right: { style: 'thin', color: { argb: 'FF6366F1' } },
    };
  });

  // Student Rows
  opts.students.forEach((s, idx) => {
    const row = sheet.addRow([idx + 1, s.nis, s.nama, '', '', '', '', '']);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).numFmt = '@';

    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  });

  // Column Widths
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 50;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

