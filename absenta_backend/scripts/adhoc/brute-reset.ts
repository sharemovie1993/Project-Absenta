import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔥 BRUTE FORCE SCHEMA CLEANING START...');
  
  try {
    // Drop and Recreate Schema public (Executed separately to avoid multi-command error)
    await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
    console.log('✅ Schema public dropped.');
    
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    console.log('✅ Schema public recreated.');
    
    // Grant permissions back (standard for postgres)
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO postgres');
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Permissions restored!');
    
  } catch (error) {
    console.error('❌ Error during cleaning:', error);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
