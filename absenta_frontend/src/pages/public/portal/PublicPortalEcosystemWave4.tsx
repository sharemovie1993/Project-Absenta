import React, { useState } from 'react';
import {
  Network,
  MapPin,
  BookOpen,
  ShoppingBag,
  Building2,
  Users,
  Layers,
  Download,
  CheckCircle2,
  Sparkles,
  Award,
  Search,
} from 'lucide-react';
import { PublicWave4Ecosystem } from '../../../api/public-portal.api';

interface PublicPortalEcosystemWave4Props {
  data: PublicWave4Ecosystem | null;
  schoolName: string;
}

export const PublicPortalEcosystemWave4: React.FC<PublicPortalEcosystemWave4Props> = ({
  data,
  schoolName,
}) => {
  const [selectedMapIdx, setSelectedMapIdx] = useState(0);
  const [selectedCoopCat, setSelectedCoopCat] = useState<string>('ALL');
  const [librarySearch, setLibrarySearch] = useState('');

  if (!data) return null;

  const orgList = data.organization || [];
  const maps = data.spatial_maps || [];
  const modules = data.elibrary || [];
  const products = data.koperasi?.products || [];

  const activeMap = maps[selectedMapIdx] || maps[0] || null;

  const coopCategories = ['ALL', ...Array.from(new Set(products.map((p) => p.kategori)))];
  const filteredProducts =
    selectedCoopCat === 'ALL' ? products : products.filter((p) => p.kategori === selectedCoopCat);

  const filteredModules = modules.filter((m) => {
    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    return (
      m.judul.toLowerCase().includes(q) ||
      m.nama_mapel.toLowerCase().includes(q) ||
      m.fase_tingkat.toLowerCase().includes(q)
    );
  });

  const pimpinan = orgList.filter((o) => o.jabatan_kode === 'KEPALA_SEKOLAH');
  const wakasekAndOther = orgList.filter((o) => o.jabatan_kode !== 'KEPALA_SEKOLAH');

  const getRoomColor = (kat: string, idx: number) => {
    const k = (kat || '').toUpperCase();
    if (k.includes('LAB')) return '#7c3aed';
    if (k.includes('WORKSHOP') || k.includes('BENGKEL')) return '#dc2626';
    if (k.includes('SERVICE') || k.includes('PTSP')) return '#0284c7';
    if (k.includes('OFFICE')) return '#4f46e5';
    if (k.includes('LIBRARY')) return '#2563eb';
    if (k.includes('COMMERCE')) return '#f59e0b';
    const palette = ['#0284c7', '#4f46e5', '#0d9488', '#7c3aed', '#059669', '#d97706'];
    return palette[idx % palette.length];
  };

  return (
    <section id="ekosistem" className="py-16 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* ── BAGIAN 1: STRUKTUR ORGANISASI & TATA KELOLA MANAJEMEN SEKOLAH ── */}
        {orgList.length > 0 && (
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
                  <Network className="w-3.5 h-3.5" />
                  Tata Kelola & Kepemimpinan Institusi
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Struktur Organisasi & Manajemen Sekolah
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Sinergi kepemimpinan kepala sekolah, wakil kepala sekolah, kepala program keahlian, dan tata usaha {schoolName}.
                </p>
              </div>
            </div>

            {/* Bagan Hirarki Visual */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              {/* Pucuk Pimpinan (Kepala Sekolah) */}
              {pimpinan.length > 0 && (
                <div className="flex flex-col items-center mb-8">
                  {pimpinan.map((leader) => (
                    <div
                      key={leader.id}
                      className="relative max-w-md w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-lg border border-indigo-500/30 flex items-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {leader.foto ? (
                          <img src={leader.foto} alt={leader.nama_pejabat} className="w-full h-full object-cover" />
                        ) : (
                          <Award className="w-8 h-8 text-amber-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1">
                          {leader.jabatan_nama}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">
                          {leader.nama_pejabat}
                        </h3>
                        {leader.nip && (
                          <p className="text-xs text-indigo-200/90 font-mono mt-0.5">NIP. {leader.nip}</p>
                        )}
                        <p className="text-[11px] text-slate-300 mt-1">{leader.unit_label}</p>
                      </div>
                    </div>
                  ))}
                  {/* Garis Penghubung Hirarki */}
                  <div className="w-0.5 h-8 bg-indigo-200"></div>
                  <div className="w-3/4 h-0.5 bg-indigo-200 hidden md:block"></div>
                </div>
              )}

              {/* Jajaran Wakasek, KTU, Kaprog & Koordinator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wakasekAndOther.map((member) => {
                  const badgeColor =
                    member.jabatan_kode.includes('WAKASEK') || member.jabatan_nama.toLowerCase().includes('wakasek')
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : member.jabatan_kode.includes('KAPROG') || member.jabatan_nama.toLowerCase().includes('kaprog')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <div
                      key={member.id}
                      className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-md hover:border-indigo-300 transition-all p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
                          >
                            {member.jabatan_kode}
                          </span>
                          <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {member.jabatan_nama}
                        </h4>
                        <p className="text-xs font-semibold text-indigo-700 mt-2">
                          {member.nama_pejabat}
                        </p>
                        {member.nip && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NIP: {member.nip}
                          </p>
                        )}
                      </div>
                      {member.unit_label && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.unit_label}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── BAGIAN 2: DENAH SPASIAL INTERAKTIF KAMPUS & ZONASI RUANGAN ── */}
        {maps.length > 0 && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  Navigasi Kampus & Zonasi Ruang (Smart Campus Map)
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Denah Spasial Gedung & Fasilitas Sekolah
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Panduan interaktif lokasi ruang layanan tamu (PTSP), laboratorium, bengkel praktik, dan ruang belajar.
                </p>
              </div>

              {/* Pemilih Gedung / Lantai */}
              <div className="flex flex-wrap gap-2">
                {maps.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMapIdx(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      selectedMapIdx === idx
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {m.gedung.split('(')[0].trim()} • Lantai {m.lantai}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {activeMap && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      {activeMap.nama_denah}
                    </h3>
                    <p className="text-xs text-emerald-200/90 mt-0.5">
                      {activeMap.gedung} — Lantai {activeMap.lantai} ({activeMap.elements.length} Titik Ruangan Terdata)
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Denah Spasial Terintegrasi Sarpras
                  </span>
                </div>

                {/* Grid Blueprint Interaktif */}
                <div className="p-6 bg-slate-900/5 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeMap.elements.map((room, rIdx) => {
                      const roomColor = getRoomColor(room.label_sub || room.kategori, rIdx);
                      return (
                        <div
                          key={room.id || rIdx}
                          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                        >
                          <div
                            className="w-1.5 h-full absolute left-0 top-0"
                            style={{ backgroundColor: roomColor }}
                          />
                          <div className="pl-2">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                                style={{ backgroundColor: roomColor }}
                              >
                                {room.kategori}
                              </span>
                              {room.kapasitas && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Kapasitas: {room.kapasitas} Org
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {room.label_utama}
                            </h4>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{room.label_sub}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BAGIAN 3: PERPUSTAKAAN DIGITAL TERBUKA & E-LIBRARY MODUL AJAR (OER) ── */}
        {modules.length > 0 && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                  <BookOpen className="w-3.5 h-3.5" />
                  Open Educational Resources (OER) & Literasi Vokasi
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Perpustakaan Digital & Katalog Modul Ajar Terbuka
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Akses terbuka bahan ajar, jobsheet praktikum standar industri, dan buku pedoman pembelajaran bagi siswa & orang tua.
                </p>
              </div>

              {/* Pencarian Modul */}
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Cari modul, mapel, atau fase..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredModules.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                        {mod.fase_tingkat}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {mod.total_jp} JP
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                      {mod.judul}
                    </h3>
                    <p className="text-xs font-semibold text-indigo-600 mt-1.5">
                      {mod.nama_mapel}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {mod.deskripsi}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 truncate">
                      Sumber: <strong className="text-slate-700">{mod.nama_guru}</strong>
                    </span>
                    {mod.file_url ? (
                      <a
                        href={mod.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Akses Modul
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terverifikasi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BAGIAN 4: E-KATALOG KOPERASI SEKOLAH & UNIT USAHA SISWA ── */}
        {products.length > 0 && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Transparansi Atribut & Koperasi Siswa (Kopsis)
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  E-Katalog Koperasi Sekolah & Kebutuhan Praktik
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Informasi resmi daftar harga seragam khas, wearpack keselamatan kerja (K3LH), dan starter kit praktikum siswa tanpa pungutan tersembunyi.
                </p>
              </div>

              {/* Filter Kategori Koperasi */}
              <div className="flex flex-wrap gap-1.5">
                {coopCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCoopCat(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedCoopCat === cat
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                        {item.kategori}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.stok_status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {item.nama}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Kode Katalog: {item.kode}
                    </p>
                    {item.deskripsi && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {item.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Harga Resmi Koperasi
                      </span>
                      <span className="text-lg font-extrabold text-slate-900">
                        Rp {item.harga.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-slate-500"> / {item.satuan}</span>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                      Tersedia di Gerai Kopsis
                    </span>
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
