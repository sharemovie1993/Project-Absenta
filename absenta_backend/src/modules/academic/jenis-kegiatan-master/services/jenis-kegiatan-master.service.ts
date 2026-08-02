import { prisma } from '@/utils/prisma'
import { RoleName, JenisKegiatan } from '../../../../constants/enums'
import { isSystemSuperAdmin } from '@/utils/rbac'
import { cacheInvalidationService } from '@/utils/cache-invalidation.service'

export interface CreateJKMInput { nama: string; tipe: JenisKegiatan; urutan?: number; aktif?: boolean }
export interface UpdateJKMInput { nama?: string; tipe?: JenisKegiatan; urutan?: number | null; aktif?: boolean }

export interface JenisKegiatanMasterResponse {
  id: string
  tenant_id: string
  nama: string
  tipe: JenisKegiatan
  urutan?: number | null
  aktif: boolean
  created_at: Date
  updated_at: Date
}

export interface PaginationParams { page: number; limit: number; search?: string; tipe?: JenisKegiatan }
export interface PaginatedJKMResponse {
  data: JenisKegiatanMasterResponse[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const PLATFORM_DEFAULT_JENIS_KEGIATAN: Array<{ nama: string; tipe: JenisKegiatan; urutan: number }> = [
  { nama: 'Ketarunaan', tipe: JenisKegiatan.PEMBIASAAN, urutan: 0 },
  { nama: 'KBM', tipe: JenisKegiatan.KBM, urutan: 1 },
  { nama: 'Upacara', tipe: JenisKegiatan.PEMBIASAAN, urutan: 2 },
  { nama: 'Apel Datang', tipe: JenisKegiatan.PEMBIASAAN, urutan: 3 },
  { nama: 'Apel Pulang', tipe: JenisKegiatan.PEMBIASAAN, urutan: 4 },
  { nama: 'Duha', tipe: JenisKegiatan.PEMBIASAAN, urutan: 5 },

  { nama: 'KBM 1', tipe: JenisKegiatan.KBM, urutan: 6 },
  { nama: 'KBM 2', tipe: JenisKegiatan.KBM, urutan: 7 },
  { nama: 'KBM 3', tipe: JenisKegiatan.KBM, urutan: 8 },
  { nama: 'KBM 4', tipe: JenisKegiatan.KBM, urutan: 9 },
  { nama: 'KBM 5', tipe: JenisKegiatan.KBM, urutan: 10 },
  { nama: 'KBM 6', tipe: JenisKegiatan.KBM, urutan: 11 },

  { nama: 'Pramuka', tipe: JenisKegiatan.ESKUL, urutan: 12 },
  { nama: 'Paskibra', tipe: JenisKegiatan.ESKUL, urutan: 13 },
  { nama: 'PMR', tipe: JenisKegiatan.ESKUL, urutan: 14 },
  { nama: 'Rohis', tipe: JenisKegiatan.ESKUL, urutan: 15 },
  { nama: 'Olahraga', tipe: JenisKegiatan.ESKUL, urutan: 16 },
  { nama: 'OSIS', tipe: JenisKegiatan.ESKUL, urutan: 17 },
  { nama: 'Seni', tipe: JenisKegiatan.ESKUL, urutan: 18 },
  { nama: 'Jurusan', tipe: JenisKegiatan.ESKUL, urutan: 19 },
]

export async function seedDefaultJenisKegiatanForTenant(tenantId: string): Promise<void> {
  for (const def of PLATFORM_DEFAULT_JENIS_KEGIATAN) {
    await prisma.jenisKegiatanMaster.upsert({
      where: {
        tenant_id_nama: {
          tenant_id: tenantId,
          nama: def.nama,
        },
      },
      update: {
        tipe: def.tipe,
        urutan: def.urutan,
        aktif: true,
      },
      create: {
        tenant_id: tenantId,
        nama: def.nama,
        tipe: def.tipe,
        urutan: def.urutan,
        aktif: true,
      },
    })
  }
}

export class JenisKegiatanMasterService {
  async getGrouped(role: RoleName, tenantId?: string): Promise<Array<{ kategori: JenisKegiatan; items: JenisKegiatanMasterResponse[] }>> {
    const where: any = {}
    if (!isSystemSuperAdmin(role, tenantId)) where.tenant_id = tenantId
    const items = await prisma.jenisKegiatanMaster.findMany({
      where,
      orderBy: [{ tipe: 'asc' }, { urutan: 'asc' }, { nama: 'asc' }],
    })
    const grouped = new Map<JenisKegiatan, JenisKegiatanMasterResponse[]>()
    for (const item of items as JenisKegiatanMasterResponse[]) {
      const key = item.tipe
      const arr = grouped.get(key) || []
      arr.push(item)
      grouped.set(key, arr)
    }
    return Array.from(grouped.entries()).map(([kategori, items]) => ({ kategori, items }))
  }

  async getAll(role: RoleName, tenantId?: string, params?: PaginationParams): Promise<PaginatedJKMResponse> {
    const where: any = {}
    if (!isSystemSuperAdmin(role, tenantId)) where.tenant_id = tenantId
    if (params?.search) {
      where.OR = [
        { nama: { contains: params.search, mode: 'insensitive' } },
        { tipe: { equals: params.search as any } }
      ]
    }
    if (params?.tipe) where.tipe = params.tipe
    const page = params?.page || 1
    const limit = params?.limit || 10
    const skip = (page - 1) * limit
    const total = await prisma.jenisKegiatanMaster.count({ where })
    const items = await prisma.jenisKegiatanMaster.findMany({
      where,
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      skip,
      take: limit,
    })
    return { data: items as JenisKegiatanMasterResponse[], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getById(id: string, role: RoleName, tenantId?: string): Promise<JenisKegiatanMasterResponse | null> {
    const where: any = { id }
    if (!isSystemSuperAdmin(role, tenantId)) where.tenant_id = tenantId
    const found = await prisma.jenisKegiatanMaster.findFirst({ where })
    return found as JenisKegiatanMasterResponse | null
  }

  async create(input: CreateJKMInput, tenantId: string): Promise<JenisKegiatanMasterResponse> {
    const duplicate = await prisma.jenisKegiatanMaster.findFirst({ where: { tenant_id: tenantId, nama: input.nama } })
    if (duplicate) throw new Error('Jenis Kegiatan name already exists in this tenant')
    const created = await prisma.jenisKegiatanMaster.create({
      data: {
        tenant_id: tenantId,
        nama: input.nama,
        tipe: input.tipe,
        urutan: input.urutan,
        aktif: input.aktif ?? true,
      },
    })
    await cacheInvalidationService.invalidateAttendanceCache(tenantId)
    return created as JenisKegiatanMasterResponse
  }

  async update(id: string, input: UpdateJKMInput, role: RoleName, tenantId?: string): Promise<JenisKegiatanMasterResponse> {
    const where: any = { id }
    if (!isSystemSuperAdmin(role, tenantId)) where.tenant_id = tenantId
    const existing = await prisma.jenisKegiatanMaster.findFirst({ where })
    if (!existing) throw new Error('Jenis Kegiatan not found or not in the same tenant')
    if (input.nama && input.nama !== existing.nama) {
      const dupeNama = await prisma.jenisKegiatanMaster.findFirst({
        where: { tenant_id: existing.tenant_id, nama: input.nama, id: { not: id } },
      })
      if (dupeNama) throw new Error('Jenis Kegiatan name already exists in this tenant')
    }
    const updated = await prisma.jenisKegiatanMaster.update({
      where: { id },
      data: {
        ...(input.nama && { nama: input.nama }),
        ...(input.tipe && { tipe: input.tipe }),
        ...(input.urutan !== undefined && { urutan: input.urutan }),
        ...(input.aktif !== undefined && { aktif: input.aktif }),
      },
    })
    await cacheInvalidationService.invalidateAttendanceCache(existing.tenant_id)
    return updated as JenisKegiatanMasterResponse
  }

  async remove(id: string, role: RoleName, tenantId?: string): Promise<void> {
    const where: any = { id }
    if (!isSystemSuperAdmin(role, tenantId)) where.tenant_id = tenantId
    const existing = await prisma.jenisKegiatanMaster.findFirst({ where })
    if (!existing) throw new Error('Jenis Kegiatan not found or not in the same tenant')
    await prisma.jenisKegiatanMaster.delete({ where: { id } })
    await cacheInvalidationService.invalidateAttendanceCache(existing.tenant_id)
  }
}
