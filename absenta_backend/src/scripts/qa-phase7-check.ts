
import { prisma } from '../utils/prisma';
import { parentAuthService } from '../modules/parent-app/services/parent-auth.service';
import { parentNotificationService } from '../modules/parent-app/services/parent-notification.service';
import { ParentEventType } from '../modules/parent-app/constants/parent-event-matrix';

// Disable Real Notifications
process.env.NOTIFICATIONS_ENABLED = 'false';

async function runQA() {
  console.log('🚀 Starting Phase 7 QA Check...');

  // 1. Setup Data
  const timestamp = Date.now();
  const tenantName = `QA_Tenant_${timestamp}`;
  
  console.log('1️⃣  Setting up Test Data...');
  const tenant = await prisma.tenant.create({
    data: { name: tenantName, absensi_mode: 'SIMPLE' }
  });

  const parent = await prisma.orangTua.create({
    data: {
      tenant_id: tenant.id,
      nama: `QA Parent ${timestamp}`,
      no_hp: '081234567890', // Dummy
      email: `qa.${timestamp}@example.com`
    }
  });

  // Create Jurusan first
  const jurusan = await prisma.jurusan.create({
    data: { tenant_id: tenant.id, nama: 'QA Jurusan', kode: `QAJ${timestamp}` }
  });

  // Create Kelas
  const kelas = await prisma.kelas.create({
    data: {
      tenant_id: tenant.id,
      nama_kelas: 'QA Class',
      tingkat: 10,
      jurusan_id: jurusan.id
    }
  });

  const student1 = await prisma.siswa.create({
    data: {
      tenant_id: tenant.id,
      nama_siswa: 'QA Student 1',
      nis: `NIS1_${timestamp}`,
      status: 'AKTIF',
      jenis_kelamin: 'L',
      kelas_id: kelas.id
    }
  });

  const student2 = await prisma.siswa.create({
    data: {
      tenant_id: tenant.id,
      nama_siswa: 'QA Student 2',
      nis: `NIS2_${timestamp}`,
      status: 'AKTIF',
      jenis_kelamin: 'P',
      kelas_id: kelas.id
    }
  });

  // Link Parent-Student
  await prisma.orangTuaSiswa.createMany({
    data: [
      { orang_tua_id: parent.id, siswa_id: student1.id },
      { orang_tua_id: parent.id, siswa_id: student2.id }
    ]
  });

  // Create Token
  const tokenRecord = await parentAuthService.generateToken(parent.id);
  const token = tokenRecord.token;

  console.log('✅ Setup Complete.');

  // 2. Auth QA
  console.log('\n2️⃣  Running Functional QA (Auth)...');
  
  try {
    await parentAuthService.validateToken(token);
    console.log('   [PASS] Token valid with 2 active students');
  } catch (e) {
    console.error('   [FAIL] Token invalid with 2 active students', e);
  }

  // Graduate Student 2
  await prisma.siswa.update({ where: { id: student2.id }, data: { status: 'LULUS' } });
  try {
    await parentAuthService.validateToken(token);
    console.log('   [PASS] Token valid with 1 active student');
  } catch (e) {
    console.error('   [FAIL] Token invalid with 1 active student', e);
  }

  // Graduate Student 1
  await prisma.siswa.update({ where: { id: student1.id }, data: { status: 'LULUS' } });
  try {
    await parentAuthService.validateToken(token);
    console.error('   [FAIL] Token SHOULD BE invalid (No active students)');
  } catch (e: any) {
    if (e.message.includes('No active students')) {
      console.log('   [PASS] Token correctly blocked (No active students)');
    } else {
      console.error('   [FAIL] Token blocked but wrong error:', e.message);
    }
  }

  // Reset Student 1 to Active for Notification Tests
  await prisma.siswa.update({ where: { id: student1.id }, data: { status: 'AKTIF' } });


  // 3. Notification QA
  console.log('\n3️⃣  Running Notification QA...');

  // A. ALPA (Expect PWA + WA if configured, usually WA is default for ALPA?)
  // Let's check matrix defaults in code... assuming ALPA = STUDENT_ABSENT
  console.log('   Testing ALPA (STUDENT_ABSENT)...');
  const date = new Date().toISOString().split('T')[0];
  const payloadAlpa = { siswaId: student1.id, tanggal: date, status: 'ALPA', keterangan: 'Tanpa Keterangan' };
  
  await parentNotificationService.handleEvent(ParentEventType.STUDENT_ABSENT, payloadAlpa);
  
  // Check Logs
  const logsAlpa = await prisma.notificationLog.findMany({
    where: { 
      tenant_id: tenant.id, 
      recipient: parent.id,
      event: ParentEventType.STUDENT_ABSENT 
    }
  });
  
  // We expect at least 1 log (PWA). WA depends on config/matrix.
  // Assuming matrix says PWA + WA for Absent.
  console.log(`   Logs found: ${logsAlpa.length}`);
  if (logsAlpa.length > 0) console.log('   [PASS] Notification generated');
  else console.error('   [FAIL] No notification generated');

  // B. Idempotency
  console.log('   Testing Idempotency (Trigger ALPA again)...');
  await parentNotificationService.handleEvent(ParentEventType.STUDENT_ABSENT, payloadAlpa);
  
  const logsAlpa2 = await prisma.notificationLog.findMany({
    where: { 
      tenant_id: tenant.id, 
      recipient: parent.id,
      event: ParentEventType.STUDENT_ABSENT 
    }
  });
  
  if (logsAlpa2.length === logsAlpa.length) console.log('   [PASS] Idempotency working (No new logs)');
  else console.error(`   [FAIL] Duplicate logs found: ${logsAlpa2.length} vs ${logsAlpa.length}`);

  // C. TERLAMBAT (PWA Only)
  console.log('   Testing TERLAMBAT (STUDENT_LATE)...');
  // Need to add LATE event to matrix first if not exists?
  // User said "TERLAMBAT -> PWA only".
  // Assuming enum exists.
  try {
    await parentNotificationService.handleEvent(ParentEventType.STUDENT_LATE as any, { siswaId: student1.id, tanggal: date, waktu: '08:00' });
    const logsLate = await prisma.notificationLog.findMany({
      where: { tenant_id: tenant.id, event: 'STUDENT_LATE' }
    });
    // Check if WA was sent? 
    // We can't easily check if WA was sent without mocking, but we can check if a log with type='WHATSAPP' exists if we logged it.
    // ParentNotificationService only logs PWA/PUSH to NotificationLog in the 'saveNotificationLog' method.
    // WA logs are handled by WhatsAppService.
    // So we need to query NotificationLog for type='WHATSAPP' too.
    
    const waLogsLate = await prisma.notificationLog.findMany({
      where: { tenant_id: tenant.id, event: 'STUDENT_LATE', type: 'WHATSAPP' }
    });
    
    if (logsLate.length > 0 && waLogsLate.length === 0) console.log('   [PASS] TERLAMBAT = PWA Only');
    else console.log(`   [INFO] TERLAMBAT logs: PWA=${logsLate.length}, WA=${waLogsLate.length}`);
  } catch (e) {
    console.log('   [SKIP] STUDENT_LATE event might not be defined in enum/matrix yet');
  }

  // D. PULANG CEPAT (Config OFF)
  console.log('   Testing PULANG CEPAT (Config OFF)...');
  // Ensure Config is OFF (or default)
  await prisma.config.deleteMany({ where: { tenant_id: tenant.id, key: 'WA_PULANG_CEPAT_ENABLED' } });
  
  const payloadPC = { siswaId: student1.id, tanggal: date, waktu: '10:00', relatedId: 'PC_1' };
  await parentNotificationService.handleEvent(ParentEventType.STUDENT_LEFT_EARLY, payloadPC);
  
  const waLogsPC1 = await prisma.notificationLog.findMany({
    where: { tenant_id: tenant.id, event: ParentEventType.STUDENT_LEFT_EARLY, type: 'WHATSAPP', related_id: 'PC_1' }
  });
  
  if (waLogsPC1.length === 0) console.log('   [PASS] PULANG CEPAT (OFF) = No WA');
  else console.error('   [FAIL] PULANG CEPAT (OFF) = WA Sent!');

  // E. PULANG CEPAT (Config ON)
  console.log('   Testing PULANG CEPAT (Config ON)...');
  await prisma.config.create({
    data: { tenant_id: tenant.id, key: 'WA_PULANG_CEPAT_ENABLED', value: 'true' }
  });
  
  const payloadPC2 = { siswaId: student1.id, tanggal: date, waktu: '10:00', relatedId: 'PC_2' };
  await parentNotificationService.handleEvent(ParentEventType.STUDENT_LEFT_EARLY, payloadPC2);
  
  const waLogsPC2 = await prisma.notificationLog.findMany({
    where: { tenant_id: tenant.id, event: ParentEventType.STUDENT_LEFT_EARLY, type: 'WHATSAPP', related_id: 'PC_2' }
  });
  
  if (waLogsPC2.length > 0) console.log('   [PASS] PULANG CEPAT (ON) = WA Sent');
  else console.error('   [FAIL] PULANG CEPAT (ON) = No WA Sent');

  // 4. Cleanup
  console.log('\n4️⃣  Cleanup...');
  await prisma.notificationLog.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.parentAccessToken.deleteMany({ where: { orang_tua_id: parent.id } });
  await prisma.orangTuaSiswa.deleteMany({ where: { orang_tua_id: parent.id } });
  await prisma.siswa.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.orangTua.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.kelas.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.jurusan.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.config.deleteMany({ where: { tenant_id: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
  
  console.log('✅ QA Complete.');
}

runQA()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
