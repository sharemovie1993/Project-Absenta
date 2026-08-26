// @ts-nocheck
import { NilaiJenisService } from './sub/nilai-jenis.service';
import { NilaiCrudService } from './sub/nilai-crud.service';
import { NilaiExcelService } from './sub/nilai-excel.service';

export class NilaiService {
  static async getAllJenis(...args: any[]) { return NilaiJenisService.getAllJenis(...args); }
  static async createJenis(...args: any[]) { return NilaiJenisService.createJenis(...args); }
  static async updateJenis(...args: any[]) { return NilaiJenisService.updateJenis(...args); }
  static async deleteJenis(...args: any[]) { return NilaiJenisService.deleteJenis(...args); }

  static async getNilai(...args: any[]) { return NilaiCrudService.getNilai(...args); }
  static async upsertNilai(...args: any[]) { return NilaiCrudService.upsertNilai(...args); }
  static async upsertBulkNilai(...args: any[]) { return NilaiCrudService.upsertBulkNilai(...args); }
  static async upsertBatchSumatifNilai(...args: any[]) { return NilaiCrudService.upsertBatchSumatifNilai(...args); }
  static async getTeacherProgress(...args: any[]) { return NilaiCrudService.getTeacherProgress(...args); }

  static async exportErafor(...args: any[]) { return NilaiExcelService.exportErafor(...args); }
  static async exportEraporKemendikbud(...args: any[]) { return NilaiExcelService.exportEraporKemendikbud(...args); }
  static async importNilaiExcel(...args: any[]) { return NilaiExcelService.importNilaiExcel(...args); }
  static async generateImportTemplateExcel(...args: any[]) { return NilaiExcelService.generateImportTemplateExcel(...args); }
}
