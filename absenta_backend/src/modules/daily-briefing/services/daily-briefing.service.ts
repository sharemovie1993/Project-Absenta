/**
 * daily-briefing.service.ts
 * Layanan orkestrator Universal Daily Briefing & Tokenized Report Engine.
 *
 * Menerapkan Strategy Pattern:
 * - Mengelola registrasi collector per peran (Kepala Sekolah, Walas, Kaprog, dll)
 * - Menangani verifikasi token, resolusi nomor telepon penerima, dan transmisi via WhatsApp Gateway
 */

import { prisma } from '@/utils/prisma';
import { WhatsappService } from '@/modules/whatsapp/services/whatsapp.service';
import { briefingTokenService } from './briefing-token.service';
import { IBriefingCollector } from './collectors/briefing-collector.interface';
import { KepsekBriefingCollector } from './collectors/kepsek-briefing.collector';
import {
  BriefingRole,
  UniversalBriefingData,
} from '../types/briefing.types';

export class DailyBriefingService {
  private collectors = new Map<BriefingRole, IBriefingCollector>();
  private whatsappService: WhatsappService;

  constructor() {
    this.whatsappService = new WhatsappService();

    // ── Registrasi Collector Peran (Universal Registry) ──────────────────────
    this.registerCollector('KEPALA_SEKOLAH', new KepsekBriefingCollector());
    // Posisi jabatan masa depan cukup didaftarkan di sini:
    // this.registerCollector('WALIKELAS', new WalasBriefingCollector());
    // this.registerCollector('KAPROG', new KaprogBriefingCollector());
    // this.registerCollector('KURIKULUM', new KurikulumBriefingCollector());
  }

  /**
   * Mendaftarkan collector baru untuk posisi jabatan tertentu
   */
  public registerCollector(role: BriefingRole, collector: IBriefingCollector) {
    this.collectors.set(role, collector);
  }

  /**
   * Mengambil data briefing berdasarkan token publik
   */
  public async getBriefingByToken(token: string): Promise<UniversalBriefingData> {
    const payload = briefingTokenService.verifyToken(token);
    const collector = this.collectors.get(payload.role);

    if (!collector) {
      throw new Error(`Kolektor data untuk peran '${payload.role}' belum didukung`);
    }

    return collector.collect(
      payload.tenantId,
      payload.tanggal,
      payload.targetUserId,
      payload.targetEntityId
    );
  }

  /**
   * Mengumpulkan data briefing secara langsung (untuk preview di dashboard)
   */
  public async getBriefingDirect(
    tenantId: string,
    role: BriefingRole,
    tanggal?: string,
    targetUserId?: string,
    targetEntityId?: string
  ): Promise<UniversalBriefingData> {
    const collector = this.collectors.get(role);
    if (!collector) {
      throw new Error(`Kolektor data untuk peran '${role}' belum didukung`);
    }
    return collector.collect(tenantId, tanggal, targetUserId, targetEntityId);
  }

