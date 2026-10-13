# 📑 KATALOG SPESIFIKASI INFRASTRUKTUR & PERANGKAT
## Komparasi Skenario Implementasi: On-Premise (Server Mandiri) vs Full Cloud (Data Center Enterprise)
### Ekosistem Platform Manajemen Sekolah Absenta — SMKN 1 Plered

---

Dokumen ini disusun sebagai panduan teknis dan anggaran bagi pimpinan sekolah dan tim perencana sarana prasarana dalam memilih arsitektur implementasi sistem manajemen sekolah terpadu di SMKN 1 Plered (Kapasitas: 2.500 Siswa, 55 Rombel, 100+ Guru & Staf).

---

## 1. MATRIKS PERBANDINGAN CEPAT (EXECUTIVE COMPARISON)

| Aspek Penilaian | SKENARIO A: ON-PREMISE (SERVER LOKAL) | SKENARIO B: FULL CLOUD (DATA CENTER ENTERPRISE) |
| :--- | :--- | :--- |
| **Lokasi Mesin Server** | Ruang Server / Lab Komputer SMKN 1 Plered | Data Center Tier-3 Biznet GIO (Jakarta / Tangerang) |
| **Total Investasi Awal (Capex)** | **Rp 122.000.000** *(Pengadaan Server, UPS, Kabel 55 Rombel, Reader)* | **Rp 9.500.000** *(Hanya Terminal Meja Gerbang & Scanner RFID)* |
| **Biaya Operasional Tahunan (Opex)** | **Rp 8.500.000 / tahun** *(Listrik, AC, Maintenance, Domain)* | **Rp 27.588.000 / tahun** *(Cloud VPS 12 vCPU/24 GB, Garansi Uptime)* |
| **Metode Pembiayaan** | Dibebankan ke Anggaran Kas BOS/APBS Sekolah di depan | Mandiri via Penjualan Kartu Pelajar Siswa (Nol Biaya BOS) |
| **Akses Luar Sekolah (PKL & Ortu)** | Bergantung kestabilan IP Publik & Listrik Sekolah (Rentan Down) | Aktif Penuh 24 Jam Non-Stop dari Smartphone mana pun |
| **Ketahanan Cuaca & Mati Lampu** | Rentan mati saat PLN padam lama atau petir merusak adaptor | Aman 100% (Dual Genset Industri, Pendingin Presisi Data Center) |
| **Beban Teknisi IT Sekolah** | Berat (Wajib servis rutin hardware, bersihkan debu, backup manual) | Nol Beban (Infrastruktur diurus otomatis oleh Biznet Cloud) |
| **Status Rekomendasi** | ⚠️ *Biaya awal sangat berat & risiko mati lampu tinggi* | 🏆 **SANGAT DIREKOMENDASIKAN (Praktis, Modern & Menguntungkan)** |

---

## 2. KATALOG SKENARIO A: ON-PREMISE (SERVER FISIK DI SEKOLAH)

Skenario ini menempatkan seluruh unit pemrosesan data di dalam lingkungan fisik SMKN 1 Plered.

### A. Rincian Kebutuhan Alat Awal (Belanja Investasi 1x / Capex)

