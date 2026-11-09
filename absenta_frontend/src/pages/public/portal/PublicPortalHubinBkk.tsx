import React from 'react';
import {
  Briefcase,
  Building,
  ExternalLink,
  Calendar,
  Users,
  Award,
  TrendingUp,
  GraduationCap,
  Rocket,
  ShoppingBag,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { PublicHubinData } from '../../../api/public-portal.api';

interface PublicPortalHubinBkkProps {
  hubin: PublicHubinData;
  tefaWhatsapp?: string | null;
  schoolName?: string;
}

export const PublicPortalHubinBkk: React.FC<PublicPortalHubinBkkProps> = ({
  hubin,
  tefaWhatsapp,
  schoolName = 'SMK',
}) => {
  const hasLowongan = hubin.lowongan && hubin.lowongan.length > 0;
  const hasMitra = hubin.mitra && hubin.mitra.length > 0;
  const hasTefa = hubin.tefa_projects && hubin.tefa_projects.length > 0;
  const tracer = hubin.tracer_study;

  const cleanWa = (tefaWhatsapp || '6281214002500').replace(/[^0-9]/g, '');

  const formatRupiah = (num: number | null) => {
    if (!num) return 'Hubungi Unit Produksi';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <section id="bkk" className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Kemitraan Dunia Usaha & Dunia Industri (DUDIKA)</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Bursa Kerja Khusus (BKK), Tracer Study BMW & Teaching Factory
          </h2>
          <p className="text-sm text-slate-400">
            Transparansi keterserapan lulusan (Bekerja, Melanjutkan Kuliah, Wirausaha), portal rekrutmen industri aktif, serta etalase produk dan layanan karya siswa.
          </p>
        </div>

        {/* 1. Statistik Tracer Study Keterserapan Alumni (BMW) */}
        {tracer && (
          <div className="bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-blue-950/60 rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-xl space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/70 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" />
                  <span>Statistik Keterserapan Lulusan (Tracer Study BMW)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  {tracer.serapan_total_pct}% Lulusan Terserap di Industri, Perguruan Tinggi & Wirausaha
                </h3>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-right">
                <div className="text-[11px] text-emerald-300 font-medium">Indeks Keterserapan Vokasi</div>
                <div className="text-lg font-extrabold text-emerald-400">Sangat Tinggi (Grade A)</div>
              </div>
            </div>

            {/* BMW Breakdown Cards & Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    Bekerja di Industri (B)
                  </span>
                  <span className="text-2xl font-extrabold text-white">{tracer.bekerja_pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                    style={{ width: `${Math.max(15, tracer.bekerja_pct)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Direkrut oleh perusahaan manufaktur, BUMN, telekomunikasi, dan penempatan kerja luar negeri (Jepang).
                </p>
              </div>

              <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    Melanjutkan Studi (M)
                  </span>
                  <span className="text-2xl font-extrabold text-white">{tracer.kuliah_pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full"
                    style={{ width: `${Math.max(15, tracer.kuliah_pct)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Diterima di PTN, Politeknik Negeri, dan Perguruan Tinggi Swasta unggulan jalur prestasi maupun reguler.
                </p>
              </div>

              <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-amber-400" />
                    Wirausaha Mandiri (W)
                  </span>
                  <span className="text-2xl font-extrabold text-white">{tracer.wirausaha_pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                    style={{ width: `${Math.max(12, tracer.wirausaha_pct)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Membangun rintisan usaha mandiri (startup kreatif, bengkel mitra, kuliner, dan layanan jasa teknis).
                </p>
              </div>
            </div>

            {/* Highlight Alumni Destinations */}
            {tracer.highlight_destinations && tracer.highlight_destinations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Jejak Karir & Kampus Tujuan Alumni Terkini
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {tracer.highlight_destinations.slice(0, 6).map((al, i) => (
                    <div
                      key={i}
                      className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{al.nama_alumni}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            &apos;{String(al.tahun_lulus).slice(-2)}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-blue-300 line-clamp-1">{al.instansi}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{al.posisi_atau_prodi}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                          al.status.includes('KERJA')
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : al.status.includes('KULIAH')
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {al.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Etalase Produk & Jasa Teaching Factory (TEFA) */}
        {hasTefa && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Unit Produksi & Bisnis Sekolah (BLUD / TEFA)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  Etalase Produk & Layanan Jasa Teaching Factory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dikerjakan langsung oleh siswa kompeten di bawah supervisi instruktur ahli dan standar kualitas mitra industri.
                </p>
              </div>
              <a
                href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                  `Halo Unit Produksi TEFA ${schoolName}, saya ingin berkonsultasi mengenai pemesanan produk/jasa Teaching Factory.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-lg shadow-emerald-600/20 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi Unit Produksi (WA)</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hubin.tefa_projects.map((tefa) => {
                const waUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
                  `Halo Unit Produksi TEFA ${schoolName}, saya tertarik memesan layanan/produk: "${tefa.nama_proyek}". Mohon informasi lebih lanjut.`
                )}`;
                return (
                  <div
                    key={tefa.id}
                    className="bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-6 border border-slate-700/80 hover:border-amber-400/50 transition-all flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          LAYANAN TEFA TERSEDIA
                        </span>
                        {tefa.nilai_kontrak && (
                          <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            Mulai {formatRupiah(tefa.nilai_kontrak)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                        {tefa.nama_proyek}
                      </h4>

                      {tefa.deskripsi && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {tefa.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-700/70 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400">
                        Standar Mutu: <span className="text-slate-200 font-semibold">QC Bengkel / Lab Sekolah</span>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Pesan Jasa / Produk</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Lowongan Kerja Terbuka (BKK) */}
        {hasLowongan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Lowongan Karir Terbuka Melalui BKK
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {hubin.lowongan.length} Posisi Tersedia
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hubin.lowongan.map((loker) => (
                <div
                  key={loker.id}
                  className="bg-slate-800/90 rounded-2xl p-6 border border-slate-700 hover:border-blue-500/60 shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        REKRUTMEN AKTIF
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Kuota: {loker.kuota} orang
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">
                        {loker.judul_posisi}
                      </h4>
                      <p className="text-xs text-blue-400 font-medium mt-0.5">
                        {loker.perusahaan_nama}
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {loker.deskripsi}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Tutup: {loker.tanggal_tutup}
                    </span>
                    <a
                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                        `Halo Admin BKK ${schoolName}, saya ingin mendaftar lowongan "${loker.judul_posisi}" di ${loker.perusahaan_nama}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Lamar via BKK</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Mitra Industri Showcase */}
        {hasMitra && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-center text-xs">
              Didukung Oleh Jaringan Mitra Industri Terpercaya
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {hubin.mitra.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 text-center flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  {m.logo_url ? (
                    <img
                      src={m.logo_url}
                      alt={m.nama}
                      className="w-12 h-12 object-contain filter grayscale hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs">
                      {m.nama.charAt(0)}
                    </div>
                  )}
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{m.nama}</div>
                  {m.bidang && <div className="text-[10px] text-slate-400 line-clamp-1">{m.bidang}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
