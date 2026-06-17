import { prisma } from '../src/utils/prisma';
import { TokoService } from '../src/modules/cooperative/toko/toko.service';

async function main() {
  console.log('--- START STOCK IN VERIFICATION ---');

  // 1. Get a Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error('No tenant found in the database. Run seed first.');
  }
  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Find or Create a Product for testing
  let product = await prisma.product.findFirst({
    where: { tenantId: tenant.id }
  });

  if (!product) {
    console.log('No product found, creating a test product...');
    product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: 'Test Product Stock-In',
        code: 'TEST-STK-IN-' + Date.now(),
        price: 1500,
        costPrice: 800,
        stock: 10
      }
    });
  }

  console.log(`Original Product: ${product.name} (Code: ${product.code}) | Stock: ${product.stock} | Cost Price: ${product.costPrice}`);

  const initialStock = product.stock;

  // 3. Test Stock-In with CASH method
  console.log('\n--- Processing Stock-In (CASH) ---');
  const qty1 = 5;
  const costPrice1 = 1000;
  const supplier1 = 'Supplier Cash Indah';
  const notes1 = 'Pembelian tunai barang uji';

  const stockInCash = await TokoService.processStockIn(tenant.id, null, {
    supplier: supplier1,
    notes: notes1,
    paymentMethod: 'CASH',
    items: [
      { productId: product.id, quantity: qty1, costPrice: costPrice1 }
    ]
  });

  console.log('Stock-In (CASH) result:', {
    id: stockInCash.id,
    supplier: stockInCash.supplier,
    paymentMethod: stockInCash.paymentMethod,
    totalItems: stockInCash.items.length
  });

  // Verify Product update
  let updatedProduct = await prisma.product.findUnique({
    where: { id: product.id }
  });
  if (!updatedProduct) throw new Error('Product not found after update');

  console.log(`Updated Product: Stock: ${updatedProduct.stock} (Expected: ${initialStock + qty1}), Cost Price: ${updatedProduct.costPrice} (Expected: ${costPrice1})`);

  // Verify Journal Entry for CASH
  const journalCash = await prisma.journal.findFirst({
    where: { reference: `STK-IN-${stockInCash.id}` },
    include: { items: { include: { account: true } } }
  });

  if (!journalCash) {
    console.error('FAIL: Journal entry for CASH not found.');
  } else {
    console.log('SUCCESS: Journal entry for CASH found:', journalCash.description);
    for (const item of journalCash.items) {
      console.log(`  - Account: ${item.account.code} (${item.account.name}) | Type: ${item.type} | Amount: ${item.amount}`);
    }
  }

  // 4. Test Stock-In with CREDIT method
  console.log('\n--- Processing Stock-In (CREDIT) ---');
  const qty2 = 10;
  const costPrice2 = 1100;
  const supplier2 = 'Supplier Credit Sentosa';
  const notes2 = 'Pembelian kredit barang uji';

  const stockInCredit = await TokoService.processStockIn(tenant.id, null, {
    supplier: supplier2,
    notes: notes2,
    paymentMethod: 'CREDIT',
    items: [
      { productId: product.id, quantity: qty2, costPrice: costPrice2 }
    ]
  });

  console.log('Stock-In (CREDIT) result:', {
    id: stockInCredit.id,
    supplier: stockInCredit.supplier,
    paymentMethod: stockInCredit.paymentMethod,
    totalItems: stockInCredit.items.length
  });

  // Verify Product update again
  updatedProduct = await prisma.product.findUnique({
    where: { id: product.id }
  });
  if (!updatedProduct) throw new Error('Product not found after update');

  console.log(`Updated Product: Stock: ${updatedProduct.stock} (Expected: ${initialStock + qty1 + qty2}), Cost Price: ${updatedProduct.costPrice} (Expected: ${costPrice2})`);

  // Verify Journal Entry for CREDIT
  const journalCredit = await prisma.journal.findFirst({
    where: { reference: `STK-IN-${stockInCredit.id}` },
    include: { items: { include: { account: true } } }
  });

  if (!journalCredit) {
    console.error('FAIL: Journal entry for CREDIT not found.');
  } else {
    console.log('SUCCESS: Journal entry for CREDIT found:', journalCredit.description);
    for (const item of journalCredit.items) {
      console.log(`  - Account: ${item.account.code} (${item.account.name}) | Type: ${item.type} | Amount: ${item.amount}`);
    }
  }

  // 5. Test History retrieval API service
  console.log('\n--- Testing getStockInHistory ---');
  const history = await TokoService.getStockInHistory(tenant.id, { supplier: 'Supplier' });
  console.log(`Found ${history.length} transactions in history matching "Supplier".`);

  const detail = await TokoService.getStockInDetail(tenant.id, stockInCash.id);
  console.log('Detail for cash transaction loaded:', detail ? 'YES' : 'NO');

  console.log('\n--- VERIFICATION COMPLETED ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
