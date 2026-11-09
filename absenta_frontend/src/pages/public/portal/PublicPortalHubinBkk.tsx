import React from 'react';
import { Briefcase, Building, ExternalLink, Calendar, Users, Award, ShieldCheck } from 'lucide-react';
import { PublicHubinData } from '../../../api/public-portal.api';

interface PublicPortalHubinBkkProps {
  hubin: PublicHubinData;
}

export const PublicPortalHubinBkk: React.FC<PublicPortalHubinBkkProps> = ({ hubin }) => {
  const hasLowongan = hubin.lowongan && hubin.lowongan.length > 0;
  const hasMitra = hubin.mitra && hubin.mitra.length > 0;

  return (
    <section id="bkk" className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Kemitraan Dunia Usaha & Dunia Industri (DUDI)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bursa Kerja Khusus (BKK) & Penyaluran Alumni
          </h2>
          <p className="text-sm text-slate-400">
            Membangun jembatan karir lulusan menuju dunia kerja, magang industri, dan wirausaha mandiri
          </p>
        </div>

        {/* 3 Pillars Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Praktik Kerja Lapangan (PKL)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Program magang bersertifikat langsung di industri terkemuka dengan kurikulum berbasis proyek nyata.
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Penyaluran Tenaga Kerja (BKK)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fasilitasi rekrutmen terpadu, bursa karir kampus, serta tes seleksi kerja langsung di sekolah.
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Teaching Factory (TEFA)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unit produksi dan bisnis siswa berstandar industri nyata yang menghasilkan produk dan jasa bermutu.
            </p>
          </div>
        </div>

        {/* Lowongan Kerja Terbuka */}
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
                    <button className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors">
                      <span>Daftar BKK</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mitra Industri Showcase */}
        {hasMitra && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider text-center text-xs">
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
