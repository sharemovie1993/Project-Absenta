import { WhatsappService } from '../services/whatsapp.service';
import { waGatewayService } from '../../../services/wa-gateway.service';

const whatsappService = new WhatsappService();

export class WhatsappController {
  async getConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const config = await whatsappService.getConfig(tenant_id);
      return reply.send({ success: true, data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async saveConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const body = request.body as any;
    try {
      const config = await whatsappService.saveConfig(tenant_id, body);
      return reply.send({ success: true, message: 'Konfigurasi berhasil disimpan', data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async testConnection(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const { test_number } = request.body as any;
    
    if (!test_number) {
      return reply.status(400).send({ success: false, message: 'Nomor tes wajib diisi' });
    }

    try {
      const result = await whatsappService.testConnection(tenant_id, test_number);
      return reply.send({ success: true, message: 'Pesan tes berhasil dikirim', data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message || 'Gagal mengirim pesan tes WA' });
    }
  }

  async connectLocal(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    console.log(`[WA-Controller] connectLocal triggered for tenant: ${tenant_id}`);
    try {
      await waGatewayService.initTenant(tenant_id);

      let qr = await waGatewayService.getQRBase64(tenant_id);
      if (!qr) {
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 500));
          qr = await waGatewayService.getQRBase64(tenant_id);
          if (qr) break;
        }
      }

      const health = await waGatewayService.getHealthStatus(tenant_id);
      console.log(`[WA-Controller] connectLocal result for ${tenant_id}: status=${health.status}, hasQR=${!!qr}`);
      return reply.send({ success: true, message: 'Menghubungkan ke WhatsApp...', qr, data: health });
    } catch (error: any) {
      console.error(`[WA-Controller] connectLocal ERROR for ${tenant_id}:`, error.message);
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async disconnectLocal(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    console.log(`[WA-Controller] disconnectLocal triggered for tenant: ${tenant_id}`);
    try {
      await waGatewayService.disconnectTenant(tenant_id);
      return reply.send({ success: true, message: 'Koneksi WhatsApp terputus' });
    } catch (error: any) {
      console.error(`[WA-Controller] disconnectLocal ERROR for ${tenant_id}:`, error.message);
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async getLocalStatus(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const health = await waGatewayService.getHealthStatus(tenant_id);
      return reply.send({ success: true, data: health });
    } catch (error: any) {
      console.error(`[WA-Controller] getLocalStatus ERROR for ${tenant_id}:`, error.message);
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async getLocalQR(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      let qr = await waGatewayService.getQRBase64(tenant_id);
      if (!qr) {
        await waGatewayService.initTenant(tenant_id);
        for (let i = 0; i < 4; i++) {
          await new Promise(r => setTimeout(r, 500));
          qr = await waGatewayService.getQRBase64(tenant_id);
          if (qr) break;
        }
      }
      return reply.send({ success: true, qr });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async getGroups(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const forceRefresh = (request.query as any)?.refresh === 'true';
    console.log(`[WA-Controller] getGroups triggered for tenant: ${tenant_id}, refresh=${forceRefresh}`);
    try {
      const groups = await waGatewayService.getParticipatingGroups(tenant_id, forceRefresh);
      console.log(`[WA-Controller] getGroups success for ${tenant_id}: found ${groups.length} groups`);
      return reply.send({ success: true, data: groups, cached: !forceRefresh });
    } catch (error: any) {
      console.warn(`[WA-Controller] getGroups WARN for ${tenant_id}:`, error.message);
      return reply.status(400).send({ success: false, message: error.message || 'Gagal mengambil daftar grup WA' });
    }
  }

  async invalidateGroupsCache(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      await waGatewayService.invalidateGroupsCache(tenant_id);
      return reply.send({ success: true, message: 'Cache daftar grup WA berhasil dihapus' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  /**
   * GET /whatsapp/document-targets
   * Mengambil status koneksi WA Sekolah/Gateway DAN sesi WA User yang Login beserta daftar grup WA.
   */
  async getDocumentTargets(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant konteks tidak ditemukan.' });
    }

    const forceRefresh = (request.query as any)?.refresh === 'true';
    const { buildUserWaSessionKey } = await import('../../../services/wa-prisma-auth.service');

    const loadSessionSummary = async (sessionKey: string, includeQr = false) => {
      try {
        const health: any = await waGatewayService.getHealthStatus(sessionKey);
        const isConnected = health?.status === 'connected';
        let groups: Array<{ id: string; subject: string; participantsCount?: number }> = [];
        let qr: string | null = null;

        if (isConnected) {
          try {
            groups = await waGatewayService.getParticipatingGroups(sessionKey, forceRefresh);
          } catch {}
        } else if (includeQr) {
          try {
            qr = await waGatewayService.getQRBase64(sessionKey);
          } catch {}
        }

        return {
          status: health?.status || 'disconnected',
          connected: isConnected,
          phoneNumber: health?.number || health?.phoneNumber || null,
          qr,
          groups: Array.isArray(groups) ? groups : [],
        };
      } catch {
        return {
          status: 'disconnected',
          connected: false,
          phoneNumber: null,
          qr: null,
          groups: [] as Array<{ id: string; subject: string; participantsCount?: number }>,
        };
      }
    };

    const config = await whatsappService.getConfig(tenantId).catch(() => null);
    const schoolGateway = await loadSessionSummary(tenantId, false);
    const userSession = userId
      ? await loadSessionSummary(buildUserWaSessionKey(tenantId, String(userId)), true)
      : { status: 'disconnected', connected: false, phoneNumber: null, qr: null, groups: [] };

    const platformFallbackAvailable =
      Boolean(process.env.WHATSAPP_API_KEY) || Boolean(process.env.PLATFORM_WA_TENANT_ID);

    return reply.send({
      success: true,
      data: {
        // Backward-compatible summary fields
        status: schoolGateway.status,
        connected: schoolGateway.connected || (config?.provider_name === 'FONNTE' && !!config?.is_active) || platformFallbackAvailable,
        phoneNumber: schoolGateway.phoneNumber,
        groups: schoolGateway.groups.length > 0 ? schoolGateway.groups : userSession.groups,
        // Detailed dual-sender summary (WA Sekolah/Platform vs WA User yang Login)
        gateway: {
          ...schoolGateway,
          providerName: config?.provider_name || 'LOCAL',
          externalActive: Boolean(config?.is_active && config?.provider_name && config?.provider_name !== 'LOCAL' && config?.api_token),
          platformFallbackAvailable,
        },
        userSession,
      },
    });
  }

  /**
   * POST /whatsapp/user-session/connect
   * Menghasilkan / memuat ulang QR Code WA pribadi milik user yang sedang login.
   */
  async connectUserSession(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
    if (!tenantId || !userId) {
      return reply.status(400).send({ success: false, message: 'Konteks user atau tenant tidak lengkap.' });
    }

    try {
      const { buildUserWaSessionKey } = await import('../../../services/wa-prisma-auth.service');
      const userSessionKey = buildUserWaSessionKey(tenantId, String(userId));
      await waGatewayService.initTenant(userSessionKey);

      let qr = await waGatewayService.getQRBase64(userSessionKey);
      let health: any = await waGatewayService.getHealthStatus(userSessionKey);
      if (!qr && health?.status !== 'connected') {
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 500));
          qr = await waGatewayService.getQRBase64(userSessionKey);
          health = await waGatewayService.getHealthStatus(userSessionKey);
          if (qr || health?.status === 'connected') break;
        }
      }

      return reply.send({
        success: true,
        data: {
          status: health?.status || (qr ? 'connecting' : 'disconnected'),
          connected: health?.status === 'connected',
          phoneNumber: health?.number || null,
          qr: qr || null,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal memulai sesi WA pribadi user.',
      });
    }
  }

  /**
   * GET /whatsapp/user-session/status
   */
  async getUserSessionStatus(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
    if (!tenantId || !userId) {
      return reply.status(400).send({ success: false, message: 'Konteks user atau tenant tidak lengkap.' });
    }

    try {
      const { buildUserWaSessionKey } = await import('../../../services/wa-prisma-auth.service');
      const userSessionKey = buildUserWaSessionKey(tenantId, String(userId));
      const health: any = await waGatewayService.getHealthStatus(userSessionKey);
      const isConnected = health?.status === 'connected';
      const qr = isConnected ? null : await waGatewayService.getQRBase64(userSessionKey).catch(() => null);
      return reply.send({
        success: true,
        data: {
          status: health?.status || 'disconnected',
          connected: isConnected,
          phoneNumber: health?.number || null,
          qr,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  /**
   * POST /whatsapp/user-session/disconnect
   * Memutuskan & menghapus sesi WA pribadi user yang sedang login (tidak mengganggu WA Sekolah).
   */
  async disconnectUserSession(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
    if (!tenantId || !userId) {
      return reply.status(400).send({ success: false, message: 'Konteks user atau tenant tidak lengkap.' });
    }

    try {
      const { buildUserWaSessionKey } = await import('../../../services/wa-prisma-auth.service');
      const userSessionKey = buildUserWaSessionKey(tenantId, String(userId));
      await waGatewayService.disconnectTenant(userSessionKey);
      return reply.send({ success: true, message: 'Sesi WhatsApp pribadi Anda berhasil diputuskan.' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  /**
   * POST /whatsapp/send-document
   * Mengirim file PDF / dokumen Universal Document Printing Engine atas nama WA Sekolah/Platform atau WA User yang login.
   */
  async sendDocument(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.userId ?? request.user?.user_id;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant konteks tidak ditemukan.' });
    }

    const { to, fileBase64, fileName, mimetype, caption, senderMode } = (request.body || {}) as {
      to?: string;
      fileBase64?: string;
      fileName?: string;
      mimetype?: string;
      caption?: string;
      senderMode?: 'AUTO' | 'GATEWAY' | 'PLATFORM' | 'USER';
    };

    if (!to || !String(to).trim()) {
      return reply.status(400).send({ success: false, message: 'Nomor WA atau Grup tujuan wajib dipilih.' });
    }
    if (!fileBase64 || !String(fileBase64).trim()) {
      return reply.status(400).send({ success: false, message: 'Data dokumen PDF wajib disertakan.' });
    }

    try {
      const result = await whatsappService.sendDocument(
        tenantId,
        String(to).trim(),
        fileBase64,
        fileName || 'Dokumen_Resmi.pdf',
        mimetype || 'application/pdf',
        caption || '',
        { senderMode, userId: userId ? String(userId) : undefined },
      );
      return reply.send({
        success: true,
        message: 'Dokumen PDF berhasil dikirim melalui WhatsApp.',
        data: result,
      });
    } catch (error: any) {
      console.error(`[WA-Controller] sendDocument ERROR for ${tenantId}:`, error.message);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal mengirim dokumen ke WhatsApp.',
      });
    }
  }

  /**
   * GET /whatsapp/document-recipients
   * Direktori nomor WA dari biodata Guru, Siswa, dan Orang Tua/Wali untuk modal Kirim Dokumen.
   */
  async getDocumentRecipients(request: any, reply: any) {
    const tenantId = request.dataScope?.tenantId ?? request.user?.tenant_id ?? request.user?.tenantId;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant konteks tidak ditemukan.' });
    }

    const { type, search, limit } = (request.query || {}) as {
      type?: string;
      search?: string;
      limit?: string | number;
    };

    try {
      const recipients = await whatsappService.getDocumentRecipients(tenantId, {
        type,
        search,
        limit: limit ? Number(limit) : undefined,
      });
      return reply.send({ success: true, data: recipients });
    } catch (error: any) {
      console.error(`[WA-Controller] getDocumentRecipients ERROR for ${tenantId}:`, error.message);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal memuat direktori nomor WA penerima.',
      });
    }
  }
}

