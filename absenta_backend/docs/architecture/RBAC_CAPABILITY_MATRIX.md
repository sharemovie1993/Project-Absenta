## RBAC Capability Matrix (Seed Policy Audit)

Tanggal: 2026-03-16 | **Terakhir diperbarui: 2026-07-20**

Audit ini memetakan capability default role sistem berdasarkan seed policies (tanpa mengubah kode).

> **Update 2026-07**: Capability `attendance.schedules.*` telah dipecah menjadi dua domain baru:
> - `academic.schedules.*` → Jadwal KBM (Modul Kurikulum, gratis)
> - `kesiswaan.schedules.*` → Jadwal Kegiatan Eskul (Modul Kesiswaan, gratis)
> Catalog sekarang memiliki **442 permissions** (sebelumnya 433).

### Seed Policy Source
- Entry seed: `prisma/seed.ts` (memanggil `seedPolicies()`)
- Policy seeding: `prisma/seed_policies.ts`
- Action Catalog canonical: `docs/action_catalog_canonical_futureproof.md`

### Default Roles (System)
- SUPERADMIN: full access (seluruh Permission di database hasil seed Action Catalog — 442 permissions)
- ADMIN: baseline diperluas dengan `academic.schedules.*` (5 cap) dan `kesiswaan.schedules.*` (4 cap)
- GURU: `academic.schedules.view.list` dan `kesiswaan.schedules.view.list` ditambahkan ke baseline
- SISWA: `academic.schedules.view.list` dan `kesiswaan.schedules.view.list` ditambahkan ke baseline

---

## Task 1 - Identify Seed Policy Source

- Role default dibuat di `prisma/seed.ts` (minimal: SUPERADMIN, ADMIN, GURU, SISWA).
- Assignment capability default dilakukan di `prisma/seed_policies.ts` melalui konstanta `ROLE_CAPABILITIES` dan baseline `ADMIN_CAPABILITIES`.
- Seeding Permission selalu mengacu pada Action Catalog canonical (seed akan upsert semua action id ke tabel `Permission`).

---

## Task 2 - Capability per Role (berdasarkan seed)

### SUPERADMIN

- Full access: seluruh capability yang terdaftar di Action Catalog (seed `seed_policies.ts` mengisi SUPERADMIN baseline = semua Permission di DB).

### ADMIN
**academic**
- academic.activities.create
- academic.activities.delete
- academic.activities.types.manage
- academic.activities.types.view
- academic.activities.update
- academic.activities.view.list
- academic.backups.create
- academic.backups.restore
- academic.backups.view.list
- academic.homeroom.manage
- academic.promotions.manage
- academic.semesters.create
- academic.semesters.set_active
- academic.semesters.update
- academic.semesters.view.list
- academic.structures.create
- academic.structures.delete
- academic.structures.update
- academic.structures.view.detail
- academic.structures.view.list
- academic.student_card.update.config
- academic.student_card.view.config
- academic.students.create
- academic.students.delete
- academic.students.send.access_token
- academic.students.update
- academic.students.view.detail
- academic.students.view.history
- academic.students.view.list
- academic.subjects.create
- academic.subjects.delete
- academic.subjects.update
- academic.subjects.view.detail
- academic.subjects.view.list
- academic.teachers.create
- academic.teachers.delete
- academic.teachers.update
- academic.teachers.view.detail
- academic.teachers.view.list
- academic.teaching.manage
- academic.teaching.rekap
- academic.teaching.view
- academic.transitions.manage
- academic.years.create
- academic.years.set_active
- academic.years.update
- academic.years.view.list
**attendance**
- attendance.gate.bypass
- attendance.gate.face.enroll
- attendance.gate.face.verify
- attendance.gate.tap.entry
- attendance.gate.tap.exit
- attendance.gate.view.face_templates
- attendance.gate.view.logs
- attendance.manage_face_templates
- attendance.officers.manage
- attendance.officers.view
- attendance.recap.view.daily
- attendance.recap.view.monthly
- attendance.reports.view
- attendance.schedules.create
- attendance.schedules.delete
- attendance.schedules.update
- attendance.schedules.view.list
- attendance.sessions.close
- attendance.sessions.create
- attendance.sessions.delete
- attendance.sessions.update.attendance
- attendance.sessions.view.detail
- attendance.sessions.view.list
**billing**
- billing.invoices.cancel
- billing.invoices.generate
- billing.invoices.pay
- billing.invoices.view.detail
- billing.invoices.view.list
- billing.my_subscription.view
- billing.subscriptions.cancel
- billing.subscriptions.create
- billing.subscriptions.update
- billing.subscriptions.view.active
**cooperative**
- cooperative.dashboard.view.overview
- cooperative.loans.apply
- cooperative.loans.approve
- cooperative.loans.reject
- cooperative.loans.repay
- cooperative.loans.types.manage
- cooperative.loans.types.view
- cooperative.loans.view.detail
- cooperative.loans.view.list
- cooperative.members.activate
- cooperative.members.create
- cooperative.members.deactivate
- cooperative.members.delete
- cooperative.members.update
- cooperative.members.view.detail
- cooperative.members.view.list
- cooperative.ppob.transact
- cooperative.ppob.view.products
- cooperative.reports.view.daily
- cooperative.reports.view.monthly
- cooperative.savings.deposit
- cooperative.savings.types.manage
- cooperative.savings.types.view
- cooperative.savings.view.detail
- cooperative.savings.view.history
- cooperative.savings.view.list
- cooperative.savings.withdraw
- cooperative.store.categories.manage
- cooperative.store.orders.manage
- cooperative.store.orders.view.list
- cooperative.store.products.create
- cooperative.store.products.delete
- cooperative.store.products.update
- cooperative.store.products.view.detail
- cooperative.store.products.view.list
- cooperative.store.transactions.view
- cooperative.vouchers.manage
- cooperative.vouchers.view.list
**core**
- core.sekolah.update.profile
- core.sekolah.view.profile
- core.users.complete_onboarding
- core.users.create
- core.users.delete
- core.users.reset_password
- core.users.update
- core.users.update.email
- core.users.view.detail
- core.users.view.list
**dashboard**
- dashboard.view.overview
- dashboard.view.student_stats
- dashboard.view.teacher_attendance
- dashboard.view.violation_stats
**documents**
- documents.delete
- documents.upload
- documents.view.detail
- documents.view.list
**notify**
- notify.update.preferences
- notify.view.logs
- notify.view.preferences

