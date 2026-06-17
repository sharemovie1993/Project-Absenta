/**
 * SIMULASI E2E BILLING — SEMUA SKENARIO (v4 — Menggunakan Tripay Simulator)
 * ==========================================================================
 * Strategi baru: gunakan endpoint internal simulator
 *   POST /api/payments/test/simulate/tripay
 * sebagai pengganti mengirim webhook manual berisi signature Tripay.
 *
 * Skenario yang diuji:
 *  A — Happy Path    : Order → Buat Payment → Simulate PAID  → Subscription AKTIF
 *  B — Cancel Order  : Order → Batalkan sebelum bayar         → Subscription Normal
 *  C — Failed Payment: Order → Buat Payment → Simulate FAILED → Subscription tetap PENDING
 *
 * Prasyarat: Jalankan cleanup_sarpras.js terlebih dahulu!
 */

const axios  = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma   = new PrismaClient();
const API_URL  = process.env.API_URL || 'http://10.10.10.250:3001/api';

const EMAIL    = '2krw@gmail.com';
const PASSWORD = 'admin1234';
const PLAN_ID  = 'fea6026b-bb98-4782-aa70-e6764f96e3a2'; // Inventory Sekolah (Micro) – Bulanan

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function login() {
  const res = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
  if (!res.data.success) throw new Error('Login gagal: ' + JSON.stringify(res.data));
  return { token: res.data.data.token, tenantId: res.data.data.user.tenant_id };
}

async function createOrder(token) {
  const res = await axios.post(`${API_URL}/billing/subscriptions/order`, {
    plan_id: PLAN_ID, gateway: 'TRIPAY', paymentMethod: 'BCAVA'
  }, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.data.success) throw new Error('Order gagal: ' + JSON.stringify(res.data));
  const checkout = res.data.data.checkout;
  return { billingId: checkout.billing_id, subscriptionId: checkout.subscription_id };
}

async function createPayment(token, billingId) {
  const res = await axios.post(`${API_URL}/payments/create`, {
    billing_id: billingId, gateway: 'TRIPAY', method: 'BANK_TRANSFER', channel_code: 'BCAVA'
  }, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.data.success) throw new Error('Buat payment gagal: ' + JSON.stringify(res.data));
  
  // Jika data response kosong, ambil langsung dari DB
  const dataFromApi = res.data.data;
  const paymentIdFromApi = dataFromApi?.id || dataFromApi?.payment_id || null;
  return paymentIdFromApi;
}

