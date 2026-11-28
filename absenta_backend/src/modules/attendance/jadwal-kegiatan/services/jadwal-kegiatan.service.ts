import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';
import { Hari } from '@prisma/client';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';
import { getTenantLocalTime, generateSessionsForTenantDirect } from '@/jobs/attendanceAutoSession.job';
import {
  getAvailableKegiatanPositions,
  resolveJadwalKegiatanPolicy,
} from '../../unified-kegiatan/services/kegiatan-wajib-config.helper';

export interface CreateJadwalKegiatanInput {
  nama: string;
  jenis_kegiatan: string;
  hari: Hari[];
  waktu_mulai: string;
  waktu_selesai?: string | null;
  target_semua_kelas: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai: string; // YYYY-MM-DD
  berlaku_sampai?: string | null; // YYYY-MM-DD
  tahun_pelajaran_id?: string;
  wajib_tap_terminal_guru?: boolean;
  wajib_guru_beririsan?: boolean;
  wajib_position_ids?: string[];
}

export interface UpdateJadwalKegiatanInput {
  nama?: string;
  jenis_kegiatan?: string;
  hari?: Hari[];
  waktu_mulai?: string;
  waktu_selesai?: string | null;
  target_semua_kelas?: boolean;
  target_kelas_ids?: string[];
  berlaku_mulai?: string;
  berlaku_sampai?: string | null;
  aktif?: boolean;
  wajib_tap_terminal_guru?: boolean;
  wajib_guru_beririsan?: boolean;
  wajib_position_ids?: string[];
}

export interface UpdateJadwalKegiatanPolicyInput {
  wajib_tap_terminal_guru: boolean;
  wajib_guru_beririsan: boolean;
  wajib_position_ids: string[];
  jadwal_kegiatan_ids?: string[];
}

export class JadwalKegiatanService {
  private async syncTodayActivitySessions(tenantId: string) {
    try {
      const tz = await getTenantTimezone(tenantId);
      const { dateStr, timeZone } = getTenantLocalTime(tz, new Date());
      await generateSessionsForTenantDirect(tenantId, dateStr, timeZone);
    } catch {
      // Non-blocking sync
    }
  }