### GURU
**academic**
- academic.activities.view.list
- academic.homeroom.manage
- academic.structures.view.list
- academic.student_card.view.config
- academic.students.view.list
- academic.subjects.view.list
- academic.teaching.view
**attendance**
- attendance.gate.view.face_templates
- attendance.gate.view.logs
- attendance.officers.view
- attendance.recap.view.daily
- attendance.recap.view.monthly
- attendance.reports.view
- attendance.schedules.view.list
- attendance.sessions.view.list
**billing**
- billing.plans.view.list
- billing.subscriptions.view.active
**core**
- core.auth.logout
- core.system.config.view
**dashboard**
- dashboard.view.overview
- dashboard.view.teacher_attendance
**notify**
- notify.update.preferences
- notify.view.preferences

### SISWA
**academic**
- academic.students.view.history
- academic.years.view.list
**attendance**
- attendance.gate.view.logs
- attendance.recap.view.daily
- attendance.recap.view.monthly
- attendance.reports.view
**billing**
- billing.subscriptions.view.active
**core**
- core.auth.logout
**dashboard**
- dashboard.view.overview
**notify**
- notify.update.preferences
- notify.view.preferences

---

## Task 3 - Compare With Action Catalog

- Total baseline capability (ADMIN+GURU+SISWA union): 142
- VALID CAPABILITY (ada di catalog): 142
- MISSING FROM CATALOG: 0

### Unused Capability (seed baseline non-superadmin)

- Catatan: SUPERADMIN full access, sehingga seluruh capability di catalog tetap seeded untuk SUPERADMIN.
- Daftar unused di sini didefinisikan sebagai capability di catalog yang tidak termasuk baseline default ADMIN/GURU/SISWA.
- Unused by default (ADMIN/GURU/SISWA): 166

---

## Task 4 - Role Capability Matrix (baseline ADMIN/GURU/SISWA)

Format: capability | SUPERADMIN | ADMIN | GURU | SISWA

