// @ts-nocheck
import { JadwalQueryController } from './sub/jadwal-query.controller';
import { JadwalCrudController } from './sub/jadwal-crud.controller';
import { JadwalExcelController } from './sub/jadwal-excel.controller';

export class JadwalKBMController {
  private query = new JadwalQueryController();
  private crud = new JadwalCrudController();
  private excel = new JadwalExcelController();

  async list(...args: any[]) { return (this.query as any).list(...args); }
  async listMySchedule(...args: any[]) { return (this.query as any).listMySchedule(...args); }
  async listGuru(...args: any[]) { return (this.query as any).listGuru(...args); }
  async listAuthorized(...args: any[]) { return (this.query as any).listAuthorized(...args); }
  async listAdmin(...args: any[]) { return (this.query as any).listAdmin(...args); }
  async getDetail(...args: any[]) { return (this.query as any).getDetail(...args); }

  async syncSessionsToday(...args: any[]) { return (this.crud as any).syncSessionsToday(...args); }
  async resolveTimes(...args: any[]) { return (this.crud as any).resolveTimes(...args); }
  async resolveSlotIndex(...args: any[]) { return (this.crud as any).resolveSlotIndex(...args); }
  async create(...args: any[]) { return (this.crud as any).create(...args); }
  async update(...args: any[]) { return (this.crud as any).update(...args); }
  async delete(...args: any[]) { return (this.crud as any).delete(...args); }
  async clearAll(...args: any[]) { return (this.crud as any).clearAll(...args); }

  async getImportTemplate(...args: any[]) { return (this.excel as any).getImportTemplate(...args); }
  async importFromExcel(...args: any[]) { return (this.excel as any).importFromExcel(...args); }
  async autoGeneratePreview(...args: any[]) { return (this.excel as any).autoGeneratePreview(...args); }
  async autoGenerateApply(...args: any[]) { return (this.excel as any).autoGenerateApply(...args); }
}

export const jadwalKBMController = new JadwalKBMController();
