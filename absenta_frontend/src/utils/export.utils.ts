import { downloadFileFromBlob } from './file-download.utils';
import * as XLSX from 'xlsx-js-style';

export interface CsvColumnConfig<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Utility to generate and download a CSV file from an array of objects.
 * 
 * @param data Array of objects to export
 * @param columns Configuration for CSV headers and row accessors
 * @param filename Name of the file to be downloaded (without extension)
 */
export function exportDataToCSV<T>(data: T[], columns: CsvColumnConfig<T>[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data untuk diekspor');
  }

  const headers = columns.map(col => col.header).join(',');
  
  const csvContent = [
    headers,
    ...data.map(item => 
      columns.map(col => {
        let val = col.accessor(item);
        // Handle null/undefined
        if (val === null || val === undefined) val = '';
        // Escape quotes and wrap in quotes to handle commas in data
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFileFromBlob(blob, `${filename}.csv`);
}

export interface ExcelColumnConfig<T> {
  header: string;
  accessor: (row: T, idx?: number) => string | number | boolean | null | undefined;
  width?: number; // Character width for auto-sizing
  required?: boolean; // Whether the column is mandatory
}

/**
 * Utility to generate and download a beautifully styled Excel (.xlsx) file.
 * Uses xlsx-js-style for headers, borders, and auto-widths.
 * 
 * @param data Array of objects to export
 * @param columns Configuration for Excel headers, accessors, and column widths
 * @param filename Name of the file to be downloaded (without extension)
 * @param reportTitle Optional big title at the top of the Excel file
 */
export function exportDataToExcel<T>(
  data: T[], 
  columns: ExcelColumnConfig<T>[], 
  filename: string, 
  reportTitle?: string
) {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data untuk diekspor');
  }

  // 1. Prepare data rows
  const excelData: any[][] = [];
  
  if (reportTitle) {
    excelData.push([reportTitle]);
    excelData.push([]); // Empty spacer row
  }

  const headers = columns.map(c => c.header);
  excelData.push(headers);

  data.forEach(item => {
    const row = columns.map(c => {
      const val = c.accessor(item);
      return val === null || val === undefined ? '' : val;
    });
    excelData.push(row);
  });

  // 2. Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // 3. Apply Styling
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const headerRowIdx = reportTitle ? 2 : 0;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellRef]) continue;

      let style: any = {
        font: { name: 'Arial', sz: 11 },
        border: {
          top: { style: 'thin', color: { rgb: "FF000000" } },
          bottom: { style: 'thin', color: { rgb: "FF000000" } },
          left: { style: 'thin', color: { rgb: "FF000000" } },
          right: { style: 'thin', color: { rgb: "FF000000" } }
        }
      };

      if (reportTitle && R === 0 && C === 0) {
        // Report Title Style
        style = {
          font: { name: 'Arial', sz: 14, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
        // Merge title cells
        if (!ws['!merges']) ws['!merges'] = [];
        // Prevent duplicate merges
        const isMerged = ws['!merges'].some(m => m.s.r === 0 && m.s.c === 0);
        if (!isMerged) {
          ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
        }
      } else if (reportTitle && R === 0 && C > 0) {
        // Cells merged with title
        style = {};
      } else if (reportTitle && R === 1) {
        // Spacer row
        style = {};
      } else if (R === headerRowIdx) {
        // Header Row Style
        style = {
          ...style,
          font: { ...style.font, bold: true, color: { rgb: "FFFFFFFF" } },
          fill: { fgColor: { rgb: "FF0F172A" } }, // Slate-900 (Dark Professional)
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else {
        // Data Row Style
        style = {
          ...style,
          alignment: { vertical: 'center' }
        };
      }

      ws[cellRef].s = style;
    }
  }

  // 4. Auto column width
  const colWidths = columns.map(c => {
    // Determine max width between header length and max data length
    const headerLen = (c.header?.length || 10) + 2;
    // We can iterate data if we want precise widths, or just use c.width or a fallback
    return { wch: c.width || Math.max(15, headerLen) };
  });
  ws['!cols'] = colWidths;

  // 5. Write to File
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Utility to generate and download a beautifully styled Excel Import Template.
 * Includes instructions and sample data to guide the user.
 * 
 * @param columns Configuration for template headers
 * @param sampleData 1-2 rows of sample data to show format
 * @param filename Name of the file (without extension)
 * @param instruction Main instruction text to show at the top
 */
export function generateImportTemplate<T>(
  columns: ExcelColumnConfig<T>[],
  sampleData: T[],
  filename: string,
  instruction?: string
) {
  // 1. Prepare data rows
  const excelData: any[][] = [];
  
  if (instruction) {
    excelData.push([`PETUNJUK: ${instruction}`]);
    excelData.push([]); // Spacer
  }

  const headers = columns.map(c => c.header);
  excelData.push(headers);

  // Add sample data
  sampleData.forEach(item => {
    const row = columns.map(c => {
      const val = c.accessor(item);
      return val === null || val === undefined ? '' : val;
    });
    excelData.push(row);
  });

  // 2. Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // 3. Apply Styling
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const headerRowIdx = instruction ? 2 : 0;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellRef]) continue;

      let style: any = {
        font: { name: 'Arial', sz: 11 },
        border: {
          top: { style: 'thin', color: { rgb: "FF000000" } },
          bottom: { style: 'thin', color: { rgb: "FF000000" } },
          left: { style: 'thin', color: { rgb: "FF000000" } },
          right: { style: 'thin', color: { rgb: "FF000000" } }
        }
      };

      if (instruction && R === 0 && C === 0) {
        // Instruction Style
        style = {
          font: { name: 'Arial', sz: 10, italic: true, color: { rgb: "FF1D4ED8" } }, // Blue-700
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: "FFEFF6FF" } } // Blue-50
        };
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
      } else if (instruction && R === 0 && C > 0) {
        style = {};
      } else if (instruction && R === 1) {
        style = {};
      } else if (R === headerRowIdx) {
        // Header Row Style
        const isRequired = columns[C]?.required;
        style = {
          ...style,
          font: { ...style.font, bold: true, color: { rgb: isRequired ? "FF000000" : "FFFFFFFF" } },
          fill: { fgColor: { rgb: isRequired ? "FFFFD700" : "FF0F172A" } }, // Gold for Required, Slate-900 for Optional
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R > headerRowIdx) {
        // Sample Data Style (Grey italic to indicate it's an example)
        style = {
          ...style,
          font: { ...style.font, color: { rgb: "FF64748B" }, italic: true },
          alignment: { vertical: 'center' }
        };
      } else {
        style = {};
      }

      ws[cellRef].s = style;
    }
  }

  // Auto width
  ws['!cols'] = columns.map(c => ({ wch: c.width || Math.max(15, c.header.length + 2) }));

  // Write to File
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template_Impor");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

