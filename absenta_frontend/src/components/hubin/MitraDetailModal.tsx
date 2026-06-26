import React from 'react';
import type { MitraIndustri } from '../../api/hubin.api';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  ShieldCheck, 
  Compass, 
  Bookmark, 
  Users, 
  ExternalLink,
  Award,
  Clock
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface MitraDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitra: MitraIndustri | null;
}

export const MitraDetailModal: React.FC<MitraDetailModalProps> = ({
  isOpen,
  onClose,
  mitra
}) => {
  if (!mitra) return null;

  // Format dates nicely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const hasGps = mitra.latitude !== undefined && mitra.latitude !== null &&
                 mitra.longitude !== undefined && mitra.longitude !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Building2 className="text-indigo-650 dark:text-indigo-400" size={20} />
          <span>Detail Mitra Industri</span>
        </div>
      }
    >
      <div className="space-y-6 text-xs sm:text-sm">
        
        {/* Header Section: Company Name, Sector & Active Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-150">{mitra.nama}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
              <Building2 size={13} className="text-indigo-500" />
              <span>{mitra.bidang || 'Bidang Usaha Tidak Ditentukan'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {mitra.mou_status && (
              <Badge 
                variant={
                  mitra.mou_status === 'AKTIF' ? 'success' : 
                  mitra.mou_status === 'EXPIRED' ? 'error' : 'secondary'
                }
                className="font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full"
              >
                {mitra.mou_status === 'AKTIF' ? 'MoU Aktif' : `MoU ${mitra.mou_status}`}
              </Badge>
            )}
            {hasGps && (
              <Badge variant="info" className="font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                <Compass size={10} /> Geotagged
              </Badge>
            )}
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left Column: Contact & Location */}
          <div className="space-y-4">
            
            {/* General Contact Info Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150/40 dark:border-slate-800/40 space-y-3.5">
              <p className="font-black text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Kontak & Alamat</p>
              
              <div className="flex items-start gap-3">
                <MapPin className="text-slate-450 shrink-0 mt-0.5" size={15} />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Alamat Lengkap</span>
                  <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">{mitra.alamat || 'Alamat belum diisi'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="text-slate-450 shrink-0 mt-0.5" size={15} />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Nomor Telepon / WhatsApp</span>
                  <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{mitra.kontak || 'Nomor kontak belum terdaftar'}</p>
                </div>
              </div>
            </div>

            {/* PIC Info Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150/40 dark:border-slate-800/40 space-y-3.5">
              <p className="font-black text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Penanggung Jawab / PIC</p>
              
              {mitra.pic_nama ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="text-slate-450 shrink-0" size={15} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{mitra.pic_nama}</p>
                      {mitra.pic_jabatan && <p className="text-[10px] text-slate-400 font-bold">{mitra.pic_jabatan}</p>}
                    </div>
                  </div>

                  {mitra.pic_telepon && (
                    <div className="flex items-center gap-3">
                      <Phone className="text-slate-450 shrink-0" size={15} />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400">Telepon PIC</span>
                        <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{mitra.pic_telepon}</p>
                      </div>
                    </div>
                  )}

                  {mitra.pic_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="text-slate-450 shrink-0" size={15} />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400">Email PIC</span>
                        <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{mitra.pic_email}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2 text-center">Informasi PIC belum diisi</p>
              )}
            </div>

          </div>

          {/* Right Column: MoU, Geofence & PKL Capacity */}
          <div className="space-y-4">
            
            {/* MoU & PKL Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150/40 dark:border-slate-800/40 space-y-3.5">
              <p className="font-black text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Administrasi & PKL</p>

              <div className="flex items-start gap-3">
                <Bookmark className="text-slate-450 shrink-0 mt-0.5" size={15} />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Nomor MoU / Perjanjian</span>
                  <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{mitra.mou_nomor || 'Tidak tercatat'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-3">
                  <Calendar className="text-slate-450 shrink-0 mt-0.5" size={15} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Mulai Berlaku</span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-350 font-semibold">{formatDate(mitra.mou_tanggal_mulai)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="text-slate-450 shrink-0 mt-0.5" size={15} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Berakhir Berlaku</span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-350 font-semibold">{formatDate(mitra.mou_tanggal_berakhir)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/40">
                <div className="flex items-start gap-3">
                  <Users className="text-slate-450 shrink-0 mt-0.5" size={15} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Kuota PKL</span>
                    <p className="text-xs text-slate-850 dark:text-slate-200 font-black">{mitra.kuota_pkl || 0} Siswa</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="text-slate-450 shrink-0 mt-0.5" size={15} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Kesesuaian Kompetensi</span>
                    <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{mitra.kompetensi_keahlian || 'Semua Jurusan'}</p>
                  </div>
                </div>
              </div>

              {mitra.mou_url && (
                <div className="pt-2">
                  <a 
                    href={mitra.mou_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 border border-emerald-250 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors hover:bg-emerald-100/65"
                  >
                    Buka Dokumen MOU Utama
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Geofence Info Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150/40 dark:border-slate-800/40 space-y-3">
              <p className="font-black text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Geofencing Wilayah Presensi</p>

              {hasGps ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-200/40 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="truncate">Lat: {mitra.latitude?.toFixed(5)}</div>
                    <div className="truncate">Lon: {mitra.longitude?.toFixed(5)}</div>
                    <div className="truncate">Rad: {mitra.radius || 100}m</div>
                  </div>

                  <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      title="OSM Location Preview"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${mitra.longitude! - 0.002}%2C${mitra.latitude! - 0.001}%2C${mitra.longitude! + 0.002}%2C${mitra.latitude! + 0.001}&layer=mapnik&marker=${mitra.latitude!}%2C${mitra.longitude!}`}
                      className="contrast-[1.05]"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2 text-center">Koordinat Geofencing belum disinkronkan</p>
              )}
            </div>

          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button 
            onClick={onClose} 
            variant="toolbarPrimary" 
            className="px-6 py-2 font-bold rounded-xl"
          >
            Tutup Detail
          </Button>
        </div>

      </div>
    </Modal>
  );
};