### Domain: academic (47)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| academic.activities.create | x | x |  |  |
| academic.activities.delete | x | x |  |  |
| academic.activities.types.manage | x | x |  |  |
| academic.activities.types.view | x | x |  |  |
| academic.activities.update | x | x |  |  |
| academic.activities.view.list | x | x | x |  |
| academic.backups.create | x | x |  |  |
| academic.backups.restore | x | x |  |  |
| academic.backups.view.list | x | x |  |  |
| academic.homeroom.manage | x | x | x |  |
| academic.promotions.manage | x | x |  |  |
| academic.semesters.create | x | x |  |  |
| academic.semesters.set_active | x | x |  |  |
| academic.semesters.update | x | x |  |  |
| academic.semesters.view.list | x | x |  |  |
| academic.structures.create | x | x |  |  |
| academic.structures.delete | x | x |  |  |
| academic.structures.update | x | x |  |  |
| academic.structures.view.detail | x | x |  |  |
| academic.structures.view.list | x | x | x |  |
| academic.student_card.update.config | x | x |  |  |
| academic.student_card.view.config | x | x | x |  |
| academic.students.create | x | x |  |  |
| academic.students.delete | x | x |  |  |
| academic.students.send.access_token | x | x |  |  |
| academic.students.update | x | x |  |  |
| academic.students.view.detail | x | x |  |  |
| academic.students.view.history | x | x |  | x |
| academic.students.view.list | x | x | x |  |
| academic.subjects.create | x | x |  |  |
| academic.subjects.delete | x | x |  |  |
| academic.subjects.update | x | x |  |  |
| academic.subjects.view.detail | x | x |  |  |
| academic.subjects.view.list | x | x | x |  |
| academic.teachers.create | x | x |  |  |
| academic.teachers.delete | x | x |  |  |
| academic.teachers.update | x | x |  |  |
| academic.teachers.view.detail | x | x |  |  |
| academic.teachers.view.list | x | x |  |  |
| academic.teaching.manage | x | x |  |  |
| academic.teaching.rekap | x | x |  |  |
| academic.teaching.view | x | x | x |  |
| academic.transitions.manage | x | x |  |  |
| academic.years.create | x | x |  |  |
| academic.years.set_active | x | x |  |  |
| academic.years.update | x | x |  |  |
| academic.years.view.list | x | x |  | x |

### Domain: attendance (23)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| attendance.gate.bypass | x | x |  |  |
| attendance.gate.face.enroll | x | x |  |  |
| attendance.gate.face.verify | x | x |  |  |
| attendance.gate.tap.entry | x | x |  |  |
| attendance.gate.tap.exit | x | x |  |  |
| attendance.gate.view.face_templates | x | x | x |  |
| attendance.gate.view.logs | x | x | x | x |
| attendance.manage_face_templates | x | x |  |  |
| attendance.officers.manage | x | x |  |  |
| attendance.officers.view | x | x | x |  |
| attendance.recap.view.daily | x | x | x | x |
| attendance.recap.view.monthly | x | x | x | x |
| attendance.reports.view | x | x | x | x |
| attendance.schedules.create | x | x |  |  |
| attendance.schedules.delete | x | x |  |  |
| attendance.schedules.update | x | x |  |  |
| attendance.schedules.view.list | x | x | x |  |
| attendance.sessions.close | x | x |  |  |
| attendance.sessions.create | x | x |  |  |
| attendance.sessions.delete | x | x |  |  |
| attendance.sessions.update.attendance | x | x |  |  |
| attendance.sessions.view.detail | x | x |  |  |
| attendance.sessions.view.list | x | x | x |  |

### Domain: billing (11)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| billing.invoices.cancel | x | x |  |  |
| billing.invoices.generate | x | x |  |  |
| billing.invoices.pay | x | x |  |  |
| billing.invoices.view.detail | x | x |  |  |
| billing.invoices.view.list | x | x |  |  |
| billing.my_subscription.view | x | x |  |  |
| billing.plans.view.list | x |  | x |  |
| billing.subscriptions.cancel | x | x |  |  |
| billing.subscriptions.create | x | x |  |  |
| billing.subscriptions.update | x | x |  |  |
| billing.subscriptions.view.active | x | x | x | x |

### Domain: cooperative (38)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| cooperative.dashboard.view.overview | x | x |  |  |
| cooperative.loans.apply | x | x |  |  |
| cooperative.loans.approve | x | x |  |  |
| cooperative.loans.reject | x | x |  |  |
| cooperative.loans.repay | x | x |  |  |
| cooperative.loans.types.manage | x | x |  |  |
| cooperative.loans.types.view | x | x |  |  |
| cooperative.loans.view.detail | x | x |  |  |
| cooperative.loans.view.list | x | x |  |  |
| cooperative.members.activate | x | x |  |  |
| cooperative.members.create | x | x |  |  |
| cooperative.members.deactivate | x | x |  |  |
| cooperative.members.delete | x | x |  |  |
| cooperative.members.update | x | x |  |  |
| cooperative.members.view.detail | x | x |  |  |
| cooperative.members.view.list | x | x |  |  |
| cooperative.ppob.transact | x | x |  |  |
| cooperative.ppob.view.products | x | x |  |  |
| cooperative.reports.view.daily | x | x |  |  |
| cooperative.reports.view.monthly | x | x |  |  |
| cooperative.savings.deposit | x | x |  |  |
| cooperative.savings.types.manage | x | x |  |  |
| cooperative.savings.types.view | x | x |  |  |
| cooperative.savings.view.detail | x | x |  |  |
| cooperative.savings.view.history | x | x |  |  |
| cooperative.savings.view.list | x | x |  |  |
| cooperative.savings.withdraw | x | x |  |  |
| cooperative.store.categories.manage | x | x |  |  |
| cooperative.store.orders.manage | x | x |  |  |
| cooperative.store.orders.view.list | x | x |  |  |
| cooperative.store.products.create | x | x |  |  |
| cooperative.store.products.delete | x | x |  |  |
| cooperative.store.products.update | x | x |  |  |
| cooperative.store.products.view.detail | x | x |  |  |
| cooperative.store.products.view.list | x | x |  |  |
| cooperative.store.transactions.view | x | x |  |  |
| cooperative.vouchers.manage | x | x |  |  |
| cooperative.vouchers.view.list | x | x |  |  |

