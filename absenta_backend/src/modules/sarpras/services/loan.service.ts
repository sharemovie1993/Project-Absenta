import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { activityLogService } from '../../activity/services/activity-log.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export class LoanService {
  static async requestLoan(tenantId: string, userId: string, data: {
    asset_id: string;
    peminjam_id?: string;
    tanggal_kembali_plan?: Date;
    catatan?: string;
  }) {
    // 1. Check asset availability
    const asset = await prisma.sarprasAsset.findFirst({
      where: { id: data.asset_id, tenant_id: tenantId, deleted_at: null }
    });

    if (!asset) throw new Error('Asset not found');
    if (!asset.is_loanable) throw new Error('Asset is not loanable');
    if (asset.kondisi === 'RUSAK') throw new Error('Asset is damaged');

    // 2. Check current active loans for this asset
    const activeLoansCount = await prisma.sarprasLoan.count({
      where: {
        asset_id: data.asset_id,
        status: { in: ['APPROVED', 'ACTIVE'] }
      }
    });

    if (activeLoansCount >= asset.jumlah) {
      throw new Error('Asset is fully loaned out');
    }

    // 3. Create request
    const loan = await prisma.sarprasLoan.create({
      data: {
        tenant_id: tenantId,
        asset_id: data.asset_id,
        peminjam_id: data.peminjam_id || userId,
        status: 'PENDING',
        tanggal_kembali_plan: data.tanggal_kembali_plan,
        catatan: data.catatan
      }
    });

    activityLogService.logEvent({
      event_type: 'SARPRAS_LOAN_REQUEST',
      tenant_id: tenantId,
      user_id: userId,
      entity: 'SarprasLoan',
      entity_id: loan.id,
      metadata: { asset_id: data.asset_id, asset_nama: asset.nama }
    });

    await cacheInvalidationService.invalidateSarprasCache(tenantId);
    return loan;
  }

  static async updateLoanStatus(tenantId: string, approverId: string, loanId: string, status: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'RETURNED', data?: {
    condition_on_return?: string;
    return_catatan?: string;
  }, scope?: any) {
    const loan = await prisma.sarprasLoan.findFirst({
      where: { id: loanId, tenant_id: tenantId },
      include: { Asset: { include: { Location: true } } }
    });

    if (!loan) throw new Error('Loan not found');

    // Stock check when approving or activating a loan that wasn't approved/active before
    if ((status === 'APPROVED' || status === 'ACTIVE') && !['APPROVED', 'ACTIVE'].includes(loan.status)) {
      const activeLoansCount = await prisma.sarprasLoan.count({
        where: {
          asset_id: loan.asset_id,
          status: { in: ['APPROVED', 'ACTIVE'] }
        }
      });

      if (activeLoansCount >= loan.Asset.jumlah) {
        throw new Error('Aset sudah sepenuhnya dipinjam (stok tidak mencukupi)');
      }
    }

    if (scope && !scope.tenant_wide) {
      if (loan.Asset.Location?.unit_id && (!scope.unit_ids || !scope.unit_ids.includes(loan.Asset.Location.unit_id))) {
        throw new Error('Anda tidak memiliki akses untuk menyetujui peminjaman aset ini');
      }
    }
    const updateData: any = { status };

    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.approver_id = approverId;
    }

    if (status === 'ACTIVE' && loan.status !== 'APPROVED') {
      throw new Error('Loan must be approved before being active');
    }

    if (status === 'RETURNED') {
      updateData.actual_return_date = new Date();
      updateData.condition_on_return = data?.condition_on_return || 'BAIK';
      updateData.return_catatan = data?.return_catatan;
      
      // Optionally update asset condition if returned as DAMAGED
      if (data?.condition_on_return === 'RUSAK') {
        await prisma.sarprasAsset.update({
          where: { id: loan.asset_id },
          data: { kondisi: 'RUSAK' }
        });
      }
    }

    const updatedLoan = await prisma.sarprasLoan.update({
      where: { id: loanId },
      data: updateData
    });

    activityLogService.logEvent({
      event_type: 'SARPRAS_LOAN_STATUS_UPDATE',
      tenant_id: tenantId,
      user_id: approverId,
      entity: 'SarprasLoan',
      entity_id: loanId,
      metadata: { status, asset_id: loan.asset_id, asset_nama: loan.Asset.nama }
    });

    await cacheInvalidationService.invalidateSarprasCache(tenantId);
    return updatedLoan;
  }

  static async getLoans(tenantId: string, query: {
    page?: number;
    limit?: number;
    status?: string;
    peminjam_id?: string;
    asset_id?: string;
  }, scope?: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SarprasLoanWhereInput = {
      tenant_id: tenantId
    };

    if (query.status) where.status = query.status;
    if (query.peminjam_id) where.peminjam_id = query.peminjam_id;
    if (query.asset_id) where.asset_id = query.asset_id;

    if (scope && !scope.tenant_wide) {
      if (scope.unit_ids && scope.unit_ids.length > 0) {
        where.Asset = {
          Location: {
            unit_id: { in: scope.unit_ids }
          }
        };
      } else {
        return { list: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
    }

    const [total, list] = await Promise.all([
      prisma.sarprasLoan.count({ where }),
      prisma.sarprasLoan.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Asset: true,
          Peminjam: { select: { id: true, full_name: true } },
          Approver: { select: { id: true, full_name: true } }
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async scanUser(tenantId: string, code: string) {
    const cand = String(code || '').trim();
    if (!cand) return null;

    // Safely check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(cand);
    const candUpper = cand.toUpperCase();

    const siswaOrConditions: any[] = [
      { nis: cand },
      { nisn: cand },
      { no_rfid: candUpper },
      { no_rfid: cand }
    ];
    if (isUuid) siswaOrConditions.push({ id: cand });

    const siswa = await prisma.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'AKTIF',
        OR: siswaOrConditions
      },
      select: { user_id: true, nama_siswa: true, nis: true }
    });

    if (siswa && siswa.user_id) {
      return { id: siswa.user_id, full_name: siswa.nama_siswa, identity_code: siswa.nis || cand, entity: 'Siswa' };
    }

    const guruOrConditions: any[] = [
      { nip: cand },
      { no_rfid: candUpper },
      { no_rfid: cand }
    ];
    if (isUuid) guruOrConditions.push({ id: cand });

    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: guruOrConditions
      },
      select: { user_id: true, nama_guru: true, nip: true }
    });

    if (guru && guru.user_id) {
      return { id: guru.user_id, full_name: guru.nama_guru, identity_code: guru.nip || cand, entity: 'Guru' };
    }

    const userOrConditions: any[] = [{ email: cand }];
    if (isUuid) userOrConditions.push({ id: cand });

    const user = await prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        OR: userOrConditions
      },
      select: { id: true, email: true, full_name: true }
    });

    if (user) {
      return { id: user.id, full_name: user.full_name || user.email, identity_code: user.email, entity: 'Staff' };
    }

    return null;
  }
}
