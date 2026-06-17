import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBillingSampleData() {
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';
  
  try {
    console.log('🚀 Memulai pembuatan data sample billing...');
    
    // 1. Cek apakah tenant ada
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      console.error('❌ Tenant dengan ID tersebut tidak ditemukan!');
      return;
    }
    
    console.log(`✅ Tenant ditemukan: ${tenant.name}`);
    
    // 2. Buat atau ambil plan yang sudah ada
    let plan = await prisma.plan.findFirst({
      where: { name: 'Basic Plan' }
    });
    
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'Basic Plan',
          price_monthly: 150000, // 150k per bulan
          max_user: 100,
          features: 'Absensi dasar, Laporan bulanan, Support email',
          currency: 'IDR',
          is_active: true
        }
      });
      console.log('✅ Plan Basic berhasil dibuat');
    } else {
      console.log('✅ Plan Basic sudah ada');
    }
    
    // 3. Buat subscription untuk tenant
    let subscription = await prisma.subscription.findFirst({
      where: { 
        tenant_id: tenantId,
        status: 'ACTIVE'
      }
    });
    
    if (!subscription) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12); // 1 tahun
      
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // bulan depan
      
      subscription = await prisma.subscription.create({
        data: {
          tenant_id: tenantId,
          plan_id: plan.id,
          start_date: startDate,
          end_date: endDate,
          status: 'ACTIVE',
          auto_renew: true,
          next_billing_date: nextBillingDate
        }
      });
      console.log('✅ Subscription berhasil dibuat');
    } else {
      console.log('✅ Subscription sudah ada');
    }
    
    // 4. Buat billing records dengan berbagai status
    const billingData = [
      {
        amount: 150000,
        billing_date: new Date('2024-01-01'),
        payment: { method: 'BANK_TRANSFER', paid_at: new Date('2024-01-10'), reference: 'TRF-001-2024' }
      },
      {
        amount: 150000,
        billing_date: new Date('2024-02-01'),
        payment: { method: 'QRIS', paid_at: new Date('2024-02-12'), reference: 'QRIS-002-2024' }
      },
      {
        amount: 150000,
        billing_date: new Date('2024-03-01'),
        payment: { method: 'BANK_TRANSFER', paid_at: new Date('2024-03-08'), reference: 'TRF-003-2024' }
      },
      {
        amount: 150000,
        billing_date: new Date('2024-04-01')
      },
      {
        amount: 150000,
        billing_date: new Date('2024-05-01')
      },
      {
        amount: 150000,
        billing_date: new Date('2024-06-01')
      }
    ];
    
    console.log('📝 Membuat billing records...');
    
    for (const billing of billingData) {
      // Cek apakah billing untuk tanggal yang sama sudah ada (hindari duplikasi sederhana)
      const existingBilling = await prisma.billing.findFirst({
        where: {
          tenant_id: tenantId,
          billing_date: billing.billing_date
        }
      });

      if (!existingBilling) {
        const created = await prisma.billing.create({
          data: {
            tenant_id: tenantId,
            subscription_id: subscription.id,
            amount: billing.amount,
            billing_date: billing.billing_date,
            payment_method: billing.payment?.method || null,
            payment_reference: billing.payment?.reference || null,
          }
        });
        console.log(`✅ Billing untuk ${created.billing_date.toISOString().slice(0,10)} berhasil dibuat (ID: ${created.id})`);

        // Buat payment sukses jika ada info payment di seed
        if (billing.payment) {
          const method = billing.payment.method === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'QRIS';
          await prisma.payment.create({
            data: {
              tenant_id: tenantId,
              billing_id: created.id,
              gateway: 'MIDTRANS',
              payment_method: method as any,
              amount: created.amount,
              currency: 'IDR',
              status: 'SUCCESS',
              gateway_transaction_id: `MT-${created.id}`,
              gateway_payment_url: null,
              gateway_response: JSON.stringify({
                transaction_id: `MT-${created.id}`,
                status: 'settlement',
                payment_type: method.toLowerCase()
              }),
              paid_at: billing.payment.paid_at,
              expired_at: null
            }
          });
          console.log(`✅ Payment untuk billing ID ${created.id} berhasil dibuat`);
        }
      } else {
        console.log(`⚠️  Billing untuk ${existingBilling.billing_date.toISOString().slice(0,10)} sudah ada (ID: ${existingBilling.id})`);
      }
    }
    
    // 5. Ringkasan data
    
    // 6. Tampilkan ringkasan data
    const totalBillings = await prisma.billing.count({
      where: { tenant_id: tenantId }
    });
    
    const totalPayments = await prisma.payment.count({
      where: { tenant_id: tenantId }
    });
    
    console.log('\n📊 RINGKASAN DATA BILLING:');
    console.log(`🏢 Tenant: ${tenant.name} (${tenantId})`);
    console.log(`📋 Total Billing Records: ${totalBillings}`);
    console.log(`💳 Total Payment Records: ${totalPayments}`);

    const recentBillings = await prisma.billing.findMany({
      where: { tenant_id: tenantId },
      orderBy: { billing_date: 'asc' },
      include: { Payment: true, Invoice: true },
      take: 10
    });

    console.log('\n🧾 Billing sample:');
    recentBillings.forEach(b => {
      console.log(` - ${b.billing_date.toISOString().slice(0,10)} | Amount: ${b.amount} | Payments: ${b.Payment.length} | Invoice: ${b.Invoice ? b.Invoice.invoice_number : 'None'}`);
    });
    
    console.log('\n🎉 Data sample billing berhasil dibuat!');
    
  } catch (error) {
    console.error('❌ Error saat membuat data sample:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
createBillingSampleData();
