Instruksi – Organizational Structure Authorization Audit

Platform Absenta menggunakan dua lapisan otorisasi:

1. RBAC (Role → Capability)
2. Organizational Scope (Struktur Organisasi Sekolah)

Struktur organisasi digunakan untuk menentukan data scope dan capability tambahan berdasarkan jabatan di sekolah.

Contoh:

* WALI_KELAS
* KEPALA_SEKOLAH
* WAKIL_KURIKULUM
* PETUGAS_KELAS

Ketika seorang guru ditempatkan pada jabatan tertentu, sistem diharapkan memberikan capability tambahan atau data scope sesuai jabatan tersebut.

Audit ini bertujuan memahami bagaimana struktur organisasi saat ini diimplementasikan dalam sistem dan bagaimana hubungannya dengan authorization.

Tahap ini hanya melakukan audit dan dokumentasi.

Tidak boleh mengubah kode.

---

# Tujuan Audit

Audit ini bertujuan untuk:

* mengidentifikasi model data struktur organisasi
* memahami bagaimana jabatan organisasi dihubungkan dengan user/guru/siswa
* memeriksa apakah jabatan organisasi mempengaruhi capability atau hanya data scope
* memetakan hubungan antara struktur organisasi dan authorization system

---

# Task 1 – Locate Organizational Structure Model

Identifikasi tabel atau model yang menyimpan struktur organisasi sekolah.

Cari kemungkinan tabel seperti:

struktur_organisasi
organizational_structure
school_positions
teacher_positions

Identifikasi kolom utama:

* position_id
* position_name
* user_id / teacher_id
* unit / kelas / divisi
* periode

Catat struktur tabel tersebut.

---

# Task 2 – Identify Organizational Role Assignment

Identifikasi bagaimana guru atau siswa ditempatkan pada jabatan organisasi.

Periksa apakah assignment dilakukan melalui:

* foreign key ke user
* foreign key ke teacher
* relasi many-to-many

Contoh model yang mungkin:

PositionAssignment

position_id
user_id
unit_id
periode

Catat seluruh relasi.

---

# Task 3 – Capability Integration Check

Periksa apakah jabatan organisasi memberikan capability tambahan.

Cari apakah terdapat:

* mapping jabatan → capability
* mapping jabatan → permission
* mapping jabatan → policy

Jika ada, catat implementasinya.

Jika tidak ada, tandai bahwa jabatan hanya digunakan untuk data scope.

---

# Task 4 – Data Scope Integration

Periksa apakah jabatan organisasi digunakan untuk menentukan data scope.

Contoh:

WALI_KELAS → hanya melihat siswa kelas binaan
PETUGAS_KELAS → hanya mengelola absensi kelas tertentu
KEPALA_SEKOLAH → melihat seluruh data sekolah

Periksa implementasi pada:

repositories
services
query builders

Cari fungsi seperti:

determineDataScope
getUserScope
applyScopeFilter

---

# Task 5 – Authorization Pipeline Integration

Periksa apakah struktur organisasi digunakan dalam pipeline authorization.

Pipeline saat ini:

Auth
Tenant
Subscription
Service Feature
Capability
Controller

Audit apakah ada layer tambahan seperti:

OrganizationalScopeGuard
DataScopeResolver

Jika tidak ada, identifikasi di mana scope diterapkan.

---

# Task 6 – UI Integration

Periksa bagaimana struktur organisasi digunakan di UI layer.

Contoh:

* menu khusus wali kelas
* dashboard kepala sekolah
* fitur khusus petugas

Catat apakah UI menggunakan capability atau hanya membaca jabatan organisasi.

---

# Task 7 – Gap Analysis

Identifikasi potensi gap:

* jabatan organisasi tidak terhubung dengan authorization
* jabatan organisasi hanya mempengaruhi UI tetapi tidak security
* data scope tidak konsisten antar module

---

# Output

Simpan laporan audit pada:

docs/architecture/ORGANIZATIONAL_SCOPE_AUDIT.md

Dokumen harus berisi:

1. model data struktur organisasi
2. assignment jabatan organisasi
3. integrasi dengan capability system
4. integrasi dengan data scope
5. integrasi dengan UI
6. gap analysis

Dokumen ini akan menjadi dasar untuk merancang Organizational Access Engine pada platform Absenta.
