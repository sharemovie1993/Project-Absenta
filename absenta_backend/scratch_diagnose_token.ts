import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

async function main() {
  console.log('🔍 [DIAGNOSE] Memulai pemeriksaan token Superadmin...');
  
  const user = await prisma.user.findFirst({
    where: { email: 'superadmin@system.com' },
    include: {
      Role: true
    }
  });

  if (!user) {
    console.error('❌ User superadmin@system.com tidak ditemukan di database.');
    return;
  }

  console.log('👤 User ditemukan:', {
    id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    role: (user as any).Role ? { id: (user as any).Role.id, name: (user as any).Role.name } : null
  });

  // Buat simulasi token payload seperti di auth.controller.ts
  const tokenPayload = {
    id: user.id,
    email: user.email,
    tenantId: user.tenant_id,
    roleId: (user as any).Role?.id,
    roleName: (user as any).Role?.name,
    exp: Math.floor(Date.now() / 1000) + (15 * 60),
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET);
  console.log('🔑 Token berhasil dibuat:', token);

  const decoded: any = jwt.verify(token, JWT_SECRET);
  console.log('🎯 Payload Token Ter-decode:', decoded);

  console.log('✅ Selesai.');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
