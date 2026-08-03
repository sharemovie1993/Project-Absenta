import { guruService, CreateGuruInput, UpdateGuruInput } from '../services/guru.service';
import { createGuruSchema, updateGuruSchema } from '../services/guru.schema';
import { updateGuruMaxJpCommand } from '../services/commands/update-guru-max-jp.command';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { getPaginationParams } from '../../../../utils/pagination';
import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { storageService } from '@/infra/storage/storage.service';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class GuruController {
  async getAllGuru(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      
      // Extract pagination parameters with enforcement
      const { page, limit } = getPaginationParams(request);
      
      const search = request.query.search || '';
      const user_id = request.query.user_id || undefined;
      const status_kepegawaian = request.query.status_kepegawaian || undefined;
      const jenis_kelamin = request.query.jenis_kelamin || undefined;
      const jenis_ptk = request.query.jenis_ptk || undefined;

      const result = await guruService.getAllGuru(scope, {
        page,
        limit,
        search,
        user_id,
        status_kepegawaian,
        jenis_kelamin,
        jenis_ptk
      });

      reply.status(200);
      return {
        success: true,
        message: 'Guru retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve guru';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async getGuruById(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const { id } = request.params;

      const guru = await guruService.getGuruById(id, scope);

      if (!guru) {
        reply.status(404);
        return {
          success: false,
          message: 'Guru not found',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Guru retrieved successfully',
        data: guru,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve guru';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * GET /guru/me — Profil guru yang sedang login, diperkaya jabatan struktural
   */
  async getGuruMe(request: any, reply: any): Promise<ApiResponse> {
    try {
      const userId: string = (request as any).user?.id;
      const tenantId: string = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const guru = await guruService.getGuruMe(userId, tenantId);

      if (!guru) {
        reply.status(404);
        return { success: false, message: 'Profil guru tidak ditemukan untuk akun ini' };
      }

      reply.status(200);
      return { success: true, message: 'Guru profile retrieved', data: guru };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve guru profile';
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  }

  async createGuru(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const parsedBody = createGuruSchema.parse(request.body);
      const createGuruInput: CreateGuruInput = parsedBody;

      const guru = await guruService.createGuru(createGuruInput, scope);

      reply.status(201);
      return {
        success: true,
        message: 'Guru created successfully',
        data: guru,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create guru';
      
      // Handle specific error cases
      if (errorMessage.includes('User not found') || 
          errorMessage.includes('already has a guru profile') ||
          errorMessage.includes('NIP already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async updateGuru(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const { id } = request.params;
      const parsedBody = updateGuruSchema.parse(request.body);

      const user = request.user;

      // Ownership Check: Guru biasa hanya boleh mengedit profil mereka sendiri
      if (user?.roleName === RoleName.GURU) {
        const targetGuru = await prisma.guru.findUnique({
          where: { id }
        });

        if (!targetGuru) {
          reply.status(404);
          return {
            success: false,
            message: 'Profil guru tidak ditemukan',
          };
        }

        const isPhotoOrRfidUpdate = Object.keys(parsedBody).every(k => k === 'foto' || k === 'no_rfid');
        if (targetGuru.user_id !== user.id && !isPhotoOrRfidUpdate) {
          reply.status(403);
          return {
            success: false,
            message: 'Forbidden: Anda tidak diperbolehkan memperbarui profil guru lain.',
          };
        }
      }

      const updateGuruInput: UpdateGuruInput = parsedBody;

      const guru = await guruService.updateGuru(id, updateGuruInput, scope);

      reply.status(200);
      return {
        success: true,
        message: 'Guru updated successfully',
        data: guru,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update guru';
      
      // Handle specific error cases
      if (errorMessage.includes('not found') || 
          errorMessage.includes('NIP already exists')) {
        reply.status(400);
      } else if (errorMessage.includes('insufficient permissions')) {
        reply.status(403);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async deleteGuru(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const { id } = request.params;

      await guruService.deleteGuru(id, scope);

      reply.status(200);
      return {
        success: true,
        message: 'Guru deleted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete guru';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('related records') || 
                errorMessage.includes('Tidak dapat menghapus') ||
                errorMessage.includes('Cannot delete')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async getImportTemplate(_request: any, reply: any): Promise<void> {
    try {
      const headers = [
        'nama_guru', 'nip', 'email', 'no_hp', 'alamat', 'tempat_lahir', 
        'tanggal_lahir', 'jenis_kelamin', 'agama', 'status_kepegawaian', 
        'pendidikan_terakhir', 'no_rfid'
      ];

      const sample = [
        {
          nama_guru: 'Budi Santoso',
          nip: '1978123100123456',
          email: 'budi.santoso@example.com',
          no_hp: '081234567890',
          alamat: 'Jl. Merdeka No. 1',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '1980-01-01',
          jenis_kelamin: 'L',
          agama: 'Islam',
          status_kepegawaian: 'PNS',
          pendidikan_terakhir: 'S1',
          no_rfid: 'RFID123456'
        }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      // Styles
      const reqHeaderStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" },
        border: { bottom: { style: "medium", color: { rgb: "000000" } } }
      };

      const optHeaderStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "6B7280" } }, // Gray for Optional
        alignment: { horizontal: "center" }
      };

      // Apply Styles
      headers.forEach((h, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) {
          if (['nama_guru'].includes(h)) {
            cell.s = reqHeaderStyle;
          } else {
            cell.s = optHeaderStyle;
          }
        }
      });

      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      ws['!rows'] = [{ hpt: 25 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');

      // --- PETUNJUK ---
      const instructions = [
        ['PETUNJUK PENGISIAN IMPORT GURU'],
        [''],
        ['1. KOLOM BERWARNA EMAS WAJIB DIISI (nama_guru)'],
        ['2. nip: Opsional. Harus unik jika diisi, tidak boleh sama dengan guru lain'],
        ['3. jenis_kelamin: Isi dengan "L" (Laki-laki) atau "P" (Perempuan) jika ada'],
        ['4. tanggal_lahir: Format YYYY-MM-DD (Contoh: 1980-01-01) jika ada'],
        ['5. email: Jika diisi, akan digunakan untuk login sistem'],
        [''],
        ['Tips: Hanya nama_guru yang wajib diisi. Kolom lainnya bersifat opsional.']
      ];
      const petunjukWs = XLSX.utils.aoa_to_sheet(instructions);
      petunjukWs['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "4F46E5" } } };
      petunjukWs['A3'].s = { font: { bold: true, color: { rgb: "B91C1C" } } };
      
      XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_guru_template.xlsx"');
      reply.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      reply.status(500).send({ success: false, message: 'Failed to generate template' });
    }
  }

  async importFromExcel(request: any, reply: any): Promise<ApiResponse> {
    try {
      const scope = request.dataScope;
      const parts = request.parts();
      let rows: any[] = [];

      for await (const part of parts) {
        if (part.file) {
          const buffer = await part.toBuffer();
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          rows = smartReadSheet(sheet);
        }
      }

      if (rows.length === 0) {
        reply.status(400);
        return {
          success: false,
          message: 'No data found in uploaded file',
        };
      }

      const io = request.server.io;
      const ioApi = request.server.ioApi;
      const userId = request.user?.id;
      const clientSocketId = request.headers['x-socket-id'];
      const roomName = `user:${userId}`;

      const result = await guruService.importFromExcel(rows, scope, (current, total) => {
        if (userId) {
          const progress = Math.round((current / total) * 100);
          const payload = {
            type: 'guru',
            progress,
            current,
            total
          };
          if (io) io.to(roomName).emit('import_progress', payload);
          if (ioApi) ioApi.to(roomName).emit('import_progress', payload);
          if (clientSocketId) {
            if (io) io.to(clientSocketId).emit('import_progress', payload);
            if (ioApi) ioApi.to(clientSocketId).emit('import_progress', payload);
          }
        }
      });

      reply.status(200);
      return {
        success: true,
        message: 'Import processed successfully',
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import guru';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async exportToExcel(request: any, reply: any): Promise<void> {
    try {
      const scope = request.dataScope;
      // Get all gurus (no pagination)
      const result = await guruService.getAllGuru(scope, { page: 1, limit: 100000 });
      
      const data = result.data.map((g, index) => ({
        No: index + 1,
        Nama: g.nama_guru,
        NIP: g.nip || '-',
        Email: g.User?.email || '-',
        'No HP': g.no_hp || '-',
        Alamat: g.alamat || '-',
        'Tempat Lahir': g.tempat_lahir || '-',
        'Tanggal Lahir': g.tanggal_lahir ? new Date(g.tanggal_lahir).toLocaleDateString('id-ID') : '-',
        'Jenis Kelamin': g.jenis_kelamin || '-',
        Agama: g.agama || '-',
        'Status Kepegawaian': g.status_kepegawaian || '-',
        'Pendidikan Terakhir': g.pendidikan_terakhir || '-',
        'No RFID': g.no_rfid || '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // --- STYLING ---
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const cellStyle = {
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;
          
          if (R === 0) {
            ws[cell_address].s = headerStyle;
          } else {
            ws[cell_address].s = cellStyle;
            // Center align specific columns
            if ([0, 2, 8, 12, 13].includes(C)) {
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 25 }, // Nama
        { wch: 20 }, // NIP
        { wch: 25 }, // Email
        { wch: 15 }, // No HP
        { wch: 30 }, // Alamat
        { wch: 15 }, // Tempat Lahir
        { wch: 15 }, // Tanggal Lahir
        { wch: 5 },  // JK
        { wch: 10 }, // Agama
        { wch: 15 }, // Status
        { wch: 15 }, // Pendidikan
        { wch: 15 }  // RFID
      ];
      ws['!rows'] = [{ hpt: 30 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="guru_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      reply.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      reply.status(500).send({ success: false, message: 'Failed to export guru data' });
    }
  }

  async uploadGuruDocument(request: any, reply: any) {
    try {
      const { id: guruId } = request.params;
      const tenantId = request.tenantId;
      const actorUserId = request.user?.id || request.user?.userId;

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ success: false, message: 'File wajib diupload' });
      }

      const judul = String(file.fields?.judul?.value || '').trim();
      const kategori = String(file.fields?.kategori?.value || 'LAINNYA').toUpperCase();

      if (!judul) {
        return reply.status(400).send({ success: false, message: 'Judul dokumen wajib diisi' });
      }

      const doc = await guruService.uploadGuruDocument({
        tenantId,
        guruId,
        judul,
        kategori,
        actorUserId,
        file
      });

      return reply.status(201).send({
        success: true,
        message: 'Dokumen berhasil diupload',
        data: doc
      });
    } catch (error: any) {
      console.error('Upload document error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to upload document' });
    }
  }

  async deleteGuruDocument(request: any, reply: any) {
    try {
      const { id: guruId, docId } = request.params;
      const tenantId = request.tenantId;

      await guruService.deleteGuruDocument({
        tenantId,
        guruId,
        documentId: docId
      });

      return reply.status(200).send({
        success: true,
        message: 'Dokumen berhasil dihapus'
      });
    } catch (error: any) {
      console.error('Delete document error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to delete document' });
    }
  }

  async getGuruDocuments(request: any, reply: any) {
    try {
      const { id: guruId } = request.params;
      const tenantId = request.tenantId;

      const docs = await guruService.getGuruDocuments({
        tenantId,
        guruId
      });

      return reply.status(200).send({
        success: true,
        data: docs
      });
    } catch (error: any) {
      console.error('Get documents error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to retrieve documents' });
    }
  }

  async downloadGuruDocument(request: any, reply: any) {
    try {
      const { id: guruId, docId } = request.params;
      const tenantId = request.tenantId;

      const doc = await prisma.guruDocument.findFirst({
        where: { id: docId, guru_id: guruId, tenant_id: tenantId }
      });

      if (!doc) {
        return reply.status(404).send({ success: false, message: 'Dokumen tidak ditemukan' });
      }

      const stream = storageService.createReadStream(doc.file_storage_path);
      reply.header('Content-Type', doc.mime_type);
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_original_name)}"`);
      return reply.send(stream);
    } catch (error: any) {
      console.error('Download document error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to download file' });
    }
  }

  async updateGuruMaxJp(request: any, reply: any) {
    try {
      const { id: guruId } = request.params;
      const tenantId = request.tenantId || request.dataScope?.tenantId;
      const { max_jp } = request.body || {};

      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Context Tenant tidak ditemukan' });
      }

      const updated = await updateGuruMaxJpCommand({
        tenantId,
        guruId,
        maxJp: Number(max_jp),
      });

      return reply.status(200).send({
        success: true,
        message: `Batas Max JP guru berhasil diperbarui menjadi ${updated.max_jp} JP`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update max JP error:', error);
      return reply.status(400).send({ success: false, message: error.message || 'Gagal mengubah max JP' });
    }
  }
}

export const guruController = new GuruController();
