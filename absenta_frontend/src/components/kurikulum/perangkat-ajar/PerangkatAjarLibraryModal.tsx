import React, { useCallback } from 'react';
import { Search, BookOpen, Download, Zap, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Modal, Button, Badge, SearchableSelect } from '../../ui';

interface Option {
  label: string;
  value: string;
}

export interface LibraryTemplateItem {
  id: string;
  judul: string;
  jenis: string;
  jenjang: string;
  nama_mapel: string;
  tingkat: number;
  fase?: string;
  deskripsi?: string;
  download_count?: number;
}

export interface MyPerangkatItem {
  id: string;
  jenis: string;
  judul: string;
  topik?: string;
  status: string;
  mapel_id?: string;
}

interface PerangkatAjarLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  librarySearch: string;
  setLibrarySearch: (val: string) => void;
  libraryJenisFilter: string;
  setLibraryJenisFilter: (val: string) => void;
  claimMapelId: string;
  setClaimMapelId: (val: string) => void;
  claimingId: string | null;
  libraryTemplates: LibraryTemplateItem[];
  myPerangkatList?: MyPerangkatItem[];
  onEditExistingPerangkat?: (item: MyPerangkatItem) => void;
  isLoadingLibrary: boolean;
  filterJenisOptions: Option[];
  mapelOptions: Option[];
  teacherAssignedMapels?: { id: string; nama_mapel: string }[];
  activeYear?: { id: string; tahun: string };
  activeSemester?: { id: string; nama_semester: string };
  currentGuru?: { id: string; nama_guru: string };
  jenisLabels: Record<string, string>;
  onClaim: (params: {
    library_id: string;
    mapel_id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    guru_id: string;
  }) => void;
}

export default function PerangkatAjarLibraryModal({
  isOpen,
  onClose,
  librarySearch,
  setLibrarySearch,
  libraryJenisFilter,
  setLibraryJenisFilter,
  claimMapelId,
  setClaimMapelId,
  claimingId,
  libraryTemplates,
  myPerangkatList,
  onEditExistingPerangkat,
  isLoadingLibrary,
  filterJenisOptions,
  mapelOptions,
  teacherAssignedMapels,
  activeYear,
  activeSemester,
  currentGuru,
  jenisLabels,
  onClaim,
}: PerangkatAjarLibraryModalProps) {
  // Deteksi jika template ini sudah diklaim / dimiliki oleh Guru di repositori miliknya
  const isClaimedByMe = useCallback((tmpl: LibraryTemplateItem) => {
    if (!myPerangkatList || myPerangkatList.length === 0) return null;

    const sanitize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();

    const tmplTitle = sanitize(tmpl.judul || '');

    return myPerangkatList.find((item) => {
      if (item.jenis && tmpl.jenis && item.jenis.toUpperCase() !== tmpl.jenis.toUpperCase()) {
        return false;
      }
      const itemTitle = sanitize(item.judul || '');
      if (itemTitle && tmplTitle && (itemTitle.includes(tmplTitle) || tmplTitle.includes(itemTitle))) {
        return true;
      }
      return false;
    });
  }, [myPerangkatList]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Katalog Perangkat Ajar Platform (Siap Klaim & Pakai)"
      size="5xl"
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
          <p className="font-bold flex items-center">
            <Zap className="w-4 h-4 mr-1.5 text-amber-500 fill-amber-400" />
            Adopsi Perangkat Ajar Nasional Berbasis AI & Kurikulum Merdeka
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Pilih perangkat dari repositori pusat. Sistem akan langsung mengkloning dokumen ini ke akun Anda untuk semester aktif ({activeYear?.tahun || '2025/2026'} - {activeSemester?.nama_semester || 'Genap'}).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Cari berdasarkan judul perangkat atau mata pelajaran..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="w-full sm:w-56">
            <SearchableSelect
              id="library-jenis-filter"
              value={libraryJenisFilter}
              onValueChange={setLibraryJenisFilter}
              options={filterJenisOptions}
              placeholder="Semua Jenis"
            />
          </div>
        </div>

        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
          <label htmlFor="claim-mapel-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            🎯 Target Mata Pelajaran Anda (Dokumen Hasil Adopsi) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="claim-mapel-select"
            value={claimMapelId}
            onValueChange={setClaimMapelId}
            options={mapelOptions}
            placeholder="Pilih Mata Pelajaran Tempat Menyimpan Perangkat"
          />
          {teacherAssignedMapels && teacherAssignedMapels.length > 0 ? (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
              ✨ Dideteksi Otomatis: Menampilkan {teacherAssignedMapels.length} Mapel pengampuan Anda di jadwal.
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 mt-1">
              *Tampilkan semua mapel sekolah (Belum terdeteksi pengampuan spesifik di jadwal).
            </p>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
          {isLoadingLibrary ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">Memuat katalog platform...</div>
          ) : !libraryTemplates || libraryTemplates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada template perangkat ajar yang cocok dengan kata kunci/filter Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {libraryTemplates?.map((tmpl) => {
                const claimedItem = isClaimedByMe(tmpl);

                return (
                  <div
                    key={tmpl.id}
                    className={`p-4 border rounded-xl transition-all flex flex-col justify-between ${
                      claimedItem
                        ? 'border-blue-300 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold border-none text-[10px]">
                          {jenisLabels[tmpl.jenis] || tmpl.jenis}
                        </Badge>

                        {claimedItem ? (
                          <Badge className="bg-blue-600 text-white font-extrabold border-none text-[10px] flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={11} className="text-white" /> SUDAH DIKLAIM ANDA
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center">
                            <Download className="w-3 h-3 mr-1" />
                            {tmpl.download_count || 0} Adopsi
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-1">{tmpl.judul}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Mapel Standard: {tmpl.nama_mapel} | Kelas {tmpl.tingkat} (Fase {tmpl.fase || 'E/F'})
                        </p>
                      </div>

                      {tmpl.deskripsi && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                          "{tmpl.deskripsi}"
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center">
                        <BookOpen className="w-3 h-3 mr-1" /> Ready Template
                      </span>

                      {claimedItem ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onEditExistingPerangkat) {
                              onClose();
                              onEditExistingPerangkat(claimedItem);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold py-1 px-3 border-0 shadow-sm flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 mr-0.5" /> EDIT DOKUMEN ANDA
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!claimMapelId || claimingId === tmpl.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!claimMapelId) return;
                            onClaim({
                              library_id: tmpl.id,
                              mapel_id: claimMapelId,
                              tahun_pelajaran_id: activeYear?.id || '',
                              semester_id: activeSemester?.id || '',
                              guru_id: currentGuru?.id || '',
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold py-1 px-3 border-0 shadow-sm disabled:opacity-50"
                        >
                          {claimingId === tmpl.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengklaim...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 mr-1 text-amber-300 fill-amber-300" /> KLAIM SEKARANG
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">
            TUTUP
          </Button>
        </div>
      </div>
    </Modal>
  );
}