| No | Kategori | Nama Perangkat & Spesifikasi Teknis | Kuantitas | Estimasi Harga Satuan | Total Biaya |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | **Server Utama** | **Dell PowerEdge T150 Tower Server**<br>• Intel Xeon E-2324G (4 Core / 4 Thread, 3.1 GHz, Turbo 4.6 GHz, 8MB Cache)<br>• 16GB ECC UDIMM DDR4-3200<br>• 1TB Enterprise SATA HDD 7.2K RPM<br>• Dual Port Gigabit LAN Broadcom, iDRAC9 Basic, PSU 300W | 1 Unit | Rp 48.999.000 | **Rp 48.999.000** |
| **2** | **Upgrade RAM** | **16GB DDR4-3200 ECC UDIMM Kingston Server Premier** (Total RAM Menjadi 32GB) | 1 Keping | Rp 8.550.000 | **Rp 8.550.000** |
| **3** | **Storage Cepat** | **PCIe to M.2 NVMe Adapter Card + 1TB Samsung 980 Pro NVMe** (Untuk OS & Database Cepat) | 1 Set | Rp 2.750.000 | **Rp 2.750.000** |
| **4** | **Pengaman Daya** | **APC Smart-UPS BR1500GI Pro 1500VA / 865 Watt** (Automatic Voltage Regulation & Baterai Backup) | 1 Unit | Rp 9.695.000 | **Rp 9.695.000** |
| **5** | **Jaringan Pusat** | **MikroTik Cloud Router RB4011 + Gigabit Switch 24-Port Manageable** | 1 Set | Rp 5.500.000 | **Rp 5.500.000** |
| **6** | **Tarikan Jaringan 55 Rombel** | **Kabel UTP Cat6 Belden (4 Roll) + Patch Cord + Pipa Conduit Pelindung Kabel** | 1 Paket | Rp 9.800.000 | **Rp 9.800.000** |
| **7** | **Scanner Gerbang** | **ACS ACR122U USB NFC Smart Card Reader 13.56 MHz** | 4 Unit | Rp 580.000 | **Rp 2.320.000** |
| **8** | **Tablet Pos Gerbang** | **Samsung Galaxy Tab A9+ WiFi 8.7"/11"** + Casing Rugged Tahan Banting | 2 Unit | Rp 3.162.500 | **Rp 6.325.000** |
| **9** | **Terminal Reader Kelas** | **USB RFID Reader 13.56 MHz (Mifare) Tiap Kelas Teori & Bengkel** | 55 Unit | Rp 330.000 | **Rp 18.150.000** |
| **10** | **Printer Struk Piket & Koperasi** | **Thermal Receipt Printer 80mm USB + Bluetooth Auto-Cutter** | 2 Unit | Rp 800.000 | **Rp 1.600.000** |
| **11** | **Display Lobi Utama** | **Smart TV 50" 4K UHD + Bracket Dinding (TV Mode Live Dashboard)** | 1 Unit | Rp 7.570.000 | **Rp 7.570.000** |
| \- | **Jasa Instalasi & Setup** | Penarikan kabel 55 kelas, setting MikroTik VLAN, konfigurasi OS Proxmox & Linux | 1 Lot | Rp 8.500.000 | **Rp 8.500.000** |
| \- | **TOTAL CAPEX ON-PREMISE** | | | | **Rp 129.839.000** |
| *(Dibulatkan standar)* | **~ Rp 122.000.000 – Rp 130.000.000** |

### B. Biaya Pemeliharaan & Operasional Tahunan (Recurring / Opex On-Premise)

1. **Konsumsi Listrik Server & AC Pendingin Ruang:** Rp 500.000 / bulan $\times$ 12 bulan = **Rp 6.000.000 / tahun**.
2. **Langganan IP Publik Statis / Secure Tunneling:** Rp 150.000 / bulan $\times$ 12 bulan = **Rp 1.800.000 / tahun**.
3. **Sewa Domain Sekolah (.sch.id) & SSL:** **Rp 250.000 / tahun**.
4. **Maintenance & Pembersihan Fisik Berkala:** **Rp 1.500.000 / tahun**.
5. **Cadangan Ganti Baterai UPS (Tiap 2–3 Tahun):** Dicadangkan **Rp 1.500.000 / tahun**.
* **TOTAL BIAYA TAHUNAN ON-PREMISE:** **Rp 11.050.000 / tahun**.

---

## 3. KATALOG SKENARIO B: FULL CLOUD (DATA CENTER ENTERPRISE BIZNET GIO)

Skenario ini meniadakan mesin server di sekolah. Seluruh aplikasi, database, dan pemrosesan berjalan di server komputasi awan (*Cloud VPS Enterprise*) Biznet GIO.

### A. Rincian Kebutuhan Alat di Sekolah (Belanja Investasi 1x / Capex Sangat Minim)

| No | Kategori | Nama Perangkat & Spesifikasi Teknis | Kuantitas | Estimasi Harga Satuan | Total Biaya |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | **Server Fisik Sekolah** | **TIDAK PERLU PENGADAAN (NOL RUPIAH)**<br>Aplikasi & Database berjalan di Cloud Data Center Tier-3 | 0 Unit | Rp 0 | **Rp 0** |
| **2** | **Kabel ke 55 Rombel** | **TIDAK PERLU TARIK KABEL (NOL RUPIAH)**<br>Guru cukup memakai HP/Laptop via Wi-Fi/Internet reguler | 0 Meter | Rp 0 | **Rp 0** |
| **3** | **Reader Fisik di 55 Kelas** | **TIDAK PERLU PENGADAAN (NOL RUPIAH)**<br>Presensi kelas memakai fitur cerdas *KBM Auto-Propagation* | 0 Unit | Rp 0 | **Rp 0** |
| **4** | **Scanner Pos Gerbang** | **ACS ACR122U USB NFC Smart Card Reader 13.56 MHz (Plug & Play)** | 4 Unit | Rp 580.000 | **Rp 2.320.000** |
| **5** | **Terminal Pos Gerbang** | **Samsung Galaxy Tab A9+ WiFi** *(Dilengkapi Protect Battery 80% & Type-C Hub PD)* | 2 Unit | Rp 3.162.500 | **Rp 6.325.000** |
| **6** | **Printer Struk Piket/Disiplin** | **Thermal Receipt Printer 80mm Bluetooth + USB (Kassen/Iware Auto-Cutter)** | 1 Unit | Rp 800.000 | **Rp 800.000** |
| \- | **TOTAL CAPEX FULL CLOUD** | *(Hanya untuk perangkat fisik gerbang depan sekolah)* | | | **Rp 9.445.000** |
| *(Dibulatkan standar)* | **~ Rp 9.500.000** |

