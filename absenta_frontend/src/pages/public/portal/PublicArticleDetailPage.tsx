import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Eye,
  Share2,
  Check,
  Building2,
  Newspaper,
  Loader2,
} from 'lucide-react';
import { publicPortalApi, PublicArticleDetail, PublicSchoolProfile } from '../../../api/public-portal.api';

export const PublicArticleDetailPage: React.FC = () => {
  const { tenantSlug, articleSlug } = useParams<{ tenantSlug: string; articleSlug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicSchoolProfile | null>(null);
  const [article, setArticle] = useState<PublicArticleDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tenantSlug || !articleSlug) return;
    setLoading(true);

    Promise.all([
      publicPortalApi.getProfile(tenantSlug),
      publicPortalApi.getArticleDetail(tenantSlug, articleSlug),
    ])
      .then(([profRes, artRes]) => {
        if (profRes.success) setProfile(profRes.data);
        if (artRes.success) {
          setArticle(artRes.data);
          document.title = `${artRes.data.title} - ${profRes.data?.nama || 'Portal Sekolah'}`;
        }
      })
      .catch((err) => {
        console.error('Failed to load article detail:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tenantSlug, articleSlug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWa = () => {
    const text = encodeURIComponent(`*${article?.title}*\n\nBaca warta selengkapnya di portal resmi ${profile?.nama || 'sekolah'}:\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Memuat Warta Sekolah...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 border border-slate-200 shadow-sm">
          <Newspaper className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Warta Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            Artikel atau pengumuman yang Anda cari mungkin telah diarsipkan atau belum dipublikasikan.
          </p>
          <button
            onClick={() => navigate(`/portal/${tenantSlug}`)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Kembali ke Beranda Sekolah
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Simple Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(`/portal/${tenantSlug}`)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>
          {profile && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-900">{profile.nama}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Article Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Article Meta Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
              {article.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.published_at).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.views_count} dibaca
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center justify-between border-y border-slate-200 py-3 text-xs text-slate-500">
            <span>
              Ditulis oleh: <strong className="text-slate-800">{article.author_name}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWa}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3 h-3" />
                <span>Bagikan WhatsApp</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin Tautan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Featured Cover Image */}
        {article.cover_image && (
          <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 max-h-[480px]">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Body Content */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80">
          <div
            className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </main>
    </div>
  );
};
