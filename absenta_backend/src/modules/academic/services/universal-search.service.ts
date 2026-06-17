import { prisma } from '../../../utils/prisma';
import { DataScope } from '../../../types/fastify';

export interface UniversalSearchResponse {
  success: boolean;
  data: {
    id: string;
    type: 'siswa' | 'guru';
    name: string;
    identifier: string | null; // NIS or NIP
    rfid: string | null;
    kelas?: string;
    status?: string;
    original_data: any;
  }[];
}

export class UniversalSearchService {
  async search(scope: DataScope, query: string, limit: number = 10): Promise<UniversalSearchResponse['data']> {
    const tenantId = scope.tenantId;
    const search = String(query || '').trim();
    
    if (!search) return [];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);

    // 1. Search Siswa
    const siswaPromise = prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        status: 'AKTIF',
        OR: [
          ...(isUuid ? [{ id: search }] : []),
          { nama_siswa: { contains: search, mode: 'insensitive' } },
          { nis: { contains: search, mode: 'insensitive' } },
          { no_rfid: { contains: search, mode: 'insensitive' } },
        ]
      },
      include: {
        Kelas: {
          select: { nama_kelas: true }
        },
        User: {
          select: { email: true }
        }
      },
      take: limit
    });

    // 2. Search Guru
    const guruPromise = prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          ...(isUuid ? [{ id: search }] : []),
          { nama_guru: { contains: search, mode: 'insensitive' } },
          { nip: { contains: search, mode: 'insensitive' } },
          { no_rfid: { contains: search, mode: 'insensitive' } },
        ]
      },
      include: {
        User: {
          select: { email: true }
        }
      },
      take: limit
    });

    const [siswaList, guruList] = await Promise.all([siswaPromise, guruPromise]);

    // 3. Format & Combine
    const formattedSiswa = siswaList.map(s => ({
      id: s.id,
      type: 'siswa' as const,
      name: s.nama_siswa,
      identifier: s.nis,
      rfid: s.no_rfid,
      kelas: s.Kelas?.nama_kelas,
      status: s.status,
      original_data: s
    }));

    const formattedGuru = guruList.map(g => ({
      id: g.id,
      type: 'guru' as const,
      name: g.nama_guru,
      identifier: g.nip,
      rfid: g.no_rfid,
      original_data: g
    }));

    return [...formattedSiswa, ...formattedGuru].slice(0, limit * 2);
  }
}
