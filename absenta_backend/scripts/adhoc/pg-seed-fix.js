const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seed() {
    const client = new Client({
        connectionString: 'postgresql://postgres:123123123@10.10.10.250:5432/absensi'
    });

    try {
        await client.connect();
        console.log('Connected to DB via pg driver.');

        const tenantId = '2516520d-4466-4410-a218-06eab518bfd9'; // Existing ID from previous prisma run
        const tpId = '6e6b010c-35cd-45ea-9d82-825fdb51d9f6';
        const semId = '4cb030f7-53cd-46d2-9988-51834947b198';

        // 1. Ensure Roles (ADMIN, SISWA)
        // Note: seedPolicies usually handles this, so we assume they exist if seeder half-ran.
        const resRoleSiswa = await client.query("SELECT id FROM \"Role\" WHERE name = 'SISWA' LIMIT 1");
        const roleSiswaId = resRoleSiswa.rows[0]?.id;

        // 2. Create/Check Kelas X-RPL-1
        const resKelas = await client.query("SELECT id FROM \"Kelas\" WHERE tenant_id = $1 AND nama_kelas LIKE '%X-RPL-1%' LIMIT 1", [tenantId]);
        let kelasId = resKelas.rows[0]?.id;
        
        if (!kelasId) {
             console.log('Creating Kelas X-RPL-1...');
             const insKelas = await client.query(
                "INSERT INTO \"Kelas\" (id, tenant_id, nama_kelas, tingkat) VALUES (gen_random_uuid(), $1, 'X-RPL-1', 10) RETURNING id",
                [tenantId]
             );
             kelasId = insKelas.rows[0].id;
        }

        // 3. Create Hidayat
        const hidayatEmail = 'hidayat.catur.pamungkas@gmail.com';
        const hashedPassword = await bcrypt.hash('raka1234', 10);
        
        console.log('Seeding Hidayat...');
        const hUserRes = await client.query(
            "INSERT INTO \"User\" (id, tenant_id, email, password, full_name, role_id, status) VALUES (gen_random_uuid(), $1, $2, $3, 'Hidayat Catur Pamungkas', $4, 'ACTIVE') ON CONFLICT (tenant_id, email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id",
            [tenantId, hidayatEmail, hashedPassword, roleSiswaId]
        );
        const hUserId = hUserRes.rows[0].id;

        await client.query(
            "INSERT INTO \"Siswa\" (id, tenant_id, user_id, nis, nama_siswa, kelas_id, status, no_rfid) VALUES (gen_random_uuid(), $1, $2, '20250002', 'Hidayat Catur Pamungkas', $3, 'AKTIF', '0X2D5DCABDEB') ON CONFLICT (user_id) DO NOTHING",
            [tenantId, hUserId, kelasId]
        );

        // 4. Create Nabila
        const nabilaEmail = 'nabila.nur.azizah@gmail.com';
        console.log('Seeding Nabila...');
        const nUserRes = await client.query(
            "INSERT INTO \"User\" (id, tenant_id, email, password, full_name, role_id, status) VALUES (gen_random_uuid(), $1, $2, $3, 'Nabila Nur Azizah', $4, 'ACTIVE') ON CONFLICT (tenant_id, email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id",
            [tenantId, nabilaEmail, hashedPassword, roleSiswaId]
        );
        const nUserId = nUserRes.rows[0].id;

        await client.query(
            "INSERT INTO \"Siswa\" (id, tenant_id, user_id, nis, nama_siswa, kelas_id, status, no_rfid) VALUES (gen_random_uuid(), $1, $2, '20250003', 'Nabila Nur Azizah', $3, 'AKTIF', '0X75AFA9C34F') ON CONFLICT (user_id) DO NOTHING",
            [tenantId, nUserId, kelasId]
        );

        console.log('✅ Seed completed successfully!');
    } catch (err) {
        console.error('❌ Error during pg seed:', err);
    } finally {
        await client.end();
    }
}

seed();
