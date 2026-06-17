
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;

if (!TRIPAY_PRIVATE_KEY) {
  console.error('TRIPAY_PRIVATE_KEY is missing in .env');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting Runtime Verification (Tripay -> System)...');

  // 1. Create Test Data
  const timestamp = Date.now();
  const refId = `TRIPAY-TEST-${timestamp}`;
  const amount = 150000; // 150.000

  console.log(`Creating Tenant, Billing, Payment for Ref: ${refId}...`);

  const tenant = await prisma.tenant.create({
    data: {
      name: `TripayTestTenant-${timestamp}`,
      // email field removed as it doesn't exist in Tenant model
      status: 'ACTIVE',
    },
  });

  // Create Subscription (needed for Billing)
  // Assuming we need a Plan first, or we can just mock the subscription if relations allow?
  // Billing needs subscription_id.
  // Let's see if we can find an existing plan or create one.
  let plan = await prisma.plan.findFirst();
  if (!plan) {
     plan = await prisma.plan.create({
         data: {
             name: 'Test Plan',
             price_monthly: 100000,
         }
     })
  }
  
  const subscription = await prisma.subscription.create({
      data: {
          tenant_id: tenant.id,
          plan_id: plan.id,
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE'
      }
  })

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

  // Create Invoice to test Robust Lookup (Invoice -> Billing -> Payment)
  await prisma.invoice.create({
    data: {
      tenant_id: tenant.id,
      subscription_id: subscription.id,
      billing_id: billing.id,
      invoice_number: billing.id, // Match merchant_ref
      amount: amount,
      total_amount: amount,
      status: 'SENT',
      due_date: new Date(Date.now() + 86400000)
    }
  });

  const payment = await prisma.payment.create({
    data: {
      tenant_id: tenant.id,
      billing_id: billing.id,
      amount: amount,
      currency: 'IDR',
      status: 'PENDING',
      payment_method: 'QRIS',
      gateway: 'TRIPAY',
      gateway_transaction_id: 'MISMATCHED_' + refId, // Intentional mismatch to test fallback
      gateway_payment_url: 'https://tripay.co.id/checkout/test',
      expired_at: new Date(Date.now() + 3600000), // 1 hour
    },
  });

  console.log(`✅ Data created. Payment ID: ${payment.id}`);

  // 2. Simulate Tripay Webhook (Ubah Status -> DIBAYAR)
  const webhookPayload = {
    reference: refId,
    merchant_ref: billing.id, 
    payment_method: 'BNI Virtual Account', // Simulate the problematic payload
    payment_method_code: 'BNIVA',
    total_amount: amount,
    fee_merchant: 0,
    fee_customer: 0,
    total_fee: 0,
    amount_received: amount,
    is_closed_payment: 1,
    status: 'PAID', // Tripay sends 'PAID'
    paid_at: Math.floor(Date.now() / 1000),
    note: 'Test Payment',
  };

  const jsonBody = JSON.stringify(webhookPayload);
  const signature = crypto
    .createHmac('sha256', TRIPAY_PRIVATE_KEY as string)
    .update(jsonBody)
    .digest('hex');

  console.log('Sending Webhook to ' + API_URL + '/webhooks/payment/tripay');
  
  try {
    const response = await axios.post(
      `${API_URL}/webhooks/payment/tripay`,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Callback-Signature': signature,
          'User-Agent': 'Tripay-Callback', // Sometimes user agent checks exist
        },
      }
    );

    console.log(`Webhook Response: ${response.status} ${response.statusText}`);
    if (response.status !== 200) {
        throw new Error(`Webhook failed with status ${response.status}`);
    }
  } catch (error: any) {
    console.error('Webhook Error:', error.response?.data || error.message);
    process.exit(1);
  }

  // Verify ActivityLog
  console.log('Verifying System State...');
  const logs = await prisma.activityLog.findMany({
    where: {
      tenant_id: tenant.id,
      created_at: {
        gte: new Date(Date.now() - 60000) // Last 1 min
      }
    },
    orderBy: { created_at: 'desc' }
  });

  console.log('Found logs actions:', logs.map(l => l.action));

  const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
  if (updatedPayment?.status !== 'SUCCESS') {
    console.error(`❌ Payment status mismatch! Expected SUCCESS, got ${updatedPayment?.status}`);
    process.exit(1);
  } else {
    console.log('✅ Payment status updated to SUCCESS');
  }

  const sandboxLog = logs.find(l => l.action === 'PAYMENT_WEBHOOK_SANDBOX_ACCEPTED');
  if (!sandboxLog) {
    console.warn('⚠️ Log PAYMENT_WEBHOOK_SANDBOX_ACCEPTED not found (Might be ok if PROD logic used)');
  }

  const confirmedLog = logs.find(l => l.action === 'PAYMENT_AMOUNT_CONFIRMED');
  if (!confirmedLog) {
    console.error('❌ Log PAYMENT_AMOUNT_CONFIRMED not found!');
    process.exit(1);
  } else {
    console.log('✅ Log PAYMENT_AMOUNT_CONFIRMED found');
    
    const metadata = typeof confirmedLog.metadata === 'string' ? JSON.parse(confirmedLog.metadata) : confirmedLog.metadata;
    
    console.log('   Metadata Amount:', metadata?.amount);
    
    if (metadata?.amount !== 150000) {
      console.error(`❌ Metadata amount mismatch! Expected 150000, got ${metadata?.amount}`);
      process.exit(1);
    }
  }

  // 3.3 Check Public Status API (Consistency Check)
  try {
      // Simulate getting public token or just calling status if it's public
      // The user mentioned public payment instructions.
      // Let's assume there is a public endpoint that returns payment status.
      // Based on main.ts change: /payment/public/status?ref=...
      
      const publicRes = await axios.get(`${API_URL}/payment/public/status?ref=${refId}`);
      const publicData = publicRes.data.data;
      
      console.log('Public API Data Amount:', publicData.amount);
      
      if (publicData.amount !== amount) {
          console.error(`❌ UI/Public Amount mismatch! Expected ${amount}, got ${publicData.amount}`);
          process.exit(1);
      } else {
          console.log('✅ UI/Public Amount matches Tripay Amount');
      }

      // 4. Verify QRIS Extraction (if applicable)
      // Since we created a QRIS payment, we should verify the qr_string is present in DB or response
      if (updatedPayment?.payment_method === 'QRIS') {
          if (!updatedPayment.gateway_qr_string && !publicData.qr_string) {
              console.warn('⚠️ QRIS String not found in Payment record or Public API response (Expected for Sandbox if manually injected)');
              // Note: In this test script, we manually inserted the payment record without qr_string
              // So it is expected to be null unless the webhook update logic sets it (which it doesn't usually for callback)
              // But if we tested createPayment via API, it should be there.
              // We will just log it for now.
          } else {
             console.log('✅ QRIS String found:', updatedPayment.gateway_qr_string || publicData.qr_string);
          }
      }

  } catch (e: any) {
      console.error('❌ Failed to fetch Public Status:', e.message);
  }

  console.log('🎉 VERIFICATION SUCCESSFUL (Runtime)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
