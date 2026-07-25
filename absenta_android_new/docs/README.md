# Indeks Dokumentasi Rekam Jejak Fase Pekerjaan (`absenta_android_new`)

Folder `docs/` ini disusun rapi per-fase pekerjaan agar memberikan rekam jejak konteks (*context trail*) yang utuh dan jelas bagi pengembangan aplikasi di masa mendatang.

---

## 📂 Struktur Folder Fase Pekerjaan

```text
docs/
├── README.md                                      ← Indeks Master Dokumentasi Ini
├── implementation_plan.md                         ← Ringkasan Spesifikasi Technical Plan
├── task_list.md                                   ← Ringkasan Checklist Task Layer 1-11
├── walkthrough.md                                 ← Ringkasan Laporan Walkthrough
│
├── phase-01-requirements-and-redesign/            ← Fase 1: Perancangan Ulang & Konsep
│   ├── 01_operational_app_concept.md              - Perubahan dari ERP Web ke Mobile Tool
│   └── 02_grill_me_decisions.md                   - 9 Keputusan Grill-Me & Capabilities Map
│
├── phase-02-architecture-and-design/              ← Fase 2: Arsitektur & UI Design System
│   ├── 01_system_architecture.md                  - Clean Architecture & Flow Dynamic Menu
│   └── 02_ui_design_system.md                     - Dark-First Theme, Colors, & Shared DRY UI
│
├── phase-03-foundation-and-data-layer/            ← Fase 3: Fondasi Gradle & Data Layer
│   ├── 01_gradle_and_manifest.md                  - Dependencies, Permissions, 16 KB Page Align
│   └── 02_data_and_api_services.md                - Models, TokenManager, & 9 Retrofit Services
│
├── phase-04-ui-and-feature-implementation/        ← Fase 4: Implementasi UI & Feature Screens
│   ├── 01_shared_components.md                    - Dokumentasi 7 Component Shared DRY
│   ├── 02_routing_and_dashboards.md               - NavGraph, Dynamic Menu, Exec, Parent
│   └── 03_feature_screens.md                      - 8 Screen Modul Operasional
│
└── phase-05-verification-and-deployment/          ← Fase 5: Verifikasi Build & Roadmap
    ├── 01_build_verification_report.md            - Laporan Kompilasi Gradle (SUCCESSFUL)
    └── 02_next_development_roadmap.md             - Panduan & Roadmap Pengembangan Lanjutan
```

---

## 🎯 Cara Membaca Rekam Jejak

- **Jika ingin memahami latar belakang keputusan produk**: Baca [phase-01-requirements-and-redesign](file:///d:/BarayaProject/Project%20Absenta/absenta_android_new/docs/phase-01-requirements-and-redesign/).
- **Jika ingin mempelajari arsitektur & desain UI**: Baca [phase-02-architecture-and-design](file:///d:/BarayaProject/Project%20Absenta/absenta_android_new/docs/phase-02-architecture-and-design/).
- **Jika ingin melihat detail API & storage layer**: Baca [phase-03-foundation-and-data-layer](file:///d:/BarayaProject/Project%20Absenta/absenta_android_new/docs/phase-03-foundation-and-data-layer/).
- **Jika ingin mengedit screen / komponen UI**: Baca [phase-04-ui-and-feature-implementation](file:///d:/BarayaProject/Project%20Absenta/absenta_android_new/docs/phase-04-ui-and-feature-implementation/).
- **Jika ingin menambah modul baru di masa depan**: Baca [phase-05-verification-and-deployment](file:///d:/BarayaProject/Project%20Absenta/absenta_android_new/docs/phase-05-verification-and-deployment/).
