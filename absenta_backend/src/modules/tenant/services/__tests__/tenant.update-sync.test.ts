jest.mock('@/utils/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    config: {
      findMany: jest.fn(),
    },
    sekolah: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/services/licenseClient', () => ({
  checkSlugAvailability: jest.fn(),
  syncTenantMetadataToLicenseServer: jest.fn(),
}));

jest.mock('../../../../utils/deployScenario', () => ({
  getDeployScenario: jest.fn(() => 'saas-public'),
}));

jest.mock('../../../audit/services/audit-log.service', () => ({
  auditLogService: { logEvent: jest.fn() },
}));

jest.mock('../../../academic/jenis-kegiatan-master/services/jenis-kegiatan-master.service', () => ({
  seedDefaultJenisKegiatanForTenant: jest.fn(),
}));

jest.mock('../../../kesiswaan/services/jenis-pelanggaran.service', () => ({
  seedDefaultJenisPelanggaranForTenant: jest.fn(),
}));

jest.mock('../../../academic/struktur-organisasi/services/struktur-organisasi.service', () => ({
  strukturOrganisasiService: { initializeTenant: jest.fn() },
}));

jest.mock('../../../billing/services/tenant-entitlement.service', () => ({
  tenantEntitlementService: {},
}));

jest.mock('../../../../database/seeds/seed_policies', () => ({
  ensureTenantBaseRoles: jest.fn(),
}));

import { prisma } from '@/utils/prisma';
import { syncTenantMetadataToLicenseServer } from '@/services/licenseClient';
import { TenantService } from '../tenant.service';

describe('TenantService.updateTenant license & Caddy sync', () => {
  const service = new TenantService();
  const originalLicenseKey = process.env.LICENSE_KEY;

  const baseTenant = {
    id: 'tenant-1',
    name: 'SMKN 1 Plered',
    absensi_mode: 'MULTI_SESI',
    subdomain: 'smkn1pld',
    custom_domain: null,
    logo_url: null,
    status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    jam_masuk_default: '07:00',
    jam_pulang_default: '15:00',
    toleransi_keterlambatan_menit: 15,
    deletion_requested_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LICENSE_KEY = 'ABS-HOST-001';
    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(baseTenant);
    (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.config.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sekolah.findFirst as jest.Mock).mockResolvedValue({ npsn: '20217401' });
    (prisma.sekolah.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env.LICENSE_KEY = originalLicenseKey;
  });

  it('rejects reserved subdomain without calling license server', async () => {
    await expect(
      service.updateTenant({}, 'tenant-1', { subdomain: 'Admin' })
    ).rejects.toThrow('dicadangkan');

    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(syncTenantMetadataToLicenseServer).not.toHaveBeenCalled();
  });

  it('normalizes fields, updates sekolah nama, and syncs metadata to License Server & Caddy', async () => {
    (prisma.tenant.update as jest.Mock).mockResolvedValue({
      ...baseTenant,
      name: 'SMKN 1 Plered Baru',
      subdomain: 'smkn1plered-baru',
      custom_domain: 'absensi.smkn1plered.sch.id',
      status: 'SUSPENDED',
      _count: { users: 42 },
    });
    (syncTenantMetadataToLicenseServer as jest.Mock).mockResolvedValue({
      synced: true,
      conflict: false,
      caddy_synced: true,
    });

    const result: any = await service.updateTenant({}, 'tenant-1', {
      name: 'SMKN 1 Plered Baru',
      subdomain: ' SMKN1PLERED-BARU ',
      custom_domain: 'https://Absensi.SMKN1Plered.sch.id/',
      status: 'suspended',
    });

    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({
          name: 'SMKN 1 Plered Baru',
          subdomain: 'smkn1plered-baru',
          custom_domain: 'absensi.smkn1plered.sch.id',
          status: 'SUSPENDED',
        }),
      })
    );
    expect(prisma.sekolah.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      data: { nama: 'SMKN 1 Plered Baru' },
    });
    expect(syncTenantMetadataToLicenseServer).toHaveBeenCalledWith({
      server_license_key: 'ABS-HOST-001',
      deploy_scenario: 'saas-public',
      old_name: 'SMKN 1 Plered',
      new_name: 'SMKN 1 Plered Baru',
      old_subdomain: 'smkn1pld',
      new_subdomain: 'smkn1plered-baru',
      old_custom_domain: null,
      custom_domain: 'absensi.smkn1plered.sch.id',
      status: 'SUSPENDED',
      npsn: '20217401',
    });
    expect(result.license_sync).toEqual({
      synced: true,
      caddy_synced: true,
      message: undefined,
    });
  });

  it('rolls back local tenant and sekolah name on 409 conflict from License Server', async () => {
    (prisma.tenant.update as jest.Mock).mockResolvedValue({
      ...baseTenant,
      name: 'SMKN 1 Plered Demo',
      subdomain: 'bentrok',
      _count: { users: 10 },
    });
    (syncTenantMetadataToLicenseServer as jest.Mock).mockResolvedValue({
      synced: false,
      conflict: true,
      caddy_synced: false,
      message: "Subdomain 'bentrok' sudah digunakan oleh lisensi aktif lain di Server Lisensi.",
    });

    await expect(
      service.updateTenant({}, 'tenant-1', {
        name: 'SMKN 1 Plered Demo',
        subdomain: 'bentrok',
      })
    ).rejects.toThrow('sudah digunakan');

    expect(prisma.tenant.update).toHaveBeenCalledTimes(2);
    expect(prisma.tenant.update).toHaveBeenLastCalledWith({
      where: { id: 'tenant-1' },
      data: {
        name: 'SMKN 1 Plered',
        subdomain: 'smkn1pld',
        custom_domain: null,
        status: 'ACTIVE',
      },
    });
    expect(prisma.sekolah.updateMany).toHaveBeenLastCalledWith({
      where: { tenant_id: 'tenant-1' },
      data: { nama: 'SMKN 1 Plered' },
    });
  });

  it('still completes local update cleanly when License Server is offline', async () => {
    (prisma.tenant.update as jest.Mock).mockResolvedValue({
      ...baseTenant,
      subdomain: 'smkn1pld-offline',
      _count: { users: 5 },
    });
    (syncTenantMetadataToLicenseServer as jest.Mock).mockResolvedValue({
      synced: false,
      conflict: false,
      caddy_synced: false,
      message: 'fetch failed',
    });

    const result: any = await service.updateTenant({}, 'tenant-1', {
      subdomain: 'smkn1pld-offline',
    });

    expect(result.subdomain).toBe('smkn1pld-offline');
    expect(result.license_sync).toEqual({
      synced: false,
      caddy_synced: false,
      message: 'fetch failed',
    });
  });
});
