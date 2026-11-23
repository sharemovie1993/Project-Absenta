import { prisma } from '../../../utils/prisma';
import { STATIC_PROVINSI, STATIC_KABUPATEN } from '../data/wilayah-static.data';

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, m => m.toUpperCase());
}

function formatRegencyName(name: string): string {
  if (!name) return '';
  const clean = name.trim();
  if (/^kota\s+/i.test(clean)) {
    const rawKota = clean.replace(/^kota\s+/i, '');
    return 'Kota ' + toTitleCase(rawKota);
  }
  if (/^kab(\.|upaten)?\s+/i.test(clean)) {
    const rawKab = clean.replace(/^kab(\.|upaten)?\s+/i, '');
    return toTitleCase(rawKab);
  }
  return toTitleCase(clean);
}

export const wilayahController = {
  // GET /api/wilayah/provinsi
  async getProvinsi(_request: any, reply: any) {
    try {
      let list = await prisma.refWilayah.findMany({
        where: { tingkat: 1 },
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
        },
      });

      if (list.length === 0) {
        list = STATIC_PROVINSI.map(p => ({ kode: p.kode, nama: p.nama }));
      }

      return reply.status(200).send({
        success: true,
        message: 'Daftar provinsi berhasil diambil',
        data: list.map(item => {
          const titleProv = toTitleCase(item.nama);
          return {
            value: titleProv,
            label: titleProv,
            kode: item.kode,
          };
        }),
      });
    } catch (error: any) {
      console.error('Error in getProvinsi:', error);
      const fallbackList = STATIC_PROVINSI.map(p => ({
        value: toTitleCase(p.nama),
        label: toTitleCase(p.nama),
        kode: p.kode,
      }));
      return reply.status(200).send({
        success: true,
        message: 'Daftar provinsi diambil dari cadangan offline',
        data: fallbackList,
      });
    }
  },

  // GET /api/wilayah/kabupaten?provinsi_kode=32 or ?provinsi_nama=JAWA BARAT
  async getKabupaten(request: any, reply: any) {
    try {
      const { provinsi_kode, provinsi_nama } = (request.query || {}) as { provinsi_kode?: string; provinsi_nama?: string };

      let parentKode = provinsi_kode;

      if (!parentKode && provinsi_nama && provinsi_nama.trim().length > 0) {
        const cleanProv = provinsi_nama.replace(/_/g, ' ').trim();
        const prov = await prisma.refWilayah.findFirst({
          where: {
            tingkat: 1,
            OR: [
              { nama: { equals: cleanProv, mode: 'insensitive' } },
              { nama: { contains: cleanProv, mode: 'insensitive' } },
            ],
          },
        });
        if (prov) {
          parentKode = prov.kode;
        } else {
          const staticProv = STATIC_PROVINSI.find(p => p.nama.toLowerCase().includes(cleanProv.toLowerCase()));
          if (staticProv) parentKode = staticProv.kode;
        }
      }

      if (!parentKode) {
        return reply.status(200).send({
          success: true,
          message: 'Pilih provinsi terlebih dahulu',
          data: [],
        });
      }

      const list = await prisma.refWilayah.findMany({
        where: { tingkat: 2, parent_kode: parentKode },
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Daftar kabupaten/kota berhasil diambil',
        data: list.map(item => {
          const formattedName = formatRegencyName(item.nama);
          return {
            value: formattedName,
            label: formattedName,
            kode: item.kode,
          };
        }),
      });
    } catch (error: any) {
      console.error('Error in getKabupaten:', error);
      return reply.status(200).send({
        success: true,
        message: error?.message || 'Gagal mengambil data kabupaten/kota',
        data: [],
      });
    }
  },

  // GET /api/wilayah/kecamatan?kabupaten_kode=3273 or ?kabupaten_nama=Purwakarta / Kota Bandung
  async getKecamatan(request: any, reply: any) {
    try {
      const { kabupaten_kode, kabupaten_nama } = (request.query || {}) as { kabupaten_kode?: string; kabupaten_nama?: string };

      let parentKode = kabupaten_kode;

      if (!parentKode && kabupaten_nama && kabupaten_nama.trim().length > 0) {
        const rawUpper = kabupaten_nama.replace(/_/g, ' ').trim().toUpperCase();
        const cleanKab = rawUpper.replace(/^KAB(\.|UPATEN)?\s+/i, '').replace(/^KOTA\s+/i, '').trim();
        const isKota = rawUpper.startsWith('KOTA');
        const exactTarget = isKota ? `KOTA ${cleanKab}` : `KABUPATEN ${cleanKab}`;

        let reg = await prisma.refWilayah.findFirst({
          where: {
            tingkat: 2,
            OR: [
              { nama: { equals: exactTarget, mode: 'insensitive' } },
              { nama: { equals: rawUpper, mode: 'insensitive' } },
            ],
          },
        });

        if (!reg) {
          reg = await prisma.refWilayah.findFirst({
            where: {
              tingkat: 2,
              nama: { contains: cleanKab, mode: 'insensitive' },
            },
          });
        }

        if (reg) {
          parentKode = reg.kode;
        } else {
          const staticKab = STATIC_KABUPATEN.find(k => k.nama.toLowerCase().includes(cleanKab.toLowerCase()));
          if (staticKab) parentKode = staticKab.kode;
        }
      }

      if (!parentKode) {
        return reply.status(200).send({
          success: true,
          message: 'Silakan pilih kabupaten/kota terlebih dahulu',
          data: [],
        });
      }

      const list = await prisma.refWilayah.findMany({
        where: { tingkat: 3, parent_kode: parentKode },
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Daftar kecamatan berhasil diambil',
        data: list.map(item => {
          const titleKec = toTitleCase(item.nama);
          return {
            value: titleKec,
            label: titleKec,
            kode: item.kode,
          };
        }),
      });
    } catch (error: any) {
      console.error('Error in getKecamatan:', error);
      return reply.status(200).send({
        success: true,
        message: error?.message || 'Gagal mengambil data kecamatan',
        data: [],
      });
    }
  },

  // GET /api/wilayah/kelurahan?kecamatan_kode=3273100 or ?kecamatan_nama=Coblong&kabupaten_nama=Kota Bandung / Purwakarta
  async getKelurahan(request: any, reply: any) {
    try {
      const { kecamatan_kode, kecamatan_nama, kabupaten_nama } = (request.query || {}) as { 
        kecamatan_kode?: string; 
        kecamatan_nama?: string;
        kabupaten_nama?: string;
      };

      let parentKode = kecamatan_kode;

      if (!parentKode && kecamatan_nama && kecamatan_nama.trim().length > 0) {
        const cleanKec = kecamatan_nama.replace(/_/g, ' ').trim().replace(/^kec(\.|amatan)?\s+/i, '').trim();
        let parentRegKode: string | undefined = undefined;

        if (kabupaten_nama) {
          const cleanKab = kabupaten_nama.replace(/_/g, ' ').trim().replace(/^kab(\.|upaten)?\s+/i, '').replace(/^kota\s+/i, '').trim();
          const reg = await prisma.refWilayah.findFirst({
            where: {
              tingkat: 2,
              OR: [
                { nama: { equals: kabupaten_nama.trim(), mode: 'insensitive' } },
                { nama: { equals: `KABUPATEN ${cleanKab}`, mode: 'insensitive' } },
                { nama: { equals: `KOTA ${cleanKab}`, mode: 'insensitive' } },
                { nama: { contains: cleanKab, mode: 'insensitive' } },
              ],
            },
          });
          if (reg) parentRegKode = reg.kode;
        }

        const distWhere: any = {
          tingkat: 3,
          OR: [
            { nama: { equals: kecamatan_nama.trim(), mode: 'insensitive' } },
            { nama: { contains: cleanKec, mode: 'insensitive' } },
          ],
        };
        if (parentRegKode) distWhere.parent_kode = parentRegKode;

        const dist = await prisma.refWilayah.findFirst({ where: distWhere });
        if (dist) parentKode = dist.kode;
      }

      if (!parentKode) {
        return reply.status(200).send({
          success: true,
          message: 'Pilih kecamatan terlebih dahulu',
          data: [],
        });
      }

      const list = await prisma.refWilayah.findMany({
        where: { tingkat: 4, parent_kode: parentKode },
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Daftar kelurahan/desa berhasil diambil',
        data: list.map(item => {
          const titleKel = toTitleCase(item.nama);
          return {
            value: titleKel,
            label: titleKel,
            kode: item.kode,
          };
        }),
      });
    } catch (error: any) {
      console.error('Error in getKelurahan:', error);
      return reply.status(200).send({
        success: true,
        message: error?.message || 'Gagal mengambil data kelurahan',
        data: [],
      });
    }
  },

  // GET /api/wilayah/kodepos?kecamatan_nama=Plered&kelurahan_nama=Cibogo Girang
  async getKodePos(_request: any, reply: any) {
    return reply.status(200).send({
      success: true,
      data: { kodepos: null },
    });
  },

  // POST /api/wilayah/sync
  async syncWilayah(_request: any, reply: any) {
    try {
      let seededCount = 0;
      for (const p of STATIC_PROVINSI) {
        const exists = await prisma.refWilayah.findUnique({ where: { kode: p.kode } });
        if (!exists) {
          await prisma.refWilayah.create({
            data: { kode: p.kode, nama: p.nama.toUpperCase(), tingkat: 1, parent_kode: null },
          });
          seededCount++;
        }
      }
      for (const k of STATIC_KABUPATEN) {
        const exists = await prisma.refWilayah.findUnique({ where: { kode: k.kode } });
        if (!exists) {
          await prisma.refWilayah.create({
            data: { kode: k.kode, nama: k.nama.toUpperCase(), tingkat: 2, parent_kode: k.provinsi_kode },
          });
          seededCount++;
        }
      }
      return reply.status(200).send({
        success: true,
        message: seededCount > 0
          ? `Sinkronisasi selesai: ${seededCount} data wilayah dasar berhasil ditambahkan.`
          : 'Master data wilayah sudah sinkron dan tersimpan lengkap di database lokal.',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal menyinkronkan data wilayah',
      });
    }
  },

  // GET /api/wilayah/stats
  async getStats(_request: any, reply: any) {
    try {
      const grouped = await prisma.refWilayah.groupBy({
        by: ['tingkat'],
        _count: { kode: true },
      });

      const stats = {
        provinsi: 0,
        kabupaten: 0,
        kecamatan: 0,
        kelurahan: 0,
        total: 0,
      };

      for (const row of grouped) {
        const c = row._count.kode || 0;
        if (row.tingkat === 1) stats.provinsi = c;
        else if (row.tingkat === 2) stats.kabupaten = c;
        else if (row.tingkat === 3) stats.kecamatan = c;
        else if (row.tingkat === 4) stats.kelurahan = c;
        stats.total += c;
      }

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memuat statistik wilayah',
      });
    }
  },

  // GET /api/wilayah/manage?tingkat=1&parent_kode=32&search=bandung&page=1&limit=25
  async listManageWilayah(request: any, reply: any) {
    try {
      const {
        tingkat,
        parent_kode,
        search,
        page = '1',
        limit = '25',
      } = (request.query || {}) as {
        tingkat?: string;
        parent_kode?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (tingkat && ['1', '2', '3', '4'].includes(String(tingkat))) {
        where.tingkat = parseInt(String(tingkat), 10);
      }
      if (parent_kode && parent_kode.trim()) {
        where.parent_kode = parent_kode.trim();
      }
      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { kode: { contains: q, mode: 'insensitive' } },
          { nama: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.refWilayah.count({ where }),
        prisma.refWilayah.findMany({
          where,
          orderBy: [{ tingkat: 'asc' }, { kode: 'asc' }],
          skip,
          take: limitNum,
          include: {
            Parent: {
              select: {
                kode: true,
                nama: true,
                tingkat: true,
              },
            },
            _count: {
              select: {
                Children: true,
              },
            },
          },
        }),
      ]);

      return reply.status(200).send({
        success: true,
        data: items,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memuat daftar master wilayah',
      });
    }
  },

  // POST /api/wilayah/manage
  async createWilayah(request: any, reply: any) {
    try {
      const { kode, nama, tingkat, parent_kode } = (request.body || {}) as {
        kode?: string;
        nama?: string;
        tingkat?: number;
        parent_kode?: string | null;
      };

      const cleanKode = String(kode || '').trim();
      const cleanNama = String(nama || '').trim().toUpperCase();
      const tingkatNum = Number(tingkat);
      const cleanParent = parent_kode ? String(parent_kode).trim() : null;

      if (!cleanKode || !cleanNama || ![1, 2, 3, 4].includes(tingkatNum)) {
        return reply.status(400).send({
          success: false,
          message: 'Kode, nama wilayah, dan tingkat (1-4) wajib diisi dengan benar.',
        });
      }

      if (tingkatNum > 1 && !cleanParent) {
        return reply.status(400).send({
          success: false,
          message: 'Wilayah tingkat Kabupaten/Kota, Kecamatan, dan Kelurahan wajib memiliki kode induk (parent_kode).',
        });
      }

      const existing = await prisma.refWilayah.findUnique({ where: { kode: cleanKode } });
      if (existing) {
        return reply.status(409).send({
          success: false,
          message: `Kode wilayah "${cleanKode}" sudah terdaftar (${existing.nama}).`,
        });
      }

      if (cleanParent) {
        const parentExists = await prisma.refWilayah.findUnique({ where: { kode: cleanParent } });
        if (!parentExists) {
          return reply.status(404).send({
            success: false,
            message: `Kode induk "${cleanParent}" tidak ditemukan di database.`,
          });
        }
      }

      const created = await prisma.refWilayah.create({
        data: {
          kode: cleanKode,
          nama: cleanNama,
          tingkat: tingkatNum,
          parent_kode: tingkatNum === 1 ? null : cleanParent,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Data wilayah berhasil ditambahkan',
        data: created,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal menambahkan data wilayah',
      });
    }
  },

  // PUT /api/wilayah/manage/:kode
  async updateWilayah(request: any, reply: any) {
    try {
      const targetKode = String(request.params?.kode || '').trim();
      const { nama, parent_kode } = (request.body || {}) as {
        nama?: string;
        parent_kode?: string | null;
      };

      if (!targetKode) {
        return reply.status(400).send({ success: false, message: 'Kode wilayah tidak valid' });
      }

      const existing = await prisma.refWilayah.findUnique({ where: { kode: targetKode } });
      if (!existing) {
        return reply.status(404).send({ success: false, message: 'Data wilayah tidak ditemukan' });
      }

      const cleanNama = nama ? String(nama).trim().toUpperCase() : existing.nama;
      const cleanParent =
        parent_kode !== undefined
          ? parent_kode
            ? String(parent_kode).trim()
            : null
          : existing.parent_kode;

      const updated = await prisma.refWilayah.update({
        where: { kode: targetKode },
        data: {
          nama: cleanNama,
          parent_kode: existing.tingkat === 1 ? null : cleanParent,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Data wilayah berhasil diperbarui',
        data: updated,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memperbarui data wilayah',
      });
    }
  },

  // DELETE /api/wilayah/manage/:kode
  async deleteWilayah(request: any, reply: any) {
    try {
      const targetKode = String(request.params?.kode || '').trim();
      if (!targetKode) {
        return reply.status(400).send({ success: false, message: 'Kode wilayah tidak valid' });
      }

      const existing = await prisma.refWilayah.findUnique({
        where: { kode: targetKode },
        include: { _count: { select: { Children: true } } },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, message: 'Data wilayah tidak ditemukan' });
      }

      await prisma.refWilayah.delete({ where: { kode: targetKode } });

      return reply.status(200).send({
        success: true,
        message: `Wilayah "${existing.nama}" (${existing.kode}) berhasil dihapus.`,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal menghapus data wilayah',
      });
    }
  },
};
