import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_excel_operasional(output_path):
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)
    
    # Common Styles & Palette
    NAVY_HEADER = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    SUB_HEADER = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
    ZEBRA_FILL = PatternFill(start_color="F2F5F9", end_color="F2F5F9", fill_type="solid")
    HIGHLIGHT_GREEN = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    HIGHLIGHT_YELLOW = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    
    TITLE_FONT = Font(name="Segoe UI", size=15, bold=True, color="1F4E79")
    SUBTITLE_FONT = Font(name="Segoe UI", size=10, italic=True, color="595959")
    SECTION_FONT = Font(name="Segoe UI", size=12, bold=True, color="1F4E79")
    HEADER_FONT = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    BOLD_CELL_FONT = Font(name="Segoe UI", size=10, bold=True, color="1F4E79")
    REGULAR_FONT = Font(name="Segoe UI", size=10, color="262626")
    ITALIC_FONT = Font(name="Segoe UI", size=9.5, italic=True, color="595959")
    NOTE_FONT = Font(name="Segoe UI", size=9.5, bold=True, color="375623")
    
    THIN_BORDER_SIDE = Side(border_style="thin", color="D3D3D3")
    BORDER_ALL = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=THIN_BORDER_SIDE)
    HEADER_BORDER = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=Side(border_style="medium", color="1F4E79"))
    
    ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ALIGN_RIGHT = Alignment(horizontal="right", vertical="center", wrap_text=True)
    
    # -------------------------------------------------------------
    # SHEET 1: RINGKASAN PERBANDINGAN
    # -------------------------------------------------------------
    ws1 = wb.create_sheet(title="Ringkasan Perbandingan")
    ws1.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws1.merge_cells("A1:D1")
    ws1["A1"] = "SMKN 1 PLERED — ANALISIS KEBUTUHAN OPERASIONAL PLATFORM ABSENTA"
    ws1["A1"].font = TITLE_FONT
    ws1["A1"].alignment = Alignment(horizontal="left", vertical="center")
    
    ws1.merge_cells("A2:D2")
    ws1["A2"] = "Perbandingan Skenario Implementasi: On-Premise (Server Lokal) vs Full Cloud (SaaS)"
    ws1["A2"].font = SUBTITLE_FONT
    ws1["A2"].alignment = Alignment(horizontal="left", vertical="center")
    
    headers1 = ["Parameter Penilaian", "Skenario On-Premise (Server Lokal)", "Skenario Full Cloud (SaaS)", "Rekomendasi Lapangan"]
    for col_idx, h in enumerate(headers1, start=1):
        cell = ws1.cell(row=4, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = NAVY_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = HEADER_BORDER
    ws1.row_dimensions[4].height = 28
    
    compare_data = [
        ("Biaya Modal Awal (Capex)",
         "LEBIH BESAR\nWajib pengadaan PC Server fisik baru, UPS pengaman, router, dan penataan kabel jaringan server.",
         "SANGAT HEMAT\nNol belanja server fisik di sekolah; cukup pengadaan scanner RFID dan tablet pos gerbang.",
         "Cloud Unggul untuk sekolah yang ingin efisiensi anggaran BOS di awal."),
        ("Akses di Luar Sekolah (PKL & Ortu)",
         "TERBATAS & BUTUH SETTING TAMBAHAN\nPerlu konfigurasi IP Publik, VPN, atau Tunneling yang sangat bergantung pada kestabilan internet sekolah.",
         "LANGSUNG AKTIF 24 JAM PENUH\nSiswa PKL di industri luar dan orang tua murid bisa mengakses aplikasi dari smartphone di mana saja.",
         "Cloud Sangat Unggul untuk mendukung modul Hubinmas / monitoring PKL DUDI."),
        ("Ketahanan Listrik & Bencana",
         "RENTAN GANGGUAN LOKAL\nRentan offline saat listrik padam lama, genset terlambat menyala, atau sambaran petir di area sekolah.",
         "100% AMAN & STANDAR TINGGI\nServer ditempatkan di data center industri dengan garansi listrik, pendingin, dan SLA uptime 99.9%.",
         "Cloud Unggul karena bebas repot penanganan darurat listrik di sekolah."),
        ("Ketergantungan Sambungan Internet",
         "TIDAK BERGANTUNG INTERNET LUAR\nPresensi gerbang dan kelas lokal tetap berjalan normal meskipun internet provider sekolah sedang putus total.",
         "MEMBUTUHKAN KONEKSI INTERNET\nMemerlukan koneksi internet stabil (Wi-Fi/LAN/Seluler) untuk sinkronisasi data langsung ke cloud.",
         "On-Premise Unggul hanya jika koneksi internet sekolah sering putus berkepanjangan."),
        ("Beban Pemeliharaan & Teknisi",
         "BEBAN TEKNISI SEKOLAH TINGGI\nStaf TU/teknisi sekolah harus rutin merawat hardware, membersihkan debu server, OS patching, dan backup manual.",
         "DIKELOLA PENUH SISTEM CLOUD\nPemeliharaan sistem, patching keamanan, dan backup harian berjalan otomatis tanpa menyita waktu staf sekolah.",
         "Cloud Lebih Praktis dan ramah bagi guru serta staf TU sekolah.")
    ]
    
    for r_idx, row in enumerate(compare_data, start=5):
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        for c_idx, val in enumerate(row, start=1):
            cell = ws1.cell(row=r_idx, column=c_idx, value=val)
            cell.font = BOLD_CELL_FONT if c_idx == 1 else REGULAR_FONT
            cell.fill = HIGHLIGHT_GREEN if c_idx == 4 else bg
            cell.alignment = ALIGN_LEFT
            cell.border = BORDER_ALL
        ws1.row_dimensions[r_idx].height = 54
        
    # Note / Recommendation Box
    rec_row = 11
    ws1.merge_cells(f"A{rec_row}:D{rec_row}")
    rec_text = (
        "SARAN STRATEGIS UNTUK SMKN 1 PLERED: "
        "Jika koneksi internet sekolah (Indihome/Astinet) sudah relatif stabil, opsi FULL CLOUD sangat direkomendasikan. "
        "Sekolah tidak terbebani pengadaan server fisik jutaan rupiah di awal, dan modul penting seperti monitoring PKL siswa "
        "di mitra industri (DUDI) serta pelaporan ke orang tua dapat langsung berjalan maksimal tanpa kendala teknis jaringan."
    )
    ws1.cell(row=rec_row, column=1, value=rec_text)
    ws1.cell(row=rec_row, column=1).font = NOTE_FONT
    ws1.cell(row=rec_row, column=1).fill = HIGHLIGHT_YELLOW
    ws1.cell(row=rec_row, column=1).alignment = ALIGN_LEFT
    ws1.cell(row=rec_row, column=1).border = BORDER_ALL
    ws1.row_dimensions[rec_row].height = 42

    ws1.column_dimensions["A"].width = 28
    ws1.column_dimensions["B"].width = 38
    ws1.column_dimensions["C"].width = 38
    ws1.column_dimensions["D"].width = 32

    # -------------------------------------------------------------
    # SHEET 2: SKENARIO ON-PREMISE
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="Skenario On-Premise")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2.merge_cells("A1:E1")
    ws2["A1"] = "SKENARIO 1: ON-PREMISE (SERVER FISIK DI SEKOLAH)"
    ws2["A1"].font = TITLE_FONT
    ws2["A1"].alignment = Alignment(horizontal="left", vertical="center")
    
    # Sub-section A
    ws2.cell(row=3, column=1, value="A. KEBUTUHAN ALAT TAHAP AWAL (INVESTASI SEKALI DI AWAL / CAPEX)").font = SECTION_FONT
    headers_onprem_a = ["No", "Kategori Perangkat", "Nama Perangkat & Spesifikasi Teknis", "Kuantitas", "Fungsi Utama di Lapangan"]
    for col_idx, h in enumerate(headers_onprem_a, start=1):
        cell = ws2.cell(row=4, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = NAVY_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = HEADER_BORDER
    ws2.row_dimensions[4].height = 26
    
    onprem_a_data = [
        ("1", "Server Utama", "PC Server / Mini Server Lokal\n• Min. Intel Core i5/i7 Gen 12+ / AMD Ryzen 5/7 / Xeon\n• RAM: 16 GB – 32 GB DDR4/DDR5\n• Storage: SSD NVMe 512 GB – 1 TB\n• OS: Ubuntu Server Linux / Windows Pro", "1 Unit", "Menampung database PostgreSQL, backend Fastify, dan web frontend Absenta lokal."),
        ("2", "Pengaman Daya", "UPS (Uninterruptible Power Supply) 1000–1200 VA + Stabilizer/AVR", "1 Unit", "Mencegah server mati mendadak saat listrik padam dan melindungi dari lonjakan voltase."),
        ("3", "Jaringan Server", "Router Utama Gigabit (MikroTik) & Switch Hub Gigabit 16/24 Port", "1 Set", "Mengatur lalu lintas jaringan kabel LAN agar akses ribuan siswa dan guru tidak macet."),
        ("4", "Jaringan Area", "Access Point (AP) Wi-Fi Gigabit & Tarikan Kabel LAN Cat6", "Sesuai Area", "Menghubungkan ruang guru, ruang piket, lobi, dan bengkel ke jaringan server lokal."),
        ("5", "Scanner Gerbang", "RFID Tap Reader USB / Network Reader (Mifare 13.56 MHz / Proximity) + Bracket", "2–4 Unit", "Membaca kartu pelajar saat siswa tiba di gerbang dalam waktu < 0,5 detik per anak."),
        ("6", "Terminal Pos Gerbang", "Mini PC / Laptop Eksisting / Tablet Android di pos satpam", "1–2 Unit", "Membuka tampilan pos presensi gerbang yang terhubung ke scanner kartu RFID."),
        ("7", "Display Lobi", "Smart TV / TV LED 32\"–43\" + Kabel HDMI / Android TV Box", "1–2 Unit", "Menampilkan TV Mode Live (kehadiran harian dan agenda dinas) di lobi/ruang guru."),
        ("8", "Perangkat Kasir & Sarpras", "Thermal Receipt Printer 58/80mm & Barcode Scanner USB", "1–2 Unit", "Kasir Toko Koperasi sekolah dan scan peminjaman alat di bengkel Sarpras.")
    ]
    
    for r_idx, row in enumerate(onprem_a_data, start=5):
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        for c_idx, val in enumerate(row, start=1):
            cell = ws2.cell(row=r_idx, column=c_idx, value=val)
            cell.font = REGULAR_FONT
            cell.fill = bg
            cell.alignment = ALIGN_CENTER if c_idx in [1, 4] else ALIGN_LEFT
            cell.border = BORDER_ALL
        ws2.row_dimensions[r_idx].height = 48
        
    # Sub-section B
    start_b = 14
    ws2.cell(row=start_b, column=1, value="B. KEBUTUHAN BAHAN HABIS PAKAI & BIAYA OPERASIONAL TAHUNAN (RECURRING / OPEX)").font = SECTION_FONT
    headers_onprem_b = ["No", "Kebutuhan Bahan / Layanan", "Spesifikasi / Jenis Bahan", "Volume Acuan (per Tahun)", "Keterangan & Manfaat"]
    for col_idx, h in enumerate(headers_onprem_b, start=1):
        cell = ws2.cell(row=start_b+1, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = SUB_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = HEADER_BORDER
    ws2.row_dimensions[start_b+1].height = 26
    
    onprem_b_data = [
        ("1", "Kartu RFID Siswa Baru", "Kartu PVC RFID Chip Mifare 1K / Proximity Cetak Identitas Pelajar", "400–600 Keping (Sesuai kuota angkatan)", "Kartu Pelajar resmi untuk presensi gerbang, perpustakaan, dan transaksi koperasi."),
        ("2", "Aksesoris ID Card", "Tali Lanyard sablon identitas SMKN 1 Plered & Casing/Holder Mika", "400–600 Set (Sesuai kuota siswa baru)", "Wadah pelindung kartu agar awet dipakai siswa selama 3 tahun masa sekolah."),
        ("3", "Stok Kartu Cadangan", "Kartu PVC RFID Cadangan Polos/Standar", "30–50 Keping (5%–10% buffer)", "Cadangan pengganti jika ada kartu siswa yang hilang, patah, atau rusak di tengah semester."),
        ("4", "Media Salinan Backup", "Harddisk Eksternal 1 TB – 2 TB USB 3.0", "1 Unit (Tiap 1-2 tahun)", "Salinan cadangan fisik (cold backup) berkala database nilai dan arsip sekolah di luar server."),
        ("5", "Pemeliharaan Hardware", "Pembersihan fisik server, penggantian baterai UPS (2-3 thn), cek kabel", "Rutin Tiap Semester / Tahunan", "Menjaga keandalan perangkat keras server dan kestabilan daya listrik sekolah."),
        ("6", "Akses Luar Sekolah", "Sewa Nama Domain Sekolah (.sch.id) / Layanan Secure Tunneling", "1 Layanan per Tahun", "Memungkinkan nilai PKL di industri dan portal orang tua diakses aman dari luar sekolah.")
    ]
    
    for r_idx, row in enumerate(onprem_b_data, start=start_b+2):
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        for c_idx, val in enumerate(row, start=1):
            cell = ws2.cell(row=r_idx, column=c_idx, value=val)
            cell.font = REGULAR_FONT
            cell.fill = bg
            cell.alignment = ALIGN_CENTER if c_idx in [1, 4] else ALIGN_LEFT
            cell.border = BORDER_ALL
        ws2.row_dimensions[r_idx].height = 42

    ws2.column_dimensions["A"].width = 6
    ws2.column_dimensions["B"].width = 24
    ws2.column_dimensions["C"].width = 44
    ws2.column_dimensions["D"].width = 26
    ws2.column_dimensions["E"].width = 42

    # -------------------------------------------------------------
    # SHEET 3: SKENARIO FULL CLOUD
    # -------------------------------------------------------------
    ws3 = wb.create_sheet(title="Skenario Full Cloud")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3.merge_cells("A1:E1")
    ws3["A1"] = "SKENARIO 2: FULL CLOUD (SAAS / CLOUD VPS HOSTING)"
    ws3["A1"].font = TITLE_FONT
    ws3["A1"].alignment = Alignment(horizontal="left", vertical="center")
    
    # Sub-section A
    ws3.cell(row=3, column=1, value="A. KEBUTUHAN ALAT TAHAP AWAL DI SEKOLAH (INVESTASI MINIM / ZERO SERVER CAPEX)").font = SECTION_FONT
    headers_cloud_a = ["No", "Kategori Perangkat", "Nama Perangkat & Spesifikasi Teknis", "Kuantitas", "Fungsi Utama di Lapangan"]
    for col_idx, h in enumerate(headers_cloud_a, start=1):
        cell = ws3.cell(row=4, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = NAVY_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = HEADER_BORDER
    ws3.row_dimensions[4].height = 26
    
    cloud_a_data = [
        ("1", "Server Fisik Sekolah", "TIDAK DIPERLUKAN PENGADAAN (NOL RUPIAH)\nAplikasi & Database di-deploy di Cloud Datacenter", "0 Unit (Rp 0)", "Sekolah tidak perlu beli PC server, tidak perlu UPS server, bebas biaya listrik server."),
        ("2", "Scanner Gerbang", "RFID Tap Reader USB (Plug & Play) + Stand Bracket Tiang", "2–4 Unit", "Membaca kartu pelajar saat siswa tiba di gerbang, dicolokkan ke laptop/komputer piket."),
        ("3", "Terminal Pos Gerbang", "Komputer/Laptop Eksisting Sekolah / Tablet di meja satpam", "1–2 Unit", "Membuka web aplikasi Absenta via Google Chrome/Edge yang terhubung internet."),
        ("4", "Koneksi Internet", "Koneksi Internet Sekolah Eksisting (Indihome / Astinet / Dedicated)", "Min. 30–50 Mbps stabil", "Menggunakan saluran internet sekolah yang sudah berjalan saat ini tanpa pasang baru."),
        ("5", "Display Lobi (Opsional)", "Smart TV 32\"–43\" Tersambung Wi-Fi Sekolah", "1 Unit", "Menampilkan TV Mode Live langsung dari web browser TV yang terhubung internet.")
    ]
    
    for r_idx, row in enumerate(cloud_a_data, start=5):
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        for c_idx, val in enumerate(row, start=1):
            cell = ws3.cell(row=r_idx, column=c_idx, value=val)
            cell.font = REGULAR_FONT
            cell.fill = bg
            cell.alignment = ALIGN_CENTER if c_idx in [1, 4] else ALIGN_LEFT
            cell.border = BORDER_ALL
        ws3.row_dimensions[r_idx].height = 42
        
    # Sub-section B
    start_cb = 11
    ws3.cell(row=start_cb, column=1, value="B. KEBUTUHAN LAYANAN CLOUD & BAHAN TAHUNAN (RECURRING / OPEX)").font = SECTION_FONT
    headers_cloud_b = ["No", "Kebutuhan Bahan / Layanan", "Spesifikasi / Jenis Layanan", "Volume Acuan (per Tahun)", "Keterangan & Manfaat"]
    for col_idx, h in enumerate(headers_cloud_b, start=1):
        cell = ws3.cell(row=start_cb+1, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = SUB_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = HEADER_BORDER
    ws3.row_dimensions[start_cb+1].height = 26
    
    cloud_b_data = [
        ("1", "Sewa Cloud VPS Hosting", "Cloud VPS Berkecepatan Tinggi\n• 4–8 vCPU, 8–16 GB RAM, 100 GB NVMe Storage\n• Bandwidth Unlimited, Garansi Uptime 99.9%", "1 Paket Tahunan", "Menjamin aplikasi online 24 jam penuh; dapat diakses siswa PKL dan orang tua kapan saja."),
        ("2", "Layanan Backup Otomatis", "Cloud Snapshot & Off-Site Automated Daily Backup", "1 Layanan Terjadwal", "Salinan database dicadangkan otomatis setiap malam di datacenter terpisah bebas resiko hilang."),
        ("3", "Domain & Keamanan SSL", "Sewa Nama Domain Sekolah (.sch.id) & SSL Certificate", "1 Domain per Tahun", "Alamat web sekolah resmi dan terenkripsi aman (HTTPS) dengan standar industri."),
        ("4", "Kartu RFID Siswa Baru", "Kartu PVC RFID Chip Mifare 1K / Proximity Cetak Identitas", "400–600 Keping (Sesuai siswa baru)", "Kartu Pelajar resmi untuk presensi gerbang, perpustakaan, dan transaksi koperasi."),
        ("5", "Aksesoris ID Card", "Tali Lanyard sablon identitas SMKN 1 Plered & Casing/Holder Mika", "400–600 Set (Sesuai siswa baru)", "Wadah pelindung kartu agar awet dipakai siswa selama 3 tahun masa sekolah."),
        ("6", "Stok Kartu Cadangan", "Kartu PVC RFID Cadangan Polos/Standar", "30–50 Keping (5%–10% buffer)", "Cadangan pengganti jika ada kartu siswa yang hilang, patah, atau rusak di tengah semester.")
    ]
    
    for r_idx, row in enumerate(cloud_b_data, start=start_cb+2):
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        for c_idx, val in enumerate(row, start=1):
            cell = ws3.cell(row=r_idx, column=c_idx, value=val)
            cell.font = REGULAR_FONT
            cell.fill = bg
            cell.alignment = ALIGN_CENTER if c_idx in [1, 4] else ALIGN_LEFT
            cell.border = BORDER_ALL
        ws3.row_dimensions[r_idx].height = 42

    ws3.column_dimensions["A"].width = 6
    ws3.column_dimensions["B"].width = 24
    ws3.column_dimensions["C"].width = 44
    ws3.column_dimensions["D"].width = 26
    ws3.column_dimensions["E"].width = 42
    
    # Save Workbook
    wb.save(output_path)
    print(f"[OK] File Excel berhasil dibuat: {output_path}")

if __name__ == "__main__":
    out_file = r"d:\BarayaProject\Project Absenta\docs\ANALISIS_OPERASIONAL_ONPREM_VS_CLOUD_ABSENTA.xlsx"
    build_excel_operasional(out_file)
