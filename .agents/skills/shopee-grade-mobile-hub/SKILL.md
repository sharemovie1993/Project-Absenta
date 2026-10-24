---
name: shopee-grade-mobile-hub
description: >-
  Standar Industri High-Density Mobile Hub & Shopee-Grade UI Primitives (HubCard, HubActionGrid, HubBentoGrid, HubListRow, HubStatusStrip). Gunakan saat membuat, merefaktor, atau mengaudit antarmuka mobile dashboard (Beranda, Profil/Saya, Siswa, Guru, Walas, Kaprog) agar ramping, ringan, bebas scrolling boros, dan mematuhi kaidah tipografi Capitalize modern.
---

# Shopee-Grade High-Density Mobile Hub Architecture

Panduan arsitektur antarmuka standar untuk merancang antarmuka mobile dashboard Absenta dengan kepadatan informasi tinggi (*High Density*), bobot visual ringan (*Airy & Slim*), dan efisiensi di atas lipatan layar (*Above-the-fold*) mengadopsi standar desain e-commerce modern (**Shopee UI Paradigm**).

---

## 🎯 Trigger Instruction Kanonikal

Gunakan atau kenali instruksi pengguna berikut:

> **"Tolong refaktor/standarisasi tampilan mobile @[Nama Modul/Dashboard] menggunakan standar Shopee-Grade Mobile Hub (High Density & Ramping) agar muat banyak informasi di atas lipatan layar tanpa scrolling boros."**

---

## 🏛️ 5 Pilar Arsitektur Shopee-Grade Mobile Hub

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. ONE SECTION = ONE CARD CONTAINER (Eliminasi Box-in-Box)             │
│    Gunakan <HubCard>. DILARANG membungkus setiap tombol kecil dengan   │
│    kotak border/shadow terpisah yang membuat UI gemuk dan sesak.       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. BORDERLESS ACTION MICRO-GRID                                        │
│    Gunakan <HubActionGrid>. Item (ikon + label) berdiri bebas di atas  │
│    latar putih kartu tanpa bingkai individu (ala "Pesanan Saya").      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. HAIRLINE FLAT BENTO DIVIDERS                                        │
│    Gunakan <HubBentoGrid>. Sel metrik 2x2 atau 2-kolom hanya           │
│    dipisahkan oleh garis rambut 1px (ala "Keuangan Shopee").           │
├────────────────────────────────────────────────────────────────────────┤
│ 4. SLIM FLAT MENU ROWS                                                 │
│    Gunakan <HubListRow>. Baris menu daftar flat dengan divider 1px dan │
│    chevron `>` halus (ala "Pulsa & Tagihan / Aktivitas Saya").         │
├────────────────────────────────────────────────────────────────────────┤
│ 5. CAPITALIZE TYPOGRAPHY (Anti-Uppercase Abuse)                        │
│    DILARANG menyuntikkan `uppercase tracking-wider` pada judul seksi   │
│    dan label tombol. Wajib menggunakan Capitalize alami font           │
│    Plus Jakarta Sans agar teks ramping dan tidak terpotong kaku.       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Primitives Bersama Terpusat (`src/components/ui/hub/`)

Seluruh modul mobile dashboard **WAJIB** mengimpor komponen bersama dari `@/components/ui/hub`:

```tsx
import { 
  HubCard, 
  HubActionGrid, 
  HubBentoGrid, 
  HubListRow, 
  HubStatusStrip,
  type HubActionItem,
  type HubBentoCell
} from '@/components/ui/hub';
```

---

### 1. `HubCard` — Kontainer Induk Ramping
Menggabungkan elemen seksi ke dalam 1 kartu putih bersih dengan garis pembatas halus dan header opsional:

```tsx
<HubCard
  title="Tugas & Peringatan Saya"
  subtitle="(Hari Ini)"
  actionLabel="Lihat Semua"
  onAction={() => navigate('/tugas')}
>
  {/* Konten borderless di dalam */}
</HubCard>
```

**Aturan Kontainer:**
- `bg-white dark:bg-slate-900 rounded-2xl`
- `border border-slate-100 dark:border-slate-800/80`
- Shadow sangat lembut: `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- Padding mikro padat: `p-2.5 sm:p-3` (atau `noPadding` jika memuat list divider).

---

### 2. `HubActionGrid` — 4/5 Kolom Borderless (Ala "Pesanan Saya")
Deretan aksi cepat atau status operasional horizontal tanpa kotak pembungkus individu:

```tsx
const actionItems: HubActionItem[] = [
  {
    id: 'jurnal',
    label: 'Hutang Jurnal',
    value: unfilledCount > 0 ? `${unfilledCount} Sesi` : 'Tuntas',
    icon: FileEdit,
    iconColorClass: unfilledCount > 0 ? 'text-rose-500' : 'text-slate-600',
    badge: unfilledCount > 0 ? unfilledCount : null, // Red counter pill
    onClick: handleOpenJournal,
  },
  {
    id: 'izin',
    label: 'Izin Saya',
    value: 'Nihil',
    icon: ClipboardList,
    onClick: handleOpenLeaves,
  },
  {
    id: 'piket',
    label: 'Jadwal Piket',
    value: 'Kamis Besok',
    icon: ShieldAlert,
    onClick: handleOpenPiket,
  },
  {
    id: 'nilai',
    label: 'Setor Nilai',
    value: 'Akhir Bulan',
    icon: Award,
    onClick: handleOpenGrades,
  },
];

<HubCard title="Tugas & Peringatan Saya" actionLabel="Lihat Semua">
  <HubActionGrid items={actionItems} columns={4} />
</HubCard>
```

---

### 3. `HubBentoGrid` — Metrik 2x2 Garis Rambut (Ala "Keuangan Shopee")
Menggantikan kartu-kartu bento tebal mengambang dengan satu kartu bergaris sekat tipis:

```tsx
const bentoCells: HubBentoCell[] = [
  {
    id: 'kehadiran',
    title: 'Kehadiran',
    value: '98%',
    subtext: '22 Hadir • 0 Izin',
    icon: Target,
    iconColorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    showChevron: true,
    onClick: handleOpenKehadiran,
  },
  {
    id: 'disiplin',
    title: 'Disiplin Waktu',
    value: '0 Menit',
    subtext: 'Rata-rata Tap 06:48 WIB',
    icon: Clock,
  },
  {
    id: 'beban',
    title: 'Beban Mengajar',
    value: '24/24 JP',
    subtext: 'Memenuhi Syarat Sertifikasi',
    icon: Award,
    showChevron: true,
    onClick: handleOpenBeban,
  },
  {
    id: 'jurnal',
    title: 'Jurnal Ajar',
    value: '100%',
    subtext: 'Dokumentasi Lengkap',
    icon: CheckCircle2,
  },
];

<HubCard title="Performa Kehadiran Saya" subtitle="(Bulan Ini)" noPadding>
  <HubBentoGrid cells={bentoCells} columns={2} />
</HubCard>
```

---

### 4. `HubListRow` — Baris Menu Flat Hairline (Ala "Aktivitas Saya")
Menampilkan daftar navigasi, agenda, atau administrasi dokumen secara flat:

```tsx
<HubCard title="Jadwal & Agenda Mengajar" noPadding>
  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
    <HubListRow
      title="Matriks Jadwal Mengajar Mingguan"
      subtitle="Jadwal mengajar lengkap hari Senin s.d. Jumat"
      icon={Calendar}
      iconColorClass="bg-blue-50 text-blue-600"
      onClick={handleOpenWeekly}
    />
    <HubListRow
      title="Kalender Akademik & Hari Efektif"
      subtitle="Jadwal PTS, PAS, libur nasional, dan rapat dinas"
      icon={CalendarDays}
      iconColorClass="bg-emerald-50 text-emerald-600"
      onClick={handleOpenCalendar}
    />
  </div>
