const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:123123123@10.10.10.250:5432/absensi' });

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT public_token, invoice_number FROM "Invoice" WHERE public_token IS NOT NULL LIMIT 1');
    console.log(JSON.stringify(res.rows[0]));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
