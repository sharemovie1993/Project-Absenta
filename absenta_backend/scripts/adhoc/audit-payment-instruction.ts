
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- START AUDIT PAYMENT INSTRUCTION ---');

    // 1. Find the most recent Tripay payment
    const payment = await prisma.payment.findFirst({
      where: {
        gateway: 'TRIPAY',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!payment) {
      console.log('❌ No Tripay payment found in database.');
      return;
    }

    console.log(`✅ Found latest Tripay Payment ID: ${payment.id}`);
    console.log(`   Gateway Transaction ID: ${payment.gateway_transaction_id}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Created At: ${payment.created_at}`);

    // 2. Audit Persistence (gateway_response)
    console.log('\n--- AUDIT PERSISTENCE (DB) ---');
    if (payment.gateway_response) {
      console.log('✅ gateway_response is present.');
      const response = payment.gateway_response as any;
      
      // Check for key fields expected from Tripay
      const data = response.data || response; // Handle if wrapped in { data: ... } or direct
      
      console.log('   [Raw Structure Check]:');
      console.log(`   - pay_code: ${data.pay_code || data.payment_code || 'MISSING'}`);
      console.log(`   - qr_url: ${data.qr_url || 'MISSING'}`);
      console.log(`   - instructions: ${data.instructions ? `Present (${data.instructions.length} steps)` : 'MISSING'}`);
      console.log(`   - expired_time: ${data.expired_time || 'MISSING'}`);
      
      console.log('\n   [Full Gateway Response Dump]:');
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('❌ gateway_response is NULL or EMPTY.');
    }

    // 3. Audit Status Endpoint Simulation
    console.log('\n--- AUDIT STATUS ENDPOINT (SIMULATION) ---');
    // Simulating what getPaymentStatus returns
    const simulatedResponse = {
      id: payment.id,
      status: payment.status,
      gatewayTransactionId: payment.gateway_transaction_id || undefined,
      paymentUrl: payment.gateway_payment_url || undefined,
      qrString: payment.gateway_qr_string || undefined,
      expiresAt: payment.expired_at || undefined,
      message: `Payment status: ${payment.status}`,
    };

    console.log('   [Simulated API Response]:');
    console.log(JSON.stringify(simulatedResponse, null, 2));

    // Check if instructions are missing in response
    const instructionsInResponse = (simulatedResponse as any).instructions || (simulatedResponse as any).pay_code;
    if (!instructionsInResponse) {
      console.log('\n❌ CRITICAL: API Response does NOT contain payment instructions (pay_code/instructions).');
    } else {
      console.log('\n✅ API Response contains payment instructions.');
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
