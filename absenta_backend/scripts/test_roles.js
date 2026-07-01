const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.role.findMany().then(r => {
  console.log(r);
  p.$disconnect();
}).catch(err => {
  console.error(err);
  p.$disconnect();
});
