
import { PrismaClient } from '@prisma/client';
import { InvoiceService } from '../src/modules/invoice/services/invoice.service';
import { RoleName } from '../src/constants/enums';

const prisma = new PrismaClient();
const invoiceService = new InvoiceService();

async function main() {
  console.log('🚀 Starting Invoice Snapshot Verification...');

  // 1. Get or Create Tenant & Subscription & Billing
  const tenant = await prisma.tenant.findFirst() || await prisma.tenant.create({
    data: { name: 'Test Tenant', absensi_mode: 'SIMPLE' }
  });

  const subscription = await prisma.subscription.findFirst({ where: { tenant_id: tenant.id } }) || await prisma.subscription.create({
    data: { 
        tenant_id: tenant.id, 
        plan_id: (await prisma.plan.findFirst())?.id || 'dummy_plan_id', 
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date()
    }
  });

  // Create a billing
  const billing = await prisma.billing.create({
    data: {
      tenant_id: tenant.id,
      subscription_id: subscription.id,
      amount: 1000000,
      billing_date: new Date(),
      status: 'UNPAID'
    }
  });

  console.log(`✅ Setup complete. Billing ID: ${billing.id}`);

  // 2. Fetch Original Global System Config
  const originalConfig = await prisma.systemConfig.findFirst({
    where: { tenant_id: null }
  });

  if (!originalConfig) {
      // Create if not exists
      await prisma.systemConfig.create({
          data: {
              tenant_id: null,
              company_legal_name: 'PT ORIGINAL',
              company_trade_name: 'ORIGINAL INC',
              // ... other fields if mandatory
          }
      });
  }

  // Store original values to restore
  const restoreData = { ...originalConfig };
  delete restoreData.id;
  delete restoreData.created_at;
  delete restoreData.updated_at;

  try {
    // ==========================================
    // TEST CASE A: Create Invoice with Identity A
    // ==========================================
    console.log('\n🔵 Setting Identity A...');
    
    const globalConfig = await prisma.systemConfig.findFirst({ where: { tenant_id: null } });
    let configId = globalConfig?.id;

    if (!configId) {
        const newConfig = await prisma.systemConfig.create({
            data: {
                tenant_id: null,
                company_legal_name: 'PT IDENTITY A',
                company_trade_name: 'BRAND A',
            }
        });
        configId = newConfig.id;
    } else {
        await prisma.systemConfig.update({
            where: { id: configId },
            data: {
                company_legal_name: 'PT IDENTITY A',
                company_trade_name: 'BRAND A',
            }
        });
    }

    console.log('🔵 Creating Invoice A...');
    const invoiceA = await invoiceService.createInvoice({
        billing_id: billing.id,
        due_date: new Date()
    }, RoleName.SUPERADMIN, 'system');
    console.log(`✅ Invoice A Created: ${invoiceA.invoice_number}`);

    // ==========================================
    // TEST CASE B: Change Identity to B and Create Invoice B
    // ==========================================
    console.log('\n🟠 Changing Identity to B...');
    if (configId) {
        await prisma.systemConfig.update({
            where: { id: configId },
            data: {
                company_legal_name: 'PT IDENTITY B',
                company_trade_name: 'BRAND B',
            }
        });
    }

    // Need a new billing for Invoice B
    const billingB = await prisma.billing.create({
        data: {
          tenant_id: tenant.id,
          subscription_id: subscription.id,
          amount: 2000000,
          billing_date: new Date(),
          status: 'UNPAID'
        }
    });

    console.log('🟠 Creating Invoice B...');
    const invoiceB = await invoiceService.createInvoice({
        billing_id: billingB.id,
        due_date: new Date()
    }, RoleName.SUPERADMIN, 'system');
    console.log(`✅ Invoice B Created: ${invoiceB.invoice_number}`);

    // ==========================================
    // VERIFICATION
    // ==========================================
    console.log('\n🔍 Verifying Snapshots...');
    
    // Reload Invoice A
    const loadedInvoiceA = await prisma.invoice.findUnique({ where: { id: invoiceA.id } });
    const loadedInvoiceB = await prisma.invoice.findUnique({ where: { id: invoiceB.id } });

    console.log(`Invoice A Snapshot Name: ${loadedInvoiceA?.invoice_company_legal_name}`);
    console.log(`Invoice B Snapshot Name: ${loadedInvoiceB?.invoice_company_legal_name}`);

    if (loadedInvoiceA?.invoice_company_legal_name === 'PT IDENTITY A' && 
        loadedInvoiceB?.invoice_company_legal_name === 'PT IDENTITY B') {
        console.log('\n✅ SUCCESS: Snapshots are correct and independent!');
    } else {
        console.error('\n❌ FAILED: Snapshots do not match expected values.');
        if (loadedInvoiceA?.invoice_company_legal_name !== 'PT IDENTITY A') console.error(`Expected A to be 'PT IDENTITY A', got '${loadedInvoiceA?.invoice_company_legal_name}'`);
        if (loadedInvoiceB?.invoice_company_legal_name !== 'PT IDENTITY B') console.error(`Expected B to be 'PT IDENTITY B', got '${loadedInvoiceB?.invoice_company_legal_name}'`);
    }

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    // Cleanup
    if (originalConfig && restoreData) {
        // Restore
        const configId = (await prisma.systemConfig.findFirst({ where: { tenant_id: null } }))?.id;
        if (configId) {
             await prisma.systemConfig.update({
                where: { id: configId },
                data: restoreData as any
             });
             console.log('\n🧹 Restored original SystemConfig.');
        }
    }
    await prisma.$disconnect();
  }
}

main();
