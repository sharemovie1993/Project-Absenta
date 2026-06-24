import React from 'react';
import { UserX, Bell } from 'lucide-react';

interface NonMemberBannerProps {
  title?: string;
  description?: string;
}

export const NonMemberBanner = React.memo<NonMemberBannerProps>(({ 
  title = "Anda Belum Terdaftar sebagai Anggota Koperasi",
  description = "Untuk mengakses fitur Simpanan, Pinjaman, dan Laporan Koperasi, silakan daftarkan diri Anda kepada Bendahara atau Ketua Koperasi sekolah."
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 shadow-lg shadow-indigo-500/20">
      {/* Dekorasi lingkaran latar */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <UserX className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg leading-tight">
            {title}
          </h3>
          <p className="text-indigo-100 text-sm mt-1 leading-relaxed">
            {description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <Bell className="w-3 h-3" />
              Pengumuman tetap tersedia
            </span>
            <span className="inline-flex items-center gap-1 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
              ✦ Daftar ke pengurus koperasi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

NonMemberBanner.displayName = 'NonMemberBanner';
