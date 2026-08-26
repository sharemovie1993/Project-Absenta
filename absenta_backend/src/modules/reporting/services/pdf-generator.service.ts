// @ts-nocheck
import { PdfAcademicService } from './sub/pdf-academic.service';
import { PdfFinancialService } from './sub/pdf-financial.service';
import { PdfKesiswaanService } from './sub/pdf-kesiswaan.service';

export class PdfGeneratorService {
  static async generateCertificatePdf(...args: any[]) { return PdfAcademicService.generateCertificatePdf(...args); }
  static async generateSupervisionPdf(...args: any[]) { return PdfAcademicService.generateSupervisionPdf(...args); }
  static async renderHtmlToPdf(...args: any[]) { return PdfAcademicService.renderHtmlToPdf(...args); }

  static async generateInvoicePdf(...args: any[]) { return PdfFinancialService.generateInvoicePdf(...args); }

  static async generateIzinKeluarPdf(...args: any[]) { return PdfKesiswaanService.generateIzinKeluarPdf(...args); }
  static async generateKesiswaanBulananPdf(...args: any[]) { return PdfKesiswaanService.generateKesiswaanBulananPdf(...args); }
}
