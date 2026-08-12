import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI SCHEMA MODEL FIELD ===");

  // Let's create dummy objects or check prisma dmmf if available
  const dmmf = (prisma as any)._dmmf?.datamodel?.models || [];
  
  const targetModels = [
    'AbsenGerbangSiswa', 'SesiAbsensi', 'AbsenSiswa', 'PermohonanIzinSiswa',
    'JurnalWaliKelas', 'PrestasiSiswa', 'PelanggaranSiswa', 'KasusBK', 'EwsSnapshot'
  ];

  for (const m of dmmf) {
    if (targetModels.includes(m.name)) {
      console.log(`\n--- MODEL ${m.name} ---`);
      m.fields.forEach((f: any) => {
        if (!f.isRelationOwner) {
          console.log(`  ${f.name}: ${f.type} ${f.isRequired ? '(Required)' : '(Optional)'}`);
        }
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
