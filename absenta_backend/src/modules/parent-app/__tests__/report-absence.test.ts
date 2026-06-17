import Fastify from 'fastify'
import { parentAppRoutes } from '../routes/parent-app.routes'

jest.mock('../guards/parent-auth.guard', () => {
  return {
    parentAuthGuard: async (request: any, _reply: any) => {
      const siswaId = request.params?.id || 's1'
      request.parent = {
        id: 'parent-1',
        tenant_id: 'tenant-1',
        OrangTuaSiswa: [
          { Siswa: { id: siswaId, status: 'AKTIF' } }
        ]
      }
    }
  }
})

jest.mock('../../attendance/gerbang/services/gerbang.service', () => {
  return {
    gerbangService: {
      markManualAbsence: jest.fn(async (_tenantId: string, _siswaId: string, _status: string, _userId: string, _source: string, _ket?: string) => {
        return { success: true, message: 'Absence recorded successfully', data: { id: 'abs-1' } }
      })
    }
  }
})

describe('Parent App - Report Absence (SAKIT/IZIN)', () => {
  let fastify: any
  let markManualAbsenceMock: any

  beforeAll(async () => {
    fastify = Fastify({ logger: false })
    await fastify.register(async (instance: any) => {
      await parentAppRoutes(instance)
    }, { prefix: '/api/parent-app' })
    await fastify.ready()
    const gs = require('../../attendance/gerbang/services/gerbang.service')
    markManualAbsenceMock = gs.gerbangService.markManualAbsence
  })

  afterAll(async () => {
    await fastify.close()
  })

  test('should accept SAKIT and trigger service', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/parent-app/siswa/s1/lapor-absen',
      payload: { status: 'SAKIT', keterangan: 'Demam' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
    expect(markManualAbsenceMock).toHaveBeenCalledWith('tenant-1', 's1', 'SAKIT', 'parent-1', 'PARENT_APP', 'Demam')
  })

  test('should accept IZIN and trigger service', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/parent-app/siswa/s1/lapor-absen',
      payload: { status: 'IZIN', keterangan: 'Urusan keluarga' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBeTruthy()
    expect(markManualAbsenceMock).toHaveBeenCalledWith('tenant-1', 's1', 'IZIN', 'parent-1', 'PARENT_APP', 'Urusan keluarga')
  })

  test('should reject ALPA for parent report', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/parent-app/siswa/s1/lapor-absen',
      payload: { status: 'ALPA', keterangan: 'Tidak boleh' }
    })
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBeFalsy()
    expect(body.message).toMatch(/Only SAKIT and IZIN/)
  })
})
