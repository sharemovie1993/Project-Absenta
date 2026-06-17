import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Web Push Notification...');

  // 1. Setup VAPID
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BOlOVdYypqAtw4v34doJpAD16bLVGgW1Meno0YRkWWPx5LSvWBNTJNuf37dmPdKqnCTdigoVBK4nWQ1Ss9w6zTA';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'u3NKkK1h2LC6alhcdvvD9eAgEisrF4c-YAA3zZh5m2w';

  webpush.setVapidDetails(
    'mailto:admin@absenta.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  console.log('VAPID Public Key:', vapidPublicKey);

  // 2. Get latest subscription
  // Use any cast because ParentPushSubscription might be new
  const prismaAny = prisma as any;
  const sub = await prismaAny.parentPushSubscription.findFirst({
    orderBy: { updated_at: 'desc' }
  });

  if (!sub) {
    console.error('❌ No subscriptions found in database. Frontend has not subscribed yet.');
    return;
  }

  console.log('Found subscription for OrangTua:', sub.orang_tua_id);
  console.log('Endpoint:', sub.endpoint);

  // 3. Send Notification
  const payload = JSON.stringify({
    title: 'Test Notifikasi Sistem',
    body: 'Ini adalah tes notifikasi dari backend saat aplikasi tertutup.',
    icon: '/parent/icons/logo.png'
  });

  try {
    const subscription = {
      endpoint: sub.endpoint,
      keys: sub.keys_json
    };

    await webpush.sendNotification(subscription, payload);
    console.log('✅ Push notification sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send push:', error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