### Domain: core (12)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| core.auth.logout | x |  | x | x |
| core.sekolah.update.profile | x | x |  |  |
| core.sekolah.view.profile | x | x |  |  |
| core.system.config.view | x |  | x |  |
| core.users.complete_onboarding | x | x |  |  |
| core.users.create | x | x |  |  |
| core.users.delete | x | x |  |  |
| core.users.reset_password | x | x |  |  |
| core.users.update | x | x |  |  |
| core.users.update.email | x | x |  |  |
| core.users.view.detail | x | x |  |  |
| core.users.view.list | x | x |  |  |

### Domain: dashboard (4)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| dashboard.view.overview | x | x | x | x |
| dashboard.view.student_stats | x | x |  |  |
| dashboard.view.teacher_attendance | x | x | x |  |
| dashboard.view.violation_stats | x | x |  |  |

### Domain: documents (4)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| documents.delete | x | x |  |  |
| documents.upload | x | x |  |  |
| documents.view.detail | x | x |  |  |
| documents.view.list | x | x |  |  |

### Domain: notify (3)
| Capability | SUPERADMIN | ADMIN | GURU | SISWA |
|---|:---:|:---:|:---:|:---:|
| notify.update.preferences | x | x | x | x |
| notify.view.logs | x | x |  |  |
| notify.view.preferences | x | x | x | x |

---

## Task 5 - Domain Classification (baseline counts)

| Domain | ADMIN | GURU | SISWA |
|---|---:|---:|---:|
| academic | 47 | 7 | 2 |
| attendance | 23 | 8 | 4 |
| billing | 10 | 2 | 1 |
| cooperative | 38 | 0 | 0 |
| core | 10 | 2 | 1 |
| dashboard | 4 | 2 | 1 |
| documents | 4 | 0 | 0 |
| notify | 3 | 2 | 2 |

---

## Task 6 - Gap Analysis

### Legacy Capability Keys (Upgrade Mapping)

- Seed policies menyertakan mapping legacy capability -> action ids baru (untuk upgrade custom roles/struktur lama).
- Total legacy keys: 53
- Legacy keys ini umumnya tidak terdaftar di Action Catalog (karena sudah deprecated).

Daftar legacy keys:
- academic.manage_academic
- academic.manage_guru
- academic.manage_jenis_kegiatan
- academic.manage_kbm
- academic.manage_kelas
- academic.manage_mapel
- academic.manage_semester
- academic.manage_siswa
- academic.manage_tahun_pelajaran
- academic.manage_wali_kelas
- academic.rekap_kbm
- academic.view_guru
- academic.view_jenis_kegiatan
- academic.view_kbm
- academic.view_kelas
- academic.view_mapel
- academic.view_semester
- academic.view_siswa
- academic.view_struktur_organisasi
- academic.view_student_card
- academic.view_tahun_pelajaran
- academic.view_wali_kelas
- attendance.create_session
- attendance.manage_attendance
- attendance.manage_petugas
- attendance.manage_session
- attendance.scan
- attendance.view_attendance
- billing.manage_billings
- billing.manage_plans
- billing.manage_subscriptions
- billing.view_billings
- billing.view_monitoring
- billing.view_subscriptions
- cadangan.manage_cadangan
- cadangan.view_cadangan
- dashboard.view_guru
- dashboard.view_overview
- documents.manage_documents
- documents.view_activities
- documents.view_administrative_documents
- documents.view_legal_documents
- documents.view_manual_documents
- documents.view_other_documents
- kesiswaan.manage_pelanggaran
- kesiswaan.view_pelanggaran
- kurikulum.manage_supervisi
- kurikulum.view_supervisi
- notify.view_stats
- notify.view.stats
- payment.manage_payments
- payment.view_payments
- reports.view_dashboard

