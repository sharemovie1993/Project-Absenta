import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();
const p = new PrismaClient();

try {
  // Find roles with 'gerbang' / 'gate' / 'petugas' in their name
  const roles = await p.$queryRaw`
    SELECT DISTINCT r.id, r.name as role_name, r.tenant_id
    FROM "Role" r
    WHERE lower(r.name) LIKE '%gerbang%' 
       OR lower(r.name) LIKE '%gate%' 
       OR lower(r.name) LIKE '%petugas%'
    LIMIT 20
  `;
  console.log('=== GATE ROLES ===');
  console.log(JSON.stringify(roles, null, 2));

  if (roles.length > 0) {
    const roleIds = roles.map(r => r.id);
    // Check their capabilities
    const caps = await p.$queryRaw`
      SELECT r.name as role_name, perm.id as capability_code
      FROM "Role" r
      LEFT JOIN "RolePermission" rp ON rp.role_id = r.id
      LEFT JOIN "Permission" perm ON perm.id = rp.permission_id
      WHERE r.id = ANY(${roleIds})
      ORDER BY r.name, perm.id
    `;
    console.log('\n=== CAPABILITIES FOR GATE ROLES ===');
    console.log(JSON.stringify(caps, null, 2));
  }

  // Also find users with those roles
  const users = await p.$queryRaw`
    SELECT u.email, u."roleName", r.name as role_name
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    WHERE lower(u."roleName") LIKE '%gerbang%'
       OR lower(u."roleName") LIKE '%gate%'
       OR lower(u."roleName") LIKE '%petugas%'
       OR lower(r.name) LIKE '%gerbang%'
       OR lower(r.name) LIKE '%gate%'
       OR lower(r.name) LIKE '%petugas%'
    LIMIT 10
  `;
  console.log('\n=== USERS WITH GATE-LIKE ROLES ===');
  console.log(JSON.stringify(users, null, 2));
} finally {
  await p.$disconnect();
}
