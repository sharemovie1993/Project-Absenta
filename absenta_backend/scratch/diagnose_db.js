const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection to database...');
  const userCount = await prisma.user.count();
  console.log(`Connection successful. Total users: ${userCount}`);

  console.log('Checking NotificationPreference table...');
  try {
    const prefCount = await prisma.notificationPreference.count();
    console.log(`NotificationPreference count: ${prefCount}`);
    
    const sample = await prisma.notificationPreference.findFirst();
    console.log('Sample notification preference:', sample);
  } catch (err) {
    console.error('Error querying NotificationPreference:', err);
  }

  console.log('Checking SystemConfig table...');
  try {
    const configCount = await prisma.systemConfig.count();
    console.log(`SystemConfig count: ${configCount}`);
    const sampleCfg = await prisma.systemConfig.findFirst();
    console.log('Sample system config:', sampleCfg);
  } catch (err) {
    console.error('Error querying SystemConfig:', err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
