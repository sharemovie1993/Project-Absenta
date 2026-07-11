import { prisma } from '../utils/prisma';

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('TENANTS:', tenants);
  const years = await prisma.tahunPelajaran.findMany();
  console.log('YEARS:', years);
  const semesters = await prisma.semester.findMany();
  console.log('SEMESTERS:', semesters);
}

main().catch(console.error);
