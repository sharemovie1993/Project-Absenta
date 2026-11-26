/**
 * daily-briefing.controller.ts
 * Controller endpoint untuk Daily Briefing & Tokenized Reports.
 */

import { dailyBriefingService } from '../services/daily-briefing.service';
import { BriefingRole } from '../types/briefing.types';

export class DailyBriefingController {
  /**
   * GET /public/daily-briefing
   * GET /reports/daily-briefing
   * Endpoint publik yang diakses menggunakan query parameter `?token=...`
   */
  async getBriefingByToken(request: any, reply: any) {
    const { token } = (request.query || {}) as { token?: string };

    if (!token) {
      return reply.status(400).send({
        success: false,
        message: 'Token laporan tidak disertakan dalam permintaan.',
      });
    }

    try {
      const data = await dailyBriefingService.getBriefingByToken(token);
      return reply.status(200).send({
        success: true,
        message: 'Data laporan harian berhasil dimuat',
        data,
      });
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        message: err.message || 'Tautan laporan tidak valid atau telah kedaluwarsa.',
      });
    }
  }

  /**
   * POST /reports/daily-briefing/trigger-send
   * Endpoint untuk memicu pengiriman pesan WhatsApp secara manual / tes
   */
  async triggerSend(request: any, reply: any) {
    const tenantId = (request as any).tenantId;
    const body = (request.body || {}) as {
      role?: BriefingRole;
      tanggal?: string;
      targetPhoneOverride?: string;
    };

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID tidak terdeteksi pada sesi.',
      });
    }

    const originHint = (request.headers?.origin || request.headers?.referer) as string | undefined;

    try {
      const result = await dailyBriefingService.sendBriefingViaWhatsapp(
        tenantId,
        body.role || 'KEPALA_SEKOLAH',
        body.tanggal,
        body.targetPhoneOverride,
        originHint
      );

      return reply.status(result.success ? 200 : 400).send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal memproses pengiriman laporan harian.',
      });
    }
  }

  /**
   * GET /reports/daily-briefing/preview
   * Endpoint untuk melihat pratinjau data laporan langsung di dashboard
   */
  async previewBriefing(request: any, reply: any) {
    const tenantId = (request as any).tenantId;
    const { role, tanggal } = request.query as { role?: BriefingRole; tanggal?: string };

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        message: 'Tenant ID tidak terdeteksi.',
      });
    }

    try {
      const data = await dailyBriefingService.getBriefingDirect(
        tenantId,
        role || 'KEPALA_SEKOLAH',
        tanggal
      );

      return reply.status(200).send({
        success: true,
        message: 'Preview data briefing berhasil dimuat',
        data,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal memuat pratinjau data briefing.',
      });
    }
  }

  /**
   * GET /reports/daily-briefing/group-target
   */
  async getGroupTarget(request: any, reply: any) {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi.' });
    }
    const target = await dailyBriefingService.getBriefingGroupTarget(tenantId);
    return reply.status(200).send({ success: true, data: target });
  }

  /**
   * POST /reports/daily-briefing/group-target
   */
  async saveGroupTarget(request: any, reply: any) {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi.' });
    }
    const body = (request.body || {}) as { groupJid?: string | null; groupName?: string };
    const saved = await dailyBriefingService.saveBriefingGroupTarget(
      tenantId,
      body.groupJid || null,
      body.groupName
    );
    return reply.status(200).send({
      success: true,
      message: saved
        ? `Grup WA default berhasil diatur ke "${saved.groupName}"`
        : 'Target Grup WA default dihapus (kembali ke nomor Kepala Sekolah)',
      data: saved,
    });
  }
}

export const dailyBriefingController = new DailyBriefingController();
