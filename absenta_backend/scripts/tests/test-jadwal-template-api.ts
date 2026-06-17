import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const BASE_URL = 'http://localhost:3000/api/attendance/jadwal-template';

async function main() {
  try {
    console.log('🚀 Starting Jadwal Template API Tests...');

    // 1. Setup Data
    console.log('📦 Fetching/Creating reference data...');
    let tenant = await prisma.tenant.findFirst({
        where: { id: { not: 'system' } }
    });
    
    if (!tenant) {
        console.log('Creating Test Tenant...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                status: 'ACTIVE',
                absensi_mode: 'MULTI_SESI'
            }
        });
    }
    console.log('Tenant ID:', tenant.id);

    // Admin User
    let adminUser = await prisma.user.findFirst({
      where: { tenant_id: tenant.id, Role: { name: 'ADMIN' } }
    });
    if (!adminUser) {
         adminUser = await prisma.user.findFirst({
             where: { tenant_id: tenant.id, Role: { name: 'SUPERADMIN' } }
         });
    }
    if (!adminUser) throw new Error('No admin/superadmin user found');

    // Plan & Subscription
    let plan = await prisma.plan.findFirst();
    if (!plan) {
        console.log('Creating Plan...');
        plan = await prisma.plan.create({
            data: {
                name: 'Basic Plan',
                price_monthly: 100000,
                max_user: 100,
                features: 'basic',
                absensi_mode: 'MULTI_SESI'
            }
        });
    }

    let subscription = await prisma.subscription.findFirst({ 
        where: { 
            tenant_id: tenant.id, 
            status: 'ACTIVE',
            end_date: { gt: new Date() }
        } 
    });
    
    if (!subscription) {
        console.log('Creating Subscription...');
        subscription = await prisma.subscription.create({
            data: {
                tenant_id: tenant.id,
                plan_id: plan.id,
                start_date: new Date(),
                end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                status: 'ACTIVE'
            }
        });
    }

    // Tahun Pelajaran
    let tahunPelajaran = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenant.id, is_active: true } });
    if (!tahunPelajaran) {
        console.log('Creating Tahun Pelajaran...');
        tahunPelajaran = await prisma.tahunPelajaran.create({
            data: {
                tenant_id: tenant.id,
                tahun: '2024/2025',
                is_active: true
            }
        });
    }

    // Semester
    let semester = await prisma.semester.findFirst({ where: { tenant_id: tenant.id, is_active: true } });
    if (!semester) {
        console.log('Creating Semester...');
        semester = await prisma.semester.create({
            data: {
                tenant_id: tenant.id,
                tahun_pelajaran_id: tahunPelajaran.id,
                nama_semester: 'Ganjil',
                is_active: true
            }
        });
    }

    // Jurusan
    let jurusan = await prisma.jurusan.findFirst({ where: { tenant_id: tenant.id } });
    if (!jurusan) {
        console.log('Creating Jurusan...');
        jurusan = await prisma.jurusan.create({
            data: {
                tenant_id: tenant.id,
                nama: 'Umum',
                kode: 'UM'
            }
        });
    }

    // Kelas
    let kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenant.id } });
    if (!kelas) {
        console.log('Creating Kelas...');
        kelas = await prisma.kelas.create({
            data: {
                tenant_id: tenant.id,
                nama_kelas: 'X-1',
                tingkat: 10,
                jurusan_id: jurusan.id
            }
        });
    }

    // Guru
    let guru = await prisma.guru.findFirst({ where: { tenant_id: tenant.id } });
    if (!guru) {
        console.log('Creating Guru...');
        // Create User for Guru first
        const randomStr = Math.random().toString(36).substring(7);
        const guruUser = await prisma.user.create({
            data: {
                tenant_id: tenant.id,
                email: `guru_${randomStr}@test.com`,
                password: 'password123',
                full_name: 'Guru Test',
                role_id: adminUser.role_id, // Reuse role for simplicity or find GURU role
                status: 'ACTIVE'
            }
        });

        guru = await prisma.guru.create({
            data: {
                tenant_id: tenant.id,
                user_id: guruUser.id,
                nama_guru: 'Guru Test',
                nip: '123456'
            }
        });
    }

    // Mapel
    let mapel = await prisma.mapel.findFirst({ where: { tenant_id: tenant.id } });
    if (!mapel) {
        console.log('Creating Mapel...');
        mapel = await prisma.mapel.create({
            data: {
                tenant_id: tenant.id,
                nama_mapel: 'Matematika',
                kode_mapel: 'MTK'
            }
        });
    }

    console.log('✅ Reference data ready.');

    // Cleanup potential conflicts from previous runs
    await prisma.jadwalTemplate.deleteMany({
        where: {
            tenant_id: tenant.id,
            kelas_id: kelas.id,
            hari: 'SENIN',
            jam_mulai: '07:00'
        }
    });
    console.log('🧹 Cleaned up potential conflicts.');

    // 2. Generate Token
    const token = jwt.sign(
      { 
        userId: adminUser.id,
        roleName: 'ADMIN',
        tenantId: tenant.id
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const headers = { 
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenant.id
    };

    // 3. Test Create
    console.log('\n📝 Testing Create Jadwal Template...');
    const createPayload = {
        tahun_pelajaran_id: tahunPelajaran.id,
        semester_id: semester.id,
        kelas_id: kelas.id,
        guru_id: guru.id,
        mapel_id: mapel.id,
        jenis_kegiatan: 'KBM',
        hari: 'SENIN',
        jam_mulai: '07:00',
        jam_selesai: '08:00'
    };

    let createdId;
    try {
        const createRes = await axios.post(BASE_URL, createPayload, { headers });
        console.log('✅ Create successful:', createRes.data.success);
        createdId = createRes.data.data.id;
    } catch (e: any) {
        console.error('❌ Create failed:', e.response?.data || e.message);
    }

    if (createdId) {
        // 4. Test Get Detail
        console.log('\n🔍 Testing Get Detail...');
        try {
            const detailRes = await axios.get(`${BASE_URL}/${createdId}`, { headers });
            console.log('✅ Get Detail successful:', detailRes.data.data.id === createdId);
        } catch (e: any) {
             console.error('❌ Get Detail failed:', e.response?.data || e.message);
        }

        // 5. Test Update
        console.log('\n✏️ Testing Update Jadwal Template...');
        const updatePayload = {
            jam_selesai: '08:30'
        };
        try {
            const updateRes = await axios.put(`${BASE_URL}/${createdId}`, updatePayload, { headers });
            console.log('✅ Update successful:', updateRes.data.data.jam_selesai === '08:30');
        } catch (e: any) {
             console.error('❌ Update failed:', e.response?.data || e.message);
        }

        // 6. Test List (Admin)
        console.log('\n📋 Testing List (Admin)...');
        try {
            const listRes = await axios.get(BASE_URL, { 
                headers,
                params: {
                    kelas_id: kelas.id,
                    hari: 'SENIN'
                }
            });
            console.log('✅ List successful. Count:', listRes.data.data.length);
            const found = listRes.data.data.find((item: any) => item.id === createdId);
            console.log('✅ Created item found in list:', !!found);
        } catch (e: any) {
             console.error('❌ List failed:', e.response?.data || e.message);
        }

        // 7. Test Delete
        console.log('\n🗑️ Testing Delete Jadwal Template...');
        try {
            const deleteRes = await axios.delete(`${BASE_URL}/${createdId}`, { headers });
            console.log('✅ Delete successful:', deleteRes.data.success);
        } catch (e: any) {
             console.error('❌ Delete failed:', e.response?.data || e.message);
        }
        
        // Verify deletion
        try {
            await axios.get(`${BASE_URL}/${createdId}`, { headers });
            console.error('❌ Item still exists after delete');
        } catch (e: any) {
            if (e.response?.status === 404) {
                console.log('✅ Item correctly not found after delete');
            } else {
                console.error('❌ Unexpected error verifying delete:', e.message);
            }
        }
    }

  } catch (error: any) {
    console.error('❌ Fatal Error:', error.message);
    if (error.response) {
        console.error('Response Data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
