import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { JurusanService, CreateJurusanInput, UpdateJurusanInput } from '../services/jurusan.service';
import { createJurusanSchema, updateJurusanSchema } from '../services/jurusan.schema';
import { prisma } from '@/utils/prisma';

const jurusanService = new JurusanService();

export const jurusanController = {
  async getAllJurusan(request: any, reply: any) {
    try {
      const user = request.user!;

      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 10;
      const search = request.query.search as string;

      const result = await jurusanService.getAllJurusan(user.roleName, user.tenantId, {
        page,
        limit,
        search,
      });

      return reply.status(200).send({
        success: true,
        message: 'Jurusan retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting all jurusan:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getJurusanById(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      const jurusan = await jurusanService.getJurusanById(id, user.roleName, user.tenantId);

      if (!jurusan) {
        return reply.status(404).send({
          success: false,
          message: 'Jurusan not found',
          data: null,
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Jurusan retrieved successfully',
        data: jurusan,
      });
    } catch (error) {
      console.error('Error getting jurusan by ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async createJurusan(request: any, reply: any) {
    try {
      const user = request.user!;
      const parsedBody = createJurusanSchema.parse(request.body);
      const input: CreateJurusanInput = parsedBody;

      const jurusan = await jurusanService.createJurusan(input, user.tenantId);

      return reply.status(201).send({
        success: true,
        message: 'Jurusan created successfully',
        data: jurusan,
      });
    } catch (error: any) {
      console.error('Error creating jurusan:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  },

  async updateJurusan(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const parsedBody = updateJurusanSchema.parse(request.body);
      const input: UpdateJurusanInput = parsedBody;

      const jurusan = await jurusanService.updateJurusan(id, input, user.roleName, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Jurusan updated successfully',
        data: jurusan,
      });
    } catch (error: any) {
      console.error('Error updating jurusan:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  },

  async removeJurusan(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      await jurusanService.removeJurusan(id, user.roleName, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Jurusan deleted successfully',
        data: null,
      });
    } catch (error: any) {
      console.error('Error deleting jurusan:', error);
      
      const isKnownError = error.message.includes('not found') || 
                          error.message.includes('Tidak dapat menghapus') ||
                          error.message.includes('Cannot delete');

      return reply.status(isKnownError ? 400 : 500).send({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  },

  async getImportTemplate(_request: any, reply: any) {
    try {
      const headers = ['nama', 'kode', 'singkatan', 'program_keahlian'];
      const sample = [{ nama: 'Ilmu Pengetahuan Alam', kode: 'IPA_001', singkatan: 'IPA', program_keahlian: 'Matematika dan Ilmu Pengetahuan Alam' }];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      // Styles
      const reqStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } },
        alignment: { horizontal: "center" }
      };

      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) cell.s = reqStyle;
      });

      ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 35 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Jurusan');

      // --- PETUNJUK ---
      const instructions = [
        ['PETUNJUK PENGISIAN IMPORT JURUSAN'],
        [''],
        ['1. KOLOM NAMA, KODE, DAN SINGKATAN WAJIB DIISI'],
        ['2. nama: Nama lengkap jurusan/konsentrasi keahlian (Contoh: Ilmu Pengetahuan Alam atau Rekayasa Perangkat Lunak)'],
        ['3. kode: Kode teknis/Dapodik (Contoh: 10293 atau IPA_001)'],
        ['4. singkatan: Singkatan/Akronim untuk tampilan (Contoh: IPA atau RPL)'],
        ['5. program_keahlian: Nama atau Kode Program Keahlian Induk (Contoh: MIPA atau Teknik Komputer dan Informatika) [Opsional]']
      ];
      const petunjukWs = XLSX.utils.aoa_to_sheet(instructions);
      petunjukWs['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "4F46E5" } } };
      
      XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_jurusan_template.xlsx"');

      return reply.send(buffer);
    } catch (error) {
      console.error('Error template:', error);
      return reply.status(500).send({ success: false, message: 'Failed to generate template' });
    }
  },

  async importFromExcel(request: any, reply: any) {
    try {
      const parts = request.parts();
      let fileBuffer;

      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          break; // Only process the first file
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ success: false, message: 'No file uploaded' });
      }

      const wb = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const data = smartReadSheet(sheet);

      const result = await jurusanService.importFromExcel(data, request.dataScope);

      return reply.send({
        success: true,
        message: 'Import completed',
        data: result
      });
    } catch (error: any) {
      console.error('Import error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Import failed' });
    }
  },

  async exportToExcel(request: any, reply: any) {
    try {
      const user = request.user!;
      const result = await jurusanService.getAllJurusan(user.roleName, user.tenantId, { page: 1, limit: 10000 }); // Get all data

      const data = result.data.map((j, index) => ({
        No: index + 1,
        'Nama Jurusan': j.nama,
        Kode: j.kode || '-',
        Singkatan: j.singkatan || '-',
        'Program Keahlian': j.ProgramKeahlian?.nama || '-',
        'Jumlah Kelas': j._count?.Kelas || 0
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
            if (C === 0 || C === 2 || C === 3 || C === 5) { // No, Kode, Singkatan, Jumlah Kelas
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 40 }, // Nama
        { wch: 15 }, // Kode
        { wch: 15 }, // Singkatan
        { wch: 25 }, // Program Keahlian
        { wch: 15 }  // Jumlah Kelas
      ];
      ws['!rows'] = [{ hpt: 30 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Jurusan');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="jurusan_export_${new Date().toISOString().split('T')[0]}.xlsx"`);

      return reply.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      return reply.status(500).send({ success: false, message: 'Export failed' });
    }
  },

  async bulkWizardCreate(request: any, reply: any) {
    try {
      const user = request.user!;
      const result = await jurusanService.bulkWizardCreate(request.body, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Bulk wizard creation completed successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error bulk wizard creating jurusan:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Internal server error',
        data: null
      });
    }
  },

  // =========================================================================
  // GLOBAL PRESETS (SUPERADMIN ONLY)
  // =========================================================================
  async getGlobalPresets(_request: any, reply: any) {
    try {
      const presets = await prisma.globalProgramPreset.findMany({
        include: {
          jurusans: {
            orderBy: { nama: 'asc' }
          }
        },
        orderBy: { nama: 'asc' }
      });
      return reply.status(200).send({ success: true, data: presets });
    } catch (error: any) {
      console.error('Error getting global program presets:', error);
      return reply.status(500).send({ success: false, message: 'Failed to get global presets', error: error.message });
    }
  },

  async createGlobalProgramPreset(request: any, reply: any) {
    try {
      const { bidang_keahlian, nama, kode, singkatan } = request.body;
      if (!bidang_keahlian || !nama || !kode || !singkatan) {
        return reply.status(400).send({ success: false, message: 'Missing required fields' });
      }

      const preset = await prisma.globalProgramPreset.create({
        data: {
          bidang_keahlian,
          nama,
          kode: kode.toUpperCase(),
          singkatan: singkatan.toUpperCase()
        }
      });

      return reply.status(201).send({ success: true, message: 'Global program preset created', data: preset });
    } catch (error: any) {
      console.error('Error creating global program preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to create program preset', error: error.message });
    }
  },

  async updateGlobalProgramPreset(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { bidang_keahlian, nama, kode, singkatan } = request.body;

      const preset = await prisma.globalProgramPreset.update({
        where: { id },
        data: {
          bidang_keahlian,
          nama,
          kode: kode?.toUpperCase(),
          singkatan: singkatan?.toUpperCase()
        }
      });

      return reply.status(200).send({ success: true, message: 'Global program preset updated', data: preset });
    } catch (error: any) {
      console.error('Error updating global program preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to update program preset', error: error.message });
    }
  },

  async deleteGlobalProgramPreset(request: any, reply: any) {
    try {
      const { id } = request.params;
      await prisma.globalProgramPreset.delete({
        where: { id }
      });
      return reply.status(200).send({ success: true, message: 'Global program preset deleted' });
    } catch (error: any) {
      console.error('Error deleting global program preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to delete program preset', error: error.message });
    }
  },

  async createGlobalJurusanPreset(request: any, reply: any) {
    try {
      const { program_preset_id, nama, kode, singkatan } = request.body;
      if (!program_preset_id || !nama || !kode || !singkatan) {
        return reply.status(400).send({ success: false, message: 'Missing required fields' });
      }

      const preset = await prisma.globalJurusanPreset.create({
        data: {
          program_preset_id,
          nama,
          kode: kode.toUpperCase(),
          singkatan: singkatan.toUpperCase()
        }
      });

      return reply.status(201).send({ success: true, message: 'Global jurusan preset created', data: preset });
    } catch (error: any) {
      console.error('Error creating global jurusan preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to create jurusan preset', error: error.message });
    }
  },

  async updateGlobalJurusanPreset(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { nama, kode, singkatan } = request.body;

      const preset = await prisma.globalJurusanPreset.update({
        where: { id },
        data: {
          nama,
          kode: kode?.toUpperCase(),
          singkatan: singkatan?.toUpperCase()
        }
      });

      return reply.status(200).send({ success: true, message: 'Global jurusan preset updated', data: preset });
    } catch (error: any) {
      console.error('Error updating global jurusan preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to update jurusan preset', error: error.message });
    }
  },

  async deleteGlobalJurusanPreset(request: any, reply: any) {
    try {
      const { id } = request.params;
      await prisma.globalJurusanPreset.delete({
        where: { id }
      });
      return reply.status(200).send({ success: true, message: 'Global jurusan preset deleted' });
    } catch (error: any) {
      console.error('Error deleting global jurusan preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to delete jurusan preset', error: error.message });
    }
  }
};
