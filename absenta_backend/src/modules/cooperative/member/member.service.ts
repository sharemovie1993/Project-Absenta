// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { applyDataScope } from '../../../utils/applyDataScope';
import { MemberType, MemberStatus } from '@prisma/client';
import { SavingCategoryService } from '../simpanan/saving-category.service';

export class MemberService {
    
    // Get all members with Core Data
    static async getMembers(scope: any) {
        const tenantId = scope?.tenantId || scope?.tenant_id;
        
        let where = { tenantId };
        
        // Use applyDataScope for Enterprise Standard
        // Note: member table uses 'tenantId' (camelCase) while Siswa uses 'kelas_id' (snake_case)
        // We need to tell applyDataScope to use 'tenantId' for the main table
        where = applyDataScope(where, scope, { tenantField: 'tenantId' });

        // Extra filtering for cooperative member specifically (joining with Siswa)
        const isTenantWide = scope?.tenant_wide ?? scope?.tenantWide;
        if (isTenantWide !== true) {
            const allowedKelas = Array.isArray(scope?.kelas_ids) ? scope.kelas_ids.map(id => String(id)) : 
                               (Array.isArray(scope?.kelasIds) ? scope.kelasIds.map(id => String(id)) : []);
            
            if (allowedKelas.length > 0) {
                // Member must be a student in allowed classes OR a teacher (teachers usually have global access in coop)
                // However, for strict scoping:
                where.OR = [
                    { siswaId: { not: null }, Siswa: { kelas_id: { in: allowedKelas } } },
                    { guruId: { not: null } } // Teachers are usually allowed
                ];
            }
        }

        const members = await prisma.member.findMany({
            where,
            include: {
                Siswa: { select: { nama_siswa: true, no_hp: true, alamat: true, nis: true } },
                Guru: { select: { nama_guru: true, no_hp: true, alamat: true, nip: true } },
                User: { select: { email: true, full_name: true, no_hp: true } },
                savings: true
            },
            // Order by memberNo karena name sudah tidak ada di table
            orderBy: { memberNo: 'asc' }
        });

        // Map to flat structure for Frontend compatibility
        return members.map(m => ({
            ...m,
            name: m.Siswa?.nama_siswa || m.Guru?.nama_guru || m.User?.full_name || 'Unknown',
            email: m.User?.email || '-',
            phone: m.Siswa?.no_hp || m.Guru?.no_hp || m.User?.no_hp || '-',
            address: m.Siswa?.alamat || m.Guru?.alamat || '-',
            identityNo: m.Siswa?.nis || m.Guru?.nip || '-',
            savings: m.savings
        }));
    }

