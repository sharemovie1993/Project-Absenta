import Fastify from 'fastify';
import { prisma } from './src/utils/prisma';
import { registerPlugins, registerMiddlewares } from './src/infra/bootstrap';
import { registerRoutes } from './src/infra/router';

async function build() {
  const fastify = Fastify({
    logger: false
  });

  fastify.decorate('prisma', prisma);

  const appendLog = () => {};

  // Mock redis config if needed or ensure environment is set
  // Assuming registerPlugins handles it gracefully
  
  await registerPlugins(fastify);
  await registerMiddlewares(fastify, appendLog);
  await registerRoutes(fastify, prisma);

  return fastify;
}

async function runAudit() {
  console.log('--- STARTING AUDIT (SA-IS) ---');
  let app: any = null;
  const report: any[] = [];

  try {
    app = await build();
    await app.ready();

    // --- SETUP ---
    console.log('1. Setting up Test Data...');
    // Find Parent A (Asep)
    const parentA = await prisma.orangTua.findFirst({
      where: { nama: { contains: 'Asep', mode: 'insensitive' } },
      include: { OrangTuaSiswa: { include: { Siswa: true } } }
    });

    if (!parentA || parentA.OrangTuaSiswa.length === 0) {
      throw new Error('Parent Asep not found or has no students');
    }
    const studentA = parentA.OrangTuaSiswa[0].Siswa;

    // Find Parent B (Someone else)
    let parentB: any = await prisma.orangTua.findFirst({
      where: { 
        id: { not: parentA.id },
        OrangTuaSiswa: { some: {} } 
      },
      include: { OrangTuaSiswa: { include: { Siswa: true } } }
    });
    
    let createdDummyB = false;
    let studentB: any = null;

    if (!parentB) {
       console.log('   Creating Dummy Parent B for IDOR test...');
       createdDummyB = true;
       // Create dummy parent and student
       const dummyTenantId = parentA.tenant_id;
       const dummyClass = await prisma.kelas.findFirst({ where: { tenant_id: dummyTenantId } });
       
       if (!dummyClass) throw new Error('No class found to create dummy student');

       parentB = await prisma.orangTua.create({
         data: {
           tenant_id: dummyTenantId,
           nama: 'DUMMY PARENT B',
           email: 'dummyb@example.com'
         }
       });

       const newStudent = await prisma.siswa.create({
         data: {
            tenant_id: dummyTenantId,
            nama_siswa: 'DUMMY STUDENT B',
            nis: 'DUMMY_NIS_' + Date.now(),
            jenis_kelamin: 'L',
            kelas_id: dummyClass.id
         }
       });

       await prisma.orangTuaSiswa.create({
          data: {
            orang_tua_id: parentB.id,
            siswa_id: newStudent.id
          }
       });
       
       studentB = newStudent;
    } else {
       studentB = parentB.OrangTuaSiswa[0].Siswa;
    }

    console.log(`   Parent A: ${parentA.nama} (Child: ${studentA?.nama_siswa})`);
    console.log(`   Parent B: ${parentB?.nama} (Child: ${studentB?.nama_siswa})`);

    // Ensure Token for A
    const tokenString = 'AUDIT_TEST_TOKEN_' + Date.now();
    await prisma.parentAccessToken.create({
      data: {
        token: tokenString,
        orang_tua_id: parentA.id,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        is_active: true
      }
    });

    // --- TEST 2: TOKEN & ACCESS CONTROL ---
    console.log('\n2. Testing Token & Access Control...');
    
    // 2.1 No Token
    const resNoToken = await app.inject({
      method: 'GET',
      url: '/api/parent-app/me'
    });
    console.log(`   [2.1] Access without token: ${resNoToken.statusCode} (Expected 401)`);
    report.push({ area: 'Token', test: 'No Token', status: resNoToken.statusCode === 401 ? 'PASS' : 'FAIL' });

    // 2.2 Invalid Token
    const resInvalidToken = await app.inject({
      method: 'GET',
      url: '/api/parent-app/me',
      headers: { Authorization: 'Bearer INVALID_TOKEN' }
    });
    console.log(`   [2.2] Access with invalid token: ${resInvalidToken.statusCode} (Expected 401)`);
    report.push({ area: 'Token', test: 'Invalid Token', status: resInvalidToken.statusCode === 401 ? 'PASS' : 'FAIL' });

    // 2.3 Valid Token
    const resValidToken = await app.inject({
      method: 'GET',
      url: '/api/parent-app/me',
      headers: { Authorization: `Bearer ${tokenString}` }
    });
    console.log(`   [2.3] Access with valid token: ${resValidToken.statusCode} (Expected 200)`);
    report.push({ area: 'Token', test: 'Valid Token', status: resValidToken.statusCode === 200 ? 'PASS' : 'FAIL' });

    // --- TEST 3: IDOR ---
    console.log('\n3. Testing IDOR (Accessing Other Student)...');
    
    const resIDOR = await app.inject({
      method: 'GET',
      url: `/api/parent-app/siswa/${studentB?.id}/riwayat-kehadiran`,
      headers: { Authorization: `Bearer ${tokenString}` }
    });
    console.log(`   [3.1] Parent A accessing Student B: ${resIDOR.statusCode} (Expected 403)`);
    report.push({ area: 'IDOR', test: 'Cross-Parent Access', status: resIDOR.statusCode === 403 ? 'PASS' : 'FAIL' });

    // --- TEST 5: DATA EXPOSURE ---
    console.log('\n5. Testing Data Exposure...');
    if (resValidToken.statusCode === 200) {
      const data = resValidToken.json().data;
      const exposedKeys = Object.keys(data.orang_tua);
      console.log(`   [5.1] Exposed Parent Keys: ${exposedKeys.join(', ')}`);
      // Check for sensitive data (password, salt, etc.)
      const sensitive = ['password', 'salt', 'hash', 'otp'];
      const hasSensitive = sensitive.some(k => exposedKeys.includes(k));
      report.push({ area: 'Data Exposure', test: '/me Sensitive Data', status: !hasSensitive ? 'PASS' : 'FAIL' });
    }

    // --- TEST 7: HERO STATUS LOGIC (ALPA vs Waktu Masuk) ---
    console.log('\n7. Testing Hero Status Logic (ALPA vs Waktu Masuk)...');
    
    if (studentA) {
      // Setup: Create 'ALPA' gate record for today
      // First, clean up today's records for this student
      const today = new Date();
      const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(today); endOfDay.setHours(23,59,59,999);
      
      await prisma.absenGerbangSiswa.deleteMany({
        where: {
          siswa_id: studentA.id,
          waktu_tap: { gte: startOfDay, lte: endOfDay }
        }
      });

      // Find Sekolah
      const sekolah = await prisma.sekolah.findFirst({
        where: { tenant_id: parentA.tenant_id }
      });
      
      if (!sekolah) {
         console.log('   [SKIPPING 7.1] No Sekolah found for tenant, cannot create SesiGerbang');
      } else {
        // Create SesiGerbang
        const sesiGerbang = await prisma.sesiGerbang.create({
            data: {
                tenant_id: parentA.tenant_id,
                sekolah_id: sekolah.id,
                tanggal: new Date(),
                waktu_mulai: new Date(),
                jenis_kegiatan: 'GERBANG',
                status: 'BERLANGSUNG'
            }
        });

        // Insert ALPA record with a timestamp (simulating system auto-close or manual entry)
        await prisma.absenGerbangSiswa.create({
            data: {
                tenant_id: parentA.tenant_id,
                sesi_gerbang_id: sesiGerbang.id,
                siswa_id: studentA.id,
                waktu_tap: new Date(), // Has timestamp!
                arah: 'MASUK', 
                status: 'ALPA'
            }
        });

        // Fetch Dashboard
        const resHero = await app.inject({
            method: 'GET',
            url: '/api/parent-app/me',
            headers: { Authorization: `Bearer ${tokenString}` }
        });
        
        const heroData = resHero.json().data.siswa.find((s: any) => s.siswa_id === studentA.id);
        console.log('   [7.1] Hero Data for ALPA student:', heroData?.status_kehadiran_hari_ini);
        
        if (heroData) {
            const status = heroData.status_kehadiran_hari_ini;
            // If ALPA is returned, waktu_masuk MUST be null. If it has value, it's inconsistent.
            // Wait, if I manually set ALPA but provided waktu_tap, the logic might return ALPA but with waktu_masuk.
            // This is what we want to audit.
            
            const fail = status.status === 'ALPA' && status.waktu_masuk !== null;
            
            console.log(`   [7.1] Status: ${status.status}, Waktu Masuk: ${status.waktu_masuk}`);
            report.push({ area: 'Logic', test: 'ALPA vs Waktu Masuk', status: !fail ? 'PASS' : 'FAIL' });
        }

        // Clean up
        await prisma.absenGerbangSiswa.deleteMany({
            where: {
            siswa_id: studentA.id,
            waktu_tap: { gte: startOfDay, lte: endOfDay }
            }
        });
        await prisma.sesiGerbang.delete({ where: { id: sesiGerbang.id } });
      }
    }

    // --- REPORT SUMMARY ---
    console.log('\n--- AUDIT SUMMARY ---');
    console.table(report);

    // Clean up Dummy B if created
    if (createdDummyB && parentB && studentB) {
        console.log('   Cleaning up Dummy Parent B...');
        await prisma.orangTuaSiswa.deleteMany({ where: { orang_tua_id: parentB.id } });
        await prisma.siswa.delete({ where: { id: studentB.id } });
        await prisma.orangTua.delete({ where: { id: parentB.id } });
    }

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
  }
}

runAudit();
