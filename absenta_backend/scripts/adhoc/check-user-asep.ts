
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Searching for user "Asep"...');
  const users = await prisma.user.findMany({
    where: {
      full_name: {
        contains: 'Asep',
        mode: 'insensitive'
      }
    },
    include: {
      Role: true,
      Guru: {
        include: {
            GuruStrukturOrganisasi: {
                include: {
                    StrukturOrganisasi: true
                }
            }
        }
      }
    }
  });

  if (users.length === 0) {
    console.log('❌ No user found with name containing "Asep"');
  } else {
    console.log(`✅ Found ${users.length} users:`);
    for (const user of users) {
      console.log('------------------------------------------------');
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.full_name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role ID: ${user.role_id}`);
      console.log(`Role Name: ${user.Role?.name}`);
      console.log(`Role Permissions: ${user.Role?.permissions}`);
      console.log(`Verification Token: ${user.verification_token}`); // Sometimes used for weird hacks
      
      if (user.Guru) {
          console.log(`Guru Profile Found (ID: ${user.Guru.id})`);
          if (user.Guru.GuruStrukturOrganisasi && user.Guru.GuruStrukturOrganisasi.length > 0) {
              console.log('Assignments (StrukturOrganisasi):');
              user.Guru.GuruStrukturOrganisasi.forEach(gso => {
                  console.log(` - ${gso.StrukturOrganisasi.nama} (Kode: ${gso.StrukturOrganisasi.kode}, Active: ${gso.is_active})`);
              });
          } else {
              console.log('No StrukturOrganisasi assignments found.');
          }
      } else {
          console.log('No Guru profile found.');
      }
    }
    console.log('------------------------------------------------');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
