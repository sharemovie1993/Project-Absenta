import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = String.raw`c:\Users\SERVER-DELL\Documents\Projek\Data Sekolah atau Pasar\Data Induk Peserta Didik  - JUMLAH-PER-SATUAN-PENDIDIKAN Nasional 360 - ASC - SMAN - 12 Februari 2026.xlsx`;

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON to see structure (first 5 rows)
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
    
    console.log(`Sheet Name: ${sheetName}`);
    console.log('First 10 rows:');
    console.log(JSON.stringify(data.slice(0, 10), null, 2));

} catch (error) {
    console.error('Error reading file:', error);
}
