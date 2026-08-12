import { prisma } from '@/utils/prisma';
import { applyDataScope } from '@/utils/applyDataScope';
import { DataScope } from '@/types/fastify';
import { PaginationParams, PaginatedGuruResponse, GuruResponse } from '../guru.service';
import { PRISMA_GURU_USER_SELECT, enrichGuruWithUser } from '../helpers/guru-mapper.helper';

export async function getAllGuruQuery(
  scope: DataScope,
  params?: PaginationParams
): Promise<PaginatedGuruResponse> {
  let whereClause: any = {};

  // Apply Tenant Scope (Explicitly ignore userId to preserve existing behavior)
  whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

  // Filter by user_id if provided
  if (params?.user_id) {
    whereClause.user_id = params.user_id;
  }

  if (params?.status_kepegawaian && params.status_kepegawaian !== 'ALL') {
    whereClause.status_kepegawaian = params.status_kepegawaian;
  }

  if (params?.jenis_kelamin && params.jenis_kelamin !== 'ALL') {
    whereClause.jenis_kelamin = params.jenis_kelamin;
  }

  if (params?.jenis_ptk && params.jenis_ptk !== 'ALL') {
    whereClause.jenis_ptk = params.jenis_ptk;
  }

  // Add search functionality
  if (params?.search) {
    const search = String(params.search || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
    whereClause.OR = [
      ...(isUuid ? [{ id: search }] : []),
      { nama_guru: { contains: search, mode: 'insensitive' } },
      { nip: { contains: search, mode: 'insensitive' } },
      { no_rfid: { contains: search, mode: 'insensitive' } },
      { User: { email: { contains: search, mode: 'insensitive' } } },
      { User: { full_name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  // Calculate pagination
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;

  // Get total count
  const total = await prisma.guru.count({ where: whereClause });

  // Get paginated data
  const gurus = await prisma.guru.findMany({
    where: whereClause,
    include: {
      User: PRISMA_GURU_USER_SELECT,
    },
    orderBy: {
      created_at: 'desc',
    },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);
  const enrichedGuru = gurus.map((g) => enrichGuruWithUser(g));

  return {
    data: enrichedGuru as GuruResponse[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
