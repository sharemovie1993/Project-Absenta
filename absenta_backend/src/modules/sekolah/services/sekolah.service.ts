import { prisma } from '@/utils/prisma';
import { RoleName } from '@/constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';
import axios from 'axios';
import https from 'https';

export type SekolahPayload = {
  nama: string;
  npsn?: string | null;
  nss?: string | null;
  kode_sekolah?: string | null;
  jenjang?: string | null;
  akreditasi?: string | null;
  alamat?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kota?: string | null;
  provinsi?: string | null;
  kode_pos?: string | null;
  telepon?: string | null;
  email?: string | null;
  website?: string | null;
  kepala_sekolah?: string | null;
  nip_kepala?: string | null;
  logo_url?: string | null;
  tahun_berdiri?: number | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sk_wali_kelas_template?: any;
};

export type SekolahUpdatePayload = Partial<SekolahPayload>;

export type MasterSekolahLookupResult = {
  source: 'cache' | 'kemendik' | 'registered';
  data: any;
  is_registered?: boolean;
  registered_info?: {
    tenant_name: string;
    admin_name: string;
    admin_contact: string;
  };
};

const normalizeNpsn = (raw: any, strict = true): string => {
  const cleaned = String(raw ?? '').trim().replace(/\D/g, '');
  if (strict && !/^\d{8}$/.test(cleaned)) {
    throw new Error('NPSN wajib 8 digit angka');
  }
  return cleaned;
};

const decodeHtml = (input: string): string => {
  let s = String(input ?? '');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/&amp;/gi, '&');
  s = s.replace(/&quot;/gi, '"');
  s = s.replace(/&#39;/gi, "'");
  s = s.replace(/&lt;/gi, '<');
  s = s.replace(/&gt;/gi, '>');
  s = s.replace(/&#(\d+);/g, (_, num) => {
    const code = Number(num);
    if (!Number.isFinite(code)) return '';
    try {
      return String.fromCodePoint(code);
    } catch {
      return '';
    }
  });
  return s;
};

