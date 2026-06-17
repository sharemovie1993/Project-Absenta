import { LoanService } from '../services/loan.service';

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
  dataScope?: any;
}

export class LoanController {
  async getLoans(request: AuthenticatedRequest, reply: any) {
    try {
      const { page, limit, status, peminjam_id, asset_id } = request.query;
      const data = await LoanService.getLoans(request.tenantId!, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        peminjam_id: peminjam_id as string,
        asset_id: asset_id as string
      }, request.dataScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async requestLoan(request: AuthenticatedRequest, reply: any) {
    try {
      const userId = (request.user as any).id || (request.user as any).userId;
      const body = { ...request.body };
      if (body.tanggal_kembali_plan) {
         body.tanggal_kembali_plan = new Date(body.tanggal_kembali_plan);
      }
      const data = await LoanService.requestLoan(request.tenantId!, userId, body);
      return reply.status(201).send({ success: true, message: 'Permohonan pinjaman berhasil dikirim', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateStatus(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const { status, condition_on_return, return_catatan } = request.body;
      const approverId = (request.user as any).id || (request.user as any).userId;
      
      const data = await LoanService.updateLoanStatus(request.tenantId!, approverId, id, status, {
        condition_on_return,
        return_catatan
      }, request.dataScope);
      
      return reply.status(200).send({ success: true, message: `Status pinjaman diperbarui menjadi ${status}`, data });
    } catch (error: any) {
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
