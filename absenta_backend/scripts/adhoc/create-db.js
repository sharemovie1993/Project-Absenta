const { Client } = require('pg');

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2];
  const dbName = process.env.DB_NAME || process.argv[3] || 'absensi_multitenant';

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  console.log(`🗄️ Creating database '${dbName}'...`);
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    // CREATE DATABASE cannot run inside a transaction, so do it directly
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log('✅ Database created successfully');
    process.exit(0);
  } catch (err) {
    if (String(err.message).includes('already exists')) {
      console.log('ℹ️ Database already exists, continuing');
      process.exit(0);
    }
    console.error('❌ Failed to create database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