// Gunakan endpoint simulator internal (tidak perlu signature Tripay)
async function simulatePayment(token, paymentId, scenario = 'success') {
  const res = await axios.post(
    `${API_URL}/platform/payments/test/simulate/tripay`,
    {
      scenario,
      customData: { reference: paymentId }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

async function getPublicToken(invoiceId) {
  const rec = await prisma.invoicePublicToken.findFirst({ where: { invoice_id: invoiceId } });
  return rec?.token_hash ?? null;
}

async function cancelOrderPublic(publicToken) {
  const res = await axios.post(`${API_URL}/invoice/public/${publicToken}/upgrade/cancel`);
  return res.data;
}

// Hapus cascade billing tertentu
async function cleanupBilling(billingId, subscriptionId) {
  if (!billingId) return;
  try {
    await prisma.payment.deleteMany({ where: { billing_id: billingId } });
    const billing = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
    if (billing?.Invoice) {
      await prisma.invoicePublicToken.deleteMany({ where: { invoice_id: billing.Invoice.id } });
      await prisma.invoice.delete({ where: { id: billing.Invoice.id } });
    }
    if (billing?.plan_change_request_id) {
      await prisma.planChangeRequest.delete({ where: { id: billing.plan_change_request_id } }).catch(() => {});
    }
    await prisma.billing.delete({ where: { id: billingId } }).catch(() => {});
    if (subscriptionId) {
      await prisma.subscription.delete({ where: { id: subscriptionId } }).catch(() => {});
    }
    console.log('  ✅ Cleanup billing selesai.\n');
  } catch (err) {
    console.log('  ⚠️ Cleanup parsial:', err.message, '\n');
  }
}

function auditRow(label, actual, expected) {
  const pass = String(actual ?? '').toUpperCase() === String(expected ?? '').toUpperCase();
  console.log(`  ${pass ? '✅' : '❌'} ${label.padEnd(32)} | Aktual: ${String(actual ?? '-').padEnd(16)} | Diharap: ${expected}`);
  return pass;
}

function delay(ms, label) {
  if (label) process.stdout.write(`  ⏳ ${label}... `);
  return new Promise(r => setTimeout(() => { if (label) console.log('done'); r(); }, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// SKENARIO A — Happy Path (bayar sukses → Subscription AKTIF)
// ─────────────────────────────────────────────────────────────────────────────
async function scenarioA() {
  console.log('\n' + '═'.repeat(64));
  console.log('  SKENARIO A: Order → Bayar Sukses → Subscription AKTIF');
  console.log('═'.repeat(64));

  const { token, tenantId } = await login();
  console.log(`\n  [A-1] Login OK. Tenant: ${tenantId}`);

  const { billingId, subscriptionId } = await createOrder(token);
  console.log(`  [A-2] Order dibuat. Billing ID: ${billingId}`);

  await delay(3000, 'Menunggu background job buat Invoice');

  const billing = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  if (!billing?.Invoice) throw new Error('[A] Invoice tidak terbuat dalam 3 detik!');
  console.log(`  [A-3] Invoice: ${billing.Invoice.invoice_number} | Status: ${billing.Invoice.status}`);

  const pcrId = billing.plan_change_request_id;
  const pcr   = pcrId ? await prisma.planChangeRequest.findUnique({ where: { id: pcrId } }) : null;
  console.log(`  [A-4] PlanChangeRequest: ${pcr?.status ?? 'N/A'}`);

  // Buat payment intent
  let paymentId = await createPayment(token, billingId);

  // Jika dari API kosong, ambil dari DB (fallback)
  if (!paymentId) {
    console.log('  [A-5] ⚠️  API response kosong, ambil payment dari DB...');
    const dbPayment = await prisma.payment.findFirst({
      where: { billing_id: billingId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });
    paymentId = dbPayment?.id ?? null;
  }
  if (!paymentId) throw new Error('[A] Payment ID tidak bisa didapat!');
  console.log(`  [A-5] Payment ID: ${paymentId}`);

  // Simulasi bayar sukses via endpoint simulator
  console.log('  [A-6] Simulasi webhook PAID via endpoint /payments/test/simulate/tripay...');
  const simRes = await simulatePayment(token, paymentId, 'success');
  console.log(`  [A-6] Hasil simulasi: ${JSON.stringify(simRes)}`);

  await delay(6000, 'Menunggu event aktivasi subscription');

  // Verifikasi final
  const fBilling = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  const fSub     = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' }, include: { Plan: true } });
  const fPcr     = pcr ? await prisma.planChangeRequest.findUnique({ where: { id: pcr.id } }) : null;
  const fPayment = await prisma.payment.findUnique({ where: { id: paymentId } });

  console.log('\n  ── HASIL AUDIT SKENARIO A ──────────────────────────────────');
  const r1 = auditRow('Billing.status',          fBilling?.status,          'PAID');
  const r2 = auditRow('Invoice.status',           fBilling?.Invoice?.status, 'PAID');
  const r3 = auditRow('Payment.status',           fPayment?.status,          'SUCCESS');
  const r4 = auditRow('Subscription.status',      fSub?.status,              'ACTIVE');
  const r5 = auditRow('PlanChangeRequest.status', fPcr?.status ?? 'N/A',     fPcr ? 'APPLIED' : 'N/A');
  console.log(`  ℹ️  Subscription Plan: ${fSub?.Plan?.name ?? '-'}`);

  const pass = r1 && r2 && r3 && r4;
  console.log(pass
    ? '\n  🏆 SKENARIO A LULUS — Happy Path ATOMIK & KONSISTEN!'
    : '\n  ❌ SKENARIO A GAGAL — Ada inkonsistensi!'
  );
  return { pass, billingId, subscriptionId, tenantId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SKENARIO B — Cancel sebelum bayar
// ─────────────────────────────────────────────────────────────────────────────
async function scenarioB() {
  console.log('\n' + '═'.repeat(64));
  console.log('  SKENARIO B: Order → Batalkan Sebelum Bayar → Subscription Normal');
  console.log('═'.repeat(64));

  const { token, tenantId } = await login();
  console.log(`\n  [B-1] Login OK. Tenant: ${tenantId}`);

  const prevSub    = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' } });
  const prevStatus = prevSub?.status ?? 'TIDAK ADA';
  console.log(`  [B-2] Status subscription SARPRAS sebelum order: ${prevStatus}`);

  const { billingId, subscriptionId } = await createOrder(token);
  console.log(`  [B-3] Order dibuat. Billing ID: ${billingId}`);

  await delay(3000, 'Menunggu background job buat Invoice');

  const billing = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  if (!billing?.Invoice) throw new Error('[B] Invoice tidak terbuat!');
  console.log(`  [B-4] Invoice: ${billing.Invoice.invoice_number} | Status: ${billing.Invoice.status}`);

  const currSub = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' } });
  console.log(`  [B-5] Status subscription setelah order: ${currSub?.status ?? 'TIDAK ADA'}`);

  // Batalkan tanpa buat payment (pastikan tidak ada payment PENDING dulu)
  const existingPayments = await prisma.payment.findMany({
    where: { billing_id: billingId, status: { in: ['PENDING', 'PROCESSING'] } }
  });
  if (existingPayments.length > 0) {
    console.log(`  [B-6] ⚠️ Ada ${existingPayments.length} payment pending, batalkan dulu via DB...`);
    await prisma.payment.updateMany({
      where: { billing_id: billingId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'CANCELLED' }
    });
  }

  // Ambil public token
  await delay(2000);
  let publicToken = await getPublicToken(billing.Invoice.id);
  if (!publicToken) {
    await delay(5000, 'Menunggu token publik di-generate');
    publicToken = await getPublicToken(billing.Invoice.id);
  }
  if (!publicToken) throw new Error('[B] Public token tidak bisa didapat!');
  console.log(`  [B-7] Public token: ${publicToken.substring(0, 20)}...`);

  // Batalkan order
  console.log('  [B-8] Membatalkan order via endpoint publik...');
  try {
    const cancelRes = await cancelOrderPublic(publicToken);
    console.log(`  [B-8] Respons: ${JSON.stringify(cancelRes)}`);
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    if (msg.includes('already') || msg.includes('sudah')) {
      console.log(`  [B-8] Sudah dibatalkan: ${msg}`);
    } else throw e;
  }

  await delay(4000, 'Menunggu event cleanup pembatalan');

  // Verifikasi final
  const fBilling = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  const fSub     = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' } });
  const pcrId    = billing.plan_change_request_id;
  const fPcr     = pcrId ? await prisma.planChangeRequest.findUnique({ where: { id: pcrId } }) : null;

  const expectedSubStatus = prevStatus === 'TIDAK ADA' ? 'TIDAK ADA' : 'ACTIVE';

  console.log('\n  ── HASIL AUDIT SKENARIO B ──────────────────────────────────');
  const r1 = auditRow('Invoice.status',           fBilling?.Invoice?.status,   'CANCELLED');
  const r2 = auditRow('Subscription.status',      fSub?.status ?? 'TIDAK ADA', expectedSubStatus);
  const r3 = auditRow('PlanChangeRequest.status', fPcr?.status ?? 'N/A',       fPcr ? 'CANCELLED' : 'N/A');

  const pass = r1 && r2;
  console.log(pass
    ? '\n  🏆 SKENARIO B LULUS — Pembatalan ATOMIK & KONSISTEN!'
    : '\n  ❌ SKENARIO B GAGAL — Ada inkonsistensi!'
  );
  return { pass, billingId, subscriptionId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SKENARIO C — Payment gagal, lalu retry sukses
// ─────────────────────────────────────────────────────────────────────────────
async function scenarioC() {
  console.log('\n' + '═'.repeat(64));
  console.log('  SKENARIO C: Order → Payment FAILED → Retry PAID → Subscription AKTIF');
  console.log('═'.repeat(64));

  const { token, tenantId } = await login();
  console.log(`\n  [C-1] Login OK. Tenant: ${tenantId}`);

  const { billingId, subscriptionId } = await createOrder(token);
  console.log(`  [C-2] Order dibuat. Billing ID: ${billingId}`);

  await delay(3000, 'Menunggu background job buat Invoice');

  const billing = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  if (!billing?.Invoice) throw new Error('[C] Invoice tidak terbuat!');
  console.log(`  [C-3] Invoice: ${billing.Invoice.invoice_number} | Status: ${billing.Invoice.status}`);

  const pcrId = billing.plan_change_request_id;
  const pcr   = pcrId ? await prisma.planChangeRequest.findUnique({ where: { id: pcrId } }) : null;

  // Buat payment
  let paymentId = await createPayment(token, billingId);
  if (!paymentId) {
    const dbPayment = await prisma.payment.findFirst({
      where: { billing_id: billingId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });
    paymentId = dbPayment?.id ?? null;
  }
  if (!paymentId) throw new Error('[C] Payment ID tidak bisa didapat!');
  console.log(`  [C-4] Payment ID: ${paymentId}`);

  // Simulate GAGAL
  console.log('  [C-5] Simulasi webhook FAILED...');
  const failRes = await simulatePayment(token, paymentId, 'failed');
  console.log(`  [C-5] Hasil: ${JSON.stringify(failRes)}`);

  await delay(3000, 'Menunggu event FAILED diproses');

  // Verifikasi status setelah FAILED
  const midPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
  const midSub     = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' } });
  console.log(`  [C-5b] Payment setelah FAILED: ${midPayment?.status}`);
  console.log(`  [C-5b] Subscription setelah FAILED: ${midSub?.status}`);

  // Buat payment BARU untuk retry
  console.log('  [C-6] Membuat payment baru untuk retry...');
  let retryPaymentId = await createPayment(token, billingId);
  if (!retryPaymentId) {
    const dbPayment2 = await prisma.payment.findFirst({
      where: { billing_id: billingId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });
    retryPaymentId = dbPayment2?.id ?? null;
  }
  if (!retryPaymentId) throw new Error('[C] Retry Payment ID tidak bisa didapat!');
  console.log(`  [C-6] Retry Payment ID: ${retryPaymentId}`);

  // Simulate SUKSES pada payment baru
  console.log('  [C-7] Simulasi webhook PAID untuk retry...');
  const successRes = await simulatePayment(token, retryPaymentId, 'success');
  console.log(`  [C-7] Hasil: ${JSON.stringify(successRes)}`);

  await delay(6000, 'Menunggu event aktivasi subscription');

  // Verifikasi final
  const fBilling     = await prisma.billing.findUnique({ where: { id: billingId }, include: { Invoice: true } });
  const fSub         = await prisma.subscription.findFirst({ where: { tenant_id: tenantId, service_code: 'SARPRAS' }, include: { Plan: true } });
  const fPcr         = pcr ? await prisma.planChangeRequest.findUnique({ where: { id: pcr.id } }) : null;
  const fRetryPayment = await prisma.payment.findUnique({ where: { id: retryPaymentId } });

  console.log('\n  ── HASIL AUDIT SKENARIO C ──────────────────────────────────');
  const r1 = auditRow('Billing.status',           fBilling?.status,          'PAID');
  const r2 = auditRow('Invoice.status',            fBilling?.Invoice?.status, 'PAID');
  const r3 = auditRow('Retry Payment.status',      fRetryPayment?.status,     'SUCCESS');
  const r4 = auditRow('Subscription.status',       fSub?.status,              'ACTIVE');
  const r5 = auditRow('PlanChangeRequest.status',  fPcr?.status ?? 'N/A',     fPcr ? 'APPLIED' : 'N/A');
  console.log(`  ℹ️  Subscription Plan: ${fSub?.Plan?.name ?? '-'}`);

  const pass = r1 && r2 && r3 && r4;
  console.log(pass
    ? '\n  🏆 SKENARIO C LULUS — Failed + Retry ATOMIK & KONSISTEN!'
    : '\n  ❌ SKENARIO C GAGAL — Ada inkonsistensi!'
  );
  return { pass, billingId, subscriptionId };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n🚀 SIMULASI FULL E2E BILLING — ' + new Date().toLocaleString('id-ID'));
  console.log('   Tenant   : ' + EMAIL);
  console.log('   API URL  : ' + API_URL);
  console.log('   Simulator: POST /api/platform/payments/test/simulate/tripay');

  let resultA = { pass: false, billingId: null, subscriptionId: null };
  let resultB = { pass: false, billingId: null, subscriptionId: null };
  let resultC = { pass: false, billingId: null, subscriptionId: null };

  // ── SKENARIO A ────────────────────────────────────────────────────────────
  try {
    resultA = await scenarioA();
  } catch (err) {
    console.error('\n  ❌ SKENARIO A ERROR:', err.response?.data || err.message);
  }

  console.log('\n⏳ Membersihkan data Skenario A sebelum B...');
  await cleanupBilling(resultA.billingId, resultA.subscriptionId);

  // ── SKENARIO B ────────────────────────────────────────────────────────────
  try {
    resultB = await scenarioB();
  } catch (err) {
    console.error('\n  ❌ SKENARIO B ERROR:', err.response?.data || err.message);
  }

  console.log('\n⏳ Membersihkan data Skenario B sebelum C...');
  await cleanupBilling(resultB.billingId, resultB.subscriptionId);

  // ── SKENARIO C ────────────────────────────────────────────────────────────
  try {
    resultC = await scenarioC();
  } catch (err) {
    console.error('\n  ❌ SKENARIO C ERROR:', err.response?.data || err.message);
  }

  // ── Ringkasan ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(64));
  console.log('  RINGKASAN AKHIR SIMULASI BILLING E2E');
  console.log('═'.repeat(64));
  console.log(`  Skenario A (Happy Path — Bayar Sukses)         : ${resultA.pass ? '🏆 LULUS' : '❌ GAGAL'}`);
  console.log(`  Skenario B (Cancel — Batalkan Sebelum Bayar)   : ${resultB.pass ? '🏆 LULUS' : '❌ GAGAL'}`);
  console.log(`  Skenario C (Failed → Retry → Sukses)           : ${resultC.pass ? '🏆 LULUS' : '❌ GAGAL'}`);
  const allPass = resultA.pass && resultB.pass && resultC.pass;
  console.log('\n  ' + (allPass
    ? '✅ SEMUA SKENARIO LULUS — Ekosistem Billing STABIL!'
    : '❌ ADA SKENARIO YANG GAGAL — Perlu investigasi!'
  ));
  console.log('═'.repeat(64) + '\n');

  await prisma.$disconnect();
}

runAll();
