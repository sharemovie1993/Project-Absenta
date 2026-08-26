// @ts-nocheck
import { Hari } from '@prisma/client';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { JadwalValidationService } from '@/modules/jadwal/services/jadwal-validation.service';
import { jadwalKBMDb } from '../../services/repositories/jadwal-kbm.db';
import { applyDataScope } from '@/utils/applyDataScope';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { jadwalKBMService } from '../../services/jadwal-kbm.service';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { generateSessionsForTenantDirect, getTenantLocalTime } from '@/jobs/attendanceAutoSession.job';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { appLogger } from '@/utils/app-logger';

const validationService = new JadwalValidationService();

export class JadwalCrudController {
  private async syncSessionsToday(tenantId: string) {
    try {
      const cfg = await systemConfigService.getActive(tenantId);
      const { dateStr, timeZone } = getTenantLocalTime(cfg?.timezone, new Date());
      await generateSessionsForTenantDirect(tenantId, dateStr, timeZone);
    } catch (e) {
      console.error('Failed to auto-sync sessions for today:', e);
    }
  }

  // --- Admin Endpoints ---

  private async resolveTimes(tenantId: string, kelasId: string, slotIndex: number, defaultStart?: string, defaultEnd?: string) {
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'shift_jam_pelajaran' }
    });
    if (config?.value) {
      try {
        const shiftConfig = JSON.parse(config.value);
        const assignedShiftId = shiftConfig.class_assignments?.[kelasId] || 'pagi';
        const shift = shiftConfig.shifts?.find((s: any) => s.id === assignedShiftId) || shiftConfig.shifts?.[0];
        if (shift) {
          const slot = shift.slots?.find((sl: any) => sl.slot === slotIndex);
          if (slot) {
            return { start: slot.start, end: slot.end };
          }
        }
      } catch (e) {
        console.error('Failed to parse shift config on backend', e);
      }
    }
    const SLOT_TIME: Record<number, { start: string; end: string }> = {
      1: { start: "07:00", end: "07:45" },
      2: { start: "07:45", end: "08:30" },
      3: { start: "08:30", end: "09:15" },
      4: { start: "09:35", end: "10:20" },
      5: { start: "10:20", end: "11:05" },
      6: { start: "11:05", end: "11:50" },
      7: { start: "12:30", end: "13:15" },
      8: { start: "13:15", end: "14:00" },
      9: { start: "14:00", end: "14:45" },
      10: { start: "14:45", end: "15:30" },
    };
    const fallback = SLOT_TIME[slotIndex] || { start: defaultStart || "07:00", end: defaultEnd || "07:45" };
    return { start: fallback.start, end: fallback.end };
  }

  private async resolveSlotIndex(tenantId: string, kelasId: string, jamMulai: string): Promise<number> {
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'shift_jam_pelajaran' }
    });
    if (config?.value) {
      try {
        const shiftConfig = JSON.parse(config.value);
        const assignedShiftId = shiftConfig.class_assignments?.[kelasId] || 'pagi';
        const shift = shiftConfig.shifts?.find((s: any) => s.id === assignedShiftId) || shiftConfig.shifts?.[0];
        if (shift) {
          const slot = shift.slots?.find((sl: any) => sl.start === jamMulai || sl.start.startsWith(jamMulai));
          if (slot) {
            return slot.slot;
          }
        }
      } catch (e) {
        console.error('Failed to parse shift config for slot_index lookup', e);
      }
    }
    const fallbacks: Record<string, number> = {
      "07:00": 1, "07:45": 2, "08:30": 3, "09:35": 4, "10:20": 5, "11:05": 6, "12:30": 7, "13:15": 8, "14:00": 9, "14:45": 10
    };
    return fallbacks[jamMulai] || 1;
  }

  async create(request: any, reply: any) {
    const { tenantId, user } = request;
    let {
      tahun_pelajaran_id,
      semester_id,
      kelas_id,
      guru_id,
      mapel_id,
      jenis_kegiatan,
      hari,
      slot_index,
      jam_mulai,
      jam_selesai,
    } = request.body;

    const isValidTime = (t: any) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);

    try {
      const isGlobalManager =
        user?.roleName === 'ADMIN' ||
        user?.roleName === 'SUPERADMIN' ||
        (user?.id ? (
          await authorizationService.hasUserPermission(user.id, 'academic.structure.manage') ||
          await authorizationService.hasUserPermission(user.id, 'attendance.schedules.create')
        ) : false);

      if ((user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) && !isGlobalManager) {
        const ctx = await this.getAuthorizedContext(request, reply);
        if (!ctx) return;

        kelas_id = ctx.kelasId;
        tahun_pelajaran_id = ctx.tahunPelajaranId;
        semester_id = ctx.semesterId;
      }

      if (!hari) {
        return reply.status(400).send({ success: false, message: 'Hari wajib diisi' });
      }

      // Resolve slot_index and times
      let resolvedSlot = slot_index !== undefined ? Number(slot_index) : undefined;
      if (resolvedSlot === undefined && jam_mulai) {
        resolvedSlot = await this.resolveSlotIndex(tenantId, kelas_id, jam_mulai);
      }
      if (resolvedSlot === undefined) {
        resolvedSlot = 1;
      }

      const times = await this.resolveTimes(tenantId, kelas_id, resolvedSlot, jam_mulai, jam_selesai);
      jam_mulai = times.start;
      jam_selesai = times.end;

      if (!isValidTime(jam_mulai) || !isValidTime(jam_selesai)) {
        return reply.status(400).send({ success: false, message: 'Jam mulai/jam selesai wajib format HH:mm' });
      }

      const validationResult = await validationService.validateConflict({
        tenant_id: tenantId,
        tahun_pelajaran_id,
        semester_id,
        hari,
        jam_mulai,
        jam_selesai,
        slot_index: resolvedSlot,
        kelas_id,
        guru_id,
      });

      if (!validationResult.is_valid) {
        return reply.status(409).send({
          success: false,
          message: validationResult.error?.message,
          code: validationResult.error?.code,
          details: validationResult.error?.details,
        });
      }

      const jadwal = await jadwalKBMDb.jadwalKBM.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id,
          semester_id,
          kelas_id,
          guru_id,
          mapel_id,
          jenis_kegiatan: jenis_kegiatan || 'KBM',
          hari,
          slot_index: resolvedSlot,
          jam_mulai,
          jam_selesai,
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
          Kelas: { select: { nama_kelas: true } },
        },
      });

      // Auto-sync sessions for today in background (organic behavior)
      void this.syncSessionsToday(tenantId);
      await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

      return reply.send({ success: true, data: jadwal });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return reply.status(409).send({ success: false, message: 'Jadwal bentrok (duplikasi slot waktu)' });
      }
      throw e;
    }
  }

  async update(request: any, reply: any) {
    const { tenantId, user } = request;
    const { id } = request.params;
    let {
      tahun_pelajaran_id,
      semester_id,
      kelas_id,
      guru_id,
      mapel_id,
      jenis_kegiatan,
      hari,
      slot_index,
      jam_mulai,
      jam_selesai,
    } = request.body;

    const isValidTime = (t: any) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);

    // Check existence
    const existing = await jadwalKBMDb.jadwalKBM.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, message: 'Jadwal Template not found' });
    }

    const isGlobalManager =
      user?.roleName === 'ADMIN' ||
      user?.roleName === 'SUPERADMIN' ||
      (user?.id ? (
        await authorizationService.hasUserPermission(user.id, 'academic.structure.manage') ||
        await authorizationService.hasUserPermission(user.id, 'attendance.schedules.create')
      ) : false);

    // Enforce SISWA/GURU Context
    if ((user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) && !isGlobalManager) {
      const ctx = await this.getAuthorizedContext(request, reply);
      if (!ctx) return;

      // Ensure user can only update schedules for their authorized class
      if (existing.kelas_id !== ctx.kelasId) {
        return reply.status(403).send({ success: false, message: 'Forbidden: You can only update schedules for your own class' });
      }
      
      kelas_id = ctx.kelasId;
      tahun_pelajaran_id = ctx.tahunPelajaranId;
      semester_id = ctx.semesterId;
    }

    // Resolve slot_index and times
    let resolvedSlot = slot_index !== undefined ? Number(slot_index) : existing.slot_index;
    const targetKelas = kelas_id || existing.kelas_id;
    
    // Resolve times based on effective slot_index
    const times = await this.resolveTimes(tenantId, targetKelas, resolvedSlot, jam_mulai || existing.jam_mulai, jam_selesai || existing.jam_selesai);
    
    const effectiveHari = hari || existing.hari;
    const effectiveMulai = times.start;
    const effectiveSelesai = times.end;

    if (!effectiveHari) {
      return reply.status(400).send({ success: false, message: 'Hari wajib diisi' });
    }
    if (!isValidTime(effectiveMulai) || !isValidTime(effectiveSelesai)) {
      return reply.status(400).send({ success: false, message: 'Jam mulai/jam selesai wajib format HH:mm' });
    }

    const validationResult = await validationService.validateConflict({
      tenant_id: tenantId,
      tahun_pelajaran_id: tahun_pelajaran_id || existing.tahun_pelajaran_id,
      semester_id: semester_id || existing.semester_id,
      hari: effectiveHari,
      jam_mulai: effectiveMulai,
      jam_selesai: effectiveSelesai,
      slot_index: resolvedSlot,
      kelas_id: targetKelas,
      guru_id: guru_id === undefined ? existing.guru_id || undefined : guru_id,
      exclude_jadwal_kbm_id: id,
    });

    if (!validationResult.is_valid) {
      return reply.status(409).send({
        success: false,
        message: validationResult.error?.message,
        code: validationResult.error?.code,
        details: validationResult.error?.details,
      });
    }

    try {
      const jadwal = await jadwalKBMDb.jadwalKBM.update({
        where: { id },
        data: {
          tahun_pelajaran_id,
          semester_id,
          kelas_id,
          guru_id,
          mapel_id,
          jenis_kegiatan,
          hari,
          slot_index: resolvedSlot,
          jam_mulai: effectiveMulai,
          jam_selesai: effectiveSelesai,
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
          Kelas: { select: { nama_kelas: true } },
        },
      });

      // Auto-sync sessions for today in background (organic behavior)
      void this.syncSessionsToday(tenantId);
      await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

      return reply.send({ success: true, data: jadwal });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return reply.status(409).send({ success: false, message: 'Jadwal bentrok (duplikasi slot waktu)' });
      }
      throw e;
    }
  }

  async delete(request: any, reply: any) {
    const { tenantId, user } = request;
    const { id } = request.params;

    const existing = await jadwalKBMDb.jadwalKBM.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, message: 'Jadwal Template not found' });
    }

    const isGlobalManager =
      user?.roleName === 'ADMIN' ||
      user?.roleName === 'SUPERADMIN' ||
      (user?.id ? (
        await authorizationService.hasUserPermission(user.id, 'academic.structure.manage') ||
        await authorizationService.hasUserPermission(user.id, 'attendance.schedules.create')
      ) : false);

    // Enforce SISWA/GURU Context
    if ((user?.roleName === RoleName.SISWA || user?.roleName === RoleName.GURU) && !isGlobalManager) {
      const ctx = await this.getAuthorizedContext(request, reply);
      if (!ctx) return;

      // Ensure user can only delete schedules for their authorized class
      if (existing.kelas_id !== ctx.kelasId) {
        return reply.status(403).send({ success: false, message: 'Forbidden: You can only delete schedules for your own class' });
      }
    }

    await jadwalKBMDb.jadwalKBM.delete({
      where: { id },
    });

    await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

    return reply.send({ success: true, message: 'Jadwal Template deleted' });
  }

  async clearAll(request: any, reply: any) {
    const { tenantId, user } = request;
    const { kelas_id, guru_id } = request.body || {};

    const isGlobalManager =
      user?.roleName === 'ADMIN' ||
      user?.roleName === 'SUPERADMIN' ||
      (user?.id ? (
        await authorizationService.hasUserPermission(user.id, 'academic.structure.manage') ||
        await authorizationService.hasUserPermission(user.id, 'academic.schedules.delete') ||
        await authorizationService.hasUserPermission(user.id, 'attendance.schedules.delete')
      ) : false);

    if (!isGlobalManager) {
      return reply.status(403).send({ success: false, message: 'Forbidden: Hanya pengelola yang dapat mengosongkan/reset jadwal.' });
    }

    try {
      const jadwalWhere: any = { 
        tenant_id: tenantId,
        slot_index: { not: 0 }, // Protect Slot Jam 0 (Upacara / Pembiasaan) from deletion
      };
      const sesiWhere: any = { tenant_id: tenantId };

      if (kelas_id && typeof kelas_id === 'string' && kelas_id.trim()) {
        jadwalWhere.kelas_id = kelas_id.trim();
        sesiWhere.kelas_id = kelas_id.trim();
      }
      if (guru_id && typeof guru_id === 'string' && guru_id.trim()) {
        jadwalWhere.guru_id = guru_id.trim();
        sesiWhere.guru_id = guru_id.trim();
      }

      // 1. Find and delete all matching SesiAbsensi and child attendance logs
      const targetSesi = await prisma.sesiAbsensi.findMany({
        where: sesiWhere,
        select: { id: true }
      });
      const targetSesiIds = targetSesi.map(s => s.id);
      if (targetSesiIds.length > 0) {
        await prisma.absenSiswa.deleteMany({ where: { sesi_id: { in: targetSesiIds } } });
        await prisma.absenGuru.deleteMany({ where: { sesi_id: { in: targetSesiIds } } });
        await prisma.sesiAbsensi.deleteMany({ where: { id: { in: targetSesiIds } } });
      }

      // 2. Delete JadwalKBM (Except slot_index: 0)
      const resJadwal = await prisma.jadwalKBM.deleteMany({
        where: jadwalWhere
      });

      const totalDeleted = resJadwal.count + targetSesiIds.length;

      // Auto-sync sessions for today in background
      void this.syncSessionsToday(tenantId);

      if (totalDeleted > 0) {
        await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
        return reply.send({
          success: true,
          message: `Berhasil mengosongkan/reset ${totalDeleted} item (Jadwal KBM & Sesi Absensi, Slot Jam 0 tetap aman).`,
          count: totalDeleted,
        });
      }

      // Force fallback purge across entire tenant if initial match returned 0 (protecting slot_index 0)
      const forceJadwal = await prisma.jadwalKBM.deleteMany({
        where: { tenant_id: tenantId, slot_index: { not: 0 } }
      });
      const forceTotal = forceJadwal.count;

      if (forceTotal > 0) {
        await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
        return reply.send({
          success: true,
          message: `Berhasil mengosongkan/reset ${forceTotal} jadwal KBM (Slot Jam 0 tetap aman).`,
          count: forceTotal
        });
      }

      return reply.send({
        success: true,
        message: 'Jadwal KBM dan Sesi Absensi sudah dalam keadaan kosong.',
        count: 0
      });
    } catch (err: any) {
      console.error('Error in clearAll schedules:', err);
      return reply.status(500).send({
        success: false,
        message: err?.message || 'Gagal mengosongkan jadwal KBM'
      });
    }
  }

}
