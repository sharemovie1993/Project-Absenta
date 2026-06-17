Instruksi Implementasi – Blueprint Refactor Domain Hardening

Buat dokumen blueprint refactor berdasarkan hasil audit DOMAIN_HARDENING_AUDIT.md.

Dokumen blueprint harus berada pada:

docs/architecture/DOMAIN_REFACTOR_BLUEPRINT.md

Dokumen harus menjelaskan:

1. Scope module yang akan direfactor

2. Prinsip arsitektur yang harus diikuti

3. Target struktur module

4. Circular dependency refactor plan

5. Service decomposition plan

6. Controller boundary cleanup plan

7. Event architecture standard

8. Notification domain split plan

9. Urutan implementasi refactor

10. Definition of Done

Blueprint ini akan menjadi referensi utama sebelum melakukan refactor code.

Pastikan blueprint menjelaskan dependency graph sebelum dan sesudah refactor serta event flow antar domain.