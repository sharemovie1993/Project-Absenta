# ⛔ MODULE RULES & HARDENING STANDARDS — MODUL KURIKULUM

---

## 1. ATURAN PENGEMBANGAN BACKEND & CONTROLLER

1. **Strict Type Safety**: Dilarang keras menyisipkan `any` implisit pada handler atau lambda callback (misal: wajib `(match: string) => ...`).
2. **Database Auto-Resolution**: Endpoint pencarian `getPerangkatById` wajib menyertakan relasi `Guru`, `Mapel`, `TahunPelajaran`, `Semester` serta resolver otomatis `html_content` dari `GlobalPerangkatAjarLibrary`.
3. **No Unused Code Retention**: Dilarang menyisipkan/meninggalkan fungsi fallback mati yang tidak lagi digunakan (misal: `generateRichKurikulumPdf` wajib dihapus jika tidak dikonsumsi).
4. **Puppeteer Timeout Safety**: Eksekusi `setContent` pada Puppeteer wajib menggunakan `{ waitUntil: 'domcontentloaded', timeout: 15000 }` untuk mencegah freeze atau OOM heap memory crash.

---

## 2. ATURAN HARDENING FRONTEND & UI

1. **Zod Validation Guard Mandatory**: Seluruh elemen form (Unggah Berkas, Verifikasi Reviewer, Generator AI, Editor Save) wajib dilindungi oleh skema Zod `z.object({...})` dan dievaluasi via `schema.safeParse(formData)` sebelum mengirimkan request ke API.
2. **File Size Hardening Limit**: Ukuran file halaman utama **DILARANG KERAS MELEBIHI 800 BARIS**. Subkomponen UI wajib diekstrak ke folder `src/components/kurikulum/[nama_modul]/` dan dimuat via `lazy()` + `Suspense`.
3. **1-Click UX Guarantee**: Tombol aksi pratinjau PDF wajib memberikan pengalaman 1-klik langsung (*Direct Built-in PDF Viewer Opening*) tanpa dialog pratinjau bertumpuk.

---

## 3. ATURAN LEGALITAS & KURIKULUM MERDEKA

1. **Kop Surat Instansi**: Seluruh dokumen cetak wajib memuat Kop Surat resmi instansi sesuai Permendikbudristek No. 12 Tahun 2024.
2. **Naskah 5 Halaman Utuh A4**: Dokumen Modul Ajar wajib terbagi secara presisi menjadi 5 Halaman A4 Utuh yang mencakup Bagian I s/d X.
