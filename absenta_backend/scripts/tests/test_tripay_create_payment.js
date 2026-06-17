require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');

async function run() {
  const prisma = new PrismaClient();
  try {
    const billing = await prisma.billing.findFirst({
      orderBy: { created_at: 'desc' },
      include: { Tenant: true, Invoice: true }
    });
    if (!billing) {
      console.error('Tidak ada billing di database. Buat billing terlebih dahulu.');
      process.exit(1);
    }
    console.log('Billing:', { id: billing.id, amount: billing.amount, tenant_id: billing.tenant_id, invoice: billing.Invoice?.invoice_number });

    const baseUrl = (String(process.env.TRIPAY_IS_PRODUCTION || 'false').toLowerCase() === 'true')
      ? 'https://tripay.co.id/api'
      : 'https://tripay.co.id/api-sandbox';
    const apiKey = process.env.TRIPAY_API_KEY;
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    const privateKey = process.env.TRIPAY_PRIVATE_KEY;
    if (!apiKey || !merchantCode || !privateKey) {
      console.error('TRIPAY_API_KEY/TRIPAY_MERCHANT_CODE/TRIPAY_PRIVATE_KEY belum dikonfigurasi.');
      process.exit(1);
    }

    console.log('Ambil channel Tripay...');
    const chResp = await axios.get(`${baseUrl}/merchant/payment-channel`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'AbsentaBackend/1.0',
        Accept: 'application/json'
      },
      timeout: 20000
    });
    const channels = Array.isArray(chResp?.data?.data) ? chResp.data.data : [];
    const codes = channels.map(c => String(c.code || '').toUpperCase()).filter(Boolean);
    console.log('Total channel:', codes.length);
    if (codes.length === 0) {
      console.error('Tripay tidak mengembalikan channel. Periksa kredensial.');
      process.exit(1);
    }
    const preferred = codes.includes('BRIVA') ? 'BRIVA' : (codes.includes('QRIS') ? 'QRIS' : codes[0]);
    console.log('Channel yang akan dipakai:', preferred);

    const reference = `tripay-${billing.id.substring(0,8)}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`;
    const amount = Number(billing.amount);
    const signature = crypto.createHmac('sha256', privateKey).update(merchantCode + reference + amount).digest('hex');
    const payload = {
      method: preferred,
      merchant_ref: reference,
      amount,
      customer_name: billing.Tenant?.name || 'Tenant',
      customer_email: 'admin@smkmutohar.sch.id',
      order_items: [
        { sku: billing.id, name: `Invoice ${billing.Invoice?.invoice_number || billing.id}`, price: amount, quantity: 1 },
      ],
      signature,
      return_url: process.env.PAYMENT_RETURN_URL,
      callback_url: process.env.TRIPAY_WEBHOOK_URL || process.env.PAYMENT_CALLBACK_URL,
    };

    console.log('Kirim create transaction ke Tripay...');
    try {
      const resp = await axios.post(`${baseUrl}/transaction/create`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'AbsentaBackend/1.0',
          Accept: 'application/json'
        },
        timeout: 20000
      });
      console.log('Tripay response:', JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (err.response) {
        console.error('Status error:', err.response.status);
        console.error('Data error:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('Request error:', err.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

run();
