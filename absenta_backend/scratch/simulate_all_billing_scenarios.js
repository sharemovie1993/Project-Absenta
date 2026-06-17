/**
 * SIMULASI KOMPREHENSIF EKOSISTEM BILLING / SUBSCRIPTION
 * ========================================================
 * Mencakup semua skenario dari hulu ke hilir:
 *
 * SKENARIO A: Happy Path (Order → Bayar → Aktif)          ← sudah teruji
 * SKENARIO B: Batal di tahap pilih paket (belum bayar)
 * SKENARIO C: Batal di tahap pembayaran (sudah pilih metode, belum lunas)
 * SKENARIO D: Ganti metode pembayaran (Payment Superseded)
 * SKENARIO E: Webhook gagal / pembayaran expired
 * SKENARIO F: Pembayaran berhasil setelah retry
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://10.10.10.250:3001/api';
const PLAN_ID = 'fea6026b-bb98-4782-aa70-e6764f96e3a2'; // Inventory Sekolah Micro Bulanan

let token = null;
let tenantId = null;
const results = [];

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function login() {
  const res = await axios.post(`${API_URL}/auth/login`, {
    email: '2krw@gmail.com', password: 'admin1234'
  });
  token = res.data.data.token;
  tenantId = res.data.data.user.tenant_id;
  console.log(`✅ Login OK. Tenant: ${tenantId}`);
}

function h() { return { Authorization: `Bearer ${token}` }; }

async function createFreshOrder() {
  // Ambil subscription SARPRAS milik tenant ini
  let sub = await prisma.subscription.findFirst({
    where: { tenant_id: tenantId, service_code: 'SARPRAS' },
    include: { Plan: true }
  });

  if (!sub) throw new Error('Subscription SARPRAS tidak ditemukan untuk tenant ini');

  // Batalkan payment PENDING yang terkait sub ini
  await prisma.payment.updateMany({
    where: {
      Billing: { subscription_id: sub.id },
      status: { in: ['PENDING', 'PROCESSING'] }
    },
    data: { status: 'CANCELLED', failure_reason: 'CLEANUP_FOR_SIMULATION' }
  });

  // Batalkan PCR SCHEDULED
  await prisma.planChangeRequest.updateMany({
    where: { subscription_id: sub.id, status: 'SCHEDULED' },
    data: { status: 'CANCELLED' }
  });

  // Reset subscription ke UPGRADE_PENDING agar konsisten dengan kondisi "sedang order"
  sub = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'UPGRADE_PENDING' },
    include: { Plan: true }
  });

  const plan = sub.Plan;
  if (!plan) throw new Error('Plan tidak ditemukan');

  const amount = plan.billing_period === 'YEAR'
    ? (plan.price_yearly || plan.price_monthly * 12)
    : plan.price_monthly;

  // Buat PCR baru
  const pcr = await prisma.planChangeRequest.create({
    data: {
      subscription_id: sub.id,
      from_plan_id: plan.id,
      to_plan_id: plan.id,
      effective_date: new Date(),
      change_type: 'UPGRADE',
      status: 'SCHEDULED',
      price_snapshot: amount,
      currency: plan.currency || 'IDR',
      reason: 'SIMULATION_TEST',
    }
  });

  // Buat billing dengan billing_date = sekarang + random ms agar tidak collision
  const billingDate = new Date();
  billingDate.setMilliseconds(billingDate.getMilliseconds() + Math.random() * 999);
  const dueDate = new Date(billingDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const billing = await prisma.billing.create({
    data: {
      subscription_id: sub.id,
      tenant_id: tenantId,
      amount: amount,
      billing_date: billingDate,
      due_date: dueDate,
      status: 'UNPAID',
      charge_type: 'UPGRADE',
      upgrade_plan_id_snapshot: plan.id,
      upgrade_price_snapshot: amount,
      plan_change_request_id: pcr.id,
    }
  });

  // Buat invoice
  const invoiceNumber = `INV-SIM-${Date.now()}`;
  const invoice = await prisma.invoice.create({
    data: {
      billing_id: billing.id,
      subscription_id: sub.id,
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      amount: amount,
      total_amount: amount,
      status: 'SENT',
      due_date: dueDate,
      period_start: billingDate,
      period_end: dueDate,
    }
  });

  console.log(`  [DB-DIRECT] Billing: ${billing.id}, Invoice: ${invoice.id}, PCR: ${pcr.id}`);

  return {
    billing_id: billing.id,
    invoice_id: invoice.id,
    subscription_id: sub.id,
    pcr_id: pcr.id,
  };
}

async function restoreSubToActive() {
  await prisma.subscription.updateMany({
    where: { tenant_id: tenantId, service_code: 'SARPRAS' },
    data: { status: 'ACTIVE' }
  });
}


async function createPayment(billing_id) {
  const res = await axios.post(`${API_URL}/payments/create`, {
    billing_id, gateway: 'TRIPAY', method: 'BANK_TRANSFER', channel_code: 'BCAVA'
  }, { headers: h() });
  if (!res.data.success) throw new Error('Buat payment gagal: ' + JSON.stringify(res.data));
  return res.data.data; // { id, gatewayTransactionId, ... }
}

async function getDb_billing(id) {
  return prisma.billing.findUnique({ where: { id }, include: { Invoice: true } });
}
async function getDb_sub(tenantId) {
  return prisma.subscription.findFirst({
    where: { tenant_id: tenantId, service_code: 'SARPRAS' }
  });
}
async function getDb_pcr(subscriptionId) {
  return prisma.planChangeRequest.findFirst({
    where: { subscription_id: subscriptionId },
    orderBy: { created_at: 'desc' }
  });
}
async function getDb_payment(id) {
  return prisma.payment.findUnique({ where: { id } });
}

function verdict(label, checks) {
  const ok = checks.every(c => c.pass);
  results.push({ label, ok, checks });
  const icon = ok ? '✅' : '❌';
  console.log(`\n${icon} SKENARIO ${label}: ${ok ? 'LULUS' :// ─── SKENARIO B: BATAL DI TAHAP PILIH PAKET ─────────────────────────────────
// Kondisi: Order terbentuk, Billing UNPAID, Invoice SENT, BELUM ada Payment
// Aksi   : Panggil POST /billing/subscriptions/upgrade/cancel
// Harapan: Subscription → ACTIVE, Invoice → CANCELLED, PCR → CANCELLED

async function scenarioB() {
  console.log('\n══════════════════════════════════════════════');
  console.log('SKENARIO B: Batal di Tahap Pilih Paket (Belum Bayar)');
  console.log('══════════════════════════════════════════════');

  const order = await createFreshOrder();
  console.log(`  Sub: ${order.subscription_id}, Billing: ${order.billing_id}`);

  const cancelRes = await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id },
    { headers: h() }
  );
  console.log(`  Cancel response: ${JSON.stringify(cancelRes.data)}`);

  await new Promise(r => setTimeout(r, 500));

  const finalBilling = await getDb_billing(order.billing_id);
  const finalSub = await prisma.subscription.findUnique({ where: { id: order.subscription_id } });
  const finalPcr = await getDb_pcr(order.subscription_id);

  verdict('B: Batal Sebelum Bayar', [
    { name: 'Subscription kembali ACTIVE', actual: finalSub?.status, expected: 'ACTIVE', pass: finalSub?.status === 'ACTIVE' },
    { name: 'Invoice → CANCELLED', actual: finalBilling?.Invoice?.status, expected: 'CANCELLED', pass: finalBilling?.Invoice?.status === 'CANCELLED' },
    { name: 'PCR → CANCELLED', actual: finalPcr?.status, expected: 'CANCELLED', pass: finalPcr?.status === 'CANCELLED' },
  ]);
}

// ─── SKENARIO C: BATAL DI TAHAP PEMBAYARAN ───────────────────────────────────
// Kondisi: Order terbentuk, Payment PENDING
// Aksi 1 : Batalkan Payment → POST /payments/:id/cancel
// Aksi 2 : Batalkan Order    → POST /billing/subscriptions/upgrade/cancel
// Harapan: Payment → CANCELLED, Invoice → CANCELLED, PCR → CANCELLED, Sub → ACTIVE

async function scenarioC() {
  console.log('\n══════════════════════════════════════════════');
  console.log('SKENARIO C: Batal di Tahap Pembayaran (Sudah Pilih Metode)');
  console.log('══════════════════════════════════════════════');

  const order = await createFreshOrder();
  const payment = await createPayment(order.billing_id);
  const paymentId = payment.id;
  console.log(`  Payment ID: ${paymentId}`);

  // Step C1: Batalkan payment dulu
  const cancelPayRes = await axios.post(`${API_URL}/payments/${paymentId}/cancel`,
    {}, { headers: h() }
  );
  console.log(`  Cancel Payment: ${JSON.stringify(cancelPayRes.data)}`);

  await new Promise(r => setTimeout(r, 500));

  // Step C2: Batalkan order
  const cancelOrderRes = await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id }, { headers: h() }
  );
  console.log(`  Cancel Order: ${JSON.stringify(cancelOrderRes.data)}`);

  await new Promise(r => setTimeout(r, 500));

  const finalBilling = await getDb_billing(order.billing_id);
  const finalSub = await prisma.subscription.findUnique({ where: { id: order.subscription_id } });
  const finalPcr = await getDb_pcr(order.subscription_id);
  const finalPayment = await getDb_payment(paymentId);

  verdict('C: Batal Setelah Pilih Metode Bayar', [
    { name: 'Payment → CANCELLED', actual: finalPayment?.status, expected: 'CANCELLED', pass: finalPayment?.status === 'CANCELLED' },
    { name: 'Subscription kembali ACTIVE', actual: finalSub?.status, expected: 'ACTIVE', pass: finalSub?.status === 'ACTIVE' },
    { name: 'Invoice → CANCELLED', actual: finalBilling?.Invoice?.status, expected: 'CANCELLED', pass: finalBilling?.Invoice?.status === 'CANCELLED' },
    { name: 'PCR → CANCELLED', actual: finalPcr?.status, expected: 'CANCELLED', pass: finalPcr?.status === 'CANCELLED' },
  ]);
}

// ─── SKENARIO D: GANTI METODE PEMBAYARAN ─────────────────────────────────────
// Kondisi: Order terbentuk, Payment PENDING dengan BCAVA
// Aksi   : Panggil /payments/create lagi dengan metode berbeda
// Harapan: Payment BCAVA lama → CANCELLED (SUPERSEDED), Payment baru PENDING

async function scenarioD() {
  console.log('\n══════════════════════════════════════════════');
  console.log('SKENARIO D: Ganti Metode Pembayaran (Supersede)');
  console.log('══════════════════════════════════════════════');

  const order = await createFreshOrder();
  const paymentA = await createPayment(order.billing_id);
  console.log(`  Payment A (BCAVA) ID: ${paymentA.id}`);

  // Buat payment baru — service akan auto-cancel yang lama
  let paymentBId = null;
  try {
    const payBRes = await axios.post(`${API_URL}/payments/create`, {
      billing_id: order.billing_id,
      gateway: 'TRIPAY',
      method: 'BANK_TRANSFER',
      channel_code: 'BRIVA'
    }, { headers: h() });
    if (payBRes.data.success) {
      paymentBId = payBRes.data.data.id;
      console.log(`  Payment B (BRIVA) ID: ${paymentBId}`);
    } else {
      console.log(`  Payment B response: ${payBRes.data.message}`);
    }
  } catch (e) {
    console.log(`  Payment B error: ${e.response?.data?.message || e.message}`);
  }

  await new Promise(r => setTimeout(r, 500));

  const finalPayA = await getDb_payment(paymentA.id);
  const finalPayB = paymentBId ? await getDb_payment(paymentBId) : null;
  const finalBilling = await getDb_billing(order.billing_id);

  verdict('D: Ganti Metode Pembayaran', [
    { name: 'Payment A (lama) → CANCELLED', actual: finalPayA?.status, expected: 'CANCELLED', pass: finalPayA?.status === 'CANCELLED' },
    { name: 'Payment B (baru) → PENDING', actual: finalPayB?.status, expected: 'PENDING', pass: finalPayB?.status === 'PENDING' },
    { name: 'Billing masih UNPAID', actual: finalBilling?.status, expected: 'UNPAID', pass: finalBilling?.status === 'UNPAID' },
  ]);

  // Cleanup
  if (paymentBId) {
    await axios.post(`${API_URL}/payments/${paymentBId}/cancel`, {}, { headers: h() }).catch(() => {});
  }
  await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id }, { headers: h() }).catch(() => {});
}

// ─── SKENARIO E: BATAL ORDER SETELAH PAYMENT EXPIRED ─────────────────────────
// Kondisi: Order terbentuk, Payment di-set langsung ke EXPIRED di DB (simulasi)
// Aksi   : Batalkan order
// Harapan: Tetap bisa batalkan karena tidak ada payment PENDING/PROCESSING

async function scenarioE() {
  console.log('\n══════════════════════════════════════════════');
  console.log('SKENARIO E: Batal Order Setelah Payment Expired');
  console.log('══════════════════════════════════════════════');

  const order = await createFreshOrder();
  const payment = await createPayment(order.billing_id);

  // Simulasi payment expired langsung dari DB
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'EXPIRED', failure_reason: 'PAYMENT_TIMEOUT_SIMULATION' }
  });
  console.log(`  Payment ${payment.id} di-set EXPIRED (simulasi)`);

  // Batalkan order — harusnya lolos karena tidak ada PENDING/PROCESSING
  const cancelRes = await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id }, { headers: h() }
  );
  console.log(`  Cancel Order: ${JSON.stringify(cancelRes.data)}`);

  await new Promise(r => setTimeout(r, 500));

  const finalBilling = await getDb_billing(order.billing_id);
  const finalSub = await prisma.subscription.findUnique({ where: { id: order.subscription_id } });
  const finalPcr = await getDb_pcr(order.subscription_id);

  verdict('E: Batal Setelah Payment Expired', [
    { name: 'Subscription kembali ACTIVE', actual: finalSub?.status, expected: 'ACTIVE', pass: finalSub?.status === 'ACTIVE' },
    { name: 'Invoice → CANCELLED', actual: finalBilling?.Invoice?.status, expected: 'CANCELLED', pass: finalBilling?.Invoice?.status === 'CANCELLED' },
    { name: 'PCR → CANCELLED', actual: finalPcr?.status, expected: 'CANCELLED', pass: finalPcr?.status === 'CANCELLED' },
  ]);
}

// ─── SKENARIO F: GUARD TOLAK BATAL saat PAYMENT MASIH PENDING ────────────────
// Harapan: Permintaan cancel order ditolak (guard aktif)

async function scenarioF() {
  console.log('\n══════════════════════════════════════════════');
  console.log('SKENARIO F: Guard — Batal Order saat Payment Masih PENDING (harus ditolak)');
  console.log('══════════════════════════════════════════════');

  const order = await createFreshOrder();
  await createPayment(order.billing_id);
  console.log(`  Payment PENDING aktif untuk billing ${order.billing_id}`);

  // Langsung coba batalkan order TANPA batalkan payment dulu
  const cancelRes = await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id }, { headers: h() }
  );
  console.log(`  Cancel response: ${JSON.stringify(cancelRes.data)}`);

  const blocked = !cancelRes.data.success;
  verdict('F: Guard Tolak Batal saat Payment PENDING', [
    { name: 'Permintaan ditolak (success=false)', actual: String(cancelRes.data.success), expected: 'false', pass: blocked },
    { name: 'Pesan mengandung kata "payment"', actual: cancelRes.data.message || '', expected: 'contains "payment"', pass: (cancelRes.data.message || '').toLowerCase().includes('payment') },
  ]);

  // Cleanup
  const payments = await prisma.payment.findMany({
    where: { billing_id: order.billing_id, status: 'PENDING' }
  });
  for (const p of payments) {
    await axios.post(`${API_URL}/payments/${p.id}/cancel`, {}, { headers: h() }).catch(() => {});
  }
  await axios.post(`${API_URL}/billing/subscriptions/upgrade/cancel`,
    { subscription_id: order.subscription_id }, { headers: h() }).catch(() => {});
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Simulasi Komprehensif Ekosistem Billing/Subscription');
  console.log('=========================================================\n');

  try {
    await login();

    const run = async (label, fn) => {
      try { await fn(); }
      catch (err) {
        console.error(`\n💥 Error di ${label}:`, err.response?.data || err.message);
        results.push({ label, ok: false, checks: [{ name: 'Exception', actual: err.message, expected: 'no error', pass: false }] });
      }
    };

    await run('B', scenarioB);
    await run('C', scenarioC);
    await run('D', scenarioD);
    await run('E', scenarioE);
    await run('F', scenarioF);

    // Pastikan subscription kembali ACTIVE di akhir semua test
    await restoreSubToActive();
    console.log('\n✅ Subscription di-restore ke ACTIVE');

  } catch (err) {
    console.error('\n💥 Error fatal setup:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();

    console.log('\n\n══════════════════════════════════════════════');
    console.log('REKAP HASIL SIMULASI');
    console.log('══════════════════════════════════════════════');
    for (const r of results) {
      console.log(`${r.ok ? '✅' : '❌'} ${r.label}`);
    }
    const total = results.length;
    const passed = results.filter(r => r.ok).length;
    console.log(`\nTotal: ${passed}/${total} skenario lulus`);
    if (passed === total) {
      console.log('🏆 SEMUA SKENARIO LULUS!');
    } else {
      console.log('⚠️  Ada skenario yang perlu diperbaiki.');
    }
  }
}

main();
�─────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Simulasi Komprehensif Ekosistem Billing/Subscription');
  console.log('=========================================================\n');

  try {
    await login();

    const run = async (label, fn) => {
      try { await fn(); }
      catch (err) {
        console.error(`\n💥 Error di ${label}:`, err.response?.data || err.message);
        results.push({ label, ok: false, checks: [{ name: 'Exception', actual: err.message, expected: 'no error', pass: false }] });
      }
    };

    await run('B', scenarioB);
    await run('C', scenarioC);
    await run('D', scenarioD);
    await run('E', scenarioE);
    await run('F', scenarioF);

  } catch (err) {
    console.error('\n💥 Error fatal setup:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();

    console.log('\n\n══════════════════════════════════════════════');
    console.log('REKAP HASIL SIMULASI');
    console.log('══════════════════════════════════════════════');
    for (const r of results) {
      console.log(`${r.ok ? '✅' : '❌'} ${r.label}`);
    }
    const total = results.length;
    const passed = results.filter(r => r.ok).length;
    console.log(`\nTotal: ${passed}/${total} skenario lulus`);
    if (passed === total) {
      console.log('🏆 SEMUA SKENARIO LULUS!');
    } else {
      console.log('⚠️  Ada skenario yang perlu diperbaiki.');
    }
  }
}

main();
