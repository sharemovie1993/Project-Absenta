import { prisma } from '@/utils/prisma';
import axios from 'axios';



/**
 * Normalisasi nomor HP ke format internasional Indonesia (628xxx).
 * Mendukung format input: "08xxx", "628xxx", "+628xxx", "8xxx".
 * Dibutuhkan agar pesan WA terkirim ke format JID yang benar.
 */
function normalizeToWaNumber(phone: string): string {
  if (!phone) return phone;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.substring(1);
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }
  return digits;
}

export class WhatsappService {
  async getConfig(tenantId: string) {
    return prisma.whatsappConfig.findUnique({
      where: { tenant_id: tenantId }
    });
  }

  async saveConfig(tenantId: string, data: any) {
    return prisma.whatsappConfig.upsert({
      where: { tenant_id: tenantId },
      create: {
        ...data,
        tenant_id: tenantId
      },
      update: data
    });
  }

  async testConnection(tenantId: string, testNumber: string) {
    let config = await this.getConfig(tenantId);
    if (!config) {
      config = await this.saveConfig(tenantId, {
        provider_name: 'LOCAL',
        is_active: true
      });
    } else if (!config.is_active) {
      config = await this.saveConfig(tenantId, {
        provider_name: config.provider_name || 'LOCAL',
        is_active: true
      });
    }

    return this.sendMessage(config, testNumber, 'Tes koneksi WhatsApp dari Absenta. Jika Anda menerima pesan ini, konfigurasi Anda sudah benar.');
  }

