# Project Absenta: Master Rules & SOP (Antigravity)

Dokumen ini adalah pedoman tetap (MANDATORY) untuk interaksi antara USER (Owner) dan Antigravity (AI Assistant). Aturan ini dibuat untuk memastikan kualitas SaaS profesional dan mencegah kesalahan teknis yang berulang.

## 1. Bahasa & Komunikasi
- **Bahasa Utama**: Bahasa Indonesia (Profesional, Jelas, dan Taktis).
- **Perspektif User**: Menghargai USER sebagai **Owner/Pemilik Bisnis**. Antigravity harus menjelaskan dampak bisnis/fungsional dari perubahan teknis.
- **Respon**: Ringkas dan padat. Hindari penjelasan teori yang tidak perlu kecuali diminta.

## 2. Pola Kerja & Filosofi SaaS
- **SaaS Mindset**: Dilarang menggunakan data tiruan (*mockups*). Semua fitur harus terhubung ke Database dan API secara nyata.
- **Prinsip Hulu ke Hilir**: Audit setiap perubahan dari rute Backend (Hulu) hingga tampilan Frontend (Hilir).
- **Kontrak Arsitektur**: Selalu patuhi `ROUTING_CONTRACT.md`. Konsistensi prefix `/api` dan rute WebSocket adalah harga mati.
- **Audit Mandiri**: Sebelum melaporkan tugas selesai, sisir kembali file terkait untuk memastikan tidak ada sisa kode debug atau inkonsistensi.

## 3. Dokumentasi (Plan & Task)
- **Implementation Plan**: Wajib dibuat untuk perubahan besar/struktural. Harus mencakup analisis risiko dan rencana verifikasi.
- **Task List (`task.md`)**: Harus selalu diupdate ( `[ ]`, `[/]`, `[x]` ). Gunakan task yang atomik (kecil-kecil).
- **Walkthrough**: Wajib menyertakan bukti hasil (misal: screenshot/record dari browser tool atau log terminal yang sukses).

## 4. Protokol Lingkungan Windows (CRITICAL)
- **Operating System**: Windows.
- **Shell**: PowerShell (Wajib!).
- **Larangan Keras**: DILARANG menggunakan perintah Unix ( `grep`, `ls`, `rm -rf`, `sh` ).
- **Padanan Wajib**:
    - Cari teks -> `grep_search` tool atau `Select-String`.
    - List file -> `dir` atau `Get-ChildItem`.
    - Hapus file -> `Remove-Item -Recurse -Force`.
    - Pemisah Perintah -> Gunakan `;` (titik koma), JANGAN gunakan `&&`. (Contoh: `step1 ; step2`).
- **Self-Correction Policy**: Setiap kali Antigravity melakukan kesalahan teknis atau salah asumsi lingkungan, Antigravity wajib mencatatnya di dokumen ini sebagai aturan baru atau pembaruan agar tidak terulang kembali.
- **Verifikasi Wajib (Zero Local Build Overhead)**: Komputer pengembang lokal memiliki keterbatasan RAM dan CPU yang hampir penuh. **DILARANG menjalankan `npm run build` berat di mesin lokal**. Seluruh kompilasi dan pengujian build produksi dialihkan ke sandbox staging VPS (`10.10.10.116`) via `deploy-safe.ps1` / `deploy-safe.bat`.
- **Auto-run Safe Deploy**: Antigravity diberikan izin untuk memicu deployment aman ke staging VPS (`.\deploy-safe.ps1`) untuk membuktikan 0 error sebelum melaporkan penyelesaian tugas kepada USER.
- **Git Workflow**: Antigravity wajib melakukan `git commit` dan `git push` setiap kali satu sub-tugas atau perbaikan (Atomic Commit) selesai. Gunakan pesan commit standar (feat, fix, refactor).
    - **Catatan Repositori**: Root directory `D:\BarayaProject\Project Absenta` adalah repositori Git utama (`origin/main`). Lakukan `git add` dan `git commit` di root ini. Selalu verifikasi status dengan `git status`.

## 5. Aturan Log Ownership (Audit Log)
- **Hard Rule**: Sistem memiliki aturan ketat "1 Event = 1 Log Owner" di `src/constants/logOwnership.ts`.
- **Registrasi Wajib**: Setiap tipe event baru yang akan dicatat via `auditLogService.logEvent` **WAJIB** didaftarkan terlebih dahulu di `AUDIT_LOG_ALLOWED_EVENTS`.
- **Dampak Pelanggaran**: Pelanggaran aturan ini akan menyebabkan `Error: Log Ownership Violation` dan memicu rollback transaksi database. Ini adalah mekanisme keamanan untuk mencegah spam log atau log yang tidak terstruktur.

## 6. Kebiasaan yang Sering Terlupa (Reminders)
- **Environment**: Selalu cek `.env` di backend maupun frontend setelah melakukan perubahan URL/Port.
- **Restart**: Ingatkan USER untuk me-restart server (`npm run dev`) setiap kali ada perubahan pada file konfigurasi (`.env`, `vite.config.ts`, dll).
- **Database**: Pastikan skema Prisma sinkron dengan perubahan logika bisnis.
- **Arsitektur DRY & Reusabilitas**: Setiap kali modul baru dibuat di frontend maupun backend, wajib menerapkan **Prinsip DRY (Don't Repeat Yourself)** secara ketat. Manfaatkan, optimalkan, atau buat komponen UI/fungsi utility yang bersifat **reusable (dapat digunakan kembali)** guna menghindari duplikasi kode yang berlebihan dan mempermudah pemeliharaan jangka panjang.

## 7. Aturan Validasi Tipe Data Statis (TypeScript) & Safe Staging Gate (MANDATORY)
- **Safe Staging Validation**: Untuk menjaga resource komputer lokal tetap aman, validasi TypeScript dan kompilasi build produksi dilakukan di server staging VPS (`10.10.10.116`) melalui `.\deploy-safe.ps1`.
- **Standard Keberhasilan**: Tugas atau perbaikan kode dilarang dilaporkan selesai atau dianggap sukses sebelum pipeline `deploy-safe.ps1` berhasil lolos uji 100% dengan status sukses dan PM2 ter-reload secara zero-downtime.

---
**Status: ATURAN AKTIF & PERMANEN.**
Antigravity akan membaca dan mematuhi dokumen ini di setiap turn.
