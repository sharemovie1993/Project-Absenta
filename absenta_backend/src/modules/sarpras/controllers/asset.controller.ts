import { AssetService } from '../services/asset.service';
import * as XLSX from 'xlsx';

interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    tenantId: string | null;
    role: string;
  };
  tenantId: string | null;
  params: any;
  query: any;
  body: any;
  organizationalScope?: any;
}

export class AssetController {
  // --- Category ---
  async getCategories(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.getCategories(request.tenantId!);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createCategory(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.createCategory(request.tenantId!, request.body);
      return reply.status(201).send({ success: true, message: 'Kategori berhasil dibuat', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- Location ---
  async getLocations(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.getLocations(request.tenantId!, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createLocation(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.createLocation(request.tenantId!, request.body);
      return reply.status(201).send({ success: true, message: 'Lokasi berhasil dibuat', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- Asset ---
  async getAssets(request: AuthenticatedRequest, reply: any) {
    try {
      const { page, limit, search, category_id, location_id, kondisi, is_loanable } = request.query;
      const data = await AssetService.getAssets(request.tenantId!, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        category_id: category_id as string,
        location_id: location_id as string,
        kondisi: kondisi as string,
        is_loanable: is_loanable === 'true' ? true : is_loanable === 'false' ? false : undefined
      }, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getAssetById(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await AssetService.getAssetById(request.tenantId!, id, request.organizationalScope);
      if (!data) return reply.status(404).send({ success: false, message: 'Aset tidak ditemukan' });
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createAsset(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.createAsset(request.tenantId!, request.body, request.organizationalScope);
      return reply.status(201).send({ success: true, message: 'Aset berhasil dibuat', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateAsset(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await AssetService.updateAsset(request.tenantId!, id, request.body, request.organizationalScope);
      return reply.status(200).send({ success: true, message: 'Aset berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteAsset(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      await AssetService.deleteAsset(request.tenantId!, id);
      return reply.status(200).send({ success: true, message: 'Aset berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async importAssets(request: any, reply: any) {
    try {
      const data = await request.file();
      if (!data) return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });
      
      const buffer = await data.toBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        return reply.status(400).send({ success: false, message: 'File kosong atau format tidak valid' });
      }

      // Mapping human-readable headers to database fields
      // Expected headers: Nama Aset*, Kode, Brand, Serial Number, Kondisi, Jumlah, Loanable, Harga, Tanggal Beli, Deskripsi, Kategori, Lokasi
      const mappedAssets = rows.map(row => ({
        nama: row['Nama Aset'] || row['nama'],
        kode: row['Kode'] || row['kode'],
        brand: row['Brand'] || row['brand'],
        serial_number: row['Serial Number'] || row['serial_number'] || row['SN'],
        kondisi: row['Kondisi'] || row['kondisi'],
        jumlah: row['Jumlah'] || row['jumlah'],
        is_loanable: row['Loanable'] === 'Ya' || row['is_loanable'] === true,
        price_purchase: row['Harga'] || row['price_purchase'],
        purchase_date: row['Tanggal Beli'] || row['purchase_date'],
        deskripsi: row['Deskripsi'] || row['deskripsi'],
        category_nama: row['Kategori'] || row['category_nama'],
        location_nama: row['Lokasi'] || row['location_nama']
      }));

      const results = await AssetService.upsertAssets(request.tenantId!, mappedAssets);

      return reply.status(200).send({ 
        success: true, 
        message: `Import selesai. Berhasil: ${results.created + results.updated}, Gagal: ${results.failed}`,
        data: results
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getImportTemplate(_request: AuthenticatedRequest, reply: any) {
    try {
      const sampleData = [
        {
          'Nama Aset': 'Laptop MacBook Pro 14',
          'Kode': 'INV-2024-EX001',
          'Brand': 'Apple',
          'Serial Number': 'C02F...',
          'Kondisi': 'BAIK',
          'Jumlah': 5,
          'Loanable': 'Ya',
          'Harga': 25000000,
          'Tanggal Beli': '2024-01-15',
          'Kategori': 'Elektronik',
          'Lokasi': 'Ruang Guru',
          'Deskripsi': 'Laptop untuk desain grafis'
        }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Sarpras');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="template_import_sarpras.xlsx"');
      return reply.send(buffer);
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
  async getStats(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await AssetService.getStats(request.tenantId!, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
