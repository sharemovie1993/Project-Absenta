import React from 'react';
import type { JurusanItem, MitraStats, MitraListResponse } from './types';
import type { MitraIndustri } from '@/api/hubin.api';
import { exportDataToExcel, generateImportTemplate } from '@/utils/export.utils';
import { formatDate } from '@/utils/layoutUtils';

export function getWhatsAppUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  const formatted = cleaned.startsWith('0') ? '62' + cleaned.substring(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
  return `https://wa.me/${formatted}`;
}

export function renderJurusanBadges(
  raw?: string | null,
  jurusanList: JurusanItem[] = []
): React.ReactNode {
  if (!raw) return null;
  let list: string[] = [];
  try {
    if (raw.startsWith('[')) {
      list = JSON.parse(raw);
    } else {
      list = raw.split(',')?.map(s => s.trim())?.filter(Boolean) || [];
    }
  } catch {
    list = raw.split(',')?.map(s => s.trim())?.filter(Boolean) || [];
  }
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.slice(0, 3)?.map((item, idx) => {
        const j = jurusanList.find(x => x.id === item || x.kode === item || x.nama_jurusan === item);
        const label = j ? (j.kode || j.nama_jurusan) : item;
        return (
          <span 
            key={idx} 
            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40"
          >
            {label}
          </span>
        );
      })}
      {list.length > 3 && (
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          +{list.length - 3}
        </span>
      )}
    </div>
  );
}

export function exportMitraToExcel(mitraList: MitraIndustri[], filenamePrefix = 'Daftar_Mitra_Industri') {
  const columns = [
    { header: 'No', accessor: (_: MitraIndustri, idx?: number) => (idx !== undefined ? idx + 1 : 1), width: 6 },
    { header: 'Nama Mitra DU/DI', accessor: (m: MitraIndustri) => m.nama || '', width: 28 },
    { header: 'Bidang Usaha', accessor: (m: MitraIndustri) => m.bidang || '-', width: 20 },
    { header: 'Alamat', accessor: (m: MitraIndustri) => m.alamat || '-', width: 35 },
    { header: 'Telepon/Kontak', accessor: (m: MitraIndustri) => m.kontak || m.pic_telepon || '-', width: 18 },
    { header: 'Nama PIC', accessor: (m: MitraIndustri) => m.pic_nama || '-', width: 20 },
    { header: 'Jabatan PIC', accessor: (m: MitraIndustri) => m.pic_jabatan || '-', width: 18 },
    { header: 'Email PIC', accessor: (m: MitraIndustri) => m.pic_email || '-', width: 22 },
    { header: 'Status MoU', accessor: (m: MitraIndustri) => m.mou_status || 'AKTIF', width: 14 },
    { header: 'No. MoU', accessor: (m: MitraIndustri) => m.mou_nomor || '-', width: 20 },
    { header: 'Mulai MoU', accessor: (m: MitraIndustri) => m.mou_tanggal_mulai ? formatDate(m.mou_tanggal_mulai) : '-', width: 14 },
    { header: 'Berakhir MoU', accessor: (m: MitraIndustri) => m.mou_tanggal_berakhir ? formatDate(m.mou_tanggal_berakhir) : '-', width: 14 },
    { header: 'Kuota PKL', accessor: (m: MitraIndustri) => m.kuota_pkl ?? 0, width: 12 },
    { header: 'Kompetensi Keahlian', accessor: (m: MitraIndustri) => m.kompetensi_keahlian || '-', width: 26 },
    { header: 'Geofence Radius (m)', accessor: (m: MitraIndustri) => m.radius ?? 100, width: 16 },
    { header: 'Koordinat Lokasi', accessor: (m: MitraIndustri) => m.latitude && m.longitude ? `${m.latitude}, ${m.longitude}` : 'Belum ditentukan', width: 25 },
  ];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  exportDataToExcel(mitraList, columns, `${filenamePrefix}_${dateStr}`, 'DAFTAR MITRA INDUSTRI & REKANAN DU/DI (HUBIN)');
}

