import React, { useState } from 'react';
import { Newspaper, Calendar, Eye, ArrowRight, Trophy, Bell, BookOpen, Search } from 'lucide-react';
import { PublicArticleSummary, PublicAchievement } from '../../../api/public-portal.api';

interface PublicPortalArticlesProps {
  articles: PublicArticleSummary[];
  achievements: PublicAchievement[];
  tenantSlug: string;
  onSelectArticle: (slug: string) => void;
}

export const PublicPortalArticles: React.FC<PublicPortalArticlesProps> = ({
  articles,
  achievements,
  tenantSlug,
  onSelectArticle,
}) => {
  const [activeTab, setActiveTab] = useState<'BERITA' | 'PENGUMUMAN' | 'PRESTASI' | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = articles.filter((a) => {
    const matchCategory = activeTab === 'ALL' || a.category === activeTab;
    const matchSearch =
      searchTerm === '' ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'PRESTASI':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PENGUMUMAN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'AGENDA':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <section id="berita" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              <Newspaper className="w-3.5 h-3.5" />
              <span>Warta & Informasi Terkini</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Kabar Sekolah & Prestasi Siswa
            </h2>
            <p className="text-sm text-slate-500">
              Dokumentasi kegiatan resmi, pengumuman penting, dan kabar capaian prestasi peserta didik
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berita atau pengumuman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'ALL', label: 'Semua Warta', icon: Newspaper },
            { id: 'BERITA', label: 'Berita Kegiatan', icon: BookOpen },
            { id: 'PENGUMUMAN', label: 'Pengumuman Resmi', icon: Bell },
            { id: 'PRESTASI', label: 'Prestasi Siswa', icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Articles Grid */}
        {activeTab !== 'PRESTASI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((art) => (
                <article
                  key={art.id}
                  onClick={() => onSelectArticle(art.slug)}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={
                          art.cover_image ||
                          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getCategoryBadge(
                          art.category
                        )}`}
                      >
                        {art.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(art.published_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {art.views_count} dibaca
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {art.title}
                      </h3>

                      {art.excerpt && (
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {art.excerpt}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Read More Footer */}
                  <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    <span>Baca Selengkapnya</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-600">Belum Ada Warta yang Ditayangkan</p>
                <p className="text-xs text-slate-400 mt-1">
                  Warta akan segera dipublikasikan melalui redaksi Humas sekolah.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Prestasi Siswa Showcase Tab */}
        {(activeTab === 'PRESTASI' || activeTab === 'ALL') && achievements.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Hall of Fame: Prestasi Siswa Terbaru</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Kesiswaan & Talenta Siswa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {ach.kategori}
                      </span>
                      <span className="text-[11px] text-slate-400">{ach.tanggal}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {ach.nama_prestasi}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      {ach.nama_siswa} {ach.nama_kelas ? `(${ach.nama_kelas})` : ''}
                    </p>
                    {ach.keterangan && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {ach.keterangan}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
