import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.permission.findMany({ select: { id: true } })
  .then(r => console.log(JSON.stringify(r.map(p => p.id), null, 2)))
  .finally(() => p.$disconnect());
