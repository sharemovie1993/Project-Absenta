import { PrismaClient } from '@prisma/client';
import { fakerID_ID as faker } from '@faker-js/faker';
import { ProductCategoryService } from '../../modules/cooperative/toko/product-category.service';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Default SavingCategory per koperasi tenant
export const DEFAULT_SAVING_CATEGORIES = [
    {
        code: 'POKOK',
        name: 'Simpanan Pokok',
        description: 'Dibayar sekali saat pertama kali mendaftar sebagai anggota koperasi.',
        color: '#3B82F6',
        order: 1,
        isMandatory: false,
        isWithdrawable: false,
        withdrawRule: 'RESIGN_ONLY',
        isIncludedInShu: true,
        accountCode: '2020',
        defaultAmount: 50000,
    },
    {
        code: 'WAJIB',
        name: 'Simpanan Wajib',
        description: 'Dibayar rutin setiap bulan. Menjadi basis perhitungan jasa modal SHU.',
        color: '#10B981',
        order: 2,
        isMandatory: true,
        isWithdrawable: false,
        withdrawRule: 'RESIGN_ONLY',
        isIncludedInShu: true,
        accountCode: '2020',
        defaultAmount: 10000,
    },
    {
        code: 'SUKARELA',
        name: 'Simpanan Sukarela',
        description: 'Tabungan bebas — dapat disetor dan ditarik kapan saja.',
        color: '#8B5CF6',
        order: 3,
        isMandatory: false,
        isWithdrawable: true,
        withdrawRule: 'ANYTIME',
        isIncludedInShu: false,
        accountCode: '2010',
        defaultAmount: null,
    },
    {
        code: 'SHR',
        name: 'Simpanan Hari Raya',
        description: 'Tabungan khusus Hari Raya (Lebaran). Dapat dicairkan menjelang Idul Fitri.',
        color: '#F59E0B',
        order: 4,
        isMandatory: false,
        isWithdrawable: true,
        withdrawRule: 'HOLIDAY',
        isIncludedInShu: false,
        accountCode: '2030',
        defaultAmount: null,
    },
    {
        code: 'LAINNYA',
        name: 'Simpanan Lainnya',
        description: 'Jenis simpanan lain sesuai kebijakan koperasi.',
        color: '#6B7280',
        order: 5,
        isMandatory: false,
        isWithdrawable: true,
        withdrawRule: 'ANYTIME',
        isIncludedInShu: false,
        accountCode: '2010',
        defaultAmount: null,
    },
];

export async function seedSavingCategories(tenantId: string): Promise<Record<string, string>> {
    const categoryIdMap: Record<string, string> = {};
    for (const cat of DEFAULT_SAVING_CATEGORIES) {
        const saved = await prisma.savingCategory.upsert({
            where: { tenantId_code: { tenantId, code: cat.code } },
            update: { name: cat.name, description: cat.description, color: cat.color, order: cat.order,
                isMandatory: cat.isMandatory, isWithdrawable: cat.isWithdrawable, withdrawRule: cat.withdrawRule,
                isIncludedInShu: cat.isIncludedInShu, accountCode: cat.accountCode,
                defaultAmount: cat.defaultAmount ?? null, isActive: true },
            create: { tenantId, ...cat, defaultAmount: cat.defaultAmount ?? null },
        });
        categoryIdMap[cat.code] = saved.id;
    }
    return categoryIdMap;
}

export async function seedShuConfig(tenantId: string): Promise<void> {
    await prisma.shuConfig.upsert({
        where: { tenantId },
        update: {},
        create: {
            tenantId,
            porsiJasaModal: 30,
            porsiJasaTransaksi: 30,
            porsiCadangan: 20,
            porsiPengurus: 5,
            porsiSosial: 5,
            porsiPembangunan: 10,
        },
    });
}

