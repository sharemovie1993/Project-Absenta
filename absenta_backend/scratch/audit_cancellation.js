const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function audit() {
  try {
    console.log('--- Login Audit ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: '2krw@gmail.com',
      password: 'admin1234'
    });

    const token = loginRes.data.data.token;
    const tenantId = loginRes.data.data.tenant_id;
    console.log('Login Success. Tenant ID:', tenantId);

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n--- Checking Active Subscription ---');
    const subRes = await axios.get(`${BASE_URL}/billing/my-subscription`, { headers });
    const sub = subRes.data.data;
    console.log('Subscription Status:', sub?.status);
    console.log('Subscription ID:', sub?.id);

    console.log('\n--- Checking Pending Invoices ---');
    const invoiceRes = await axios.get(`${BASE_URL}/invoice`, { headers });
    const invoiceData = invoiceRes.data.data;
    const invoices = Array.isArray(invoiceData) ? invoiceData : (invoiceData?.items || []);
    const pendingInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
    
    if (pendingInvoices.length === 0) {
      console.log('No pending invoices found.');
    } else {
      for (const inv of pendingInvoices) {
        console.log(`Invoice: ${inv.id}, Status: ${inv.status}, Type: ${inv.type}`);
        
        // Try to get public token for this invoice
        console.log(`Requesting public link for invoice ${inv.id}...`);
        try {
          // Note: Backend might not have a direct endpoint to get public token for a private user 
          // but we can check the public routes logic.
          // Let's assume we want to test the /upgrade/cancel endpoint specifically.
        } catch (e) {
          console.log('Failed to get public token:', e.message);
        }
      }
    }

  } catch (error) {
    console.error('Audit failed:', error.response?.data || error.message);
  }
}

audit();
