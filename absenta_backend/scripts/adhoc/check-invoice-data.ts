import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoiceData() {
  try {
    console.log('🔍 Checking invoice data in database...\n');

    // 1. Check total invoices
    const totalInvoices = await prisma.invoice.count();
    console.log(`📊 Total invoices in database: ${totalInvoices}`);

    // 2. Get sample invoices with relations
    const invoices = await prisma.invoice.findMany({
      take: 5,
      include: {
        Tenant: {
          select: {
            id: true,
            name: true
          }
        },
        Billing: {
          select: {
            id: true,
            invoice_number: true,
            billing_date: true,
            due_date: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`\n📋 Sample invoices (showing ${invoices.length} of ${totalInvoices}):`);
    invoices.forEach((invoice, index) => {
      console.log(`\n${index + 1}. Invoice ID: ${invoice.id}`);
      console.log(`   Invoice Number: ${invoice.invoice_number}`);
      console.log(`   Amount: ${invoice.amount}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Issue Date: ${invoice.issue_date}`);
      console.log(`   Due Date: ${invoice.due_date}`);
      console.log(`   Tenant: ${invoice.Tenant?.name || 'N/A'} (${invoice.tenant_id})`);
      console.log(`   Billing ID: ${invoice.billing_id}`);
      console.log(`   Created: ${invoice.created_at}`);
    });

    // 3. Check invoices by status
    const statusCounts = await prisma.invoice.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    console.log('\n📈 Invoice counts by status:');
    statusCounts.forEach(status => {
      console.log(`   ${status.status}: ${status._count.id}`);
    });

    // 4. Check tenants
    const totalTenants = await prisma.tenant.count();
    console.log(`\n🏢 Total tenants: ${totalTenants}`);

    const tenants = await prisma.tenant.findMany({
      take: 3,
      select: {
        id: true,
        name: true
      }
    });

    console.log('\n🏢 Sample tenants:');
    tenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.name} (${tenant.id})`);
    });

  } catch (error) {
    console.error('❌ Error checking invoice data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoiceData();