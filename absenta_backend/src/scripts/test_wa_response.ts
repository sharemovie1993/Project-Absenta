import { prisma } from '../utils/prisma';
import { handleGuruCommand } from '../modules/whatsapp/services/wa-chatbot-commands';

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const guru = await prisma.guru.findFirst({
    where: { tenant_id: tenantId, nama_guru: { contains: 'HIMAL' } }
  });

  if (!guru) {
    console.log('Guru not found!');
    return;
  }

  console.log('--- TESTING CHATBOT MENU [4] FOR GURU ---');
  const res = await handleGuruCommand('4', guru);
  console.log(res);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
