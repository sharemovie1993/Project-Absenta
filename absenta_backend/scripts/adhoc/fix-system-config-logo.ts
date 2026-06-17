import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing system config logo/favicon URLs...');
  
  const globalConfig = await prisma.systemConfig.findFirst({ where: { tenant_id: null } });
  
  if (globalConfig) {
    console.log('Found global config:', globalConfig.id);
    console.log('Current Logo:', globalConfig.logo_url);
    console.log('Current Favicon:', globalConfig.favicon_url);

    if (globalConfig.logo_url?.includes('drive.google.com') || globalConfig.favicon_url?.includes('drive.google.com')) {
        await prisma.systemConfig.update({
            where: { id: globalConfig.id },
            data: {
                logo_url: null,
                favicon_url: null
            }
        });
        console.log('✅ Removed Google Drive links from global config.');
    } else {
        console.log('No Google Drive links found in global config.');
    }
  } else {
    console.log('Global config not found.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
