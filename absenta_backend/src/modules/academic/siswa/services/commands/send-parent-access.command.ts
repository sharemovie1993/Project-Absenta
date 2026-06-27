import { parentAuthService } from '@/modules/parent-app/services/parent-auth.service';
import { siswaDb } from '../repositories/siswa.db';
import { getSmartParentAppUrl } from '@/utils/url-helper';

export async function sendParentAccessCommand(
  siswaId: string,
  scope: { tenantId: string; org: any }
): Promise<any> {
  const { tenantId, org } = scope;
  let whereClause: any = { id: siswaId, tenant_id: tenantId };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      whereClause.kelas_id = { in: allowed };
    } else {
        // No assigned classes, deny access to sending parent access
        throw new Error('Siswa not found');
    }
  }

  const siswa: any = await siswaDb.siswa.findFirst({
    where: whereClause,
    include: {
      OrangTuaSiswa: {
        include: {
          OrangTua: true,
        },
      },
    },
  });

  if (!siswa) {
    throw new Error('Siswa not found');
  }

  const parents = (siswa.OrangTuaSiswa || []).map((ots: any) => ots.OrangTua);
  if (parents.length === 0) {
    throw new Error('Siswa belum memiliki data Orang Tua');
  }

  const targetParent = parents.find((p: any) => p.no_hp) || parents[0];

  if (!targetParent.no_hp) {
    throw new Error(`Orang Tua (${targetParent.nama}) tidak memiliki nomor HP`);
  }

  const tokenRecord = await parentAuthService.ensureToken(targetParent.id);

  const targetTenantId = tenantId || siswa.tenant_id;

  const tenant = await siswaDb.tenant.findUnique({
    where: { id: targetTenantId },
    select: { domain: true, subdomain: true, custom_domain: true },
  });

  const appUrl = getSmartParentAppUrl(tenant as any);

  const loginLink = `${appUrl}/parent-app/access?token=${tokenRecord.token}`;

  const message = `Halo Bapak/Ibu ${targetParent.nama},

Berikut adalah link akses Aplikasi Orang Tua untuk memantau aktivitas siswa:
*${siswa.nama_siswa}*

Silakan klik link di bawah ini untuk masuk (tanpa password):
${loginLink}

Harap simpan link ini dan jangan bagikan kepada orang lain.

Terima kasih.`;

  const { WhatsAppService } = await import('@/modules/notification/services/whatsapp.service');
  const waService = new WhatsAppService();

  await waService.sendWhatsApp({
    phoneNumber: targetParent.no_hp,
    message: message,
    tenantId: tenantId,
    relatedId: siswa.id,
    event: 'PARENT_ACCESS_SENT',
    subject: 'Akses Parent App',
    force: true,
    throwOnError: true,
  });

  return {
    success: true,
    message: 'Akses Orang Tua berhasil dikirim',
    target: {
      nama: targetParent.nama,
      phone: targetParent.no_hp,
    },
  };
}
