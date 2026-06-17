const { Client } = require('pg');

async function clean() {
    const client = new Client({
        connectionString: 'postgresql://postgres:123123123@10.10.10.250:5432/absensi'
    });

    try {
        await client.connect();
        console.log('Connected to DB.');

        console.log('Dropping public schema...');
        await client.query('DROP SCHEMA public CASCADE');
        
        console.log('Recreating public schema...');
        await client.query('CREATE SCHEMA public');
        await client.query('GRANT ALL ON SCHEMA public TO postgres');
        await client.query('GRANT ALL ON SCHEMA public TO public');

        console.log('Database cleaned successfully!');
    } catch (err) {
        console.error('Error cleaning DB:', err);
    } finally {
        await client.end();
    }
}

clean();
