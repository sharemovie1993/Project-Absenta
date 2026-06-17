const axios = require('axios');

async function run() {
  const base = process.env.API_BASE || 'https://api.absenta.id';
  const loginUrl = `${base}/api/auth/login`;
  const channelsUrl = `${base}/api/payments/tripay/channels`;
  const headersDomain = {
    'x-tenant-domain': 'smkmutohar.absenta.id',
    'x-tenant-sub': 'smkmutohar',
    'x-forwarded-host': 'smkmutohar.absenta.id',
    'content-type': 'application/json'
  };
  try {
    const loginResp = await axios.post(loginUrl, {
      email: 'admin@smkmutohar.sch.id',
      password: 'admin*1234'
    }, { headers: headersDomain, timeout: 20000 });
    const token = loginResp?.data?.data?.token;
    const tenantId = loginResp?.data?.data?.user?.tenant_id;
    if (!token || !tenantId) {
      console.error('Login berhasil tetapi token/tenant_id tidak ditemukan:', loginResp?.data);
      process.exit(1);
    }
    const channelsResp = await axios.get(channelsUrl, {
      headers: {
        ...headersDomain,
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      },
      timeout: 20000
    });
    const items = Array.isArray(channelsResp?.data?.data) ? channelsResp.data.data : [];
    console.log('Total channel:', items.length);
    for (const it of items) {
      const code = String(it?.code || it?.channel_code || '').toUpperCase();
      const name = String(it?.name || '').trim();
      const group = String(it?.group || it?.category || '').trim();
      console.log(`${code} | ${name} | ${group}`);
    }
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
}

run();
