import { parentDataService } from '../services/parent-data.service';
import { systemConfigService } from '../../system-config/services/system-config.service';
import { gerbangService } from '@/modules/attendance/gerbang/services/gerbang.service';
import { RaporService } from '../../rapor/services/rapor.service';
import { P5Service } from '../../rapor/services/p5.service';

export class ParentAppController {
  private async isFeatureEnabled(tenantId: string, action: string): Promise<boolean> {
    if (process.env.PARENT_APP_DISABLED === 'true') {
      console.warn(
        `[ParentApp][FeatureDisabled] Global Parent App disabled | tenant=${tenantId} | action=${action}`
      );
      return false;
    }

    const normalized = action.toUpperCase().replace(/\./g, '_');
    const envKey = `PARENT_APP_DISABLE_${normalized}`;
    const flag = process.env[envKey];
    if (flag === 'true') {
      console.warn(
        `[ParentApp][FeatureDisabled] Action disabled via env flag ${envKey} | tenant=${tenantId} | action=${action}`
      );
      return false;
    }

    try {
      const config = await systemConfigService.getActive(tenantId);
      if (!config) {
        return true;
      }

      const cfg: any = config;

      if (cfg.parent_app_enabled === false) {
        console.warn(
          `[ParentApp][FeatureDisabled] Disabled by SystemConfig.parent_app_enabled=false | tenant=${tenantId} | action=${action}`
        );
        return false;
      }

      const fieldMap: Record<string, string> = {
        'external.parent.view.dashboard': 'parent_app_dashboard_enabled',
        'external.parent.view.attendance_history': 'parent_app_attendance_history_enabled',
        'external.parent.view.notifications': 'parent_app_notifications_enabled',
        'external.parent.view.monthly_recap': 'parent_app_monthly_recap_enabled',
        'external.parent.view.daily_tracking': 'parent_app_daily_tracking_enabled',
        'external.parent.report.absence': 'parent_app_report_absence_enabled',
      };

      const field = fieldMap[action];
      if (!field) {
        return true;
      }

      const value = cfg[field];
      if (value === false) {
        console.warn(
          `[ParentApp][FeatureDisabled] Disabled by SystemConfig.${field}=false | tenant=${tenantId} | action=${action}`
        );
        return false;
      }
    } catch (error) {
      console.error(
        '[ParentApp][FeatureCheckError] Error while resolving feature flags',
        { tenantId, action, error }
      );
    }

    return true;
  }

  private async logActivity(tenantId: string, action: string, entityId: string | null, metadata?: any) {
    try {
      await parentDataService.logParentAppActivity(tenantId, action, entityId, metadata);
    } catch (error) {
      console.error('Failed to log parent app activity:', error);
    }
  }

