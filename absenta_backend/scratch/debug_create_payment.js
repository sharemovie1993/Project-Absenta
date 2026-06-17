/**
 * Debug: Test response createPayment setelah fix schema
 */
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

(async () => {
  try {
    const login = await axios.post('http://10.10.10.250:3001/api/auth/login', {
      email: '2krw@gmail.com', password: 'admin1234'
    });
    const token = login.data.data.token;
    const tenantId = login.data.data.user.tenant_id;
    console.log('✅ Login OK, tenant:', tenantId);

    // Cari billing yang sedang aktif (DRAFT/SENT invoice)
    const billing = await prisma.billing.findFirst({
      where: {
        tenant_id: tenantId,
        Invoice: { status: { in: ['DRAFT', 'SENT'] } }
      },
      include: { Invoice: true },
      orderBy: { created_at: 'desc' }
    });

    if (!billing) {
      console.log('⚠️ Tidak ada billing aktif. Buat order dulu via cleanup + simulasi.');
      await prisma.$disconnect();
      return;
    }
    console.log('📋 Billing ID:', billing.id, '| Invoice status:', billing.Invoice?.status);

    // Test createPayment — ini yang sebelumnya return data: {}
    const res = await axios.post('http://10.10.10.250:3001/api/payments/create', {
      billing_id: billing.id,
      gateway: 'TRIPAY',
      method: 'BANK_TRANSFER',
      channel_code: 'BCAVA'
    }, { headers: { Authorization: 'Bearer ' + token } });

    console.log('\n📦 HTTP Status:', res.status);
    console.log('📦 Response keys di data:', Object.keys(res.data.data || {}));
    console.log('📦 Full response.data:');
    console.log(JSON.stringify(res.data, null, 2));

    const paymentId = res.data.data?.id || res.data.data?.payment_id;
    console.log('\n✅ Payment ID terambil dari response:', paymentId || '❌ MASIH TIDAK ADA');

  } catch (e) {
    console.error('❌ ERROR:', JSON.stringify(e.response?.data) || e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
