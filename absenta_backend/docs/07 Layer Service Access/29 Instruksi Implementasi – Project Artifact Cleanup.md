Instruksi Implementasi – Project Artifact Cleanup (Remove Obsolete Reference Files)

Tujuan instruksi ini adalah membersihkan file referensi, artefak audit, dan file sementara yang sudah tidak digunakan setelah proses refactor besar pada sistem RBAC Absenta.

Selama proses:

* Capability Naming Cleanup
* Action Catalog Cleanup
* Capability Domain Classification
* RBAC Baseline Reconstruction

banyak file audit dan artefak sementara dibuat untuk membantu analisis.

Sekarang setelah sistem stabil, file-file tersebut harus dibersihkan agar developer tidak bingung ketika melakukan:

```text
observability
debugging
troubleshooting
```

Project repository harus hanya berisi file yang benar-benar digunakan oleh sistem.

---

1. Prinsip Cleanup Repository

Repository Absenta harus mengikuti aturan:

1. Tidak ada file audit sementara di root project
2. Tidak ada file hasil generate yang sudah tidak digunakan
3. Tidak ada file referensi yang sudah digantikan oleh sistem canonical
4. Tidak ada artefak eksperimen atau file laporan sementara

File yang dipertahankan hanya:

```text
source code
runtime configuration
canonical documentation
essential generator scripts
```

---

2. Identifikasi Artefak yang Tidak Lagi Digunakan

TRAE (ANDA) diminta memeriksa file berikut yang biasanya merupakan artefak refactor.

Contoh file artefak:

```text
CAPABILITY_NAMING_CLEANUP_SUGGESTION.md
ACTION_CATALOG_CLEANUP_REPORT.md
RBAC_CAPABILITY_AUDIT_REPORT.md
RBAC_BASELINE_SUGGESTION.md
capability_alias_map.json
action_catalog_removed_capabilities.json
capability_domain_map.json
rbac_audit_result.json
```

File-file ini hanya digunakan pada tahap audit dan tidak lagi digunakan oleh sistem runtime.

---

3. File Yang Harus Dipertahankan

File berikut harus tetap dipertahankan karena digunakan oleh sistem:

```text
docs/action_catalog_canonical_futureproof.md
src/config/capabilities.ts
src/config/capability-domains.generated.ts
prisma/seed_policies.ts
scripts/audit/rbac-baseline-generator.ts
scripts/audit/capability-domain-classifier.ts
```

File ini merupakan bagian dari sistem canonical.

---

4. Audit Artefak Repository

TRAE (ANDA) diminta membuat script audit:

```text
scripts/maintenance/repository-artifact-audit.ts
```

Script ini harus:

1. memindai root project
2. memindai folder docs
3. memindai folder scripts
4. mendeteksi file artefak yang tidak digunakan oleh runtime

Kategori artefak:

```text
audit-report
temporary-mapping
legacy-reference
experimental-script
```

---

5. Generate Artifact Cleanup Report

Script harus menghasilkan laporan:

```text
REPOSITORY_ARTIFACT_CLEANUP_REPORT.md
```

Isi laporan:

Total file project

File yang digunakan runtime

File artefak yang direkomendasikan untuk dihapus

Contoh:

```text
File Artefak:
- CAPABILITY_NAMING_CLEANUP_SUGGESTION.md
- RBAC_CAPABILITY_AUDIT_REPORT.md
- capability_alias_map.json
- action_catalog_removed_capabilities.json
```

File ini harus diklasifikasikan sebagai:

```text
SAFE_TO_DELETE
REVIEW_REQUIRED
```

---

6. Penghapusan Artefak

TRAE (ANDA) harus menghapus file yang dikategorikan:

```text
SAFE_TO_DELETE
```

Penghapusan harus mencakup:

* file audit sementara
* file laporan eksperimen
* file mapping sementara

---

7. Pembersihan Folder Scripts

Periksa folder:

```text
scripts/audit
```

Script yang hanya digunakan untuk migrasi sementara harus dipindahkan atau dihapus.

Script yang boleh dipertahankan:

```text
rbac-baseline-generator.ts
capability-domain-classifier.ts
```

Script lain yang tidak lagi digunakan harus dihapus atau dipindahkan ke:

```text
scripts/archive
```

---

8. Validasi Repository

Setelah pembersihan selesai lakukan validasi:

```text
npm run build
npm run test
```

Pastikan tidak ada dependency terhadap file yang telah dihapus.

---

9. Tujuan Akhir Cleanup

Setelah cleanup repository selesai:

1. Repository hanya berisi file yang relevan
2. Tidak ada artefak audit yang membingungkan developer
3. Struktur repository menjadi lebih bersih
4. Developer dapat memahami sistem dengan lebih cepat

---

10. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. REPOSITORY_ARTIFACT_CLEANUP_REPORT.md
2. Daftar file yang dihapus
3. Daftar file yang dipindahkan ke scripts/archive
4. Konfirmasi build dan test tetap berhasil

Repository Absenta harus menjadi **bersih, minimal, dan mudah dipahami oleh developer baru**.