  /**
   * Memperbarui waktu & membuka kembali sesi hari ini yang terlanjur ditutup/lewat
   * saat JadwalKegiatan diubah secara mendadak (hanya menyentuh tanggal hari ini).
   */
  private async resyncUpdatedTodayActivitySessions(
    tenantId: string,
    kegiatan: { id: string; nama: string; waktu_mulai: string; waktu_selesai: string | null },
    previousNama?: string
  ) {
    try {
      const tz = await getTenantTimezone(tenantId);
      const tzOffset = getTenantOffsetString(tz);
      const { dateStr } = getTenantLocalTime(tz, new Date());

      const startOfDay = new Date(`${dateStr}T00:00:00.000${tzOffset}`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999${tzOffset}`);
      const newWaktuMulai = new Date(`${dateStr}T${kegiatan.waktu_mulai.slice(0, 5)}:00.000${tzOffset}`);
      const newWaktuSelesai = kegiatan.waktu_selesai
        ? new Date(`${dateStr}T${kegiatan.waktu_selesai.slice(0, 5)}:00.000${tzOffset}`)
        : new Date(newWaktuMulai.getTime() + 60 * 60 * 1000);

      const orConditions: any[] = [
        { jadwal_kegiatan_id: kegiatan.id },
        { jenis_kegiatan: { equals: kegiatan.nama, mode: 'insensitive' } },
      ];
      if (previousNama && previousNama.toLowerCase() !== kegiatan.nama.toLowerCase()) {
        orConditions.push({ jenis_kegiatan: { equals: previousNama, mode: 'insensitive' } });
      }

      const todaySessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
          OR: orConditions,
        },
        select: {
          id: true,
          status: true,
          _count: {
            select: { AbsenSiswa: true, AbsenGuru: true },
          },
        },
      });

      const now = new Date();
      const canReopen = newWaktuSelesai.getTime() > now.getTime();

      for (const s of todaySessions) {
        const hasAnyTap = (s._count?.AbsenSiswa || 0) > 0 || (s._count?.AbsenGuru || 0) > 0;
        const nextStatus =
          canReopen && s.status === 'SELESAI'
            ? (hasAnyTap ? 'BERLANGSUNG' : 'MENDATANG')
            : s.status;

        await prisma.sesiAbsensi.update({
          where: { id: s.id },
          data: {
            jadwal_kegiatan_id: kegiatan.id,
            waktu_mulai: newWaktuMulai,
            waktu_selesai: newWaktuSelesai,
            jenis_kegiatan: kegiatan.nama,
            status: nextStatus,
            updated_at: new Date(),
          },
        });
      }
    } catch {
      // Non-blocking resync
    }
  }

  /**
   * Validasi bentrok waktu antara jadwal ESKUL dengan kegiatan PEMBIASAAN kesiswaan.
   * Aturan Bisnis:
   * 1. Jadwal ESKUL TIDAK BOLEH bertabrakan waktu dengan kegiatan PEMBIASAAN kesiswaan
   *    (Upacara, Ketarunaan, Apel, Duha).
   * 2. Bentrok antar-ESKUL DIPERBOLEHKAN (paralel).
   */
  async validateEskulConflictWithPembiasaan(
    tenantId: string,
    nama: string,
    jenisKegiatan: string,
    hariList: Hari[],
    waktuMulai: string,
    waktuSelesai?: string | null,
    currentId?: string
  ) {
    if (!hariList || hariList.length === 0 || !waktuMulai) return;

    // Cek apakah jenis kegiatan ini tergolong ESKUL
    let isEskul = jenisKegiatan === 'ESKUL';
    if (!isEskul) {
      const master = await prisma.jenisKegiatanMaster.findFirst({
        where: {
          tenant_id: tenantId,
          nama: { equals: nama.trim(), mode: 'insensitive' },
        },
      });
      isEskul = master?.tipe === 'ESKUL';
    }

    if (!isEskul) return; // Jika kegiatan kesiswaan/pembiasaan, lewati

    const proposedMulai = waktuMulai.slice(0, 5);
    const proposedSelesai = waktuSelesai && waktuSelesai.trim() !== '' ? waktuSelesai.slice(0, 5) : '23:59';

    // Cari seluruh jadwal PEMBIASAAN aktif di tenant ini
    const pembiasaans = await prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: tenantId,
        aktif: true,
        jenis_kegiatan: 'PEMBIASAAN',
        ...(currentId ? { id: { not: currentId } } : {}),
      },
    });

    for (const p of pembiasaans) {
      // Cek apakah ada irisan hari
      const sharedDays = p.hari.filter((d: Hari) => hariList.includes(d));
      if (sharedDays.length === 0) continue;

      const pMulai = p.waktu_mulai.slice(0, 5);
      const pSelesai = p.waktu_selesai && p.waktu_selesai.trim() !== '' ? p.waktu_selesai.slice(0, 5) : '23:59';

      // Overlap: (proposedMulai < pSelesai) && (proposedSelesai > pMulai)
      const isOverlap = proposedMulai < pSelesai && proposedSelesai > pMulai;

      if (isOverlap) {
        const dayLabels = sharedDays.join(', ');
        throw new Error(
          `Jadwal eskul "${nama}" bentrok dengan kegiatan kesiswaan "${p.nama}" pada hari ${dayLabels} (${pMulai} - ${p.waktu_selesai || 'selesai'}). Silakan atur jam pelaksanaan di luar jadwal kesiswaan.`
        );
      }
    }
  }

  async getAll(scope: DataScope, activeOnly = false) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    const rows = await prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: scope.tenantId,
        ...(activeOnly ? { aktif: true } : {}),
      },
      include: {
        WajibPositions: {
          select: {
            position_id: true,
            Position: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => ({
      ...row,
      wajib_position_ids: row.WajibPositions.map((p) => p.position_id),
      wajib_position_codes: row.WajibPositions.map((p) => p.Position?.code).filter(Boolean),
    }));
  }

  async getById(scope: DataScope, id: string) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    const record = await prisma.jadwalKegiatan.findFirst({
      where: { id, tenant_id: scope.tenantId },
      include: {
        WajibPositions: {
          select: {
            position_id: true,
            Position: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!record) {
      throw new Error('Jadwal Kegiatan tidak ditemukan atau akses ditolak');
    }

    return {
      ...record,
      wajib_position_ids: record.WajibPositions.map((p) => p.position_id),
      wajib_position_codes: record.WajibPositions.map((p) => p.Position?.code).filter(Boolean),
    };
  }

  /**
   * Ringkasan kebijakan relasional presensi guru per JadwalKegiatan (dikelompokkan per nama kegiatan)
   * + daftar posisi OrganizationalPosition aktif untuk UI 2 arah (Jadwal Kegiatan Kesiswaan & Aturan Absensi).
   */
  async getPolicySummary(scope: DataScope) {
    if (!scope.tenantId) throw new Error('Tenant ID required');
    const tenantId = scope.tenantId;

    const [availablePositions, jadwalRows] = await Promise.all([
      getAvailableKegiatanPositions(tenantId),
      prisma.jadwalKegiatan.findMany({
        where: { tenant_id: tenantId, aktif: true },
        include: {
          WajibPositions: {
            select: {
              position_id: true,
              Position: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: [{ waktu_mulai: 'asc' }, { nama: 'asc' }],
      }),
    ]);

    const positionIdByCode = new Map(availablePositions.map((p) => [p.code.toUpperCase(), p.id]));

    // Kelompokkan baris matrix (nama kegiatan sama, beda hari/jam) agar 1 kartu pengaturan per kegiatan
    const groupedMap = new Map<string, typeof jadwalRows>();
    for (const row of jadwalRows) {
      const key = String(row.nama || '').trim().toLowerCase() || row.id;
      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(row);
    }

    const policies = Array.from(groupedMap.values()).map((group) => {
      const primary = group.find((g) => g.wajib_positions_configured) || group[0];
      const resolved = resolveJadwalKegiatanPolicy(primary);

      const resolvedPositionIds = resolved.wajibPositionsConfigured
        ? resolved.orgPositionIds
        : resolved.orgPositionCodes
            .map((code) => positionIdByCode.get(code.toUpperCase()))
            .filter((id): id is string => Boolean(id));

      const allDays = Array.from(new Set(group.flatMap((g) => g.hari || [])));

      return {
        id: primary.id,
        jadwal_kegiatan_ids: group.map((g) => g.id),
        nama: primary.nama,
        jenis_kegiatan: primary.jenis_kegiatan,
        hari: allDays,
        waktu_mulai: primary.waktu_mulai,
        waktu_selesai: primary.waktu_selesai,
        aktif: primary.aktif,
        is_apel_pulang: resolved.isApelPulang,
        is_dhuha: resolved.isDhuha,
        wajib_tap_terminal_guru: resolved.wajibTapTerminalGuru,
        wajib_guru_beririsan: resolved.wajibGuruBeririsan,
        wajib_positions_configured: resolved.wajibPositionsConfigured,
        wajib_position_ids: Array.from(new Set(resolvedPositionIds)),
        wajib_position_codes: resolved.orgPositionCodes,
      };
    });

    return {
      available_positions: availablePositions,
      policies,
    };
  }

  /**
   * Simpan kebijakan relasional 2-tier per JadwalKegiatan (menyinkronkan seluruh hari dalam grup kegiatan yang sama).
   */
  async updatePolicy(scope: DataScope, id: string, input: UpdateJadwalKegiatanPolicyInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');
    const tenantId = scope.tenantId;

    const primary = await prisma.jadwalKegiatan.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, nama: true },
    });
    if (!primary) {
      throw new Error('Jadwal Kegiatan tidak ditemukan atau akses ditolak');
    }

    const candidateIds = Array.from(
      new Set([id, ...(Array.isArray(input.jadwal_kegiatan_ids) ? input.jadwal_kegiatan_ids : [])])
    );

    // Pastikan seluruh target jadwal milik tenant ini (termasuk baris matrix dengan nama sama)
    const targetJadwals = await prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: { in: candidateIds } },
          { nama: { equals: primary.nama, mode: 'insensitive' }, aktif: true },
        ],
      },
      select: { id: true },
    });
    const targetIds = targetJadwals.map((j) => j.id);

    // Validasi foreign key position_id milik tenant ini
    const rawPosIds = Array.isArray(input.wajib_position_ids)
      ? Array.from(new Set(input.wajib_position_ids.filter(Boolean)))
      : [];

    const validPositions = rawPosIds.length > 0
      ? await prisma.organizationalPosition.findMany({
          where: { tenant_id: tenantId, id: { in: rawPosIds }, is_active: true },
          select: { id: true, code: true },
        })
      : [];
    const validPosIds = validPositions.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      await tx.jadwalKegiatan.updateMany({
        where: { tenant_id: tenantId, id: { in: targetIds } },
        data: {
          wajib_tap_terminal_guru: Boolean(input.wajib_tap_terminal_guru),
          wajib_guru_beririsan: Boolean(input.wajib_guru_beririsan),
          wajib_positions_configured: true,
        },
      });

      await tx.jadwalKegiatanWajibPosition.deleteMany({
        where: { tenant_id: tenantId, jadwal_kegiatan_id: { in: targetIds } },
      });

      if (validPosIds.length > 0) {
        const joinRows = targetIds.flatMap((jkId) =>
          validPosIds.map((positionId) => ({
            tenant_id: tenantId,
            jadwal_kegiatan_id: jkId,
            position_id: positionId,
          }))
        );
        await tx.jadwalKegiatanWajibPosition.createMany({
          data: joinRows,
          skipDuplicates: true,
        });
      }
    });

    await cacheInvalidationService.invalidateAttendanceCache(tenantId);

    return {
      jadwal_kegiatan_ids: targetIds,
      wajib_tap_terminal_guru: Boolean(input.wajib_tap_terminal_guru),
      wajib_guru_beririsan: Boolean(input.wajib_guru_beririsan),
      wajib_positions_configured: true,
      wajib_position_ids: validPosIds,
      wajib_position_codes: validPositions.map((p) => p.code),
    };
  }

  async create(scope: DataScope, userId: string, input: CreateJadwalKegiatanInput) {
    if (!scope.tenantId) throw new Error('Tenant ID required');

    // Validasi format jam (mendukung HH:mm maupun HH:mm:ss dari input time browser)
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!input?.waktu_mulai || !timeRegex.test(input.waktu_mulai) || (input.waktu_selesai && !timeRegex.test(input.waktu_selesai))) {
      throw new Error('Format waktu_mulai dan waktu_selesai harus HH:mm');
    }

    const cleanMulai = input.waktu_mulai.slice(0, 5);
    const cleanSelesai = input.waktu_selesai ? input.waktu_selesai.slice(0, 5) : null;

    await this.validateEskulConflictWithPembiasaan(
      scope.tenantId,
      input.nama,
      input.jenis_kegiatan,
      input.hari,
      cleanMulai,
      cleanSelesai
    );

    let tpId = input.tahun_pelajaran_id;
    if (!tpId || tpId.trim() === '') {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: scope.tenantId, is_active: true }
      }) || await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: scope.tenantId }
      });
      if (!activeTp) throw new Error('Tahun Pelajaran tidak ditemukan di sistem');
      tpId = activeTp.id;
    }

    const created = await prisma.jadwalKegiatan.create({
      data: {
        tenant_id: scope.tenantId,
        nama: input.nama,
        jenis_kegiatan: input.jenis_kegiatan,
        hari: input.hari,
        waktu_mulai: cleanMulai,
        waktu_selesai: cleanSelesai,
        target_semua_kelas: input.target_semua_kelas ?? true,
        target_kelas_ids: input.target_kelas_ids || [],
        berlaku_mulai: new Date(input.berlaku_mulai),
        berlaku_sampai: input.berlaku_sampai ? new Date(input.berlaku_sampai) : null,
        tahun_pelajaran_id: tpId,
        dibuat_oleh: userId || 'system',
        aktif: true,
      },
    });

    await this.syncTodayActivitySessions(scope.tenantId);
    await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
    await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    return created;
  }

  async update(scope: DataScope, id: string, input: UpdateJadwalKegiatanInput) {
    // Pastikan record ada dan milik tenant tersebut
    const existing = await this.getById(scope, id);

    if (scope.tenantId) {
      const targetNama = input.nama ?? existing.nama;
      const targetJenis = input.jenis_kegiatan ?? existing.jenis_kegiatan;
      const targetHari = input.hari ?? existing.hari;
      const targetMulai = input.waktu_mulai ? input.waktu_mulai.slice(0, 5) : existing.waktu_mulai;
      const targetSelesai = input.waktu_selesai !== undefined
        ? (input.waktu_selesai ? input.waktu_selesai.slice(0, 5) : null)
        : existing.waktu_selesai;

      await this.validateEskulConflictWithPembiasaan(
        scope.tenantId,
        targetNama,
        targetJenis,
        targetHari,
        targetMulai,
        targetSelesai,
        id
      );
    }

    const data: any = {};
    if (input.nama !== undefined) data.nama = input.nama;
    if (input.jenis_kegiatan !== undefined) data.jenis_kegiatan = input.jenis_kegiatan;
    if (input.hari !== undefined) data.hari = input.hari;
    if (input.waktu_mulai !== undefined) data.waktu_mulai = input.waktu_mulai.slice(0, 5);
    if (input.waktu_selesai !== undefined) data.waktu_selesai = input.waktu_selesai ? input.waktu_selesai.slice(0, 5) : null;
    if (input.target_semua_kelas !== undefined) data.target_semua_kelas = input.target_semua_kelas;
    if (input.target_kelas_ids !== undefined) data.target_kelas_ids = input.target_kelas_ids;
    if (input.berlaku_mulai !== undefined) data.berlaku_mulai = new Date(input.berlaku_mulai);
    if (input.berlaku_sampai !== undefined) data.berlaku_sampai = input.berlaku_sampai ? new Date(input.berlaku_sampai) : null;
    if (input.aktif !== undefined) data.aktif = input.aktif;

    const updated = await prisma.jadwalKegiatan.update({
      where: { id },
      data,
    });

    if (scope.tenantId) {
      if (input.aktif === false) {
        await prisma.sesiAbsensi.deleteMany({
          where: { tenant_id: scope.tenantId, jadwal_kegiatan_id: id, status: 'MENDATANG' },
        });
      } else {
        await this.resyncUpdatedTodayActivitySessions(scope.tenantId, updated, existing.nama);
        await this.syncTodayActivitySessions(scope.tenantId);
      }
      await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
      await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    }
    return updated;
  }

  async delete(scope: DataScope, id: string) {
    await this.getById(scope, id);

    if (scope.tenantId) {
      await prisma.sesiAbsensi.deleteMany({
        where: { tenant_id: scope.tenantId, jadwal_kegiatan_id: id, status: 'MENDATANG' },
      });
    }

    const deleted = await prisma.jadwalKegiatan.delete({
      where: { id },
    });

    if (scope.tenantId) {
      await cacheInvalidationService.invalidateAttendanceCache(scope.tenantId);
      await cacheInvalidationService.invalidatePelanggaranCache(scope.tenantId);
    }
    return deleted;
  }
}

export const jadwalKegiatanService = new JadwalKegiatanService();
