import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, BookOpen, BookMarked, ChevronLeft, ChevronRight, Printer, X, User, GraduationCap, Award, Briefcase, Heart, MapPin, Phone, Calendar } from 'lucide-react';
import { BukuIndukPrintModal } from './BukuIndukPrintModal';
import { KlapperPrintModal } from './KlapperPrintModal';

import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common/academic-filter';
import { Loader, SectionCard } from '@/components/ui';
import {
  bukuIndukApi,
  bukuIndukQueryKeys,
  type BukuIndukListItem,
  type KlapperListItem,
} from '@/api/academic/buku-induk.api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UniversalBukuIndukViewProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

type ActiveTab = 'induk' | 'klapper';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function StatusBadge({ status }: { status: string }) {
  const upper = (status || '').toUpperCase();
  const colorMap: Record<string, string> = {
    AKTIF: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    LULUS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    MUTASI: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    KELUAR: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  const cls = colorMap[upper] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cls}`}>
      {status || '-'}
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}

function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{start}–{end}</span> dari{' '}
        <span className="font-bold text-slate-700 dark:text-slate-300">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-colors ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Buku Induk Table ─────────────────────────────────────────────────────────

interface BukuIndukTableProps {
  data: BukuIndukListItem[];
  isLoading: boolean;
  onDetail: (id: string) => void;
  onPrint: (id: string) => void;
}

function BukuIndukTable({ data, isLoading, onDetail, onPrint }: BukuIndukTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
        <BookOpen size={48} className="mb-3 opacity-40" />
        <p className="text-sm font-bold">Tidak ada data siswa ditemukan</p>
        <p className="text-xs mt-1">Coba ubah filter pencarian Anda</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">No.</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">NIS</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Siswa</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">NISN</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Kelas</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Tgl. Masuk</th>
            <th className="py-3 px-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((siswa, idx) => (
            <tr
              key={siswa.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
              <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {siswa.nis || '-'}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  {siswa.foto_url ? (
                    <img
                      src={siswa.foto_url}
                      alt={siswa.nama_siswa}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shrink-0 flex items-center justify-center text-white text-[10px] font-black">
                      {(siswa.nama_siswa || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                    {siswa.nama_siswa}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                {siswa.nisn || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
              </td>
              <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {siswa.Kelas?.nama_kelas || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={siswa.status} />
              </td>
              <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {siswa.tanggal_masuk
                  ? new Date(siswa.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                  : <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onDetail(siswa.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  >
                    <Eye size={13} />
                    Detail
                  </button>
                  <button
                    onClick={() => onPrint(siswa.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                  >
                    <Printer size={13} />
                    Cetak
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Buku Klapper Table ───────────────────────────────────────────────────────

interface KlapperTableProps {
  data: KlapperListItem[];
  isLoading: boolean;
  selectedHuruf: string;
  onDetail: (id: string) => void;
}

function KlapperTable({ data, isLoading, selectedHuruf, onDetail }: KlapperTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
        <BookMarked size={48} className="mb-3 opacity-40" />
        <p className="text-sm font-bold">
          {selectedHuruf ? `Tidak ada siswa dengan huruf "${selectedHuruf}"` : 'Tidak ada data klapper ditemukan'}
        </p>
        <p className="text-xs mt-1">Coba pilih huruf lain</p>
      </div>
    );
  }

  // Group data by first letter if no huruf filter selected
  const groupedData = useMemo(() => {
    if (selectedHuruf) return { [selectedHuruf]: data };
    const groups: Record<string, KlapperListItem[]> = {};
    data.forEach((item) => {
      const letter = (item.nama_siswa || '?')[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(item);
    });
    return groups;
  }, [data, selectedHuruf]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">No.</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">NIS</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Siswa</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">NISN</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Kelas</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
            <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Tgl. Masuk</th>
            <th className="py-3 px-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(groupedData).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
            <React.Fragment key={letter}>
              {/* Letter separator row */}
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <td colSpan={8} className="py-2 px-4">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black shadow-sm">
                    {letter}
                  </span>
                </td>
              </tr>
              {items.map((siswa, idx) => (
                <tr
                  key={siswa.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500 font-mono pl-8">
                    {siswa.klapperNo ?? (idx + 1)}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {siswa.nis || '-'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                    {siswa.nama_siswa}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                    {siswa.nisn || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {siswa.Kelas?.nama_kelas || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={siswa.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {siswa.tanggal_masuk
                      ? new Date(siswa.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onDetail(siswa.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                    >
                      <Eye size={13} />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Panel 360° ───────────────────────────────────────────────────────

interface DetailPanel360Props {
  siswaId: string;
  onClose: () => void;
  onPrint: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 min-w-[130px] shrink-0">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 break-words">
        {value !== undefined && value !== null && value !== '' ? String(value) : <span className="text-slate-300 dark:text-slate-600 font-normal italic">—</span>}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
      <Icon size={13} className="text-indigo-500 shrink-0" />
      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function DetailPanel360({ siswaId, onClose, onPrint }: DetailPanel360Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: bukuIndukQueryKeys.detail(siswaId),
    queryFn: () => bukuIndukApi.getDetail(siswaId),
    enabled: Boolean(siswaId),
    staleTime: 5 * 60 * 1000,
  });

  const siswa = data?.data;
  const akademikList: any[] = siswa?.SiswaAkademik || [];

  const formatDate = (val?: string | null) => {
    if (!val) return null;
    try { return new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return val; }
  };

  const genderLabel = (g?: string | null) => {
    if (!g) return null;
    return g.toUpperCase().startsWith('L') ? 'Laki-laki' : 'Perempuan';
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Siswa</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">
            {siswa?.nama_siswa || 'Profil 360°'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {siswa && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <Printer size={13} />
              Cetak
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs text-slate-400">Memuat profil siswa...</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-48 text-red-400 gap-2">
            <p className="text-sm font-bold">Gagal memuat data</p>
            <p className="text-xs">Coba tutup dan buka kembali</p>
          </div>
        )}

        {siswa && (
          <div>
            {/* Foto + identitas singkat */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              {siswa.foto ? (
                <img src={siswa.foto} alt={siswa.nama_siswa} className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xl font-black shrink-0">
                  {(siswa.nama_siswa || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-sm truncate">{siswa.nama_siswa}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{siswa.nis} · {siswa.nisn || 'NISN -'}</p>
                <StatusBadge status={siswa.status} />
              </div>
            </div>

            {/* Identitas Pribadi */}
            <SectionTitle icon={User} label="Identitas Pribadi" />
            <InfoRow label="Tempat, Tgl Lahir" value={[siswa.tempat_lahir, formatDate(siswa.tanggal_lahir)].filter(Boolean).join(', ')} />
            <InfoRow label="Jenis Kelamin" value={genderLabel(siswa.gender || siswa.jenis_kelamin)} />
            <InfoRow label="Agama" value={siswa.agama} />
            <InfoRow label="Kewarganegaraan" value={siswa.kewarganegaraan} />
            <InfoRow label="Anak ke-" value={siswa.anak_ke} />
            <InfoRow label="No. Akta Lahir" value={siswa.no_akta_lahir} />
            <InfoRow label="No. Ijazah SMP" value={siswa.no_ijazah_smp} />
            <InfoRow label="Asal Sekolah" value={siswa.sekolah_asal} />

            {/* Kontak & Alamat */}
            <SectionTitle icon={MapPin} label="Alamat & Kontak" />
            <InfoRow label="Alamat" value={[siswa.alamat_jalan || siswa.alamat, siswa.rt ? `RT ${siswa.rt}` : '', siswa.rw ? `RW ${siswa.rw}` : ''].filter(Boolean).join(' ')} />
            <InfoRow label="Kelurahan/Kec" value={[siswa.kelurahan, siswa.kecamatan].filter(Boolean).join(', ')} />
            <InfoRow label="Kota/Kab" value={[siswa.kota || siswa.kabupaten, siswa.kode_pos].filter(Boolean).join(' ')} />
            <InfoRow label="No. HP" value={siswa.no_hp} />
            <InfoRow label="Email" value={siswa.email} />

            {/* Data Fisik */}
            <SectionTitle icon={Heart} label="Data Fisik" />
            <InfoRow label="Tinggi Badan" value={siswa.tinggi_badan ? `${siswa.tinggi_badan} cm` : null} />
            <InfoRow label="Berat Badan" value={siswa.berat_badan ? `${siswa.berat_badan} kg` : null} />
            <InfoRow label="Golongan Darah" value={siswa.golongan_darah} />

            {/* Data Masuk */}
            <SectionTitle icon={Calendar} label="Data Masuk / Keluar" />
            <InfoRow label="Tanggal Masuk" value={formatDate(siswa.tanggal_masuk)} />
            <InfoRow label="Kelas Awal" value={akademikList[0]?.kelas?.nama_kelas || akademikList[0]?.Kelas?.nama_kelas} />
            <InfoRow label="Tanggal Keluar" value={formatDate(siswa.tanggal_keluar)} />
            <InfoRow label="Alasan Keluar" value={siswa.alasan_keluar} />

            {/* Orang Tua */}
            {(siswa.OrangTuaSiswa || []).length > 0 && (
              <>
                <SectionTitle icon={User} label="Orang Tua / Wali" />
                {(siswa.OrangTuaSiswa as any[]).map((ots: any, i: number) => {
                  const ot = ots?.OrangTua || ots;
                  return (
                    <div key={i} className="mb-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                      <InfoRow label={`Nama (${ot?.hubungan || 'Wali'})`} value={ot?.nama} />
                      <InfoRow label="No. HP" value={ot?.no_hp} />
                      <InfoRow label="Pekerjaan" value={ot?.pekerjaan} />
                    </div>
                  );
                })}
              </>
            )}

            {/* Riwayat Kelas */}
            {akademikList.length > 0 && (
              <>
                <SectionTitle icon={GraduationCap} label="Riwayat Kelas" />
                <div className="space-y-1">
                  {akademikList.map((ak: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 min-w-[110px] shrink-0">
                        {ak?.tahunPelajaran?.tahun || ak?.TahunPelajaran?.tahun || '-'} · {ak?.semester?.nama_semester || ak?.Semester?.nama_semester || '-'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {ak?.kelas?.nama_kelas || ak?.Kelas?.nama_kelas || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PKL */}
            {(() => {
              const pklList = Array.isArray(siswa.SiswaPkl) ? siswa.SiswaPkl
                : siswa.SiswaPkl ? [siswa.SiswaPkl]
                : akademikList.flatMap((ak: any) => Array.isArray(ak?.SiswaPkl) ? ak.SiswaPkl : ak?.SiswaPkl ? [ak.SiswaPkl] : []);
              if (!pklList.length) return null;
              return (
                <>
                  <SectionTitle icon={Briefcase} label="PKL" />
                  {pklList.map((pkl: any, i: number) => (
                    <div key={i} className="mb-2">
                      <InfoRow label="Nama DUDI" value={pkl?.nama_mitra || pkl?.nama_dudi} />
                      <InfoRow label="Bidang" value={pkl?.bidang_keahlian} />
                      <InfoRow label="Nilai PKL" value={pkl?.nilai_pkl} />
                    </div>
                  ))}
                </>
              );
            })()}

            {/* Kelulusan */}
            {(() => {
              const kel = Array.isArray(siswa.KelulusanSiswa) ? siswa.KelulusanSiswa[0]
                : siswa.KelulusanSiswa || akademikList.flatMap((ak: any) => ak?.KelulusanSiswa || [])[0];
              if (!kel) return null;
              return (
                <>
                  <SectionTitle icon={Award} label="Kelulusan / SKL" />
                  <InfoRow label="Nomor SKL" value={kel.nomor_skl} />
                  <InfoRow label="Status" value={kel.status_kelulusan} />
                  <InfoRow label="Tanggal Lulus" value={formatDate(kel.tanggal_lulus)} />
                </>
              );
            })()}

            {/* Tracer Study */}
            {(() => {
              const tr = Array.isArray(siswa.HubinTracerStudy) ? siswa.HubinTracerStudy[0] : siswa.HubinTracerStudy;
              if (!tr) return null;
              return (
                <>
                  <SectionTitle icon={Phone} label="Tracer Study / Alumni" />
                  <InfoRow label="Status Alumni" value={tr.status_alumni} />
                  <InfoRow label="Instansi" value={tr.nama_instansi} />
                  <InfoRow label="Jurusan/Divisi" value={tr.jurusan || tr.divisi} />
                </>
              );
            })()}

            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export const BukuIndukView: React.FC<UniversalBukuIndukViewProps> = React.memo(({
  jurusanId,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('induk');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [printSiswaId, setPrintSiswaId] = useState<string | null>(null);
  const [showKlapperPrint, setShowKlapperPrint] = useState(false);
  const [page, setPage] = useState(1);
  const [klapperPage, setKlapperPage] = useState(1);
  const [selectedHuruf, setSelectedHuruf] = useState('');

  // AcademicFilter — disable kelas filter if kelasId is already scoped from outside
  const filter = useAcademicFilter({
    enableTp: true,
    enableKelas: !propKelasId,
    enableSearch: true,
    enableStatusSiswa: true,
    allowAllKelas: true,
    jurusanId,
  });

  const effectiveTpId = propTpId || filter.values.tahunPelajaranId;
  const effectiveKelasId = propKelasId || filter.values.kelasId;
  const effectiveStatus = filter.values.statusSiswa;
  const effectiveSearch = filter.debouncedSearchQuery;

  // Reset page when filters change
  const handleFilterChange = useCallback(() => setPage(1), []);
  void handleFilterChange; // suppress unused warning — wired via filter values deps

  // ── Query: Buku Induk List ──
  const { data: indukData, isLoading: isLoadingInduk } = useQuery({
    queryKey: bukuIndukQueryKeys.list({
      tpId: effectiveTpId,
      kelasId: effectiveKelasId,
      search: effectiveSearch,
      status: effectiveStatus,
      page,
    }),
    queryFn: () =>
      bukuIndukApi.getList({
        tahun_pelajaran_id: effectiveTpId || undefined,
        kelas_id: effectiveKelasId || undefined,
        search: effectiveSearch || undefined,
        status: effectiveStatus || undefined,
        page,
        limit: 15,
      }),
    enabled: activeTab === 'induk',
    staleTime: 3 * 60 * 1000,
  });

  // ── Query: Buku Klapper ──
  const { data: klapperData, isLoading: isLoadingKlapper } = useQuery({
    queryKey: bukuIndukQueryKeys.klapper({
      tpId: effectiveTpId,
      huruf: selectedHuruf,
      search: effectiveSearch,
      page: klapperPage,
    }),
    queryFn: () =>
      bukuIndukApi.getKlapper({
        tahun_pelajaran_id: effectiveTpId || undefined,
        huruf: selectedHuruf || undefined,
        search: effectiveSearch || undefined,
        page: klapperPage,
        limit: 20,
      }),
    enabled: activeTab === 'klapper',
    staleTime: 3 * 60 * 1000,
  });

  const indukList = indukData?.data ?? [];
  const indukPagination = indukData?.pagination;
  const klapperList = klapperData?.data ?? [];
  const klapperPagination = klapperData?.pagination;

  const handleDetail = useCallback((id: string) => {
    setSelectedSiswaId(id);
  }, []);

  const handlePrint = useCallback((id: string) => {
    setPrintSiswaId(id);
  }, []);

  // ── Tab switch resets page ──
  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setPage(1);
    setKlapperPage(1);
  }, []);

  // ── Huruf filter handler ──
  const handleHurufSelect = useCallback((huruf: string) => {
    setSelectedHuruf((prev) => (prev === huruf ? '' : huruf));
    setKlapperPage(1);
  }, []);

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Filter Toolbar */}
      <AcademicFilterToolbar {...filter.toolbarProps} />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => handleTabSwitch('induk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'induk'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen size={15} />
          Buku Induk
        </button>
        <button
          onClick={() => handleTabSwitch('klapper')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'klapper'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookMarked size={15} />
          Buku Klapper
        </button>
      </div>

      {activeTab === 'klapper' && (
        <div className="flex flex-wrap gap-1 items-center">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => handleHurufSelect(letter)}
              className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                selectedHuruf === letter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {letter}
            </button>
          ))}
          {selectedHuruf && (
            <button
              onClick={() => { setSelectedHuruf(''); setKlapperPage(1); }}
              className="px-3 h-8 rounded-lg text-xs font-black bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Reset
            </button>
          )}
          {/* Cetak Klapper */}
          <button
            onClick={() => setShowKlapperPrint(true)}
            className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Printer size={13} />
            Cetak Klapper
          </button>
        </div>
      )}

      {/* Detail Panel 360° */}
      {selectedSiswaId && (
        <DetailPanel360
          siswaId={selectedSiswaId}
          onClose={() => setSelectedSiswaId(null)}
          onPrint={() => { setPrintSiswaId(selectedSiswaId); }}
        />
      )}

      {/* Table */}
      <SectionCard fullWidth noPadding className="w-full min-w-0 overflow-hidden">
        {activeTab === 'induk' ? (
          <>
            <BukuIndukTable
              data={indukList}
              isLoading={isLoadingInduk}
              onDetail={handleDetail}
              onPrint={handlePrint}
            />
            {indukPagination && indukPagination.totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={indukPagination.totalPages}
                total={indukPagination.total}
                limit={indukPagination.limit}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <>
            <KlapperTable
              data={klapperList}
              isLoading={isLoadingKlapper}
              selectedHuruf={selectedHuruf}
              onDetail={handleDetail}
            />
            {klapperPagination && klapperPagination.totalPages > 1 && (
              <Pagination
                page={klapperPage}
                totalPages={klapperPagination.totalPages}
                total={klapperPagination.total}
                limit={klapperPagination.limit}
                onPageChange={setKlapperPage}
              />
            )}
          </>
        )}
      </SectionCard>

      {/* Buku Induk Print Modal */}
      {printSiswaId && (
        <BukuIndukPrintModal
          isOpen={Boolean(printSiswaId)}
          onClose={() => setPrintSiswaId(null)}
          siswaId={printSiswaId}
        />
      )}

      {/* Buku Klapper Print Modal */}
      <KlapperPrintModal
        isOpen={showKlapperPrint}
        onClose={() => setShowKlapperPrint(false)}
        klapperData={klapperList}
        huruf={selectedHuruf || undefined}
        tahunPelajaran={filter.activeTpYear?.tahun}
      />
    </div>
  );
});

BukuIndukView.displayName = 'BukuIndukView';