export function computeMitraStats(
  typedResponse?: MitraListResponse,
  fallbackTotal = 0,
  rawList: MitraIndustri[] = []
): MitraStats {
  const s = typedResponse?.stats;
  if (s) {
    return {
      total: s.total || 0,
      aktif: s.aktif || 0,
      expiringSoon: s.expiringSoon || 0,
      expired: s.expired || 0
    };
  }

  const total = fallbackTotal || rawList.length;
  let aktif = 0;
  let expiringSoon = 0;
  let expired = 0;

  const now = new Date();
  rawList.forEach((m: MitraIndustri) => {
    const endDate = m.mou_tanggal_berakhir ? new Date(m.mou_tanggal_berakhir) : null;
    const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (!m.mou_nomor || m.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0)) {
      expired++;
    } else if (diffDays !== null && diffDays > 0 && diffDays <= 30) {
      expiringSoon++;
    } else {
      aktif++;
    }
  });

  return { total, aktif, expiringSoon, expired };
}

export async function downloadMitraTemplate(jurusanList: JurusanItem[] = []) {
  const jurusanNames = jurusanList?.map(j => j.nama_jurusan)?.filter(Boolean) || [];
  await generateImportTemplate(
    [
      { header: 'Nama Mitra', accessor: (row) => row.nama, width: 30, required: true },
      { header: 'URL Logo Perusahaan', accessor: (row) => row.logo_url, width: 35 },
      { header: 'Bidang Industri', accessor: (row) => row.bidang, width: 25 },
      { header: 'Alamat Perusahaan', accessor: (row) => row.alamat, width: 40 },
      { header: 'Kontak Perusahaan', accessor: (row) => row.kontak, width: 20 },
      { header: 'Nama PIC', accessor: (row) => row.pic_nama, width: 25 },
      { header: 'Jabatan PIC', accessor: (row) => row.pic_jabatan, width: 20 },
      { header: 'No. HP PIC', accessor: (row) => row.pic_telepon, width: 20 },
      { header: 'Email PIC', accessor: (row) => row.pic_email, width: 25 },
      { header: 'Nomor MoU', accessor: (row) => row.mou_nomor, width: 25 },
      { header: 'Tanggal Mulai MoU', accessor: (row) => row.mou_tanggal_mulai, width: 22 },
      { header: 'Tanggal Berakhir MoU', accessor: (row) => row.mou_tanggal_berakhir, width: 22 },
      { header: 'Status MoU', accessor: (row) => row.mou_status, width: 16 },
      { header: 'Kuota PKL', accessor: (row) => row.kuota_pkl, width: 15 },
      { header: 'Kompetensi Keahlian', accessor: (row) => row.kompetensi_keahlian, width: 30 },
      { header: 'Latitude', accessor: (row) => row.latitude, width: 18 },
      { header: 'Longitude', accessor: (row) => row.longitude, width: 18 },
      { header: 'Radius Presensi (Meter)', accessor: (row) => row.radius, width: 22 }
    ],
    [
      {
        nama: 'PT Solusi Teknologi Nusantara',
        logo_url: '',
        bidang: 'Teknologi Informasi & Rekayasa Perangkat Lunak',
        alamat: 'Jl. Industri Kreatif No. 10, Jakarta Pusat',
        kontak: '0215551234',
        pic_nama: 'Budi Santoso',
        pic_jabatan: 'HR Manager',
        pic_telepon: '081234567890',
        pic_email: 'budi@solusitek.co.id',
        mou_nomor: 'MOU/2026/001',
        mou_tanggal_mulai: '2026-07-01',
        mou_tanggal_berakhir: '2027-06-30',
        mou_status: 'AKTIF',
        kuota_pkl: 10,
        kompetensi_keahlian: jurusanNames[0] || 'Rekayasa Perangkat Lunak',
        latitude: -6.175392,
        longitude: 106.827153,
        radius: 100
      }
    ],
    'template_impor_mitra_industri',
    'TEMPLATE IMPOR MITRA INDUSTRI (DU/DI) & TEMPAT PKL. Kolom Nama Mitra WAJIB diisi.'
  );
}

