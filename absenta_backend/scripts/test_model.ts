import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.organizationalPosition.findMany({ take: 3 })
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error('ERROR:', e.message))
  .finally(() => p.$disconnect());
