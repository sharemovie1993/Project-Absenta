import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Building2,
  Calendar,
  MessageCircle,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  MapPin,
  Phone,
  Filter,
} from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import type { SiswaBimbinganItem } from '../types';

export interface PklBimbinganTabProps {
  siswaList: SiswaBimbinganItem[];
  onOpenSiswaDetail?: (siswa: SiswaBimbinganItem) => void;
  onOpenKunjunganModal?: (siswa: SiswaBimbinganItem) => void;
}

export const PklBimbinganTab: React.FC<PklBimbinganTabProps> = ({
  siswaList,
  onOpenSiswaDetail,
  onOpenKunjunganModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'AKTIF' | 'SELESAI'>('SEMUA');

  const filteredList = useMemo(() => {
    return siswaList.filter((s) => {
      const matchSearch =
        s.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'SEMUA' || s.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [siswaList, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Control Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Cari nama siswa, NIS, kelas, atau mitra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['SEMUA', 'AKTIF', 'SELESAI'] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(st)}
                className="text-xs font-bold rounded-xl h-9 shrink-0"
              >
                {st === 'SEMUA' ? 'Semua Status' : st}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* List / Table */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Tidak Ada Siswa Ditemukan
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau filter status siswa bimbingan Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((siswa) => (
            <div
              key={siswa.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {siswa.nama_siswa}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {siswa.nis}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {siswa.kelas}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                    <Building2 size={14} className="text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {siswa.nama_mitra}
                    </span>
                    {siswa.alamat_mitra && (
                      <span className="text-slate-400 text-[11px] hidden md:inline truncate">
                        • {siswa.alamat_mitra}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={siswa.status === 'AKTIF' ? 'success' : 'neutral'}
                    className="text-xs uppercase font-extrabold px-2.5 py-1"
                  >
                    {siswa.status}
                  </Badge>
                  {siswa.jurnal_pending_count && siswa.jurnal_pending_count > 0 ? (
                    <Badge variant="warning" className="text-[10px] font-bold animate-pulse">
                      {siswa.jurnal_pending_count} Jurnal Butuh Review
                    </Badge>
                  ) : null}
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Periode PKL
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {siswa.tanggal_mulai} s/d {siswa.tanggal_selesai || 'Selesai'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Pembimbing DU/DI
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {siswa.pembimbing_industri || 'Instruktur Industri'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nilai Akhir PKL
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {siswa.nilai_akhir ? `${siswa.nilai_akhir} (${siswa.predikat || 'A'})` : 'Belum Dinilai'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Presensi &amp; Jurnal
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {siswa.total_kehadiran ? `${siswa.total_kehadiran} Hari Hadir` : 'Tercatat Aktif'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                {siswa.kontak_mitra && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://wa.me/${siswa.kontak_mitra?.replace(/\D/g, '')}`, '_blank')}
                    className="text-xs font-bold rounded-xl h-8 gap-1.5 text-emerald-600 dark:text-emerald-400"
                  >
                    <MessageCircle size={14} />
                    Hubungi DU/DI
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenKunjunganModal?.(siswa)}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5 text-indigo-600 dark:text-indigo-400"
                >
                  <Calendar size={14} />
                  Catat Supervisi
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onOpenSiswaDetail?.(siswa)}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5 shadow-xs"
                >
                  Detail Siswa
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
