## Authorization – Post Refactor Verification & Cleanup

Tanggal: 2026-03-16

Dokumen ini mencatat verifikasi dan cleanup setelah implementasi Organizational Authorization Engine.

---

## 1) Legacy Model Cleanup

Target legacy model yang tidak boleh dipakai oleh logic runtime:
- `StrukturOrganisasi`
- `GuruStrukturOrganisasi`
- `SiswaStrukturOrganisasi`
- `StrukturPermission`

Hasil:
- Tidak ada pemanggilan runtime `prisma.(strukturOrganisasi|guruStrukturOrganisasi|siswaStrukturOrganisasi|strukturPermission)` pada folder `src/` (seluruh akses diganti ke `OrganizationalPosition/Assignment/Capability`).

---

## 2) Repository Scope Enforcement

Helper baru:
- [apply-organizational-scope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/repository/apply-organizational-scope.ts)

Rule:
- `tenantWide === true` → tidak ada filter tambahan.
- `kelasIds` ada → filter `kelas_id IN kelasIds`.
- `unitIds` ada → filter `unit_id IN unitIds`.

---

## 3) Update Repository Queries (Minimum Domain Coverage)

### academic.students

- DataScope sekarang membawa organizational scope:
  - [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts)
- Query/command siswa menerapkan pembatasan `kelas_id` ketika user tidak self-scoped:
  - [get-all-siswa.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/queries/get-all-siswa.query.ts)
  - [get-siswa-by-id.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/queries/get-siswa-by-id.query.ts)
  - [bulk-update-status.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/commands/bulk-update-status.command.ts)
  - [send-parent-access.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/commands/send-parent-access.command.ts)

### attendance.sessions

- Guard sesi absensi memakai `request.organizationalScope` untuk menentukan `kelas_ids` dan `tenant_wide`, tanpa query struktur legacy:
  - [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts)
- Endpoint check petugas absensi memakai organizational assignment (scope_type=attendance):
  - [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts)

### cooperative.members

- Route menambahkan `determineDataScope()` dan MemberService membatasi member SISWA berdasarkan `kelasIds` (jika bukan tenant-wide):
  - [member.fastify.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/cooperative/member/member.fastify.ts)
  - [member.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/cooperative/member/member.service.ts)

Catatan:
- Domain cooperative lain masih tenant-isolated; scope enforcement lanjutan perlu audit per-entity karena schema koperasi tidak selalu punya `kelas_id` / `unit_id` langsung.

---

## 4) Capability Group Definition

File baru:
- [capability-groups.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/capability-groups.ts)

Tujuan:
- menyediakan group capability untuk assignment ke organizational position agar tidak terjadi “capability explosion”.

---

## 5) Organizational Context Cache (Redis TTL 300s)

Implementasi:
- Cache wrapper: [organizational-context-cache.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-context-cache.ts)
- Engine pakai cache di `resolveOrganizationalContext(userId)`:
  - [organizational-authorization.engine.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-authorization.engine.ts)

TTL:
- 300 detik (`org_context:user:{userId}`)

---

## 6) Cache Invalidation

Invalidasi saat perubahan data org dilakukan oleh service:
- [organizational.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/organizational/services/organizational.service.ts)

Trigger:
- assignment create/update/delete → invalidate user target
- position/capabilities update/delete → invalidate semua user aktif yang punya assignment ke position tersebut

---

## 7) Authorization Performance Test

Unit test untuk memastikan dedup query organizational assignment pada concurrency:
- [organizational-authorization.engine.cache.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/__tests__/organizational-authorization.engine.cache.test.ts)

Skenario:
- 100 concurrent `resolveOrganizationalContext(userId)` → hanya 1 query DB (cache lock).

---

## 8) Security Verification (Target Scenarios)

Coverage mitigasi:
- Guru biasa tidak bisa melihat siswa kelas lain: dibatasi oleh `kelasIds` pada query siswa (atau self-scope bila SISWA).
- Wali kelas melihat siswa kelas binaan: `kelasIds` di-supply dari org assignments + enforcement query.
- Petugas kelas hanya mengelola absensi kelasnya: guard sesi absensi menggunakan `organizationalScope.kelas_ids`.
- Admin tenant tenant-wide: `tenantWide` dari org assignment tanpa kelas/unit atau role ADMIN baseline.

---

## 9) Final Authorization Pipeline Check

Pipeline protected API (terverifikasi di router):
- Auth
- TenantResolver + SubscriptionGuard
- ServiceFeatureGuard
- CapabilityGuard
- OrganizationalScopeMiddleware
- Controller

Referensi:
- [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L174-L205)

