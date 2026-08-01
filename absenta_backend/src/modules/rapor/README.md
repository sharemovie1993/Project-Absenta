# Modul Ekosistem Penilaian, Leger, Rapor Kurikulum Merdeka & e-Rapor (`/rapor`)

Modul ini mengelola seluruh ekosistem penilaian akademik sekolah secara terpadu dari tingkat harian hingga dokumen resmi kelulusan siswa.

---

## 🏛️ Flow Aliran Data & Kalkulasi Formula

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. INPUT GURU (Kelas-Sentrik + Copy-Paste Excel)                            │
│    - Sumatif Harian (S1, S2, S3) + Nilai Sumatif Akhir (PSAT/PAS)          │
│    - Capaian Pembelajaran (CP) Narasi Deskripsi                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. LEGER AKADEMIK KELAS (Single Source of Truth Data Master)               │
│    Formula: Nilai Rapor = (Rata-Rata(S1,S2,S3) + Nilai Akhir) / 2          │
│    Tersimpan secara permanen & terindeks per Tenant / TP / Semester / Kelas │
└───────────────────┬──────────────────┬──────────────────┬───────────────────┘
                    │                  │                  │
      ┌─────────────┴──────┐   ┌───────┴──────────┐   ┌───┴────────────────┐
      ▼                    ▼   ▼                  ▼   ▼                    ▼
┌───────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐
│  CETAK    │    │  EXPORT E-RAPOR │    │ TRANSKRIP NILAI  │    │  NILAI SKL   │
│  RAPOR    │    │  (Format Dinas  │    │   AKADEMIK       │    │ (Kelulusan   │
│ SEMESTER  │    │  Kemendikbud)   │    │  (Sem 1 s/d 6)   │    │ Siswa Akhir) │
└───────────┘    └─────────────────┘    └──────────────────┘    └──────────────┘
```

---

## 🔑 Fitur Utama
1. **Input Nilai Sumatif Kurikulum Merdeka**: Input $S_1, S_2, S_3$ + Sumatif Akhir dengan kalkulasi live formula:
   $$\text{Nilai Rapor Final} = \frac{\text{Rata-Rata}(S_1, S_2, S_3) + \text{Nilai Sumatif Akhir}}{2}$$
2. **Copy-Paste Excel / Google Sheets**: Guru dapat melakukan paste `Ctrl+V` atau modal paste TSV multi-kolom (`NIS | S1 | S2 | S3 | Nilai Akhir | CP Narasi`) yang langsung me-match data siswa secara otomatis.
3. **Export Template e-Rapor Kemendikbud**: 1-click download file Excel `.xlsx` dengan format resmi e-Rapor Dinas (`F_Nilai_Akademik` & `F_Capaian_Kompetensi`).
4. **Leger Kelas & Ranking**: Single Source of Truth nilai sekelas dengan Redis Caching (TTL 5m, <0.1ms HIT speedup) & Auto-invalidation signal `invalidateRaporCache`.
5. **Transkrip & SKL**: Penyiapan data transkrip nilai akumulatif 6 semester dan penetapan kelulusan Surat Keterangan Lulus (SKL).

---

## ⚡ Hasil Benchmark & Build Verification
- **Backend Build**: `0 errors` (TypeScript compilation verified)
- **Frontend Build**: `0 errors` (Vite production bundle successfully generated)
- **Database Indexing**: Prisma Schema in sync with PostgreSQL database.
