// Comprehensive test script for Invoice module endpoints
// Usage: NODE_OPTIONS=--no-warnings node backend/scripts/test-invoice-all-endpoints.js

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TENANT_ID = process.env.TENANT_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d482';
const CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'superadmin@system.com',
  password: process.env.TEST_PASSWORD || 'superadmin123'
};

function logStep(title) {
  console.log(`\n==== ${title} ====`);
}

function safe(obj, path, def = undefined) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? def;
}

async function loginSuperadmin() {
  logStep('Login as SUPERADMIN');
  const resp = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: CREDENTIALS.email,
    password: CREDENTIALS.password,
    // SUPERADMIN: tenant_id optional
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  if (!resp.data?.success) throw new Error(`Login failed: ${resp.data?.message}`);
  const token = safe(resp, 'data.data.token') || resp.data.token || resp.data.access_token;
  if (!token) throw new Error('Token not found in login response');
  console.log('✅ Login success');
  return token;
}

function makeClient(token) {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
  });
}

async function getInvoices(client) {
  logStep('GET /invoice (list with pagination + tenant filter)');
  const resp = await client.get('/invoice', { params: { page: 1, limit: 10, tenant_id: TENANT_ID } });
  console.log('Status:', resp.status);
  console.log('Body:', JSON.stringify(resp.data, null, 2));
  const list = safe(resp, 'data.data.data', []);
  return list;
}

async function getStats(client) {
  logStep('GET /invoice/stats');
  const resp = await client.get('/invoice/stats');
  console.log('Status:', resp.status);
  console.log('Body:', JSON.stringify(resp.data, null, 2));
}

async function getInvoiceById(client, id) {
  logStep(`GET /invoice/${id}`);
  const resp = await client.get(`/invoice/${id}`);
  console.log('Status:', resp.status);
  console.log('Body:', JSON.stringify(resp.data, null, 2));
}

async function updateInvoice(client, id) {
  logStep(`PUT /invoice/${id} (update due_date, notes)`);
  const dueDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  try {
    const resp = await client.put(`/invoice/${id}`, { due_date: dueDate, notes: 'Updated via test script' });
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    return true;
  } catch (err) {
    console.log('Expected/Unexpected Error:', err.response?.status, err.response?.data);
    return false;
  }
}

async function sendInvoice(client, id) {
  logStep(`PUT /invoice/${id}/send`);
  try {
    const resp = await client.put(`/invoice/${id}/send`);
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    return true;
  } catch (err) {
    console.log('Expected/Unexpected Error:', err.response?.status, err.response?.data);
    return false;
  }
}

async function payInvoice(client, id) {
  logStep(`PUT /invoice/${id}/pay`);
  try {
    const resp = await client.put(`/invoice/${id}/pay`);
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    return true;
  } catch (err) {
    console.log('Expected/Unexpected Error:', err.response?.status, err.response?.data);
    return false;
  }
}

async function createInvoice(client, billingId) {
  logStep('POST /invoice (create)');
  const dueDate = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  try {
    const resp = await client.post('/invoice', { billing_id: billingId, due_date: dueDate, notes: 'Created via test script' });
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    const id = safe(resp, 'data.data.id');
    return id || null;
  } catch (err) {
    console.log('Expected/Unexpected Error:', err.response?.status, err.response?.data);
    return null;
  }
}

async function deleteInvoice(client, id) {
  logStep(`DELETE /invoice/${id}`);
  try {
    const resp = await client.delete(`/invoice/${id}`);
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    return true;
  } catch (err) {
    console.log('Expected/Unexpected Error:', err.response?.status, err.response?.data);
    return false;
  }
}

async function getBillings(client) {
  logStep('GET /billing/billings (to find candidate billing_id)');
  try {
    const resp = await client.get('/billing/billings');
    console.log('Status:', resp.status);
    console.log('Body:', JSON.stringify(resp.data, null, 2));
    const billings = safe(resp, 'data.data', []) || safe(resp, 'data.billings', []);
    return billings;
  } catch (err) {
    console.log('Billing list fetch error:', err.response?.status, err.response?.data);
    return [];
  }
}

async function run() {
  try {
    const token = await loginSuperadmin();
    const client = makeClient(token);

    const invoices = await getInvoices(client);
    await getStats(client);

    const first = invoices[0];
    if (first) {
      await getInvoiceById(client, first.id);
    } else {
      console.log('ℹ️ No existing invoice found for tenant');
    }

    // Try update/send/pay using existing invoice (status-dependent)
    if (first) {
      await updateInvoice(client, first.id);
      const sentOk = await sendInvoice(client, first.id); // only works if DRAFT
      if (sentOk) {
        await payInvoice(client, first.id); // only works if SENT
      } else {
        console.log('ℹ️ send failed or invoice not DRAFT; continuing');
      }
    }

    // Attempt to create a new invoice using an available billing_id
    const existingBillingIds = new Set(invoices.map(inv => inv.billing_id).filter(Boolean));
    const billings = await getBillings(client);
    const candidate = billings.find(b => !existingBillingIds.has(b.id));
    let createdId = null;
    if (candidate?.id) {
      createdId = await createInvoice(client, candidate.id);
    } else {
      console.log('ℹ️ No candidate billing found without existing invoice, skipping create');
    }

    // If we created a DRAFT invoice, we can try delete it
    if (createdId) {
      // Validate GET before delete
      await getInvoiceById(client, createdId);
      // Delete (only allowed for DRAFT)
      await deleteInvoice(client, createdId);
      // Validate GET after delete (expected 404)
      try {
        await getInvoiceById(client, createdId);
      } catch (err) {
        console.log('Expected 404 after delete:', err.response?.status, err.response?.data);
      }
    } else {
      // If creation not possible, still test delete endpoint with existing id (likely 400)
      if (first) {
        await deleteInvoice(client, first.id);
      }
    }

    console.log('\n🎉 Invoice endpoints test completed.');
  } catch (error) {
    console.error('❌ Test run error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.data);
    }
    console.error('Hint: ensure backend is running at', API_BASE_URL);
  }
}

run();

