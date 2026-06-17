import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkInvoiceData() {
  try {
    console.log("🔍 Memeriksa data invoice di database...");
    
    // Count total invoices
    const totalInvoices = await prisma.invoice.count();
    console.log("📊 Total invoices di database:", totalInvoices);
    
    // Get all invoices
    const allInvoices = await prisma.invoice.findMany({
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
      orderBy: {
        created_at: "desc"
      }
    });
    
    console.log("📋 Data invoices:");
    allInvoices.forEach((invoice, index) => {
      console.log(`${index + 1}. Invoice ID: ${invoice.id}`);
      console.log(`   Tenant ID: ${invoice.tenant_id}`);
      console.log(`   Invoice Number: ${invoice.invoice_number}`);
      console.log(`   Title: ${invoice.title}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Amount: ${invoice.total_amount}`);
      console.log(`   Created: ${invoice.created_at}`);
      console.log(`   Tenant: ${invoice.Tenant?.name || "N/A"}`);
      console.log("   ---");
    });
    
    // Check specific tenant
    const testTenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d482";
    const tenantInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: testTenantId
      }
    });
    
    console.log(`📊 Invoices untuk tenant ${testTenantId}:`, tenantInvoices.length);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoiceData();