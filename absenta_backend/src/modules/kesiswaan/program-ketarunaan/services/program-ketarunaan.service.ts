import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { unifiedKegiatanService, UnifiedTapPayload } from '@/modules/attendance/unified-kegiatan/services/unified-kegiatan.service';

/**
 * ProgramKetarunaanService
 * 
 * Bertindak sebagai spesialisasi / wrapper ke UnifiedKegiatanService dengan konteks jenis kegiatan "KETARUNAAN".
 * Memastikan backward compatibility 100% untuk semua controller & route kesiswaan yang sudah ada,
 * sekaligus mengelola Kepanitiaan & Ploting Penugasan Ketarunaan (OrganizationalAssignment).
 */
export class ProgramKetarunaanService {
  async getGuardStatus(tenantId: string) {
    return unifiedKegiatanService.getGuardStatus(tenantId, 'KETARUNAAN');
  }

  async getSesiHariIni(tenantId: string, params?: { tanggal?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getSesiHariIni(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async getPendamping(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getPendamping(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async tapPendamping(tenantId: string, payload: UnifiedTapPayload) {
    return unifiedKegiatanService.tapPendamping(tenantId, payload);
  }

  async getStats(
    tenantId: string,
    params?: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      jadwal_kegiatan_id?: string;
      scope_periode?: '1_tahun' | '1_semester' | '1_bulan' | 'kustom';
      bulan_ym?: string;
      mode_agenda?: 'SEMUA_SIKLUS' | 'APEL_PAGI' | 'UPACARA' | 'KETARUNAAN' | 'LATIHAN_KETARUNAAN' | 'DUHA' | 'APEL_SORE';
    }
  ) {
    return unifiedKegiatanService.getStats(tenantId, { ...params, jenis_kegiatan: 'KETARUNAAN' });
  }

  async getLaporanTim(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getLaporanTim(tenantId, { ...params, jenis_kegiatan: 'Ketarunaan' });
  }

  async getLaporanKelas(tenantId: string, params: { tanggal?: string; kelas_id?: string; jadwal_kegiatan_id?: string }) {
    return unifiedKegiatanService.getLaporanKelas(tenantId, { ...params, jenis_kegiatan: 'Ketarunaan' });
  }

  // ─── PLOTING KEPANITIAAN KETARUNAAN (ORGANIZATIONAL ASSIGNMENTS) ───────────

  async getKepanitiaan(tenantId: string) {
    // 1. Pastikan posisi KETUA_PEMBINA_TARUNA dan PEMBINA_TARUNA ada di tenant
    const posKetua = await prisma.organizationalPosition.upsert({
      where: { tenant_id_code: { tenant_id: tenantId, code: 'KETUA_PEMBINA_TARUNA' } },
      create: {
        tenant_id: tenantId,
        code: 'KETUA_PEMBINA_TARUNA',
        name: 'Ketua Pembina Taruna',
        scope_type: 'global',
        unit_type: 'student',
        order: 50,
        is_active: true,
      },
      update: {},
    });

    const posAnggota = await prisma.organizationalPosition.upsert({
      where: { tenant_id_code: { tenant_id: tenantId, code: 'PEMBINA_TARUNA' } },
      create: {
        tenant_id: tenantId,
        code: 'PEMBINA_TARUNA',
        name: 'Pembina Ketarunaan',
        scope_type: 'global',
        unit_type: 'student',
        order: 51,
        is_active: true,
      },
      update: {},
    });

    // 2. Ambil seluruh penugasan panitia aktif
    // Termasuk posisi khusus ketarunaan DAN penugasan kesiswaan yang memiliki flag/title ketarunaan/tatib/disiplin
    const panitiaAssigns = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { position_id: { in: [posKetua.id, posAnggota.id] } },
          { Position: { code: { in: ['KETUA_PEMBINA_TARUNA', 'PEMBINA_TARUNA', 'KETARUNAAN'] } } },
          {
            Position: { code: 'KESISWAAN' },
            OR: [
              { assignment_flag: { in: ['SUB_KEDISIPLINAN_TATIB', 'KETARUNAAN', 'PEMBINA_TARUNA', 'KETUA'] } },
              { custom_title: { contains: 'disiplin', mode: 'insensitive' } },
              { custom_title: { contains: 'tatib', mode: 'insensitive' } },
              { custom_title: { contains: 'taruna', mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        User: {
          include: {
            Guru: true,
          },
        },
        Position: true,
      },
      orderBy: [
        { is_leader: 'desc' },
        { created_at: 'asc' },
      ],
    });

    // De-duplicate berdasarkan user_id (prioritaskan posisi KETUA_PEMBINA_TARUNA / PEMBINA_TARUNA daripada KESISWAAN generic)
    const uniqueMap = new Map<string, typeof panitiaAssigns[0]>();
    for (const a of panitiaAssigns) {
      if (!a.user_id) continue;
      const existing = uniqueMap.get(a.user_id);
      if (!existing) {
        uniqueMap.set(a.user_id, a);
      } else {
        if (existing.Position?.code === 'KESISWAAN' && a.Position?.code !== 'KESISWAAN') {
          uniqueMap.set(a.user_id, a);
        } else if (a.is_leader && !existing.is_leader) {
          uniqueMap.set(a.user_id, a);
        } else if (a.Position?.code === 'KETUA_PEMBINA_TARUNA') {
          uniqueMap.set(a.user_id, a);
        }
      }
    }
    const deduplicatedPanitia = Array.from(uniqueMap.values());

    // 3. Ex-officio leaders: Kepala Sekolah (Penanggung Jawab) & Kesiswaan (Pengarah)
    const exOfficioAssigns = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        Position: { code: { in: ['KEPALA_SEKOLAH', 'KESISWAAN'] } },
        is_active: true,
      },
      include: {
        User: {
          include: {
            Guru: true,
          },
        },
        Position: true,
      },
      orderBy: [
        { is_leader: 'desc' },
        { created_at: 'asc' },
      ],
    });

    // Cari Kepala Sekolah aktif (jika kosong karena tahun berganti, fallback ke record kepala sekolah terakhir)
    let penanggungJawab = exOfficioAssigns.find(a => a.Position?.code === 'KEPALA_SEKOLAH');
    if (!penanggungJawab) {
      penanggungJawab = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          Position: { code: 'KEPALA_SEKOLAH' },
        },
        include: {
          User: {
            include: { Guru: true },
          },
          Position: true,
        },
        orderBy: { updated_at: 'desc' },
      }) as any;
    }

