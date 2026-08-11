import { prisma } from '../../../utils/prisma';
import { seedWilayahIndonesia } from '../../../database/seeds/seed_wilayah';
import { STATIC_PROVINSI, STATIC_KABUPATEN } from '../data/wilayah-static.data';
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

// Multi-CDN Fallback URLs for max production resilience
const API_URLS = {
  provinces: [
    'https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/provinces.json',
    'https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json',
    'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/provinces.json',
  ],
  regencies: (provKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/regencies/${provKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/regencies/${provKode}.json`,
  ],
  districts: (kabKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/districts/${kabKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${kabKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/districts/${kabKode}.json`,
  ],
  villages: (kecKode: string) => [
    `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@master/api/villages/${kecKode}.json`,
    `https://emsifa.github.io/api-wilayah-indonesia/api/villages/${kecKode}.json`,
    `https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/api/villages/${kecKode}.json`,
  ],
};

async function fetchFromMultiCdn(urls: string[], timeout: number = 3000): Promise<any[] | null> {
  for (const url of urls) {
    try {
      const res = await axios.get<any[]>(url, { timeout });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Continue to next CDN url silently
    }
  }
  return null;
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

      // If database is empty, seed from bundled static fallback immediately
      if (list.length === 0) {
        // 1. Instant Static Fallback Mapping
        list = STATIC_PROVINSI.map(p => ({ kode: p.kode, nama: p.nama }));

        // 2. Non-blocking Background DB Seed & CDN Sync
        (async () => {
          try {
            // Seed static bundle first
            for (const p of STATIC_PROVINSI) {
              await prisma.refWilayah.upsert({
                where: { kode: p.kode },
                update: { nama: p.nama, tingkat: 1 },
                create: { kode: p.kode, nama: p.nama, tingkat: 1 },
              });
            }
            // Optional CDN refresh
            const liveProvs = await fetchFromMultiCdn(API_URLS.provinces, 3000);
            if (liveProvs && liveProvs.length > 0) {
              for (const p of liveProvs) {
                await prisma.refWilayah.upsert({
                  where: { kode: String(p.id) },
                  update: { nama: p.name, tingkat: 1 },
                  create: { kode: String(p.id), nama: p.name, tingkat: 1 },
                });
              }
            }
          } catch (err) {
            console.warn('[WILAYAH] Background prov seed warn:', err);
          }
        })();
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
      
      // Zero-Downtime Fallback: return bundled static provinces if DB fails
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
        if (prov) {
          parentKode = prov.kode;
        } else {
          // Check static fallback for parentKode
          const staticProv = STATIC_PROVINSI.find(p => p.nama.toLowerCase().includes(cleanProv.toLowerCase()));
          if (staticProv) parentKode = staticProv.kode;
        }
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

      // If list is empty for parentKode, use bundled static kabupaten or multi-CDN
      if (list.length === 0) {
        const staticKabList = STATIC_KABUPATEN.filter(k => !parentKode || k.parent_kode === parentKode);
        if (staticKabList.length > 0) {
          list = staticKabList.map(k => ({ kode: k.kode, nama: k.nama, parent_kode: k.parent_kode ?? null }));
        }

        // Non-blocking CDN fetch & DB populate
        if (parentKode) {
          const pk = parentKode;
          (async () => {
            try {
              // Populate static first
              for (const k of staticKabList) {
                await prisma.refWilayah.upsert({
                  where: { kode: k.kode },
                  update: { nama: k.nama, tingkat: 2, parent_kode: k.parent_kode },
                  create: { kode: k.kode, nama: k.nama, tingkat: 2, parent_kode: k.parent_kode },
                });
              }
              // CDN fetch
              const liveRegencies = await fetchFromMultiCdn(API_URLS.regencies(pk), 3000);
              if (liveRegencies && liveRegencies.length > 0) {
                for (const r of liveRegencies) {
                  await prisma.refWilayah.upsert({
                    where: { kode: String(r.id) },
                    update: { nama: r.name, tingkat: 2, parent_kode: pk },
                    create: { kode: String(r.id), nama: r.name, tingkat: 2, parent_kode: pk },
                  });
                }
              }
            } catch (err) {
              console.warn('[WILAYAH] Background kab seed warn:', err);
            }
          })();
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

      const { provinsi_kode } = (request.query || {}) as { provinsi_kode?: string };
      const fallbackList = STATIC_KABUPATEN
        .filter(k => !provinsi_kode || k.parent_kode === provinsi_kode)
        .map(k => ({
          value: formatRegencyName(k.nama),
          label: formatRegencyName(k.nama),
          kode: k.kode,
        }));

      return reply.status(200).send({
        success: true,
        message: 'Daftar kabupaten/kota diambil dari cadangan offline',
        data: fallbackList,
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
        if (reg) {
          parentKode = reg.kode;
        } else {
          const staticKab = STATIC_KABUPATEN.find(k => k.nama.toLowerCase().includes(cleanKab.toLowerCase()));
          if (staticKab) parentKode = staticKab.kode;
        }
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
        const pk = parentKode;
        const liveDistricts = await fetchFromMultiCdn(API_URLS.districts(pk), 4000);
        if (liveDistricts && liveDistricts.length > 0) {
          for (const d of liveDistricts) {
            await prisma.refWilayah.upsert({
              where: { kode: String(d.id) },
              update: { nama: d.name, tingkat: 3, parent_kode: pk },
              create: { kode: String(d.id), nama: d.name, tingkat: 3, parent_kode: pk },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: whereClause,
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true, parent_kode: true },
          });
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
          const liveDistricts = await fetchFromMultiCdn(API_URLS.districts(parentRegKode), 4000);
          if (liveDistricts && liveDistricts.length > 0) {
            for (const d of liveDistricts) {
              await prisma.refWilayah.upsert({
                where: { kode: String(d.id) },
                update: { nama: d.name, tingkat: 3, parent_kode: parentRegKode },
                create: { kode: String(d.id), nama: d.name, tingkat: 3, parent_kode: parentRegKode },
              });
            }
            dist = await prisma.refWilayah.findFirst({ where: distWhere });
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
        const pk = parentKode;
        const liveVillages = await fetchFromMultiCdn(API_URLS.villages(pk), 4000);
        if (liveVillages && liveVillages.length > 0) {
          for (const v of liveVillages) {
            await prisma.refWilayah.upsert({
              where: { kode: String(v.id) },
              update: { nama: v.name, tingkat: 4, parent_kode: pk },
              create: { kode: String(v.id), nama: v.name, tingkat: 4, parent_kode: pk },
            });
          }
          list = await prisma.refWilayah.findMany({
            where: whereClause,
            orderBy: { nama: 'asc' },
            select: { kode: true, nama: true, parent_kode: true },
          });
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
