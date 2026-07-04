import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { waGatewayService } from '@/services/wa-gateway.service';

export const SARPRAS_OVERDUE_REMINDER_JOB_NAME = 'sarpras-overdue-reminder';

export default defineCronJob({
  name: SARPRAS_OVERDUE_REMINDER_JOB_NAME,
  schedule: '0 8 * * *', // Setiap hari pukul 08:00 pagi
  async run() {
    const now = new Date();

    const overdueLoans = await prisma.sarprasLoan.findMany({
      where: {
        status: 'ACTIVE',
        tanggal_kembali_plan: { lt: now }
      },
      include: {
        Asset: true,
        Peminjam: true
      }
    });

    if (overdueLoans.length === 0) {
      appLogger.info({ job: SARPRAS_OVERDUE_REMINDER_JOB_NAME }, 'Tidak ada peminjaman sarpras yang jatuh tempo');
      return;
    }

    let sentCount = 0;
    for (const loan of overdueLoans) {
      const peminjam = loan.Peminjam;
      if (!peminjam.no_hp) {
        appLogger.warn({ job: SARPRAS_OVERDUE_REMINDER_JOB_NAME, userId: peminjam.id }, `Peminjam ${peminjam.full_name} tidak memiliki nomor WhatsApp`);
        continue;
      }

      const tanggalKembaliPlanStr = loan.tanggal_kembali_plan ? loan.tanggal_kembali_plan.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }) : '-';

      const pesan = `Halo ${peminjam.full_name},\n\n` +
        `Ini adalah pengingat otomatis dari sistem Sarpras sekolah bahwa peminjaman barang berikut telah melewati batas waktu pengembalian:\n\n` +
        `- Barang: *${loan.Asset.nama}* (Kode: ${loan.Asset.kode || '-'})\n` +
        `- Rencana Kembali: *${tanggalKembaliPlanStr}*\n\n` +
        `Mohon segera mengembalikan barang tersebut ke petugas Sarpras. Terima kasih atas kerja samanya.`;

      try {
        await waGatewayService.sendMessageSoft(loan.tenant_id, peminjam.no_hp, pesan);
        sentCount++;
      } catch (err: any) {
        appLogger.error({ job: SARPRAS_OVERDUE_REMINDER_JOB_NAME, err: err.message }, `Gagal mengirim WA jatuh tempo ke ${peminjam.full_name}`);
      }
    }

    appLogger.info({ job: SARPRAS_OVERDUE_REMINDER_JOB_NAME, sentCount }, `Selesai memproses pengingat jatuh tempo sarpras. Dikirim: ${sentCount}`);
  }
});