  // POST /siswa/:id/lapor-absen
  async reportAbsence(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (!(await this.isFeatureEnabled(parent.tenant_id, 'external.parent.report.absence'))) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }
      const { id: siswaId } = request.params;
      const { status, keterangan } = request.body;

      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      if (!['SAKIT', 'IZIN'].includes(status)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid status. Only SAKIT and IZIN are allowed for parent reporting.',
        });
      }

      const result = await gerbangService.markManualAbsence(
        String(parent.tenant_id),
        String(siswaId),
        String(status),
        String(parent.id),
        'PARENT_APP',
        keterangan,
      );

      await this.logActivity(parent.tenant_id, 'external.parent.report.absence', siswaId, {
        source: 'PARENT_APP',
        parentId: parent.id,
        studentId: siswaId,
        status,
        hasNote: !!keterangan,
      });

      return reply.status(200).send(result);
    } catch (error: any) {
      console.error('PARENT REPORT ABSENCE ERROR:', error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /me
  async getDashboard(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (!(await this.isFeatureEnabled(parent.tenant_id, 'external.parent.view.dashboard'))) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }

      console.log('--- PARENT AUTH DEBUG START ---');
      console.log('Using parent from guard:', {
        parentId: parent.id,
        parentName: parent.nama,
        email: parent.email,
      });

      const dashboardData = await parentDataService.getDashboardData(parent.id);

      const children = Array.isArray(parent.OrangTuaSiswa)
        ? parent.OrangTuaSiswa.map((link: any) => link.Siswa?.id).filter(Boolean)
        : [];

      await this.logActivity(parent.tenant_id, 'external.parent.view.dashboard', parent.id, {
        source: 'PARENT_APP',
        parentId: parent.id,
        childrenCount: children.length,
        childrenIds: children,
      });

      return reply.send({
        success: true,
        data: dashboardData,
      });
    } catch (error: any) {
      console.error('PARENT AUTH ERROR:', error);
      console.error('ERROR MESSAGE:', error.message);

      return reply.status(401).send({
        success: false,
        message: error.message || 'Authentication failed',
      });
    }
  }

  // GET /siswa/:id/riwayat-kehadiran
  async getAttendanceHistory(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (
        !(await this.isFeatureEnabled(
          parent.tenant_id,
          'external.parent.view.attendance_history'
        ))
      ) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }

      const { id: siswaId } = request.params;
      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const { page, limit } = request.query;
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;
      const history = await parentDataService.getAttendanceHistory(siswaId, pageNum, limitNum);

      await this.logActivity(
        parent.tenant_id,
        'external.parent.view.attendance_history',
        siswaId,
        {
          source: 'PARENT_APP',
          parentId: parent.id,
          studentId: siswaId,
          page: pageNum,
          limit: limitNum,
        }
      );

      return reply.send({
        success: true,
        data: history,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /siswa/:id/notifikasi
  async getNotifications(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (!(await this.isFeatureEnabled(parent.tenant_id, 'external.parent.view.notifications'))) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }

      const { id: siswaId } = request.params;
      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const { page, limit } = request.query;
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;
      const notifs = await parentDataService.getNotifications(siswaId, pageNum, limitNum);

      await this.logActivity(
        parent.tenant_id,
        'external.parent.view.notifications',
        siswaId,
        {
          source: 'PARENT_APP',
          parentId: parent.id,
          studentId: siswaId,
          page: pageNum,
          limit: limitNum,
        }
      );

      return reply.send({
        success: true,
        data: notifs,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /siswa/:id/rekap-bulanan
  async getMonthlyRecap(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (!(await this.isFeatureEnabled(parent.tenant_id, 'external.parent.view.monthly_recap'))) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }

      const { id: siswaId } = request.params;
      const { bulan } = request.query;

      if (!bulan) {
        return reply
          .status(400)
          .send({ success: false, message: 'Parameter bulan (YYYY-MM) is required' });
      }

      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const data = await parentDataService.getMonthlyRecap(siswaId, String(bulan));

      await this.logActivity(
        parent.tenant_id,
        'external.parent.view.monthly_recap',
        siswaId,
        {
          source: 'PARENT_APP',
          parentId: parent.id,
          studentId: siswaId,
          month: String(bulan),
        }
      );

      return reply.send({
        success: true,
        data,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /siswa/:id/tracking-harian
  async getDailyTracking(request: any, reply: any) {
    try {
      const parent = request.parent;
      if (!(await this.isFeatureEnabled(parent.tenant_id, 'external.parent.view.daily_tracking'))) {
        return reply.status(403).send({
          success: false,
          message: 'Parent App feature is disabled for this tenant',
        });
      }

      const { id: siswaId } = request.params;
      const { tanggal } = request.query;

      if (!tanggal) {
        return reply
          .status(400)
          .send({ success: false, message: 'Parameter tanggal (YYYY-MM-DD) is required' });
      }

      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const data = await parentDataService.getDailyTracking(siswaId, String(tanggal));

      await this.logActivity(
        parent.tenant_id,
        'external.parent.view.daily_tracking',
        siswaId,
        {
          source: 'PARENT_APP',
          parentId: parent.id,
          studentId: siswaId,
          date: String(tanggal),
        }
      );

      return reply.send({
        success: true,
        data,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /siswa/:id/rapor
  async getRapor(request: any, reply: any) {
    try {
      const parent = request.parent;
      const { id: siswaId } = request.params;
      const { tahun_pelajaran_id, semester_id } = request.query;

      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter tahun_pelajaran_id dan semester_id wajib disertakan',
        });
      }

      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const result = await RaporService.getRaporDetail(parent.tenant_id, {
        siswa_id: siswaId,
        tahun_pelajaran_id,
        semester_id,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // GET /siswa/:id/p5
  async getP5(request: any, reply: any) {
    try {
      const parent = request.parent;
      const { id: siswaId } = request.params;

      const isLinked = parent.OrangTuaSiswa?.some(
        (link: any) => link.Siswa?.id === siswaId && link.Siswa?.status === 'AKTIF'
      );

      if (!isLinked) {
        return reply.status(403).send({ success: false, message: 'Access denied for this student' });
      }

      const result = await P5Service.getNilai(parent.tenant_id, {
        siswa_id: siswaId,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const parentAppController = new ParentAppController();
