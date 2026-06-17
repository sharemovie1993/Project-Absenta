
const axios = require('axios');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://10.10.10.250:3001/api';
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;

async function simulate() {
  console.log('🚀 Starting E2E Order Simulation for Inventory Sekolah...');
  
  try {
    // 1. Login
    console.log('Step 1: Logging in as 2krw@gmail.com...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: '2krw@gmail.com',
      password: 'admin1234'
    });
    const token = loginRes.data.data.token;
    const tenantId = loginRes.data.data.user.tenant_id;
    console.log(`✅ Logged in. Tenant ID: ${tenantId}`);

    // 2. Prepare Order
    // Plan ID for "Inventory Sekolah (Micro) - Bulanan"
    const planId = 'fea6026b-bb98-4782-aa70-e6764f96e3a2';
    
    console.log(`Step 2: Ordering Plan ID: ${planId}...`);
    const orderRes = await axios.post(`${API_URL}/billing/subscriptions/order`, {
      plan_id: planId,
      gateway: 'TRIPAY',
      paymentMethod: 'BCAVA'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!orderRes.data.success) {
      throw new Error(`Order failed: ${JSON.stringify(orderRes.data)}`);
    }

    // Correctly extract billing_id from nested data.checkout
    const billingId = orderRes.data.data.checkout.billing_id;
    console.log(`✅ Order Created. Billing ID: ${billingId}`);

    let paymentId;
    try {
      const paymentCreateRes = await axios.post(`${API_URL}/payments/create`, {
        billing_id: billingId,
        gateway: 'TRIPAY',
        method: 'BANK_TRANSFER',
        channel_code: 'BCAVA'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!paymentCreateRes.data.success) {
         throw new Error(`Payment creation failed: ${JSON.stringify(paymentCreateRes.data)}`);
      }
      paymentId = paymentCreateRes.data.data.id;
      console.log(`✅ Payment Intent Created. Payment ID: ${paymentId}`);
    } catch (e) {
      if (e.response?.data?.message?.includes('already a pending payment')) {
        console.log('⚠️ Pending payment already exists. Fetching it...');
        const existingPaymentsRes = await axios.get(`${API_URL}/payments/list?billing_id=${billingId}&status=PENDING`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        paymentId = existingPaymentsRes.data.data.payments[0].id;
        console.log(`✅ Existing Payment ID found: ${paymentId}`);
      } else if (e.response?.data?.message?.includes('Invoice is already paid')) {
        console.log('✅ Invoice is already PAID. Skipping payment step...');
      } else {
        throw e;
      }
    }

    // 3. Wait for Background Task
    console.log('Step 3: Waiting 3 seconds for background processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Verify Initial State in DB
    console.log('Step 4: Verifying initial records in DB...');
    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
      include: { Invoice: true }
    });

    if (!billing || !billing.Invoice) {
      throw new Error('Billing or Invoice not found in DB after creation!');
    }
    
    const invoiceNumber = billing.Invoice.invoice_number;
    console.log(`✅ Invoice found: ${invoiceNumber}. Status: ${billing.Invoice.status}`);

    // PCR is linked via billing.plan_change_request_id
    const pcrId = billing.plan_change_request_id;
    if (!pcrId) {
       console.log('⚠️ plan_change_request_id missing in Billing. Trying manual lookup...');
    }
    
    const planChange = pcrId 
      ? await prisma.planChangeRequest.findUnique({ where: { id: pcrId } })
      : await prisma.planChangeRequest.findFirst({ where: { subscription_id: billing.subscription_id, status: 'SCHEDULED' } });
    
    if (!planChange) {
      throw new Error('PlanChangeRequest not found!');
    }
    console.log(`✅ PlanChangeRequest found. Status: ${planChange.status}`);

    if (paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });
      console.log(`✅ Payment record found. Status: ${payment.status}, Gateway Ref: ${payment.gateway_transaction_id}`);
    }

    // 5. Simulate Tripay Webhook
    if (paymentId) {
      console.log('Step 5: Simulating Tripay Webhook (Payment Success)...');
      
      const reference = payment.gateway_transaction_id || payment.id;
      
      const webhookBody = {
        reference: reference,
        merchant_ref: reference,
        payment_method: 'BCAVA',
        payment_method_code: 'BCAVA',
        total_amount: billing.amount,
        status: 'PAID',
        paid_at: Math.floor(Date.now() / 1000),
        is_closed_payment: 1
      };

      const rawBody = JSON.stringify(webhookBody);
      const signature = crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY).update(rawBody).digest('hex');

      const webhookRes = await axios.post(`${API_URL}/webhooks/payment/tripay`, webhookBody, {
        headers: {
          'X-Callback-Signature': signature,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Webhook simulation response: ${JSON.stringify(webhookRes.data)}`);

      // 6. Wait for Worker to process event
      console.log('Step 6: Waiting 5 seconds for event processing (Activation)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('Step 5 & 6: Skipping webhook & wait (Already Paid)');
    }

    // 7. Verify Final State
    console.log('Step 7: Verifying Final State in DB...');
    
    const finalBilling = await prisma.billing.findUnique({
      where: { id: billingId },
      include: { Invoice: true }
    });
    
    const finalSub = await prisma.subscription.findFirst({
      where: { tenant_id: tenantId, service_code: 'SARPRAS' },
      include: { Plan: true }
    });

    const finalPlanChange = await prisma.planChangeRequest.findUnique({
      where: { id: planChange.id }
    });

    console.log('--- FINAL AUDIT RESULTS ---');
    console.log(`Billing Status: ${finalBilling.status} (Expected: PAID)`);
    console.log(`Invoice Status: ${finalBilling.Invoice.status} (Expected: PAID)`);
    console.log(`Subscription Status: ${finalSub?.status} (Expected: ACTIVE)`);
    console.log(`Subscription Plan: ${finalSub?.Plan?.name}`);
    console.log(`PlanChangeRequest Status: ${finalPlanChange?.status} (Expected: APPLIED)`);
    
    if (finalBilling.status === 'PAID' && finalSub?.status === 'ACTIVE' && finalPlanChange?.status === 'APPLIED') {
      console.log('🏆 SUCCESS: E2E Order Flow is consistent and atomic!');
    } else {
      console.log('❌ FAILURE: Inconsistency detected in the flow.');
      if (finalSub?.status !== 'ACTIVE') console.log(`DEBUG: Subscription status is ${finalSub?.status}`);
      if (finalBilling.status !== 'PAID') console.log(`DEBUG: Billing status is ${finalBilling.status}`);
    }

  } catch (error) {
    console.error('❌ Simulation Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulate();