### B. Rincian Layanan Cloud & Bahan Habis Pakai Tahunan (Opex Tahunan)

| No | Kategori Layanan | Spesifikasi Layanan | Satuan Periode | Estimasi Biaya |
| :---: | :--- | :--- | :---: | :---: |
| **1** | **Cloud VPS Enterprise (Tangguh & Anti-Down)** | **Biznet GIO NEO Lite Pro (Enterprise Tier)**<br>• **12 vCPU High Performance Core**<br>• **24 GB DDR4 Enterprise RAM**<br>• **100 GB High Speed NVMe Storage**<br>• Pipa Bandwidth IIX 1 Gbps Tanpa Kuota (*Unlimited*)<br>• Jaminan Uptime 99.9% (Data Center Tier-3) | 1 Tahun Penuh | **Rp 27.588.000** |
| **2** | **Automated Cloud Backup** | Pencadangan otomatis (*Daily Snapshot*) database setiap tengah malam ke lokasi offsite terpisah | Sudah Termasuk | Rp 0 |
| **3** | **Domain Resmi & SSL HTTPS** | Domain Resmi Sekolah (.sch.id) + Sertifikat Keamanan SSL 256-bit | 1 Tahun | Rp 250.000 |
| **4** | **Paket Kartu Siswa (HPP Vendor)** | 2.500 Siswa $\times$ Rp 35.000 *(Kartu RFID 13.56 MHz Doff 2 Sisi + Lanyard Berlogo + Hardcase)* | 1 Paket PPDB/Awal | Rp 87.500.000 |
| **5** | **Fee Kas Sekolah Tunai** | 2.500 Siswa $\times$ Rp 10.000 diserahkan langsung ke Kas Sekolah / Koperasi / Komite | 1 Paket PPDB/Awal | Rp 25.000.000 |

---

## 4. SIMULASI ARUS KAS & CASH FLOW FINANSIAL (TAHUN KE-1)

Dengan menerapkan tarif **Program Kartu Pelajar Pintar Terpadu** sebesar **Rp 80.000 / siswa / tahun**:

$$\text{Pemasukan Total (2.500 Siswa)} = 2.500 \times \text{Rp } 80.000 = \mathbf{\text{Rp } 200.000.000}$$

### Perbandingan Hasil Arus Kas (Tahun 1):

| Pos Pengeluaran / Alokasi Dana | SKENARIO ON-PREMISE | SKENARIO FULL CLOUD |
| :--- | :---: | :---: |
| **Total Pemasukan Program Siswa** | Rp 200.000.000 | Rp 200.000.000 |
| **Biaya Cetak Kartu Fisik, Lanyard & Case (HPP Vendor)** | (Rp 87.500.000) | (Rp 87.500.000) |
| **Hak Bagi Hasil Kas Sekolah (Rp 10.000/siswa)** | (Rp 25.000.000) | (Rp 25.000.000) |
| **Sisa Kas Tersedia** | **Rp 87.500.000** | **Rp 87.500.000** |
| **Biaya Pengadaan Alat & Infrastruktur** | **(Rp 122.000.000)** *(Kurang!)* | **(Rp 9.500.000)** *(Alat Gerbang)* |
| **Biaya Server (1 Tahun Pertama)** | (Rp 8.500.000) *(Listrik & Tunnel)* | **(Rp 27.588.000)** *(Biznet 12vCPU)* |
| **Dana Cadangan Operasional & Perawatan** | (Rp 5.000.000) | (Rp 10.412.000) |
| **POSISI KAS AKHIR / PROFIT BERSIH PENGEMBANG** | 🔴 **DEFISIT (-Rp 48.000.000)** | 🟢 **SURPLUS BERSIH (+Rp 40.000.000)** |

