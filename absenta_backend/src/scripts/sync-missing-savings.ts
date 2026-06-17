// @ts-nocheck — Script historis, SavingType enum sudah digantikan SavingCategory model
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Memulai sinkronisasi rekening simpanan anggota koperasi yang belum memiliki rekening...');
    
    // Find all members
    const members = await prisma.member.findMany({
        include: {
            savings: true,
            Siswa: { select: { nama_siswa: true } },
            Guru: { select: { nama_guru: true } }
        }
    });

    console.log(`📋 Total Anggota ditemukan: ${members.length}`);

    let createdCount = 0;
    const savingTypes: SavingType[] = ['POKOK', 'WAJIB', 'SUKARELA'];

    for (const member of members) {
        const existingTypes = member.savings.map(s => s.type);
        const missingTypes = savingTypes.filter(t => !existingTypes.includes(t));

        if (missingTypes.length > 0) {
            const memberName = member.Siswa?.nama_siswa || member.Guru?.nama_guru || 'Unknown';
            console.log(`👉 Anggota ${memberName} (${member.memberNo}) kekurangan simpanan: ${missingTypes.join(', ')}`);

            for (const type of missingTypes) {
                await prisma.saving.create({
                    data: {
                        memberId: member.id,
                        type,
                        amount: 0
                    }
                });
                createdCount++;
            }
        }
    }

    console.log(`✅ Sinkronisasi selesai. Berhasil membuat ${createdCount} rekening simpanan baru.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
