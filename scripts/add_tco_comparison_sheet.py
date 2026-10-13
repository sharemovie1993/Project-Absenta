import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def add_tco_sheet(input_file, output_file):
    wb = openpyxl.load_workbook(input_file)
    
    # Sheet Name
    sheet_name = "Komparasi 3, 5, 10 Tahun"
    if sheet_name in wb.sheetnames:
        wb.remove(wb[sheet_name])
    ws = wb.create_sheet(title=sheet_name)
    ws.views.sheetView[0].showGridLines = True
    
    # Styles & Palette
    NAVY_HEADER = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    SUB_HEADER = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
    DARK_HEADER = PatternFill(start_color="142A4A", end_color="142A4A", fill_type="solid")
    ZEBRA_FILL = PatternFill(start_color="F2F5F9", end_color="F2F5F9", fill_type="solid")
    WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    GREEN_HIGHLIGHT = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    YELLOW_HIGHLIGHT = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    ORANGE_HIGHLIGHT = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    
    TITLE_FONT = Font(name="Segoe UI", size=15, bold=True, color="1F4E79")
    SUBTITLE_FONT = Font(name="Segoe UI", size=10, italic=True, color="595959")
    SECTION_FONT = Font(name="Segoe UI", size=12, bold=True, color="1F4E79")
    HEADER_FONT = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    BOLD_CELL = Font(name="Segoe UI", size=10, bold=True, color="1F4E79")
    BOLD_DARK = Font(name="Segoe UI", size=10, bold=True, color="262626")
    REGULAR_FONT = Font(name="Segoe UI", size=10, color="262626")
    NOTE_FONT = Font(name="Segoe UI", size=9.5, bold=True, color="375623")
    
    THIN_BORDER_SIDE = Side(border_style="thin", color="D3D3D3")
    BORDER_ALL = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=THIN_BORDER_SIDE)
    HEADER_BORDER = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=Side(border_style="medium", color="1F4E79"))
    
    ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ALIGN_RIGHT = Alignment(horizontal="right", vertical="center", wrap_text=True)
    
    # Title Block
    ws.merge_cells("A1:G1")
    ws["A1"] = "SMKN 1 PLERED — ANALISIS TOTAL COST OF OWNERSHIP (TCO) JANGKA PANJANG"
    ws["A1"].font = TITLE_FONT
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    
    ws.merge_cells("A2:G2")
    ws["A2"] = "Komparasi Finansial & Risiko Operasional: On-Premise vs Full Cloud (Horizon 3 Tahun, 5 Tahun, dan 10 Tahun)"
    ws["A2"].font = SUBTITLE_FONT
    ws["A2"].alignment = Alignment(horizontal="left", vertical="center")
    
    # -------------------------------------------------------------
    # TABEL 1: RINGKASAN EKSEKUTIF TCO (3, 5, 10 TAHUN)
    # -------------------------------------------------------------
    ws.cell(row=4, column=1, value="1. RINGKASAN EKSEKUTIF TOTAL BIAYA INFRASTRUKTUR (TCO)").font = SECTION_FONT
    
    t1_headers = [
        "Horizon Waktu",
        "Siklus Operasional Sekolah",
        "Total Biaya On-Premise (Server Mandiri)",
        "Total Biaya Full Cloud (Biznet 12vCPU)",
        "Selisih Biaya (Penghematan)",
        "Status Rekomendasi",
        "Faktor Kunci di Lapangan"
    ]
    for c_idx, h in enumerate(t1_headers, start=1):
        c = ws.cell(row=5, column=c_idx, value=h)
        c.font = HEADER_FONT
        c.fill = NAVY_HEADER
        c.alignment = ALIGN_CENTER
        c.border = HEADER_BORDER
    ws.row_dimensions[5].height = 28
    
    # Baseline Numbers:
    # On-Premise:
    # Capex awal: Rp 122.000.000 (Server+UPS 70jt + Terminal Gerbang/Kelas 52jt)
    # Listrik server 24/7: Rp 4.500.000/thn
    # Maintenance & sparepart rusak (baterai UPS, reader rusak): Rp 4.000.000/thn
    # Total Opex On-Premise: Rp 8.500.000/thn
    # Tahun ke-5/6: Refresh Server baru + UPS baru = Rp 70.000.000
    
    # Full Cloud:
    # Capex awal terminal gerbang: Rp 9.500.000 (2x Tablet A9+, 4x Scanner ACR122U, 1x Printer 80mm)
    # Sewa Cloud Biznet 12vCPU/24GB: Rp 27.588.000/thn
    # Listrik & Hardware: Rp 0
    # Replacement device gerbang: Rp 500.000/thn
    # Total Opex Cloud: Rp 28.088.000/thn
    
    t1_data = [
        ("3 TAHUN\n(Jangka Pendek)",
         "1 Siklus Penuh Angkatan Siswa (Kelas X s.d XII Lulus)",
         147500000, # 122jt + (3 x 8.5jt)
         93764000,  # 9.5jt + (3 x 28.088jt)
         "Cloud Lebih Hemat Rp 53.736.000",
         "🏆 FULL CLOUD MENANG MUTLAK",
         "Cloud jauh lebih unggul karena tidak perlu mengeluarkan modal awal Rp 122 Juta di depan. Bebas instalasi kabel 55 kelas."),
         
        ("5 TAHUN\n(Jangka Menengah)",
         "Batas Umur Ekonomis Hardware Server Fisik (Garansi Resmi Pabrik Habis)",
         164500000, # 122jt + (5 x 8.5jt)
         149940000, # 9.5jt + (5 x 28.088jt)
         "Cloud Lebih Hemat Rp 14.560.000",
         "🏆 FULL CLOUD TETAP LEBIH HEMAT",
         "Di tahun ke-5, server fisik mulai usang dan baterai UPS wajib ganti. Sementara Cloud terus mendapat pembaruan performa tanpa biaya tambahan."),
         
        ("10 TAHUN\n(Jangka Panjang)",
         "Siklus Peremajaan Total Server (Wajib Pengadaan Server Generasi Baru di Th-6)",
         277000000, # 122jt + 70jt refresh server + (10 x 8.5jt)
         290380000, # 9.5jt + (10 x 28.088jt) + refresh tablet gerbang 5jt
         "Biaya Relatif Seimbang (Selisih ~4%)",
         "⚖️ SECARA BIAYA SEIMBANG, TAPI CLOUD BEBAS RISIKO",
         "Secara angka 10 tahun terlihat seimbang, TETAPI On-Premise memiliki resiko downtime mati listrik, sambaran petir, dan beban teknisi sekolah yang berat.")
    ]
    
    for r_idx, row in enumerate(t1_data, start=6):
        period, siklus, onprem_cost, cloud_cost, diff_str, status, note = row
        bg = ZEBRA_FILL if r_idx % 2 == 1 else WHITE_FILL
        
        ws.cell(row=r_idx, column=1, value=period).alignment = ALIGN_CENTER
        ws.cell(row=r_idx, column=2, value=siklus).alignment = ALIGN_LEFT
        
        c_onp = ws.cell(row=r_idx, column=3, value=onprem_cost)
        c_onp.number_format = '"Rp "#,##0'
        c_onp.alignment = ALIGN_RIGHT
        
        c_cld = ws.cell(row=r_idx, column=4, value=cloud_cost)
        c_cld.number_format = '"Rp "#,##0'
        c_cld.alignment = ALIGN_RIGHT
        
        c_diff = ws.cell(row=r_idx, column=5, value=diff_str)
        c_diff.alignment = ALIGN_CENTER
        c_diff.fill = GREEN_HIGHLIGHT if "Cloud Lebih Hemat" in diff_str else YELLOW_HIGHLIGHT
        c_diff.font = BOLD_CELL
        
        c_stat = ws.cell(row=r_idx, column=6, value=status)
        c_stat.alignment = ALIGN_CENTER
        c_stat.font = BOLD_DARK
        
        ws.cell(row=r_idx, column=7, value=note).alignment = ALIGN_LEFT
        
        for c_i in range(1, 8):
            c_cell = ws.cell(row=r_idx, column=c_i)
            c_cell.border = BORDER_ALL
            if c_i not in [5]:
                c_cell.fill = bg
            if c_i in [1, 3, 4]:
                c_cell.font = BOLD_CELL
        ws.row_dimensions[r_idx].height = 46

    # -------------------------------------------------------------
    # TABEL 2: RINCIAN PROYEKSI TAHUNAN KUMULATIF (TAHUN 1 S.D 10)
    # -------------------------------------------------------------
    start_t2 = 11
    ws.cell(row=start_t2, column=1, value="2. SIMULASI ARUS KAS KUMULATIF TAHUN KE-1 SAMPAI TAHUN KE-10 (CASH FLOW)").font = SECTION_FONT
    
    t2_headers = [
        "Tahun",
        "Keterangan Siklus Operasional",
        "On-Premise: Belanja Alat Baru",
        "On-Premise: Biaya Opex / Listrik",
        "On-Premise: Total Kumulatif",
        "Cloud: Belanja Perangkat",
        "Cloud: Sewa Server Biznet",
        "Cloud: Total Kumulatif",
        "Selisih Keuntungan (Kumulatif)"
    ]
    for c_idx, h in enumerate(t2_headers, start=1):
        c = ws.cell(row=start_t2+1, column=c_idx, value=h)
        c.font = HEADER_FONT
        c.fill = SUB_HEADER
        c.alignment = ALIGN_CENTER
        c.border = HEADER_BORDER
    ws.row_dimensions[start_t2+1].height = 28
    
    # Data 10 Tahun
    cum_onprem = 0
    cum_cloud = 0
    
    t2_rows = [
        (1, "Tahun 1: Peluncuran Awal & Rollout Masal (2.500 Siswa)", 122000000, 8500000, 9500000, 27588000),
        (2, "Tahun 2: Operasional Normal (Siswa Baru Masuk)", 0, 8500000, 0, 27588000),
        (3, "Tahun 3: Kelulusan Angkatan Pertama (Ganti Baterai UPS)", 0, 11500000, 0, 27588000), # baterai UPS ganti +3jt
        (4, "Tahun 4: Operasional Normal", 0, 8500000, 0, 27588000),
        (5, "Tahun 5: Akhir Garansi Resmi Server Dell T150", 0, 8500000, 0, 27588000),
        (6, "Tahun 6: SIKLUS REFRESH SERVER (Pengadaan Server & UPS Baru)", 70000000, 8500000, 5000000, 27588000), # Cloud ganti tablet pos
        (7, "Tahun 7: Operasional Normal Server Generasi Baru", 0, 8500000, 0, 27588000),
        (8, "Tahun 8: Operasional Normal", 0, 8500000, 0, 27588000),
        (9, "Tahun 9: Ganti Baterai UPS Server Baru", 0, 11500000, 0, 27588000),
        (10, "Tahun 10: Akhir Siklus Dekade Pertama", 0, 8500000, 0, 27588000),
    ]
    
    for r_i, (thn, ket, onp_capex, onp_opex, cld_capex, cld_opex) in enumerate(t2_rows, start=start_t2+2):
        onp_year = onp_capex + onp_opex
        cld_year = cld_capex + cld_opex
        cum_onprem += onp_year
        cum_cloud += cld_year
        diff_cum = cum_onprem - cum_cloud
        
        bg = ZEBRA_FILL if r_i % 2 == 1 else WHITE_FILL
        
        ws.cell(row=r_i, column=1, value=f"Tahun {thn}").alignment = ALIGN_CENTER
        ws.cell(row=r_i, column=2, value=ket).alignment = ALIGN_LEFT
        
        c3 = ws.cell(row=r_i, column=3, value=onp_capex)
        c3.number_format = '"Rp "#,##0'
        c3.alignment = ALIGN_RIGHT
        
        c4 = ws.cell(row=r_i, column=4, value=onp_opex)
        c4.number_format = '"Rp "#,##0'
        c4.alignment = ALIGN_RIGHT
        
        c5 = ws.cell(row=r_i, column=5, value=cum_onprem)
        c5.number_format = '"Rp "#,##0'
        c5.alignment = ALIGN_RIGHT
        c5.font = BOLD_CELL
        
        c6 = ws.cell(row=r_i, column=6, value=cld_capex)
        c6.number_format = '"Rp "#,##0'
        c6.alignment = ALIGN_RIGHT
        
        c7 = ws.cell(row=r_i, column=7, value=cld_opex)
        c7.number_format = '"Rp "#,##0'
        c7.alignment = ALIGN_RIGHT
        
        c8 = ws.cell(row=r_i, column=8, value=cum_cloud)
        c8.number_format = '"Rp "#,##0'
        c8.alignment = ALIGN_RIGHT
        c8.font = BOLD_CELL
        
        c9 = ws.cell(row=r_i, column=9)
        if diff_cum > 0:
            c9.value = f"Cloud Lebih Hemat Rp {diff_cum:,.0f}".replace(",", ".")
            c9.fill = GREEN_HIGHLIGHT
            c9.font = Font(name="Segoe UI", size=9.5, bold=True, color="274E13")
        else:
            c9.value = f"On-Premise Hemat Rp {abs(diff_cum):,.0f}".replace(",", ".")
            c9.fill = YELLOW_HIGHLIGHT
            c9.font = Font(name="Segoe UI", size=9.5, bold=True, color="7F6000")
        c9.alignment = ALIGN_CENTER
        
        for col_idx in range(1, 10):
            c_target = ws.cell(row=r_i, column=col_idx)
            c_target.border = BORDER_ALL
            if col_idx != 9:
                c_target.fill = bg
                if col_idx in [1, 2]:
                    c_target.font = REGULAR_FONT
        ws.row_dimensions[r_i].height = 24

    # -------------------------------------------------------------
    # TABEL 3: ANALISIS KELAYAKAN NON-FINANSIAL (RISIKO & OPERASIONAL)
    # -------------------------------------------------------------
    start_t3 = 24
    ws.cell(row=start_t3, column=1, value="3. ANALISIS PERBANDINGAN RISIKO OPERASIONAL & BEBAN KERJA SEKOLAH").font = SECTION_FONT
    
    t3_headers = [
        "Faktor Non-Finansial",
        "Skenario On-Premise (Server Fisik di Sekolah)",
        "Skenario Full Cloud (Data Center Biznet GIO)",
        "Dampak Terhadap SMKN 1 Plered"
    ]
    for c_idx, h in enumerate(t3_headers, start=1):
        c = ws.cell(row=start_t3+1, column=c_idx, value=h)
        c.font = HEADER_FONT
        c.fill = DARK_HEADER
        c.alignment = ALIGN_CENTER
        c.border = HEADER_BORDER
    ws.row_dimensions[start_t3+1].height = 26
    
    risk_data = [
        ("Kesiapan Modal Awal (Barrier to Entry)",
         "BERAT: Sekolah wajib mencairkan dana tunai Rp 122 Juta di awal tahun pertama untuk membeli server, UPS, dan 55 reader kelas.",
         "RINGAN: Biaya awal hanya Rp 9,5 Juta untuk tablet gerbang dan printer piket. Biaya server dibayar tahunan dari uang penjualan kartu.",
         "Cloud jauh lebih mudah disetujui dalam rapat komite dan Kepala Sekolah karena tidak butuh anggaran jumbo di depan."),
         
        ("Risiko Listrik & Cuaca Ekstrem",
         "TINGGI: Rentan server mati mendadak saat mati lampu PLN berjam-jam, AC lab mati kepanasan, atau sambaran petir di musim hujan.",
         "NOL RISIKO: Data center Biznet memiliki garansi listrik ganda (Dual UPS + Genset Otomatis) dan pendingin presisi 24/7.",
         "Cloud menjamin server tetap hidup saat sekolah sedang mati lampu atau libur akhir pekan."),
         
        ("Kompleksitas Jaringan 55 Ruang Kelas",
         "SANGAT TINGGI: Menarik kabel LAN ke 55 ruang kelas teori & bengkel rawan putus, kabel digigit tikus, dan reader kelas rawan dirusak siswa.",
         "BEBAS KABEL: Tidak ada reader fisik di kelas. Guru mapel cukup buka HP masing-masing via fitur KBM Auto-Propagation (10 detik cek bangku kosong).",
         "Cloud menghemat Rp 40 Juta biaya pengadaan reader kelas dan menghilangkan sakit kepala perbaikan kabel harian."),
         
        ("Akses Siswa PKL (DUDI) & Orang Tua",
         "TERBATAS: Memerlukan setting IP Publik statis, Port Forwarding, atau tunnel yang bergantung pada kestabilan internet sekolah.",
         "LANGSUNG ONLINE 24 JAM: Siswa PKL di bengkel/pabrik luar dan orang tua murid bisa mengakses aplikasi kapan saja dari HP mereka.",
         "Cloud sangat ideal untuk mendukung Modul Hubinmas (monitoring presensi GPS dan jurnal PKL di industri rekanan)."),
         
        ("Beban Kerja Teknisi / Staf TU",
         "TINGGI: Teknisi sekolah harus merawat fisik server, backup manual, membersihkan debu, dan standby jika server error.",
         "MINIM: Infrastruktur diurus penuh oleh Biznet GIO. Teknisi sekolah hanya bertugas membantu operasional aplikasi.",
         "Teknisi sekolah bisa fokus mendampingi guru dan pembelajaran tanpa disibukkan masalah hardware.")
    ]
    
    for r_i, (f_name, onp_desc, cld_desc, impact) in enumerate(risk_data, start=start_t3+2):
        bg = ZEBRA_FILL if r_i % 2 == 1 else WHITE_FILL
        ws.cell(row=r_i, column=1, value=f_name).alignment = ALIGN_LEFT
        ws.cell(row=r_i, column=1).font = BOLD_DARK
        
        ws.cell(row=r_i, column=2, value=onp_desc).alignment = ALIGN_LEFT
        ws.cell(row=r_i, column=2).font = REGULAR_FONT
        
        ws.cell(row=r_i, column=3, value=cld_desc).alignment = ALIGN_LEFT
        ws.cell(row=r_i, column=3).font = REGULAR_FONT
        
        ws.cell(row=r_i, column=4, value=impact).alignment = ALIGN_LEFT
        ws.cell(row=r_i, column=4).font = REGULAR_FONT
        
        for c_k in range(1, 5):
            c_elem = ws.cell(row=r_i, column=c_k)
            c_elem.fill = bg
            c_elem.border = BORDER_ALL
        ws.row_dimensions[r_i].height = 44

    # -------------------------------------------------------------
    # KESIMPULAN REKOMENDASI BOX
    # -------------------------------------------------------------
    rec_r = 31
    ws.merge_cells(f"A{rec_r}:G{rec_r}")
    rec_msg = (
        "KESIMPULAN REKOMENDASI TCO JANGKA PANJANG UNTUK SMKN 1 PLERED:\n"
        "1. Dalam rentang 1 s.d 5 Tahun pertama, opsi FULL CLOUD (Biznet GIO 12 vCPU / 24 GB) jauh LEBIH HEMAT Rp 14 Juta s.d Rp 53 Juta "
        "dibanding On-Premise, serta menyelamatkan sekolah dari beban modal awal Rp 122 Juta di depan.\n"
        "2. Dalam rentang 10 Tahun, total biaya finansial relatif seimbang, TETAPI Full Cloud tetap menang telak dari sisi kepraktisan: "
        "Bebas biaya peremajaan server di tahun ke-6, bebas resiko petir/mati lampu, dan modul PKL industri dapat diakses langsung 24 jam.\n"
        "3. DENGAN STRATEGI JUAL KARTU RP 75.000 / SISWA: Model Full Cloud langsung menghasilkan SURPLUS TUNAI Rp 66,9 Juta di tahun pertama "
        "(Sekolah dapat Kas Rp 25 Juta, dan Anda mengantongi untung bersih Rp 41,9 Juta), sementara On-Premise justru DEFISIT minus Rp 22 Juta!"
    )
    c_rec = ws.cell(row=rec_r, column=1, value=rec_msg)
    c_rec.font = NOTE_FONT
    c_rec.fill = YELLOW_HIGHLIGHT
    c_rec.alignment = ALIGN_LEFT
    c_rec.border = BORDER_ALL
    ws.row_dimensions[rec_r].height = 70

    # Column Widths
    ws.column_dimensions["A"].width = 16
    ws.column_dimensions["B"].width = 38
    ws.column_dimensions["C"].width = 24
    ws.column_dimensions["D"].width = 24
    ws.column_dimensions["E"].width = 28
    ws.column_dimensions["F"].width = 24
    ws.column_dimensions["G"].width = 46
    
    wb.save(output_file)
    print(f"[OK] Berhasil menambahkan sheet TCO ke: {output_file}")

if __name__ == "__main__":
    src = r"docs/user_filled_sheet.xlsx"
    dst = r"docs/ANALISIS_TCO_ONPREMISE_VS_CLOUD_SMKN1PLD.xlsx"
    add_tco_sheet(src, dst)
