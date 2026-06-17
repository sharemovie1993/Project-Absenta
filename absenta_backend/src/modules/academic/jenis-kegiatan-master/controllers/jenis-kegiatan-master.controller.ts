import { JenisKegiatanMasterService, CreateJKMInput, UpdateJKMInput } from '../services/jenis-kegiatan-master.service'

const service = new JenisKegiatanMasterService()

export const jenisKegiatanMasterController = {
  async getGrouped(request: any, reply: any) {
    try {
      const user = request.user!
      const tenantId = (request as any).tenantId || user.tenantId
      const result = await service.getGrouped(user.roleName, tenantId)
      return reply.status(200).send({ success: true, message: 'Jenis Kegiatan grouped by kategori', data: result })
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },

  async getAll(request: any, reply: any) {
    try {
      const user = request.user!
      const tenantId = (request as any).tenantId || user.tenantId
      const page = parseInt(request.query.page as string) || 1
      const limit = parseInt(request.query.limit as string) || 10
      const search = request.query.search as string
      const result = await service.getAll(user.roleName, tenantId, { page, limit, search, tipe: request.query.tipe })
      return reply.status(200).send({ success: true, message: 'Jenis Kegiatan retrieved successfully', data: result.data, pagination: result.pagination })
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },

  async getById(request: any, reply: any) {
    try {
      const user = request.user!
      const tenantId = (request as any).tenantId || user.tenantId
      const { id } = request.params
      const found = await service.getById(id, user.roleName, tenantId)
      if (!found) return reply.status(404).send({ success: false, message: 'Jenis Kegiatan not found', data: null })
      return reply.status(200).send({ success: true, message: 'Jenis Kegiatan retrieved successfully', data: found })
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },

  async create(request: any, reply: any) {
    try {
      const user = request.user!
      const body = request.body as CreateJKMInput
      if (!body || !body.nama || typeof body.nama !== 'string' || body.nama.trim() === '') {
        return reply.status(400).send({ success: false, message: 'Invalid request: nama wajib diisi', data: null })
      }
      if (!body.tipe || typeof body.tipe !== 'string') {
        return reply.status(400).send({ success: false, message: 'Invalid request: tipe wajib diisi', data: null })
      }
      const { JenisKegiatan } = await import('../../../../constants/enums')
      const validTipes = Object.values(JenisKegiatan as any)
      if (!validTipes.includes(body.tipe)) {
        return reply.status(400).send({ success: false, message: 'Invalid request: tipe tidak dikenal', data: null })
      }
      const created = await service.create(body, user.tenantId)
      return reply.status(201).send({ success: true, message: 'Jenis Kegiatan created successfully', data: created })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.status(400).send({ success: false, message: error.message, data: null })
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },

  async update(request: any, reply: any) {
    try {
      const user = request.user!
      const { id } = request.params
      const body = request.body as UpdateJKMInput
      const updated = await service.update(id, body, user.roleName, user.tenantId)
      return reply.status(200).send({ success: true, message: 'Jenis Kegiatan updated successfully', data: updated })
    } catch (error) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already exists'))) {
        return reply.status(400).send({ success: false, message: error.message, data: null })
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },

  async remove(request: any, reply: any) {
    try {
      const user = request.user!
      const { id } = request.params
      await service.remove(id, user.roleName, user.tenantId)
      return reply.status(200).send({ success: true, message: 'Jenis Kegiatan deleted successfully', data: null })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(400).send({ success: false, message: error.message, data: null })
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null })
    }
  },
}
