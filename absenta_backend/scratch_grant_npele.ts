import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'neple@gmail.com';
  console.log(`Mencari user dengan email: ${email}`);

  const user = await prisma.user.findFirst({
    where: { email },
    include: { Role: true }
  });

  if (!user) {
    console.log(`User ${email} tidak ditemukan di database.`);
    return;
  }

  console.log(`User ditemukan! ID: ${user.id}, Role: ${user.Role?.name}, Tenant ID: ${user.tenant_id}`);
  
  const roleId = user.role_id;

  // Ambil semua permission terkait cooperative dan support dari tabel Permission
  const availablePerms = await prisma.permission.findMany({
    where: {
      OR: [
        { id: { startsWith: 'cooperative.' } },
        { id: { startsWith: 'support.' } }
      ]
    }
  });
  
  const permIds = availablePerms.map(p => p.id);
  console.log(`Ditemukan ${permIds.length} kapabilitas (support & cooperative) di sistem.`);

  let added = 0;
  for (const pId of permIds) {
    try {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: roleId,
            permission_id: pId
          }
        },
        update: {},
        create: {
          role_id: roleId,
          permission_id: pId
        }
      });
      added++;
    } catch (e: any) {
      console.error(`Gagal menambahkan ${pId}:`, e.message);
    }
  }
  
  console.log(`Berhasil memberikan ${added} kapabilitas kepada Role ${user.Role?.name} milik ${email}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());