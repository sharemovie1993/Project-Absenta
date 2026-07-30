import { JadwalPiketService } from '../services/jadwal-piket.service';
import {
  createJadwalPiketSchema,
  bulkCreateJadwalPiketSchema,
  updateJadwalPiketSchema,
  queryJadwalPiketSchema
} from '../schemas/jadwal-piket.schema';
import { z } from 'zod';
import { Hari } from '@prisma/client';

export class JadwalPiketController {
  private service: JadwalPiketService;

  constructor() {
    this.service = new JadwalPiketService();
  }

  async getList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const parsedQuery = queryJadwalPiketSchema.parse(request.query || {});
      const data = await this.service.getJadwalPiketList(tenantId, {
        tahun_pelajaran_id: parsedQuery.tahun_pelajaran_id,
        semester_id: parsedQuery.semester_id,
        hari: parsedQuery.hari as Hari | undefined,
        guru_id: parsedQuery.guru_id
      });

      return reply.send({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getHariIni(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await this.service.getJadwalPiketHariIni(tenantId);
      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async create(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const parsed = createJadwalPiketSchema.parse(request.body);
      const data = await this.service.createJadwalPiket(tenantId, {
        tahun_pelajaran_id: parsed.tahun_pelajaran_id,
        semester_id: parsed.semester_id,
        guru_id: parsed.guru_id,
        hari: parsed.hari as Hari,
        pos_piket: parsed.pos_piket,
        slot_mulai: parsed.slot_mulai,
        slot_selesai: parsed.slot_selesai,
        jam_mulai: parsed.jam_mulai,
        jam_selesai: parsed.jam_selesai,
        catatan: parsed.catatan
      });

      return reply.status(201).send({
        success: true,
        message: 'Jadwal piket guru berhasil ditambahkan',
        data
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async bulkCreate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const parsed = bulkCreateJadwalPiketSchema.parse(request.body);
      const data = await this.service.bulkAssignJadwalPiket(tenantId, {
        tahun_pelajaran_id: parsed.tahun_pelajaran_id,
        semester_id: parsed.semester_id,
        hari: parsed.hari as Hari,
        guru_ids: parsed.guru_ids,
        pos_piket: parsed.pos_piket,
        slot_mulai: parsed.slot_mulai,
        slot_selesai: parsed.slot_selesai,
        jam_mulai: parsed.jam_mulai,
        jam_selesai: parsed.jam_selesai
      });

      return reply.status(201).send({
        success: true,
        message: `${data.length} penugasan piket guru berhasil dibuat`,
        data
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async update(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      const { id } = request.params;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const parsed = updateJadwalPiketSchema.parse(request.body);
      const data = await this.service.updateJadwalPiket(tenantId, id, {
        hari: parsed.hari as Hari | undefined,
        pos_piket: parsed.pos_piket,
        slot_mulai: parsed.slot_mulai,
        slot_selesai: parsed.slot_selesai,
        jam_mulai: parsed.jam_mulai,
        jam_selesai: parsed.jam_selesai,
        catatan: parsed.catatan
      });


      return reply.send({
        success: true,
        message: 'Jadwal piket guru berhasil diperbarui',
        data
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async delete(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      const { id } = request.params;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      await this.service.deleteJadwalPiket(tenantId, id);
      return reply.send({
        success: true,
        message: 'Jadwal piket guru berhasil dihapus'
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async getTeachingLoad(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const { tahun_pelajaran_id, semester_id, hari } = request.query || {};
      const data = await this.service.getGuruTeachingLoadMap(
        tenantId,
        tahun_pelajaran_id,
        semester_id,
        hari as Hari | undefined
      );

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getNotifConfig(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const config = await this.service.getPiketNotifConfig(tenantId);
      
      // Ambil juga daftar Grup WA yang terdeteksi di tenant ini
      let groups: any[] = [];
      try {
        const { waGatewayService } = await import('../../../../services/wa-gateway.service');
        groups = await waGatewayService.getParticipatingGroups(tenantId);
      } catch (_) {
        groups = [];
      }

      return reply.send({
        success: true,
        data: {
          config,
          groups
        }
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async saveNotifConfig(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const updated = await this.service.savePiketNotifConfig(tenantId, request.body || {});
      return reply.send({
        success: true,
        message: 'Pengaturan notifikasi piket guru berhasil disimpan',
        data: updated
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async testNotif(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const { isNightReminder, overrideTargetGroupId } = request.body || {};
      const result = await this.service.sendPiketReminderToGroup(tenantId, Boolean(isNightReminder), overrideTargetGroupId);

      return reply.send({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
}