### Mengapa Skenario Full Cloud Menang Mutlak?
1. **Pada Opsi On-Premise:** Modal penjualan kartu sebesar Rp 87,5 Juta **TIDAK CUKUP** untuk membeli server Dell, UPS, dan menarik kabel ke 55 kelas (butuh Rp 122 Juta). Sekolah terpaksa harus nombok sekitar **Rp 48 Juta** dari kas BOS!
2. **Pada Opsi Full Cloud:** Seluruh kebutuhan perangkat gerbang, sewa server monster (12 vCPU / 24 GB RAM), dan dana darurat **langsung tertutupi lunas dari penjualan kartu**, sekolah mengantongi **Rp 25 Juta tunai**, dan tim pengembang mengantongi **laba bersih Rp 40 Juta tunai**!

---

## 5. ANALISIS JANGKA PANJANG (TCO HORIZON 3, 5, DAN 10 TAHUN)

| Horizon Waktu | Total Biaya On-Premise | Total Biaya Full Cloud | Selisih Penghematan | Keunggulan Lapangan |
| :---: | :---: | :---: | :---: | :--- |
| **3 TAHUN** | **Rp 147.500.000** | **Rp 93.764.000** | **Cloud Lebih Hemat Rp 53.736.000** | Bebas belanja alat Rp 122 Juta di awal; kelancaran presensi terjamin sejak hari pertama. |
| **5 TAHUN** | **Rp 164.500.000** | **Rp 149.940.000** | **Cloud Lebih Hemat Rp 14.560.000** | Di tahun ke-5, server fisik mulai aus dan garansi habis, sedangkan cloud otomatis mendapat hardware prima tanpa biaya servis. |
| **10 TAHUN** | **Rp 277.000.000** | **Rp 290.380.000** | Biaya Seimbang (Selisih ~4%) | On-Premise wajib beli server baru di tahun ke-6. Cloud bebas risiko petir, kebakaran, dan mati lampu. |

---

## 6. JALUR EVOLUSI MASA DEPAN: DARI CLOUD MENJADI COLOCATION PRIBADI

Salah satu keunggulan terbesar dari memulai dengan **Skenario Full Cloud** adalah tersedianya modal keuntungan bersih (Rp 40.000.000 – Rp 50.000.000) di tahun pertama. 

Modal ini membuka opsi strategis di Tahun ke-2 atau ke-3:
1. **Membeli Server Rackmount 1U Milik Sendiri** (seperti Dell PowerEdge R250/R350 seharga ~Rp 35 Juta dari laba tahun pertama).
2. **Menitipkan Server di Rak Data Center Resmi (*Colocation Server*)** dengan biaya sewa space rak hanya sekitar **Rp 1.000.000 / bulan (Rp 12 Juta/tahun)**.
3. **Multi-Tenant (Bisa Menampung Sekolah Lain):** Server milik Anda tersebut memiliki kapasitas raksasa (64 GB RAM & 16 Core) yang sanggup menampung **3 hingga 5 sekolah sekaligus**. Penambahan sekolah baru di masa depan menghasilkan biaya server **Rp 0 (Nol Rupiah)** sehingga margin laba Anda melonjak hingga di atas 80%!

---

## 7. KESIMPULAN REKOMENDASI UNTUK PIMPINAN SEKOLAH

Berdasarkan komparasi teknis, finansial, dan manajemen risiko di atas, kami merekomendasikan:

> **PILIH SKENARIO B: FULL CLOUD (DATA CENTER ENTERPRISE)**  
> - **Nol Risiko Finansial bagi Sekolah:** Sekolah tidak perlu mengalokasikan anggaran belanja modal puluhan juta rupiah dari dana BOS.
> - **Dukungan Penuh Modul PKL & Orang Tua:** Guru pembimbing PKL dan orang tua murid dapat mengakses sistem 24 jam non-stop dari luar sekolah.
> - **Performa Super Cepat:** Spesifikasi 12 vCPU dan 24 GB RAM menjamin sistem bebas lemot, bebas antrean, dan selalu siap menghadapi ujian online atau cetak rapor massal.
> - **Solusi Mandiri & Berkesinambungan:** Sekolah memperoleh tambahan kas resmi Rp 25.000.000 setiap tahun melalui Program Kartu Pelajar Pintar Terpadu.
