const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const filePath = process.argv[2];
  const dbUrl = process.argv[3] || process.env.DATABASE_URL;

  if (!filePath || !dbUrl) {
    console.error('Usage: node scripts/execute-sql.js <file.sql> <db_url>');
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    // Ensure we operate in the intended schema
    await client.query('SET search_path TO public');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL executed successfully.');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
    try { await client.query('ROLLBACK'); } catch {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
