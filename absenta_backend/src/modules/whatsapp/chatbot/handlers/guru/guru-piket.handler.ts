import { ChatbotContext } from '../../core/chatbot-context';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';
import { prisma } from '@/utils/prisma';

export class GuruPiketHandler {
  /**
   * MENU 9 / IZIN KELUAR: Cek Daftar Siswa Izin Keluar Aktif (Piket)
   * Contoh: "9", "izin keluar", "siswa izin", "piket izin", "izin bobi"
   */
  static async handleSiswaIzinKeluar(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id || ctx.siswa?.tenant_id || ctx.ortu?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant sekolah tidak ditemukan.';

    const tz = await getTenantTimezone(tenantId);
    const offsetStr = getTenantOffsetString(tz);

    // Tanggal Hari Ini Sesuai Timezone Tenant
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' }); // YYYY-MM-DD
    const tglFormatted = new Date().toLocaleDateString('id-ID', {
      timeZone: tz || 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999${offsetStr}`);

    const rawText = (ctx.messageText || '').trim();
    let filterName = '';

    // Strip command prefix if any e.g. "9 bobi", "izin bobi", "siswa izin bobi"
    if (/^(9|izin\s*keluar|siswa\s*izin|piket\s*izin|izin\s*piket|piket)\b/i.test(rawText)) {
      filterName = rawText.replace(/^(9|izin\s*keluar|siswa\s*izin|piket\s*izin|izin\s*piket|piket)\s*/i, '').trim();
    } else if (!/^\d{1,2}$/.test(rawText)) {
      filterName = rawText;
    }

    const whereClause: any = {
      tenant_id: tenantId,
      jam_keluar: { gte: startOfDay, lte: endOfDay },
    };

    if (filterName && filterName.length >= 2) {
      whereClause.SiswaAkademik = {
        siswa: {
          nama_siswa: { contains: filterName, mode: 'insensitive' },
        },
      };
    }

    const izinList = await prisma.izinKeluarSiswa.findMany({
      where: whereClause,
      include: {
        SiswaAkademik: {
          include: {
            siswa: { select: { nama_siswa: true, nis: true } },
            kelas: { select: { nama_kelas: true } },
          },
        },
        GuruPiket: { select: { nama_guru: true } },
      },
      orderBy: { jam_keluar: 'desc' },
    });

    if (izinList.length === 0) {
      if (filterName) {
        return (
          `🟨 *Daftar Siswa Izin Keluar*\n\n` +
          `❌ Tidak ada catatan izin keluar hari ini (${tglFormatted}) untuk siswa dengan nama *"${filterName}"*.\n\n` +
          `💡 Ketik *[9]* untuk lihat seluruh izin keluar hari ini.`
        );
      }
      return (
        `🟨 *Daftar Siswa Izin Keluar Hari Ini*\n📅 ${tglFormatted}\n\n` +
        `✅ Tidak ada siswa yang sedang izin keluar saat ini. 😊\n\n` +
        `💡 Ketik *[0]* untuk Menu Utama.`
      );
    }

    // Kelompokkan: Active (Sedang Keluar) vs Kembali
    const activeList = izinList.filter(i => i.status === 'DISETUJUI' && !i.jam_kembali);
    const returnedList = izinList.filter(i => i.status === 'KEMBALI' || !!i.jam_kembali);

    let msg = `🟨 *Daftar Siswa Izin Keluar (${tglFormatted})*\n`;
    if (filterName) {
      msg += `🔍 Hasil Pencarian: "${filterName}"\n\n`;
    } else {
      msg += `⏱️ *SISWA SEDANG KELUAR (AKTIF):* (${activeList.length} Siswa)\n\n`;
    }

    if (activeList.length === 0 && !filterName) {
      msg += `(Tidak ada siswa yang sedang di luar sekolah saat ini)\n\n`;
    } else {
      activeList.forEach((item, idx) => {
        const siswaName = item.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
        const kelasName = item.SiswaAkademik?.kelas?.nama_kelas || '-';
        const jamKeluarStr = new Date(item.jam_keluar).toLocaleTimeString('id-ID', {
          timeZone: tz || 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        });
        const piketName = item.GuruPiket?.nama_guru || '-';

        msg += `${idx + 1}. *${siswaName}* (${kelasName})\n`;
        msg += `   ├ ⏱️ Jam Keluar: ${jamKeluarStr} WIB\n`;
        msg += `   ├ 📝 Alasan: "${item.alasan}"\n`;
        msg += `   └ 👮 Guru Piket: ${piketName}\n\n`;
      });
    }

    if (returnedList.length > 0) {
      msg += `✅ *SUDAH KEMBALI:* (${returnedList.length} Siswa)\n`;
      returnedList.slice(0, 5).forEach((item, idx) => {
        const siswaName = item.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
        const kelasName = item.SiswaAkademik?.kelas?.nama_kelas || '-';
        const jamKembaliStr = item.jam_kembali ? new Date(item.jam_kembali).toLocaleTimeString('id-ID', {
          timeZone: tz || 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }) : '-';

        msg += `${idx + 1}. *${siswaName}* (${kelasName}) — Kembali ${jamKembaliStr} WIB\n`;
      });
      msg += `\n`;
    }

    msg += `💡 Ketik *izin [nama siswa]* untuk cari nama siswa tertentu.\n`;
    msg += `💡 Ketik *[0]* untuk Menu Utama.`;

    return msg;
  }
}
