import { prisma } from '../src/utils/prisma';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

async function main() {
  console.log('--- START RESPONSE STRUCTURE CHECK ---');

  // 1. Get Superadmin
  const user = await prisma.user.findFirst({
    where: { email: 'superadmin@system.com' },
    include: { Role: true }
  });

  if (!user) {
    throw new Error('Superadmin user not found.');
  }

  // 2. Generate token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    tenantId: user.tenant_id,
    roleId: (user as any).Role?.id,
    roleName: (user as any).Role?.name,
    exp: Math.floor(Date.now() / 1000) + (15 * 60),
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET);

  // 3. Find a Product
  const product = await prisma.product.findFirst({
    where: { tenantId: user.tenant_id }
  });
  if (!product) {
    throw new Error('No product found for tenant.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Sub': 'system' // fallback subtenant
  };

  // 4. Test POST /cooperative/toko/stock-in
  console.log('\n--- Sending POST /api/cooperative/toko/stock-in ---');
  try {
    const postRes = await axios.post(
      'http://localhost:3001/api/cooperative/toko/stock-in',
      {
        supplier: 'Test Response Supplier',
        notes: 'Checking response wrapping',
        paymentMethod: 'CASH',
        items: [
          { productId: product.id, quantity: 2, costPrice: 999 }
        ]
      },
      { headers }
    );
    console.log('POST Response Status:', postRes.status);
    console.log('POST Response Body:', JSON.stringify(postRes.data, null, 2));
  } catch (e: any) {
    console.error('POST failed:', e.response?.data || e.message);
  }

  // 5. Test GET /cooperative/toko/stock-in
  console.log('\n--- Sending GET /api/cooperative/toko/stock-in ---');
  try {
    const getRes = await axios.get(
      'http://localhost:3001/api/cooperative/toko/stock-in',
      { headers }
    );
    console.log('GET Response Status:', getRes.status);
    console.log('GET Response Body Sample (first item):', JSON.stringify(getRes.data[0] || null, null, 2));
  } catch (e: any) {
    console.error('GET failed:', e.response?.data || e.message);
  }

  console.log('\n--- FINISHED ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