</HubCard>
```

---

### 5. `HubStatusStrip` — Bilah Status Kompak 44px (Ala ShopeePay / QRIS Strip)
Bilah status horizontal dengan pembatas garis vertikal untuk jam kerja, status KBM aktif, dan presensi mandiri:

```tsx
<TeacherDailyStatusStrip
  jamKerja="07:00 - 15:00"
  activeKbm={activeKbm}
  nextKbm={nextKbm}
  guruTapTime="06:48 WIB"
  isGuruHadir={true}
/>
```

---

## 🔤 Standar Tipografi (Kaidah Huruf Kapital vs Capitalize)

| Elemen Antarmuka | Format Wajib | Contoh Benar (Shopee Style) | Contoh Salah (Kaku/Terpotong) |
| :--- | :--- | :--- | :--- |
| **Judul Seksi / Card** | Capitalize / Title Case | `"Tugas & Peringatan Saya"` | `TUGAS & PERINGATAN SAYA` |
| **Label Menu / Aksi** | Capitalize | `"Hutang Jurnal"`, `"Jadwal Piket"` | `HUTANG JUR...`, `JADWAL PIK...` |
| **Tombol Aksi** | Capitalize | `"Presensi Siswa"`, `"Isi Jurnal"` | `PRESENSI SISWA`, `ISI JURNAL` |
| **Sublabel Status** | Sentence Case | `"Memenuhi syarat sertifikasi"` | `MEMENUHI SYARAT SERTIFIKASI` |
| **Akronim Resmi** | UPPERCASE Khusus | `KBM`, `JP`, `NIP`, `NISN`, `UKK`, `P5` | `Kbm`, `Jp`, `Nip`, `Ukk` |
| **Kode Rombel/Jurusan**| Asli dari Database | `XII TP 1`, `XI RPL 2` | `xii tp 1` |

---

## 📱 Sinergi Responsif Mobile & Desktop (Dual-Hub DRY)

1. **Pada Mobile (`< 768px`)**:
   - Tampilkan Hub Ringan Beranda & Tab Saya di atas lipatan layar (*above-the-fold*).
   - Seluruh komponen memakai `HubCard`, `HubActionGrid`, dan `HubBentoGrid`.
2. **Pada Desktop (`>= 768px`)**:
   - Pertahankan tabel matriks mingguan penuh (`StaffWeeklyScheduleWidget`) dan kartu beban komprehensif (`BebanMengajarWidget`) dengan membungkusnya dalam:
     ```tsx
     <div className="hidden md:block space-y-4 pt-2">
       <StaffWeeklyScheduleWidget ... />
       <BebanMengajarWidget ... />
     </div>
     ```
   - Dengan pendekatan ini, pengguna desktop tetap menikmati ruang lebar multi-kolom, sementara pengguna smartphone mendapatkan pengalaman Shopee yang padat, cepat, dan tanpa scroll berlebihan.

---

## ✅ Checklist Verifikasi Kepatuhan Shopee-Grade

Sebelum melakukan commit, pastikan implementasi memenuhi seluruh kriteria berikut:
- [ ] Tidak ada kelas `uppercase tracking-wider` pada judul card atau label tombol selain akronim resmi.
- [ ] Tidak ada sindrom "kotak-dalam-kotak" (tidak ada button/div yang memakai border/shadow sendiri di dalam seksi grid).
- [ ] Semua seksi menggunakan kontainer induk `HubCard`.
- [ ] Grid 4/5 kolom menggunakan `HubActionGrid` borderless.
- [ ] Metrik 2x2 menggunakan `HubBentoGrid` dengan divider rambut 1px (`divide-x divide-y divide-slate-100`).
- [ ] Tidak ada teks label yang terpotong (`truncate` jelek) pada layar HP 360px.
- [ ] `npx tsc --noEmit` lolos 0 error.
- [ ] `node ./scripts/audit-pages.cjs` lolos sinkron.
