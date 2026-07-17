import { kelasService, CreateKelasInput, UpdateKelasInput } from '../services/kelas.service';
import { createKelasSchema, updateKelasSchema } from '../services/kelas.schema';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { prisma } from '@/utils/prisma';

export const kelasController = {
  async getAllKelas(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Extract pagination and filtering parameters
      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 10;
      const search = request.query.search as string;

      const tingkatRaw = request.query.tingkat as string;
      const tingkat = (tingkatRaw && tingkatRaw !== '') ? parseInt(tingkatRaw) : undefined;

      const jurusanRaw = request.query.jurusan_id as string;
      const jurusan_id = (jurusanRaw && jurusanRaw !== '') ? jurusanRaw : undefined;
      
      const isActiveQuery = request.query.is_active;
      let is_active: boolean | undefined = undefined;
      if (isActiveQuery === 'true') is_active = true;
      if (isActiveQuery === 'false') is_active = false;

      const result = await kelasService.getAllKelas(tenantId, scope, {
        page,
        limit,
        search,
        tingkat,
        jurusan_id,
        is_active,
      });

      return reply.status(200).send({
        success: true,
        message: 'Kelas retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting all kelas:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getKelasById(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const kelas = await kelasService.getKelasById(id, tenantId, scope);

      if (!kelas) {
        return reply.status(404).send({
          success: false,
          message: 'Kelas not found',
          data: null,
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Kelas retrieved successfully',
        data: kelas,
      });
    } catch (error) {
      console.error('Error getting kelas by ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async createKelas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const parsedBody = createKelasSchema.parse(request.body);
      const input: CreateKelasInput = parsedBody;

      const scope = (request as any).organizationalScope;
      const kelas = await kelasService.createKelas(input, tenantId, scope);

      return reply.status(201).send({
        success: true,
        message: 'Kelas created successfully',
        data: kelas,
      });
    } catch (error) {
      console.error('Error creating kelas:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists') || 
            error.message.includes('not found') ||
            error.message.includes('already assigned')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async updateKelas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const parsedBody = updateKelasSchema.parse(request.body);
      const input: UpdateKelasInput = parsedBody;

      const scope = (request as any).organizationalScope;
      const kelas = await kelasService.updateKelas(id, input, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'Kelas updated successfully',
        data: kelas,
      });
    } catch (error) {
      console.error('Error updating kelas:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || 
            error.message.includes('already exists') ||
            error.message.includes('insufficient permissions') ||
            error.message.includes('already assigned')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async deleteKelas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const scope = (request as any).organizationalScope;
      await kelasService.deleteKelas(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'Kelas deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Error deleting kelas:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || 
            error.message.includes('insufficient permissions') ||
            error.message.includes('Cannot delete') ||
            error.message.includes('Tidak dapat menghapus')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getImportTemplate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const sekolah = tenantId
        ? await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } })
        : null;
      const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '');

      const headers = [
        'nama_kelas', 'tingkat', 'jurusan', 'wali_kelas', 'jam_masuk', 'jam_pulang'
      ];

      const sample = [{
        nama_kelas: 'X IPA 1',
        tingkat: 10,
        jurusan: 'IPA',
        wali_kelas: 'Budi Santoso',
        jam_masuk: '07:00',
        jam_pulang: '13:00'
      }];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      // Styles
      const reqStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } },
        alignment: { horizontal: "center" }
      };

      const optStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "6B7280" } },
        alignment: { horizontal: "center" }
      };

      const requiredCols = isSmkMak
        ? ['nama_kelas', 'tingkat', 'jurusan']
        : ['nama_kelas', 'tingkat'];

      headers.forEach((h, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) {
          if (requiredCols.includes(h)) {
            cell.s = reqStyle;
          } else {
            cell.s = optStyle;
          }
        }
      });

      ws['!cols'] = headers.map(() => ({ wch: 18 }));

      XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');

      // --- PETUNJUK ---
      const instructions = [
        ['PETUNJUK PENGISIAN IMPORT KELAS'],
        [''],
        ['1. KOLOM BERWARNA EMAS WAJIB DIISI'],
        ['2. tingkat: Isi dengan angka sesuai tingkat (misal: 1-6 untuk SD, 7-9 untuk SMP, 10-12/13 untuk SMA/SMK)'],
        isSmkMak
          ? ['3. jurusan: WAJIB diisi — Isi dengan Nama Jurusan atau Kode Jurusan']
          : ['3. jurusan: Opsional — Isi dengan Nama Jurusan jika ada'],
        ['4. jam_masuk/pulang: Format HH:mm (Contoh: 07:00)'],
        [''],
        isSmkMak
          ? ['Tips: Pada sekolah SMK/MAK, nama kelas boleh sama asalkan jurusannya berbeda.']
          : ['Tips: Pastikan Nama Kelas unik dalam tingkat yang sama agar tidak membingungkan sistem.']
      ];
      const petunjukWs = XLSX.utils.aoa_to_sheet(instructions);
      petunjukWs['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "4F46E5" } } };
      petunjukWs['A3'].s = { font: { bold: true, color: { rgb: "B91C1C" } } };

      XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_kelas_template.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      console.error('Error template:', error);
      return reply.status(500).send({ success: false, message: 'Failed to generate template' });
    }
  },

  async importFromExcel(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const part = await request.file();
      if (!part) {
        return reply.status(400).send({ success: false, message: 'No file uploaded' });
      }

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = smartReadSheet(ws);

      if (data.length === 0) {
        return reply.status(400).send({ success: false, message: 'Excel file is empty' });
      }

      const result = await kelasService.importFromExcel(data, { tenantId, ...scope });

      return reply.status(200).send({
        success: true,
        message: `Import completed. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.errors.length}`,
        data: result
      });

    } catch (error: any) {
      console.error('Import error:', error);
      return reply.status(500).send({ success: false, message: 'Failed to import kelas', error: error.message });
    }
  },

  async exportToExcel(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      // Get all kelas (no pagination limit)
      const result = await kelasService.getAllKelas(tenantId, scope, { page: 1, limit: 10000 });
      const data = result.data.map((k: any, index: number) => ({
        No: index + 1,
        'Nama Kelas': k.nama_kelas,
        Tingkat: k.tingkat,
        Jurusan: k.Jurusan?.nama || '-',
        'Wali Kelas': k.WaliKelas?.[0]?.Guru?.nama_guru || '-',
        'Jam Masuk': k.jam_masuk || '-',
        'Jam Pulang': k.jam_pulang || '-',
        'Jumlah Siswa': k._count?.Siswa || 0
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
            if ([0, 2, 5, 6, 7].includes(C)) { // No, Tingkat, Jam, Jml Siswa
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 20 }, // Nama
        { wch: 10 }, // Tingkat
        { wch: 25 }, // Jurusan
        { wch: 25 }, // Wali Kelas
        { wch: 12 }, // Jam Masuk
        { wch: 12 }, // Jam Pulang
        { wch: 12 }  // Jml Siswa
      ];
      ws['!rows'] = [{ hpt: 30 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="kelas_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      return reply.send(buffer);
    } catch (error) {
      console.error('Error exporting kelas:', error);
      return reply.status(500).send({ success: false, message: 'Failed to export kelas' });
    }
  }
};
