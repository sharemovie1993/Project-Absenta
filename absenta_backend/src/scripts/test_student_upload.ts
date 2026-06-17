import { PrismaClient } from '@prisma/client';
import { googleDriveService } from '../modules/hubin/services/google-drive.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🤖 --- TESTING REAL GOOGLE APPS SCRIPT RELAY (ANYONE MODE) ---');

  // Find yusri@siswa.com in the database
  const user = await prisma.user.findFirst({
    where: { email: 'yusri@siswa.com' },
    include: { Siswa: true }
  });

  if (!user) {
    console.error('❌ Error: User yusri@siswa.com not found.');
    process.exit(1);
  }

  // Test File Upload to Google Drive Relay directly
  const dummyImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log('📤 Sending file buffer to Google Apps Script (with Subfolder: "XI TKJ 1")...');
  const fileUrl = await googleDriveService.uploadToDrive(
    user.tenant_id,
    dummyImageBuffer,
    'bukti_test_v1.2.png',
    'image/png',
    'XI TKJ 1'
  );

  console.log('🎉 --- UPLOAD RESULT ---');
  console.log(`🔗 Returned URL: ${fileUrl}`);

  if (fileUrl && !fileUrl.includes('1_gdrive_')) {
    console.log('✅ SUCCESS! It returned a real, active Google Drive URL!');
    
    // Test Delete
    console.log('\n🗑️ --- TESTING DELETE PERMANENT ---');
    console.log(`Attempting to delete: ${fileUrl}`);
    const deleteSuccess = await googleDriveService.deleteFromDrive(user.tenant_id, fileUrl);
    
    if (deleteSuccess) {
      console.log('✅ SUCCESS! File reported as deleted from Google Drive.');
    } else {
      console.error('❌ FAIL: Delete operation returned false.');
    }
  } else {
    console.error('❌ FAIL: Still returned a simulated URL or failed. Check the logs.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
