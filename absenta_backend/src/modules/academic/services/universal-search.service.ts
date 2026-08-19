import { prisma } from '../../../utils/prisma';
import { DataScope } from '../../../types/fastify';

export interface UniversalSearchResponse {
  success: boolean;
  data: {
    id: string;
    type: 'siswa' | 'guru';
    name: string;
    identifier: string | null; // NIS or NIP
    nisn?: string | null;
    nis?: string | null;
    nip?: string | null;
    nik?: string | null;
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

    const isDigitsOnly = /^\d+$/.test(search);
    const len = search.length;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);

    let siswaList: any[] = [];
    let guruList: any[] = [];

    // ── Kasus 1: Pola NIP 18 Digit (Guru PNS / PPPK) ───────────────────────────
    if (isDigitsOnly && len === 18) {
      guruList = await prisma.guru.findMany({
        where: {
          tenant_id: tenantId,
          nip: search
        },
        include: { User: { select: { email: true } } },
        take: limit
      });
    }
    // ── Kasus 2: Pola NIK 16 Digit (Guru / Tendik Honorer) ──────────────────────
    else if (isDigitsOnly && len === 16) {
      guruList = await prisma.guru.findMany({
        where: {
          tenant_id: tenantId,
          nik: search
        },
        include: { User: { select: { email: true } } },
        take: limit
      });
    }
    // ── Kasus 3: Pola UUID (36 Karakter) ───────────────────────────────────────
    else if (isUuid) {
      const [sList, gList] = await Promise.all([
        prisma.siswa.findMany({
          where: { tenant_id: tenantId, id: search },
          include: { Kelas: { select: { nama_kelas: true } }, User: { select: { email: true } } },
          take: limit
        }),
        prisma.guru.findMany({
          where: { tenant_id: tenantId, id: search },
          include: { User: { select: { email: true } } },
          take: limit
        })
      ]);
      siswaList = sList;
      guruList = gList;
    }
    // ── Kasus 4: Pola NISN / RFID 10 Digit ─────────────────────────────────────
    else if (isDigitsOnly && len === 10) {
      const [sList, gList] = await Promise.all([
        prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            status: 'AKTIF',
            OR: [
              { nisn: search },
              { no_rfid: search }
            ]
          },
          include: { Kelas: { select: { nama_kelas: true } }, User: { select: { email: true } } },
          take: limit
        }),
        prisma.guru.findMany({
          where: {
            tenant_id: tenantId,
            no_rfid: search
          },
          include: { User: { select: { email: true } } },
          take: limit
        })
      ]);
      siswaList = sList;
      guruList = gList;
    }
    // ── Kasus 5: Pola Angka Pendek (3-9 Digit, misal NIS / RFID Hex) ───────────
    else if (isDigitsOnly && len < 10) {
      const [sList, gList] = await Promise.all([
        prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            status: 'AKTIF',
            OR: [
              { nis: { startsWith: search } },
              { no_rfid: { contains: search, mode: 'insensitive' } },
              { nisn: { startsWith: search } }
            ]
          },
          include: { Kelas: { select: { nama_kelas: true } }, User: { select: { email: true } } },
          take: limit
        }),
        prisma.guru.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { nip: { startsWith: search } },
              { no_rfid: { contains: search, mode: 'insensitive' } }
            ]
          },
          include: { User: { select: { email: true } } },
          take: limit
        })
      ]);
      siswaList = sList;
      guruList = gList;
    }
    // ── Kasus 6: Pola Teks / Nama (Mengandung Huruf / Spasi) ────────────────────
    else {
      const [sList, gList] = await Promise.all([
        prisma.siswa.findMany({
          where: {
            tenant_id: tenantId,
            status: 'AKTIF',
            OR: [
              { nama_siswa: { contains: search, mode: 'insensitive' } },
              { nis: { contains: search, mode: 'insensitive' } },
              { nisn: { contains: search, mode: 'insensitive' } },
              { no_rfid: { contains: search, mode: 'insensitive' } }
            ]
          },
          include: { Kelas: { select: { nama_kelas: true } }, User: { select: { email: true } } },
          take: limit
        }),
        prisma.guru.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { nama_guru: { contains: search, mode: 'insensitive' } },
              { nip: { contains: search, mode: 'insensitive' } },
              { nik: { contains: search, mode: 'insensitive' } },
              { no_rfid: { contains: search, mode: 'insensitive' } }
            ]
          },
          include: { User: { select: { email: true } } },
          take: limit
        })
      ]);
      siswaList = sList;
      guruList = gList;
    }

    // ── Format & Combine ───────────────────────────────────────────────────────
    const formattedSiswa = siswaList.map(s => ({
      id: s.id,
      type: 'siswa' as const,
      name: s.nama_siswa,
      identifier: s.nisn || s.nis || s.id,
      nisn: s.nisn,
      nis: s.nis,
      rfid: s.no_rfid,
      kelas: s.Kelas?.nama_kelas,
      status: s.status,
      original_data: s
    }));

    const formattedGuru = guruList.map(g => ({
      id: g.id,
      type: 'guru' as const,
      name: g.nama_guru,
      identifier: g.nip || g.nik || g.id,
      nip: g.nip,
      nik: g.nik,
      rfid: g.no_rfid,
      original_data: g
    }));

    return [...formattedSiswa, ...formattedGuru].slice(0, limit * 2);
  }
}
