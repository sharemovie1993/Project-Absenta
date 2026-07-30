import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';

export class GuruWalikelasHandler {
  static async handleDaftarWaliKelas(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    let waliAssignments: any[] = [];
    try {
      waliAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: guru.tenant_id,
          is_active: true,
          kelas_id: { not: null },
          Position: { code: 'WALIKELAS' },
        },
        include: {
          Kelas: { select: { nama_kelas: true, tingkat: true } },
          User: { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
        },
        take: 50,
      });
    } catch {
      try {
        waliAssignments = await prisma.organizationalAssignment.findMany({
          where: {
            tenant_id: guru.tenant_id,
            is_active: true,
            kelas_id: { not: null },
            Position: { OR: [{ code: 'WALIKELAS' }, { name: { contains: 'Wali', mode: 'insensitive' } }] },
          },
          include: {
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            User: { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
          },
          take: 50,
        });
      } catch {
        waliAssignments = [];
      }
    }

    if (waliAssignments.length === 0) {
      return (
        `🏫 *Daftar Wali Kelas Sekolah*\n\n` +
        `Belum ada penugasan Wali Kelas yang tercatat di sistem.\n` +
        `Hubungi admin untuk mengatur penugasan Wali Kelas.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    waliAssignments.sort((a: any, b: any) => {
      const ka = `${a.Kelas?.tingkat || 0}-${a.Kelas?.nama_kelas || ''}`;
      const kb = `${b.Kelas?.tingkat || 0}-${b.Kelas?.nama_kelas || ''}`;
      return ka.localeCompare(kb);
    });

    let msg = `🏫 *Daftar Wali Kelas Aktif*\n`;
    msg += `Total: ${waliAssignments.length} kelas\n\n`;
    waliAssignments.forEach((w: any, i: number) => {
      const kelasNama = w.Kelas?.nama_kelas || '-';
      const guruNama = w.User?.Guru?.nama_guru || w.User?.name || 'Belum ditentukan';
      msg += `${i + 1}. *${kelasNama}* — ${guruNama}\n`;
    });
    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
