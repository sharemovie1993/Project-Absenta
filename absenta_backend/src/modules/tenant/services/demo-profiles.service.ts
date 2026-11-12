import { prisma } from '../../../utils/prisma';

export interface DemoProfileItem {
  id: string;
  category: 'LEADERSHIP' | 'MANAGEMENT' | 'TU_STAFF' | 'COOP_STAFF' | 'TEACHING' | 'END_USER';
  roleCode: string;
  title: string;
  simulatedName: string;
  email: string;
  password?: string;
  badge: string;
  badgeColor: string;
  description: string;
  iconName: string;
  gradient: string;
  border: string;
  userId?: string | null;
  isActive: boolean;
}

export const BASELINE_DEMO_PROFILES: DemoProfileItem[] = [
  // 👑 LEVEL 4 & 5: PIMPINAN EKSEKUTIF & ADMINISTRATOR
  {
    id: 'demo-admin',
    category: 'LEADERSHIP',
    roleCode: 'ADMIN',
    title: 'Admin Sekolah',
    simulatedName: 'Administrator Sekolah',
    email: 'admin@absenta.id',
    password: 'password123',
    badge: 'Admin Sistem',
    badgeColor: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    description: 'Akses penuh konfigurasi sistem, manajemen pengguna, role RBAC, audit log & setelan sekolah',
    iconName: 'ShieldCheck',
    gradient: 'from-red-600 to-rose-700 text-white',
    border: 'border-red-300 dark:border-red-700',
    isActive: true,
  },
  {
    id: 'demo-superadmin',
    category: 'LEADERSHIP',
    roleCode: 'SUPERADMIN',
    title: 'Super Admin',
    simulatedName: 'Super Administrator',
    email: 'superadmin@system.com',
    password: 'password123',
    badge: 'Owner SaaS',
    badgeColor: 'bg-zinc-800/15 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
    description: 'Akses multi-tenant SaaS, billing langganan, manajemen lisensi sekolah & health check sistem',
    iconName: 'ShieldCheck',
    gradient: 'from-slate-800 to-zinc-900 text-white',
    border: 'border-zinc-400 dark:border-zinc-600',
    isActive: true,
  },
  {
    id: 'demo-kepsek',
    category: 'LEADERSHIP',
    roleCode: 'KEPALA_SEKOLAH',
    title: 'Kepala Sekolah',
    simulatedName: 'Dr. H. Ahmad Fauzi, M.Pd',
    email: 'kepsek@absenta.id',
    password: 'password123',
    badge: 'Pimpinan Utama',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Akses supervisi mutu, statistik presensi global, monitoring KBM, TTD digital & pengesahan laporan',
    iconName: 'Crown',
    gradient: 'from-amber-500 to-amber-700 text-white',
    border: 'border-amber-300 dark:border-amber-700',
    isActive: true,
  },
  {
    id: 'demo-kurikulum',
    category: 'LEADERSHIP',
    roleCode: 'KURIKULUM',
    title: 'Waka Kurikulum',
    simulatedName: 'Dra. Hj. Siti Rahma, M.Pd',
    email: 'kurikulum@absenta.id',
    password: 'password123',
    badge: 'Akademik & KBM',
    badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Penyusunan jadwal KBM, struktur mapel, beban mengajar guru, KOSP & supervisi klinis',
    iconName: 'BookOpen',
    gradient: 'from-blue-500 to-indigo-700 text-white',
    border: 'border-blue-300 dark:border-blue-700',
    isActive: true,
  },
  {
    id: 'demo-kesiswaan',
    category: 'LEADERSHIP',
    roleCode: 'KESISWAAN',
    title: 'Waka Kesiswaan',
    simulatedName: 'Budi Santoso, S.Pd',
    email: 'kesiswaan@absenta.id',
    password: 'password123',
    badge: 'Disiplin & Presensi',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Monitoring presensi real-time, izin keluar, penegakan tata tertib & deteksi pelanggaran EWS',
    iconName: 'Users',
    gradient: 'from-emerald-500 to-teal-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    isActive: true,
  },
  {
    id: 'demo-hubin',
    category: 'LEADERSHIP',
    roleCode: 'HUBIN',
    title: 'Waka Hubin',
    simulatedName: 'Agus Setiawan, S.T',
    email: 'hubin@absenta.id',
    password: 'password123',
    badge: 'Industri & PKL',
    badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Kemitraan DUDI, MoU industri, monitoring PKL siswa, tracer study alumni & unit produksi TEFA',
    iconName: 'Briefcase',
    gradient: 'from-purple-500 to-indigo-800 text-white',
    border: 'border-purple-300 dark:border-purple-700',
    isActive: true,
  },
  {
    id: 'demo-sarpras',
    category: 'LEADERSHIP',
    roleCode: 'SARPRAS',
    title: 'Waka Sarpras',
    simulatedName: 'Ir. Hendra Gunawan',
    email: 'sarpras@absenta.id',
    password: 'password123',
    badge: 'Fasilitas & Aset',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Master aset barcode/RFID, approval afkir barang rusak, pemeliharaan gedung & kalkulator RAB',
    iconName: 'Building2',
    gradient: 'from-orange-500 to-amber-700 text-white',
    border: 'border-orange-300 dark:border-orange-700',
    isActive: true,
  },
  {
    id: 'demo-tu-kepala',
    category: 'LEADERSHIP',
    roleCode: 'TU_KEPALA',
    title: 'Kepala TU',
    simulatedName: 'Ahmad Hidayat, S.AP',
    email: 'tu@absenta.id',
    password: 'password123',
    badge: 'Kepala Administrasi',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Supervisi staf TU, penandatanganan dinas surat keluar, pengarsipan berkas & data induk institusi',
    iconName: 'FileText',
    gradient: 'from-cyan-500 to-blue-700 text-white',
    border: 'border-cyan-300 dark:border-cyan-700',
    isActive: true,
  },

  // 💼 LEVEL 3: KOORDINATOR UNIT & JURUSAN
  {
    id: 'demo-bpbk',
    category: 'MANAGEMENT',
    roleCode: 'BPBK',
    title: 'Koordinator BK',
    simulatedName: 'Nurul Aini, S.Psi',
    email: 'bpbk@absenta.id',
    password: 'password123',
    badge: 'Konseling & EWS',
    badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Bimbingan konseling individual/kelompok, catatan sensitif BK, surat panggilan ortu & home visit',
    iconName: 'HeartHandshake',
    gradient: 'from-rose-500 to-pink-700 text-white',
    border: 'border-rose-300 dark:border-rose-700',
    isActive: true,
  },
  {
    id: 'demo-bkk',
    category: 'MANAGEMENT',
    roleCode: 'BKK',
    title: 'Ketua BKK',
    simulatedName: 'Denny Ramdani, S.Pd',
    email: 'bkk@absenta.id',
    password: 'password123',
    badge: 'Karir Alumni',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Bursa lowongan kerja mitra industri, rekrutmen kampus, seleksi pelamar alumni & tracer study',
    iconName: 'Briefcase',
    gradient: 'from-indigo-500 to-violet-700 text-white',
    border: 'border-indigo-300 dark:border-indigo-700',
    isActive: true,
  },
  {
    id: 'demo-kaprog',
    category: 'MANAGEMENT',
    roleCode: 'KAPROG',
    title: 'Kaprog Kejuruan',
    simulatedName: 'Indra Lesmana, M.Kom',
    email: 'kaprog@absenta.id',
    password: 'password123',
    badge: 'Kepala Jurusan',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Kurikulum kejuruan jurusan, plotting draf PKL siswa, uji kompetensi (UKK) & supervisi bengkel',
    iconName: 'Laptop',
    gradient: 'from-indigo-600 to-blue-800 text-white',
    border: 'border-indigo-300 dark:border-indigo-700',
    isActive: true,
  },
  {
    id: 'demo-kabeng',
    category: 'MANAGEMENT',
    roleCode: 'KABENG',
    title: 'Kepala Bengkel',
    simulatedName: 'Mulyadi, S.T',
    email: 'kabeng@absenta.id',
    password: 'password123',
    badge: 'Kepala Lab/Bengkel',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Manajemen mesin/alat bengkel, approval afkir alat rusak & jadwal pemakaian laboratorium KBM',
    iconName: 'Building2',
    gradient: 'from-amber-600 to-orange-800 text-white',
    border: 'border-amber-300 dark:border-amber-700',
    isActive: true,
  },
  {
    id: 'demo-toolman',
    category: 'MANAGEMENT',
    roleCode: 'TOOLMAN',
    title: 'Toolman / Teknisi',
    simulatedName: 'Asep Supriatna',
    email: 'toolman@absenta.id',
    password: 'password123',
    badge: 'Teknisi Alat',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Bon pinjam-kembali alat perkakas siswa, kartu stok suku cadang & servis berkala mesin bengkel',
    iconName: 'Laptop',
    gradient: 'from-slate-600 to-slate-800 text-white',
    border: 'border-slate-300 dark:border-slate-700',
    isActive: true,
  },
  {
    id: 'demo-gerbang',
    category: 'MANAGEMENT',
    roleCode: 'GERBANG',
    title: 'Petugas Gerbang',
    simulatedName: 'Rudi Hermawan',
    email: 'gerbang@absenta.id',
    password: 'password123',
    badge: 'Operasional Lapangan',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Scan cepat tap-in barcode/RFID gerbang masuk, dispensasi keterlambatan & buku tamu digital',
    iconName: 'ShieldCheck',
    gradient: 'from-slate-700 to-zinc-900 text-white',
    border: 'border-slate-300 dark:border-slate-700',
    isActive: true,
  },

  // 🏛️ LEVEL 2: STAF OPERASIONAL TATA USAHA (TU)
  {
    id: 'demo-tu-persuratan',
    category: 'TU_STAFF',
    roleCode: 'TU_PERSURATAN',
    title: 'TU Persuratan',
    simulatedName: 'Fitri Handayani, S.Sos',
    email: 'tu.persuratan@absenta.id',
    password: 'password123',
    badge: 'Persuratan & Arsip',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Pencatatan surat masuk/keluar, nomor agenda dinas otomatis, disposisi & pengarsipan dokumen PDF',
    iconName: 'FileText',
    gradient: 'from-cyan-600 to-teal-700 text-white',
    border: 'border-cyan-300 dark:border-cyan-700',
    isActive: true,
  },
  {
    id: 'demo-tu-keuangan',
    category: 'TU_STAFF',
    roleCode: 'TU_KEUANGAN',
    title: 'TU Keuangan',
    simulatedName: 'Dewi Lestari, S.E',
    email: 'tu.keuangan@absenta.id',
    password: 'password123',
    badge: 'SPP & Tagihan',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Pengelolaan tagihan SPP bulanan siswa, kwitansi pembayaran tunai/gateway & laporan rekap kas',
    iconName: 'FileText',
    gradient: 'from-emerald-500 to-teal-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    isActive: true,
  },
  {
    id: 'demo-tu-kepegawaian',
    category: 'TU_STAFF',
    roleCode: 'TU_KEPEGAWAIAN',
    title: 'TU Kepegawaian',
    simulatedName: 'Ginanzhar Sudiarto, S.Kom',
    email: 'tu.kepegawaian@absenta.id',
    password: 'password123',
    badge: 'Dapodik & Pegawai',
    badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Buku induk siswa, data pokok guru/tendik (PTK), mutasi siswa, cetak kartu pelajar & akun pengguna',
    iconName: 'Users',
    gradient: 'from-blue-600 to-indigo-800 text-white',
    border: 'border-blue-300 dark:border-blue-700',
    isActive: true,
  },
  {
    id: 'demo-tu-sarpras',
    category: 'TU_STAFF',
    roleCode: 'TU_SARPRAS',
    title: 'TU Sarpras',
    simulatedName: 'Depi Kurniawan',
    email: 'tu.sarpras@absenta.id',
    password: 'password123',
    badge: 'Inventaris Barang',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Labeling barcode Kartu Inventaris Barang (KIB), formulir serah-terima & pencatatan logistik habis pakai',
    iconName: 'Building2',
    gradient: 'from-orange-500 to-amber-700 text-white',
    border: 'border-orange-300 dark:border-orange-700',
    isActive: true,
  },

  // 🛒 KOPERASI SEKOLAH
  {
    id: 'demo-koperasi-ketua',
    category: 'COOP_STAFF',
    roleCode: 'KETUA_KOPERASI',
    title: 'Ketua Koperasi',
    simulatedName: 'Indra Demo',
    email: 'koperasi.ketua@absenta.id',
    password: 'password123',
    badge: 'Ketua Koperasi',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Approval pengajuan pinjaman anggota, laporan keuangan bulanan, persetujuan SHU & voucher diskon',
    iconName: 'ShoppingCart',
    gradient: 'from-emerald-600 to-teal-800 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    isActive: true,
  },
  {
    id: 'demo-koperasi-manajer',
    category: 'COOP_STAFF',
    roleCode: 'MANAJER_TOKO_KOPERASI',
    title: 'Kasir POS Toko',
    simulatedName: 'Tati Demo',
    email: 'koperasi.kasir@absenta.id',
    password: 'password123',
    badge: 'Kasir POS Toko',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Aplikasi kasir Point of Sale (POS), scan barcode barang belanjaan, pembayaran RFID siswa & stok minimarket',
    iconName: 'ShoppingCart',
    gradient: 'from-emerald-500 to-green-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    isActive: true,
  },

  // 👨‍🏫 GURU & WALI KELAS
  {
    id: 'demo-walikelas',
    category: 'TEACHING',
    roleCode: 'WALIKELAS',
    title: 'Wali Kelas',
    simulatedName: 'Ai Kustiani Demo',
    email: 'walikelas@absenta.id',
    password: 'password123',
    badge: 'Wali Kelas',
    badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    description: 'Wali Kelas & Guru Mapel, monitoring presensi bulanan, leger nilai & rapor',
    iconName: 'UserCheck',
    gradient: 'from-teal-500 to-emerald-700 text-white',
    border: 'border-teal-300 dark:border-teal-700',
    isActive: true,
  },
  {
    id: 'demo-guru-mapel',
    category: 'TEACHING',
    roleCode: 'GURU',
    title: 'Guru Mapel',
    simulatedName: 'Siti Patimah Demo',
    email: 'guru.matematika@absenta.id',
    password: 'password123',
    badge: 'Guru Pengajar',
    badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description: 'Pengajar kelas aktif, kelola jadwal KBM aktif, rekap per mapel & jurnal pertemuan',
    iconName: 'GraduationCap',
    gradient: 'from-sky-500 to-blue-700 text-white',
    border: 'border-sky-300 dark:border-sky-700',
    isActive: true,
  },

  // 🎒 SISWA & ORTU
  {
    id: 'demo-siswa',
    category: 'END_USER',
    roleCode: 'SISWA',
    title: 'Siswa / Murid',
    simulatedName: 'Amelia Demo',
    email: 'siswa@absenta.id',
    password: 'password123',
    badge: 'Murid Aktif',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Jadwal pelajaran hari ini, riwayat presensi, saldo e-wallet kantin, nilai ulangan & e-rapor',
    iconName: 'Smartphone',
    gradient: 'from-emerald-500 to-green-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700',
    isActive: true,
  },
  {
    id: 'demo-ortu',
    category: 'END_USER',
    roleCode: 'ORANG_TUA',
    title: 'Orang Tua Murid',
    simulatedName: 'Bapak Hartono Demo',
    email: 'ortu@absenta.id',
    password: 'password123',
    badge: 'Wali Murid',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Notifikasi kehadiran WhatsApp, pantauan jam tiba siswa di kelas, tagihan SPP & konsultasi guru',
    iconName: 'HeartHandshake',
    gradient: 'from-amber-500 to-orange-700 text-white',
    border: 'border-amber-300 dark:border-amber-700',
    isActive: true,
  },
];

