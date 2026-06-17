const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const p = new PrismaClient();

async function run() {
  // find roles with gate-related names
  const roles = await p.$queryRawUnsafe(
    `SELECT DISTINCT r.id, r.name as role_name FROM "Role" r WHERE lower(r.name) LIKE '%gerbang%' OR lower(r.name) LIKE '%gate%' OR lower(r.name) LIKE '%petugas%' LIMIT 20`
  );
  console.log('=== GATE ROLES ===', JSON.stringify(roles, null, 2));

  if (roles.length > 0) {
    const ids = roles.map(r => `'${r.id}'`).join(',');
    const caps = await p.$queryRawUnsafe(
      `SELECT r.name as role_name, perm.id as capability_code FROM "Role" r LEFT JOIN "RolePermission" rp ON rp.role_id = r.id LEFT JOIN "Permission" perm ON perm.id = rp.permission_id WHERE r.id IN (${ids}) ORDER BY r.name, perm.id NULLS LAST`
    );
    console.log('=== CAPABILITIES ===', JSON.stringify(caps, null, 2));
  }

  // find users with gate role
  const users = await p.$queryRawUnsafe(
    `SELECT u.email, u."roleName", r.name as role_name FROM "User" u LEFT JOIN "Role" r ON r.id = u."roleId" WHERE lower(r.name) LIKE '%gerbang%' OR lower(r.name) LIKE '%gate%' OR lower(r.name) LIKE '%petugas%' LIMIT 10`
  );
  console.log('=== GATE USERS ===', JSON.stringify(users, null, 2));
}

run().catch(console.error).finally(() => p.$disconnect());
