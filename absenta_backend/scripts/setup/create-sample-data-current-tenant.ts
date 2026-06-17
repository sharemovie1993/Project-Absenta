import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleDataForCurrentTenant() {
  const currentTenantId = '07411721-73bf-436f-bcf8-91931615a5c3';
  
  try {
    console.log('🚀 Memulai pembuatan sample data untuk tenant:', currentTenantId);
    
    // 1. Cek apakah tenant ada
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentTenantId }
    });
    
    if (!tenant) {
      console.error('❌ Tenant tidak ditemukan:', currentTenantId);
      return;
    }
    
    console.log('✅ Tenant ditemukan:', tenant.name);
    
    // 2. Cek apakah ada plan yang aktif
    let plan = await prisma.plan.findFirst({
      where: { is_active: true }
    });
    
    if (!plan) {
      // Buat plan default jika belum ada
      plan = await prisma.plan.create({
        data: {
          name: 'Basic Plan',
          price_monthly: 150000,
          max_user: 100,
          features: 'Absensi dasar, Laporan bulanan',
          currency: 'IDR',
          is_active: true
        }
      });
      console.log('✅ Plan default berhasil dibuat');
    } else {
      console.log('✅ Plan ditemukan:', plan.name);
    }
    
    // 3. Cek apakah sudah ada subscription
    let subscription = await prisma.subscription.findFirst({
      where: {
        tenant_id: currentTenantId,
        status: 'ACTIVE'
      }
    });
    
    if (!subscription) {
      // Buat subscription baru
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const nextBillingDate = new Date('2024-12-01');
      
      subscription = await prisma.subscription.create({
        data: {
          tenant_id: currentTenantId,
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
        status: 'PAID' as const,
        billing_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-15'),
        paid_at: new Date('2024-01-10'),
        invoice_number: 'INV-2024-001',
        payment_method: 'BANK_TRANSFER',
        payment_reference: 'TRF-001-2024'
      },
      {
        amount: 150000,
        status: 'PAID' as const,
        billing_date: new Date('2024-02-01'),
        due_date: new Date('2024-02-15'),
        paid_at: new Date('2024-02-12'),
        invoice_number: 'INV-2024-002',
        payment_method: 'QRIS',
        payment_reference: 'QRIS-002-2024'
      },
      {
        amount: 150000,
        status: 'PAID' as const,
        billing_date: new Date('2024-03-01'),
        due_date: new Date('2024-03-15'),
        paid_at: new Date('2024-03-08'),
        invoice_number: 'INV-2024-003',
        payment_method: 'BANK_TRANSFER',
        payment_reference: 'TRF-003-2024'
      },
      {
        amount: 150000,
        status: 'UNPAID' as const,
        billing_date: new Date('2024-11-01'),
        due_date: new Date('2024-11-15'),
        paid_at: null,
        invoice_number: 'INV-2024-011',
        payment_method: null,
        payment_reference: null
      },
      {
        amount: 150000,
        status: 'OVERDUE' as const,
        billing_date: new Date('2024-10-01'),
        due_date: new Date('2024-10-15'),
        paid_at: null,
        invoice_number: 'INV-2024-010',
        payment_method: null,
        payment_reference: null
      }
    ];
    
    // Hapus billing lama jika ada
    await prisma.billing.deleteMany({
      where: { tenant_id: currentTenantId }
    });
    
    // Buat billing baru
    for (const billing of billingData) {
      await prisma.billing.create({
        data: {
          tenant_id: currentTenantId,
          subscription_id: subscription.id,
          ...billing
        }
      });
    }
    
    console.log(`✅ ${billingData.length} billing records berhasil dibuat`);
    
    // 5. Buat invoice untuk beberapa billing
    const billings = await prisma.billing.findMany({
      where: { tenant_id: currentTenantId },
      take: 3
    });
    
    // Hapus invoice lama jika ada
    await prisma.invoice.deleteMany({
      where: { tenant_id: currentTenantId }
    });
    
    for (let i = 0; i < billings.length; i++) {
      const billing = billings[i];
      const invoiceNumber = `INV-${currentTenantId.slice(0, 8)}-${String(i + 1).padStart(3, '0')}`;
      
      await prisma.invoice.create({
        data: {
          tenant_id: currentTenantId,
          billing_id: billing.id,
          invoice_number: invoiceNumber,
          title: `Invoice - ${plan.name}`,
          description: `Tagihan bulanan untuk layanan ${plan.name}`,
          amount: billing.amount,
          tax_amount: 0,
          total_amount: billing.amount,
          currency: 'IDR',
          status: billing.status === 'PAID' ? 'PAID' : 'SENT',
          issue_date: billing.billing_date,
          due_date: billing.due_date,
          sent_at: billing.billing_date,
          paid_at: billing.paid_at,
          notes: 'Terima kasih atas kepercayaan Anda',
          terms_conditions: 'Pembayaran maksimal 14 hari setelah tanggal jatuh tempo'
        }
      });
    }
    
    console.log(`✅ ${billings.length} invoice records berhasil dibuat`);
    
    // 6. Tampilkan ringkasan
    const totalBillings = await prisma.billing.count({
      where: { tenant_id: currentTenantId }
    });
    
    const totalInvoices = await prisma.invoice.count({
      where: { tenant_id: currentTenantId }
    });
    
    console.log('\n📊 RINGKASAN DATA:');
    console.log(`- Tenant: ${tenant.name}`);
    console.log(`- Plan: ${plan.name} (${plan.price_monthly.toLocaleString('id-ID')} IDR/bulan)`);
    console.log(`- Total Billing: ${totalBillings} records`);
    console.log(`- Total Invoice: ${totalInvoices} records`);
    console.log('\n🎉 Sample data berhasil dibuat!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
createSampleDataForCurrentTenant();