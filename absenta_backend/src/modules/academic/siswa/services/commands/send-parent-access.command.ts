import { parentAuthService } from '../../../../parent-app/services/parent-auth.service';
import { siswaDb } from '../repositories/siswa.db';
import { getSmartParentAppUrl } from '../../../../../utils/url-helper';

export async function sendParentAccessCommand(
  siswaId: string,
  scope: { tenantId: string; org: any; reqOrigin?: string }
): Promise<any> {
  const { tenantId, org, reqOrigin } = scope;
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

  const parents = (siswa.OrangTuaSiswa || []).map((ots: any) => ots.OrangTua).filter(Boolean);
  let targetParent = parents.find((p: any) => p.no_hp) || parents[0];

  // 1. FALLBACK CERDAS: Jika relasi OrangTua belum ada / no_hp kosong, ambil langsung dari field tabel Siswa
  if (!targetParent || !targetParent.no_hp) {
    const candidatePhone = (
      siswa.no_hp_ortu || 
      siswa.no_hp_ayah || 
      siswa.no_hp_ibu || 
      siswa.no_hp_wali ||
      siswa.no_hp
    )?.trim();

    const candidateName = (
      (siswa.no_hp_ayah && siswa.nama_ayah) ||
      (siswa.no_hp_ibu && siswa.nama_ibu) ||
      (siswa.no_hp_wali && siswa.nama_wali) ||
      siswa.nama_ayah ||
      siswa.nama_ibu ||
      siswa.nama_wali ||
      `Orang Tua ${siswa.nama_siswa}`
    )?.trim();

    const hubungan = siswa.nama_ayah ? 'AYAH' : siswa.nama_ibu ? 'IBU' : 'WALI';

    if (!candidatePhone) {
      throw new Error(`Siswa (${siswa.nama_siswa}) belum memiliki nomor HP Orang Tua di database / tabel siswa`);
    }

    if (targetParent) {
      // Update nomor HP pada record OrangTua yang sudah ada
      targetParent = await siswaDb.orangTua.update({
        where: { id: targetParent.id },
        data: {
          no_hp: candidatePhone,
          nama: targetParent.nama || candidateName,
          hubungan: targetParent.hubungan || hubungan,
        },
      });
    } else {
      // Auto-create record OrangTua dan link ke OrangTuaSiswa
      targetParent = await siswaDb.orangTua.create({
        data: {
          tenant_id: siswa.tenant_id,
          nama: candidateName,
          no_hp: candidatePhone,
          hubungan: hubungan,
          OrangTuaSiswa: {
            create: {
              siswa_id: siswa.id,
            },
          },
        },
      });
    }
  }

  const tokenRecord = await parentAuthService.ensureToken(targetParent.id);

  const targetTenantId = tenantId || siswa.tenant_id;

  const tenant = await siswaDb.tenant.findUnique({
    where: { id: targetTenantId },
    select: { subdomain: true, custom_domain: true },
  });

  const appUrl = getSmartParentAppUrl(tenant as any, targetTenantId, reqOrigin);

  const loginLink = `${appUrl}/parent-app/access?token=${tokenRecord.token}`;

  const message = `Halo Bapak/Ibu ${targetParent.nama},

Berikut adalah link akses Aplikasi Orang Tua untuk memantau aktivitas siswa:
*${siswa.nama_siswa}*

Silakan klik link di bawah ini untuk masuk (tanpa password):
${loginLink}

Harap simpan link ini dan jangan bagikan kepada orang lain.

Terima kasih.`;

  let waSent = false;
  let waError = '';

  try {
    const { WhatsAppService } = await import('@/modules/notification/services/whatsapp.service');
    const waService = new WhatsAppService();

    waSent = await waService.sendWhatsApp({
      phoneNumber: targetParent.no_hp,
      message: message,
      tenantId: tenantId,
      relatedId: siswa.id,
      event: 'PARENT_ACCESS_SENT',
      subject: 'Akses Parent App',
      force: true,
      throwOnError: false,
    });
  } catch (err: any) {
    waSent = false;
    waError = err?.message || 'WA Gateway Offline';
  }

  return {
    success: true,
    message: waSent 
      ? `Akses Orang Tua berhasil dikirim via WhatsApp ke ${targetParent.nama}`
      : `Token & Link Akses Orang Tua berhasil dibuat. (WA Gateway Offline)`,
    waSent,
    waError,
    target: {
      nama: targetParent.nama,
      phone: targetParent.no_hp,
      token: tokenRecord.token,
      loginLink: loginLink,
      rawMessage: message,
    },
  };
}
