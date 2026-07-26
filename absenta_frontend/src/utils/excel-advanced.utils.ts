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
