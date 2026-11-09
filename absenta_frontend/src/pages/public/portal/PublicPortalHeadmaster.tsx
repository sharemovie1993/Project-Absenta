import React from 'react';
import { Quote, CheckCircle2, Target, Eye, Sparkles } from 'lucide-react';
import { PublicSchoolProfile } from '../../../api/public-portal.api';

interface PublicPortalHeadmasterProps {
  profile: PublicSchoolProfile;
}

export const PublicPortalHeadmaster: React.FC<PublicPortalHeadmasterProps> = ({ profile }) => {
  const kepsekName = profile.kepala_sekolah || 'Kepala Sekolah';
  const kepsekNip = profile.nip_kepala ? `NIP. ${profile.nip_kepala}` : null;
  const fotoKepsek =
    profile.web_config?.foto_kepsek ||
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80';

  const sambutan =
    profile.web_config?.sambutan_kepsek ||
    `Puji dan syukur kita panjatkan ke hadirat Tuhan Yang Maha Esa atas limpahan rahmat dan hidayah-Nya. Selamat datang di portal resmi ${profile.nama}. Lembaga pendidikan ini berkomitmen untuk senantiasa menyelenggarakan pelayanan pendidikan yang prima, inklusif, dan adaptif terhadap kemajuan era revolusi industri. Kami terus mendorong seluruh peserta didik untuk tidak hanya unggul secara akademis dan kejuruan, namun juga kokoh dalam integritas moral dan karakter kebangsaan. Mari bersama-sama kita wujudkan masa depan gemilang bagi generasi penerus bangsa.`;

  const visi =
    profile.web_config?.visi ||
    'Menjadi institusi pendidikan berkarakter luhur, berbudaya mutu tinggi, berwawasan lingkungan, serta menghasilkan lulusan yang kompeten dan berdaya saing global.';

  const misiList =
    profile.web_config?.misi && profile.web_config.misi.length > 0
      ? profile.web_config.misi
      : [
          'Melaksanakan kegiatan belajar mengajar yang berpusat pada peserta didik berbasis kurikulum mutakhir.',
          'Mengembangkan kompetensi vokasi dan literasi digital sesuai standar dunia usaha dan industri.',
          'Membina karakter budi pekerti luhur, disiplin ketarunaan, dan semangat wirausaha mandiri.',
          'Menyediakan sarana prasarana penunjang pembelajaran yang ramah lingkungan dan modern.',
        ];

  return (
    <section id="profil" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prakata & Visi Institusi</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Membangun Karakter, Mencetak Prestasi
          </h2>
          <p className="text-sm text-slate-500">
            Komitmen kepemimpinan dan arah strategis pendidikan di {profile.nama}
          </p>
        </div>

        {/* Headmaster Speech Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Headmaster Photo */}
          <div className="lg:col-span-4 flex flex-col items-center text-center">
            <div className="relative w-48 h-56 sm:w-56 sm:h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-slate-100">
              <img
                src={fotoKepsek}
                alt={kepsekName}
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base sm:text-lg">{kepsekName}</h3>
            <p className="text-xs font-semibold text-blue-600">Kepala Sekolah</p>
            {kepsekNip && <p className="text-[11px] text-slate-400 mt-0.5">{kepsekNip}</p>}
          </div>

          {/* Speech Text */}
          <div className="lg:col-span-8 space-y-4">
            <Quote className="w-10 h-10 text-blue-200 -mb-2" />
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Sambutan Kepala Sekolah
            </h4>
            <div className="text-sm sm:text-base text-slate-600 leading-relaxed space-y-3 text-justify">
              <p>{sambutan}</p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <span className="w-8 h-0.5 bg-blue-600 rounded-full" />
              <span className="text-xs font-medium text-slate-400">
                {profile.nama} • Portal Komunikasi Publik
              </span>
            </div>
          </div>
        </div>

        {/* Vision & Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Visi */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Visi Sekolah</h3>
            <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-xl border-l-4 border-blue-600">
              "{visi}"
            </p>
          </div>

          {/* Misi */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Misi Sekolah</h3>
            <ul className="space-y-2.5">
              {misiList.map((misi, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{misi}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
