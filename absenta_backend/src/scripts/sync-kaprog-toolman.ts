import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const REAL_PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function syncAllKaprogToolman() {
  console.log('🚀 [SINKRONISASI TOTAL KAPROG, TOOLMAN, KABENG KE TENANT DEMO]...\n');

  // 1. Ambil Jurusan di Prod dan di Demo
  const prodJurusans = await prisma.jurusan.findMany({ where: { tenant_id: REAL_PROD_ID } });
  const demoJurusans = await prisma.jurusan.findMany({ where: { tenant_id: DEMO_ID } });

  console.log(`Jurusan Prod: ${prodJurusans.length}, Jurusan Demo: ${demoJurusans.length}`);

  // Buat mapping Jurusan Prod -> Jurusan Demo berdasarkan nama/kode/singkatan
  const jurusanMap: Record<string, string> = {};
  for (const pj of prodJurusans) {
    const dj = demoJurusans.find(d => 
      (d.kode && pj.kode && d.kode.trim().toLowerCase() === pj.kode.trim().toLowerCase()) ||
      (d.nama && pj.nama && d.nama.trim().toLowerCase() === pj.nama.trim().toLowerCase()) ||
      (d.singkatan && pj.singkatan && d.singkatan.trim().toLowerCase() === pj.singkatan.trim().toLowerCase())
    );
    if (dj) {
      jurusanMap[pj.id] = dj.id;
      console.log(`🔗 Map Jurusan: [${pj.kode || pj.nama}] (Prod: ${pj.id}) -> (Demo: ${dj.id})`);
    } else {
      console.warn(`⚠️ Jurusan Prod ${pj.nama} tidak punya padanan di Demo!`);
    }
  }

  // 2. Ambil Position di Prod dan Demo
  const prodPositions = await prisma.organizationalPosition.findMany({ where: { tenant_id: REAL_PROD_ID } });
  const demoPositions = await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } });

  const positionMap: Record<string, string> = {};
  for (const pp of prodPositions) {
    const dp = demoPositions.find(d => d.code === pp.code);
    if (dp) {
      positionMap[pp.id] = dp.id;
    }
  }

  // 3. Ambil User/Guru di Demo
  const demoUsers = await prisma.user.findMany({ where: { tenant_id: DEMO_ID } });

  // 4. Ambil semua OrganizationalAssignment di Prod yang terkait KAPROG, TOOLMAN, KABENG, KEPSEK, WAKA, WALIKELAS, dll.
  const prodAssignments = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: REAL_PROD_ID },
    include: { Position: true, User: true }
  });

  console.log(`\nMemproses ${prodAssignments.length} penugasan dari Produksi SMKN 1 Plered...`);

  let synced = 0;
  for (const pa of prodAssignments) {
    const targetDemoPosId = positionMap[pa.position_id];
    if (!targetDemoPosId || !pa.User) continue;

    // Cari User di Demo yang namanya sama dengan User di Prod
    const demoUser = demoUsers.find(du => 
      du.full_name.replace(/\s*\(Demo\)$/i, '').trim().toLowerCase() === 
      pa.User.full_name.replace(/\s*\(Demo\)$/i, '').trim().toLowerCase()
    );

    if (!demoUser) {
      console.warn(`⚠️ User Prod '${pa.User.full_name}' tidak ditemukan di Demo!`);
      continue;
    }

    // Tentukan unit_id di Demo (jika penugasan terikat ke unit/jurusan)
    let targetDemoUnitId: string | null = null;
    if (pa.unit_id) {
      targetDemoUnitId = jurusanMap[pa.unit_id] || null;
    }

    // Tentukan kelas_id di Demo jika ada
    let targetDemoKelasId: string | null = null;
    if (pa.kelas_id) {
      const prodKelas = await prisma.kelas.findUnique({ where: { id: pa.kelas_id } });
      if (prodKelas) {
        const demoKelas = await prisma.kelas.findFirst({
          where: { tenant_id: DEMO_ID, nama_kelas: prodKelas.nama_kelas }
        });
        if (demoKelas) {
          targetDemoKelasId = demoKelas.id;
        }
      }
    }

    // Cek apakah sudah ada assignment serupa di Demo
    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: DEMO_ID,
        position_id: targetDemoPosId,
        unit_id: targetDemoUnitId,
        kelas_id: targetDemoKelasId,
      }
    });

    if (existing) {
      await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
          user_id: demoUser.id,
          is_active: true
        }
      });
      synced++;
    } else {
      await prisma.organizationalAssignment.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          position_id: targetDemoPosId,
          user_id: demoUser.id,
          unit_id: targetDemoUnitId,
          kelas_id: targetDemoKelasId,
          is_active: true
        }
      });
      synced++;
    }
  }

  // 5. Cek apakah ada jurusan yang belum punya Kaprog / Toolman di Demo, jika belum, pasangkan guru kejuruan terkait
  const kaprogPos = demoPositions.find(p => p.code === 'KAPROG');
  const toolmanPos = demoPositions.find(p => p.code === 'TOOLMAN');
  const kabengPos = demoPositions.find(p => p.code === 'KABENG');

  if (kaprogPos && toolmanPos) {
    const demoTeachers = await prisma.guru.findMany({
      where: { tenant_id: DEMO_ID },
      include: { User: true }
    });

    for (let i = 0; i < demoJurusans.length; i++) {
      const j = demoJurusans[i];

      // Kaprog
      const existingKaprog = await prisma.organizationalAssignment.findFirst({
        where: { tenant_id: DEMO_ID, position_id: kaprogPos.id, unit_id: j.id, is_active: true }
      });
      if (!existingKaprog) {
        const teacher = demoTeachers[i % demoTeachers.length];
        if (teacher.user_id) {
          await prisma.organizationalAssignment.create({
            data: {
              id: randomUUID(),
              tenant_id: DEMO_ID,
              position_id: kaprogPos.id,
              user_id: teacher.user_id,
              unit_id: j.id,
              is_active: true
            }
          });
          console.log(`➕ Auto-assigned Kaprog untuk ${j.nama} -> ${teacher.nama_guru}`);
        }
      }

      // Toolman
      const existingToolman = await prisma.organizationalAssignment.findFirst({
        where: { tenant_id: DEMO_ID, position_id: toolmanPos.id, unit_id: j.id, is_active: true }
      });
      if (!existingToolman) {
        const teacher = demoTeachers[(i + 15) % demoTeachers.length];
        if (teacher.user_id) {
          await prisma.organizationalAssignment.create({
            data: {
              id: randomUUID(),
              tenant_id: DEMO_ID,
              position_id: toolmanPos.id,
              user_id: teacher.user_id,
              unit_id: j.id,
              is_active: true
            }
          });
          console.log(`➕ Auto-assigned Toolman untuk ${j.nama} -> ${teacher.nama_guru}`);
        }
      }

      // Kabeng
      if (kabengPos) {
        const existingKabeng = await prisma.organizationalAssignment.findFirst({
          where: { tenant_id: DEMO_ID, position_id: kabengPos.id, unit_id: j.id, is_active: true }
        });
        if (!existingKabeng) {
          const teacher = demoTeachers[(i + 30) % demoTeachers.length];
          if (teacher.user_id) {
            await prisma.organizationalAssignment.create({
              data: {
                id: randomUUID(),
                tenant_id: DEMO_ID,
                position_id: kabengPos.id,
                user_id: teacher.user_id,
                unit_id: j.id,
                is_active: true
              }
            });
            console.log(`➕ Auto-assigned Kabeng untuk ${j.nama} -> ${teacher.nama_guru}`);
          }
        }
      }
    }
  }

  console.log(`\n🎉 Selesai menyinkronkan penugasan jabatan struktur! Total terupdate/terbuat: ${synced}`);
}

syncAllKaprogToolman().catch(console.error).finally(() => prisma.$disconnect());