  /**
   * Menemukan nomor WhatsApp Kepala Sekolah untuk suatu tenant
   */
  public async resolveKepsekPhoneNumber(tenantId: string): Promise<{ phone: string; name: string } | null> {
    // 1. Cek OrganizationalAssignment dengan kode KEPALA_SEKOLAH / KS
    try {
      const kepsekPosition = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
          Position: {
            code: { in: ['KEPALA_SEKOLAH', 'KEPSEK', 'HEADMASTER', 'KS'] },
          },
        },
        include: {
          User: true,
        },
      });

      if (kepsekPosition?.User?.no_hp) {
        return {
          phone: kepsekPosition.User.no_hp,
          name: kepsekPosition.User.full_name || 'Kepala Sekolah',
        };
      }
    } catch {}

    // 2. Cek User dengan nama / email kepala sekolah
    try {
      const kepsekUser = await prisma.user.findFirst({
        where: {
          tenant_id: tenantId,
          status: 'ACTIVE',
          no_hp: { not: null },
          OR: [
            { full_name: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
            { email: { contains: 'kepsek', mode: 'insensitive' } },
          ],
        },
      });

      if (kepsekUser?.no_hp) {
        return {
          phone: kepsekUser.no_hp,
          name: kepsekUser.full_name || 'Kepala Sekolah',
        };
      }
    } catch {}

    // 3. Cek Profil Sekolah (Sekolah.kepala_sekolah & telepon)
    try {
      const sekolah = await prisma.sekolah.findFirst({
        where: { tenant_id: tenantId },
      });

      if (sekolah?.kepala_sekolah) {
        // Cari nomor HP di tabel Guru yang namanya cocok
        const matchedGuru = await prisma.guru.findFirst({
          where: {
            tenant_id: tenantId,
            nama_guru: { contains: sekolah.kepala_sekolah.trim(), mode: 'insensitive' },
          },
        });

        const phone = matchedGuru?.no_hp || sekolah.telepon;
        if (phone) {
          return {
            phone,
            name: sekolah.kepala_sekolah,
          };
        }
      }

      if (sekolah?.telepon) {
        return {
          phone: sekolah.telepon,
          name: sekolah.kepala_sekolah || 'Kepala Sekolah',
        };
      }
    } catch {}

    return null;
  }

  /**
   * Memformat template pesan WhatsApp
   */
  public formatWhatsappMessage(data: UniversalBriefingData, tokenUrl: string): string {
    const lines: string[] = [];

    lines.push(`*LAPORAN EKSEKUTIF HARIAN SEKOLAH*`);
    lines.push(`${data.sekolahNama}`);
    lines.push(`📅 ${data.tanggalStr}`);
    lines.push(``);
    lines.push(`Yth. *${data.targetName}*,`);
    lines.push(`Berikut ringkasan operasional harian sekolah hari ini:`);
    if (data.statusBadge) {
      const icon = data.statusBadge.variant === 'success' ? '🟢' : (data.statusBadge.variant === 'warning' ? '🟡' : '🔴');
      lines.push(`${icon} Status Operasional: *${data.statusBadge.label}* (Indeks: ${data.statusBadge.score}%)`);
    }
    if (data.trend?.kehadiranDeltaPct !== null && data.trend?.kehadiranDeltaPct !== undefined) {
      const sign = data.trend.kehadiranDeltaPct >= 0 ? '+' : '';
      lines.push(`📈 Tren Siswa: *${sign}${data.trend.kehadiranDeltaPct}%* dibanding hari kemarin`);
    }
    lines.push(``);

    // Ringkasan Metrics Utama
    lines.push(`📊 *RINGKASAN UTAMA*`);
    for (const m of data.metrics) {
      lines.push(`• ${m.label}: *${m.value}* (${m.sub || ''})`);
    }

    lines.push(``);

    // Poin-poin Highlights
    if (data.highlights && data.highlights.length > 0) {
      lines.push(`⚡ *ATENSI & STATUS*`);
      for (const h of data.highlights) {
        lines.push(`• ${h}`);
      }
      lines.push(``);
    }

    // Progres Tiap Divisi (Ringkas)
    const progressSections = (data.sections || []).filter((s) => s.progressBars && s.progressBars.length > 0);
    if (progressSections.length > 0) {
      lines.push(`🏛️ *PROGRES DIVISI HARI INI*`);
      for (const sec of progressSections) {
        const barsText = sec.progressBars!
          .map((pb) => `${pb.label}: *${pb.value}%*`)
          .join(' | ');
        lines.push(`• *${sec.category}*: ${barsText}`);
      }
      lines.push(``);
    }

    // Leaderboard Guru & Siswa Terbaik + Galeri Bukti KBM
    if (
      (data.leaderboard &&
        (data.leaderboard.topTeachers.length > 0 || data.leaderboard.topStudents.length > 0)) ||
      (data.kbmGallery && data.kbmGallery.items.length > 0)
    ) {
      lines.push(`🏆 *APRESIASI & DOKUMENTASI KBM*`);
      if (data.leaderboard?.topTeachers?.[0]) {
        const topG = data.leaderboard.topTeachers[0];
        lines.push(`• Guru Terbaik: *${topG.name}* (${topG.badge})`);
      }
      if (data.leaderboard?.topStudents?.[0]) {
        const topS = data.leaderboard.topStudents[0];
        lines.push(`• Siswa Terbaik: *${topS.name}* (${topS.subtitle} • ${topS.badge})`);
      }
      if (data.kbmGallery && data.kbmGallery.items.length > 0) {
        lines.push(
          `• Galeri Bukti KBM: *${data.kbmGallery.items.length} Foto Kegiatan* terlampir di tautan laporan`
        );
      }
      lines.push(``);
    }

    // Tautan Akses Laporan Ber-token
    lines.push(`🔗 *Laporan Lengkap & Rekapitulasi Divisi:*`);
    lines.push(`${tokenUrl}`);
    lines.push(``);
    lines.push(`_Tautan di atas aman, bersifat read-only, dan dapat langsung dibuka di ponsel tanpa login (berlaku 48 jam)._`);
    lines.push(`_Sistem Absenta Otomatis - Pukul 19:00 WIB_`);

    return lines.join('\n');
  }

  /**
   * Mendapatkan Base URL frontend spesifik milik tenant (misal: https://smkn1pld.absenta.id atau custom domain)
   */
  public async resolveTenantFrontendBaseUrl(tenantId: string, originHint?: string): Promise<string> {
    // 1. Jika originHint valid dari request aktif dan bukan domain generic auth/api
    if (originHint && typeof originHint === 'string' && /^https?:\/\//i.test(originHint.trim())) {
      try {
        const urlObj = new URL(originHint.trim());
        const host = urlObj.hostname.toLowerCase();
        if (!host.startsWith('api.') && !host.startsWith('admin.') && host !== 'absenta.id') {
          return `${urlObj.protocol}//${urlObj.host}`;
        }
      } catch {}
    }

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          subdomain: true,
          custom_domain: true,
        },
      });

      // 2. Jika ada custom domain khusus (misal: absensi.smkn1plered.sch.id)
      if (tenant?.custom_domain) {
        const cd = tenant.custom_domain.trim().replace(/\/+$/, '');
        if (/^https?:\/\//i.test(cd)) return cd;
        const scheme = (process.env.PUBLIC_APP_SCHEME || 'https').trim();
        return `${scheme}://${cd}`;
      }

      // 3. Jika ada subdomain tenant (misal: smkn1pld -> https://smkn1pld.absenta.id)
      if (tenant?.subdomain) {
        const sub = tenant.subdomain.trim().toLowerCase();
        const baseDomain = (
          process.env.MAIN_DOMAIN ||
          process.env.PUBLIC_DOMAIN_BASE ||
          process.env.TENANT_BASE_DOMAIN ||
          'absenta.id'
        ).trim().toLowerCase();

        const scheme = (process.env.PUBLIC_APP_SCHEME || 'https').trim();

        // Jika subdomain sudah mengandung baseDomain
        if (sub.endsWith(`.${baseDomain}`) || sub === baseDomain) {
          return `${scheme}://${sub}`;
        }

        return `${scheme}://${sub}.${baseDomain}`;
      }
    } catch (err: any) {
      console.warn('[dailyBriefingService] Failed to resolve tenant domain:', err.message);
    }

    // 4. Fallback ke konfigurasi global
    const hostUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'https://absenta.id';
    return hostUrl.replace(/\/+$/, '');
  }

  /**
   * Mengambil konfigurasi WA Group tujuan default Daily Briefing per tenant
   */
  public async getBriefingGroupTarget(tenantId: string): Promise<{ groupJid: string; groupName: string } | null> {
    try {
      const cfg = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'DAILY_BRIEFING_WA_GROUP' },
      });
      if (!cfg?.value) return null;
      const parsed = JSON.parse(cfg.value);
      if (parsed?.groupJid) {
        return {
          groupJid: String(parsed.groupJid),
          groupName: String(parsed.groupName || parsed.groupJid),
        };
      }
    } catch {}
    return null;
  }

  /**
   * Menyimpan konfigurasi WA Group tujuan default Daily Briefing per tenant
   */
  public async saveBriefingGroupTarget(
    tenantId: string,
    groupJid: string | null,
    groupName?: string
  ): Promise<{ groupJid: string; groupName: string } | null> {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'DAILY_BRIEFING_WA_GROUP' },
    });

    if (!groupJid || !groupJid.trim()) {
      if (existing) {
        await prisma.config.delete({ where: { id: existing.id } });
      }
      return null;
    }

    const payload = {
      groupJid: groupJid.trim(),
      groupName: (groupName || groupJid).trim(),
    };
    const serialized = JSON.stringify(payload);

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value: serialized },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'DAILY_BRIEFING_WA_GROUP',
          value: serialized,
          description: 'Target Grup WhatsApp default untuk pengiriman Ringkasan Kegiatan Sekolah Harian',
        },
      });
    }
    return payload;
  }

  /**
   * Menghasilkan token, pesan WA, dan mengirimkan ke penerima
   */
  public async sendBriefingViaWhatsapp(
    tenantId: string,
    role: BriefingRole = 'KEPALA_SEKOLAH',
    tanggal?: string,
    targetPhoneOverride?: string,
    originHint?: string
  ): Promise<{ success: boolean; message: string; recipient?: string; tokenUrl?: string }> {
    // 1. Dapatkan config WA gateway tenant
    const waConfig = await this.whatsappService.getConfig(tenantId);
    if (!waConfig || !waConfig.is_active) {
      return {
        success: false,
        message: 'WhatsApp Gateway belum diaktifkan pada tenant ini',
      };
    }

    // 2. Kumpulkan data briefing
    const data = await this.getBriefingDirect(tenantId, role, tanggal);

    // 3. Tentukan nomor telepon / JID grup tujuan
    let recipientPhone = targetPhoneOverride;
    let recipientName = data.targetName;

    if (!recipientPhone) {
      if (role === 'KEPALA_SEKOLAH') {
        const groupTarget = await this.getBriefingGroupTarget(tenantId);
        if (groupTarget?.groupJid) {
          recipientPhone = groupTarget.groupJid;
          recipientName = `Grup WA: ${groupTarget.groupName}`;
        } else {
          const resolved = await this.resolveKepsekPhoneNumber(tenantId);
          if (resolved) {
            recipientPhone = resolved.phone;
            recipientName = resolved.name;
          }
        }
      }
    } else if (recipientPhone.includes('@g.us')) {
      recipientName = 'Grup WhatsApp';
    }

    if (!recipientPhone) {
      return {
        success: false,
        message: `Nomor WhatsApp untuk peran '${role}' tidak ditemukan pada sistem`,
      };
    }

    // 4. Generate token 48 jam
    const token = briefingTokenService.generateToken({
      tenantId,
      role,
      tanggal: data.tanggalIso,
    });

    const cleanHost = await this.resolveTenantFrontendBaseUrl(tenantId, originHint);
    const tokenUrl = `${cleanHost}/reports/daily-briefing?token=${token}`;

    // 5. Format pesan WhatsApp
    const message = this.formatWhatsappMessage(data, tokenUrl);

    // 6. Kirim via WhatsApp Service
    try {
      await this.whatsappService.sendMessage(waConfig, recipientPhone, message);
      return {
        success: true,
        message: `Laporan harian berhasil dikirim ke ${recipientName} (${recipientPhone})`,
        recipient: recipientPhone,
        tokenUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengirim WhatsApp: ${err.message || 'Error tidak diketahui'}`,
      };
    }
  }
}

export const dailyBriefingService = new DailyBriefingService();
