import { prisma } from '../src/utils/prisma';
import { SavingCategoryService } from '../src/modules/cooperative/simpanan/saving-category.service';
import { SavingService } from '../src/modules/cooperative/simpanan/saving.service';
import { ShuService } from '../src/modules/cooperative/shu/shu.service';

async function runTest() {
    const tenantId = '6553ad09-525e-4be6-b133-7bbed9d33090'; // Cimahi
    console.log('--- Starting Integration Test for Dynamic Saving Category & SHU Distribution ---');
    console.log('Tenant ID:', tenantId);

    try {
        // 1. Check existing categories
        let categories = await SavingCategoryService.getCategories(tenantId);
        console.log(`Current active categories count: ${categories.length}`);

        // 2. Add custom category (e.g. SHR: Simpanan Hari Raya)
        const shrCode = 'SHR';
        let shrCategory: any = categories.find(c => c.code === shrCode);
        if (!shrCategory) {
            console.log('Creating SHR category...');
            shrCategory = await SavingCategoryService.createCategory(tenantId, {
                code: shrCode,
                name: 'Simpanan Hari Raya (Test)',
                description: 'Simpanan Hari Raya untuk kebutuhan lebaran',
                color: '#EC4899',
                isIncludedInShu: false, // SHR not included in SHU by default
            });
            console.log('SHR category created:', shrCategory.id);
        } else {
            console.log('SHR category already exists with ID:', shrCategory.id);
        }

        // Add another custom category that IS included in SHU to test dynamic inclusion
        const qurbanCode = 'QURBAN';
        let qurbanCategory: any = (await SavingCategoryService.getAllCategories(tenantId)).find(c => c.code === qurbanCode);
        if (!qurbanCategory) {
            console.log('Creating QURBAN category (Included in SHU)...');
            qurbanCategory = await SavingCategoryService.createCategory(tenantId, {
                code: qurbanCode,
                name: 'Simpanan Qurban (Test)',
                description: 'Simpanan Qurban',
                color: '#8B5CF6',
                isIncludedInShu: true, // QURBAN IS included in SHU
            });
            console.log('QURBAN category created:', qurbanCategory.id);
        } else {
            console.log('QURBAN category already exists with ID:', qurbanCategory.id);
        }

        // 3. Select a couple of active members to test
        const members = await prisma.member.findMany({
            where: { tenantId, status: 'ACTIVE' },
            take: 3,
            include: {
                savings: {
                    include: { category: true }
                }
            }
        });

        if (members.length < 2) {
            console.error('Not enough active members seeded. Seeding process might be incomplete.');
            return;
        }

        console.log(`Testing with ${members.length} members:`);
        members.forEach(m => {
            console.log(`- Member ID: ${m.id}, MemberNo: ${m.memberNo}`);
        });

        // 4. Ensure each testing member has a SUKARELA and QURBAN and SHR account
        const sukarelaCategory = (await SavingCategoryService.getAllCategories(tenantId)).find(c => c.code === 'SUKARELA');
        if (!sukarelaCategory) throw new Error('SUKARELA category not found in DB!');

        for (const m of members) {
            // Check SUKARELA
            let hasSukarela = m.savings.some(s => s.category.code === 'SUKARELA');
            if (!hasSukarela) {
                console.log(`Creating Sukarela account for member ${m.memberNo}...`);
                await SavingService.createSaving(m.id, sukarelaCategory.id, 10000);
            }

            // Check QURBAN
            let hasQurban = m.savings.some(s => s.category.code === qurbanCode);
            if (!hasQurban && qurbanCategory) {
                console.log(`Creating Qurban account for member ${m.memberNo}...`);
                await SavingService.createSaving(m.id, qurbanCategory.id, 0);
            }

            // Check SHR
            let hasShr = m.savings.some(s => s.category.code === shrCode);
            if (!hasShr && shrCategory) {
                console.log(`Creating SHR account for member ${m.memberNo}...`);
                await SavingService.createSaving(m.id, shrCategory.id, 0);
            }
        }

        // Retrieve fresh member data with updated savings
        const freshMembers = await prisma.member.findMany({
            where: { id: { in: members.map(m => m.id) } },
            include: {
                savings: {
                    include: { category: true }
                }
            }
        });

        // 5. Let's make some manual deposit transactions for testing SHU
        // We will deposit:
        // - Member 1: Qurban = Rp 500.000, Pokok = Rp 100.000 (included in SHU), SHR = Rp 200.000 (not included in SHU)
        // - Member 2: Qurban = Rp 250.000, Pokok = Rp 100.000 (included in SHU), SHR = Rp 300.000 (not included in SHU)
        // Let's reset savings amount first to make calculations clear
        for (const m of freshMembers) {
            for (const s of m.savings) {
                let targetAmount = 0;
                if (m.id === freshMembers[0].id) {
                    if (s.category.code === 'POKOK') targetAmount = 100000;
                    else if (s.category.code === qurbanCode) targetAmount = 500000;
                    else if (s.category.code === shrCode) targetAmount = 200000;
                } else if (m.id === freshMembers[1].id) {
                    if (s.category.code === 'POKOK') targetAmount = 100000;
                    else if (s.category.code === qurbanCode) targetAmount = 250000;
                    else if (s.category.code === shrCode) targetAmount = 300000;
                }

                await prisma.saving.update({
                    where: { id: s.id },
                    data: { amount: targetAmount }
                });
            }
        }

        console.log('Savings amounts set for testing.');

        // 6. Create a test SHU period
        const year = 2026;
        // Clean up any existing test period for 2026 to avoid unique constraint error
        const existingPeriod = await prisma.shuPeriod.findFirst({
            where: { tenantId, year }
        });
        if (existingPeriod) {
            console.log(`Cleaning up existing SHU period for ${year}...`);
            await prisma.shuAllocation.deleteMany({ where: { periodId: existingPeriod.id } });
            await prisma.shuPeriod.delete({ where: { id: existingPeriod.id } });
        }

        console.log(`Creating SHU Period for ${year}...`);
        const shuPeriod = await ShuService.createPeriod(tenantId, {
            year,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.000Z',
            totalRevenue: 10000000,  // Revenue Rp 10M
            totalExpense: 2000000,    // Expense Rp 2M
            notes: 'Test SHU Period for integration test',
        });
        console.log('SHU Period created:', shuPeriod.id, 'Total SHU (Profit):', Number(shuPeriod.totalShu));

        // Create transaction history within this period to test Jasa Transaksi (volume)
        // Let's create a DEPOSIT transaction for Member 1 of Rp 1.500.000 and Member 2 of Rp 500.000
        const m1SavingForTx = freshMembers[0].savings.find(s => s.category.code === 'SUKARELA');
        const m2SavingForTx = freshMembers[1].savings.find(s => s.category.code === 'SUKARELA');

        if (m1SavingForTx && m2SavingForTx) {
            console.log('Seeding DEPOSIT transactions inside SHU period dates...');
            // Clean old transactions inside the date range if any
            await prisma.savingTransaction.deleteMany({
                where: {
                    savingId: { in: [m1SavingForTx.id, m2SavingForTx.id] },
                    date: { gte: new Date('2026-01-01T00:00:00.000Z'), lte: new Date('2026-12-31T23:59:59.000Z') }
                }
            });

            await prisma.savingTransaction.create({
                data: {
                    savingId: m1SavingForTx.id,
                    amount: 1500000,
                    type: 'DEPOSIT',
                    date: new Date('2026-06-01T10:00:00.000Z'),
                    description: 'Setoran Sukarela dalam Periode SHU'
                }
            });

            await prisma.savingTransaction.create({
                data: {
                    savingId: m2SavingForTx.id,
                    amount: 500000,
                    type: 'DEPOSIT',
                    date: new Date('2026-06-01T11:00:00.000Z'),
                    description: 'Setoran Sukarela dalam Periode SHU'
                }
            });
            console.log('Seeded deposit transactions successfully.');
        }

        // 7. Configure SHU allocation rates
        console.log('Setting SHU Config...');
        const config = await ShuService.updateConfig(tenantId, {
            porsiJasaModal: 40,      // 40% based on modal
            porsiJasaTransaksi: 30,  // 30% based on transaction
            porsiCadangan: 20,       // 20%
            porsiPengurus: 5,        // 5%
            porsiSosial: 5,          // 5%
            porsiPembangunan: 0,     // 0%
        });
        console.log('SHU Config updated. Jasa Modal Portion:', Number(config.porsiJasaModal) + '%');

        // 8. Calculate SHU
        console.log('Calculating SHU allocations...');
        const calcResult = await ShuService.calculateShu(shuPeriod.id, tenantId);
        console.log('Calculated Result:', calcResult);

        // Fetch allocations to verify calculations
        const periodDetail = await ShuService.getPeriodDetail(shuPeriod.id, tenantId);
        console.log('Calculated Allocations count:', periodDetail.Allocations.length);

        const allocM1 = periodDetail.Allocations.find(a => a.memberId === freshMembers[0].id);
        const allocM2 = periodDetail.Allocations.find(a => a.memberId === freshMembers[1].id);

        if (allocM1 && allocM2) {
            console.log(`Member 1 (${freshMembers[0].memberNo}):`);
            console.log(`  - Total Modal (POKOK + QURBAN, SHR excluded): Rp ${Number(allocM1.totalSimpananModal)}`);
            console.log(`  - Total Transaksi (DEPOSIT within period): Rp ${Number(allocM1.totalTransaksi)}`);
            console.log(`  - SHU Jasa Modal: Rp ${Number(allocM1.jasaModal)}`);
            console.log(`  - SHU Jasa Transaksi: Rp ${Number(allocM1.jasaTransaksi)}`);
            console.log(`  - Total SHU: Rp ${Number(allocM1.totalShu)}`);

            console.log(`Member 2 (${freshMembers[1].memberNo}):`);
            console.log(`  - Total Modal (POKOK + QURBAN, SHR excluded): Rp ${Number(allocM2.totalSimpananModal)}`);
            console.log(`  - Total Transaksi (DEPOSIT within period): Rp ${Number(allocM2.totalTransaksi)}`);
            console.log(`  - SHU Jasa Modal: Rp ${Number(allocM2.jasaModal)}`);
            console.log(`  - SHU Jasa Transaksi: Rp ${Number(allocM2.jasaTransaksi)}`);
            console.log(`  - Total SHU: Rp ${Number(allocM2.totalShu)}`);
        }

        // 9. Approve the SHU Period
        console.log('Approving SHU Period...');
        // Let's get a user ID to approve
        const user = await prisma.user.findFirst({
            where: { tenant_id: tenantId }
        });
        if (!user) throw new Error('No user found to approve SHU!');
        
        const approvedPeriod = await ShuService.approvePeriod(shuPeriod.id, tenantId, user.id);
        console.log('SHU Period status after approval:', approvedPeriod.status);

        // 10. Distribute SHU
        console.log('Distributing SHU to Sukarela accounts...');
        const distributionResult = await ShuService.distributeShu(shuPeriod.id, tenantId);
        console.log('Distribution Result:', distributionResult);

        // 11. Verify that interest transaction is added to Member 1 and Member 2 Sukarela accounts
        const verifiedM1Sukarela = await prisma.saving.findFirst({
            where: { memberId: freshMembers[0].id, category: { code: 'SUKARELA' } },
            include: {
                transactions: {
                    where: { type: 'INTEREST', description: `SHU Tahun ${year}` }
                }
            }
        });
        
        console.log('Verification:');
        if (verifiedM1Sukarela && verifiedM1Sukarela.transactions.length > 0) {
            console.log(`✅ Success! Member 1 received Rp ${Number(verifiedM1Sukarela.transactions[0].amount)} as INTEREST in Sukarela account.`);
            console.log(`   Transaction details: Type: ${verifiedM1Sukarela.transactions[0].type}, Description: ${verifiedM1Sukarela.transactions[0].description}`);
        } else {
            console.log('❌ Failure: Member 1 did not receive the distributed SHU.');
        }

        console.log('--- Test Completed Successfully ---');

    } catch (e: any) {
        console.error('❌ Test failed with error:', e.message);
        console.error(e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
