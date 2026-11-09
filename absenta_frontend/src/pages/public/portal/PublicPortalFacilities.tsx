import React from 'react';
import { Building2, Sparkles, Layers } from 'lucide-react';
import { PublicFacility } from '../../../api/public-portal.api';

interface PublicPortalFacilitiesProps {
  facilities: PublicFacility[];
}

export const PublicPortalFacilities: React.FC<PublicPortalFacilitiesProps> = ({ facilities }) => {
  return (
    <section id="fasilitas" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Sarana & Prasarana Belajar</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Fasilitas Laboratorium & Ruang Praktek Modern
          </h2>
          <p className="text-sm text-slate-500">
            Mendukung ekosistem pembelajaran interaktif, riset aplikatif, dan praktikum berstandar industri
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {facilities.slice(0, 16).map((fac) => (
            <div
              key={fac.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {fac.nama}
                </h4>
                {fac.deskripsi && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {fac.deskripsi}
                  </p>
                )}
              </div>

              {fac.unit_jurusan && (
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                  <Layers className="w-3 h-3" />
                  <span>Unit: {fac.unit_jurusan}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {facilities.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Informasi sarana prasarana sedang disinkronkan.</p>
          </div>
        )}
      </div>
    </section>
  );
};
