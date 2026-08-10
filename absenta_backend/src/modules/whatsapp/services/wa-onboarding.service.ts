import { prisma } from '@/utils/prisma';
import { waQueueService } from '@/services/wa-queue.service';
import { STRUKTUR_CODES } from '@/config/organization-structure';

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
   * Helper: Fetch users by structural role assignments in a DRY, clean manner
   */
  private async fetchStructuralRoleUsers(
    tenantId: string,
    positionQuery: any,
    commMap: Map<string, Date>,
    defaultRoleTitle: string,
    defaultUserType: 'GURU' | 'SISWA' = 'GURU',
    itemPrefix: string = 'asg'
  ): Promise<OnboardingUserItem[]> {
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        Position: positionQuery,
      },
      include: {
        User: {
          include: {
            Guru: true,
            Siswa: { include: { Kelas: { select: { nama_kelas: true } } } },
          },
        },
        Position: { select: { name: true, code: true } },
        Kelas: { select: { nama_kelas: true } },
        Unit: { select: { nama: true } },
      },
    });

    const items: OnboardingUserItem[] = [];
    const processedUserKeys = new Set<string>();

    assignments.forEach((asg) => {
      const user = asg.User;
      if (!user) return;
      const guru = user.Guru;
      const siswa = user.Siswa;
      const phone = String(guru?.no_hp || user.no_hp || siswa?.no_hp || '').trim();
      if (!phone) return;

      const norm = this.normalizePhone(phone);
      const lastComm = commMap.get(norm) || null;
      const nama = guru?.nama_guru || siswa?.nama_siswa || user.full_name || defaultRoleTitle;

      let detailInfo = defaultRoleTitle;
      const kelasName = asg.Kelas?.nama_kelas || siswa?.Kelas?.nama_kelas;
      if (kelasName) {
        detailInfo = `${defaultRoleTitle} (${kelasName})`;
      } else if (asg.Unit?.nama) {
        detailInfo = `${defaultRoleTitle} (${asg.Unit.nama})`;
      } else if (asg.Position?.name) {
        detailInfo = `${asg.Position.name}`;
      }

      const itemKey = `${itemPrefix}-${asg.id}`;
      if (processedUserKeys.has(itemKey)) return;
      processedUserKeys.add(itemKey);

      items.push({
        id: itemKey,
        userType: guru ? 'GURU' : siswa ? 'SISWA' : defaultUserType,
        nama,
        no_hp: phone,
        detailInfo,
        statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
        lastCommAt: lastComm,
      });
    });

    return items;
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

    // 5. Fetch Structural Roles (DRY pattern helper)
    if (roleFilter === 'PETUGAS_KELAS') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { code: STRUKTUR_CODES.PETUGAS_KELAS }, commMap, 'Petugas Absensi Kelas', 'SISWA', 'petugas-kelas');
      allUsers.push(...items);
    } else if (roleFilter === 'PETUGAS_GERBANG') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { code: { in: [STRUKTUR_CODES.GERBANG, 'PETUGAS_GERBANG', 'SATPAM'] } }, commMap, 'Petugas Gerbang Satpam', 'GURU', 'petugas-gerbang');
      allUsers.push(...items);
    } else if (roleFilter === 'KAPROG') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { code: STRUKTUR_CODES.KAPROG }, commMap, 'Kaprog', 'GURU', 'kaprog');
      allUsers.push(...items);
    } else if (roleFilter === 'WAKA') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { code: { in: [STRUKTUR_CODES.KURIKULUM, STRUKTUR_CODES.KESISWAAN, STRUKTUR_CODES.HUBIN, STRUKTUR_CODES.SARPRAS, 'WAKASEK', 'WAKA'] } }, commMap, 'Waka Sekolah', 'GURU', 'waka');
      allUsers.push(...items);
    } else if (roleFilter === 'TOOLMAN') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { code: STRUKTUR_CODES.TOOLMAN }, commMap, 'Toolman Bengkel / Lab', 'GURU', 'toolman');
      allUsers.push(...items);
    } else if (roleFilter === 'TU') {
      const items = await this.fetchStructuralRoleUsers(tenantId, { OR: [{ code: { in: [STRUKTUR_CODES.TU, STRUKTUR_CODES.TU_KEPALA, STRUKTUR_CODES.TU_PERSURATAN, STRUKTUR_CODES.TU_KEUANGAN, STRUKTUR_CODES.TU_KEPEGAWAIAN, STRUKTUR_CODES.TU_SARPRAS] } }, { code: { startsWith: 'TU_' } }] }, commMap, 'Tata Usaha', 'GURU', 'tu');
      allUsers.push(...items);
    } else if (roleFilter === 'BPBK') {
      const items = await this.fetchStructuralRoleUsers(
        tenantId,
        {
          OR: [
            { code: { in: ['BPBK', 'BP_BK', 'BK', 'BP', 'GURU_BK', 'GURU_BP_BK', 'BKK', 'BK_KONSELING', 'COUNSELOR'] } },
            { code: { contains: 'BK', mode: 'insensitive' } },
            { code: { contains: 'BP', mode: 'insensitive' } },
            { name: { contains: 'BK', mode: 'insensitive' } },
            { name: { contains: 'BP', mode: 'insensitive' } },
            { name: { contains: 'Konseling', mode: 'insensitive' } },
            { name: { contains: 'Bimbingan', mode: 'insensitive' } },
          ],
        },
        commMap,
        'Guru BP/BK Konseling',
        'GURU',
        'bpbk'
      );
      allUsers.push(...items);

      const processedKeys = new Set(allUsers.map((i) => this.normalizePhone(i.no_hp)));

      // Fallback 1: Query Guru by jenis_ptk
      const bpbkGurus = await prisma.guru.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { jenis_ptk: { contains: 'BK', mode: 'insensitive' } },
            { jenis_ptk: { contains: 'BP', mode: 'insensitive' } },
            { jenis_ptk: { contains: 'Konsel', mode: 'insensitive' } },
            { jenis_ptk: { contains: 'Bimbingan', mode: 'insensitive' } },
          ],
        },
        include: { User: true },
      });

      bpbkGurus.forEach((g) => {
        const phone = String(g.no_hp || g.User?.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        allUsers.push({
          id: `bpbk-guru-${g.id}`,
          userType: 'GURU',
          nama: g.nama_guru,
          no_hp: phone,
          detailInfo: 'Guru BP/BK Konseling',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });

      // Fallback 2: Query User by Role.name
      const bpbkUsers = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          Role: {
            OR: [
              { name: { contains: 'BK', mode: 'insensitive' } },
              { name: { contains: 'BP', mode: 'insensitive' } },
              { name: { contains: 'Konseling', mode: 'insensitive' } },
            ],
          },
        },
        include: { Guru: true },
      });

      bpbkUsers.forEach((u) => {
        const phone = String(u.Guru?.no_hp || u.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        allUsers.push({
          id: `bpbk-user-${u.id}`,
          userType: 'GURU',
          nama: u.Guru?.nama_guru || u.full_name || 'Guru BP/BK',
          no_hp: phone,
          detailInfo: 'Guru BP/BK Konseling',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    } else if (roleFilter === 'KOPERASI') {
      const items = await this.fetchStructuralRoleUsers(
        tenantId,
        {
          OR: [
            { code: { in: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI', 'KOPERASI', 'PENGURUS_KOPERASI', 'BENDAHARA', 'SEKRETARIS'] } },
            { code: { contains: 'KOPERASI', mode: 'insensitive' } },
            { name: { contains: 'Koperasi', mode: 'insensitive' } },
          ],
        },
        commMap,
        'Pengurus Koperasi',
        'GURU',
        'koperasi'
      );
      allUsers.push(...items);

      const processedKeys = new Set(allUsers.map((i) => this.normalizePhone(i.no_hp)));

      // Fallback 1: Query Member table for Koperasi members/pengurus
      try {
        const members = await prisma.member.findMany({
          where: { tenantId: tenantId, status: 'ACTIVE' },
          include: {
            Guru: { select: { nama_guru: true, no_hp: true } },
            User: { select: { full_name: true, no_hp: true } },
            Siswa: { select: { nama_siswa: true, no_hp: true } },
          },
        });

        members.forEach((m) => {
          const phone = String(m.Guru?.no_hp || m.User?.no_hp || m.Siswa?.no_hp || '').trim();
          if (!phone) return;
          const norm = this.normalizePhone(phone);
          if (processedKeys.has(norm)) return;
          processedKeys.add(norm);

          const lastComm = commMap.get(norm) || null;
          const nama = m.Guru?.nama_guru || m.User?.full_name || m.Siswa?.nama_siswa || 'Pengurus/Anggota Koperasi';
          allUsers.push({
            id: `koperasi-member-${m.id}`,
            userType: m.Guru ? 'GURU' : m.Siswa ? 'SISWA' : 'GURU',
            nama,
            no_hp: phone,
            detailInfo: `Koperasi (${m.memberNo})`,
            statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
            lastCommAt: lastComm,
          });
        });
      } catch (_) {}

      // Fallback 2: Query User by Role.name
      const coopUsers = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          Role: {
            OR: [
              { name: { contains: 'KOPERASI', mode: 'insensitive' } },
              { name: { contains: 'Koperasi', mode: 'insensitive' } },
            ],
          },
        },
        include: { Guru: true },
      });

      coopUsers.forEach((u) => {
        const phone = String(u.Guru?.no_hp || u.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        allUsers.push({
          id: `koperasi-user-${u.id}`,
          userType: 'GURU',
          nama: u.Guru?.nama_guru || u.full_name || 'Pengurus Koperasi',
          no_hp: phone,
          detailInfo: 'Pengurus Koperasi',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    } else if (roleFilter === 'KEPALA_SEKOLAH') {
      const items = await this.fetchStructuralRoleUsers(
        tenantId,
        {
          OR: [
            { code: { in: ['KEPALA_SEKOLAH', 'KEPSEK', 'HEADMASTER', 'PRINCIPAL'] } },
            { code: { contains: 'KEPSEK', mode: 'insensitive' } },
            { name: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
            { name: { contains: 'Kepsek', mode: 'insensitive' } },
          ],
        },
        commMap,
        'Kepala Sekolah',
        'GURU',
        'kepsek'
      );
      allUsers.push(...items);

      const processedKeys = new Set(allUsers.map((i) => this.normalizePhone(i.no_hp)));

      // Fallback 1: Query User by Role.name
      const kepsekUsers = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          Role: {
            OR: [
              { name: { in: ['KEPALA_SEKOLAH', 'Kepala Sekolah', 'KEPSEK'] } },
              { name: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
              { name: { contains: 'Kepsek', mode: 'insensitive' } },
            ],
          },
        },
        include: { Guru: true },
      });

      kepsekUsers.forEach((u) => {
        const phone = String(u.Guru?.no_hp || u.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        allUsers.push({
          id: `kepsek-user-${u.id}`,
          userType: 'GURU',
          nama: u.Guru?.nama_guru || u.full_name || 'Kepala Sekolah',
          no_hp: phone,
          detailInfo: 'Kepala Sekolah',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });

      // Fallback 2: Query Sekolah profile for kepala_sekolah name
      try {
        const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
        if (sekolah?.kepala_sekolah) {
          const kepsekName = sekolah.kepala_sekolah.trim();
          const guruKepsek = await prisma.guru.findFirst({
            where: {
              tenant_id: tenantId,
              nama_guru: { contains: kepsekName, mode: 'insensitive' },
            },
            include: { User: true },
          });

          if (guruKepsek) {
            const phone = String(guruKepsek.no_hp || guruKepsek.User?.no_hp || '').trim();
            if (phone) {
              const norm = this.normalizePhone(phone);
              if (!processedKeys.has(norm)) {
                processedKeys.add(norm);
                const lastComm = commMap.get(norm) || null;
                allUsers.push({
                  id: `kepsek-sekolah-${guruKepsek.id}`,
                  userType: 'GURU',
                  nama: guruKepsek.nama_guru,
                  no_hp: phone,
                  detailInfo: 'Kepala Sekolah',
                  statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
                  lastCommAt: lastComm,
                });
              }
            }
          }
        }
      } catch (_) {}
    } else if (roleFilter === 'WALIKELAS') {
      const items = await this.fetchStructuralRoleUsers(
        tenantId,
        {
          OR: [
            { code: { in: ['WALIKELAS', 'WALI_KELAS', 'WALI', 'HOMEROOM'] } },
            { code: { contains: 'WALI', mode: 'insensitive' } },
            { name: { contains: 'Wali Kelas', mode: 'insensitive' } },
            { name: { contains: 'Wali', mode: 'insensitive' } },
          ],
        },
        commMap,
        'Wali Kelas',
        'GURU',
        'walikelas'
      );
      allUsers.push(...items);

      const processedKeys = new Set(allUsers.map((i) => this.normalizePhone(i.no_hp)));

      // Fallback 1: Query any OrganizationalAssignment that has kelas_id attached
      const kelasAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          kelas_id: { not: null },
        },
        include: {
          User: { include: { Guru: true } },
          Kelas: { select: { nama_kelas: true } },
          Position: { select: { name: true } },
        },
      });

      kelasAssignments.forEach((asg) => {
        const guru = asg.User?.Guru;
        const phone = String(guru?.no_hp || asg.User?.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        const nama = guru?.nama_guru || asg.User?.full_name || 'Wali Kelas';
        const kelasStr = asg.Kelas?.nama_kelas ? `Wali Kelas (${asg.Kelas.nama_kelas})` : 'Wali Kelas';

        allUsers.push({
          id: `walikelas-asg-${asg.id}`,
          userType: 'GURU',
          nama,
          no_hp: phone,
          detailInfo: kelasStr,
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });

      // Fallback 2: Query User by Role.name matching Wali Kelas
      const waliUsers = await prisma.user.findMany({
        where: {
          tenant_id: tenantId,
          Role: {
            OR: [
              { name: { in: ['WALIKELAS', 'WALI_KELAS', 'Wali Kelas'] } },
              { name: { contains: 'Wali', mode: 'insensitive' } },
            ],
          },
        },
        include: { Guru: true },
      });

      waliUsers.forEach((u) => {
        const phone = String(u.Guru?.no_hp || u.no_hp || '').trim();
        if (!phone) return;
        const norm = this.normalizePhone(phone);
        if (processedKeys.has(norm)) return;
        processedKeys.add(norm);

        const lastComm = commMap.get(norm) || null;
        allUsers.push({
          id: `walikelas-user-${u.id}`,
          userType: 'GURU',
          nama: u.Guru?.nama_guru || u.full_name || 'Wali Kelas',
          no_hp: phone,
          detailInfo: 'Wali Kelas',
          statusKomunikasi: lastComm ? 'SUDAH' : 'BELUM',
          lastCommAt: lastComm,
        });
      });
    }

    // 13. Calculate summary statistics
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
   * Generate default personalized greeting message for user based on structural position/role
   */
  generateGreetingTemplate(user: { userType: 'GURU' | 'SISWA' | 'ORTU'; nama: string; detailInfo?: string }, schoolName: string = 'Sekolah') {
    const detail = String(user.detailInfo || '').trim();
    const detailUpper = detail.toUpperCase();

    // 1. KEPALA SEKOLAH
    if (detailUpper.includes('KEPALA SEKOLAH') || detailUpper.includes('KEPSEK')) {
      return (
        `👋 *Yth. Bapak/Ibu Kepala Sekolah ${user.nama}*\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Pimpinan Satuan Pendidikan, Anda dapat memantau & mengawasi operasional sekolah secara langsung via WhatsApp Bot:\n\n` +
        `[1] 📊 Ringkasan & Monitoring Kehadiran Siswa Global\n` +
        `[2] ⏰ Presensi & Rekap Kehadiran Guru/Staf\n` +
        `[3] 📚 Monitoring Jadwal KBM & Posisi Guru Saat Ini\n` +
        `[4] 📋 Laporan Rekapitulasi Presensi Harian\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah* untuk notifikasi pimpinan.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 2. WALI KELAS
    if (detailUpper.includes('WALI KELAS') || detailUpper.includes('WALIKELAS')) {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}* (${detail})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Wali Kelas, Anda dapat memantau & mengelola kelas binaan Anda secara langsung:\n\n` +
        `[1] 📚 Jadwal KBM & Sesi Pembelajaran Kelas\n` +
        `[2] ⏰ Presensi & Rekap Kehadiran Guru\n` +
        `[3] 🏫 Portal Wali Kelas (Cek Absensi, Poin, & Kontak Ortu Siswa Binaan)\n` +
        `[4] ✉️ Verifikasi Surat Izin / Sakit Siswa Binaan\n` +
        `[8] 📍 Posisi & Status Mengajar Guru\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 3. GURU BP/BK
    if (detailUpper.includes('BP') || detailUpper.includes('BK') || detailUpper.includes('KONSELING')) {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}* (${detail || 'Guru BP/BK Konseling'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Guru BP/BK, Anda dapat memantau kedisiplinan & bimbingan siswa via WhatsApp Bot:\n\n` +
        `[1] 📚 Jadwal KBM & Rekap Kehadiran\n` +
        `[2] ⏰ Presensi Guru\n` +
        `[3] 🏆 Portal BP/BK (Poin Pelanggaran, Prestasi, & Bimbingan Konseling Siswa)\n` +
        `[4] 📞 Kontak Orang Tua Siswa untuk Pembinaan\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 4. KOPERASI
    if (detailUpper.includes('KOPERASI')) {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}* (${detail || 'Pengurus Koperasi'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Pengurus/Anggota Koperasi Sekolah, Anda dapat mengakses layanan koperasi via WhatsApp Bot:\n\n` +
        `[1] 🏪 Portal Koperasi (Cek Saldo, Transaksi POS, & Simpanan Anggota)\n` +
        `[2] 📊 Rekap Transaksi & Poin Koperasi\n` +
        `[3] 📚 Jadwal KBM & Presensi Guru\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 5. WAKA SEKOLAH
    if (detailUpper.includes('WAKA') || detailUpper.includes('KURIKULUM') || detailUpper.includes('KESISWAAN') || detailUpper.includes('HUBIN') || detailUpper.includes('SARPRAS')) {
      return (
        `👋 *Yth. Bapak/Ibu ${user.nama}* (${detail || 'Waka Sekolah'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Waka Sekolah, Anda dapat mengakses menu manajerial sekolah secara langsung:\n\n` +
        `[1] 📚 Jadwal KBM & Monitoring Pembelajaran\n` +
        `[2] 🏆 Rekap Kedisiplinan & Presensi Siswa\n` +
        `[3] 📍 Posisi & Status Mengajar Guru\n` +
        `[4] 📋 Laporan Transisi & Operasional Sekolah\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 6. PETUGAS GERBANG / SATPAM
    if (detailUpper.includes('GERBANG') || detailUpper.includes('SATPAM')) {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}* (${detail || 'Petugas Gerbang'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Petugas Gerbang/Satpam, Anda dapat menggunakan layanan presensi & kedisiplinan gerbang:\n\n` +
        `[1] 🛡️ Scan RFID / QR Code Gate Masuk & Pulang\n` +
        `[2] 🟨 Penindakan Kedisiplinan Langsung di Gerbang\n` +
        `[3] 📋 Cek Daftar Siswa Belum Absen / Terlambat\n\n` +
        `💡 *Himbauan*: Mohon simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // 7. PETUGAS ABSENSI KELAS (SISWA)
    if (detailUpper.includes('PETUGAS') && user.userType === 'SISWA') {
      return (
        `👋 *Halo ${user.nama}* (${detail || 'Petugas Absensi Kelas'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Sebagai Petugas Absensi Kelas, kamu bertugas mengentri kehadiran & jurnal KBM di kelasmu:\n\n` +
        `[1] 📋 Presensi Sesi KBM Kelas (Input Hadir/Sakit/Izin & Jurnal Guru)\n` +
        `[2] 👤 Profil & Data RFID\n` +
        `[3] ⏰ Status Presensi Gate Masuk/Pulang\n` +
        `[4] 📅 Jadwal Pelajaran Kelas\n\n` +
        `💡 *Himbauan*: Jangan lupa simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // GURU UMUM
    if (user.userType === 'GURU') {
      return (
        `👋 *Halo Bapak/Ibu ${user.nama}* (${detail || 'Guru'})\n\n` +
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

    // SISWA UMUM
    if (user.userType === 'SISWA') {
      return (
        `👋 *Halo ${user.nama}* (${detail || 'Siswa'})\n\n` +
        `Selamat datang di Layanan WhatsApp Bot Resmi *Absenta* (${schoolName}).\n\n` +
        `Kamu dapat mengecek informasi sekolahmu secara langsung di sini:\n\n` +
        `[1] 👤 Profil & Data RFID\n` +
        `[2] ⏰ Status Presensi Gate Masuk/Pulang\n` +
        `[3] 🏆 Catatan Poin Pelanggaran & Prestasi\n` +
        `[4] 📅 Jadwal Pelajaran Hari Ini & 1 Minggu\n` +
        `[5] 📊 Rekap Bulanan Kehadiran\n\n` +
        `💡 *Himbauan*: Jangan lupa simpan nomor WhatsApp ini sebagai *WA Bot Absenta Sekolah*.\n\n` +
        `Ketik *[0]* atau *MENU* untuk mencoba layanan bot! 😊`
      );
    }

    // ORTU
    return (
      `👋 *Halo Bapak/Ibu ${user.nama}* (${detail || 'Orang Tua'})\n\n` +
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
