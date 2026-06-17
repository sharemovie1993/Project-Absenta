import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

async function generate() {
    const catalogPath = path.join(__dirname, '../../docs/action_catalog.md');
    const outputPath = path.join(__dirname, '../../docs/RBAC_ACTION_DICTIONARY.xlsx');

    if (!fs.existsSync(catalogPath)) {
        console.error('Catalog not found');
        return;
    }

    const content = fs.readFileSync(catalogPath, 'utf-8');
    const lines = content.split('\n');

    const data: any[] = [];
    let currentModule = '';

    const translate = (id: string): string => {
        const parts = id.split('.');
        const action = parts[parts.length - 1];
        const feature = parts.slice(1, -1).join(' ');

        // Specific overrides for better human language
        const overrides: Record<string, string> = {
            'attendance.scan': 'Melakukan Scan QR/Barcode Presensi',
            'attendance.sessions.create': 'Membuka Sesi Presensi Baru (Mulai KBM)',
            'attendance.sessions.close': 'Menutup/Mengunci Sesi Presensi (Selesai KBM)',
            'attendance.sessions.update.attendance': 'Mengubah Status Kehadiran Siswa (Manual)',
            'attendance.sessions.update.journal': 'Mengisi Jurnal Mengajar / Materi Pokok',
            'academic.students.view.list': 'Melihat Daftar Nama Siswa',
            'academic.students.view.detail': 'Melihat Profil Lengkap & Biodata Siswa',
            'academic.students.create': 'Menambah Data Siswa Baru',
            'academic.students.update': 'Mengubah Data Biodata Siswa',
            'academic.students.delete': 'Menghapus Data Siswa',
            'academic.homeroom.manage': 'Mengelola Data Kelas Perwalian (Khusus Walas)',
            'affairs.violations.report': 'Melaporkan Pelanggaran Siswa',
            'affairs.violations.view.list': 'Melihat Daftar Riwayat Pelanggaran',
            'hubin.pkl.view.list': 'Melihat Daftar Siswa yang sedang PKL',
            'hubin.absensi.verify': 'Memverifikasi Presensi PKL Siswa',
            'cooperative.savings.deposit': 'Menerima Setoran Tabungan Anggota',
            'cooperative.store.orders.manage': 'Melayani Transaksi Kasir (POS) Toko',
            'sarpras.inventory.manage': 'Mengelola Stok Aset & Inventaris',
            'sarpras.loans.manage': 'Mengelola Peminjaman Alat/Barang',
            'notify.announcements.manage': 'Membuat & Menyebar Pengumuman Sekolah',
            'core.auth.logout': 'Keluar dari Aplikasi',
        };

        if (overrides[id]) return overrides[id];

        // Generic translation logic
        let humanAction = action;
        if (action === 'view' || action === 'list') humanAction = 'Melihat';
        else if (action === 'create') humanAction = 'Menambah';
        else if (action === 'update' || action === 'manage') humanAction = 'Mengelola/Mengubah';
        else if (action === 'delete') humanAction = 'Menghapus';
        else if (action === 'report') humanAction = 'Melaporkan';
        else if (action === 'generate') humanAction = 'Membuat Otomatis';

        return `${humanAction} ${feature || currentModule} (${action})`;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
            currentModule = trimmed.replace('## ', '').toUpperCase();
        } else if (trimmed.startsWith('- ')) {
            const id = trimmed.replace('- ', '').trim();
            if (id.includes('.')) {
                data.push({
                    'Modul': currentModule,
                    'Action ID (Teknis)': id,
                    'Deskripsi Manusia (Bahasa Indonesia)': translate(id),
                    'Kategori': id.split('.')[0].toUpperCase()
                });
            }
        }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RBAC Dictionary');

    // Auto-size columns
    const colWidths = [
        { wch: 15 }, // Modul
        { wch: 40 }, // ID
        { wch: 60 }, // Desc
        { wch: 15 }  // Cat
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, outputPath);
    console.log(`✅ Dictionary generated at: ${outputPath}`);
}

generate();
