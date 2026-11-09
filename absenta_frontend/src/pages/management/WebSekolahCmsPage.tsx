import React, { useEffect, useState } from 'react';
import {
  Globe,
  Palette,
  UserCheck,
  Share2,
  Newspaper,
  Save,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { publicPortalApi, PublicArticleSummary, PublicSchoolProfile } from '../../api/public-portal.api';

export const WebSekolahCmsPage: React.FC = () => {
  const { user } = useAuthStore();
  const tenantSlug = user?.tenant?.subdomain || 'smkn1pld';

  const [activeTab, setActiveTab] = useState<'THEME' | 'SPEECH' | 'PPDB_SOCIAL' | 'ARTICLES'>('THEME');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [themeColor, setThemeColor] = useState('#2563EB');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImages, setHeroImages] = useState<string>('');
  const [sambutanKepsek, setSambutanKepsek] = useState('');
  const [fotoKepsek, setFotoKepsek] = useState('');
  const [visi, setVisi] = useState('');
  const [misi, setMisi] = useState('');

  // Social & PPDB
  const [ppdbActive, setPpdbActive] = useState(false);
  const [ppdbUrl, setPpdbUrl] = useState('');
  const [ppdbAnnouncement, setPpdbAnnouncement] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');

  // Articles State
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('BERITA');
  const [articleCover, setArticleCover] = useState('');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('Humas Sekolah');

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, artRes] = await Promise.all([
        publicPortalApi.getProfile(tenantSlug),
        publicPortalApi.getArticles(tenantSlug, { limit: 50 }),
      ]);

      if (profRes.success && profRes.data) {
        const p = profRes.data;
        const cfg = p.web_config;
        setThemeColor(cfg.theme_color || '#2563EB');
        setHeroTitle(cfg.hero_title || '');
        setHeroSubtitle(cfg.hero_subtitle || '');
        setHeroImages((cfg.hero_images || []).join('\n'));
        setSambutanKepsek(cfg.sambutan_kepsek || '');
        setFotoKepsek(cfg.foto_kepsek || '');
        setVisi(cfg.visi || '');
        setMisi((cfg.misi || []).join('\n'));

        setPpdbActive(cfg.ppdb_active || false);
        setPpdbUrl(cfg.ppdb_url || '');
        setPpdbAnnouncement(cfg.ppdb_announcement || '');

        const soc = cfg.social_links || {};
        setInstagram(soc.instagram || '');
        setFacebook(soc.facebook || '');
        setYoutube(soc.youtube || '');
        setTiktok(soc.tiktok || '');
      }

      if (artRes.success) {
        setArticles(artRes.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat konfigurasi web');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantSlug]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const heroImageList = heroImages
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const misiList = misi
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        web_theme_color: themeColor,
        web_hero_title: heroTitle,
        web_hero_subtitle: heroSubtitle,
        web_hero_images: heroImageList,
        web_sambutan_kepsek: sambutanKepsek,
        web_foto_kepsek: fotoKepsek,
        web_visi: visi,
        web_misi: misiList,
        web_ppdb_active: ppdbActive ? 'true' : 'false',
        web_ppdb_url: ppdbUrl,
        web_ppdb_announcement: ppdbAnnouncement,
        web_social_links: {
          instagram,
          facebook,
          youtube,
          tiktok,
        },
      };

      await publicPortalApi.saveWebConfig(payload);
      toast.success('Pengaturan Web Sekolah berhasil disimpan & cache diperbarui!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateArticle = () => {
    setEditingArticleId(null);
    setArticleTitle('');
    setArticleCategory('BERITA');
    setArticleCover('');
    setArticleExcerpt('');
    setArticleContent('');
    setArticleAuthor('Humas Sekolah');
    setArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle.trim() || !articleContent.trim()) {
      toast.error('Judul dan isi warta wajib diisi');
      return;
    }

    try {
      const payload = {
        title: articleTitle,
        category: articleCategory,
        cover_image: articleCover || null,
        excerpt: articleExcerpt || null,
        content: articleContent,
        author_name: articleAuthor || 'Humas Sekolah',
      };

      if (editingArticleId) {
        await publicPortalApi.updateArticle(editingArticleId, payload);
        toast.success('Warta berhasil diperbarui!');
      } else {
        await publicPortalApi.createArticle(payload);
        toast.success('Warta berhasil diterbitkan ke Web Publik!');
      }

      setArticleModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan warta');
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus warta "${title}" dari web publik?`)) return;
    try {
      await publicPortalApi.deleteArticle(id);
      toast.success('Warta berhasil dihapus');
      setArticles(articles.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error('Gagal menghapus warta');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Memuat Pengaturan Web Sekolah...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5" />
            <span>Portal Web Sekolah Publik Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Manajemen Web Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Kelola identitas visual, sambutan kepala sekolah, pengumuman PPDB, serta publikasi berita resmi yang tampil langsung di website publik sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/portal/${tenantSlug}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>Buka Web Publik</span>
          </a>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'THEME', label: 'Branding & Tema Banner', icon: Palette },
          { id: 'SPEECH', label: 'Sambutan, Visi & Misi', icon: UserCheck },
          { id: 'PPDB_SOCIAL', label: 'PPDB & Media Sosial', icon: Share2 },
          { id: 'ARTICLES', label: `Warta & Berita (${articles.length})`, icon: Newspaper },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Branding & Theme */}
      {activeTab === 'THEME' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Identitas Visual & Hero Banner
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Warna Aksen Utama Web:</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Judul Utama Hero (Headline):</label>
              <input
                type="text"
                placeholder="Contoh: Selamat Datang di SMKN 1 Plered"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Subjudul Hero (Tagline):</label>
              <textarea
                rows={2}
                placeholder="Deskripsi singkat atau slogan sekolah..."
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Tautan Gambar Hero Banner (1 URL per baris):
              </label>
              <textarea
                rows={3}
                placeholder="https://images.unsplash.com/photo-..."
                value={heroImages}
                onChange={(e) => setHeroImages(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Speech, Vision, Mission */}
      {activeTab === 'SPEECH' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Sambutan Kepala Sekolah & Landasan Filosofis
          </h3>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">URL Foto Resmi Kepala Sekolah:</label>
              <input
                type="text"
                placeholder="https://..."
                value={fotoKepsek}
                onChange={(e) => setFotoKepsek(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Teks Sambutan Kepala Sekolah:</label>
              <textarea
                rows={5}
                placeholder="Puji dan syukur..."
                value={sambutanKepsek}
                onChange={(e) => setSambutanKepsek(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Visi Sekolah:</label>
                <textarea
                  rows={4}
                  value={visi}
                  onChange={(e) => setVisi(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Misi Sekolah (1 butir per baris):
                </label>
                <textarea
                  rows={4}
                  value={misi}
                  onChange={(e) => setMisi(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: PPDB & Social Links */}
      {activeTab === 'PPDB_SOCIAL' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Penerimaan Peserta Didik Baru (PPDB) & Media Sosial
          </h3>

          <div className="space-y-6">
            {/* PPDB Toggle */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-900">Aktifkan Notifikasi & Tombol PPDB</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Menampilkan badge pengumuman dan tombol pendaftaran di navbar web publik.
                </p>
              </div>
              <input
                type="checkbox"
                checked={ppdbActive}
                onChange={(e) => setPpdbActive(e.target.checked)}
                className="w-6 h-6 rounded cursor-pointer text-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tautan / URL Pendaftaran PPDB:</label>
                <input
                  type="text"
                  placeholder="https://ppdb.jabarprov.go.id atau tautan formulir"
                  value={ppdbUrl}
                  onChange={(e) => setPpdbUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Teks Pengumuman PPDB:</label>
                <input
                  type="text"
                  placeholder="Contoh: Pendaftaran Gelombang 1 Dibuka Mulai 15 Mei"
                  value={ppdbAnnouncement}
                  onChange={(e) => setPpdbAnnouncement(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Social Media Links */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tautan Akun Media Sosial Resmi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Instagram URL:</label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/..."
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Facebook URL:</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/..."
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">YouTube Channel URL:</label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/@..."
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">TikTok URL:</label>
                  <input
                    type="text"
                    placeholder="https://tiktok.com/@..."
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Articles & Announcements Management */}
      {activeTab === 'ARTICLES' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Publikasi Warta, Berita & Pengumuman</h3>
              <p className="text-xs text-slate-500">
                Kelola konten yang tayang pada seksi berita di website publik sekolah.
              </p>
            </div>
            <button
              onClick={handleOpenCreateArticle}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Warta Baru</span>
            </button>
          </div>

          {/* Articles Table */}
          <div className="divide-y divide-slate-100">
            {articles.map((art) => (
              <div key={art.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {art.cover_image ? (
                    <img
                      src={art.cover_image}
                      alt={art.title}
                      className="w-16 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {art.category}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(art.published_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{art.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{art.excerpt || 'Tanpa ringkasan'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/portal/${tenantSlug}/berita/${art.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteArticle(art.id, art.title)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {articles.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Newspaper className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs font-semibold text-slate-600">Belum Ada Warta yang Ditulis</p>
                <p className="text-[11px] text-slate-400">
                  Klik tombol "Tulis Warta Baru" di atas untuk mulai menerbitkan artikel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Buat / Edit Warta */}
      {articleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingArticleId ? 'Edit Warta Publik' : 'Tulis Warta Baru'}
              </h3>
              <button
                onClick={() => setArticleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Judul Warta:</label>
                <input
                  type="text"
                  required
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                  placeholder="Contoh: SMKN 1 Plered Raih Juara 1 Lomba Nasional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kategori:</label>
                  <select
                    value={articleCategory}
                    onChange={(e) => setArticleCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="BERITA">BERITA</option>
                    <option value="PENGUMUMAN">PENGUMUMAN</option>
                    <option value="PRESTASI">PRESTASI</option>
                    <option value="AGENDA">AGENDA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Penulis / Redaksi:</label>
                  <input
                    type="text"
                    value={articleAuthor}
                    onChange={(e) => setArticleAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">URL Gambar Sampul (Cover Image):</label>
                <input
                  type="text"
                  value={articleCover}
                  onChange={(e) => setArticleCover(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ringkasan Singkat (Excerpt):</label>
                <textarea
                  rows={2}
                  value={articleExcerpt}
                  onChange={(e) => setArticleExcerpt(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs"
                  placeholder="Ringkasan 1-2 kalimat untuk preview card..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Isi Konten Lengkap (HTML / Teks):</label>
                <textarea
                  rows={6}
                  required
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed"
                  placeholder="Tuliskan berita lengkap di sini..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setArticleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Terbitkan Warta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSekolahCmsPage;
