# MODULE MENU (Dynamic Sidebar Renderer)

## Deskripsi
Modul Menu mengelola struktur navigasi bilah sisi (*sidebar*) aplikasi secara dinamis berdasarkan otorisasi peran pengguna. Navigasi dirender secara dinamis untuk menghemat memori frontend dan memberikan isolasi menu antar aktor.

## Aktor & Peran
- **System Superadmin**: Pengelola master menu platform (membuat, mengubah, atau menghapus node menu baru).
- **Semua Pengguna**: Menerima bilah sisi navigasi yang telah dipersonalisasi sesuai hak akses.

## Sub-Modul & Fitur Terimplementasi
### 1. Dynamic Menu Tree
- **Sidebar Builder**: Engine yang merelasikan daftar menu dengan kapabilitas (capabilities) user yang sedang login.
- **Sidebar Cache (Redis)**: Penyimpanan cache struktur bilah sisi user untuk performa rendering navigasi supercepat.

## Teknologi & Pattern
- **Pattern**: Dynamic Menu Builder, Composite Pattern (Tree Node), Cache-Aside.
- **Database**: Tabel `Menu`, `MenuRole`.
