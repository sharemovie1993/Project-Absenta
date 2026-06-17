import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { FcmService } from '../../src/modules/notification/services/fcm.service';

dotenv.config();

const prisma = new PrismaClient() as any;
const fcm = new FcmService();

async function main() {
  console.log('Testing FCM Push Notification...');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not set. Please set .env and retry.');
    return;
  }
  const token = await prisma.$queryRaw`SELECT token, orang_tua_id FROM "ParentFcmToken" ORDER BY updated_at DESC LIMIT 1`;
  if (!token) {
    console.error('❌ No ParentFcmToken found. Register via parent app native first.');
    return;
  }
  const row: any = Array.isArray(token) ? token[0] : token;
  if (!row || !row.token) {
    console.error('❌ No token row found. Register via parent app native first.');
    return;
  }
  console.log('Found FCM token for OrangTua:', row?.orang_tua_id);
  const ok = await fcm.sendToToken(
    row.token,
    'Tes Notifikasi Absenta',
    'Ini adalah tes notifikasi native (FCM).',
    { scope: 'PARENT_APP', eventType: 'TEST' }
  );
  console.log(ok ? '✅ FCM push sent!' : '❌ FCM push failed');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