  async sendMessage(config: any, to: string, message: string) {
    const normalizedTo = normalizeToWaNumber(to);
    const providerName = String(config?.provider_name || 'LOCAL').trim().toUpperCase();

    if (providerName === 'LOCAL' || !config?.provider_name) {
      const { waGatewayService } = await import('../../../services/wa-gateway.service');
      return waGatewayService.sendMessage(config.tenant_id, normalizedTo, message);
    }

    if (!config.api_url || !config.api_token) {
      throw new Error('API URL or Token missing');
    }

    try {
      // Logic for different providers (Fonnte is default)
      if (config.provider_name === 'FONNTE') {
        const response = await axios.post(config.api_url, {
          target: normalizedTo,
          message: message,
          delay: '2',
          countryCode: '62', // Default Indonesia
        }, {
          headers: {
            'Authorization': config.api_token
          }
        });
        return response.data;
      }
      
      // Generic Custom Provider (Standard POST)
      const response = await axios.post(config.api_url, {
        to: normalizedTo,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${config.api_token}`,
          'X-API-KEY': config.api_token
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('WhatsApp Send Error:', error.response?.data || error.message);
      throw new Error(`Gagal mengirim pesan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Kirim dokumen lampiran (PDF / Gambar / File Resmi) ke nomor WhatsApp atau Grup JID.
   * Mendukung mode pengirim:
   * - 'GATEWAY' (WA Gateway Sekolah / fallback ke WA Gateway Platform jika tersedia)
   * - 'PLATFORM' (WA Gateway Platform pusat)
   * - 'USER' (Akun WA Pribadi User yang sedang login via Scan QR)
   * - 'AUTO' (Coba WA Gateway Sekolah -> WA Gateway Platform -> jika gagal beri instruksi)
   */
  async sendDocument(
    tenantId: string,
    toOrJid: string,
    fileBase64: string,
    fileName: string,
    mimetype = 'application/pdf',
    caption = '',
    options: { senderMode?: 'AUTO' | 'GATEWAY' | 'PLATFORM' | 'USER'; userId?: string | null } = {},
  ) {
    if (!tenantId) {
      throw new Error('Tenant ID tidak ditemukan pada sesi pengguna.');
    }
    const trimmedTarget = String(toOrJid || '').trim();
    if (!trimmedTarget) {
      throw new Error('Nomor tujuan atau Grup WhatsApp wajib diisi.');
    }

    const target = trimmedTarget.includes('@')
      ? trimmedTarget
      : normalizeToWaNumber(trimmedTarget);

    if (!trimmedTarget.includes('@') && target.length < 10) {
      throw new Error('Nomor WhatsApp tujuan tidak valid. Gunakan format 08xxx atau 628xxx.');
    }

    const cleanBase64 = String(fileBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      throw new Error('Berkas dokumen PDF kosong.');
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const maxBytes = 20 * 1024 * 1024; // 20 MB batas aman media WA
    if (buffer.length === 0) {
      throw new Error('Isi dokumen tidak valid.');
    }
    if (buffer.length > maxBytes) {
      throw new Error('Ukuran file PDF melebihi batas maksimal 20 MB untuk pengiriman WhatsApp.');
    }

    const safeFileName = (fileName || 'Dokumen_Resmi.pdf').trim().replace(/[\\/:*?"<>|]/g, '_');
    const senderMode = String(options.senderMode || 'AUTO').trim().toUpperCase() as
      | 'AUTO'
      | 'GATEWAY'
      | 'PLATFORM'
      | 'USER';

    const { waGatewayService } = await import('../../../services/wa-gateway.service');

    // Helper kirim via Fonnte-compatible multipart upload (Dipakai Tenant Fonnte maupun Platform Gateway)
    const sendViaFonnte = async (apiUrl: string, apiToken: string, deviceId?: string, providerLabel = 'FONNTE') => {
      const form = new FormData();
      form.append('target', target);
      form.append('message', caption || safeFileName);
      form.append('countryCode', '62');
      if (deviceId && deviceId.trim()) {
        form.append('device', deviceId.trim());
      }
      form.append('file', new Blob([buffer], { type: mimetype || 'application/pdf' }), safeFileName);

      const response = await axios.post(apiUrl, form, {
        headers: {
          Authorization: apiToken,
        },
        timeout: 30000,
      });
      return { sent: true, target, fileName: safeFileName, provider: providerLabel, raw: response.data };
    };

    // 1. Mode Atas Nama WA User yang Login (Personal QR Session)
    if (senderMode === 'USER') {
      const uid = String(options.userId || '').trim();
      if (!uid) {
        throw new Error('User ID sesi login tidak ditemukan untuk mengirim atas nama WA pribadi.');
      }
      const { buildUserWaSessionKey } = await import('../../../services/wa-prisma-auth.service');
      const userSessionKey = buildUserWaSessionKey(tenantId, uid);
      await waGatewayService.sendDocument(
        userSessionKey,
        target,
        cleanBase64,
        safeFileName,
        mimetype || 'application/pdf',
        caption || '',
      );
      return { sent: true, target, fileName: safeFileName, provider: 'USER_WA' };
    }

    // 2. Mode Atas Nama WA Sekolah (Tenant Config / Local Baileys)
    const config = await this.getConfig(tenantId);
    const providerName = String(config?.provider_name || 'LOCAL').trim().toUpperCase();

    if (senderMode !== 'PLATFORM') {
      if (providerName === 'LOCAL' || !config?.provider_name) {
        try {
          await waGatewayService.sendDocument(
            tenantId,
            target,
            cleanBase64,
            safeFileName,
            mimetype || 'application/pdf',
            caption || '',
          );
          return { sent: true, target, fileName: safeFileName, provider: 'SCHOOL_LOCAL' };
        } catch (localErr: any) {
          // Jika masih gagal di mode GATEWAY/AUTO, lanjut cek fallback Platform Gateway jika tersedia
          if (senderMode === 'GATEWAY' && !process.env.WHATSAPP_API_KEY && !process.env.PLATFORM_WA_TENANT_ID) {
            throw localErr;
          }
        }
      } else if (config.api_url && config.api_token && config.is_active) {
        return sendViaFonnte(config.api_url, config.api_token, undefined, `SCHOOL_${providerName}`);
      }
    }

    // 3. Fallback / Mode Eksplisit WA Gateway Platform Pusat
    const platformTenantId = String(process.env.PLATFORM_WA_TENANT_ID || '').trim();
    if (platformTenantId && platformTenantId !== tenantId) {
      try {
        await waGatewayService.sendDocument(
          platformTenantId,
          target,
          cleanBase64,
          safeFileName,
          mimetype || 'application/pdf',
          caption || '',
        );
        return { sent: true, target, fileName: safeFileName, provider: 'PLATFORM_LOCAL' };
      } catch (_) {}
    }

    const platformApiKey = String(process.env.WHATSAPP_API_KEY || '').trim();
    if (platformApiKey && !trimmedTarget.includes('@g.us')) {
      const platformApiUrl = process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send';
      return sendViaFonnte(platformApiUrl, platformApiKey, process.env.WHATSAPP_DEVICE_ID, 'PLATFORM_FONNTE');
    }

    throw new Error(
      'WA Gateway Sekolah maupun Platform belum terhubung. Anda dapat beralih ke tab "WA Saya (Scan QR)" atau "WhatsApp Web / HP".'
    );
  }

  /**
   * Direktori kontak WA penerima dokumen resmi dari biodata Guru, Siswa, dan Orang Tua/Wali.
   * Digunakan oleh modal "Kirim ke WA" Universal Document Printing Engine.
   */
  async getDocumentRecipients(
    tenantId: string,
    query: { type?: string; search?: string; limit?: number } = {},
  ) {
    if (!tenantId) {
      throw new Error('Tenant ID tidak ditemukan pada sesi pengguna.');
    }

    const typeFilter = String(query.type || 'ALL').trim().toUpperCase();
    const search = String(query.search || '').trim();
    const limit = Math.max(5, Math.min(100, Number(query.limit) || 40));

    type RecipientItem = {
      id: string;
      recipientType: 'GURU' | 'SISWA' | 'ORTU';
      name: string;
      phone: string;
      normalizedPhone: string;
      subtitle: string;
      studentName?: string;
      kelasName?: string;
    };

    const extractDigits = (raw?: string | null): string => {
      if (!raw) return '';
      let digits = String(raw).replace(/\D/g, '');
      if (digits.startsWith('0')) digits = '62' + digits.substring(1);
      else if (digits && !digits.startsWith('62')) digits = '62' + digits;
      return digits;
    };

    const items: RecipientItem[] = [];
    const seenKeys = new Set<string>();
    const pushItem = (item: RecipientItem) => {
      if (item.normalizedPhone.length < 10) return;
      const dedupeKey = `${item.recipientType}:${item.normalizedPhone}:${item.studentName || item.name}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);
      items.push(item);
    };

    const searchContains = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    const tasks: Promise<void>[] = [];

    if (typeFilter === 'ALL' || typeFilter === 'GURU') {
      tasks.push(
        (async () => {
          const guruRows = await prisma.guru.findMany({
            where: {
              tenant_id: tenantId,
              OR: [
                { AND: [{ no_hp: { not: null } }, { no_hp: { not: '' } }] },
                { User: { is: { AND: [{ no_hp: { not: null } }, { no_hp: { not: '' } }] } } },
              ],
              ...(searchContains
                ? {
                    AND: [
                      {
                        OR: [
                          { nama_guru: searchContains },
                          { nip: searchContains },
                          { jabatan: searchContains },
                          { no_hp: searchContains },
                          { User: { is: { no_hp: searchContains } } },
                        ],
                      },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              nama_guru: true,
              nip: true,
              jabatan: true,
              no_hp: true,
              User: { select: { no_hp: true } },
            },
            orderBy: { nama_guru: 'asc' },
            take: limit,
          });

          for (const g of guruRows) {
            const rawPhone = String(g.no_hp || g.User?.no_hp || '').trim();
            const normalizedPhone = extractDigits(rawPhone);
            pushItem({
              id: `guru:${g.id}`,
              recipientType: 'GURU',
              name: g.nama_guru,
              phone: rawPhone,
              normalizedPhone,
              subtitle: [g.jabatan || 'Guru', g.nip ? `NIP ${g.nip}` : null].filter(Boolean).join(' • '),
            });
          }
        })(),
      );
    }

    if (typeFilter === 'ALL' || typeFilter === 'SISWA') {
      tasks.push(
        (async () => {
          const siswaRows = await prisma.siswa.findMany({
            where: {
              tenant_id: tenantId,
              status: 'AKTIF',
              AND: [{ no_hp: { not: null } }, { no_hp: { not: '' } }],
              ...(searchContains
                ? {
                    OR: [
                      { nama_siswa: searchContains },
                      { nis: searchContains },
                      { nisn: searchContains },
                      { no_hp: searchContains },
                      { Kelas: { is: { nama_kelas: searchContains } } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              nisn: true,
              no_hp: true,
              Kelas: { select: { nama_kelas: true } },
            },
            orderBy: { nama_siswa: 'asc' },
            take: limit,
          });

          for (const s of siswaRows) {
            const rawPhone = String(s.no_hp || '').trim();
            const normalizedPhone = extractDigits(rawPhone);
            const kelasName = s.Kelas?.nama_kelas || undefined;
            pushItem({
              id: `siswa:${s.id}`,
              recipientType: 'SISWA',
              name: s.nama_siswa,
              phone: rawPhone,
              normalizedPhone,
              kelasName,
              studentName: s.nama_siswa,
              subtitle: [kelasName || 'Siswa', s.nisn ? `NISN ${s.nisn}` : s.nis ? `NIS ${s.nis}` : null]
                .filter(Boolean)
                .join(' • '),
            });
          }
        })(),
      );
    }

    if (typeFilter === 'ALL' || typeFilter === 'ORTU') {
      tasks.push(
        (async () => {
          const [siswaOrtuRows, accountOrtuRows] = await Promise.all([
            prisma.siswa.findMany({
              where: {
                tenant_id: tenantId,
                status: 'AKTIF',
                OR: [
                  { AND: [{ no_hp_ortu: { not: null } }, { no_hp_ortu: { not: '' } }] },
                  { AND: [{ no_hp_ayah: { not: null } }, { no_hp_ayah: { not: '' } }] },
                  { AND: [{ no_hp_ibu: { not: null } }, { no_hp_ibu: { not: '' } }] },
                  { AND: [{ no_hp_wali: { not: null } }, { no_hp_wali: { not: '' } }] },
                ],
                ...(searchContains
                  ? {
                      AND: [
                        {
                          OR: [
                            { nama_siswa: searchContains },
                            { nis: searchContains },
                            { nisn: searchContains },
                            { nama_ayah: searchContains },
                            { nama_ibu: searchContains },
                            { nama_wali: searchContains },
                            { no_hp_ortu: searchContains },
                            { no_hp_ayah: searchContains },
                            { no_hp_ibu: searchContains },
                            { no_hp_wali: searchContains },
                            { Kelas: { is: { nama_kelas: searchContains } } },
                          ],
                        },
                      ],
                    }
                  : {}),
              },
              select: {
                id: true,
                nama_siswa: true,
                nama_ayah: true,
                no_hp_ayah: true,
                nama_ibu: true,
                no_hp_ibu: true,
                nama_wali: true,
                no_hp_wali: true,
                no_hp_ortu: true,
                Kelas: { select: { nama_kelas: true } },
              },
              orderBy: { nama_siswa: 'asc' },
              take: limit,
            }),
            prisma.orangTua.findMany({
              where: {
                tenant_id: tenantId,
                AND: [{ no_hp: { not: null } }, { no_hp: { not: '' } }],
                ...(searchContains
                  ? {
                      OR: [
                        { nama: searchContains },
                        { no_hp: searchContains },
                        {
                          OrangTuaSiswa: {
                            some: {
                              Siswa: {
                                is: {
                                  OR: [
                                    { nama_siswa: searchContains },
                                    { Kelas: { is: { nama_kelas: searchContains } } },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      ],
                    }
                  : {}),
              },
              select: {
                id: true,
                nama: true,
                no_hp: true,
                OrangTuaSiswa: {
                  select: {
                    Siswa: {
                      select: {
                        nama_siswa: true,
                        Kelas: { select: { nama_kelas: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { nama: 'asc' },
              take: limit,
            }),
          ]);

          for (const s of siswaOrtuRows) {
            const kelasName = s.Kelas?.nama_kelas || undefined;
            const kelasBadge = kelasName ? ` (${kelasName})` : '';
            const candidates: Array<{
              key: string;
              rawPhone?: string | null;
              displayName: string;
              roleLabel: string;
            }> = [
              {
                key: 'ayah',
                rawPhone: s.no_hp_ayah,
                displayName: s.nama_ayah?.trim() || `Ayah dari ${s.nama_siswa}`,
                roleLabel: `Ayah dari ${s.nama_siswa}${kelasBadge}`,
              },
              {
                key: 'ibu',
                rawPhone: s.no_hp_ibu,
                displayName: s.nama_ibu?.trim() || `Ibu dari ${s.nama_siswa}`,
                roleLabel: `Ibu dari ${s.nama_siswa}${kelasBadge}`,
              },
              {
                key: 'wali',
                rawPhone: s.no_hp_wali,
                displayName: s.nama_wali?.trim() || `Wali dari ${s.nama_siswa}`,
                roleLabel: `Wali dari ${s.nama_siswa}${kelasBadge}`,
              },
              {
                key: 'ortu',
                rawPhone: s.no_hp_ortu,
                displayName:
                  s.nama_ibu?.trim() ||
                  s.nama_ayah?.trim() ||
                  s.nama_wali?.trim() ||
                  `Orang Tua ${s.nama_siswa}`,
                roleLabel: `Orang Tua dari ${s.nama_siswa}${kelasBadge}`,
              },
            ];

            for (const c of candidates) {
              const rawPhone = String(c.rawPhone || '').trim();
              if (!rawPhone) continue;
              const normalizedPhone = extractDigits(rawPhone);
              pushItem({
                id: `ortu:${s.id}:${c.key}`,
                recipientType: 'ORTU',
                name: c.displayName,
                phone: rawPhone,
                normalizedPhone,
                studentName: s.nama_siswa,
                kelasName,
                subtitle: c.roleLabel,
              });
            }
          }

          for (const o of accountOrtuRows) {
            const rawPhone = String(o.no_hp || '').trim();
            if (!rawPhone) continue;
            const normalizedPhone = extractDigits(rawPhone);
            const firstChild = o.OrangTuaSiswa?.[0]?.Siswa;
            const kelasName = firstChild?.Kelas?.nama_kelas || undefined;
            const childLabel = firstChild?.nama_siswa
              ? `Ortu dari ${firstChild.nama_siswa}${kelasName ? ` (${kelasName})` : ''}`
              : 'Akun Orang Tua / Wali';

            pushItem({
              id: `ortu-acc:${o.id}`,
              recipientType: 'ORTU',
              name: o.nama || childLabel,
              phone: rawPhone,
              normalizedPhone,
              studentName: firstChild?.nama_siswa || undefined,
              kelasName,
              subtitle: childLabel,
            });
          }
        })(),
      );
    }

    await Promise.all(tasks);
    return items.slice(0, limit * (typeFilter === 'ALL' ? 3 : 1));
  }

  async sendAttendanceNotification(tenantId: string, studentName: string, time: string, type: 'MASUK' | 'PULANG', parentNumber: string) {
    const config = await this.getConfig(tenantId);
    if (!config || !config.is_active) return;

    let template = type === 'MASUK' ? config.template_absen_masuk : config.template_absen_pulang;
    if (!template) return;

    const message = template
      .replace(/{{nama_siswa}}/g, studentName)
      .replace(/{{waktu}}/g, time)
      .replace(/{{tipe}}/g, type === 'MASUK' ? 'Masuk' : 'Pulang');

    return this.sendMessage(config, parentNumber, message);
  }
}
