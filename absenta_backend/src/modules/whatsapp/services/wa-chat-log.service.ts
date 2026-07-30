import { prisma } from '@/utils/prisma';

/**
 * Service untuk menyimpan log percakapan WhatsApp Chatbot.
 * Log otomatis dihapus setelah 3 bulan via cleanupOldLogs().
 */
export class WaChatLogService {
  /**
   * Simpan pesan masuk (user → bot).
   */
  static async logIn(params: {
    tenantId: string | null;
    jid: string;
    phone: string;
    nama?: string | null;
    role?: string | null;
    message: string;
  }): Promise<void> {
    if (!params.tenantId) return; // Jangan log jika tenant belum diketahui
    try {
      await prisma.waChatLog.create({
        data: {
          tenant_id: params.tenantId,
          jid: params.jid,
          phone: params.phone,
          nama: params.nama ?? null,
          role: params.role ?? null,
          direction: 'IN',
          message: params.message,
        },
      });
    } catch (err: any) {
      console.warn('[WaChatLog] Failed to log IN message:', err.message);
    }
  }

  /**
   * Simpan pesan keluar (bot → user).
   */
  static async logOut(params: {
    tenantId: string | null;
    jid: string;
    phone: string;
    nama?: string | null;
    role?: string | null;
    message: string;
  }): Promise<void> {
    if (!params.tenantId) return;
    try {
      await prisma.waChatLog.create({
        data: {
          tenant_id: params.tenantId,
          jid: params.jid,
          phone: params.phone,
          nama: params.nama ?? null,
          role: params.role ?? null,
          direction: 'OUT',
          message: params.message,
        },
      });
    } catch (err: any) {
      console.warn('[WaChatLog] Failed to log OUT message:', err.message);
    }
  }

  /**
   * Hapus semua log yang lebih tua dari 3 bulan.
   * Dipanggil dari cron job harian.
   */
  static async cleanupOldLogs(): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await prisma.waChatLog.deleteMany({
      where: {
        created_at: { lt: threeMonthsAgo },
      },
    });

    if (result.count > 0) {
      console.log(`[WaChatLog] Cleaned up ${result.count} old chat log(s) older than 3 months.`);
    }

    return result.count;
  }

  /**
   * Daftar kontak unik yang pernah chat (1 row per nomor HP, pesan terakhir).
   */
  static async listContacts(tenantId: string, params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { search = '', page = 1, limit = 30 } = params;
    const offset = (page - 1) * limit;

    // Subquery: ambil created_at MAX per phone
    const rawRows = await prisma.$queryRaw<
      Array<{
        phone: string;
        nama: string | null;
        role: string | null;
        last_message: string;
        last_direction: string;
        last_at: Date;
        total_in: bigint;
        total_out: bigint;
      }>
    >`
      SELECT
        phone,
        nama,
        role,
        last_message,
        last_direction,
        last_at,
        total_in,
        total_out
      FROM (
        SELECT DISTINCT ON (phone)
          phone,
          nama,
          role,
          message AS last_message,
          direction AS last_direction,
          created_at AS last_at,
          (SELECT COUNT(*) FROM "WaChatLog" c2 WHERE c2.phone = c1.phone AND c2.tenant_id = ${tenantId} AND c2.direction = 'IN') AS total_in,
          (SELECT COUNT(*) FROM "WaChatLog" c2 WHERE c2.phone = c1.phone AND c2.tenant_id = ${tenantId} AND c2.direction = 'OUT') AS total_out
        FROM "WaChatLog" c1
        WHERE c1.tenant_id = ${tenantId}
          AND (
            ${search} = '' OR
            c1.phone ILIKE ${'%' + search + '%'} OR
            c1.nama ILIKE ${'%' + search + '%'}
          )
        ORDER BY phone, created_at DESC
      ) sub
      ORDER BY last_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT phone) AS count
      FROM "WaChatLog"
      WHERE tenant_id = ${tenantId}
        AND (
          ${search} = '' OR
          phone ILIKE ${'%' + search + '%'} OR
          nama ILIKE ${'%' + search + '%'}
        )
    `;

    return {
      data: rawRows.map(r => ({
        phone: r.phone,
        nama: r.nama,
        role: r.role,
        last_message: r.last_message,
        last_direction: r.last_direction,
        last_at: r.last_at,
        total_in: Number(r.total_in),
        total_out: Number(r.total_out),
      })),
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
    };
  }

  /**
   * Detail riwayat chat per nomor HP (timeline ascending).
   */
  static async getChatDetail(tenantId: string, phone: string, params: {
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.waChatLog.findMany({
        where: { tenant_id: tenantId, phone },
        orderBy: { created_at: 'asc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          direction: true,
          message: true,
          nama: true,
          role: true,
          created_at: true,
        },
      }),
      prisma.waChatLog.count({ where: { tenant_id: tenantId, phone } }),
    ]);

    return { data: messages, total, page, limit };
  }
}
