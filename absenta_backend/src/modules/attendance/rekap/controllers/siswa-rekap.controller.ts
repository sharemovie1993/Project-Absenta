import { siswaRekapService } from '../services/siswa-rekap.service';

export class SiswaRekapController {
  private static instance: SiswaRekapController;

  public static getInstance(): SiswaRekapController {
    if (!SiswaRekapController.instance) {
      SiswaRekapController.instance = new SiswaRekapController();
    }
    return SiswaRekapController.instance;
  }

  async getRekapHarianSiswa(req: any, reply: any) {
    try {
      const { siswa_id } = req.params as { siswa_id: string };
      const { tanggal, tahun_pelajaran_id } = req.query as { tanggal: string; tahun_pelajaran_id?: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await siswaRekapService.getRekapHarianSiswa(siswa_id, tanggal, tenantId, tahun_pelajaran_id);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getRekapBulananSiswa(req: any, reply: any) {
    try {
      const { siswa_id } = req.params as { siswa_id: string };
      const { bulan, tahun_pelajaran_id } = req.query as { bulan: string; tahun_pelajaran_id?: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await siswaRekapService.getRekapBulananSiswa(siswa_id, bulan, tenantId, tahun_pelajaran_id);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getTrackingHarianSiswa(req: any, reply: any) {
    try {
      const { siswa_id } = req.params as { siswa_id: string };
      const { tanggal } = req.query as { tanggal: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await siswaRekapService.getTrackingHarianSiswa(siswa_id, tanggal, tenantId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }
}

export const siswaRekapController = SiswaRekapController.getInstance();
