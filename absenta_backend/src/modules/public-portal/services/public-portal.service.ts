import { prisma } from '@/utils/prisma';
import { getRedisConnection } from '@/infra/redis/redisClient';
import {
  PublicSchoolProfile,
  PublicStaffMember,
  PublicProgram,
  PublicAchievement,
  PublicHubinData,
  PublicFacility,
  PublicArticleSummary,
  PublicArticleDetail,
} from '../types/public-portal.types';

const PUBLIC_CACHE_TTL = 900; // 15 menit

export class PublicPortalService {
  private getRedis() {
    try {
      return getRedisConnection();
    } catch {
      return null;
    }
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const redis = this.getRedis();
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      if (data) return JSON.parse(data) as T;
    } catch {
      // Ignore cache failure
    }
    return null;
  }

  private async setToCache(key: string, value: any, ttlSeconds = PUBLIC_CACHE_TTL): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore cache failure
    }
  }

  public async invalidateTenantCache(tenantId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      const keys = await redis.keys(`pub:*:${tenantId}*`);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Resolves a tenant by slug (subdomain), custom_domain, or raw ID
   */
  public async resolveTenant(identifier: string): Promise<{ id: string; subdomain: string | null; custom_domain: string | null } | null> {
    const clean = identifier.trim().toLowerCase();
    const cacheKey = `pub:tenant_resolve:${clean}`;
    const cached = await this.getFromCache<{ id: string; subdomain: string | null; custom_domain: string | null }>(cacheKey);
    if (cached) return cached;

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: clean },
          { custom_domain: clean },
          { id: clean },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        subdomain: true,
        custom_domain: true,
      },
    });

    if (tenant) {
      await this.setToCache(cacheKey, tenant, 3600); // cache 1 jam
      return tenant;
    }
    return null;
  }

  /**
   * Mendapatkan profil lengkap sekolah untuk landing page publik
   */
  public async getSchoolProfile(tenantId: string): Promise<PublicSchoolProfile | null> {
    const cacheKey = `pub:profile:${tenantId}`;
    const cached = await this.getFromCache<PublicSchoolProfile>(cacheKey);
    if (cached) return cached;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        sekolah: true,
        config: true,
      },
    });

    if (!tenant) return null;

    const sekolah = tenant.sekolah[0] || null;

    // Aggregated stats
    const [totalSiswa, totalGuru, totalJurusan, totalMitra, totalFasilitas] = await Promise.all([
      prisma.siswa.count({ where: { tenant_id: tenantId, status: 'AKTIF' } }).catch(() => 0),
      prisma.guru.count({ where: { tenant_id: tenantId } }).catch(() => 0),
      prisma.jurusan.count({ where: { tenant_id: tenantId } }).catch(() => 0),
      prisma.mitraIndustri.count({ where: { tenant_id: tenantId, mou_status: 'AKTIF' } }).catch(() => 0),
      prisma.sarprasLocation.count({ where: { tenant_id: tenantId, deleted_at: null } }).catch(() => 0),
    ]);

    // Parse configs into dynamic web CMS object
    const configMap = new Map<string, string>();
    tenant.config.forEach((c) => configMap.set(c.key, c.value));

    let socialLinks: any = {};
    try {
      socialLinks = JSON.parse(configMap.get('web_social_links') || '{}');
    } catch {
      socialLinks = {};
    }

    let misiList: string[] = [];
    try {
      misiList = JSON.parse(configMap.get('web_misi') || '[]');
    } catch {
      misiList = configMap.get('web_misi') ? [configMap.get('web_misi')!] : [];
    }

    let heroImages: string[] = [];
    try {
      heroImages = JSON.parse(configMap.get('web_hero_images') || '[]');
    } catch {
      heroImages = [];
    }

    const profile: PublicSchoolProfile = {
      id: tenant.id,
      nama: sekolah?.nama || tenant.name,
      npsn: sekolah?.npsn || null,
      jenjang: sekolah?.jenjang || 'SMK',
      akreditasi: sekolah?.akreditasi || null,
      kurikulum: sekolah?.kurikulum || 'Kurikulum Merdeka',
      alamat: sekolah?.alamat || null,
      kelurahan: sekolah?.kelurahan || null,
      kecamatan: sekolah?.kecamatan || null,
      kota: sekolah?.kota || null,
      provinsi: sekolah?.provinsi || null,
      kode_pos: sekolah?.kode_pos || null,
      telepon: sekolah?.telepon || null,
      email: sekolah?.email || null,
      website: sekolah?.website || null,
      kepala_sekolah: sekolah?.kepala_sekolah || null,
      nip_kepala: sekolah?.nip_kepala || null,
      logo_url: sekolah?.logo_url || tenant.logo_url || null,
      tahun_berdiri: sekolah?.tahun_berdiri || null,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      stats: {
        total_siswa: totalSiswa,
        total_guru: totalGuru,
        total_jurusan: totalJurusan,
        total_mitra_industri: totalMitra,
        total_fasilitas: totalFasilitas,
      },
      web_config: {
        theme_color: configMap.get('web_theme_color') || '#2563EB',
        hero_title: configMap.get('web_hero_title') || `Selamat Datang di ${sekolah?.nama || tenant.name}`,
        hero_subtitle: configMap.get('web_hero_subtitle') || 'Mewujudkan Generasi Unggul, Berkarakter, dan Berdaya Saing Global.',
        hero_images: heroImages.length > 0 ? heroImages : [sekolah?.logo_url || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80'],
        sambutan_kepsek: configMap.get('web_sambutan_kepsek') || null,
        foto_kepsek: configMap.get('web_foto_kepsek') || null,
        visi: configMap.get('web_visi') || 'Menjadi lembaga pendidikan terdepan dalam prestasi, inovasi teknologi, dan budi pekerti luhur.',
        misi: misiList.length > 0 ? misiList : [
          'Menyelenggarakan proses pembelajaran berkualitas berbasis teknologi dan nilai karakter.',
          'Mengembangkan potensi peserta didik secara holistik dan berdaya saing.',
          'Membangun jejaring kolaborasi erat dengan dunia industri dan perguruan tinggi.',
        ],
        social_links: socialLinks,
        ppdb_active: configMap.get('web_ppdb_active') === 'true',
        ppdb_url: configMap.get('web_ppdb_url') || undefined,
        ppdb_announcement: configMap.get('web_ppdb_announcement') || undefined,
      },
    };

    await this.setToCache(cacheKey, profile);
    return profile;
  }

  /**
   * Direktori Guru & Tendik (Publik - Informasi rahasia/kontak pribadi di-strip)
   */
  public async getStaffDirectory(
    tenantId: string,
    query?: { jenis_ptk?: string; search?: string }
  ): Promise<PublicStaffMember[]> {
    const cacheKey = `pub:staff:${tenantId}:${query?.jenis_ptk || 'ALL'}:${query?.search || ''}`;
    const cached = await this.getFromCache<PublicStaffMember[]>(cacheKey);
    if (cached) return cached;

    const where: any = { tenant_id: tenantId };
    if (query?.jenis_ptk) {
      where.jenis_ptk = query.jenis_ptk;
    }
    if (query?.search) {
      where.nama_guru = { contains: query.search, mode: 'insensitive' };
    }

    const gurus = await prisma.guru.findMany({
      where,
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        foto: true,
        jenis_kelamin: true,
        jabatan: true,
        pendidikan_terakhir: true,
        jenis_ptk: true,
        GuruMapel: {
          select: {
            Mapel: {
              select: { nama_mapel: true },
            },
          },
        },
      },
      orderBy: [{ jenis_ptk: 'asc' }, { nama_guru: 'asc' }],
    });

    const staff: PublicStaffMember[] = gurus.map((g) => ({
      id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip,
      foto: g.foto,
      jenis_kelamin: g.jenis_kelamin,
      jabatan: g.jabatan,
      pendidikan_terakhir: g.pendidikan_terakhir,
      jenis_ptk: g.jenis_ptk || 'PENDIDIK',
      mata_pelajaran: Array.from(new Set(g.GuruMapel.map((gm) => gm.Mapel?.nama_mapel).filter(Boolean) as string[])),
    }));

    await this.setToCache(cacheKey, staff);
    return staff;
  }

  /**
   * Program & Jurusan (Adaptif Jenjang SMK / SMA)
   */
  public async getPrograms(tenantId: string): Promise<PublicProgram[]> {
    const cacheKey = `pub:programs:${tenantId}`;
    const cached = await this.getFromCache<PublicProgram[]>(cacheKey);
    if (cached) return cached;

    const jurusans = await prisma.jurusan.findMany({
      where: { tenant_id: tenantId },
      include: {
        ProgramKeahlian: {
          select: { nama: true },
        },
        Kelas: {
          where: { is_active: true },
          select: { id: true },
        },
      },
      orderBy: { nama: 'asc' },
    });

    const programs: PublicProgram[] = jurusans.map((j) => ({
      id: j.id,
      nama: j.nama,
      kode: j.kode,
      singkatan: j.singkatan,
      warna: j.warna,
      logo_url: j.logo_url,
      program_keahlian: j.ProgramKeahlian?.nama || null,
      durasi_jurusan: j.durasi_jurusan || 'DEFAULT_SEKOLAH',
      jumlah_kelas: j.Kelas.length,
    }));

    await this.setToCache(cacheKey, programs);
    return programs;
  }

  /**
   * Prestasi Siswa Terkurasi
   */
  public async getAchievements(tenantId: string, limit = 12): Promise<PublicAchievement[]> {
    const cacheKey = `pub:achievements:${tenantId}:${limit}`;
    const cached = await this.getFromCache<PublicAchievement[]>(cacheKey);
    if (cached) return cached;

    const raw = await prisma.prestasiSiswa.findMany({
      where: { tenant_id: tenantId },
      include: {
        Jenis: { select: { nama_prestasi: true, kategori: true } },
        Siswa: { select: { nama_siswa: true } },
        Kelas: { select: { nama_kelas: true } },
      },
      orderBy: { tanggal: 'desc' },
      take: limit,
    });

    const list: PublicAchievement[] = raw.map((r) => ({
      id: r.id,
      nama_prestasi: r.nama_prestasi || r.Jenis?.nama_prestasi || 'Prestasi Siswa',
      kategori: r.Jenis?.kategori || 'Akademik',
      tanggal: r.tanggal.toISOString().split('T')[0],
      keterangan: r.keterangan,
      nama_siswa: r.Siswa?.nama_siswa || 'Siswa',
      nama_kelas: r.Kelas?.nama_kelas || null,
    }));

    await this.setToCache(cacheKey, list);
    return list;
  }

  /**
   * Hubin & Vokasi (Mitra Industri, Lowongan BKK, Proyek TEFA)
   */
  public async getHubinData(tenantId: string): Promise<PublicHubinData> {
    const cacheKey = `pub:hubin:${tenantId}`;
    const cached = await this.getFromCache<PublicHubinData>(cacheKey);
    if (cached) return cached;

    const [mitraRaw, lowonganRaw, tefaRaw] = await Promise.all([
      prisma.mitraIndustri.findMany({
        where: { tenant_id: tenantId, mou_status: 'AKTIF' },
        select: {
          id: true,
          nama: true,
          bidang: true,
          logo_url: true,
          kompetensi_keahlian: true,
          alamat: true,
        },
        orderBy: { nama: 'asc' },
      }).catch(() => []),
      prisma.hubinLowongan.findMany({
        where: { tenant_id: tenantId, status: 'BUKA', deleted_at: null },
        select: {
          id: true,
          perusahaan_nama: true,
          judul_posisi: true,
          deskripsi: true,
          persyaratan: true,
          kuota: true,
          tanggal_tutup: true,
        },
        orderBy: { created_at: 'desc' },
      }).catch(() => []),
      prisma.hubinTefaOrder.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        select: {
          id: true,
          nama_proyek: true,
          deskripsi: true,
          status_proyek: true,
        },
        orderBy: { created_at: 'desc' },
        take: 6,
      }).catch(() => []),
    ]);

    const data: PublicHubinData = {
      mitra: mitraRaw,
      lowongan: lowonganRaw.map((l) => ({
        ...l,
        tanggal_tutup: l.tanggal_tutup.toISOString().split('T')[0],
      })),
      tefa_projects: tefaRaw,
    };

    await this.setToCache(cacheKey, data);
    return data;
  }

  /**
   * Fasilitas & Sarpras Publik (Laboratorium, Ruang Kelas, Workshop)
   */
  public async getFacilities(tenantId: string): Promise<PublicFacility[]> {
    const cacheKey = `pub:facilities:${tenantId}`;
    const cached = await this.getFromCache<PublicFacility[]>(cacheKey);
    if (cached) return cached;

    const locations = await prisma.sarprasLocation.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: {
        Unit: { select: { nama: true } },
      },
      orderBy: { nama: 'asc' },
      take: 24,
    });

    const list: PublicFacility[] = locations.map((loc) => ({
      id: loc.id,
      nama: loc.nama,
      deskripsi: loc.deskripsi,
      unit_jurusan: loc.Unit?.nama || null,
      image_url: null,
    }));

    await this.setToCache(cacheKey, list);
    return list;
  }

  /**
   * Daftar Berita & Artikel Terpublikasi
   */
  public async getArticles(
    tenantId: string,
    params: { category?: string; page?: number; limit?: number; search?: string }
  ): Promise<{ data: PublicArticleSummary[]; total: number; page: number; total_pages: number }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(50, Math.max(1, Number(params.limit || 9)));
    const skip = (page - 1) * limit;

    const cacheKey = `pub:articles:${tenantId}:${params.category || 'ALL'}:${params.search || ''}:${page}:${limit}`;
    const cached = await this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const where: any = {
      tenant_id: tenantId,
      is_published: true,
    };
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { excerpt: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      (prisma as any).publicSchoolArticle.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          cover_image: true,
          category: true,
          author_name: true,
          published_at: true,
          event_date: true,
          views_count: true,
        },
        orderBy: { published_at: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).publicSchoolArticle.count({ where }),
    ]);

    const result = {
      data: articles.map((a: any) => ({
        ...a,
        published_at: a.published_at ? a.published_at.toISOString() : new Date().toISOString(),
        event_date: a.event_date ? a.event_date.toISOString() : null,
      })),
      total,
      page,
      total_pages: Math.ceil(total / limit) || 1,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * Detail Berita & Artikel Berdasarkan Slug
   */
  public async getArticleBySlug(tenantId: string, slug: string): Promise<PublicArticleDetail | null> {
    const cacheKey = `pub:article_detail:${tenantId}:${slug}`;
    const cached = await this.getFromCache<PublicArticleDetail>(cacheKey);
    if (cached) return cached;

    const article = await (prisma as any).publicSchoolArticle.findUnique({
      where: {
        tenant_id_slug: {
          tenant_id: tenantId,
          slug,
        },
      },
    });

    if (!article || !article.is_published) return null;

    // Increment views count asynchronously
    (prisma as any).publicSchoolArticle.update({
      where: { id: article.id },
      data: { views_count: { increment: 1 } },
    }).catch(() => {});

    const detail: PublicArticleDetail = {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      cover_image: article.cover_image,
      category: article.category,
      author_name: article.author_name,
      published_at: article.published_at ? article.published_at.toISOString() : new Date().toISOString(),
      event_date: article.event_date ? article.event_date.toISOString() : null,
      views_count: article.views_count + 1,
    };

    await this.setToCache(cacheKey, detail, 300); // 5 menit
    return detail;
  }

  /**
   * Verifikasi Dokumen Publik (SKL, Sertifikat UKK, Sertifikat PKL, Ijazah)
   */
  public async verifyDocument(tenantId: string, docType: string, code: string): Promise<any | null> {
    const cleanCode = code.trim().toUpperCase();
    const type = docType.trim().toUpperCase();

    if (type === 'UKK') {
      const sertifikat = await prisma.sertifikatUkk.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [{ nomor_sertifikat: cleanCode }, { id: cleanCode }],
        },
        include: {
          Siswa: { select: { nama_siswa: true, nis: true, nisn: true } },
          MitraIndustri: { select: { nama: true } },
        },
      });

      if (!sertifikat) return null;
      return {
        valid: true,
        jenis_dokumen: 'Sertifikat Uji Kompetensi Keahlian (UKK)',
        nomor_dokumen: sertifikat.nomor_sertifikat,
        nama_siswa: sertifikat.Siswa.nama_siswa,
        nisn: sertifikat.Siswa.nisn,
        predikat: sertifikat.predikat,
        mitra_penguji: sertifikat.MitraIndustri?.nama || sertifikat.asesor_eksternal,
        tanggal_terbit: sertifikat.tanggal_terbit.toISOString().split('T')[0],
      };
    }

    if (type === 'SKL') {
      const kelulusan = await prisma.kelulusanSiswa.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [{ nomor_skl: cleanCode }, { id: cleanCode }],
        },
        include: {
          Siswa: { select: { nama_siswa: true, nis: true, nisn: true } },
        },
      });

      if (!kelulusan) return null;
      return {
        valid: true,
        jenis_dokumen: 'Surat Keterangan Lulus (SKL)',
        nomor_dokumen: kelulusan.nomor_skl,
        nama_siswa: kelulusan.Siswa.nama_siswa,
        nisn: kelulusan.Siswa.nisn,
        status_kelulusan: kelulusan.status_kelulusan,
        tanggal_lulus: kelulusan.tanggal_lulus ? kelulusan.tanggal_lulus.toISOString().split('T')[0] : null,
      };
    }

    return null;
  }

  /**
   * Menyimpan Konfigurasi Web Sekolah Publik (CMS Pengaturan)
   */
  public async saveWebConfig(tenantId: string, payload: any): Promise<boolean> {
    const configKeys = [
      'web_theme_color',
      'web_hero_title',
      'web_hero_subtitle',
      'web_hero_images',
      'web_sambutan_kepsek',
      'web_foto_kepsek',
      'web_visi',
      'web_misi',
      'web_social_links',
      'web_ppdb_active',
      'web_ppdb_url',
      'web_ppdb_announcement',
    ];

    for (const key of configKeys) {
      if (payload[key] !== undefined) {
        let valStr = payload[key];
        if (typeof valStr === 'object') {
          valStr = JSON.stringify(valStr);
        } else {
          valStr = String(valStr ?? '');
        }

        const existing = await prisma.config.findFirst({
          where: { tenant_id: tenantId, key },
        });

        if (existing) {
          await prisma.config.update({
            where: { id: existing.id },
            data: { value: valStr },
          });
        } else {
          await prisma.config.create({
            data: {
              tenant_id: tenantId,
              key,
              value: valStr,
            },
          });
        }
      }
    }

    await this.invalidateTenantCache(tenantId);
    return true;
  }

  /**
   * Membuat Berita / Warta Baru
   */
  public async createArticle(tenantId: string, payload: any): Promise<any> {
    const slug =
      payload.slug ||
      payload.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
        '-' +
        Date.now().toString(36);

    const article = await (prisma as any).publicSchoolArticle.create({
      data: {
        tenant_id: tenantId,
        slug,
        title: payload.title,
        excerpt: payload.excerpt || null,
        content: payload.content || '',
        cover_image: payload.cover_image || null,
        category: payload.category || 'BERITA',
        author_name: payload.author_name || 'Humas Sekolah',
        is_published: payload.is_published !== false,
        published_at: payload.published_at ? new Date(payload.published_at) : new Date(),
        event_date: payload.event_date ? new Date(payload.event_date) : null,
      },
    });

    await this.invalidateTenantCache(tenantId);
    return article;
  }

  /**
   * Mengubah Berita / Warta
   */
  public async updateArticle(tenantId: string, id: string, payload: any): Promise<any> {
    const dataToUpdate: any = {};
    if (payload.title !== undefined) dataToUpdate.title = payload.title;
    if (payload.slug !== undefined) dataToUpdate.slug = payload.slug;
    if (payload.excerpt !== undefined) dataToUpdate.excerpt = payload.excerpt;
    if (payload.content !== undefined) dataToUpdate.content = payload.content;
    if (payload.cover_image !== undefined) dataToUpdate.cover_image = payload.cover_image;
    if (payload.category !== undefined) dataToUpdate.category = payload.category;
    if (payload.author_name !== undefined) dataToUpdate.author_name = payload.author_name;
    if (payload.is_published !== undefined) dataToUpdate.is_published = payload.is_published;
    if (payload.published_at !== undefined) dataToUpdate.published_at = new Date(payload.published_at);
    if (payload.event_date !== undefined) dataToUpdate.event_date = payload.event_date ? new Date(payload.event_date) : null;

    const article = await (prisma as any).publicSchoolArticle.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.invalidateTenantCache(tenantId);
    return article;
  }

  /**
   * Menghapus Berita / Warta
   */
  public async deleteArticle(tenantId: string, id: string): Promise<boolean> {
    await (prisma as any).publicSchoolArticle.delete({
      where: { id },
    });

    await this.invalidateTenantCache(tenantId);
    return true;
  }
}

export const publicPortalService = new PublicPortalService();