export const demoProfilesService = {
  /**
   * Mengambil daftar profil demo publik untuk suatu tenant (digunakan di halaman login & floating switcher)
   */
  async getPublicProfilesForTenant(tenantId?: string | null): Promise<{ is_demo_enabled: boolean; profiles: DemoProfileItem[] }> {
    if (!tenantId) {
      return { is_demo_enabled: true, profiles: BASELINE_DEMO_PROFILES };
    }

    try {
      const isEnabledRow = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'DEMO_MODE_ENABLED' },
      });
      const isDemoEnabled = isEnabledRow ? isEnabledRow.value !== 'false' : true;

      if (!isDemoEnabled) {
        return { is_demo_enabled: false, profiles: [] };
      }

      const mappingRow = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'DEMO_PROFILES_MAPPING' },
      });

      let profiles: DemoProfileItem[] = BASELINE_DEMO_PROFILES;
      if (mappingRow?.value) {
        try {
          const parsed = JSON.parse(mappingRow.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            profiles = parsed;
          }
        } catch (e) {
          console.error('[DemoProfiles] Gagal parse JSON mapping:', e);
        }
      }

      // Ambil seluruh user yang ter-mapping untuk sinkronisasi nama riil terkini
      const mappedUserIds = profiles
        .map((p) => p.userId)
        .filter((id): id is string => Boolean(id));

      if (mappedUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: mappedUserIds }, tenant_id: tenantId },
          select: { id: true, full_name: true, email: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        profiles = profiles.map((p) => {
          if (p.userId && userMap.has(p.userId)) {
            const u = userMap.get(p.userId)!;
            return {
              ...p,
              simulatedName: u.full_name || p.simulatedName,
              email: u.email || p.email,
            };
          }
          return p;
        });
      }

      // Filter hanya profil yang aktif
      const activeProfiles = profiles.filter((p) => p.isActive !== false);

      return { is_demo_enabled: true, profiles: activeProfiles };
    } catch (err: any) {
      console.error('[DemoProfiles] Error getPublicProfilesForTenant:', err.message);
      return { is_demo_enabled: true, profiles: BASELINE_DEMO_PROFILES };
    }
  },

  /**
   * Mengambil data lengkap untuk antarmuka manajemen pemetaan akun demo di dashboard admin
   */
  async getManageData(tenantId: string): Promise<{
    is_demo_enabled: boolean;
    profiles: DemoProfileItem[];
    users: Array<{
      id: string;
      full_name: string;
      email: string;
      role_name: string;
      nip?: string | null;
      positions: string[];
    }>;
  }> {
    // 1. Cek status aktif demo
    const isEnabledRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DEMO_MODE_ENABLED' },
    });
    const isDemoEnabled = isEnabledRow ? isEnabledRow.value !== 'false' : true;

    // 2. Ambil mapping yang tersimpan
    const mappingRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DEMO_PROFILES_MAPPING' },
    });

    let profiles: DemoProfileItem[] = BASELINE_DEMO_PROFILES;
    if (mappingRow?.value) {
      try {
        const parsed = JSON.parse(mappingRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge dengan baseline agar slot peran baru tetap tersedia
          const existingIds = new Set(parsed.map((p: any) => p.id));
          const additions = BASELINE_DEMO_PROFILES.filter((b) => !existingIds.has(b.id));
          profiles = [...parsed, ...additions];
        }
      } catch {}
    }

    // 3. Ambil daftar kandidat pengguna di tenant ini
    const rawUsers: any[] = await prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        Role: { select: { name: true } },
        Guru: { select: { nip: true, nama_guru: true } },
        organizationalAssignments: {
          select: {
            Position: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    const users = rawUsers.map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role_name: u.Role?.name || 'USER',
      nip: u.Guru?.nip || null,
      positions: (u.organizationalAssignments || []).map((oa: any) => oa.Position?.name || oa.Position?.code).filter(Boolean) as string[],
    }));

    // Sinkronisasi data user terkini ke profil
    const userMap = new Map(users.map((u) => [u.id, u]));
    profiles = profiles.map((p) => {
      if (p.userId && userMap.has(p.userId)) {
        const u = userMap.get(p.userId)!;
        return {
          ...p,
          simulatedName: u.full_name || p.simulatedName,
          email: u.email || p.email,
        };
      }
      return p;
    });

    return {
      is_demo_enabled: isDemoEnabled,
      profiles,
      users,
    };
  },

  /**
   * Menyimpan pemetaan profil demo kustom oleh Admin
   */
  async saveDemoProfiles(
    tenantId: string,
    profiles: DemoProfileItem[],
    isDemoEnabled: boolean = true
  ): Promise<void> {
    // Validasi bahwa userId yang dipetakan benar-benar milik tenant ini
    const userIds = profiles.map((p) => p.userId).filter((id): id is string => Boolean(id));
    if (userIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: { id: { in: userIds }, tenant_id: tenantId },
        select: { id: true },
      });
      const validSet = new Set(validUsers.map((u) => u.id));
      for (const p of profiles) {
        if (p.userId && !validSet.has(p.userId)) {
          p.userId = null;
        }
      }
    }

    const jsonString = JSON.stringify(profiles);

    // 1. Simpan mapping
    const existingMapping = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DEMO_PROFILES_MAPPING' },
    });

    if (existingMapping) {
      await prisma.config.update({
        where: { id: existingMapping.id },
        data: { value: jsonString },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'DEMO_PROFILES_MAPPING',
          value: jsonString,
          description: 'Pemetaan Akun Demo & Quick Login oleh Administrator',
        },
      });
    }

    // 2. Simpan status aktif demo
    const existingStatus = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DEMO_MODE_ENABLED' },
    });

    const statusVal = isDemoEnabled ? 'true' : 'false';
    if (existingStatus) {
      await prisma.config.update({
        where: { id: existingStatus.id },
        data: { value: statusVal },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'DEMO_MODE_ENABLED',
          value: statusVal,
          description: 'Status Aktif Mode Demo Quick Login',
        },
      });
    }
  },

  /**
   * Mengembalikan konfigurasi akun demo ke bawaan sistem
   */
  async resetDemoProfiles(tenantId: string): Promise<void> {
    await prisma.config.deleteMany({
      where: {
        tenant_id: tenantId,
        key: { in: ['DEMO_PROFILES_MAPPING', 'DEMO_MODE_ENABLED'] },
      },
    });
  },

  /**
   * Mencari user yang dituju saat tombol demo diklik
   */
  async resolveTargetUserForDemoLogin(tenantId: string, profileId: string): Promise<any | null> {
    // 1. Periksa mapping tenant
    const mappingRow = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DEMO_PROFILES_MAPPING' },
    });

    let targetProfile: DemoProfileItem | undefined;
    if (mappingRow?.value) {
      try {
        const parsed: DemoProfileItem[] = JSON.parse(mappingRow.value);
        targetProfile = parsed.find((p) => p.id === profileId && p.isActive !== false);
      } catch {}
    }

    if (!targetProfile) {
      targetProfile = BASELINE_DEMO_PROFILES.find((b) => b.id === profileId && b.isActive !== false);
    }

    if (!targetProfile) {
      return null;
    }

    // 2. Jika profile memiliki userId spesifik
    if (targetProfile.userId) {
      const user = await prisma.user.findFirst({
        where: { id: targetProfile.userId, tenant_id: tenantId, status: 'ACTIVE' },
        include: { Role: true },
      });
      if (user) return user;
    }

    // 3. Fallback: Cari user berdasarkan email profile di tenant ini
    if (targetProfile.email) {
      const userByEmail = await prisma.user.findFirst({
        where: { email: targetProfile.email, tenant_id: tenantId, status: 'ACTIVE' },
        include: { Role: true },
      });
      if (userByEmail) return userByEmail;
    }

    // 3b. Fallback struktural: Cari user berdasarkan penugasan posisi organisasi (WALIKELAS, KAPROG, BPBK, dll)
    const positionCodes = [
      targetProfile.roleCode,
      targetProfile.roleCode.replace('_', ''),
      targetProfile.roleCode === 'WALIKELAS' ? 'WALI_KELAS' : '',
      targetProfile.roleCode === 'WALI_KELAS' ? 'WALIKELAS' : '',
    ].filter(Boolean);

    const userByPosition = await prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
        organizationalAssignments: {
          some: {
            Position: { code: { in: positionCodes } },
            is_active: true,
          },
        },
      },
      include: { Role: true },
    });
    if (userByPosition) return userByPosition;

    // 4. Fallback kedua: Cari user berdasarkan roleCode di tenant ini
    const userByRole = await prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
        Role: { name: targetProfile.roleCode },
      },
      include: { Role: true },
    });
    if (userByRole) return userByRole;

    // 5. Fallback ketiga: Jika demo tenant, cari superadmin atau admin
    return prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
        Role: { name: { in: ['ADMIN', 'SUPERADMIN', 'GURU'] } },
      },
      include: { Role: true },
    });
  },
};