    // Get member by ID
    static async getMemberById(id: string, scope: any) {
        const tenantId = scope?.tenantId;
        const member = await prisma.member.findFirst({
            where: {
                id,
                tenantId,
                ...(scope?.tenantWide !== true && Array.isArray(scope?.kelasIds) && scope.kelasIds.length > 0
                    ? { OR: [{ siswaId: { not: null }, Siswa: { kelas_id: { in: scope.kelasIds } } }] }
                    : {})
            },
            include: {
                Siswa: { select: { nama_siswa: true, no_hp: true, alamat: true, nis: true } },
                Guru: { select: { nama_guru: true, no_hp: true, alamat: true, nip: true } },
                User: { select: { email: true, full_name: true, no_hp: true } },
                savings: {
                    include: {
                        transactions: {
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            }
        });

        if (!member) return null;

        return {
            ...member,
            name: member.Siswa?.nama_siswa || member.Guru?.nama_guru || member.User?.full_name || 'Unknown',
            email: member.User?.email || '-',
            phone: member.Siswa?.no_hp || member.Guru?.no_hp || member.User?.no_hp || '-',
            address: member.Siswa?.alamat || member.Guru?.alamat || '-',
            identityNo: member.Siswa?.nis || member.Guru?.nip || '-',
            savings: member.savings
        };
    }

    // Get next auto-increment member number
    static async getNextMemberNo(tenantId: string) {
        const members = await prisma.member.findMany({
            where: { tenantId },
            select: { memberNo: true }
        });

        if (members.length === 0) {
            return '001';
        }

        let maxNum = 0;
        for (const m of members) {
            const num = parseInt(m.memberNo, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }

        const nextNum = maxNum + 1;
        return String(nextNum).padStart(3, '0');
    }

    // Cek status keanggotaan koperasi berdasarkan userId
    // Digunakan oleh endpoint /me untuk GURU/SISWA memeriksa status anggota mereka
    static async getMemberByUserId(tenantId: string, userId: string) {
        const member = await prisma.member.findFirst({
            where: { tenantId, userId, status: 'ACTIVE' },
            select: {
                id: true,
                memberNo: true,
                status: true,
                createdAt: true,
                User: {
                    select: { id: true, email: true, full_name: true }
                },
            },
        });
        return member ?? null;
    }

    // Create new member (Supports external members with auto user creation)
    static async createMember(tenantId: string, data: any) {
        const isExternal = data.isExternal === true || data.type === 'GENERAL';

        // Validate: Must have either siswaId, guruId, or be marked as external
        if (!data.siswaId && !data.guruId && !isExternal) {
            throw new Error('Member must be linked to a Student, Teacher, or register as an External member (Core Data)');
        }

        // Validate and hash transaction PIN (defaults to "123456" if empty)
        const pinToHash = data.pin || '123456';
        if (!/^\d{6}$/.test(pinToHash)) {
            throw new Error('PIN harus berupa 6 digit angka');
        }
        const bcrypt = require('bcrypt');
        const hashedPin = await bcrypt.hash(pinToHash, 10);

        // Check if memberNo already exists
        const existing = await prisma.member.findFirst({
            where: { tenantId, memberNo: data.memberNo }
        });

        if (existing) {
            throw new Error(`Member No ${data.memberNo} already exists`);
        }

        // Check if Siswa/Guru is already a member (globally unique)
        if (data.siswaId) {
            const existingSiswa = await prisma.member.findFirst({ where: { siswaId: data.siswaId } });
            if (existingSiswa) throw new Error('Student is already a member');
        }
        if (data.guruId) {
            const existingGuru = await prisma.member.findFirst({ where: { guruId: data.guruId } });
            if (existingGuru) throw new Error('Teacher is already a member');
        }

        // Write-back: Auto-complete missing core profile details (address, phone, email)
        if (data.siswaId) {
            const student = await prisma.siswa.findUnique({ where: { id: data.siswaId } });
            if (student) {
                const updatePayload: any = {};
                if (!student.alamat && data.address) updatePayload.alamat = data.address;
                if (!student.no_hp && data.phone) updatePayload.no_hp = data.phone;
                
                if (Object.keys(updatePayload).length > 0) {
                    await prisma.siswa.update({
                        where: { id: data.siswaId },
                        data: updatePayload
                    });
                    console.log(`[MemberService] Auto-completed student core profile:`, updatePayload);
                }
            }
        } else if (data.guruId) {
            const teacher = await prisma.guru.findUnique({ 
                where: { id: data.guruId },
                include: { User: true }
            });
            if (teacher) {
                const updatePayload: any = {};
                if (!teacher.alamat && data.address) updatePayload.alamat = data.address;
                if (!teacher.no_hp && data.phone) updatePayload.no_hp = data.phone;
                
                if (Object.keys(updatePayload).length > 0) {
                    await prisma.guru.update({
                        where: { id: data.guruId },
                        data: updatePayload
                    });
                    console.log(`[MemberService] Auto-completed teacher core profile:`, updatePayload);
                }

                // Sinkronisasikan email ke tabel User jika saat ini kosong di tabel User
                if (teacher.User && !teacher.User.email && data.email) {
                    const emailToUse = data.email.trim().toLowerCase();
                    
                    // Cek apakah email sudah digunakan oleh user lain di tenant yang sama
                    const otherUser = await prisma.user.findFirst({
                        where: {
                            email: emailToUse,
                            tenant_id: teacher.tenant_id,
                            id: { not: teacher.user_id }
                        }
                    });

                    if (!otherUser) {
                        await prisma.user.update({
                            where: { id: teacher.user_id },
                            data: { email: emailToUse }
                        });
                        console.log(`[MemberService] Auto-completed teacher user email:`, emailToUse);
                    }
                }
            }
        }

        return await prisma.$transaction(async (tx: any) => {
            let finalUserId = data.userId;

            // Handle external member User & Role creation within transaction
            if (isExternal && !data.siswaId && !data.guruId) {
                if (!data.email) throw new Error('Email is required for external member to create login credentials');
                if (!data.name) throw new Error('Full Name is required for external member');
                if (!data.phone) throw new Error('Phone Number is required for external member');

                const emailToUse = data.email.trim().toLowerCase();

                // 1. Check if email already exists in User table for this tenant
                const existingUser = await tx.user.findFirst({
                    where: { tenant_id: tenantId, email: emailToUse }
                });
                if (existingUser) {
                    throw new Error('Email is already registered in the system.');
                }

                // 2. Find or create the ANGGOTA_KOPERASI_EXTERNAL role in the current tenant
                let role = await tx.role.findFirst({
                    where: { tenant_id: tenantId, name: 'ANGGOTA_KOPERASI_EXTERNAL' }
                });

                if (!role) {
                    // If it doesn't exist, create it with baseline cooperative capabilities
                    role = await tx.role.create({
                        data: {
                            tenant_id: tenantId,
                            name: 'ANGGOTA_KOPERASI_EXTERNAL',
                            description: 'Anggota Koperasi Pihak Eksternal (akses terbatas)',
                            is_system: false
                        }
                    });

                    const defaultPerms = [
                        'core.auth.logout',
                        'core.sekolah.view.profile',
                        'dashboard.view.overview',
                        'cooperative.dashboard.view.overview',
                        'cooperative.announcements.view.list',
                        'cooperative.savings.view.history',
                        'cooperative.points.view',
                        'cooperative.store.view.catalog',
                        'cooperative.loans.apply',
                        'notify.view.my',
                        'notify.view.preferences',
                        'notify.update.preferences',
                        'documents.view.list',
                        'cooperative.savings.view.list',
                        'cooperative.savings.view.detail',
                        'cooperative.loans.view.list',
                        'cooperative.loans.view.detail'
                    ];

                    const validPerms = await tx.permission.findMany({
                        where: { id: { in: defaultPerms } },
                        select: { id: true }
                    });

                    if (validPerms.length > 0) {
                        await tx.rolePermission.createMany({
                            data: validPerms.map(p => ({
                                role_id: role.id,
                                permission_id: p.id
                            }))
                        });
                    }
                }

                // 3. Create the User account with a default password 'koperasi123'
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash('koperasi123', 10);

                const newUser = await tx.user.create({
                    data: {
                        tenant_id: tenantId,
                        email: emailToUse,
                        password: hashedPassword,
                        full_name: data.name.trim(),
                        no_hp: data.phone.trim(),
                        role_id: role.id,
                        status: 'ACTIVE'
                    }
                });

                finalUserId = newUser.id;
            }

            const member = await tx.member.create({
                data: {
                    tenantId,
                    memberNo: data.memberNo,
                    type: (data.type as MemberType) || 'STUDENT',
                    status: (data.status as MemberStatus) || 'ACTIVE',
                    siswaId: data.siswaId || null,
                    guruId: data.guruId || null,
                    userId: finalUserId || null,
                    pin: hashedPin
                }
            });

            // Auto-create default saving accounts for active categories for the new member
            await SavingCategoryService.ensureDefaultCategories(member.tenantId, tx);
            const categories = await tx.savingCategory.findMany({
                where: { tenantId: member.tenantId, isActive: true }
            });
            for (const category of categories) {
                await tx.saving.create({
                    data: {
                        memberId: member.id,
                        categoryId: category.id,
                        amount: 0
                    }
                });
            }

            return member;
        });
    }

    // Update member (Status, Type, & PIN)
    static async updateMember(id: string, tenantId: string, data: any) {
        const member = await this.getMemberById(id, { tenantId });
        if (!member) throw new Error('Member not found');

        // Note: Profile update (name, address) is forbidden here. 
        // Must update via Academic Module (Siswa/Guru).
        
        const updateData: any = {
            type: data.type as MemberType,
            status: data.status as MemberStatus,
            // Only allow updating linkage if necessary (rare case)
            siswaId: data.siswaId,
            guruId: data.guruId,
            userId: data.userId
        };

        if (data.pin) {
            if (!/^\d{6}$/.test(data.pin)) {
                throw new Error('PIN harus berupa 6 digit angka');
            }
            const bcrypt = require('bcrypt');
            updateData.pin = await bcrypt.hash(data.pin, 10);
        }
        
        return await prisma.member.update({
            where: { id },
            data: updateData
        });
    }

    // Delete member
    static async deleteMember(id: string, tenantId: string) {
        const member = await this.getMemberById(id, { tenantId });
        if (!member) throw new Error('Member not found');

        return await prisma.member.delete({
            where: { id }
        });
    }

    // Import bulk members from Excel data rows
    static async importBulkMembers(tenantId: string, rows: any[]) {
        const results = {
            successCount: 0,
            failCount: 0,
            errors: [] as { row: number; memberNo: string; error: string }[]
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;
            try {
                const type = String(row.type || '').trim().toUpperCase();
                const memberNo = String(row.memberNo || '').trim();
                const identityNo = String(row.identityNo || '').trim();

                if (!memberNo) throw new Error('Nomor Anggota (memberNo) wajib diisi');
                if (!type) throw new Error('Tipe (type) wajib diisi (SISWA / GURU)');
                if (!identityNo) throw new Error('Nomor Identitas (identityNo/NIS/NIP) wajib diisi');

                let siswaId: string | null = null;
                let guruId: string | null = null;
                let userId: string | null = null;

                if (type === 'STUDENT' || type === 'SISWA') {
                    const siswa = await prisma.siswa.findFirst({
                        where: { tenant_id: tenantId, nis: identityNo }
                    });
                    if (!siswa) throw new Error(`Siswa dengan NIS ${identityNo} tidak ditemukan`);
                    siswaId = siswa.id;
                    userId = siswa.user_id;
                } else if (type === 'TEACHER' || type === 'GURU') {
                    const guru = await prisma.guru.findFirst({
                        where: { tenant_id: tenantId, nip: identityNo }
                    });
                    if (!guru) throw new Error(`Guru dengan NIP ${identityNo} tidak ditemukan`);
                    guruId = guru.id;
                    userId = guru.user_id;
                } else {
                    throw new Error(`Tipe tidak dikenal: ${type}. Gunakan SISWA atau GURU`);
                }

                // Check if memberNo or Siswa/Guru is already a member to prevent error log pollution
                const existingNo = await prisma.member.findFirst({ where: { tenantId, memberNo } });
                if (existingNo) throw new Error(`Nomor Anggota ${memberNo} sudah digunakan`);

                if (siswaId) {
                    const existingSiswa = await prisma.member.findFirst({ where: { tenantId, siswaId } });
                    if (existingSiswa) throw new Error('Siswa ini sudah menjadi anggota');
                }
                if (guruId) {
                    const existingGuru = await prisma.member.findFirst({ where: { tenantId, guruId } });
                    if (existingGuru) throw new Error('Guru ini sudah menjadi anggota');
                }

                await this.createMember(tenantId, {
                    memberNo,
                    type: (type === 'SISWA' || type === 'STUDENT') ? 'STUDENT' : 'TEACHER',
                    siswaId,
                    guruId,
                    userId,
                    address: row.address || null,
                    phone: row.phone || null,
                    email: row.email || null,
                    status: 'ACTIVE'
                });

                results.successCount++;
            } catch (error: any) {
                results.failCount++;
                results.errors.push({
                    row: rowNum,
                    memberNo: row.memberNo || '-',
                    error: error.message || 'Error tidak diketahui'
                });
            }
        }

        return results;
    }

    // Terminate member (Withdraw all savings to 0 and deactivate status)
    static async terminateMember(id: string, tenantId: string, operatorUserId?: string) {
        // Fetch member with savings
        const member = await prisma.member.findFirst({
            where: { id, tenantId },
            include: {
                savings: {
                    include: {
                        category: true
                    }
                }
            }
        });
        if (!member) throw new Error('Member not found');
        if (member.status === 'INACTIVE') throw new Error('Member is already terminated/inactive');

        const payoutDetails = {
            pokok: 0,
            wajib: 0,
            sukarela: 0,
            total: 0,
            transactions: [] as any[]
        };

        // Run in Prisma transaction to ensure atomicity
        return await prisma.$transaction(async (tx: any) => {
            let totalOthers = 0;
            for (const saving of member.savings) {
                const balance = Number(saving.amount);
                if (balance > 0) {
                    const savingType = saving.category.code;
                    
                    // Create transaction record
                    const transaction = await tx.savingTransaction.create({
                        data: {
                            savingId: saving.id,
                            amount: balance,
                            type: 'WITHDRAWAL',
                            description: `Pengembalian Simpanan Penutupan Anggota (${saving.category.name})`
                        }
                    });

                    // Update Balance to 0
                    await tx.saving.update({
                        where: { id: saving.id },
                        data: { amount: 0 }
                    });

                    // Create journal entry using the same code
                    const { AccountingService } = require('../laporan/accounting.service');
                    const savingsAccountCode = saving.category.accountCode || '2010';
                    const journalItems = [
                        { accountCode: savingsAccountCode, type: 'DEBIT', amount: balance },
                        { accountCode: '1010', type: 'CREDIT', amount: balance }
                    ];

                    await AccountingService.createJournalEntry(
                        tenantId,
                        `WITHDRAWAL Tabungan Penutupan - ${saving.category.name} (${member.memberNo})`,
                        `SAV-${transaction.id}`,
                        journalItems,
                        tx
                    );

                    if (savingType === 'POKOK') payoutDetails.pokok = balance;
                    else if (savingType === 'WAJIB') payoutDetails.wajib = balance;
                    else if (savingType === 'SUKARELA') payoutDetails.sukarela = balance;
                    else totalOthers += balance;

                    payoutDetails.transactions.push(transaction);
                }
            }

            payoutDetails.total = payoutDetails.pokok + payoutDetails.wajib + payoutDetails.sukarela + totalOthers;

            // 2. Set Member Status to INACTIVE
            await tx.member.update({
                where: { id },
                data: { status: 'INACTIVE' }
            });

            return payoutDetails;
        });
    }

    // Get students or teachers not in the Member table
    static async getNonMembers(tenantId: string, type: 'STUDENT' | 'TEACHER', params: { search?: string; kelasId?: string }) {
        const search = params.search || '';
        const kelasId = params.kelasId || 'ALL';

        if (type === 'STUDENT') {
            const whereClause: any = {
                tenant_id: tenantId,
                Member: null
            };

            if (search) {
                whereClause.nama_siswa = { contains: search, mode: 'insensitive' };
            }

            if (kelasId && kelasId !== 'ALL') {
                whereClause.kelas_id = kelasId;
            }

            const students = await prisma.siswa.findMany({
                where: whereClause,
                include: {
                    Kelas: {
                        select: {
                            nama_kelas: true
                        }
                    }
                },
                orderBy: {
                    nama_siswa: 'asc'
                }
            });

            return students.map(s => ({
                id: s.id,
                name: s.nama_siswa,
                identityNo: s.nis || '-',
                className: s.Kelas?.nama_kelas || '-',
                userId: s.user_id,
                email: s.email || '-',
                phone: s.no_hp || '-',
                address: s.alamat || '-'
            }));
        } else {
            const whereClause: any = {
                tenant_id: tenantId,
                Member: null
            };

            if (search) {
                whereClause.nama_guru = { contains: search, mode: 'insensitive' };
            }

            const teachers = await prisma.guru.findMany({
                where: whereClause,
                orderBy: {
                    nama_guru: 'asc'
                }
            });

            return teachers.map(t => ({
                id: t.id,
                name: t.nama_guru,
                identityNo: t.nip || '-',
                className: 'GURU / STAF',
                userId: t.user_id,
                email: t.email || '-',
                phone: t.no_hp || '-',
                address: t.alamat || '-'
            }));
        }
    }

    // Create cooperative members in bulk with Rp 0 active saving accounts
    static async createBulkMembers(tenantId: string, type: 'STUDENT' | 'TEACHER', ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('List of IDs cannot be empty');
        }

        const bcrypt = require('bcrypt');
        const defaultHashedPin = await bcrypt.hash('123456', 10);

        return await prisma.$transaction(async (tx) => {
            // Ensure default categories exist
            await SavingCategoryService.ensureDefaultCategories(tenantId, tx);

            // Find current max member number inside transaction to avoid race conditions
            const members = await tx.member.findMany({
                where: { tenantId },
                select: { memberNo: true }
            });

            let maxNum = 0;
            for (const m of members) {
                const num = parseInt(m.memberNo, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }

            let nextNum = maxNum + 1;
            const createdCount = ids.length;

            for (const id of ids) {
                const memberNo = String(nextNum).padStart(3, '0');
                let siswaId: string | null = null;
                let guruId: string | null = null;
                let userId: string | null = null;

                if (type === 'STUDENT') {
                    const student = await tx.siswa.findUnique({ where: { id } });
                    if (!student) throw new Error(`Siswa dengan ID ${id} tidak ditemukan`);
                    
                    // Check if already member
                    const existing = await tx.member.findFirst({ where: { tenantId, siswaId: id } });
                    if (existing) {
                        const sName = student.nama_siswa || id;
                        throw new Error(`Siswa "${sName}" sudah terdaftar sebagai anggota koperasi`);
                    }

                    siswaId = id;
                    userId = student.user_id;
                } else {
                    const teacher = await tx.guru.findUnique({ where: { id } });
                    if (!teacher) throw new Error(`Guru dengan ID ${id} tidak ditemukan`);

                    // Check if already member
                    const existing = await tx.member.findFirst({ where: { tenantId, guruId: id } });
                    if (existing) {
                        const tName = teacher.nama_guru || id;
                        throw new Error(`Guru "${tName}" sudah terdaftar sebagai anggota koperasi`);
                    }

                    guruId = id;
                    userId = teacher.user_id;
                }

                // Create member
                const newMember = await tx.member.create({
                    data: {
                        tenantId,
                        memberNo,
                        type: type,
                        status: 'ACTIVE',
                        siswaId,
                        guruId,
                        userId,
                        pin: defaultHashedPin
                    }
                });

                // Initialize savings accounts for active categories
                const categories = await tx.savingCategory.findMany({
                    where: { tenantId, isActive: true }
                });

                for (const category of categories) {
                    await tx.saving.create({
                        data: {
                            memberId: newMember.id,
                            categoryId: category.id,
                            amount: 0
                        }
                    });
                }

                nextNum++; // Increment the memberNo sequence for the next member
            }

            return { success: true, count: createdCount };
        });
    }
}
