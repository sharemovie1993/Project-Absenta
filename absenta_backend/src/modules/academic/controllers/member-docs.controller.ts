import { prisma } from '@/utils/prisma';
import { waGatewayService } from '../../../services/wa-gateway.service';

export class MemberDocsController {
  async listAllMemberDocs(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const user = request.user;
      const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
      const isSuperAdmin = roleName === 'SUPERADMIN';

      const {
        entity_type,
        entity_id,
        kategori,
        search,
        page = '1',
        limit = '20'
      } = request.query as any;

      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));
      const skip = (p - 1) * l;

      if (!tenantId && !isSuperAdmin) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      if (entity_type === 'GURU') {
        // Query Guru Documents
        const whereClause: any = {};
        if (!isSuperAdmin) {
          whereClause.tenant_id = tenantId;
        }

        if (entity_id) {
          whereClause.guru_id = entity_id;
        }

        if (kategori) {
          whereClause.kategori = kategori;
        }

        if (search) {
          whereClause.OR = [
            { judul: { contains: search, mode: 'insensitive' } },
            { Guru: { nama_guru: { contains: search, mode: 'insensitive' } } }
          ];
        }

        const [total, docs] = await Promise.all([
          prisma.guruDocument.count({ where: whereClause }),
          prisma.guruDocument.findMany({
            where: whereClause,
            include: {
              Guru: {
                select: {
                  nama_guru: true,
                  no_hp: true
                }
              }
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: l
          })
        ]);

        const mappedDocs = docs.map((d: any) => ({
          id: d.id,
          guru_id: d.guru_id,
          judul: d.judul,
          kategori: d.kategori,
          file_original_name: d.file_original_name,
          mime_type: d.mime_type,
          size_bytes: d.size_bytes,
          created_at: d.created_at.toISOString(),
          updated_at: d.updated_at.toISOString(),
          entity_type: 'GURU' as const,
          entity_id: d.guru_id,
          entity_name: d.Guru?.nama_guru || 'Unknown Guru',
          entity_no_hp: d.Guru?.no_hp || undefined
        }));

        return reply.status(200).send({
          success: true,
          data: mappedDocs,
          pagination: {
            page: p,
            limit: l,
            total,
            totalPages: Math.ceil(total / l)
          }
        });
      } else {
        // Query Siswa Documents (Default)
        const whereClause: any = {};
        if (!isSuperAdmin) {
          whereClause.tenant_id = tenantId;
        }

        if (entity_id) {
          whereClause.siswa_id = entity_id;
        }

        if (kategori) {
          whereClause.kategori = kategori;
        }

        if (search) {
          whereClause.OR = [
            { judul: { contains: search, mode: 'insensitive' } },
            { Siswa: { nama_siswa: { contains: search, mode: 'insensitive' } } }
          ];
        }

        const [total, docs] = await Promise.all([
          prisma.siswaDocument.count({ where: whereClause }),
          prisma.siswaDocument.findMany({
            where: whereClause,
            include: {
              Siswa: {
                select: {
                  nama_siswa: true,
                  no_hp: true
                }
              }
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: l
          })
        ]);

        const mappedDocs = docs.map((d: any) => ({
          id: d.id,
          siswa_id: d.siswa_id,
          judul: d.judul,
          kategori: d.kategori,
          file_original_name: d.file_original_name,
          mime_type: d.mime_type,
          size_bytes: d.size_bytes,
          created_at: d.created_at.toISOString(),
          updated_at: d.updated_at.toISOString(),
          entity_type: 'SISWA' as const,
          entity_id: d.siswa_id,
          entity_name: d.Siswa?.nama_siswa || 'Unknown Siswa',
          entity_no_hp: d.Siswa?.no_hp || undefined
        }));

        return reply.status(200).send({
          success: true,
          data: mappedDocs,
          pagination: {
            page: p,
            limit: l,
            total,
            totalPages: Math.ceil(total / l)
          }
        });
      }
    } catch (error: any) {
      console.error('List member documents error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to list member documents' });
    }
  }

  async notifyRescan(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { docId } = request.params;
      const { entity_type, entity_id, pesan } = request.body as any;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      let noHp: string | null = null;
      let targetName = 'Warga Sekolah';
      let docTitle = 'Dokumen';

      if (entity_type === 'GURU') {
        const teacher = await prisma.guru.findUnique({
          where: { id: entity_id },
          select: { nama_guru: true, no_hp: true }
        });
        if (teacher) {
          noHp = teacher.no_hp;
          targetName = teacher.nama_guru;
        }

        const doc = await prisma.guruDocument.findUnique({
          where: { id: docId },
          select: { judul: true }
        });
        if (doc) {
          docTitle = doc.judul;
        }
      } else {
        const student = await prisma.siswa.findUnique({
          where: { id: entity_id },
          select: { nama_siswa: true, no_hp: true }
        });
        if (student) {
          noHp = student.no_hp;
          targetName = student.nama_siswa;
        }

        const doc = await prisma.siswaDocument.findUnique({
          where: { id: docId },
          select: { judul: true }
        });
        if (doc) {
          docTitle = doc.judul;
        }
      }

      if (!noHp) {
        return reply.status(400).send({
          success: false,
          message: 'Nomor WhatsApp tidak terdaftar untuk profil terkait'
        });
      }

      const defaultPesan = `Halo ${targetName},\n\nBerkas dokumen Anda "${docTitle}" terdeteksi buram atau tidak terbaca. Harap lakukan upload ulang dokumen yang valid melalui portal absensi Anda.\n\nTerima kasih.`;
      const finalMsg = pesan ? String(pesan).trim() : defaultPesan;

      // Kirim menggunakan soft send agar tidak crash jika WA gateway belum scan QR
      await waGatewayService.sendMessageSoft(tenantId, noHp, finalMsg, 'MEMBER_DOC_RESCAN');

      return reply.status(200).send({
        success: true,
        message: 'Notifikasi WhatsApp masuk antrean pengiriman'
      });
    } catch (error: any) {
      console.error('Notify rescan error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to send WhatsApp notification' });
    }
  }
}
