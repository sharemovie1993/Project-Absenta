import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
console.log('Available models in Prisma Client:');
console.log(Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$')));
process.exit(0);
