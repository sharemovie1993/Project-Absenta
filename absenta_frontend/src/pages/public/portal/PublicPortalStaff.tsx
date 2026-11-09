import React, { useState } from 'react';
import { Users, GraduationCap, BookOpen, Search, UserCheck } from 'lucide-react';
import { PublicStaffMember } from '../../../api/public-portal.api';

interface PublicPortalStaffProps {
  staff: PublicStaffMember[];
}

export const PublicPortalStaff: React.FC<PublicPortalStaffProps> = ({ staff }) => {
  const [filterPtk, setFilterPtk] = useState<'ALL' | 'PENDIDIK' | 'TENAGA_KEPENDIDIKAN'>('ALL');
  const [search, setSearch] = useState('');

  const filteredStaff = staff.filter((s) => {
    const matchFilter = filterPtk === 'ALL' || s.jenis_ptk === filterPtk;
    const matchSearch =
      search === '' ||
      s.nama_guru.toLowerCase().includes(search.toLowerCase()) ||
      s.mata_pelajaran.some((m) => m.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  return (
    <section id="guru" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Pendidik & Tenaga Kependidikan (PTK)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Direktori Guru & Staf Pengajar
            </h2>
            <p className="text-sm text-slate-500">
              Pengajar berdedikasi, tersertifikasi, dan berpengalaman dalam membimbing potensi siswa
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru atau mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {[
            { id: 'ALL', label: `Semua PTK (${staff.length})` },
            { id: 'PENDIDIK', label: 'Guru & Pendidik' },
            { id: 'TENAGA_KEPENDIDIKAN', label: 'Staf & Tendik' },
          ].map((tab) => {
            const isActive = filterPtk === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterPtk(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredStaff.slice(0, 36).map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-center text-center group"
            >
              {/* Photo */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 mb-3 border-2 border-slate-100 group-hover:scale-105 transition-transform">
                {member.foto ? (
                  <img
                    src={member.foto}
                    alt={member.nama_guru}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xl">
                    {member.nama_guru.charAt(0)}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <UserCheck className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              {/* Name & Role */}
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight">
                {member.nama_guru}
              </h4>

              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {member.jabatan || (member.jenis_ptk === 'PENDIDIK' ? 'Guru Pengajar' : 'Tenaga Kependidikan')}
              </p>

              {/* Mapel Badges */}
              {member.mata_pelajaran.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {member.mata_pelajaran.slice(0, 2).map((m, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold line-clamp-1"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredStaff.length > 36 && (
          <div className="text-center pt-4">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan 36 dari {filteredStaff.length} tenaga pendidik dan kependidikan
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