export async function seedCooperative(tenantId: string, siswaList: any[], guruList: any[]) {
    console.log('🌱 Seeding Cooperative Data (Members & Transactions)...');

    // Hash default pin "123456" for demo members
    const hashedPin = await bcrypt.hash('123456', 10);

    // 0. Seed SavingCategory dan ShuConfig terlebih dahulu
    const categoryIdMap = await seedSavingCategories(tenantId);
    await seedShuConfig(tenantId);
    await ProductCategoryService.ensureDefaultCategories(tenantId);

    // 1. Register All Siswa as Members
    const memberSiswaList = [];
    for (const siswa of siswaList) {
        const memberNo = `KOP-${siswa.nis}`;

        const existing = await prisma.member.findFirst({ where: { tenantId, memberNo } });

        if (!existing) {
            const member = await prisma.member.create({
                data: {
                    tenantId,
                    memberNo,
                    type: 'STUDENT',
                    status: 'ACTIVE',
                    pin: hashedPin,
                    siswaId: siswa.id,
                    userId: siswa.user_id,
                    joinDate: faker.date.past({ years: 1 }),
                },
            });
            memberSiswaList.push(member);
        }
    }

    // 2. Register Guru as Members (5 Data)
    const memberGuruList = [];
    for (const guru of guruList.slice(0, 5)) {
        const memberNo = `KOP-G-${guru.nip.slice(-5)}`;

        const existing = await prisma.member.findFirst({ where: { tenantId, memberNo } });

        if (!existing) {
            const member = await prisma.member.create({
                data: {
                    tenantId,
                    memberNo,
                    type: 'TEACHER',
                    status: 'ACTIVE',
                    pin: hashedPin,
                    guruId: guru.id,
                    userId: guru.user_id,
                    joinDate: faker.date.past({ years: 2 }),
                },
            });
            memberGuruList.push(member);
        }
    }

    const allMembers = [...memberSiswaList, ...memberGuruList];

    // 2.5 Assign KETUA_KOPERASI and BENDAHARA_KOPERASI positions to dummy teachers
    const posKetua = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenantId, code: 'KETUA_KOPERASI' }
    });
    const posBendahara = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenantId, code: 'BENDAHARA_KOPERASI' }
    });

    if (posKetua && guruList[0]) {
        const existingAssignment = await prisma.organizationalAssignment.findFirst({
            where: {
                tenant_id: tenantId,
                position_id: posKetua.id,
                user_id: guruList[0].user_id,
            }
        });
        if (!existingAssignment) {
            await prisma.organizationalAssignment.create({
                data: {
                    tenant_id: tenantId,
                    position_id: posKetua.id,
                    user_id: guruList[0].user_id,
                    is_active: true,
                }
            });
            console.log(`👤 Assigned ${guruList[0].nama_guru} as KETUA_KOPERASI`);
        }
    }

    if (posBendahara && guruList[1]) {
        const existingAssignment = await prisma.organizationalAssignment.findFirst({
            where: {
                tenant_id: tenantId,
                position_id: posBendahara.id,
                user_id: guruList[1].user_id,
            }
        });
        if (!existingAssignment) {
            await prisma.organizationalAssignment.create({
                data: {
                    tenant_id: tenantId,
                    position_id: posBendahara.id,
                    user_id: guruList[1].user_id,
                    is_active: true,
                }
            });
            console.log(`👤 Assigned ${guruList[1].nama_guru} as BENDAHARA_KOPERASI`);
        }
    }

    // 3. Create/Update Savings secara idempotent untuk semua anggota aktif
    const currentMembers = await prisma.member.findMany({ where: { tenantId } });
    for (const member of currentMembers) {
        // Simpanan Pokok
        const existingPokok = await prisma.saving.findUnique({
            where: { memberId_categoryId: { memberId: member.id, categoryId: categoryIdMap['POKOK'] } }
        });
        if (!existingPokok) {
            await prisma.saving.create({
                data: {
                    memberId: member.id,
                    categoryId: categoryIdMap['POKOK'],
                    amount: 50000,
                },
            });
        } else if (Number(existingPokok.amount) === 0) {
            await prisma.saving.update({
                where: { id: existingPokok.id },
                data: { amount: 50000 }
            });
        }

        // Simpanan Wajib
        const existingWajib = await prisma.saving.findUnique({
            where: { memberId_categoryId: { memberId: member.id, categoryId: categoryIdMap['WAJIB'] } }
        });
        const wajibAmount = faker.number.int({ min: 150000, max: 800000 });
        if (!existingWajib) {
            const wajibSaving = await prisma.saving.create({
                data: {
                    memberId: member.id,
                    categoryId: categoryIdMap['WAJIB'],
                    amount: wajibAmount,
                },
            });
            await prisma.savingTransaction.create({
                data: {
                    savingId: wajibSaving.id,
                    amount: wajibAmount,
                    type: 'DEPOSIT',
                    description: 'Setoran Awal',
                },
            });
        } else if (Number(existingWajib.amount) === 0) {
            await prisma.saving.update({
                where: { id: existingWajib.id },
                data: { amount: wajibAmount }
            });
            await prisma.savingTransaction.create({
                data: {
                    savingId: existingWajib.id,
                    amount: wajibAmount,
                    type: 'DEPOSIT',
                    description: 'Setoran Awal (Seeded)',
                },
            });
        }
        
        // Simpanan Sukarela
        const existingSukarela = await prisma.saving.findUnique({
            where: { memberId_categoryId: { memberId: member.id, categoryId: categoryIdMap['SUKARELA'] } }
        });
        const sukarelaAmount = faker.number.int({ min: 100000, max: 1200000 });
        if (!existingSukarela) {
            await prisma.saving.create({
                data: {
                    memberId: member.id,
                    categoryId: categoryIdMap['SUKARELA'],
                    amount: sukarelaAmount,
                },
            });
        } else if (Number(existingSukarela.amount) === 0) {
            await prisma.saving.update({
                where: { id: existingSukarela.id },
                data: { amount: sukarelaAmount }
            });
        }
    }

    console.log(`✅ Cooperative Data Seeded: ${allMembers.length} Members.`);
}
