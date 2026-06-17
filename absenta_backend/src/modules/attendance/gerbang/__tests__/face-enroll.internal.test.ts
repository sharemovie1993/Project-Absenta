import { GerbangService } from '../../gerbang/services/gerbang.service'

jest.mock('@/utils/prisma', () => {
  return {
    prisma: {
      siswa: {
        findFirst: jest.fn(async (args: any) => {
          if (args?.where?.id === 'missing') return null
          return { id: args?.where?.id, tenant_id: args?.where?.tenant_id }
        })
      },
      siswaFaceTemplate: {
        upsert: jest.fn(async (_args: any) => {
          return { id: 'tmpl1', embedding_type: 'ARCFACE_512' }
        })
      }
    }
  }
})

describe('GerbangService.faceEnroll internal mode', () => {
  const service = new GerbangService()
  const userId = 'u1'
  const tenantId = 't1'
  const base64 = 'data:image/jpeg;base64,AAAA'

  beforeAll(() => {
    process.env.FACE_EMBEDDING_MODE = 'internal'
  })

  test('returns success on valid input', async () => {
    const res = await service.faceEnroll({ siswa_id: 's1', image_base64: base64 }, userId, tenantId)
    expect(res.success).toBeTruthy()
    expect(res.data?.embedding_type).toBe('ARCFACE_512')
  })

  test('returns error when student not found', async () => {
    const res = await service.faceEnroll({ siswa_id: 'missing', image_base64: base64 }, userId, tenantId)
    expect(res.success).toBeFalsy()
    expect(typeof res.message).toBe('string')
  })
})
