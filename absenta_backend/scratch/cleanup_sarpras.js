/**
 * CLEANUP SCRIPT: Hapus cascade semua data SARPRAS untuk tenant 2krw@gmail.com
 * Urutan hapus: Payment → Invoice → Billing → PlanChangeRequest → Subscription
 *
 * JALANKAN SEBELUM simulasi baru agar kondisi fresh / bersih.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_EMAIL = '2krw@gmail.com';
const SERVICE_CODE  = 'SARPRAS';

async function cleanup() {
  console.log(`\n🧹 Memulai CLEANUP CASCADE untuk service "${SERVICE_CODE}" — tenant: ${TENANT_EMAIL}\n`);

  try {
    // ── 0. Temukan user & tenant ──────────────────────────────────────────────
    const user = await prisma.user.findFirst({ where: { email: TENANT_EMAIL } });
    if (!user) throw new Error(`User ${TENANT_EMAIL} tidak ditemukan.`);
    const tenantId = user.tenant_id;
    console.log(`✅ Tenant ID: ${tenantId}`);

    // ── 1. Temukan semua subscription SARPRAS milik tenant ───────────────────
    const subscriptions = await prisma.subscription.findMany({
      where: { tenant_id: tenantId, service_code: SERVICE_CODE },
      include: {
        Billing: {
          include: { Invoice: true }
        },
        PlanChangeRequest: true
      }
    });

    if (subscriptions.length === 0) {
      console.log(`ℹ️  Tidak ada subscription "${SERVICE_CODE}" ditemukan. Tidak ada yang perlu dihapus.`);
      return;
    }

    console.log(`🔍 Ditemukan ${subscriptions.length} subscription "${SERVICE_CODE}" untuk dihapus.\n`);

    for (const sub of subscriptions) {
      console.log(`\n--- Memproses Subscription: ${sub.id} (Status: ${sub.status}) ---`);

      for (const billing of (sub.Billing || [])) {
        if (billing.Invoice) {
          // ── 1a. Hapus Payment berdasarkan invoice_id ──────────────────
          const deletedPayments = await prisma.payment.deleteMany({
            where: { invoice_id: billing.Invoice.id }
          });
          if (deletedPayments.count > 0) {
            console.log(`  🗑️  Payment dihapus (${deletedPayments.count} record) untuk invoice: ${billing.Invoice.invoice_number}`);
          }

          // ── 1b. Hapus InvoicePublicToken yang merujuk invoice ini ──────
          await prisma.invoicePublicToken.deleteMany({ where: { invoice_id: billing.Invoice.id } });

          // ── 1c. Hapus ActivityLog terkait invoice (jika ada relasi) ──────
          try {
            await prisma.activityLog.deleteMany({
              where: { entity_id: billing.Invoice.id }
            });
          } catch (_) { /* abaikan jika tabel tidak punya kolom entity_id */ }

          // ── 1d. Hapus Invoice ──────────────────────────────────────────
          await prisma.invoice.delete({ where: { id: billing.Invoice.id } });
          console.log(`  🗑️  Invoice dihapus: ${billing.Invoice.invoice_number}`);
        }

        // ── 1e. Hapus Billing ─────────────────────────────────────────────
        await prisma.billing.delete({ where: { id: billing.id } });
        console.log(`  🗑️  Billing dihapus: ${billing.id}`);
      }

      // ── 1f. Hapus PlanChangeRequest ────────────────────────────────────
      const pcrs = sub.PlanChangeRequest || [];
      if (pcrs.length > 0) {
        const pcrIds = pcrs.map(p => p.id);
        await prisma.planChangeRequest.deleteMany({ where: { id: { in: pcrIds } } });
        console.log(`  🗑️  PlanChangeRequest dihapus (${pcrIds.length} record)`);
      }

      // ── 1g. Hapus Subscription ─────────────────────────────────────────
      await prisma.subscription.delete({ where: { id: sub.id } });
      console.log(`  🗑️  Subscription dihapus: ${sub.id}`);
    }

    // ── 2. Verifikasi akhir ───────────────────────────────────────────────────
    const remaining = await prisma.subscription.count({
      where: { tenant_id: tenantId, service_code: SERVICE_CODE }
    });

    if (remaining === 0) {
      console.log(`\n🏆 CLEANUP BERHASIL — tidak ada sisa subscription "${SERVICE_CODE}" untuk tenant ${TENANT_EMAIL}.`);
    } else {
      console.log(`\n⚠️  Masih ada ${remaining} subscription tersisa. Periksa secara manual.`);
    }

  } catch (err) {
    console.error('\n❌ ERROR saat cleanup:', err.message);
    if (err.code) console.error('   Prisma Error Code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
