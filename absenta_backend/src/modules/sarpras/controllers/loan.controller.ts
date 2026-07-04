import { LoanService } from '../services/loan.service';
import { authorizationService } from '../../auth/services/authorization.service';
import { z } from 'zod';
import { sarprasLoanRequestSchema, sarprasLoanStatusSchema } from '../services/sarpras.schema';

interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    tenantId: string | null;
    role: string;
  };
  tenantId: string | null;
  params: any;
  query: any;
  body: any;
  organizationalScope?: any;
}

export class LoanController {
  async getLoans(request: AuthenticatedRequest, reply: any) {
    try {
      const { page, limit, status, peminjam_id, asset_id } = request.query;
      const userId = request.user.id || (request.user as any).userId;

      // Check if user has capability to manage loans
      const authCheck = await authorizationService.isUserAuthorized(String(userId), ['sarpras.loans.manage'], { user: request.user });
      
      let targetPeminjamId = peminjam_id as string;
      if (!authCheck.allowed) {
        // Regular user (GURU/SISWA) can only view their own loans
        targetPeminjamId = userId;
      }

      const data = await LoanService.getLoans(request.tenantId!, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        peminjam_id: targetPeminjamId,
        asset_id: asset_id as string
      }, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async requestLoan(request: AuthenticatedRequest, reply: any) {
    try {
      const parsed = sarprasLoanRequestSchema.parse(request.body);
      const userId = (request.user as any).id || (request.user as any).userId;
      
      // Security: if user is not a manager, they cannot request on behalf of others
      const targetPeminjamId = parsed.peminjam_id || userId;
      if (targetPeminjamId !== userId) {
        const authCheck = await authorizationService.isUserAuthorized(String(userId), ['sarpras.loans.manage'], { user: request.user });
        if (!authCheck.allowed) {
          return reply.status(403).send({ success: false, message: 'Anda tidak memiliki hak akses untuk mengajukan pinjaman atas nama orang lain' });
        }
      }

      const body = {
        asset_id: parsed.asset_id,
        peminjam_id: targetPeminjamId,
        tanggal_kembali_plan: parsed.tanggal_kembali_plan,
        catatan: parsed.catatan
      };

      const data = await LoanService.requestLoan(request.tenantId!, userId, body);
      return reply.status(201).send({ success: true, message: 'Permohonan pinjaman berhasil dikirim', data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, message: error.errors.map(e => e.message).join(', '), errors: error.errors });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateStatus(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const parsed = sarprasLoanStatusSchema.parse(request.body);
      const approverId = (request.user as any).id || (request.user as any).userId;
      
      const data = await LoanService.updateLoanStatus(request.tenantId!, approverId, id, parsed.status, {
        condition_on_return: parsed.condition_on_return || undefined,
        return_catatan: parsed.return_catatan || undefined
      }, request.organizationalScope);
      
      return reply.status(200).send({ success: true, message: `Status pinjaman diperbarui menjadi ${parsed.status}`, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, message: error.errors.map(e => e.message).join(', '), errors: error.errors });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async scanUser(request: AuthenticatedRequest, reply: any) {
    try {
      const { code } = request.query;
      if (!code) {
        return reply.status(400).send({ success: false, message: 'Code is required' });
      }
      const data = await LoanService.scanUser(request.tenantId!, code);
      if (!data) {
        return reply.status(404).send({ success: false, message: 'Pengguna tidak ditemukan' });
      }
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
