import { prisma } from '../utils/prisma';

async function main() {
  try {
    const tunnels = await prisma.easyTunnel.findMany({
      select: { slug: true, status: true }
    });
    const result: Record<string, string> = {};
    for (const t of tunnels) {
      result[t.slug] = t.status;
    }
    console.log(JSON.stringify(result));
  } catch (e: any) {
    console.error(JSON.stringify({ error: e.message }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
