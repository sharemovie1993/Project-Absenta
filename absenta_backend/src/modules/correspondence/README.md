# MODULE CORRESPONDENCE (Tata Usaha & Persuratan)

## Deskripsi
Modul Correspondence mengelola alur surat menyurat di lingkungan sekolah (Tata Usaha), yang meliputi administrasi Surat Masuk dan Surat Keluar, alur disposisi pimpinan, penandatanganan elektronik, serta verifikasi publik terhadap keabsahan dokumen.

## Aktor & Peran
- **Petugas Tata Usaha (TU)**: Pembuat draf surat, pengarsip surat masuk, dan pengatur nomor surat otomatis.
- **Kepala Sekolah / Pimpinan**: Pemberi disposisi surat masuk, penandatangan surat keluar.
- **Penerima Surat (Umum/Wali Murid)**: Mengakses berkas publik menggunakan token akses publik.

## Sub-Modul & Fitur Terimplementasi
### 1. Surat Keluar (Outgoing Mail)
- **Drafting & Auto-Numbering**: Pembuatan surat keluar dengan format nomor otomatis.
- **Digital Sign (TTE)**: Penandatanganan digital oleh kepala sekolah.
- **Quick Approve Endpoint**: Endpoint persetujuan kilat via token terenkripsi.

### 2. Surat Masuk & Disposisi
- **Archiving**: Pencatatan surat masuk beserta dokumen pindaian (scan).
- **Disposisi Flow**: Pengiriman instruksi tindak lanjut dari pimpinan ke staf terkait.

## Teknologi & Pattern
- **Pattern**: Document Workflow Pattern, Stateless Verification Token.
- **Database**: Tabel `SuratMasuk`, `SuratKeluar`, `DisposisiSurat`.
