import { prisma } from '@/utils/prisma';
import { waQueueService } from '@/services/wa-queue.service';

export interface OnboardingUserItem {
  id: string;
  userType: 'GURU' | 'SISWA' | 'ORTU';
  nama: string;
  no_hp: string;
  detailInfo: string;
  statusKomunikasi: 'SUDAH' | 'BELUM';
  lastCommAt: Date | null;
}

export interface GetOnboardingQuery {
  role?: string; // 'ALL' | 'GURU' | 'SISWA' | 'ORTU'
  status?: string; // 'ALL' | 'BELUM' | 'SUDAH'
  search?: string;
  page?: number;
  limit?: number;
}

export class WaOnboardingService {
  /**
   * Helper: Normalize Phone Number to standard 62... format for comparison
   */
  private normalizePhone(phone?: string | null): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  }

  /**
   * Fetch all users (Guru, Siswa, Ortu) with WA Chatbot communication status
   */
  async getOnboardingUsers(tenantId: string, query: GetOnboardingQuery) {
    const roleFilter = (query.role || 'ALL').toUpperCase();
    const statusFilter = (query.status || 'ALL').toUpperCase();
    const search = (query.search || '').trim().toLowerCase();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

    // 1. Get all chat logs & LID mappings for this tenant to index communicated phone numbers
    const [chatLogs, lidMappings] = await Promise.all([
      prisma.waChatLog.findMany({
        where: { tenant_id: tenantId },
        select: { phone: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.waLidMapping.findMany({
        where: { tenant_id: tenantId },
        select: { phone: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const commMap = new Map<string, Date>();
    chatLogs.forEach((log) => {
      const norm = this.normalizePhone(log.phone);
      if (norm && !commMap.has(norm)) {
        commMap.set(norm, log.created_at);
      }
    });

    lidMappings.forEach((mapping) => {
      const norm = this.normalizePhone(mapping.phone);
      if (norm && !commMap.has(norm)) {
        commMap.set(norm, mapping.created_at || new Date());
      }
    });

    const allUsers: OnboardingUserItem[] = [];

    // 2. Fetch Guru
    if (roleFilter === 'ALL' || roleFilter === 'GURU') {
      const guruList = await prisma.guru.findMany({
        where: { tenant_id: tenantId },
        select: {
          id: true,
          nama_guru: true,
          no_hp: true,
          nip: true,
        },
      });

      guruList.forEach((g) => {
        if (!g.no_hp) return;
        const norm = this.normalizePhone(g.no_hp);
        const lastComm = commMap.get(norm) || null;

        allUsers.push({
          id: g.id,
          userType: 'GURU',
          nama: g.nama_guru,
          no_hp: g.no_hp,
          detailInfo: g.nip ? `NIP: ${g.nip}` : 'Guru',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 3. Fetch Siswa
    if (roleFilter === 'ALL' || roleFilter === 'SISWA') {
      const siswaList = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          no_hp: { not: null },
        },
        select: {
          id: true,
          nama_siswa: true,
          no_hp: true,
          nis: true,
          Kelas: { select: { nama_kelas: true } },
        },
      });

      siswaList.forEach((s) => {
        if (!s.no_hp || s.no_hp.trim() === '') return;
        const norm = this.normalizePhone(s.no_hp);
        const lastComm = commMap.get(norm) || null;

        allUsers.push({
          id: s.id,
          userType: 'SISWA',
          nama: s.nama_siswa,
          no_hp: s.no_hp,
          detailInfo: `${s.Kelas?.nama_kelas || 'Siswa'} ${s.nis ? `(NIS: ${s.nis})` : ''}`,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 4. Fetch Orang Tua
    if (roleFilter === 'ALL' || roleFilter === 'ORTU') {
      const ortuList = await prisma.orangTua.findMany({
        where: {
          tenant_id: tenantId,
          no_hp: { not: null },
        },
        select: {
          id: true,
          nama: true,
          no_hp: true,
          OrangTuaSiswa: {
            include: {
              Siswa: { select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } } },
            },
          },
        },
      });

      ortuList.forEach((o) => {
        if (!o.no_hp || o.no_hp.trim() === '') return;
        const norm = this.normalizePhone(o.no_hp);
        const lastComm = commMap.get(norm) || null;

        const anakName = o.OrangTuaSiswa?.[0]?.Siswa?.nama_siswa || '';
        const kelasName = o.OrangTuaSiswa?.[0]?.Siswa?.Kelas?.nama_kelas || '';
        const detailStr = anakName ? `Ortu dari ${anakName} (${kelasName})` : 'Orang Tua';

        allUsers.push({
          id: o.id,
          userType: 'ORTU',
          nama: o.nama || 'Orang Tua',
          no_hp: o.no_hp,
          detailInfo: detailStr,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 5. Fetch Petugas Kelas
    if (roleFilter === 'PETUGAS_KELAS') {
      const assignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: { code: 'PETUGAS_KELAS' },
        },
        include: {
          User: {
            include: {
              Siswa: { include: { Kelas: { select: { nama_kelas: true } } } },
              Guru: true,
            },
          },
          Kelas: { select: { nama_kelas: true } },
        },
      });

      const processedUserIds = new Set<string>();

      assignments.forEach((asg) => {
        const user = asg.User;
        if (!user) return;
        const siswa = user.Siswa;
        const guru = user.Guru;
        const phone = siswa?.no_hp || guru?.no_hp || user.no_hp;
        if (!phone) return;

        const norm = this.normalizePhone(phone);
        const lastComm = commMap.get(norm) || null;
        const nama = siswa?.nama_siswa || guru?.nama_guru || user.full_name || 'Petugas Kelas';
        const kelasStr = asg.Kelas?.nama_kelas || siswa?.Kelas?.nama_kelas || '-';

        const itemKey = `petugas-kelas-${asg.id}`;
        if (processedUserIds.has(itemKey)) return;
        processedUserIds.add(itemKey);

        allUsers.push({
          id: itemKey,
          userType: siswa ? 'SISWA' : 'GURU',
          nama,
          no_hp: phone,
          detailInfo: `Petugas Absensi Kelas (${kelasStr})`,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 6. Fetch Petugas Gerbang
    if (roleFilter === 'PETUGAS_GERBANG') {
      const assignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: { code: { in: ['GERBANG', 'PETUGAS_GERBANG', 'SATPAM'] } },
        },
        include: {
          User: {
            include: {
              Guru: true,
              Siswa: { include: { Kelas: { select: { nama_kelas: true } } } },
            },
          },
        },
      });

      const processedUserIds = new Set<string>();

      assignments.forEach((asg) => {
        const user = asg.User;
        if (!user) return;
        const guru = user.Guru;
        const siswa = user.Siswa;
        const phone = guru?.no_hp || siswa?.no_hp || user.no_hp;
        if (!phone) return;

        const norm = this.normalizePhone(phone);
        const lastComm = commMap.get(norm) || null;
        const nama = guru?.nama_guru || siswa?.nama_siswa || user.full_name || 'Petugas Gerbang';

        const itemKey = `petugas-gerbang-${asg.id}`;
        if (processedUserIds.has(itemKey)) return;
        processedUserIds.add(itemKey);

        allUsers.push({
          id: itemKey,
          userType: guru ? 'GURU' : 'SISWA',
          nama,
          no_hp: phone,
          detailInfo: `Petugas Gerbang Satpam`,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 7. Fetch Kaprog
    if (roleFilter === 'KAPROG') {
      const assignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: { code: 'KAPROG' },
        },
        include: {
          User: {
            include: {
              Guru: true,
            },
          },
          Unit: { select: { nama: true } },
        },
      });

      const processedPhones = new Set<string>();

      assignments.forEach((asg) => {
        const guru = asg.User?.Guru;
        const phone = guru?.no_hp || asg.User?.no_hp;
        if (!phone) return;

        const norm = this.normalizePhone(phone);
        if (processedPhones.has(norm)) return;
        processedPhones.add(norm);

        const lastComm = commMap.get(norm) || null;
        const jurusanStr = asg.Unit?.nama || 'Kaprog';

        allUsers.push({
          id: `kaprog-asg-${asg.id}`,
          userType: 'GURU',
          nama: guru?.nama_guru || asg.User?.full_name || 'Kaprog',
          no_hp: phone,
          detailInfo: `Kaprog (${jurusanStr})`,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 8. Fetch Para Waka
    if (roleFilter === 'WAKA') {
      const assignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: {
            code: {
              in: ['KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'WAKASEK', 'WAKA'],
            },
          },
        },
        include: {
          User: {
            include: {
              Guru: true,
            },
          },
          Position: { select: { name: true, code: true } },
        },
      });

      const processedUserIds = new Set<string>();

      assignments.forEach((asg) => {
        const user = asg.User;
        if (!user) return;
        const guru = user.Guru;
        const phone = guru?.no_hp || user.no_hp;
        if (!phone) return;

        const norm = this.normalizePhone(phone);
        const lastComm = commMap.get(norm) || null;
        const nama = guru?.nama_guru || user.full_name || 'Waka Sekolah';
        const posTitle = asg.Position?.name || `Waka (${asg.Position?.code})`;

        const itemKey = `waka-${asg.id}`;
        if (processedUserIds.has(itemKey)) return;
        processedUserIds.add(itemKey);

        allUsers.push({
          id: itemKey,
          userType: 'GURU',
          nama,
          no_hp: phone,
          detailInfo: `Waka: ${posTitle}`,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 9. Calculate summary statistics
    const totalGuru = allUsers.filter((u) => u.userType === 'GURU').length;
    const totalSiswa = allUsers.filter((u) => u.userType === 'SISWA').length;
    const totalOrtu = allUsers.filter((u) => u.userType === 'ORTU').length;
    const totalSudah = allUsers.filter((u) => u.statusKomunikasi === 'SUDAH').length;
    const totalBelum = allUsers.filter((u) => u.statusKomunikasi === 'BELUM').length;

    // 6. Apply Status Filter & Search Filter
    let filtered = allUsers;

    if (statusFilter === 'BELUM') {
      filtered = filtered.filter((u) => u.statusKomunikasi === 'BELUM');
    } else if (statusFilter === 'SUDAH') {
      filtered = filtered.filter((u) => u.statusKomunikasi === 'SUDAH');
    }

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.nama.toLowerCase().includes(search) ||
          u.no_hp.toLowerCase().includes(search) ||
          u.detailInfo.toLowerCase().includes(search)
      );
    }

    // 7. Sort: Belum Komunikasi first, then alphabetically
    filtered.sort((a, b) => {
      if (a.statusKomunikasi !== b.statusKomunikasi) {
        return a.statusKomunikasi === 'BELUM' ? -1 : 1;
      }
      return a.nama.localeCompare(b.nama);
    });

    // 8. Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      summary: {
        totalTotal: allUsers.length,
        totalGuru,
        totalSiswa,
        totalOrtu,
        totalBelum,
        totalSudah,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Generate default personalized greeting message for user
   */
  generateGreetingTemplate(user: { userType: 'GURU' | 'SISWA' | 'ORTU'; nama: string; detailInfo?: string }, schoolName: string = 'Sekolah') {
    if (user.userType === 'GURU') {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}*\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Bapak/Ibu dapat menggunakan layanan informasi cepat WA Bot ini dengan mengetik perintah berikut:\n\n` +
        `[1] 📚 Jadwal KBM (Hari Ini, 1 Minggu & Jadwal Kelas)\n` +
        `[2] ⏰ Presensi & Rekap Kehadiran Guru\n` +
        `[3] 🏫 Portal Wali Kelas & Kontak Ortu Siswa\n` +
        `[8] 📍 Posisi & Status Mengajar Guru saat ini\n` +
        `[9] 🟨 Siswa Izin Keluar (Khusus Guru Piket)\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah* agar notifikasi & informasi penting sekolah dapat diterima dengan lancar.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    if (user.userType === 'SISWA') {
      return (
        `👋 *Halo ${user.nama}* (${user.detailInfo || 'Siswa'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Kamu dapat mengecek informasi sekolahmu secara langsung di sini:\n\n` +
        `[1] 👤 Profil & Data RFID\n` +
        `[2] ⏰ Status Presensi Gate Masuk/Pulang\n` +
        `[3] 🏆 Catatan Poin Pelanggaran & Prestasi\n` +
        `[4] 📅 Jadwal Pelajaran Hari Ini & 1 Minggu\n` +
        `[5] 📊 Rekap Bulanan Kehadiran\n` +
        `[6] 📋 Presensi Guru KBM (Khusus Petugas Absensi Kelas)\n\n` +
        `💡 *Himbauan*: Jangan lupa simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // ORTU
    return (
      `👋 *Halo Bapak/Ibu ${user.nama}*\n\n` +
      `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
      `Bapak/Ibu dapat memantau kehadiran & perkembangan Ananda di sekolah secara langsung via WhatsApp Bot:\n\n` +
      `[1] ⏰ Status Presensi Gate & KBM Ananda Hari Ini\n` +
      `[2] 📊 Rekapitulasi Kehadiran Bulanan\n` +
      `[3] 🏆 Catatan Poin Kedisiplinan & Prestasi\n` +
      `[4] 📞 Kontak Info Wali Kelas Ananda\n` +
      `[5] ✉️ Pengajuan Surat Izin / Sakit Ananda via WA\n\n` +
      `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
      `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
    );
  }

  /**
   * Send greeting message to a single user
   */
  async sendGreeting(tenantId: string, payload: { userType: 'GURU' | 'SISWA' | 'ORTU'; nama: string; no_hp: string; detailInfo?: string; customMessage?: string }) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const schoolName = tenant?.name || 'Sekolah';

    const messageText = payload.customMessage && payload.customMessage.trim().length > 0
      ? payload.customMessage
      : this.generateGreetingTemplate(payload, schoolName);

    const normPhone = this.normalizePhone(payload.no_hp);
    if (!normPhone) {
      throw new Error('Nomor HP tidak valid.');
    }

    await waQueueService.enqueue({
      tenantId,
      nomor: normPhone,
      pesan: messageText,
    });

    return {
      success: true,
      message: `Pesan sapaan WA berhasil dijadwalkan untuk ${payload.nama} (${payload.no_hp})`,
    };
  }

  /**
   * Send greeting messages in bulk to filtered users who haven't communicated yet
   */
  async sendGreetingBulk(tenantId: string, payload: { role?: string; search?: string }) {
    const result = await this.getOnboardingUsers(tenantId, {
      role: payload.role || 'ALL',
      status: 'BELUM',
      search: payload.search,
      page: 1,
      limit: 1000,
    });

    const targetUsers = result.items;
    if (targetUsers.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: 'Tidak ada pengguna dengan status Belum Komunikasi yang memenuhi kriteria.',
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const schoolName = tenant?.name || 'Sekolah';

    let count = 0;
    for (const u of targetUsers) {
      const normPhone = this.normalizePhone(u.no_hp);
      if (!normPhone) continue;

      const messageText = this.generateGreetingTemplate(u, schoolName);
      await waQueueService.enqueue({
        tenantId,
        nomor: normPhone,
        pesan: messageText,
      });
      count++;
    }

    return {
      success: true,
      sentCount: count,
      message: `Berhasil menjadwalkan pengiriman pesan sapaan ke ${count} pengguna.`,
    };
  }
}

export const waOnboardingService = new WaOnboardingService();
