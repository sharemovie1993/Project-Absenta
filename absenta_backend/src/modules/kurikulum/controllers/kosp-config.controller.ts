import { KospConfigService } from '../services/kosp-config.service';

export class KospConfigController {
  static async getByTahun(req: any, reply: any) {
    try {
      const user = req.user;
      const { tahun_pelajaran_id } = req.query as { tahun_pelajaran_id?: string };

      if (!user?.tenant_id) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      if (!tahun_pelajaran_id) {
        return reply.status(400).send({ success: false, message: 'tahun_pelajaran_id wajib disertakan' });
      }

      const config = await KospConfigService.getByTahun(user.tenant_id, tahun_pelajaran_id);
      return reply.send({ success: true, data: config });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, message: err.message || 'Gagal mengambil KOSP config' });
    }
  }

  static async upsert(req: any, reply: any) {
    try {
      const user = req.user;
      const body = req.body as {
        tahun_pelajaran_id: string;
        visi?: string;
        misi?: string;
        karakteristik?: string;
        halaman_html?: string;
        config?: string;
      };

      if (!user?.tenant_id) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      if (!body.tahun_pelajaran_id) {
        return reply.status(400).send({ success: false, message: 'tahun_pelajaran_id wajib disertakan' });
      }

      const updatedConfig = await KospConfigService.upsert(user.tenant_id, body);
      return reply.send({ success: true, data: updatedConfig });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, message: err.message || 'Gagal menyimpan KOSP config' });
    }
  }
}
