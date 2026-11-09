import { publicPortalService } from '../services/public-portal.service';

export class PublicPortalController {
  private async getResolvedTenant(request: any, reply: any) {
    const params = request.params || {};
    const headers = request.headers || {};

    let identifier = params.tenantSlug || headers['x-tenant-host'] || headers['x-tenant-slug'];

    if (!identifier && headers.host) {
      // e.g. smkn1pld.absenta.id -> smkn1pld
      const host = String(headers.host).split(':')[0].toLowerCase();
      if (host.endsWith('.absenta.id')) {
        identifier = host.replace('.absenta.id', '');
      } else {
        identifier = host;
      }
    }

    if (!identifier) {
      reply.status(400).send({
        success: false,
        message: 'Tenant identifier missing (tenantSlug param or X-Tenant-Host header required)',
      });
      return null;
    }

    const tenant = await publicPortalService.resolveTenant(identifier);
    if (!tenant) {
      reply.status(404).send({
        success: false,
        message: `Sekolah atau institusi tidak ditemukan untuk identifier '${identifier}'`,
      });
      return null;
    }

    return tenant;
  }

  public async getProfile(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const profile = await publicPortalService.getSchoolProfile(tenant.id);
    if (!profile) {
      return reply.status(404).send({ success: false, message: 'Profil sekolah tidak ditemukan' });
    }

    return reply.send({ success: true, data: profile });
  }

  public async getLivePulse(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const pulse = await publicPortalService.getLivePulse(tenant.id);
    return reply.send({ success: true, data: pulse });
  }

  public async getCalendarAndEkskul(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const data = await publicPortalService.getCalendarAndEkskul(tenant.id);
    return reply.send({ success: true, data });
  }

  public async getStaff(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const query = request.query || {};
    const staff = await publicPortalService.getStaffDirectory(tenant.id, {
      jenis_ptk: query?.jenis_ptk,
      search: query?.search,
    });

    return reply.send({ success: true, data: staff, count: staff.length });
  }

  public async getPrograms(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const programs = await publicPortalService.getPrograms(tenant.id);
    return reply.send({ success: true, data: programs, count: programs.length });
  }

  public async getAchievements(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const query = request.query || {};
    const limit = query?.limit ? parseInt(query.limit, 10) : 12;
    const achievements = await publicPortalService.getAchievements(tenant.id, limit);

    return reply.send({ success: true, data: achievements, count: achievements.length });
  }

  public async getHubin(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const hubin = await publicPortalService.getHubinData(tenant.id);
    return reply.send({ success: true, data: hubin });
  }

  public async getFacilities(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const facilities = await publicPortalService.getFacilities(tenant.id);
    return reply.send({ success: true, data: facilities, count: facilities.length });
  }

  public async getArticles(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const query = request.query || {};
    const articles = await publicPortalService.getArticles(tenant.id, {
      category: query?.category,
      page: query?.page ? parseInt(query.page, 10) : 1,
      limit: query?.limit ? parseInt(query.limit, 10) : 9,
      search: query?.search,
    });

    return reply.send({ success: true, ...articles });
  }

  public async getArticleDetail(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const params = request.params || {};
    const article = await publicPortalService.getArticleBySlug(tenant.id, params.slug);
    if (!article) {
      return reply.status(404).send({ success: false, message: 'Artikel atau berita tidak ditemukan' });
    }

    return reply.send({ success: true, data: article });
  }

  public async verifyDocument(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const params = request.params || {};
    const result = await publicPortalService.verifyDocument(tenant.id, params.docType, params.code);
    if (!result) {
      return reply.status(404).send({
        success: false,
        valid: false,
        message: 'Dokumen tidak valid atau tidak terdaftar dalam arsip resmi sekolah',
      });
    }

    return reply.send({ success: true, data: result });
  }

  public async checkGraduation(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const body = request.body || {};
    const queryNumber = body.nisn || body.nis || body.nomor || '';
    const result = await publicPortalService.checkGraduationStatus(tenant.id, queryNumber);

    return reply.send({ success: true, data: result });
  }

  public async submitGuestBook(request: any, reply: any) {
    const tenant = await this.getResolvedTenant(request, reply);
    if (!tenant) return;

    const body = request.body || {};
    if (!body.nama_tamu || !body.keperluan_tamu) {
      return reply.status(400).send({
        success: false,
        message: 'Nama tamu dan keperluan kunjungan wajib diisi.',
      });
    }

    const ticket = await publicPortalService.submitGuestBook(tenant.id, body);
    return reply.status(201).send({
      success: true,
      data: ticket,
      message: 'Registrasi kunjungan Buku Tamu Digital berhasil dicatat.',
    });
  }

  // ── CMS Management Methods (Internal Admin / Humas) ──

  private resolveCmsTenantId(request: any): string | null {
    return (
      request.body?.tenant_id ||
      request.headers?.['x-tenant-id'] ||
      request.query?.tenant_id ||
      request.user?.tenant_id ||
      request.tenantId ||
      '8535b49c-d3fc-4598-922a-7774b49ee7c5' // Fallback to SMKN 1 Plered
    );
  }

  public async saveConfig(request: any, reply: any) {
    const tenantId = this.resolveCmsTenantId(request);
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak teridentifikasi' });
    }

    await publicPortalService.saveWebConfig(tenantId, request.body || {});
    return reply.send({ success: true, message: 'Pengaturan Web Sekolah berhasil diperbarui' });
  }

  public async createArticle(request: any, reply: any) {
    const tenantId = this.resolveCmsTenantId(request);
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak teridentifikasi' });
    }

    const article = await publicPortalService.createArticle(tenantId, request.body || {});
    return reply.status(201).send({ success: true, data: article, message: 'Warta berhasil diterbitkan' });
  }

  public async updateArticle(request: any, reply: any) {
    const tenantId = this.resolveCmsTenantId(request);
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak teridentifikasi' });
    }
    const { id } = request.params || {};

    const article = await publicPortalService.updateArticle(tenantId, id, request.body || {});
    return reply.send({ success: true, data: article, message: 'Warta berhasil diperbarui' });
  }

  public async deleteArticle(request: any, reply: any) {
    const tenantId = this.resolveCmsTenantId(request);
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak teridentifikasi' });
    }
    const { id } = request.params || {};

    await publicPortalService.deleteArticle(tenantId, id);
    return reply.send({ success: true, message: 'Warta berhasil dihapus' });
  }
}

export const publicPortalController = new PublicPortalController();
