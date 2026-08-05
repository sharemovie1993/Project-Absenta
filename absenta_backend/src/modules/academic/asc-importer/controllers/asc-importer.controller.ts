import { AscImporterService, ExecuteAscImportInput } from '../services/asc-importer.service';

export class AscImporterController {
  static async analyze(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.user?.tenantId;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, message: 'File XML aSc TimeTables wajib diunggah' });
    }

    const xmlBuffer = await data.toBuffer();
    const xmlContent = xmlBuffer.toString('utf-8');

    const analysis = await AscImporterService.analyzeAscXml(tenantId, xmlContent);

    return reply.send({
      success: true,
      message: 'Pratinjau analisis XML aSc TimeTables berhasil dihasilkan',
      data: {
        filename: data.filename,
        xml_content: xmlContent,
        ...analysis,
      },
    });
  }

  static async execute(request: any, reply: any) {
    const tenantId = request.tenantId || request.user?.tenant_id || request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId) {
      return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan' });
    }

    const body = request.body as ExecuteAscImportInput;
    if (!body?.tahun_pelajaran_id || !body?.semester_id || !body?.xml_content) {
      return reply.status(400).send({ success: false, message: 'Parameter tahun_pelajaran_id, semester_id, dan xml_content wajib diisi' });
    }

    try {
      const result = await AscImporterService.executeAscImport(tenantId, {
        ...body,
        user_id: userId,
      });

      return reply.send({
        success: true,
        message: 'Berhasil mengimpor jadwal KBM dari aSc TimeTables',
        data: result,
      });
    } catch (error: any) {
      console.error('[AscImporterController] Execute error:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal mengeksekusi impor jadwal KBM',
      });
    }
  }
}
