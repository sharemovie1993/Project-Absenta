import { smartReadSheet } from '@/utils/excel-import.utils';
import { findBestMatch } from '@/utils/normalization';
import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { SiswaService } from '../services/siswa.service';
import { storageService } from '@/infra/storage/storage.service';
const siswaService = new SiswaService();
import { kelasService } from '../../kelas/services/kelas.service';
import { getPaginationParams } from '../../../../utils/pagination';
import { RoleName } from '../../../../constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

export const siswaController = {
  async getAllSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      
      // Extract pagination parameters with enforcement
      const { page, limit } = getPaginationParams(request);
      
      const search = request.query.search as string;
      const user_id = (request.query.user_id as string | undefined) || undefined;
      const kelas_id = request.query.kelas_id as string | undefined;
      const status = request.query.status as string | undefined;
      const context = request.query.context as string | undefined;
      const tingkat = request.query.tingkat as string | undefined;
      const gender = request.query.gender as string | undefined;
      
      const search_fields_param = request.query.search_fields as string | undefined;
      const searchFields = search_fields_param ? search_fields_param.split(',').map(f => f.trim()) : undefined;

      const result = await siswaService.getAllSiswa(tenantId, scope, {
        page,
        limit,
        search,
        user_id,
        kelas_id,
        status,
        searchFields,
        context,
        tingkat,
        gender,
      });

      return reply.status(200).send({
        success: true,
        message: 'Siswa retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting all siswa:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async getSiswaById(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const siswa = await siswaService.getSiswaById(id, tenantId, scope);

      if (!siswa) {
        return reply.status(404).send({
          success: false,
          message: 'Siswa not found'
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Siswa retrieved successfully',
        data: siswa,
      });
    } catch (error) {
      console.error('Error getting siswa by ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async sendParentAccess(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const result = await siswaService.sendParentAccess(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: result.message,
        data: result.target
      });

    } catch (error: any) {
      console.error('Error sending parent access:', error);
      
      if (error.message === 'Siswa not found') {
         return reply.status(404).send({ success: false, message: error.message });
      }
      
      if (error.message.includes('Orang Tua')) {
        return reply.status(400).send({ success: false, message: error.message });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  async getSiswaHistory(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const history = await siswaService.getSiswaHistory(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'History retrieved successfully',
        data: history,
      });
    } catch (error: any) {
      console.error('Error getting siswa history:', error);
      return reply.status(error.message === 'Siswa not found' ? 404 : 500).send({ 
        success: false, 
        message: error.message || 'Internal server error' 
      });
    }
  },

  async bulkUpdateStatus(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      
      const rawBody = request.body;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Normalize payload: support both 'ids'/'siswaIds' and 'keterangan'/'alasan'
      const payload: any = {
        siswaIds: rawBody.siswaIds || rawBody.ids || [],
        status: rawBody.status,
        tanggal: rawBody.tanggal ? new Date(rawBody.tanggal) : undefined,
        alasan: rawBody.alasan || rawBody.keterangan,
      };

      const result = await siswaService.bulkUpdateStatus(tenantId, scope, payload);

      return reply.status(200).send({
        success: true,
        message: 'Status siswa berhasil diperbarui',
        data: result,
      });
    } catch (error) {
      console.error('Error bulk update siswa status:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  },

  async createSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      const input: any = request.body;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Validate required fields (business rules): nama_siswa, kelas_id, tahun_pelajaran_id, semester_id
      if (!input.nama_siswa || !input.kelas_id || !input.tahun_pelajaran_id || !input.semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'Missing required fields: nama_siswa, kelas_id, tahun_pelajaran_id, semester_id',
          data: null,
        });
      }

      // Convert date strings to Date objects if provided
      if (input.tanggal_lahir) {
        input.tanggal_lahir = new Date(input.tanggal_lahir);
      }
      if (input.tanggal_masuk) {
        input.tanggal_masuk = new Date(input.tanggal_masuk);
      }
      if (input.tanggal_keluar) {
        input.tanggal_keluar = new Date(input.tanggal_keluar);
      }

      const siswa = await siswaService.createSiswa(input, tenantId, scope);

      return reply.status(201).send({
        success: true,
        message: 'Siswa created successfully',
        data: siswa,
      });
    } catch (error) {
      console.error('Error creating siswa:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists') || 
            error.message.includes('not found') ||
            error.message.includes('already has a siswa profile')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
          return;
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async updateSiswa(request: any, reply: any) {
    try {
      let scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      const user = request.user;

      // Ownership Check: Siswa biasa hanya boleh mengedit profil mereka sendiri
      if (user?.roleName === RoleName.SISWA) {
        const targetSiswa = await prisma.siswa.findUnique({
          where: { id }
        });

        if (!targetSiswa) {
          return reply.status(404).send({
            success: false,
            message: 'Profil siswa tidak ditemukan',
          });
        }

        if (targetSiswa.user_id !== user.id) {
          return reply.status(403).send({
            success: false,
            message: 'Forbidden: Anda tidak diperbolehkan memperbarui profil siswa lain.',
          });
        }

        // Bypass organizational scope restriction for self-update
        scope = null;
      }

      const input: any = request.body;

      // Convert date strings to Date objects if provided
      if (input.tanggal_lahir) {
        input.tanggal_lahir = new Date(input.tanggal_lahir);
      }
      if (input.tanggal_masuk) {
        input.tanggal_masuk = new Date(input.tanggal_masuk);
      }
      if (input.tanggal_keluar) {
        input.tanggal_keluar = new Date(input.tanggal_keluar);
      }

      const siswa = await siswaService.updateSiswa(id, input, tenantId, scope, request.user?.id);

      return reply.status(200).send({
        success: true,
        message: 'Siswa updated successfully',
        data: siswa,
      });
    } catch (error: any) {
      console.error('Error updating siswa:', error);
      
      if (error.message.includes('not found') || error.message.includes('Forbidden') || error.message.includes('own siswa data')) {
         const status = error.message.includes('not found') ? 404 : 403;
         return reply.status(status).send({ success: false, message: error.message });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async deleteSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      // Permissions are handled by requireCapability middleware
      
      await siswaService.deleteSiswa(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'Siswa deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Error deleting siswa:', error);
      
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
          return;
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },

  async checkAcademicStatus(_request: any, reply: any) {
    try {
      const request = _request;
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });

      const body = request.body || {};
      const idsRaw = body.ids || body.student_ids || body.siswa_ids;
      const ids: string[] = Array.isArray(idsRaw) ? idsRaw.map(String).filter(Boolean) : [];
      const yearId = body.year_id ? String(body.year_id) : undefined;
      const semesterId = body.semester_id ? String(body.semester_id) : undefined;

      if (!yearId || !semesterId) {
        return reply.status(400).send({ success: false, message: 'year_id dan semester_id wajib diisi' });
      }

      const map = await siswaService.checkAcademicStatus(String(tenantId), ids, String(yearId), String(semesterId));
      return reply.status(200).send({ success: true, message: 'OK', data: map });
    } catch (e: any) {
      return reply.status(500).send({ success: false, message: e.message || 'Error checking status' });
    }
  },

  async getAcademicRegistrationStats(_request: any, reply: any) {
    try {
      const request = _request;
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });

      const yearId = request.query?.year_id ? String(request.query.year_id) : undefined;
      const semesterId = request.query?.semester_id ? String(request.query.semester_id) : undefined;
      if (!yearId || !semesterId) {
        return reply.status(400).send({ success: false, message: 'year_id dan semester_id wajib diisi' });
      }

      const dataScope = (request as any).dataScope; // { kelasIds, tenantWide, ... }

      const stats = await siswaService.getAcademicRegistrationStats(String(tenantId), String(yearId), String(semesterId), dataScope);
      return reply.status(200).send({ success: true, message: 'OK', data: stats });
    } catch (e: any) {
      return reply.status(500).send({ success: false, message: e.message || 'Error getting stats' });
    }
  },

  async generateRfidForSiswa(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const result = await siswaService.generateRfidForSiswa(String(tenantId), String(id));
      return reply.status(200).send({
        success: true,
        message: result.already_set ? 'RFID already set' : 'RFID generated',
        data: { id: result.id, no_rfid: result.no_rfid }
      });
    } catch (error) {
      console.error('Error generate RFID for siswa:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },

  async generateRfidBulk(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id } = request.query || {};

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const result = await siswaService.generateRfidBulk(String(tenantId), kelas_id ? String(kelas_id) : undefined);
      return reply.status(200).send({ success: true, message: 'RFID bulk generation completed', data: result });
    } catch (error) {
      console.error('Error generate RFID bulk:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },

  async pairRfidBulk(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id, rfids } = request.body;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      if (!kelas_id || !Array.isArray(rfids)) {
        return reply.status(400).send({ success: false, message: 'Invalid payload: kelas_id and rfids (array) are required' });
      }

      const result = await siswaService.pairRfidBulk(String(tenantId), String(kelas_id), rfids);
      return reply.status(200).send({
        success: true,
        message: `Successfully paired ${result.total_paired} RFIDs`,
        data: result
      });
    } catch (error) {
      console.error('Error pair RFID bulk:', error);
      return reply.status(error instanceof Error ? 400 : 500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  },

  async syncSiswaAkademik(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const body = request.body || {};
      const tahun_pelajaran_id = body.tahun_pelajaran_id ? String(body.tahun_pelajaran_id) : undefined;
      const semester_id = body.semester_id ? String(body.semester_id) : undefined;
      const kelas_id = body.kelas_id ? String(body.kelas_id) : undefined;
      const result = await siswaService.syncSiswaAkademikWithDefaults({
        tenantId: String(tenantId),
        tahun_pelajaran_id,
        semester_id,
        kelas_id,
        userId: request.user?.id
      });
      return reply.status(200).send({ success: true, message: 'Sinkronisasi SiswaAkademik berhasil', data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal server error';
      if (msg === 'Tahun Pelajaran tidak valid' || msg === 'Tahun Pelajaran aktif tidak ditemukan' || msg === 'Semester tidak valid' || msg === 'Semester aktif tidak ditemukan') {
        return reply.status(400).send({ success: false, message: msg });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },

  async getImportTemplate(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      
      if (!tenantId) {
         return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      // Fetch sekolah to check jenjang
      const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
      const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '');

      // --- SISWA SHEET ---
      const headers = isSmkMak
        ? [
            'NAMA LENGKAP', 'NIS', 'NISN', 'NIK', 'EMAIL', 'JK (L/P)', 'TEMPAT LAHIR', 
            'TANGGAL LAHIR (YYYY-MM-DD)', 'ALAMAT', 'NO. HP', 'NAMA KELAS', 'JURUSAN', 'STATUS', 'NO. RFID'
          ]
        : [
            'NAMA LENGKAP', 'NIS', 'NISN', 'NIK', 'EMAIL', 'JK (L/P)', 'TEMPAT LAHIR', 
            'TANGGAL LAHIR (YYYY-MM-DD)', 'ALAMAT', 'NO. HP', 'NAMA KELAS', 'STATUS', 'NO. RFID'
          ];

      const quickPetunjuk = isSmkMak
        ? '1. Kolom BERWARNA EMAS wajib diisi (Nama, Kelas, Jurusan). Untuk PPDB, kosongkan Kelas, set status CALON.'
        : '1. Kolom BERWARNA EMAS wajib diisi (Nama & Kelas).';

      // Add helper rows at the top for better UX
      const dataWithHints = [
        ['PETUNJUK CEPAT:', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [quickPetunjuk, '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['2. Agar angka NOL tidak hilang di NO HP/NISN, awali dengan tanda PETIK SATU (\'). Contoh: \'0812345678', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['3. JK (Jenis Kelamin): Isi L untuk Laki-laki, P untuk Perempuan.', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['4. Format Tanggal: YYYY-MM-DD (Contoh: 2010-06-12).', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''], // Spacer
        headers
      ];

      const ws = XLSX.utils.aoa_to_sheet(dataWithHints);

      // Styles
      const hintStyle = {
        font: { bold: true, color: { rgb: "4F46E5" } },
        alignment: { horizontal: "left" }
      };

      const warningStyle = {
        font: { bold: true, color: { rgb: "B91C1C" } },
        alignment: { horizontal: "left" }
      };

      const reqHeaderStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" },
        border: { 
          bottom: { style: "medium", color: { rgb: "000000" } },
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const optHeaderStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E293B" } }, // Slate-800 for Optional
        alignment: { horizontal: "center" },
        border: { 
          bottom: { style: "medium", color: { rgb: "000000" } },
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Apply Styles to Hints (First 5 rows)
      for (let i = 0; i < 5; i++) {
        const cell = ws[XLSX.utils.encode_cell({ r: i, c: 0 })];
        if (cell) cell.s = i === 2 ? warningStyle : hintStyle;
      }

      const requiredCols = isSmkMak
        ? ['NAMA LENGKAP', 'NAMA KELAS', 'JURUSAN']
        : ['NAMA LENGKAP', 'NAMA KELAS'];

      // Apply Styles to Header (Row 6, index 6)
      headers.forEach((h, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 6, c: i })];
        if (cell) {
          if (requiredCols.includes(h)) {
            cell.s = reqHeaderStyle;
          } else {
            cell.s = optHeaderStyle;
          }
        }
      });

      ws['!cols'] = headers.map(() => ({ wch: 25 }));
      ws['!rows'] = Array(7).fill({ hpt: 20 });
      ws['!rows'][6] = { hpt: 30 }; // Header row taller

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Siswa');

      // --- PETUNJUK SHEET ---
      const instructions = [
        ['PETUNJUK PENGISIAN IMPORT SISWA'],
        [''],
        ['1. KOLOM BERWARNA EMAS WAJIB DIISI'],
        ['2. nama_siswa: Nama lengkap siswa'],
        ['3. kelas_id / NAMA KELAS: Bisa diisi ID Kelas atau Nama Kelas (Lihat sheet Referensi). Kosongkan jika PPDB (CALON).'],
        isSmkMak ? ['3b. JURUSAN: WAJIB diisi untuk sekolah SMK/MAK (contoh: RPL, TKJ, Akuntansi)'] : null,
        ['4. jenis_kelamin: Isi dengan "L" (Laki-laki) atau "P" (Perempuan)'],
        ['5. tanggal_lahir: Format YYYY-MM-DD (Contoh: 2010-06-12)'],
        ['6. status: Isi dengan "AKTIF", "CALON" (untuk PPDB belum dipetakan), "TIDAK_AKTIF", "LULUS", "PINDAH"'],
        [''],
        ['Tips: Gunakan sheet "Referensi Kelas" untuk mempermudah mencari nama/id kelas.'],
        isSmkMak ? ['Tips SMK/MAK: Nama kelas boleh sama jika jurusannya berbeda.'] : null,
      ].filter(Boolean) as string[][];

      const petunjukWs = XLSX.utils.aoa_to_sheet(instructions);
      
      // Style Title
      petunjukWs['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "4F46E5" } } };
      petunjukWs['A3'].s = { font: { bold: true, color: { rgb: "B91C1C" } } };

      XLSX.utils.book_append_sheet(wb, petunjukWs, 'Petunjuk');

      // --- REFERENSI SHEET ---
      const kelasRef = await kelasService.getKelasReference(tenantId, scope);
      const refData = kelasRef.map(k => {
        if (isSmkMak) {
          return {
            'ID Kelas': k.id,
            'Nama Kelas': k.nama_kelas,
            'Jurusan ⭐ (Wajib)': k.jurusan,
            'Tingkat': k.tingkat
          };
        } else {
          return {
            'ID Kelas (Sangat Disarankan)': k.id,
            'Nama Kelas': k.nama_kelas,
            'Tingkat': k.tingkat,
            'Jurusan': k.jurusan
          };
        }
      });
      const refWs = XLSX.utils.json_to_sheet(refData);
      
      if (isSmkMak) {
        refWs['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
        // Highlight Jurusan column header
        const jurCell = refWs[XLSX.utils.encode_cell({ r: 0, c: 2 })];
        if (jurCell) {
          jurCell.s = reqHeaderStyle;
        }
      } else {
        refWs['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 20 }];
      }
      
      XLSX.utils.book_append_sheet(wb, refWs, 'Referensi Kelas');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="import_siswa_template.xlsx"');
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
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

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

      const [ref, jurusans, sekolah] = await Promise.all([
        siswaService.getImportReferenceData(tenantId),
        prisma.jurusan.findMany({ where: { tenant_id: tenantId } }),
        prisma.sekolah.findFirst({ where: { tenant_id: tenantId } })
      ]);
      const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '') || jurusans.length > 0;
      const kelasList = ref.kelasList as any[];
      const kelasIdSet = new Set(kelasList.map(k => k.id));
      const jurusanNames = jurusans.map(j => j.nama);

      // Attempt to get active academic year/semester if not provided
      // Use query params if provided (for importing into past periods)
      const query = request.query as any;
      const activeYear = query.tahun_pelajaran_id 
        ? { id: query.tahun_pelajaran_id } 
        : ref.activeYear as any;
      const activeSemester = query.semester_id 
        ? { id: query.semester_id } 
        : ref.activeSemester as any;

      if (!activeYear || !activeSemester) {
        return reply.status(400).send({ 
          success: false, 
          message: 'Gagal Impor: Tahun Pelajaran atau Semester Aktif tidak ditemukan. Silakan pilih periode target atau aktifkan terlebih dahulu di menu Pengaturan Akademik.' 
        });
      }

      // Increase request timeout to 30 minutes for large imports
      request.raw.setTimeout(30 * 60 * 1000);

      // Smart Tenant Subscription Limit Check
      // Instead of blocking by total rows in Excel, we only count "Truly New" students.
      // This prevents blocking when the admin is just updating existing records.
      /* Core Platform: Quota check bypassed for students */
      
      // Extract NIS for matching
      const nisList = data
        .map(d => String(d.nis || '').trim())
        .filter(nis => nis.length > 0);

      // Extract Name + Kelas for matching rows without NIS
      const nameKelasPairs = data
        .filter(d => !d.nis)
        .map(d => {
          const nama = String(d.nama_siswa || '').trim();
          // Resolve kelas_id from nama_kelas or use kelas_id directly
          const kName = String(d.nama_kelas || '').trim();
          const kelas = kelasList.find(k => k.nama_kelas === kName || k.id === d.kelas_id);
          return { nama, kelas_id: kelas?.id };
        })
        .filter(p => p.nama && p.kelas_id);

      // Count existing students using both criteria
      let existingIds = new Set<string>();

      // 1. Match by NIS
      if (nisList.length > 0) {
        const matches = await prisma.siswa.findMany({
          where: { tenant_id: tenantId, nis: { in: nisList } },
          select: { id: true }
        });
        matches.forEach((m: any) => existingIds.add(m.id));
      }

      // 2. Match by Nama + Kelas (for rows that didn't have NIS or NIS didn't match)
      // To avoid expensive OR queries, we only check if we have few enough pairs or use a batch approach
      // For quota check, we can just do a few chunks or a composite check if Prisma supports it
      if (nameKelasPairs.length > 0) {
        // Simple heuristic: check first 500 to keep it fast, or use a composite OR
        const matches = await prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            OR: nameKelasPairs.slice(0, 1000).map(p => ({
              nama_siswa: p.nama,
              kelas_id: p.kelas_id
            }))
          },
          select: { id: true }
        });
        matches.forEach((m: any) => existingIds.add(m.id));
      }

      const existingInDb = existingIds.size;

      // Net increment calculation for logging
      const netIncrement = Math.max(0, data.length - existingInDb);
      
      console.log(`[Import Siswa] Core Platform - Unlimited Students. Total Rows: ${data.length}, Existing Match: ${existingInDb}, Net New: ${netIncrement}`);
      
      /* Core Platform: Quota check bypassed for students */
      /*
      try {
        await subscriptionService.checkTenantLimit(scope.tenantId, 'students', netIncrement);
      } catch (err: any) {
        ...
      }
      */

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failCount = 0;
      const errors: any[] = [];

      // Process in batches to handle large datasets (e.g. 3000 rows)
      // Reduced batch size to 10 to prevent connection pool exhaustion and timeouts
      const BATCH_SIZE = 10; 
      
      // Get IO instances (support both /socket.io and /api/socket.io)
      const io = request.server.io;
      const ioApi = request.server.ioApi;
      const userId = request.user?.id;
      const clientSocketId = request.headers['x-socket-id'];
      
      console.log(`[Import Siswa] Starting import. UserId: ${userId}, SocketId from header: ${clientSocketId}`);

      if (!io && !ioApi) console.warn('Warning: No Socket IO instance found on request.server');

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (row, batchIndex) => {
          const index = i + batchIndex;
          const rowNumber = row.__rowNum || (index + 2);
          try {
            // Map row to CreateSiswaInput
            const input: any = { ...row };

            // 1. Validate Required Fields (Nama & Kelas) per user request
            if (!input.nama_siswa || String(input.nama_siswa).trim() === '') {
               throw new Error('Nama Siswa is required');
            }

            const defaultStatus = String(query.status || 'AKTIF').trim().toUpperCase();
            const statusInput = String(input.status || input.Status || defaultStatus).trim().toUpperCase();
            const isCalon = statusInput === 'CALON';

            const inputJurusan = input.JURUSAN || input.jurusan || input.Jurusan || input.nama_jurusan;
            if (isSmkMak && isCalon && !inputJurusan) {
              throw new Error('Kolom JURUSAN wajib diisi untuk siswa CALON (PPDB) di sekolah SMK/MAK');
            }

            // Resolve Jurusan if provided
            let matchedJurusanId: string | undefined = undefined;
            if (inputJurusan) {
              const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
              if (matchJurusan.match) {
                matchedJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
              } else if (isSmkMak && isCalon) {
                throw new Error(`Jurusan "${inputJurusan}" tidak ditemukan`);
              }
            }
            input.jurusan_id = matchedJurusanId;

            // Resolve kelas_id
            let kelasId = input.kelas_id || input.nama_kelas;
            if (!isCalon) {
              if (kelasId) {
                 const kelasIdStr = String(kelasId).trim();
                 // check if it's an ID
                 if (kelasIdSet.has(kelasIdStr)) {
                    kelasId = kelasIdStr;
                 } else {
                    // Filter candidate kelas berdasarkan jurusan jika disediakan
                    let candidateKelas = kelasList;
                    if (inputJurusan) {
                      const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
                      if (matchJurusan.match) {
                        const targetJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
                        candidateKelas = kelasList.filter(k => k.jurusan_id === targetJurusanId);
                      }
                    }

                    const candidateNames = candidateKelas.map(k => k.nama_kelas);
                    const match = findBestMatch(kelasIdStr, candidateNames);
                    if (match.match) {
                       // Deteksi ambiguitas
                       const matchedKelasAll = candidateKelas.filter(k => k.nama_kelas === match.match);
                       if (matchedKelasAll.length > 1) {
                         const list = matchedKelasAll.map(k => k.Jurusan?.nama || 'tanpa jurusan').join(', ');
                         throw new Error(
                           `Kelas "${match.match}" ambigu — ditemukan di beberapa jurusan: ${list}. ` +
                           `Sertakan kolom JURUSAN di Excel untuk menentukan kelas yang tepat.`
                         );
                       }
                       kelasId = matchedKelasAll[0].id;
                    } else {
                       throw new Error(`Kelas '${kelasId}' tidak ditemukan`);
                    }
                 }
              } else {
                 throw new Error('Kolom Kelas wajib diisi untuk siswa aktif');
              }
              input.kelas_id = kelasId;
            } else {
              input.kelas_id = undefined;
            }
            input.status = statusInput;

            // 2. Default academic period if missing
            if (!input.tahun_pelajaran_id && activeYear) {
              input.tahun_pelajaran_id = activeYear.id;
            }
            if (!input.semester_id && activeSemester) {
              input.semester_id = activeSemester.id;
            }

            // 3. Date parsing
            const dateFields = ['tanggal_lahir', 'tanggal_masuk', 'tanggal_keluar'];
            dateFields.forEach(field => {
               if (input[field]) {
                 // XLSX might return number for dates, or string
                 if (typeof input[field] === 'number') {
                   // Excel date serial number to JS Date
                   // (value - 25569) * 86400 * 1000
                   input[field] = new Date((input[field] - 25569) * 86400 * 1000);
                 } else {
                   input[field] = new Date(input[field]);
                 }
               }
            });
            
            // 4. Handle OrangTua fields if flattened in Excel
            // ... (rest of logic)

            // 5. Create Siswa
            input.skipQuotaCheck = true; // Skip per-row check, we checked bulk
            const result: any = await siswaService.createSiswa(input, tenantId, scope);
            
            // Check operation type from metadata
            if (result._op === 'CREATED') {
               createdCount++;
            } else if (result._op === 'UPDATED') {
               updatedCount++;
            } else if (result._op === 'SKIPPED') {
               skippedCount++;
            }
          } catch (error: any) {
            failCount++;
            errors.push({ row: rowNumber, name: row.nama_siswa || 'Unknown', message: error.message });
          }
        }));

        // Emit progress event
        if (userId) {
             const currentProcessed = Math.min(data.length, i + BATCH_SIZE);
             const progress = Math.round((currentProcessed / data.length) * 100);
             
             const payload = {
                type: 'siswa',
                progress,
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount,
                failed: failCount
             };

             const roomName = `user:${userId}`;
             // Debug log for progress emission
             if (i === 0 || i % (BATCH_SIZE * 5) === 0) { // Log every 5th batch or first
                console.log(`[Import Siswa] Emitting progress to ${roomName} ${clientSocketId ? `& socket:${clientSocketId}` : ''}: ${progress}%`);
             }

             // Emit to user room (legacy/multi-tab support)
             if (io) io.to(roomName).emit('import_progress', payload);
             if (ioApi) ioApi.to(roomName).emit('import_progress', payload);

             // Emit to specific socket (if provided, guarantees delivery to requester)
             if (clientSocketId) {
                if (io) io.to(clientSocketId).emit('import_progress', payload);
                if (ioApi) ioApi.to(clientSocketId).emit('import_progress', payload);
             }
        } else {
             console.warn('[Import Siswa] Warning: No userId found in request, skipping progress emission');
        }
      }

      return reply.status(200).send({
        success: true,
        message: `Import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failCount}`,
        data: { 
          created: createdCount, 
          updated: updatedCount, 
          skipped: skippedCount,
          failed: failCount, 
          errors 
        }
      });

    } catch (error: any) {
      console.error('Import error:', error);
      
      // Handle subscription quota errors specifically
      if (error.message && (error.message.includes('Batas kuota') || error.message.includes('quota exceeded'))) {
         return reply.status(400).send({ success: false, message: error.message });
      }

      return reply.status(500).send({ success: false, message: 'Failed to import siswa', error: error.message });
    }
  },

  async deleteAll(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      
      if (!tenantId) {
         return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }

      const result = await siswaService.deleteAllSiswa(scope.tenantId);

      return reply.status(200).send({
        success: true,
        message: `Berhasil menghapus ${result.count} data siswa`,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
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

      // Get all students (large limit)
      const result = await siswaService.getAllSiswa(tenantId, scope, { page: 1, limit: 100000 });

      const data = result.data.map((s, index) => ({
        No: index + 1,
        'Nama Siswa': s.nama_siswa,
        NIS: s.nis || '',
        NISN: s.nisn || '',
        'Jenis Kelamin': s.jenis_kelamin === 'L' ? 'L' : 'P',
        Kelas: s.Kelas?.nama_kelas || '',
        Tingkat: s.Kelas?.tingkat || '',
        Email: s.User?.email || '',
        'Tempat Lahir': s.tempat_lahir || '',
        'Tanggal Lahir': s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString('id-ID') : '',
        Alamat: s.alamat || '',
        'No HP': s.no_hp || '',
        Status: s.status,
        'No RFID': s.no_rfid || ''
      }));

      if (data.length === 0) {
        data.push({ No: 1, 'Nama Siswa': 'Belum ada data', NIS: '', NISN: '', 'Jenis Kelamin': '', Kelas: '', Tingkat: '', Email: '', 'Tempat Lahir': '', 'Tanggal Lahir': '', Alamat: '', 'No HP': '', Status: '', 'No RFID': '' } as any);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // --- STYLING ---
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Header Style
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "4F46E5" } }, // Indigo 600
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Cell Style
      const cellStyle = {
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      // Apply Styles
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;
          
          if (R === 0) {
            ws[cell_address].s = headerStyle;
          } else {
            ws[cell_address].s = cellStyle;
            // Center align specific columns
            if ([0, 4, 5, 6, 12].includes(C)) {
              ws[cell_address].s = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
            }
          }
        }
      }

      // Auto-width columns
      const colWidths = [
        { wch: 5 },  // No
        { wch: 25 }, // Nama
        { wch: 15 }, // NIS
        { wch: 15 }, // NISN
        { wch: 5 },  // JK
        { wch: 15 }, // Kelas
        { wch: 10 }, // Tingkat
        { wch: 25 }, // Email
        { wch: 15 }, // Tempat Lahir
        { wch: 15 }, // Tanggal Lahir
        { wch: 30 }, // Alamat
        { wch: 15 }, // No HP
        { wch: 12 }, // Status
        { wch: 15 }  // RFID
      ];
      ws['!cols'] = colWidths;
      ws['!rows'] = [{ hpt: 30 }]; // Header height

      XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="siswa_export_${new Date().toISOString().split('T')[0]}.xlsx"`);

      return reply.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      return reply.status(500).send({ success: false, message: 'Export failed' });
    }
  },

  async uploadSiswaDocument(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
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

      const doc = await siswaService.uploadSiswaDocument({
        tenantId,
        siswaId,
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
  },

  async deleteSiswaDocument(request: any, reply: any) {
    try {
      const { id: siswaId, docId } = request.params;
      const tenantId = request.tenantId;

      await siswaService.deleteSiswaDocument({
        tenantId,
        siswaId,
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
  },

  async getSiswaDocuments(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;

      const docs = await siswaService.getSiswaDocuments({
        tenantId,
        siswaId
      });

      return reply.status(200).send({
        success: true,
        data: docs
      });
    } catch (error: any) {
      console.error('Get documents error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to retrieve documents' });
    }
  },

  async downloadSiswaDocument(request: any, reply: any) {
    try {
      const { id: siswaId, docId } = request.params;
      const tenantId = request.tenantId;

      const doc = await prisma.siswaDocument.findFirst({
        where: { id: docId, siswa_id: siswaId, tenant_id: tenantId }
      });

      if (!doc) {
        return reply.status(404).send({ success: false, message: 'Dokumen tidak ditemukan' });
      }

      const stream = storageService.createReadStream(doc.file_storage_path);
      reply.header('Content-Type', doc.mime_type);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_original_name)}"`);
      return reply.send(stream);
    } catch (error: any) {
      console.error('Download document error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to download file' });
    }
  },

  async getSiswaTimeline(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;
      const userId = request.user.id;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: request.user });

      const timeline = await siswaService.getSiswaTimeline({
        tenantId,
        siswaId,
        userContext: {
          id: userId,
          capabilities
        }
      });

      return reply.status(200).send({
        success: true,
        data: timeline
      });
    } catch (error: any) {
      console.error('Get timeline error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to retrieve timeline' });
    }
  },

  async completeSiswaExit(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;
      const actorUserId = request.user?.id || request.user?.userId;

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ success: false, message: 'File bukti Dapodik wajib diupload' });
      }

      const status = String(file.fields?.status?.value || 'KELUAR').toUpperCase();
      const alasan = file.fields?.alasan?.value ? String(file.fields.alasan.value).trim() : undefined;

      const result = await siswaService.completeSiswaExit({
        tenantId,
        siswaId,
        status,
        alasan,
        actorUserId,
        file
      });

      return reply.status(200).send({
        success: true,
        message: 'Proses keluar siswa berhasil diselesaikan',
        data: result
      });
    } catch (error: any) {
      console.error('Complete exit error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to complete student exit' });
    }
  },

  async getSiswaExitBundle(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;

      const { zipBuffer, filename } = await siswaService.getSiswaExitBundle({
        tenantId,
        siswaId
      });

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return reply.send(zipBuffer);
    } catch (error: any) {
      console.error('Get exit bundle error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to generate exit bundle' });
    }
  },

  async mapPpdbStudents(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const org = (request as any).organizationalScope;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      const { siswa_ids, target_kelas_id } = request.body || {};
      if (!Array.isArray(siswa_ids) || siswa_ids.length === 0) {
        return reply.status(400).send({ success: false, message: 'siswa_ids wajib berupa array yang tidak kosong' });
      }
      if (!target_kelas_id) {
        return reply.status(400).send({ success: false, message: 'target_kelas_id wajib diisi' });
      }

      const result = await siswaService.mapPpdbStudents(tenantId, org, {
        siswaIds: siswa_ids,
        targetKelasId: target_kelas_id
      });

      return reply.status(200).send({
        success: true,
        message: `Pemetaan PPDB selesai. Berhasil: ${result.success}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      console.error('PPDB mapping error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to map PPDB students' });
    }
  }
};
