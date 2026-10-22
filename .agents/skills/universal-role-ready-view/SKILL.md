---
name: universal-role-ready-view
description: >-
  Standar Industri Universal Role-Ready View (DRY) untuk Halaman & Modul.
  Gunakan saat membuat, merefaktor, atau menstandarisasi modul agar dapat dipanggil secara reusable oleh seluruh Dashboard Role (Kaprog, Walas, Kurikulum, Kepsek, dll) baik sebagai Tab maupun Modal tanpa duplikasi kode.
---

# Universal Role-Ready View (DRY) Pattern

Panduan arsitektur antarmuka standar untuk mentransformasi modul/halaman web menjadi **Universal Role-Ready View**. Pola ini menjamin modul mematuhi prinsip **DRY (Don't Repeat Yourself)** dan dapat dikonsumsi secara fleksibel di berbagai skenario:
1. **Standalone Route** (Halaman mandiri URL penuh).
2. **Dashboard Role Tab** (Tab tersemat di Dashboard Kaprog, Walas, Kurikulum, dll).
3. **Quick-Access Modal** (Pop-up dialog layar penuh untuk inspeksi kilat).

---

## 🎯 Trigger Instruction Kanonikal

Gunakan atau kenali instruksi pengguna berikut:

> **"Tolong standarisasi modul/halaman @[Nama Halaman] menjadi Universal Role-Ready View (DRY) agar siap dipanggil oleh seluruh Dashboard Role (Kaprog, Walas, Kurikulum, Kepsek, dll) baik sebagai Tab maupun Modal."**

Saat instruksi ini diterima, ikuti alur kerja 5-langkah di bawah ini secara otomatis.

---

## 🏛️ Arsitektur Tiga Tingkat (Three-Tier Architecture)

Dilarang membuat salinan kode (seperti `KaprogUkkPage.tsx`, `WalasUkkPage.tsx`, dsb). Pisahkan modul menjadi 3 lapisan:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Standalone Page Wrapper                                             │
│    src/pages/[modul]/[Modul]Page.tsx                                   │
│    - Mengatur Breadcrumb, SEO Title, dan Layout Navbar                 │
│    - Memanggil <[Modul]View /> tanpa filter constraint                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. CORE VIEW: Universal Role-Ready View (DRY)                          │
│    src/components/[kategori]/[modul]/[Modul]View.tsx                   │
│    - Berisi SEMUA logika bisnis, TanStack Query, tabel, dan aksi       │
│    - Menerima `Universal[Modul]ViewProps` (isModal, hideLayout, props) │
│    - Terintegrasi dengan AcademicFilterToolbar & useAcademicFilter     │
└───────┬────────────────────────────────────────────────────────┬───────┘
        │                                                        │
┌───────▼─────────────────────────────────┐   ┌──────────────────▼──────────────────────┐
│ 3A. Dashboard Role Tab Wrapper          │   │ 3B. Dashboard Role Modal Wrapper        │
│     src/components/dashboard/roles/...  │   │     src/components/dashboard/roles/...  │
│     <[Modul]View hideLayout={true} ...> │   │     <Modal size="full">                 │
│     - Scope dikunci (contoh: jurusanId) │   │       <[Modul]View isModal={true} ...>  │
│     - Tanpa navbar/breadcrumb ganda     │   │     </Modal>                            │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

## 📋 Kontrak Props Universal (`Universal[Modul]ViewProps`)

Setiap komponen View inti wajib mengekspor interface props dengan standar berikut:

```typescript
export interface Universal[Modul]ViewProps {
  // 1. Context & Scope Injections (Diinjeksi oleh Dashboard Role atau null untuk global)
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;

  // 2. Display Modifiers
  isModal?: boolean;       // True jika dirender dalam Modal dialog
  hideLayout?: boolean;    // True jika dirender dalam Tab (sembunyikan Topbar / Page Header duplikat)
  readOnly?: boolean;      // True jika user hanya memiliki hak pantau (misal: Kepsek / Pengawas)

  // 3. Event Callbacks
  onClose?: () => void;    // Callback penutup jika dipanggil dalam modal
  onNavigateDetail?: (id: string) => void;
}
```

---

## 🛠️ Implementasi Core View (`[Modul]View.tsx`)

Core View harus memiliki fallback pintar terhadap engine filter:

```tsx
import React, { useState } from 'react';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';

export const ModulView: React.FC<UniversalModulViewProps> = React.memo(({
  jurusanId,
  jurusanNama,
  kelasId,
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  // Fallback ke Platform-Wide Academic Filter jika tidak diinjeksi oleh parent role
  const internalAcademic = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableTingkat: !kelasId,
    enableKelas: !kelasId,
  });

  const effectiveTpId = tahunPelajaranId || internalAcademic.values.tahunPelajaranId;
  const effectiveSemesterId = semesterId || internalAcademic.values.semesterId;
  const effectiveKelasId = kelasId || internalAcademic.values.kelasId;

  return (
    <div className={cn("space-y-6", isModal && "p-2 sm:p-4", hideLayout && "space-y-4")}>
      {/* 1. Header hanya ditampilkan jika BUKAN tab dashboard */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Judul Modul {jurusanNama ? `• ${jurusanNama}` : ''}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Deskripsi operasional modul...
            </p>
          </div>
          {isModal && onClose && (
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
          )}
        </div>
      )}

      {/* 2. Standar Engine Filter Akademik */}
      <AcademicFilterToolbar
        {...internalAcademic.toolbarProps}
        // Jika kelas/jurusan dikunci oleh role, sembunyikan dropdown tersebut
        hideKelas={Boolean(kelasId)}
        readOnly={readOnly}
      />

      {/* 3. Konten Tabel / Metrik / Aksi */}
      {/* ... */}
    </div>
  );
});

ModulView.displayName = 'ModulView';
```

---

## 🔄 Pemanggilan Dual-Mode di Dashboard Role

### A. Sebagai Tab Dashboard (`[Role][Modul]Tab.tsx`)
```tsx
import React from 'react';
import { ModulView } from '@/components/[kategori]/[modul]/ModulView';

export const KaprogModulTab: React.FC<{ jurusanId: string; jurusanNama: string }> = ({
  jurusanId,
  jurusanNama,
}) => {
  return (
    <ModulView
      hideLayout={true}
      jurusanId={jurusanId}
      jurusanNama={jurusanNama}
    />
  );
};
```

### B. Sebagai Modal Pratinjau Cepat (`[Role][Modul]Modal.tsx`)
```tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModulView } from '@/components/[kategori]/[modul]/ModulView';

export const KaprogModulModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  jurusanId: string;
}> = ({ isOpen, onClose, jurusanId }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
    >
      <ModulView
        isModal={true}
        onClose={onClose}
        jurusanId={jurusanId}
      />
    </Modal>
  );
};
```

---

## ⚡ Standar Konsumsi Tab: Pola Keep-Alive & Lazy-Mount (Zero DOM Destruction)

DILARANG KERAS menggunakan conditional rendering murni `{activeTab === 'tabId' && <TabComponent />}` pada Dashboard Role yang memiliki banyak sub-tab (Kaprog, Walas, Kurikulum, Kepsek, Superadmin, dll). 

Conditional rendering murni menghancurkan (*unmount*) seluruh node DOM dan state internal komponen (posisi scroll, halaman pagination tabel, keyword pencarian, dan nilai form) setiap kali pengguna berpindah tab. Akibatnya, saat pengguna kembali ke tab tersebut, browser dipaksa membangun ulang ribuan node DOM dari nol dan memicu jeda render (*lag / no instant loading*).

### 🏛️ Aturan Baku Implementasi Keep-Alive Tab:

1. **Registri `visitedTabs` (Set State)**:
   Catat tab yang pernah dikunjungi agar sub-tab yang belum pernah dibuka tidak membebani initial mount (*lazy initial mount*).
2. **CSS Visibility Toggle (`block` vs `hidden`)**:
   Tab yang sudah pernah dikunjungi dipertahankan di memori DOM menggunakan kelas CSS `block` dan `hidden` (`display: none`).
3. **Non-Blocking Transition**:
   Gunakan animasi masuk CSS ringan (`animate-in fade-in duration-100`). Hindari Framer Motion `AnimatePresence mode="wait"` yang memblokir rendering tab baru selama ratusan milidetik.
4. **Code-Split Modal Views (`React.lazy`)**:
   Modul modal views berukuran besar wajib di-load secara asinkron via `React.lazy()` + `<Suspense>` agar initial bundle dashboard tetap ringan dan hemat memori.

### 📋 Contoh Implementasi Kanonikal di Dashboard Role:

```tsx
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui';

// 1. Lazy load modal-modal views besar (Pilar 21B & TBT Optimization)
const PenempatanPklView = lazy(() => import('@/components/hubin/penempatan/PenempatanPklView').then(m => ({ default: m.PenempatanPklView })));

export const RoleDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('beranda');

  // 2. Keep-Alive Cache: Simpan tab yang pernah dibuka
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set([activeTab]));

  // 3. Tab Selector Handler
  const handleTabSelect = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));
  }, []);

  return (
    <div className="w-full">
      {/* Navigasi Tab */}
      <nav>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => handleTabSelect(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Kontainer Tab Panes (Keep-Alive + Zero DOM Destruction) */}
      <main className="relative w-full min-w-0">
        {visitedTabs.has('beranda') && (
          <div className={cn('w-full', activeTab === 'beranda' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <BerandaTab onSelectTab={handleTabSelect} />
          </div>
        )}

        {visitedTabs.has('siswa') && (
          <div className={cn('w-full', activeTab === 'siswa' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <SiswaTab />
          </div>
        )}

        {visitedTabs.has('prestasi') && (
          <div className={cn('w-full', activeTab === 'prestasi' ? 'block animate-in fade-in duration-100' : 'hidden')}>
            <PrestasiTab />
          </div>
        )}
      </main>

      {/* 4. Modal di-render secara asinkron dengan Suspense Fallback */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="full">
          <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
            <PenempatanPklView isModal={true} onClose={() => setIsModalOpen(false)} />
          </Suspense>
        </Modal>
      )}
    </div>
  );
};
```

---

## ✅ Checklist Standarisasi (Definition of Done)

Saat menstandarisasi modul menjadi Universal Role-Ready View, pastikan:
- [ ] Komponen inti berakhiran `View.tsx` dan mengekspor `Universal[Nama]ViewProps`.
- [ ] Props mendukung `isModal`, `hideLayout`, dan `readOnly`.
- [ ] Komponen membungkus render dengan `React.memo` dan menyertakan `displayName`.
- [ ] Menggunakan `AcademicFilterToolbar` & `useAcademicFilter` dengan fallback internal jika prop filter tidak disediakan.
- [ ] Tersedia pembungkus Tab (`[Role]Tab.tsx`) dan Modal (`[Role]Modal.tsx`) tanpa duplikasi kode logika bisnis.
- [ ] Halaman route utama (`[Modul]Page.tsx`) direfaktor menjadi *thin wrapper* yang hanya memanggil `<[Modul]View />`.
- [ ] Dashboard role induk mengadopsi pola **Keep-Alive + Lazy-Mount** (`visitedTabs` + CSS `hidden`/`block`) untuk menjamin True Instant Tab Switching (<16ms) tanpa *DOM destruction*.
- [ ] Modal dialog views besar di-load secara asinkron dengan `React.lazy` + `Suspense` untuk menjaga ukuran initial bundle tetap ringan.
