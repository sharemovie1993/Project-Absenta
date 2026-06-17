
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Creating Manual Payment for Tripay Dashboard Testing...');

  const timestamp = Date.now();
  const refId = `MANUAL-${timestamp}`;
  const amount = 50000; // 50.000

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: `ManualTester-${timestamp}`,
      status: 'ACTIVE',
    },
  });

  // 2. Create Plan
  let plan = await prisma.plan.findFirst();
  if (!plan) {
    plan = await prisma.plan.create({
      data: { name: 'Basic Plan', price_monthly: 50000 }
    });
  }

  // 3. Create Subscription
  const subscription = await prisma.subscription.create({
    data: {
      tenant_id: tenant.id,
      plan_id: plan.id,
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'PENDING_PAYMENT'
    }
  });

  // 4. Create Billing
  const billing = await prisma.billing.create({
    data: {
      tenant_id: tenant.id,
      subscription_id: subscription.id,
      amount: amount,
      status: 'UNPAID',
      billing_date: new Date(),
      charge_type: 'RECURRING',
    },
  });

  // 5. Create Invoice (Optional but good for completeness)
  await prisma.invoice.create({
    data: {
      tenant_id: tenant.id,
      subscription_id: subscription.id,
      billing_id: billing.id,
      invoice_number: `INV-${timestamp}`,
      amount: amount,
      total_amount: amount,
      status: 'SENT',
      due_date: new Date(Date.now() + 86400000)
    }
  });

  // 6. Create Payment
  const payment = await prisma.payment.create({
    data: {
      tenant_id: tenant.id,
      billing_id: billing.id,
      amount: amount,
      currency: 'IDR',
      status: 'PENDING',
      payment_method: 'BANK_TRANSFER', // Enum value
      gateway: 'TRIPAY',
      gateway_transaction_id: refId, // This is the Reference we need in Tripay
      gateway_payment_url: 'https://tripay.co.id/checkout/manual-test',
      expired_at: new Date(Date.now() + 3600000),
    },
  });

  console.log('\n✅ DATA BERHASIL DIBUAT!');
  console.log('==================================================');
  console.log('Silakan gunakan data berikut di Tripay Simulator:');
  console.log('--------------------------------------------------');
  console.log(`Reference (Nomor Referensi) : ${refId}`);
  console.log(`Payment ID (Internal)       : ${payment.id}`);
  console.log(`Amount (Total Nominal)      : ${amount}`);
  console.log(`Merchant Ref                : ${billing.id}`);
  console.log('==================================================');
  console.log('CARA TEST:');
  console.log('1. Buka Dashboard Tripay -> Transaksi.');
  console.log('2. Jika tidak ada transaksi ini, gunakan "Callback Tester".');
  console.log('3. Isi "Reference" dengan: ' + refId);
  console.log('4. Isi "Merchant Ref" dengan: ' + billing.id);
  console.log('5. Isi "Payment Method" dengan: BNI Virtual Account (atau lainnya)');
  console.log('6. Klik "Ubah Status" -> "DIBAYAR" -> "Kirim Callback".');
  console.log('7. Cek "Status IPN" -> Harusnya BERHASIL.');
  console.log('==================================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
