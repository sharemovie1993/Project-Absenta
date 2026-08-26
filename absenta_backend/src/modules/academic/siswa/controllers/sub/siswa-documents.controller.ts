// @ts-nocheck
import { smartReadSheet } from '@/utils/excel-import.utils';
import { findBestMatch } from '@/utils/normalization';
import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { SiswaService } from '../../services/siswa.service';
import { storageService } from '@/infra/storage/storage.service';
import { kelasService } from '../../../kelas/services/kelas.service';
import { getPaginationParams } from '@/utils/pagination';
import { RoleName } from '@/constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

const siswaService = new SiswaService();

export const siswaDocumentsController = {
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

      let doc = tenantId
        ? await prisma.siswaDocument.findFirst({
            where: { id: docId, siswa_id: siswaId, tenant_id: tenantId }
          })
        : null;

      if (!doc) {
        doc = await prisma.siswaDocument.findFirst({
          where: { id: docId, siswa_id: siswaId }
        });
      }

      if (!doc) {
        return reply.status(404).send({ success: false, message: 'Dokumen tidak ditemukan' });
      }

      const fileExists = await storageService.exists(doc.file_storage_path);
      if (!fileExists) {
        return reply.status(404).send({ success: false, message: 'Berkas fisik dokumen tidak ditemukan pada storage' });
      }

      const buffer = await storageService.readFileBuffer(doc.file_storage_path);
      reply.header('Content-Type', doc.mime_type || 'image/png');
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_original_name || 'document')}"`);
      return reply.send(buffer);
    } catch (error: any) {
      console.error('Download document error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to download file' });
    }
  }
};
