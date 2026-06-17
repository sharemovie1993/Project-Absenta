import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const dataDir = String.raw`c:\Users\SERVER-DELL\Documents\Projek\Data Sekolah atau Pasar`;

interface SchoolData {
    npsn: string;
    nama: string;
    bentuk: string;
    jumlahSiswa: number;
    rombel: number;
    status: string;
    provinsi: string;
    sourceFile: string;
}

const analyze = () => {
    if (!fs.existsSync(dataDir)) {
        console.error(`Directory not found: ${dataDir}`);
        return;
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
    let allSchools: SchoolData[] = [];

    console.log(`Found ${files.length} Excel files.`);

    files.forEach(file => {
        const filePath = path.join(dataDir, file);
        console.log(`Processing ${file}...`);
        
        try {
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 }); // Start from row 2 (header)

            // Header is row 0 in jsonData now
            // Data starts from row 1
            const rows = jsonData.slice(1) as any[];

            rows.forEach(row => {
                // Check if row has valid data (NPSN exists)
                if (row[0]) {
                    const siswa = parseInt(row[3]) || 0;
                    allSchools.push({
                        npsn: row[0],
                        nama: row[1],
                        bentuk: row[2],
                        jumlahSiswa: siswa,
                        rombel: parseInt(row[4]) || 0,
                        status: row[5],
                        provinsi: row[10],
                        sourceFile: file
                    });
                }
            });

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    });

    console.log(`\nTotal Schools Analyzed: ${allSchools.length}`);
    if (allSchools.length === 0) return;

    // Statistics
    const studentCounts = allSchools.map(s => s.jumlahSiswa).sort((a, b) => a - b);
    const totalStudents = studentCounts.reduce((a, b) => a + b, 0);
    const avgStudents = totalStudents / allSchools.length;
    const minStudents = studentCounts[0];
    const maxStudents = studentCounts[studentCounts.length - 1];
    
    const p10 = studentCounts[Math.floor(allSchools.length * 0.10)];
    const p25 = studentCounts[Math.floor(allSchools.length * 0.25)];
    const p50 = studentCounts[Math.floor(allSchools.length * 0.50)];
    const p75 = studentCounts[Math.floor(allSchools.length * 0.75)];
    const p90 = studentCounts[Math.floor(allSchools.length * 0.90)];
    const p99 = studentCounts[Math.floor(allSchools.length * 0.99)];

    console.log('\n=== STATISTICS ===');
    console.log(`Total Students (Market Potential): ${totalStudents.toLocaleString()}`);
    console.log(`Average Students/School: ${Math.round(avgStudents)}`);
    console.log(`Median Students/School: ${p50}`);
    console.log(`Min Students: ${minStudents}`);
    console.log(`Max Students: ${maxStudents}`);

    console.log('\n=== DISTRIBUTION (Percentiles) ===');
    console.log(`10% of schools have < ${p10} students`);
    console.log(`25% of schools have < ${p25} students`);
    console.log(`50% of schools have < ${p50} students`);
    console.log(`75% of schools have < ${p75} students`);
    console.log(`90% of schools have < ${p90} students`);
    console.log(`99% of schools have < ${p99} students`);

    // Tier Grouping Simulation
    const tiers = [
        { name: 'Micro', max: 100 },
        { name: 'Small', max: 300 },
        { name: 'Medium', max: 1000 },
        { name: 'Large', max: 2000 },
        { name: 'Enterprise', max: Infinity }
    ];

    console.log('\n=== PROPOSED TIERS ANALYSIS ===');
    tiers.forEach((tier, index) => {
        const min = index === 0 ? 0 : tiers[index - 1].max;
        const count = allSchools.filter(s => s.jumlahSiswa > min && s.jumlahSiswa <= tier.max).length;
        const percentage = (count / allSchools.length) * 100;
        console.log(`${tier.name} (${min} - ${tier.max === Infinity ? '>' + min : tier.max}): ${count} schools (${percentage.toFixed(1)}%)`);
    });

    // Top 5 Largest
    console.log('\n=== TOP 5 LARGEST SCHOOLS ===');
    allSchools.sort((a, b) => b.jumlahSiswa - a.jumlahSiswa).slice(0, 5).forEach(s => {
        console.log(`${s.nama} (${s.provinsi}): ${s.jumlahSiswa} students`);
    });

    // By Category
    console.log('\n=== BREAKDOWN BY TYPE ===');
    const byType = allSchools.reduce((acc, curr) => {
        const key = `${curr.bentuk} ${curr.status}`;
        if (!acc[key]) acc[key] = { count: 0, totalStudents: 0 };
        acc[key].count++;
        acc[key].totalStudents += curr.jumlahSiswa;
        return acc;
    }, {} as any);

    Object.entries(byType).forEach(([key, val]: [string, any]) => {
        console.log(`${key}: ${val.count} schools, Avg: ${Math.round(val.totalStudents / val.count)} students`);
    });
};

analyze();