    // Cari Waka Kesiswaan (prioritaskan is_leader atau tanpa assignment_flag sub-staff)
    const pengarah = exOfficioAssigns.find(a => a.Position?.code === 'KESISWAAN' && (a.is_leader || !a.assignment_flag))
      || exOfficioAssigns.find(a => a.Position?.code === 'KESISWAAN');

    const formattedPanitia = deduplicatedPanitia.map((a) => {
      const guru = a.User?.Guru;
      const isKetuaPos = a.Position?.code === 'KETUA_PEMBINA_TARUNA';
      const isLeader = Boolean(a.is_leader) || isKetuaPos;

      let flag = a.assignment_flag;
      if (!flag) {
        flag = isLeader ? 'KETUA' : 'PEMBINA_POS';
      } else if (flag === 'SUB_KEDISIPLINAN_TATIB') {
        flag = isLeader ? 'KETUA' : 'SEKSI_DISIPLIN';
      }

      let title = a.custom_title;
      if (!title) {
        title = isLeader ? 'Ketua Pembina Taruna' : 'Pembina Ketarunaan';
      }

      return {
        id: a.id,
        user_id: a.user_id,
        guru_id: guru?.id || '',
        nama_guru: guru?.nama_guru || a.User?.full_name || 'Panitia',
        nip: guru?.nip || '-',
        no_hp: guru?.no_hp || null,
        position_id: a.position_id,
        position_code: a.Position?.code || (isLeader ? 'KETUA_PEMBINA_TARUNA' : 'PEMBINA_TARUNA'),
        position_name: a.Position?.name || (isLeader ? 'Ketua Pembina Taruna' : 'Pembina Ketarunaan'),
        is_leader: isLeader,
        assignment_flag: flag,
        custom_title: title,
        is_active: a.is_active,
        created_at: a.created_at,
      };
    });

    return {
      panitia: formattedPanitia,
      ex_officio: {
        penanggung_jawab: penanggungJawab ? {
          nama: penanggungJawab.User?.Guru?.nama_guru || penanggungJawab.User?.full_name || 'Kepala Sekolah',
          nip: penanggungJawab.User?.Guru?.nip || '-',
          jabatan: 'Kepala Sekolah (Penanggung Jawab)',
        } : null,
        pengarah: pengarah ? {
          nama: pengarah.User?.Guru?.nama_guru || pengarah.User?.full_name || 'Waka Kesiswaan',
          nip: pengarah.User?.Guru?.nip || '-',
          jabatan: 'Wakil Kepala Sekolah Bidang Kesiswaan (Pengarah)',
        } : null,
      },
      positions: [posKetua, posAnggota],
    };
  }

  async assignPanitia(tenantId: string, payload: {
    guru_id: string;
    role_type: string;
    custom_title?: string;
    is_leader?: boolean;
    tahun_pelajaran_id?: string;
  }) {
    const guru = await prisma.guru.findFirst({
      where: { id: payload.guru_id, tenant_id: tenantId },
      select: { id: true, user_id: true, nama_guru: true },
    });
    if (!guru?.user_id) {
      throw new Error('Data guru tidak ditemukan atau akun pengguna belum terdaftar.');
    }

    const isLeader = payload.role_type === 'KETUA' || Boolean(payload.is_leader);

    const [posKetua, posAnggota] = await Promise.all([
      prisma.organizationalPosition.upsert({
        where: { tenant_id_code: { tenant_id: tenantId, code: 'KETUA_PEMBINA_TARUNA' } },
        create: {
          tenant_id: tenantId,
          code: 'KETUA_PEMBINA_TARUNA',
          name: 'Ketua Pembina Taruna',
          scope_type: 'global',
          unit_type: 'student',
          order: 50,
          is_active: true,
        },
        update: {},
      }),
      prisma.organizationalPosition.upsert({
        where: { tenant_id_code: { tenant_id: tenantId, code: 'PEMBINA_TARUNA' } },
        create: {
          tenant_id: tenantId,
          code: 'PEMBINA_TARUNA',
          name: 'Pembina Ketarunaan',
          scope_type: 'global',
          unit_type: 'student',
          order: 51,
          is_active: true,
        },
        update: {},
      }),
    ]);

    const targetPosition = isLeader ? posKetua : posAnggota;

    const titleMap: Record<string, string> = {
      KETUA: 'Ketua Pembina Taruna',
      WAKIL_KETUA: 'Wakil Ketua / Koordinator Operasional',
      SEKRETARIS: 'Sekretaris & Administrasi Taruna',
      BENDAHARA: 'Bendahara & Logistik',
      KORLAP: 'Koordinator Lapangan & Pelatih PBB',
      SEKSI_DISIPLIN: 'Seksi Kedisiplinan & Tata Tertib',
      PENGUJI_FISIK: 'Seksi Kesamaptaan & Penguji Fisik',
      PEMBINA_POS: 'Pembina & Instruktur Posko',
    };

    const finalTitle = payload.custom_title?.trim() || titleMap[payload.role_type] || 'Pembina Ketarunaan';

    // Cari penugasan existing guru ini di antara posisi ketarunaan
    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        position_id: { in: [posKetua.id, posAnggota.id] },
        user_id: guru.user_id,
      },
    });

    let assignment;
    if (existing) {
      assignment = await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
          position_id: targetPosition.id,
          is_active: true,
          is_leader: isLeader,
          assignment_flag: payload.role_type,
          custom_title: finalTitle,
          updated_at: new Date(),
        },
      });
    } else {
      assignment = await prisma.organizationalAssignment.create({
        data: {
          tenant_id: tenantId,
          position_id: targetPosition.id,
          user_id: guru.user_id,
          is_leader: isLeader,
          assignment_flag: payload.role_type,
          custom_title: finalTitle,
          is_active: true,
        },
      });
    }

    try {
      await cacheInvalidationService.invalidateStrukturTree(tenantId, [guru.user_id]);
    } catch {}

    return {
      success: true,
      message: `Berhasil memploting ${guru.nama_guru} sebagai ${finalTitle}`,
      data: assignment,
    };
  }

  async removePanitia(tenantId: string, assignmentId: string) {
    const existing = await prisma.organizationalAssignment.findFirst({
      where: { id: assignmentId, tenant_id: tenantId },
      include: { Position: true },
    });
    if (!existing) {
      throw new Error('Penugasan panitia tidak ditemukan.');
    }

    // Jika posisi KESISWAAN umum, jangan hapus assignment induk guru, cukup bersihkan flag ketarunaan
    if (existing.Position?.code === 'KESISWAAN') {
      await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
          assignment_flag: null,
          custom_title: null,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.organizationalAssignment.delete({
        where: { id: existing.id },
      });
    }

    try {
      if (existing.user_id) {
        await cacheInvalidationService.invalidateStrukturTree(tenantId, [existing.user_id]);
      }
    } catch {}

    return {
      success: true,
      message: 'Penugasan panitia berhasil dihapus.',
    };
  }
}

export const programKetarunaanService = new ProgramKetarunaanService();
