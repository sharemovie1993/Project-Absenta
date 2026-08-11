import { prisma } from '../../../utils/prisma';
import { seedWilayahIndonesia } from '../../../database/seeds/seed_wilayah';
import axios from 'axios';

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
        try {
          const res = await axios.get<any[]>('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json', { timeout: 6000 });
          const provinces = res.data || [];
          for (const p of provinces) {
            await prisma.refWilayah.upsert({
              where: { kode: p.id },
              update: { nama: p.name, tingkat: 1 },
              create: { kode: p.id, nama: p.name, tingkat: 1 },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: { tingkat: 1 },
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true },
          });
        } catch (e) {
          console.warn('Live fetch provinces failed:', e);
        }
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
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal mengambil data provinsi',
        data: [],
      });
    }
  },

  // GET /api/wilayah/kabupaten?provinsi_kode=32 or ?provinsi_nama=JAWA BARAT
  async getKabupaten(request: any, reply: any) {
    try {
      const { provinsi_kode, provinsi_nama } = (request.query || {}) as { provinsi_kode?: string; provinsi_nama?: string };

      let parentKode = provinsi_kode;

      if (!parentKode && provinsi_nama) {
        const cleanProv = provinsi_nama.trim();
        const prov = await prisma.refWilayah.findFirst({
          where: {
            tingkat: 1,
            OR: [
              { nama: { equals: cleanProv, mode: 'insensitive' } },
              { nama: { contains: cleanProv, mode: 'insensitive' } },
            ],
          },
        });
        if (prov) parentKode = prov.kode;
      }

      const whereClause: any = { tingkat: 2 };
      if (parentKode) whereClause.parent_kode = parentKode;

      let list = await prisma.refWilayah.findMany({
        where: whereClause,
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      if (parentKode && list.length === 0) {
        try {
          const res = await axios.get<any[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${parentKode}.json`, { timeout: 6000 });
          const regencies = res.data || [];
          for (const r of regencies) {
            await prisma.refWilayah.upsert({
              where: { kode: r.id },
              update: { nama: r.name, tingkat: 2, parent_kode: parentKode },
              create: { kode: r.id, nama: r.name, tingkat: 2, parent_kode: parentKode },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: whereClause,
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true, parent_kode: true },
          });
        } catch (e) {
          console.warn('Live fetch regencies failed for prov:', parentKode, e);
        }
      }

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
      return reply.status(500).send({
        success: false,
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

      if (!parentKode && kabupaten_nama) {
        const cleanKab = kabupaten_nama.trim().replace(/^kab(\.|upaten)?\s+/i, '').replace(/^kota\s+/i, '').trim();
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
        if (reg) parentKode = reg.kode;
      }

      const whereClause: any = { tingkat: 3 };
      if (parentKode) whereClause.parent_kode = parentKode;

      let list = await prisma.refWilayah.findMany({
        where: whereClause,
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      if (parentKode && list.length === 0) {
        try {
          const res = await axios.get<any[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${parentKode}.json`, { timeout: 6000 });
          const districts = res.data || [];
          for (const d of districts) {
            await prisma.refWilayah.upsert({
              where: { kode: d.id },
              update: { nama: d.name, tingkat: 3, parent_kode: parentKode },
              create: { kode: d.id, nama: d.name, tingkat: 3, parent_kode: parentKode },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: whereClause,
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true, parent_kode: true },
          });
        } catch (e) {
          console.warn('Live fetch districts failed for regency:', parentKode, e);
        }
      }

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
      return reply.status(500).send({
        success: false,
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

      if (!parentKode && kecamatan_nama) {
        const cleanKec = kecamatan_nama.trim().replace(/^kec(\.|amatan)?\s+/i, '').trim();
        let parentRegKode: string | undefined = undefined;

        if (kabupaten_nama) {
          const cleanKab = kabupaten_nama.trim().replace(/^kab(\.|upaten)?\s+/i, '').replace(/^kota\s+/i, '').trim();
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

        let dist = await prisma.refWilayah.findFirst({ where: distWhere });

        if (!dist && parentRegKode) {
          try {
            const res = await axios.get<any[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${parentRegKode}.json`, { timeout: 6000 });
            const districts = res.data || [];
            for (const d of districts) {
              await prisma.refWilayah.upsert({
                where: { kode: d.id },
                update: { nama: d.name, tingkat: 3, parent_kode: parentRegKode },
                create: { kode: d.id, nama: d.name, tingkat: 3, parent_kode: parentRegKode },
              });
            }
            dist = await prisma.refWilayah.findFirst({ where: distWhere });
          } catch (e) {
            console.warn('Live fetch districts failed for regency:', parentRegKode, e);
          }
        }

        if (dist) parentKode = dist.kode;
      }

      if (!parentKode) {
        return reply.status(200).send({
          success: true,
          message: 'Pilih kecamatan terlebih dahulu',
          data: [],
        });
      }

      const whereClause: any = { tingkat: 4, parent_kode: parentKode };

      let list = await prisma.refWilayah.findMany({
        where: whereClause,
        orderBy: { nama: 'asc' },
        select: {
          kode: true,
          nama: true,
          parent_kode: true,
        },
      });

      if (parentKode && list.length === 0) {
        try {
          const res = await axios.get<any[]>(`https://emsifa.github.io/api-wilayah-indonesia/api/villages/${parentKode}.json`, { timeout: 6000 });
          const villages = res.data || [];
          for (const v of villages) {
            await prisma.refWilayah.upsert({
              where: { kode: v.id },
              update: { nama: v.name, tingkat: 4, parent_kode: parentKode },
              create: { kode: v.id, nama: v.name, tingkat: 4, parent_kode: parentKode },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: whereClause,
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true, parent_kode: true },
          });
        } catch (e) {
          console.warn('Live fetch villages failed for district:', parentKode, e);
        }
      }

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
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal mengambil data kelurahan/desa',
        data: [],
      });
    }
  },

  // GET /api/wilayah/kodepos?kecamatan_nama=Plered&kelurahan_nama=Cibogo Girang&kabupaten_nama=Purwakarta
  async getKodePos(request: any, reply: any) {
    try {
      const { kecamatan_nama, kelurahan_nama, kabupaten_nama } = (request.query || {}) as {
        kecamatan_nama?: string;
        kelurahan_nama?: string;
        kabupaten_nama?: string;
      };

      const cleanKec = (kecamatan_nama || '').trim().toLowerCase();
      const cleanKel = (kelurahan_nama || '').trim().toLowerCase();
      const cleanKab = (kabupaten_nama || '').trim().replace(/^kab(\.|upaten)?\s+/i, '').replace(/^kota\s+/i, '').trim().toLowerCase();

      const searchTerms = [cleanKel, cleanKec].filter(Boolean);

      for (const term of searchTerms) {
        if (!term) continue;
        try {
          const res = await axios.get<string[]>(`https://kodepos.id/suggest?term=${encodeURIComponent(term)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 4000
          });
          const list = res.data || [];
          if (Array.isArray(list) && list.length > 0) {
            let matched = list.find(item => {
              const lower = item.toLowerCase();
              return (!cleanKab || lower.includes(cleanKab)) && (!cleanKec || lower.includes(cleanKec));
            });

            if (!matched && cleanKec) {
              matched = list.find(item => item.toLowerCase().includes(cleanKec));
            }

            if (!matched) matched = list[0];

            const zipCodeMatch = matched ? matched.match(/^(\d{5})/) : null;
            if (zipCodeMatch) {
              return reply.status(200).send({
                success: true,
                data: { kode_pos: zipCodeMatch[1] }
              });
            }
          }
        } catch (e) {
          console.warn('kodepos.id suggest warning:', e);
        }
      }

      return reply.status(200).send({
        success: true,
        data: { kode_pos: '' }
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, data: { kode_pos: '' } });
    }
  },

  // POST /api/wilayah/sync
  async syncWilayah(_request: any, reply: any) {
    try {
      seedWilayahIndonesia().catch(err => console.error('Background seed error:', err));

      return reply.status(200).send({
        success: true,
        message: 'Sinkronisasi master data wilayah Indonesia dari API Kemendagri sedang berjalan di latar belakang.',
      });
    } catch (error: any) {
      console.error('Error in syncWilayah:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memulai sinkronisasi wilayah',
      });
    }
  },
};
