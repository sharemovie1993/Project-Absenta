import { PrismaClient } from '../node_modules/.prisma/client';
import { organizationalAuthorizationEngine } from '../src/modules/auth/services/organizational-authorization.engine';

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFIKASI ORGANIZATIONAL DATA SCOPE TATI KARYATI ===");

  const tatiUser = await prisma.user.findFirst({
    where: { email: { contains: 'tati', mode: 'insensitive' } },
    include: { Guru: true }
  });

  if (!tatiUser) throw new Error("Tati User tidak ditemukan");

  console.log("User ID:", tatiUser.id, "Email:", tatiUser.email, "Guru ID:", tatiUser.Guru?.id);

  // Check Organizational Assignments
  const assignments = await prisma.organizationalAssignment.findMany({
    where: { user_id: tatiUser.id }
  });
  console.log(`Organizational Assignments count for Tati: ${assignments.length}`);
  assignments.forEach(a => console.log("   Assignment:", a));

  // Resolve Data Scope via engine
  const dataScope = await organizationalAuthorizationEngine.resolveDataScope(tatiUser.id);
  console.log("Resolved Data Scope:", JSON.stringify(dataScope, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
