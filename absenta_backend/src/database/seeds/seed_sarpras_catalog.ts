import { PrismaClient } from '@prisma/client';

export async function seedSarprasCatalog(prisma: PrismaClient) {
  console.log('📦 Seeding Sarpras Global Catalog...');

  const catalogItems = [
    // ==========================================
    // JURUSAN: TEKNIK KOMPUTER & JARINGAN (TKJ)
    // ==========================================
    
    // --- Kelompok 1: Perangkat Jaringan & Server (Aset Tetap / Peralatan) ---
    { nama: 'Router MikroTik RB951Ui-2HnD', brand: 'MikroTik', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Router wireless indoor untuk laboratorium praktik TKJ.' },
    { nama: 'Router MikroTik hEX lite RB750r2', brand: 'MikroTik', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Routerboard ethernet ekonomis untuk modul routing dasar siswa.' },
    { nama: 'Router MikroTik Cloud Core CCR1009-7G-1C-PC', brand: 'MikroTik', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Router core server utama penunjang jaringan internet sekolah.' },
    { nama: 'Cisco Router ISR 4331', brand: 'Cisco', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Router enterprise untuk modul praktikum Cisco / WAN.' },
    { nama: 'Switch Cisco Catalyst 2960 24-Port', brand: 'Cisco', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Switch managed Layer 2 untuk praktik VLAN, trunking, dan STP.' },
    { nama: 'Switch Managed TP-Link TL-SG3428 24-Port', brand: 'TP-Link', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Switch managed gigabit Layer 2+ untuk manajemen port lab TKJ.' },
    { nama: 'Access Point Ubiquiti UniFi AC Lite', brand: 'Ubiquiti', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Access Point Wi-Fi dual band kelas korporat.' },
    { nama: 'Access Point Outdoor TP-Link EAP225-Outdoor', brand: 'TP-Link', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Access Point nirkabel luar ruangan untuk area lapangan sekolah.' },
    { nama: 'Server Sekolah Dell PowerEdge T150', brand: 'Dell', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Server utama sekolah untuk data, hosting lokal, dan CBT.' },
    { nama: 'UPS Rackmount APC Smart-UPS 1500VA', brand: 'APC', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Penyimpan daya listrik cadangan rackmount pelindung server.' },
    { nama: 'Server Rack Cabinet 20U Indorack', brand: 'Indorack', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Lemari kabinet rackmount unit perangkat server & switch lab.' },
    { nama: 'PC Client Lab Lenovo ThinkCentre', brand: 'Lenovo', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'PC Desktop workstation praktikum harian siswa di lab.' },
    { nama: 'Laptop Guru Asus VivoBook', brand: 'Asus', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Laptop Asus Core i5 untuk kegiatan administrasi dan mengajar guru.' },
    { nama: 'Laptop Siswa Acer Chromebook C733', brand: 'Acer', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Chromebook portabel untuk sarana belajar digital siswa.' },
    { nama: 'Printer Inkjet Epson L3210 All-in-One', brand: 'Epson', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Printer cetak, scan, dan copy infus tangki resmi.' },
    { nama: 'Kamera CCTV Hikvision Dome 2MP', brand: 'Hikvision', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Kamera pengawas keamanan indoor untuk laboratorium.' },
    { nama: 'Firewall Appliance Fortinet FortiGate 60F', brand: 'Fortinet', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Perangkat keras firewall UTM keamanan dan pembatasan trafik internet lab.' },
    { nama: 'Cisco Wireless Controller WLC 3504', brand: 'Cisco', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Pengendali Access Point terpusat Cisco WLC praktikum jaringan wireless skala besar.' },
    { nama: 'Media Converter FO Netlink HTB-3100 A/B', brand: 'Netlink', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Converter interface ethernet RJ45 ke serat optik SC single core.' },
    { nama: 'SFP Transceiver Module 1.25G 10km MikroTik', brand: 'MikroTik', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: true, deskripsi: 'Modul transceiver SFP Gigabit fiber optic untuk switch/router.' },
    { nama: 'Windows Server 2022 Standard 16-Core', brand: 'Microsoft', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Lisensi resmi Operating System Server Sekolah.' },
    { nama: 'Windows 11 Professional Original FPP', brand: 'Microsoft', category_name: 'Jurusan: TKJ - Perangkat Jaringan & Server', is_loanable: false, deskripsi: 'Lisensi resmi Windows 11 Pro retail FPP untuk PC laboratorium.' },

    // --- Kelompok 2: Alat Kerja & Praktik Hardware (Aset Tetap / Peralatan) ---
    { nama: 'Tang Crimping RJ45 & RJ11 HT-500R', brand: 'Hanlong', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Tang pemotong, pengupas kabel, dan press konektor RJ45/RJ11.' },
    { nama: 'LAN Cable Tester RJ45 & RJ11', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat ukur indikator lampu kelayakan koneksi kabel UTP.' },
    { nama: 'Punch Down Tool LSA Krone', brand: 'Krone', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat penekan kabel ke modular jack RJ45 dan patch panel.' },
    { nama: 'Fusion Splicer Fiber Optic Sumitomo T-400S', brand: 'Sumitomo', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat penyambung inti kaca core kabel serat optik (fiber).' },
    { nama: 'Optical Power Meter (OPM) & VFL 2-in-1', brand: 'Grandway', category_name: 'Alat Peraga & Praktik', is_loanable: true, deskripsi: 'Alat ukur redaman daya laser dan visual laser locator 2-in-1.' },
    { nama: 'Visual Fault Locator (VFL) Laser 20mW', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Senter laser merah pendeteksi keretakan core serat optik.' },
    { nama: 'Fiber Cleaver FC-6S', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat pemotong ujung serat optik presisi sebelum disambung.' },
    { nama: 'Fiber Stripper Miller Clamp', brand: 'Miller', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Tang pengupas jaket pelindung luar kabel serat optik.' },
    { nama: 'Obeng Set Presisi Magnetik 45 in 1', brand: 'Jakemy', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Set obeng mini magnetik untuk perakitan PC, laptop, dan gadget.' },
    { nama: 'Gelang Anti-Statis (Anti-Static Wrist Strap)', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Gelang penetral listrik statis tubuh saat merakit hardware PC.' },
    { nama: 'Blower Uap Solder SMD (Hot Air Rework)', brand: 'Quick', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Solder uap udara panas untuk perbaikan sirkuit mainboard PC.' },
    { nama: 'PC Client Praktik Perakitan (CPU Belajar)', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'CPU rakitan khusus untuk bahan ajar bongkar pasang siswa.' },
    { nama: 'Power Supply Unit (PSU) Corsair CV450 450W', brand: 'Corsair', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Catu daya listrik cadangan pengujian perangkat keras komputer.' },
    { nama: 'Tool Set Tas Network Tool Kit', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Tas perlengkapan lengkap alat potong, press, dan ukur teknisi jaringan.' },
    { nama: 'Crimping Tool Pass Through RJ45 RJ12', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Tang crimping tipe tembus kabel pass-through praktikum perakitan kabel.' },
    { nama: 'Fiber Optic Stripper Drop Core FTTH', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat pengupas kawat penyangga & jaket kabel drop core.' },
    { nama: 'Power Supply Tester Digital Thermaltake', brand: 'Thermaltake', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Alat penguji dan pembaca tegangan power supply PC dengan display LCD.' },
    { nama: 'Motherboard Diagnostic Post Card PCI/PCIE', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Kartu diagnostik post code pendeteksi error kerusakan mainboard PC.' },
    { nama: 'ESD Safe Brush Set 5 in 1', brand: 'Kustom', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Set sikat kuas anti-statis pembersih debu komponen elektronik PC.' },
    { nama: 'Pinset ESD Curve & Straight Vetus Set', brand: 'Vetus', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Pinset anti-statis presisi penjepit jumper sirkuit elektronik.' },
    { nama: 'Electric Screwdriver Cordless Xiaomi Mijia', brand: 'Xiaomi', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Obeng listrik nirkabel presisi rakit/bongkar laptop/PC.' },
    { nama: 'Solder Station Digital Hakko FX-888D', brand: 'Hakko', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Solder stasiun pemanas digital presisi perbaikan mainboard.' },
    { nama: 'Desoldering Pump (Sedotan Timah) Tekiro', brand: 'Tekiro', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Pompa hisap penyedot timah solder cair.' },
    { nama: 'Magnifying Glass Lamp (Kaca Pembesar Meja)', brand: 'Krisbow', category_name: 'Jurusan: TKJ - Alat Kerja & Praktik', is_loanable: true, deskripsi: 'Lampu kaca pembesar meja untuk inspeksi detail solderan sirkuit.' },

    // ==========================================
    // KATEGORI UMUM SEKOLAH
    // ==========================================
    
    // --- Kelompok 3: Mebel & Furniture (Aset Tetap / Peralatan) ---
    { nama: 'Meja Siswa Kayu Single', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Meja belajar siswa satu kursi kayu jati.' },
    { nama: 'Kursi Siswa Kayu Jati', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Kursi belajar siswa kayu jati standar.' },
    { nama: 'Meja Guru 1 Biro Laci', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Meja kerja guru dengan laci kunci.' },
    { nama: 'Kursi Kerja Kantor Busa Hidrolik', brand: 'Chairman', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Kursi busa beroda untuk guru/staf TU.' },
    { nama: 'Papan Tulis Whiteboard Magnit 120x240cm', brand: 'Keiko', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Whiteboard dinding magnetik besar.' },
    { nama: 'Lemari Arsip Pintu Geser Besi', brand: 'Brother', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Lemari besi arsip dokumen sekolah.' },
    { nama: 'Rak Buku Perpustakaan 5 Susun Besi', brand: 'Brother', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Rak penyimpanan koleksi buku perpustakaan.' },
    { nama: 'Meja Rapat Oval Kayu Jati', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Meja rapat besar kayu jati ruang guru/komite.' },
    { nama: 'Kursi Lipat Chitose Stainless Steel', brand: 'Chitose', category_name: 'Umum: Mebel & Furniture', is_loanable: true, deskripsi: 'Kursi lipat stainless untuk aula atau rapat serbaguna.' },
    { nama: 'Sofa Tamu Kantor Minimalis 2 Seater', brand: 'Olympic', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Sofa kulit sintetis ruang Kepala Sekolah / ruang tamu utama.' },
    { nama: 'Lemari Locker Siswa 12 Pintu', brand: 'Brother', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Lemari loker besi penyimpanan barang pribadi siswa.' },
    { nama: 'Rak Sepatu Stainless Steel Kelas', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Rak stainless steel penempatan alas kaki luar kelas.' },
    { nama: 'Meja Praktikum Lab IPA Granit', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Meja laboratorium berkaki kokoh dengan alas granit tahan zat kimia.' },
    { nama: 'Kursi Lab Tinggi Hidrolik Tanpa Sandaran', brand: 'Chitose', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Kursi laboratorium bulat beroda tanpa sandaran.' },
    { nama: 'Meja Komputer Lab Sekat Wood', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Meja kayu bersekat pembatas untuk Lab Komputer.' },
    { nama: 'Ranjang UKS Besi Single', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Ranjang besi medis dengan kasur busa untuk ruang UKS.' },
    { nama: 'Brankas Uang Besi Digital Chubbsafes', brand: 'Chubbsafes', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Lemari besi tahan api penyimpanan uang/berkas keuangan TU.' },
    { nama: 'Lemari Kaca Obat UKS Pintu Ganda', brand: 'Masaji', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Lemari display kaca obat-obatan dan P3K UKS.' },
    { nama: 'Manekin Display Baju Half Body Wanita', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: true, deskripsi: 'Manekin plastik pajangan busa display baju praktik busana.' },
    { nama: 'Papan Absensi Dinding Kayu Kelas', brand: 'Kustom', category_name: 'Umum: Mebel & Furniture', is_loanable: false, deskripsi: 'Papan tulis kecil gantung absensi harian kelas.' },

    // --- Kelompok 4: Olahraga & Seni (Aset Tetap / Peralatan) ---
    { nama: 'Bola Futsal Specs Standar FIFA', brand: 'Specs', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Bola futsal untuk mata pelajaran PJOK.' },
    { nama: 'Bola Basket Molten GG7X Kulit', brand: 'Molten', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Bola basket ukuran 7 standar kompetisi.' },
    { nama: 'Bola Voli Mikasa V330W', brand: 'Mikasa', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Bola voli standar untuk pelajaran olahraga.' },
    { nama: 'Gitar Akustik Yamaha F310 Original', brand: 'Yamaha', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Gitar akustik kayu pelajaran seni musik.' },
    { nama: 'Keyboard Musik Yamaha PSR-E373', brand: 'Yamaha', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Keyboard musik elektronik pelajaran seni.' },
    { nama: 'Meja Tenis Meja Shiamiq Standar', brand: 'Shiamiq', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Meja pingpong standar turnamen nasional.' },
    { nama: 'Tiang Bulutangkis Portable + Net', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Tiang badminton portabel dengan pemberat beton.' },
    { nama: 'Matras Senam Lantai Busa Rebonded', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Matras ketangkasan busa berlapis oscar tebal 10cm.' },
    { nama: 'Set Alat Musik Gamelan Jawa Kuningan', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: false, deskripsi: 'Satu set instrumen gamelan tradisional jawa bahan kuningan.' },
    { nama: 'Set Alat Musik Hadroh Rebana', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Satu set alat musik hadroh / terbang jepara seni rebana.' },
    { nama: 'Set Drum Kit Yamaha Rydeen', brand: 'Yamaha', category_name: 'Umum: Olahraga & Seni', is_loanable: false, deskripsi: 'Satu set drum akustik lengkap hardware dan cymbal ruang musik.' },
    { nama: 'Audio Mixer Sound System Yamaha MG16XU', brand: 'Yamaha', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Mixing console audio 16 channel aula pertemuan utama.' },
    { nama: 'Microphone Wireless Shure SVX24/PG58', brand: 'Shure', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Microphone genggam nirkabel dual-channel pidato/upacara.' },
    { nama: 'Keranjang Besi Penyimpanan Bola', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: false, deskripsi: 'Keranjang besi beroda dengan gembok pengunci bola olahraga.' },
    { nama: 'Set Alat Musik Angklung 2 Oktav Bambu Hitam', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: true, deskripsi: 'Set angklung bambu hitam standar pelajaran musik daerah.' },
    { nama: 'Gawang Futsal Portable Sepasang Pipa Besi', brand: 'Kustom', category_name: 'Umum: Olahraga & Seni', is_loanable: false, deskripsi: 'Gawang futsal portable sepasang lengkap dengan net jala.' },

    // --- Kelompok 5: Fasilitas & Kebersihan (Aset Tetap / Peralatan) ---
    { nama: 'Alat Pemadam Api Ringan (APAR) Powder 3kg', brand: 'Starvvo', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Tabung pemadam kebakaran portable powder.' },
    { nama: 'Kotak P3K Dinding Pintu Kaca', brand: 'Masaji', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Kotak P3K lengkap dengan obat-obatan dasar.' },
    { nama: 'Sapu Lantai Nilon Gagang Plastik', brand: 'Dragon', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Peralatan kebersihan kelas sapu nilon.' },
    { nama: 'Alat Pel Lantai Katun Putar', brand: 'Dragon', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Peralatan kebersihan kain pel katun.' },
    { nama: 'Tempat Sampah Injak Pilah Organik & Non-Organik', brand: 'Krisbow', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Satu pasang tong sampah pilah besar (hijau dan kuning).' },
    { nama: 'Mesin Pemotong Rumput Gendong Honda UMR435N', brand: 'Honda', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Mesin potong rumput punggung bahan bakar bensin.' },
    { nama: 'Tangga Aluminium Lipat 2 Meter', brand: 'Krisbow', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: true, deskripsi: 'Tangga aluminium lipat multifungsi perawatan atap/lampu.' },
    { nama: 'Dispenser Air Galon Bawah Sharp', brand: 'Sharp', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Dispenser air minum galon bawah pemanas dan pendingin.' },
    { nama: 'Kipas Angin Dinding Wall Fan Cosmos 16 Inch', brand: 'Cosmos', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Kipas angin dinding putar manual.' },
    { nama: 'Air Conditioner (AC) Panasonic 1 PK', brand: 'Panasonic', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Air Conditioner (AC) split pendingin ruang kelas.' },
    { nama: 'Genset Listrik Portable Honda EU22i', brand: 'Honda', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Generator set bensin portabel cadangan lampu listrik.' },
    { nama: 'Jam Dinding Seiko Quiet Sweep', brand: 'Seiko', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Jam dinding analog dengan jarum halus senyap untuk kelas.' },
    { nama: 'Papan Pengumuman Kaca Softboard Mading', brand: 'Keiko', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Papan mading softboard dinding berpintu kaca geser terkunci.' },
    { nama: 'Vacuum Cleaner Wet & Dry Krisbow', brand: 'Krisbow', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: true, deskripsi: 'Alat penyedot debu basah dan kering karpet masjid/aula.' },
    { nama: 'Bak Wudhu Keran Stainless Steel 5 Titik', brand: 'Kustom', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Dudukan keran wudhu stainless steel masjid sekolah.' },
    { nama: 'Timbangan Badan & Tinggi Digital UKS', brand: 'Smic', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Timbangan digital dengan pembaca tinggi badan terintegrasi.' },
    { nama: 'Tensimeter Digital Omron HEM-7156', brand: 'Omron', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: true, deskripsi: 'Alat ukur tekanan darah digital lengan atas.' },
    { nama: 'Kursi Roda Standard Rumah Sakit', brand: 'Gea', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: true, deskripsi: 'Kursi roda lipat manual evakuasi medis darurat UKS.' },
    { nama: 'Wastafel Portable Cuci Tangan Pedal Kaki', brand: 'Kustom', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Bak cuci tangan outdoor sistem injak pedal air dan sabun.' },
    { nama: 'Megaphone TOA ZR-2003S Portable', brand: 'TOA', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: true, deskripsi: 'Pengeras suara corong TOA lapangan untuk guru piket/satpam.' },
    { nama: 'Lambang Garuda Pancasila Bingkai Kayu Jati', brand: 'Kustom', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Pajangan bingkai ukir lambang negara burung garuda di kelas.' },
    { nama: 'Foto Presiden & Wapres RI Bingkai Jati', brand: 'Kustom', category_name: 'Umum: Fasilitas & Kebersihan', is_loanable: false, deskripsi: 'Satu pasang bingkai foto Presiden & Wakil Presiden RI.' }
  ];

  let insertedCount = 0;
  for (const item of catalogItems) {
    try {
      // Tentukan warna latar belakang placeholder berdasarkan kelompok kategori
      let bgColor = '3b82f6'; // default blue
      if (item.category_name.includes('Jaringan')) bgColor = '3b82f6'; // blue
      else if (item.category_name.includes('Alat Kerja')) bgColor = '10b981'; // green
      else if (item.category_name.includes('Mebel')) bgColor = '6366f1'; // indigo
      else if (item.category_name.includes('Olahraga')) bgColor = 'f59e0b'; // amber
      else if (item.category_name.includes('Fasilitas')) bgColor = 'ef4444'; // red

      const cleanText = item.nama
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim();
      const textParam = encodeURIComponent(cleanText);
      const imageUrl = `https://placehold.co/150x150/${bgColor}/ffffff?text=${textParam}`;

      await prisma.sarprasGlobalCatalog.upsert({
        where: {
          nama_brand: {
            nama: item.nama,
            brand: item.brand
          }
        },
        update: {
          category_name: item.category_name,
          is_loanable: item.is_loanable,
          deskripsi: item.deskripsi,
          image_url: imageUrl
        },
        create: {
          nama: item.nama,
          brand: item.brand,
          category_name: item.category_name,
          is_loanable: item.is_loanable,
          deskripsi: item.deskripsi,
          image_url: imageUrl
        }
      });
      insertedCount++;
    } catch (err: any) {
      console.warn(`⚠️ Gagal upsert catalog item '${item.nama}':`, err.message);
    }
  }

  console.log(`✅ Berhasil seeding ${insertedCount} item Katalog Aset Global (Lengkap dengan Image Placeholder).`);
}
