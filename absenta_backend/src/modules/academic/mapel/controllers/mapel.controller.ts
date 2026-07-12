import { mapelService } from '../services/mapel.service';
import { createMapelSchema, updateMapelSchema } from '../services/mapel.schema';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { prisma } from '../../../../utils/prisma';

export const mapelController = {
  async getAllMapel(request: any, reply: any) {
    try {
      const user = request.user!;

      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 10;
      const search = request.query.search as string;

      const result = await mapelService.getAllMapel(user.roleName, user.tenantId, {
        page,
        limit,
        search,
      });

      return reply.status(200).send({
        success: true,
        message: 'Mapel retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting all mapel:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getMapelById(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      const mapel = await mapelService.getMapelById(id, user.roleName, user.tenantId);

      if (!mapel) {
        return reply.status(404).send({
          success: false,
          message: 'Mapel not found',
          data: null,
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Mapel retrieved successfully',
        data: mapel,
      });
    } catch (error) {
      console.error('Error getting mapel by ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async createMapel(request: any, reply: any) {
    try {
      const user = request.user!;
      const parsedBody = createMapelSchema.parse(request.body);
      const input = parsedBody;

      const mapel = await mapelService.createMapel(input, user.tenantId);

      return reply.status(201).send({
        success: true,
        message: 'Mapel created successfully',
        data: mapel,
      });
    } catch (error) {
      console.error('Error creating mapel:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists') || 
            error.message.includes('must be between')) {
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

  async updateMapel(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const parsedBody = updateMapelSchema.parse(request.body);
      const input = parsedBody;

      const mapel = await mapelService.updateMapel(id, input, user.roleName, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Mapel updated successfully',
        data: mapel,
      });
    } catch (error) {
      console.error('Error updating mapel:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || 
            error.message.includes('already exists') ||
            error.message.includes('insufficient permissions') ||
            error.message.includes('must be between')) {
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

  async deleteMapel(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      await mapelService.deleteMapel(id, user.roleName, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Mapel deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Error deleting mapel:', error);
      
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

  async getMapelByTingkat(request: any, reply: any) {
    try {
      const user = request.user!;
      const { tingkat } = request.params;

      const tingkatNumber = parseInt(tingkat);
      if (isNaN(tingkatNumber) || tingkatNumber < 1 || tingkatNumber > 12) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid tingkat. Must be between 1 and 12',
          data: null,
        });
      }

      const mapel = await mapelService.getMapelByTingkat(tingkatNumber, user.roleName, user.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Mapel retrieved successfully',
        data: mapel,
      });
    } catch (error) {
      console.error('Error getting mapel by tingkat:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getImportTemplate(_request: any, reply: any) {
    try {
      const headers = ['nama_mapel', 'kode_mapel', 'tingkat'];
      const sample = [{ nama_mapel: 'Matematika Wajib', kode_mapel: 'MTK-W', tingkat: 10 }];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      // Auto-width
      const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Template Mapel');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_mapel_template.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      return reply.status(500).send({ success: false, message: 'Failed to generate template' });
    }
  },

  async importFromExcel(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const part = await request.file();
      if (!part) {
        return reply.status(400).send({ success: false, message: 'No file uploaded' });
      }

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data: any[] = smartReadSheet(ws);

      if (data.length === 0) {
        return reply.status(400).send({ success: false, message: 'Excel file is empty' });
      }

      const result = await mapelService.importFromExcel(data, scope);

      return reply.status(200).send({
        success: true,
        message: `Import completed. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.errors.length}`,
        data: result
      });

    } catch (error: any) {
      console.error('Import error:', error);
      return reply.status(500).send({ success: false, message: 'Failed to import mapel', error: error.message });
    }
  },

  async exportToExcel(request: any, reply: any) {
    try {
      const user = request.user!;
      // Get all mapel (no pagination limit)
      const result = await mapelService.getAllMapel(user.roleName, user.tenantId, { page: 1, limit: 10000 });
      
      const data = result.data.map((m: any, index: number) => ({
        No: index + 1,
        'Nama Mata Pelajaran': m.nama_mapel,
        'Kode Mapel': m.kode_mapel || '-',
        Tingkat: m.tingkat || '-',
        'Jumlah Pengajar': m._count?.GuruMapel || 0
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
            if ([0, 2, 3, 4].includes(C)) { // No, Kode, Tingkat, Jumlah Guru
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 40 }, // Nama
        { wch: 15 }, // Kode
        { wch: 10 }, // Tingkat
        { wch: 15 }  // Jumlah Guru
      ];
      ws['!rows'] = [{ hpt: 30 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Data Mapel');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="mapel_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      return reply.send(buffer);
    } catch (error) {
      console.error('Error exporting mapel:', error);
      return reply.status(500).send({ success: false, message: 'Failed to export mapel' });
    }
  },
  async initializePreset(request: any, reply: any) {
    try {
      const { tenantId } = request;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID is required' });
      }

      const { selectedPresetIds } = request.body || {};

      if (!selectedPresetIds || !Array.isArray(selectedPresetIds) || selectedPresetIds.length === 0) {
        return reply.status(400).send({ success: false, message: 'selectedPresetIds harus berupa array dan tidak boleh kosong' });
      }

      // Fetch all selected presets from GlobalMapelPreset
      const presets = await prisma.globalMapelPreset.findMany({
        where: { id: { in: selectedPresetIds } }
      });

      if (presets.length === 0) {
        return reply.status(404).send({ success: false, message: 'Tidak ada preset yang ditemukan untuk ID yang diberikan' });
      }

      const shortTenantId = tenantId.substring(0, 4).toUpperCase();

      const dataToInsert = presets.map(p => ({
        tenant_id: tenantId,
        nama_mapel: p.nama_mapel,
        kode_mapel: `${p.kode_mapel}-${shortTenantId}`,
        tingkat: null
      }));

      const result = await prisma.mapel.createMany({
        data: dataToInsert,
        skipDuplicates: true
      });

      return reply.status(200).send({
        success: true,
        message: `Berhasil menambahkan ${result.count} mata pelajaran dari preset`,
        count: result.count
      });
    } catch (error: any) {
      console.error('Error initializing mapel preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to initialize mapel preset', error: error.message });
    }
  },

  // GET /presets/by-jenjang?jenjang=SMA — load preset per jenjang untuk wizard frontend
  async getPresetsByJenjang(request: any, reply: any) {
    try {
      const { jenjang } = request.query as { jenjang?: string };

      if (!jenjang) {
        return reply.status(400).send({ success: false, message: 'Parameter jenjang wajib diisi' });
      }

      const presets = await prisma.globalMapelPreset.findMany({
        where: { jenjang: jenjang.toUpperCase() },
        orderBy: [
          { category: 'asc' },
          { nama_mapel: 'asc' }
        ]
      });

      // Group by category for convenience
      const grouped = presets.reduce((acc: Record<string, any[]>, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
      }, {});

      return reply.status(200).send({
        success: true,
        jenjang: jenjang.toUpperCase(),
        data: presets,
        grouped
      });
    } catch (error: any) {
      console.error('Error getting presets by jenjang:', error);
      return reply.status(500).send({ success: false, message: 'Failed to get presets', error: error.message });
    }
  },

  // GET /presets - Get all global presets (superadmin only)
  async getGlobalPresets(_request: any, reply: any) {
    try {
      const presets = await prisma.globalMapelPreset.findMany({
        orderBy: [
          { category: 'asc' },
          { jenjang: 'asc' },
          { nama_mapel: 'asc' }
        ]
      });

      return reply.status(200).send({
        success: true,
        data: presets
      });
    } catch (error: any) {
      console.error('Error getting global mapel presets:', error);
      return reply.status(500).send({ success: false, message: 'Failed to get global mapel presets', error: error.message });
    }
  },

  // POST /presets - Create new global preset (superadmin only)
  async createGlobalPreset(request: any, reply: any) {
    try {
      const { jenjang, category, nama_mapel, kode_mapel } = request.body || {};
      if (!jenjang || !category || !nama_mapel || !kode_mapel) {
        return reply.status(400).send({ success: false, message: 'Semua field (jenjang, category, nama_mapel, kode_mapel) wajib diisi' });
      }

      const preset = await prisma.globalMapelPreset.create({
        data: {
          jenjang: jenjang.toUpperCase(),
          category: category.toUpperCase(),
          nama_mapel,
          kode_mapel: kode_mapel.toUpperCase()
        }
      });

      return reply.status(201).send({
        success: true,
        message: 'Preset mapel global berhasil dibuat',
        data: preset
      });
    } catch (error: any) {
      console.error('Error creating global mapel preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to create global mapel preset', error: error.message });
    }
  },

  // PUT /presets/:id - Update global preset (superadmin only)
  async updateGlobalPreset(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { jenjang, category, nama_mapel, kode_mapel } = request.body || {};

      const preset = await prisma.globalMapelPreset.update({
        where: { id },
        data: {
          jenjang: jenjang?.toUpperCase(),
          category: category?.toUpperCase(),
          nama_mapel,
          kode_mapel: kode_mapel?.toUpperCase()
        }
      });

      return reply.status(200).send({
        success: true,
        message: 'Preset mapel global berhasil diperbarui',
        data: preset
      });
    } catch (error: any) {
      console.error('Error updating global mapel preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to update global mapel preset', error: error.message });
    }
  },

  // DELETE /presets/:id - Delete global preset (superadmin only)
  async deleteGlobalPreset(request: any, reply: any) {
    try {
      const { id } = request.params;

      await prisma.globalMapelPreset.delete({
        where: { id }
      });

      return reply.status(200).send({
        success: true,
        message: 'Preset mapel global berhasil dihapus'
      });
    } catch (error: any) {
      console.error('Error deleting global mapel preset:', error);
      return reply.status(500).send({ success: false, message: 'Failed to delete global mapel preset', error: error.message });
    }
  }
};
