import { PrismaClient } from '@prisma/client';
import { invoiceService } from '../src/modules/invoice/services/invoice.service';

const prisma = new PrismaClient();

async function debugInvoiceService() {
  try {
    console.log('🔍 Debug Invoice Service...\n');

    // Test 1: Direct database query
    console.log('📊 Test 1: Direct Database Query');
    const directInvoices = await prisma.invoice.findMany({
      include: {
        Tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        Billing: {
          select: {
            id: true,
            amount: true,
            billing_date: true,
            due_date: true,
            status: true
          }
        }
      },
      take: 5
    });
    console.log(`Direct query result: ${directInvoices.length} invoices found`);
    if (directInvoices.length > 0) {
      console.log('Sample invoice:', JSON.stringify(directInvoices[0], null, 2));
    }

    console.log('\n' + '='.repeat(50));

    // Test 2: Service call with null tenant_id (SUPERADMIN)
    console.log('📊 Test 2: Service Call (SUPERADMIN - null tenant_id)');
    const serviceResult1 = await invoiceService.getAllInvoices(null, {}, 1, 10);
    console.log('Service result (null tenant_id):', JSON.stringify(serviceResult1, null, 2));

    console.log('\n' + '='.repeat(50));

    // Test 3: Service call with specific tenant_id
    console.log('📊 Test 3: Service Call (specific tenant_id)');
    const tenants = await prisma.tenant.findMany({ take: 2 });
    console.log('Available tenants:', tenants.map(t => ({ id: t.id, name: t.name })));
    
    if (tenants.length > 0) {
      const testTenantId = tenants[0].id;
      console.log(`Testing with tenant_id: ${testTenantId}`);
      const serviceResult2 = await invoiceService.getAllInvoices(testTenantId, {}, 1, 10);
      console.log('Service result (specific tenant_id):', JSON.stringify(serviceResult2, null, 2));
    }

    console.log('\n' + '='.repeat(50));

    // Test 4: Check invoice count by tenant
    console.log('📊 Test 4: Invoice Count by Tenant');
    const invoicesByTenant = await prisma.invoice.groupBy({
      by: ['tenant_id'],
      _count: {
        id: true
      }
    });
    console.log('Invoices by tenant:', invoicesByTenant);

    // Get tenant names
    for (const group of invoicesByTenant) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: group.tenant_id },
        select: { name: true }
      });
      console.log(`Tenant ${group.tenant_id} (${tenant?.name}): ${group._count.id} invoices`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugInvoiceService();