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

  async getStats(tenantId: string, params?: { tahun_pelajaran_id?: string; semester_id?: string; jadwal_kegiatan_id?: string }) {
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
    const panitiaAssigns = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        position_id: { in: [posKetua.id, posAnggota.id] },
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
    });

    const penanggungJawab = exOfficioAssigns.find(a => a.Position?.code === 'KEPALA_SEKOLAH');
    const pengarah = exOfficioAssigns.find(a => a.Position?.code === 'KESISWAAN');

    const formattedPanitia = panitiaAssigns.map((a) => {
      const guru = a.User?.Guru;
      return {
        id: a.id,
        user_id: a.user_id,
        guru_id: guru?.id || '',
        nama_guru: guru?.nama_guru || a.User?.name || 'Panitia',
        nip: guru?.nip || '-',
        no_hp: guru?.no_hp || null,
        position_id: a.position_id,
        position_code: a.Position?.code || 'PEMBINA_TARUNA',
        position_name: a.Position?.name || 'Pembina Ketarunaan',
        is_leader: Boolean(a.is_leader),
        assignment_flag: a.assignment_flag || (a.is_leader ? 'KETUA' : 'PEMBINA_POS'),
        custom_title: a.custom_title || (a.is_leader ? 'Ketua Pembina Taruna' : 'Pembina Ketarunaan'),
        is_active: a.is_active,
        created_at: a.created_at,
      };
    });

    return {
      panitia: formattedPanitia,
      ex_officio: {
        penanggung_jawab: penanggungJawab ? {
          nama: penanggungJawab.User?.Guru?.nama_guru || penanggungJawab.User?.name,
          nip: penanggungJawab.User?.Guru?.nip || '-',
          jabatan: 'Kepala Sekolah (Penanggung Jawab)',
        } : null,
        pengarah: pengarah ? {
          nama: pengarah.User?.Guru?.nama_guru || pengarah.User?.name,
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
    const posCode = isLeader ? 'KETUA_PEMBINA_TARUNA' : 'PEMBINA_TARUNA';

    const position = await prisma.organizationalPosition.upsert({
      where: { tenant_id_code: { tenant_id: tenantId, code: posCode } },
      create: {
        tenant_id: tenantId,
        code: posCode,
        name: isLeader ? 'Ketua Pembina Taruna' : 'Pembina Ketarunaan',
        scope_type: 'global',
        unit_type: 'student',
        order: isLeader ? 50 : 51,
        is_active: true,
      },
      update: {},
    });

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

    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        position_id: position.id,
        user_id: guru.user_id,
      },
    });

    let assignment;
    if (existing) {
      assignment = await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
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
          position_id: position.id,
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
    });
    if (!existing) {
      throw new Error('Penugasan panitia tidak ditemukan.');
    }

    await prisma.organizationalAssignment.delete({
      where: { id: existing.id },
    });

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
