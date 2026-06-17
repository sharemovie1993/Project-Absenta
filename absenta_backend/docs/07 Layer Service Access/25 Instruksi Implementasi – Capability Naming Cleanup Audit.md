Instruksi Implementasi – Capability Naming Cleanup Audit

Sebelum melakukan RBAC Baseline Reconstruction, sistem Absenta harus memastikan bahwa seluruh capability mengikuti naming convention yang canonical.

Saat ini ditemukan beberapa pola capability yang tidak konsisten seperti:

```
dashboard.view.overview
dashboard.view_overview
```

atau

```
attendance.create_session
attendance.sessions.create
```

Tujuan instruksi ini adalah:

1. mendeteksi capability dengan nama tidak konsisten
2. mendeteksi alias capability
3. mendeteksi snake_case capability
4. mendeteksi capability dengan semantik duplikat

Semua capability harus mengikuti format canonical:

```
<domain>.<resource>.<action>
<domain>.<resource>.<action>.<scope>
```

Contoh canonical:

```
dashboard.view.overview
academic.students.view.list
attendance.sessions.create
billing.subscriptions.view.list
```

---

1. Buat Script Audit

TRAE (ANDA) diminta membuat script:

```
scripts/audit/capability-naming-audit.ts
```

Script harus membaca:

```
action_catalog_canonical_futureproof.md
capability_domain_map.json
```

serta seluruh capability yang ditemukan di:

```
endpoint requireCapability()
menu.required_capability
ROLE_CAPABILITIES
STRUKTUR_CAPABILITIES
```

---

2. Deteksi Capability Dengan Underscore

Capability dengan pola:

```
xxx_yyy
```

harus ditandai sebagai:

```
INVALID_NAMING_UNDERSCORE
```

Contoh:

```
dashboard.view_overview
view_siswa
manage_kbm
```

---

3. Deteksi Alias Capability

Script harus mendeteksi capability dengan semantic sama tetapi nama berbeda.

Contoh:

```
attendance.create_session
attendance.sessions.create
```

atau

```
dashboard.view.overview
dashboard.view_overview
```

Kategori:

```
CAPABILITY_ALIAS
```

---

4. Deteksi Verb-first Capability

Capability yang diawali dengan kata kerja harus ditandai.

Contoh:

```
view_siswa
manage_kelas
create_student
```

Kategori:

```
VERB_FIRST_PATTERN
```

---

5. Deteksi Resource Duplication

Capability seperti:

```
students.view
students.view.list
students.view.detail
```

harus diperiksa apakah konsisten.

---

6. Generate Cleanup Suggestion

Script harus menghasilkan file:

```
CAPABILITY_NAMING_CLEANUP_SUGGESTION.md
```

Isi laporan:

Capability lama → Capability canonical

Contoh:

```
dashboard.view_overview
→ dashboard.view.overview

attendance.create_session
→ attendance.sessions.create

view_siswa
→ academic.students.view
```

---

7. Generate Migration Mapping

Script juga harus menghasilkan file:

```
capability_alias_map.json
```

Contoh:

```
{
  "dashboard.view_overview": "dashboard.view.overview",
  "attendance.create_session": "attendance.sessions.create",
  "view_siswa": "academic.students.view"
}
```

Mapping ini akan digunakan untuk migration.

---

8. Tujuan Cleanup

Setelah cleanup selesai:

1 semua capability mengikuti canonical naming
2 tidak ada capability alias
3 tidak ada underscore capability
4 tidak ada verb-first capability
5 capability catalog menjadi konsisten

Ini penting sebelum melakukan RBAC baseline reconstruction.

---

9. Output Yang Harus Diberikan TRAE

TRAE (ANDA) harus menghasilkan:

1 script capability-naming-audit.ts
2 CAPABILITY_NAMING_CLEANUP_SUGGESTION.md
3 capability_alias_map.json
4 ringkasan capability yang harus di-refactor
