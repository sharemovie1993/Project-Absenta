// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SetupService } from './setup.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';

export default async function setupRoutes(fastify: FastifyInstance) {
  const getTenantId = (req: any) => {
    return req.dataScope?.tenantId || req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
  };

  const getOperatorId = (req: any) => {
    return req.user?.id || 'OPERATOR';
  };

  /**
   * GET /cooperative/setup/status
   * Memeriksa status kesiapan onboarding (360 derajat)
   */
  fastify.get(
    '/status',
    {
      preHandler: [
        requireCapability([
          'cooperative.setup.view',
          'cooperative.setup.manage',
          'cooperative.dashboard.view.overview',
          'cooperative.settings.view',
        ]),
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const status = await SetupService.getSetupStatus(tenantId);
        return reply.send({ success: true, data: status });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/mode
   * Menetapkan pilihan Mode Setup (NEW, ANNUAL_TRANSITION, MID_YEAR_CUTOFF)
   */
  fastify.post(
    '/mode',
    {
      preHandler: [requireCapability('cooperative.setup.manage')],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = getOperatorId(req);
        const { mode, cutoffDate } = req.body as {
          mode: 'NEW' | 'ANNUAL_TRANSITION' | 'MID_YEAR_CUTOFF';
          cutoffDate?: string;
        };

        if (!mode || !['NEW', 'ANNUAL_TRANSITION', 'MID_YEAR_CUTOFF'].includes(mode)) {
          return reply.status(400).send({
            success: false,
            message: 'Mode setup tidak valid. Pilih NEW, ANNUAL_TRANSITION, atau MID_YEAR_CUTOFF.',
          });
        }

        const result = await SetupService.setSetupMode(tenantId, mode, cutoffDate, operatorId);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/initialize-coa
   * Inisialisasi Otomatis Bagan Akun (COA) Standar SAK ETAP
   */
  fastify.post(
    '/initialize-coa',
    {
      preHandler: [requireCapability('cooperative.setup.manage')],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const result = await SetupService.initializeCoa(tenantId);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/opening-balance
   * Posting Jurnal Saldo Awal Konsolidasi (Double-Entry Balance Enforced)
   * Wewenang eksklusif Bendahara & Ketua Koperasi (Admin IT/Sekolah dibatasi urusan uang)
   */
  fastify.post(
    '/opening-balance',
    {
      preHandler: [requireCapability('cooperative.setup.manage')],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = getOperatorId(req);
        const body = req.body as any;

        if (!body.entries || !Array.isArray(body.entries)) {
          return reply.status(400).send({
            success: false,
            message: 'Format payload tidak valid. Membutuhkan array entries.',
          });
        }

        const result = await SetupService.postOpeningBalance(
          tenantId,
          {
            mode: body.mode || 'ANNUAL_TRANSITION',
            cutoffDate: body.cutoffDate || new Date().toISOString().split('T')[0],
            entries: body.entries,
            notes: body.notes,
          },
          operatorId
        );

        return reply.send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(400).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/import-subledger
   * Impor Massal Sub-Ledger (Anggota + Saldo Awal Simpanan + Pinjaman Berjalan)
   */
  fastify.post(
    '/import-subledger',
    {
      preHandler: [requireCapability(['cooperative.setup.manage', 'cooperative.members.manage'])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = getOperatorId(req);
        const body = req.body as any;

        const members = Array.isArray(body.members) ? body.members : Array.isArray(body) ? body : [];
        if (members.length === 0) {
          return reply.status(400).send({
            success: false,
            message: 'Data anggota untuk impor subledger tidak boleh kosong.',
          });
        }

        const result = await SetupService.importSubledger(tenantId, members, operatorId);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/complete
   * Menyelesaikan seluruh tahapan setup & mengaktifkan status operasional koperasi
   */
  fastify.post(
    '/complete',
    {
      preHandler: [requireCapability('cooperative.setup.manage')],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = getOperatorId(req);
        const result = await SetupService.completeSetup(tenantId, operatorId);
        return reply.send({ success: true, data: result, message: 'Setup koperasi berhasil diselesaikan!' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  /**
   * POST /cooperative/setup/reset-simulation-data
   * Membersihkan data simulasi / uji coba koperasi (Khusus Bendahara / Ketua Koperasi)
   */
  fastify.post(
    '/reset-simulation-data',
    {
      preHandler: [requireCapability('cooperative.setup.manage')],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = getTenantId(req);
        const operatorId = getOperatorId(req);
        const options = (req.body as any) || {};

        const result = await SetupService.resetSimulationData(tenantId, options, operatorId);
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );
}
