# 🏫 PROJECT ABSENTA — PLATFORM MANAGEMENT SEKOLAH MULTI-TENANT & KURIKULUM MERDEKA

> Platform Sistem Informasi Manajemen Sekolah, Presensi Digital Multi-Tenant, & Automasi Perangkat Ajar Kurikulum Merdeka berbasis AI & Cloud-Native PDF Stream Engine.

---

## 📌 OVERVIEW PROYEK

Project Absenta adalah platform enterprise pengelolaan operasional sekolah multi-tenant yang dirancang khusus untuk memenuhi standar Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek) Indonesia, khususnya **Kurikulum Merdeka (Permendikbudristek No. 12 Tahun 2024)**.

### 🌟 Fitur Utama Platform
1. **Presensi Digital Multi-Tenant**: Pengelolaan kehadiran siswa & guru real-time berdedikasi per tenant sekolah.
2. **Repositori & Generator Perangkat Ajar AI**: Pembentukan otomatis Modul Ajar, ATP, PROTA, PROMES, KKTP, Modul Projek P5, dan RPP 5 Halaman A4 Utuh.
3. **Pure Vector PDF Stream Engine**: Generasi berkas PDF resmi ber-Kop Surat terpusat instansi (`PrintHeader`) secara *Cloud-Native / On-the-Fly* tanpa sampah berkas fisik (0 Bytes Disk Storage Footprint).
4. **Export Multi-Format**: Dukungan cetak/buka ke **Built-in PDF Viewer (1-Klik)** dan **Ekspor Microsoft Word (.doc)**.
5. **Hardening & Security Standards**: Dilindungi oleh Zod Schema Validation Guard, RBAC/ABAC Permissions, & Audit Kelayakan Komponen (< 800 baris per file).

---

## 🏗️ ARSITEKTUR REPOSITORI

```
Project Absenta/
├── absenta_backend/          # Backend Fastify + Prisma ORM + Puppeteer Engine
│   ├── src/
│   │   ├── modules/
│   │   │   ├── kurikulum/    # Modul Manajemen Kurikulum & Perangkat Ajar
│   │   │   ├── reporting/    # PDF Generator Engine & Services
│   │   │   └── ...
│   └── prisma/               # Schema Database PostgreSQL Multi-Tenant
│
├── absenta_frontend/         # Frontend React + Vite + TailwindCSS + Zod Guards
│   ├── src/
│   │   ├── pages/kurikulum/  # PerangkatAjarPage.tsx (< 600 lines)
│   │   ├── components/
│   │   │   ├── academic/     # PrintHeader.tsx (Kop Surat Resmi Instansi)
│   │   │   └── kurikulum/perangkat-ajar/  # Subkomponen & Zod Schemas
│   └── ...
│
├── README.md                 # Dokumentasi Tingkat Proyek (Root)
└── ...
```

---

## ⚡ TEKNOLOGI UTAMA (TECH STACK)

- **Backend**: Node.js, Fastify, TypeScript, Prisma ORM, PostgreSQL, Puppeteer Headless.
- **Frontend**: React 18, Vite, TailwindCSS, TanStack Query, Lucide Icons, Zod Validation.
- **Pencetakan / Engine**: Cloud-Native Vector HTML to PDF Stream via Puppeteer.

---

## 🚀 PANDUAN CARA MENJALANKAN (QUICK START)

### 1. Jalankan Backend Server:
```bash
cd absenta_backend
npm run dev
```

### 2. Jalankan Frontend Application:
```bash
cd absenta_frontend
npm run dev
```

### 3. Akses Platform:
Buka browser di `https://localhost:5173`.

---

## 📜 LISENSI & HAK CIPTA

Hak Cipta © 2026 Tim Pengembang Absenta. Dilindungi Undang-Undang.
