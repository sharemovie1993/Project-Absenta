import { PrismaClient, Hari } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting JadwalTemplate seeding for SMK Negeri 1 Plered...');

    // 1. Locate Plered Tenant
    const tenant = await prisma.tenant.findFirst({
        where: {
            name: {
                contains: 'Plered',
                mode: 'insensitive'
            }
        }
    });

    if (!tenant) {
        console.error('❌ Tenant SMK Negeri 1 Plered not found');
        return;
    }

    console.log(`🏫 Found Tenant: "${tenant.name}" (${tenant.id})`);

    // 2. Locate Active School Year and Semester
    const tapel = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    if (!tapel) {
        console.error('❌ Active TahunPelajaran not found');
        return;
    }

    const semester = await prisma.semester.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    if (!semester) {
        console.error('❌ Active Semester not found');
        return;
    }

    console.log(`📅 Active Tapel: ${tapel.tahun} | Active Semester: ${semester.nama_semester}`);

    // Retrieve classes, teachers, mapel
    const classes = await prisma.kelas.findMany({
        where: { tenant_id: tenant.id }
    });
    const teachers = await prisma.guru.findMany({
        where: { tenant_id: tenant.id }
    });
    const mapels = await prisma.mapel.findMany({
        where: { tenant_id: tenant.id }
    });

    console.log(`📊 Loaded:
  - Classes: ${classes.length}
  - Teachers: ${teachers.length}
  - Mapels: ${mapels.length}`);

    if (classes.length === 0 || teachers.length === 0 || mapels.length === 0) {
        console.error('❌ Missing core academic data (classes, teachers, mapels). Aborting.');
        return;
    }

    // Clean up existing JadwalTemplate for Plered
    const deletedCount = await prisma.jadwalTemplate.deleteMany({
        where: { tenant_id: tenant.id }
    });
    console.log(`🗑&emsp;Deleted ${deletedCount.count} existing JadwalTemplates.`);

    // Define schedule patterns
    // Senin
    const seninSlots = [
        { label: 'Upacara', jenis: 'UPACARA', jam_mulai: '07:00', jam_selesai: '07:45', isKbm: false },
        { label: 'KBM 1', jenis: 'KBM', jam_mulai: '07:45', jam_selesai: '09:15', isKbm: true },
        { label: 'KBM 2', jenis: 'KBM', jam_mulai: '09:15', jam_selesai: '10:45', isKbm: true },
        { label: 'KBM 3', jenis: 'KBM', jam_mulai: '10:45', jam_selesai: '12:15', isKbm: true },
        { label: 'KBM 4', jenis: 'KBM', jam_mulai: '12:15', jam_selesai: '13:45', isKbm: true },
        { label: 'Apel Pulang', jenis: 'APEL', jam_mulai: '13:45', jam_selesai: '14:00', isKbm: false }
    ];

    // Selasa, Rabu, Kamis
    const weekdaySlots = [
        { label: 'Apel Datang', jenis: 'APEL', jam_mulai: '07:00', jam_selesai: '07:15', isKbm: false },
        { label: 'KBM 1', jenis: 'KBM', jam_mulai: '07:15', jam_selesai: '08:45', isKbm: true },
        { label: 'KBM 2', jenis: 'KBM', jam_mulai: '08:45', jam_selesai: '10:15', isKbm: true },
        { label: 'KBM 3', jenis: 'KBM', jam_mulai: '10:15', jam_selesai: '11:45', isKbm: true },
        { label: 'KBM 4', jenis: 'KBM', jam_mulai: '11:45', jam_selesai: '13:15', isKbm: true },
        { label: 'Apel Pulang', jenis: 'APEL', jam_mulai: '13:15', jam_selesai: '13:30', isKbm: false }
    ];

    // Jumat
    const jumatSlots = [
        { label: 'Duha', jenis: 'SHOLAT', jam_mulai: '07:00', jam_selesai: '07:45', isKbm: false },
        { label: 'KBM 1', jenis: 'KBM', jam_mulai: '07:45', jam_selesai: '09:15', isKbm: true },
        { label: 'KBM 2', jenis: 'KBM', jam_mulai: '09:15', jam_selesai: '10:45', isKbm: true },
        { label: 'Apel Pulang', jenis: 'APEL', jam_mulai: '10:45', jam_selesai: '11:00', isKbm: false }
    ];

    const daysConfig = [
        { hari: Hari.SENIN, slots: seninSlots },
        { hari: Hari.SELASA, slots: weekdaySlots },
        { hari: Hari.RABU, slots: weekdaySlots },
        { hari: Hari.KAMIS, slots: weekdaySlots },
        { hari: Hari.JUMAT, slots: jumatSlots }
    ];

    let createdCount = 0;

    // To prevent slot conflicts for teachers, we make sure that for any slot (day + time),
    // each class gets a unique teacher. We do this by offsetting teacher list by class index.
    // Since teachers list length (76) >= classes list length (66), this is fully valid and collision-free.
    for (const dayConfig of daysConfig) {
        const { hari, slots } = dayConfig;
        console.log(`📅 Creating templates for ${hari}...`);

        for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
            const slot = slots[slotIdx];

            // If it is a KBM activity, we need to assign a unique teacher and a subject for each class
            const templatesData = classes.map((kelas: any, classIdx: number) => {
                let guru_id: string | null = null;
                let mapel_id: string | null = null;

                if (slot.isKbm) {
                    // Assign unique teacher for this slot
                    const teacherIndex = (classIdx + slotIdx * 7) % teachers.length;
                    guru_id = teachers[teacherIndex].id;

                    // Assign subject
                    const mapelIndex = (classIdx + slotIdx * 3) % mapels.length;
                    mapel_id = mapels[mapelIndex].id;
                }

                return {
                    tenant_id: tenant.id,
                    tahun_pelajaran_id: tapel.id,
                    semester_id: semester.id,
                    kelas_id: kelas.id,
                    hari: hari,
                    jam_mulai: slot.jam_mulai,
                    jam_selesai: slot.jam_selesai,
                    jenis_kegiatan: slot.jenis,
                    guru_id: guru_id,
                    mapel_id: mapel_id
                };
            });

            // Use createMany
            const result = await prisma.jadwalTemplate.createMany({
                data: templatesData
            });
            createdCount += result.count;
        }
    }

    console.log(`✅ Successfully created ${createdCount} JadwalTemplates for all classes.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
