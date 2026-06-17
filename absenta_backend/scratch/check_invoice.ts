
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.invoice.findUnique({ 
  where: { id: 'e03956fe-99d4-4388-88d7-89d10bbda05b' }, 
  select: { status: true, paid_at: true, pdf_generated_at: true } 
}).then(r => console.log(JSON.stringify(r))).finally(() => p.$disconnect());