const htmlToText = (html: string): string => {
  const cleaned = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|p|div|li|h\d|table|section)>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const decoded = decodeHtml(cleaned).replace(/\r/g, '');
  return decoded
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractValue = (text: string, labels: string[]): string | null => {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${escapeRegExp(label)}\\s*:?\\s*(.+?)\\s*$`, 'im');
    const match = text.match(re);
    if (match && match[1]) return String(match[1]).trim();
  }
  return null;
};

const parseKemendikSekolah = (html: string, npsn: string) => {
  const text = htmlToText(html);
  if (!text) return null;
  // Flexible "not found" check
  if (/data\s+tidak\s+ditemukan|satuan\s+pendidikan\s+tidak\s+ditemukan/i.test(text)) return null;

  const nama = extractValue(text, ['Nama']);
  const npsnFromPage = extractValue(text, ['NPSN']);
  if (!nama) return null;
  
  // Strict NPSN verification (CRITICAL to prevent poisoned cache)
  if (npsnFromPage) {
    const cleanedPageNpsn = normalizeNpsn(npsnFromPage, false);
    if (cleanedPageNpsn && cleanedPageNpsn !== npsn) {
      console.warn(`[SekolahService] NPSN Mismatch! Expected ${npsn}, but page said ${cleanedPageNpsn}. Rejecting data.`);
      return null; 
    }
  }

  const sources = [
    'https://referensi.data.kemendikdasmen.go.id',
    'https://referensi.data.kemdikbud.go.id'
  ];

  return {
    npsn,
    nama,
    status_sekolah: extractValue(text, ['Status Sekolah']),
    bentuk_pendidikan: extractValue(text, ['Bentuk Pendidikan']),
    jenjang: extractValue(text, ['Jenjang Pendidikan']),
    akreditasi: extractValue(text, ['Akreditasi']),
    alamat: extractValue(text, ['Alamat']),
    kelurahan: extractValue(text, ['Desa/Kelurahan', 'Kelurahan', 'Desa']),
    kecamatan: extractValue(text, ['Kecamatan/Kota (LN)', 'Kecamatan']),
    kota: extractValue(text, ['Kab.-Kota/Negara (LN)', 'Kabupaten/Kota', 'Kab.-Kota']),
    provinsi: extractValue(text, ['Propinsi/Luar Negeri (LN)', 'Provinsi', 'Propinsi']),
    kode_pos: extractValue(text, ['Kode Pos', 'Kodepos']),
    telepon: extractValue(text, ['No. Telepon', 'Telepon', 'Telp']),
    email: extractValue(text, ['Email']),
    website: extractValue(text, ['Website', 'Web']),
    kepala_sekolah: extractValue(text, ['Kepala Sekolah']),
    nip_kepala: extractValue(text, ['NIP Kepala Sekolah', 'NIP Kepala']),
    sumber_url: `${sources[0]}/tabs.php?npsn=${npsn}`,
    fetched_at: new Date(),
  };
};

export class SekolahService {
  async getByTenant(tenantId?: string | null) {
    if (!tenantId) return null;
    return await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
  }

  async create(tenantId: string, payload: SekolahPayload) {
    const existing = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
    if (existing) {
      throw new Error('Sekolah for this tenant already exists');
    }
    const sekolah = await prisma.sekolah.create({
      data: {
        tenant_id: tenantId,
        nama: payload.nama,
        npsn: payload.npsn ?? null,
        nss: payload.nss ?? null,
        kode_sekolah: payload.kode_sekolah ?? null,
        jenjang: payload.jenjang ?? null,
        akreditasi: payload.akreditasi ?? null,
        alamat: payload.alamat ?? null,
        kelurahan: payload.kelurahan ?? null,
        kecamatan: payload.kecamatan ?? null,
        kota: payload.kota ?? null,
        provinsi: payload.provinsi ?? null,
        kode_pos: payload.kode_pos ?? null,
        telepon: payload.telepon ?? null,
        email: payload.email ?? null,
        website: payload.website ?? null,
        kepala_sekolah: payload.kepala_sekolah ?? null,
        nip_kepala: payload.nip_kepala ?? null,
        logo_url: payload.logo_url ?? null,
        tahun_berdiri: payload.tahun_berdiri ?? null,
        timezone: payload.timezone ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
      },
    });
    return sekolah;
  }

  async update(requestingRole: RoleName, tenantId: string | null | undefined, payload: SekolahUpdatePayload) {
    const targetTenant = isSystemSuperAdmin(requestingRole, tenantId) ? tenantId ?? null : tenantId ?? null;
    if (!targetTenant) throw new Error('Tenant ID is required');

    const existing = await prisma.sekolah.findFirst({ where: { tenant_id: targetTenant } });
    if (!existing) {
      throw new Error('Sekolah for this tenant not found');
    }

    const sekolah = await prisma.sekolah.update({
      where: { id: existing.id },
      data: {
        ...(payload.nama !== undefined && { nama: payload.nama }),
        ...(payload.npsn !== undefined && { npsn: payload.npsn }),
        ...(payload.nss !== undefined && { nss: payload.nss }),
        ...(payload.kode_sekolah !== undefined && { kode_sekolah: payload.kode_sekolah }),
        ...(payload.jenjang !== undefined && { jenjang: payload.jenjang }),
        ...(payload.akreditasi !== undefined && { akreditasi: payload.akreditasi }),
        ...(payload.alamat !== undefined && { alamat: payload.alamat }),
        ...(payload.kelurahan !== undefined && { kelurahan: payload.kelurahan }),
        ...(payload.kecamatan !== undefined && { kecamatan: payload.kecamatan }),
        ...(payload.kota !== undefined && { kota: payload.kota }),
        ...(payload.provinsi !== undefined && { provinsi: payload.provinsi }),
        ...(payload.kode_pos !== undefined && { kode_pos: payload.kode_pos }),
        ...(payload.telepon !== undefined && { telepon: payload.telepon }),
        ...(payload.email !== undefined && { email: payload.email }),
        ...(payload.website !== undefined && { website: payload.website }),
        ...(payload.kepala_sekolah !== undefined && { kepala_sekolah: payload.kepala_sekolah }),
        ...(payload.nip_kepala !== undefined && { nip_kepala: payload.nip_kepala }),
        ...(payload.logo_url !== undefined && { logo_url: payload.logo_url }),
        ...(payload.tahun_berdiri !== undefined && { tahun_berdiri: payload.tahun_berdiri as any }),
        ...(payload.timezone !== undefined && { timezone: payload.timezone }),
        ...(payload.latitude !== undefined && { latitude: payload.latitude as any }),
        ...(payload.longitude !== undefined && { longitude: payload.longitude as any }),
        ...(payload.sk_wali_kelas_template !== undefined && { sk_wali_kelas_template: payload.sk_wali_kelas_template }),
      },
    });
    return sekolah;
  }

  async lookupMasterByNpsn(rawNpsn: string, options?: { forceRefresh?: boolean }): Promise<MasterSekolahLookupResult | null> {
    const npsn = normalizeNpsn(rawNpsn);
    const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Days

    // 1. Check if already registered in our system (Priority 1)
    const existingRegistration = await prisma.sekolah.findFirst({
      where: { npsn },
      include: {
        Tenant: {
          select: {
            id: true,
            name: true,
            status: true,
            users: {
              where: { 
                Role: { name: 'ADMIN' },
                status: 'ACTIVE'
              },
              take: 1,
              select: {
                full_name: true,
                no_hp: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (existingRegistration && existingRegistration.Tenant && existingRegistration.Tenant.status === 'ACTIVE') {
      const admin = existingRegistration.Tenant.users[0];
      let contact = 'Hubungi Administrator';
      let adminName = 'Administrator';
      
      if (admin) {
        adminName = admin.full_name;
        // Mask Phone: 08123456789 -> 0812-XXXX-6789
        if (admin.no_hp && admin.no_hp.length > 8) {
           const visibleStart = admin.no_hp.slice(0, 4);
           const visibleEnd = admin.no_hp.slice(-4);
           contact = `${visibleStart}-XXXX-${visibleEnd}`;
        } else if (admin.email) {
           // Mask Email: admin@sekolah.com -> ad***@sekolah.com
           const [user, domain] = admin.email.split('@');
           const maskedUser = user.slice(0, 2) + '***';
           contact = `${maskedUser}@${domain}`;
        }
      }

      return {
        source: 'registered',
        data: existingRegistration,
        is_registered: true,
        registered_info: {
          tenant_name: existingRegistration.Tenant.name,
          admin_name: adminName,
          admin_contact: contact
        }
      };
    }

    // 2. Check Master Cache (Priority 2)
    const existing = await prisma.masterSekolah.findUnique({ where: { npsn } });
    if (existing && !options?.forceRefresh) {
      const lastFetched = new Date(existing.fetched_at || existing.updated_at).getTime();
      const isStale = (Date.now() - lastFetched) > CACHE_TTL_MS;

      if (!isStale) {
        return { source: 'cache', data: existing, is_registered: false };
      }
      console.log(`[SekolahService] Cache for NPSN ${npsn} is stale (${Math.floor((Date.now() - lastFetched) / (1000 * 60 * 60 * 24))} days old). Auto-fixing...`);
    }

    // 3. Check Kemdikbud with Multi-Source Failover (Priority 3)
    const sources = [
      'https://referensi.data.kemendikdasmen.go.id',
      'https://referensi.data.kemdikbud.go.id'
    ];

    for (const baseUrl of sources) {
      const url = `${baseUrl}/tabs.php?npsn=${npsn}`;
      try {
        console.log(`[SekolahService] Attempting Smart Lookup (Auto-Fix) from: ${url}`);
        const response = await axios.get(url, {
          timeout: 10000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          responseType: 'text',
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 400,
        });

        const parsed = parseKemendikSekolah(String(response.data ?? ''), npsn);
        if (parsed) {
          console.log(`[SekolahService] Successfully fetched and auto-fixed data for NPSN ${npsn}`);
          
          const saved = await prisma.masterSekolah.upsert({
            where: { npsn },
            create: parsed,
            update: {
              ...parsed,
              fetched_at: new Date(),
            },
          });

          return { source: 'kemendik', data: saved, is_registered: false };
        }
      } catch (e: any) {
        console.warn(`[SekolahService] Failed to lookup NPSN ${npsn} from ${baseUrl}: ${e.message}`);
      }
    }

    // Fallback: If Kemdikbud is down but we have stale cache, return stale cache as last resort
    if (existing) {
       console.warn(`[SekolahService] Kemdikbud lookup failed, returning stale cache for NPSN ${npsn}`);
       return { source: 'cache', data: existing, is_registered: false };
    }

    return null;
  }
}
