// @ts-nocheck — Script historis, SavingType enum sudah digantikan SavingCategory model
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Memulai pembersihan dan sinkronisasi terbatas...');

    // 1. Cari tenant SMKN 1 Plered
    const pleredTenant = await prisma.tenant.findFirst({
        where: { name: { contains: 'Plered', mode: 'insensitive' } }
    });

    if (!pleredTenant) {
        throw new Error('Tenant SMK N 1 PLERED tidak ditemukan di database.');
    }
    console.log(`🏫 Tenant Ditemukan: ${pleredTenant.name} (${pleredTenant.id})`);

    // 2. Cari data simpanan yang dibuat oleh script global sebelumnya (antara jam 10:17 dan 10:20 UTC pada 2026-06-01)
    const startTime = new Date('2026-06-01T10:17:00.000Z');
    const endTime = new Date('2026-06-01T10:20:00.000Z');

    const targetSavings = await prisma.saving.findMany({
        where: {
            createdAt: {
                gte: startTime,
                lte: endTime
            }
        },
        include: {
            member: {
                select: {
                    tenantId: true,
                    Tenant: { select: { name: true } }
                }
            }
        }
    });

    console.log(`📋 Ditemukan ${targetSavings.length} rekening simpanan yang dibuat oleh script global.`);

    // Kelompokkan berdasarkan tenant untuk validasi
    const tenantGroups: Record<string, number> = {};
    for (const s of targetSavings) {
        const tName = s.member?.Tenant?.name || 'Unknown';
        tenantGroups[tName] = (tenantGroups[tName] || 0) + 1;
    }
    console.log('Breakdown rekening yang akan dihapus:', tenantGroups);

    if (targetSavings.length !== 2541) {
        console.warn(`⚠️ Warning: Jumlah rekening (${targetSavings.length}) tidak sama dengan 2541.`);
    }

    // 3. Hapus rekening simpanan global tersebut
    console.log('🗑️ Menghapus rekening simpanan global hasil sinkronisasi sebelumnya...');
    const deleteResult = await prisma.saving.deleteMany({
        where: {
            id: {
                in: targetSavings.map(s => s.id)
            }
        }
    });
    console.log(`✅ Berhasil menghapus ${deleteResult.count} rekening simpanan.`);

    // 4. Lakukan sinkronisasi KHUSUS untuk tenant SMK N 1 PLERED
    console.log(`🔄 Sinkronisasi rekening simpanan khusus untuk tenant: ${pleredTenant.name}...`);
    const pleredMembers = await prisma.member.findMany({
        where: {
            tenantId: pleredTenant.id
        },
        include: {
            savings: true,
            Siswa: { select: { nama_siswa: true } },
            Guru: { select: { nama_guru: true } }
        }
    });

    console.log(`👥 Anggota terdaftar di Plered: ${pleredMembers.length}`);

    let createdCount = 0;
    const savingTypes: SavingType[] = ['POKOK', 'WAJIB', 'SUKARELA'];

    for (const member of pleredMembers) {
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

    console.log(`✅ Sinkronisasi ulang selesai. Berhasil membuat ${createdCount} rekening simpanan baru khusus tenant Plered.`);

    // 5. Validasi hasil akhir
    const finalPleredMembers = await prisma.member.findMany({
        where: {
            tenantId: pleredTenant.id
        },
        include: {
            savings: true,
            Siswa: { select: { nama_siswa: true } },
            Guru: { select: { nama_guru: true } }
        }
    });

    console.log('📊 Status Rekening Anggota SMKN 1 Plered saat ini:');
    for (const m of finalPleredMembers) {
        const memberName = m.Siswa?.nama_siswa || m.Guru?.nama_guru || 'Unknown';
        console.log(`- MemberNo: ${m.memberNo}, Nama: ${memberName}, Jumlah Rekening: ${m.savings.length} (${m.savings.map(s => s.type).join(', ')})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
