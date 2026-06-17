import { PrismaClient, PaymentGateway, PaymentMethod, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function createSamplePayments() {
  try {
    console.log('🔄 Creating sample payment data...');

    // Get existing billing records
    const billings = await prisma.billing.findMany({
      take: 3,
      select: {
        id: true,
        tenant_id: true,
        amount: true,
      }
    });

    if (billings.length === 0) {
      console.log('❌ No billing records found. Please create billing data first.');
      return;
    }

    console.log(`📋 Found ${billings.length} billing records`);

    // Create sample payments
    const payments = [
      {
        id: 'payment-001',
        tenant_id: billings[0].tenant_id,
        billing_id: billings[0].id,
        gateway: PaymentGateway.MANUAL,
        payment_method: PaymentMethod.BANK_TRANSFER,
        amount: billings[0].amount,
        currency: 'IDR',
        status: PaymentStatus.SUCCESS,
        paid_at: new Date(),
        gateway_transaction_id: 'manual-001',
      },
      {
        id: 'payment-002',
        tenant_id: billings[1]?.tenant_id || billings[0].tenant_id,
        billing_id: billings[1]?.id || billings[0].id,
        gateway: PaymentGateway.MIDTRANS,
        payment_method: PaymentMethod.QRIS,
        amount: billings[1]?.amount || billings[0].amount,
        currency: 'IDR',
        status: PaymentStatus.SUCCESS,
        paid_at: new Date(),
        gateway_transaction_id: 'midtrans-001',
      },
      {
        id: 'payment-003',
        tenant_id: billings[2]?.tenant_id || billings[0].tenant_id,
        billing_id: billings[2]?.id || billings[0].id,
        gateway: PaymentGateway.XENDIT,
        payment_method: PaymentMethod.E_WALLET,
        amount: billings[2]?.amount || billings[0].amount,
        currency: 'IDR',
        status: PaymentStatus.PENDING,
        gateway_transaction_id: 'xendit-001',
      }
    ];

    for (const payment of payments) {
      try {
        await prisma.payment.create({
          data: payment
        });
        console.log(`✅ Created payment: ${payment.id} (${payment.gateway})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Payment ${payment.id} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating payment ${payment.id}:`, error.message);
        }
      }
    }

    // Verify created payments
    const paymentCount = await prisma.payment.count();
    console.log(`\n📊 Total payments in database: ${paymentCount}`);

    // Show sample payments
    const samplePayments = await prisma.payment.findMany({
      take: 5,
      include: {
        Billing: {
          include: {
            Tenant: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log('\n💳 Sample payments:');
    samplePayments.forEach(payment => {
      console.log(`- ${payment.id}: ${payment.gateway} ${payment.payment_method} - ${payment.status} (${payment.Billing?.Tenant?.name})`);
    });

    console.log('\n✅ Sample payment data created successfully!');

  } catch (error) {
    console.error('❌ Error creating sample payments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamplePayments();
