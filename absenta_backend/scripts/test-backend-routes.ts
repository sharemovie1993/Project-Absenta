import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function run() {
  console.log('--- START INTEGRATION ROUTE TEST ---');
  
  // 1. Fetch a SUPERADMIN or ADMIN user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { role_id: 'dcb157e2-b743-4f8f-b738-09e00ed8f2e6' }, // SUPERADMIN
        { role_id: 'd7551ed6-c2bf-4dba-bdea-e87e62985300' }  // ADMIN
      ],
      status: 'ACTIVE'
    },
    include: { Role: true }
  });

  if (!user) {
    console.error('Tidak ada user SUPERADMIN atau ADMIN aktif ditemukan di database lokal.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Menggunakan User: ${user.email} (Tenant ID: ${user.tenant_id}) | Role: ${user.Role?.name}`);

  // 2. Generate JWT Token
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role_id: user.role_id,
      roleName: user.Role?.name
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  };

  const API_PORT = process.env.PORT || '3004';
  const BASE_URL = `http://localhost:${API_PORT}/api`;

  console.log(`Menghubungi API Lokal: ${BASE_URL}`);

  try {
    // Test 1: GET /api/billing/my-subscription/invoices
    console.log('\n[TEST 1] GET /api/billing/my-subscription/invoices');
    const invRes = await axios.get(`${BASE_URL}/billing/my-subscription/invoices`, { headers, timeout: 8000 });
    console.log('Status Code:', invRes.status);
    console.log('Jumlah Tagihan Mapped:', invRes.data?.data?.length);
    if (invRes.data?.data?.length > 0) {
      console.log('Sample Tagihan Pertama:', JSON.stringify(invRes.data.data[0], null, 2));
    }

    // Test 2: GET /api/invoice/:invoiceId/public-link
    const sampleInvoiceId = 'INV-ORK-24-2026';
    console.log(`\n[TEST 2] GET /api/invoice/${sampleInvoiceId}/public-link`);
    const linkRes = await axios.get(`${BASE_URL}/invoice/${sampleInvoiceId}/public-link`, { headers, timeout: 8000 });
    console.log('Status Code:', linkRes.status);
    console.log('Response Link Mapped:', JSON.stringify(linkRes.data, null, 2));

    console.log('\n======================================================');
    console.log('SELURUH PENGUJIAN ROUTE INTEGRASI BERHASIL 100%!!!');
    console.log('======================================================');
  } catch (err: any) {
    console.error('\n[TEST FAILED] Error:', err.message);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', err.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run();
