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
- **Verifikasi Wajib**: Setiap perubahan kode yang mempengaruhi struktur atau routing **WAJIB** diverifikasi dengan `npm run build` sebelum dilaporkan ke USER.
- **Auto-run Build**: Antigravity diberikan izin untuk melakukan *auto-run* terhadap perintah `npm run build` secara mandiri untuk memastikan integritas kode tanpa menunggu instruksi manual.
- **Git Workflow**: Antigravity wajib melakukan `git commit` dan `git push` setiap kali satu sub-tugas atau perbaikan (Atomic Commit) selesai dan berhasil di-build. Gunakan pesan commit standar (feat, fix, refactor).
    - **Catatan Penting**: Root directory `Project Absenta` bukan merupakan repositori Git. Perintah Git hanya boleh dijalankan di dalam folder `absenta_backend` atau `absenta_frontend`. Selalu cek keberadaan folder `.git` sebelum eksekusi.

## 5. Aturan Log Ownership (Audit Log)
- **Hard Rule**: Sistem memiliki aturan ketat "1 Event = 1 Log Owner" di `src/constants/logOwnership.ts`.
- **Registrasi Wajib**: Setiap tipe event baru yang akan dicatat via `auditLogService.logEvent` **WAJIB** didaftarkan terlebih dahulu di `AUDIT_LOG_ALLOWED_EVENTS`.
- **Dampak Pelanggaran**: Pelanggaran aturan ini akan menyebabkan `Error: Log Ownership Violation` dan memicu rollback transaksi database. Ini adalah mekanisme keamanan untuk mencegah spam log atau log yang tidak terstruktur.

## 6. Kebiasaan yang Sering Terlupa (Reminders)
- **Environment**: Selalu cek `.env` di backend maupun frontend setelah melakukan perubahan URL/Port.
- **Restart**: Ingatkan USER untuk me-restart server (`npm run dev`) setiap kali ada perubahan pada file konfigurasi (`.env`, `vite.config.ts`, dll).
- **Database**: Pastikan skema Prisma sinkron dengan perubahan logika bisnis.
- **Arsitektur DRY & Reusabilitas**: Setiap kali modul baru dibuat di frontend maupun backend, wajib menerapkan **Prinsip DRY (Don't Repeat Yourself)** secara ketat. Manfaatkan, optimalkan, atau buat komponen UI/fungsi utility yang bersifat **reusable (dapat digunakan kembali)** guna menghindari duplikasi kode yang berlebihan dan mempermudah pemeliharaan jangka panjang.

## 7. Aturan Validasi Tipe Data Statis (TypeScript) (MANDATORY)
- **Auto-run TypeScript Check**: Antigravity **WAJIB** menjalankan pemeriksaan tipe data TypeScript secara statis menggunakan perintah `npx tsc --noEmit` pada folder yang terpengaruh (`absenta_frontend` dan/atau `absenta_backend`) setiap kali melakukan modifikasi pada berkas kode TypeScript (`.ts` atau `.tsx`).
- **Standard Keberhasilan**: Tugas atau perbaikan kode dilarang dilaporkan selesai atau dianggap sukses sebelum kedua folder tersebut lolos uji `npx tsc --noEmit` dengan status bersih 100% tanpa adanya kesalahan tipe data (*type errors*).

---
**Status: ATURAN AKTIF & PERMANEN.**
Antigravity akan membaca dan mematuhi dokumen ini di setiap turn.
