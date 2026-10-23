import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Building,
  RotateCw,
  Edit2,
  Save,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  bastIjazahApi,
  bastIjazahQueryKeys,
  type PreviewBebasAdministrasiResponse,
  type PosClearanceKey,
} from '@/api/correspondence/bastIjazah.api';
import { SuratBebasAdministrasiSheet } from './SuratBebasAdministrasiSheet';

interface BebasAdministrasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  onSuccess?: () => void;
}

const POS_LABELS: Record<PosClearanceKey, { title: string; desc: string }> = {
  perpustakaan: {
    title: 'Perpustakaan Sekolah',
    desc: 'Bebas pinjaman buku paket pelajaran semester 1-6 & denda',
  },
  keuangan: {
    title: 'Bagian Keuangan / TU',
    desc: 'Lunas seluruh iuran komite / SPP / kewajiban seragam',
  },
  bengkel_jurusan: {
    title: 'Bengkel Kejuruan / Lab',
    desc: 'Pengembalian peralatan praktek & penyerahan laporan PKL',
  },
  bk: {
    title: 'Bimbingan Konseling (BK)',
    desc: 'Bebas catatan sanksi kedisiplinan / tuntas konseling karir',
  },
  wali_kelas: {
    title: 'Wali Kelas',
    desc: 'Penyerahan pasfoto ijazah 3x4 dop hitam putih & rapor tuntas',
  },
};

export const BebasAdministrasiModal: React.FC<BebasAdministrasiModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  const [activeEditingPos, setActiveEditingPos] = useState<PosClearanceKey | null>(null);
  const [editingPetugas, setEditingPetugas] = useState('');
  const [editingCatatan, setEditingCatatan] = useState('');

  // 1. Fetch Clearance Status
  const {
    data: statusResponse,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: bastIjazahQueryKeys.statusClearance(siswaId),
    queryFn: () => bastIjazahApi.getStatusClearance(siswaId),
    enabled: isOpen && Boolean(siswaId),
  });

  const clearanceData = statusResponse?.data;

  // 2. Fetch Live Preview Sheet
  const {
    data: previewResponse,
    isLoading: isPreviewLoading,
    refetch: refetchPreview,
    isFetching,
  } = useQuery({
    queryKey: ['preview-bebas-administrasi', siswaId],
    queryFn: () => bastIjazahApi.previewBebasAdministrasi({ siswa_id: siswaId }),
    enabled: isOpen && Boolean(siswaId),
  });

  const previewData: PreviewBebasAdministrasiResponse | undefined = previewResponse?.data;

  // 3. Mutation: Toggle or Update Pos Status
  const updatePosMutation = useMutation({
    mutationFn: async (payload: {
      pos: PosClearanceKey;
      status: 'BEBAS' | 'BELUM_BEBAS';
      catatan?: string;
      petugas_nama?: string;
    }) => {
      const posUpper = payload.pos.toUpperCase() as any;
      return bastIjazahApi.updateClearance({
        siswa_id: siswaId,
        pos: posUpper,
        status: payload.status,
        catatan: payload.catatan,
        petugas_nama: payload.petugas_nama,
      });
    },
    onSuccess: () => {
      toast.success('Status pos verifikasi diperbarui!');
      refetchStatus();
      refetchPreview();
      queryClient.invalidateQueries({ queryKey: bastIjazahQueryKeys.all });
      if (onSuccess) onSuccess();
      setActiveEditingPos(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui status pos');
    },
  });

  const handleToggleStatus = (pos: PosClearanceKey) => {
    if (!clearanceData) return;
    const current = clearanceData.pos_clearance[pos];
    const newStatus = current?.status === 'BEBAS' ? 'BELUM_BEBAS' : 'BEBAS';
    updatePosMutation.mutate({
      pos,
      status: newStatus,
      catatan: current?.catatan,
      petugas_nama: current?.petugas,
    });
  };

  const handleStartEdit = (pos: PosClearanceKey) => {
    if (!clearanceData) return;
    const current = clearanceData.pos_clearance[pos];
    setActiveEditingPos(pos);
    setEditingPetugas(current?.petugas || '');
    setEditingCatatan(current?.catatan || '');
  };

  const handleSaveEdit = (pos: PosClearanceKey) => {
    if (!clearanceData) return;
    const current = clearanceData.pos_clearance[pos];
    updatePosMutation.mutate({
      pos,
      status: current?.status || 'BEBAS',
      petugas_nama: editingPetugas,
      catatan: editingCatatan,
    });
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Verifikasi Bebas Administrasi Sekolah"
      subtitle={clearanceData?.siswa ? `${clearanceData.siswa.nama_siswa} (NIS: ${clearanceData.siswa.nis} | Kelas: ${clearanceData.siswa.kelas})` : 'Pelepasan Siswa'}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-6">
        {/* Panel Checklist 5 Pos */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Checklist 5 Pos Verifikasi Administrasi
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Klik tombol toggle status pada pos untuk menandai lunas atau verifikasi bebas tanggungan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                  clearanceData?.is_all_cleared
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {clearanceData?.is_all_cleared ? 'SEMUA POS TUNTAS (BEBAS)' : 'MENUNGGU VERIFIKASI'}
              </span>
            </div>
          </div>

          {/* List 5 Pos */}
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(POS_LABELS).map(([posKey, config]) => {
              const k = posKey as PosClearanceKey;
              const item = clearanceData?.pos_clearance?.[k];
              const isBebas = item?.status === 'BEBAS';
              const isEditing = activeEditingPos === k;

              return (
                <div
                  key={k}
                  className={`p-3 rounded-xl border transition-all ${
                    isBebas
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(k)}
                        className={`mt-0.5 shrink-0 p-1 rounded-lg transition-transform hover:scale-105 ${
                          isBebas
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400'
                        }`}
                        title="Klik untuk mengubah status Bebas / Belum Bebas"
                      >
                        {isBebas ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{config.title}</p>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                              isBebas
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {isBebas ? 'Lunas / Bebas' : 'Belum Bebas'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{config.desc}</p>

                        {/* Petugas & Catatan display */}
                        {!isEditing ? (
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-300">
                            <span>Petugas: <b>{item?.petugas || '-'}</b></span>
                            {item?.catatan && <span>• Ket: <i>{item.catatan}</i></span>}
                          </div>
                        ) : (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={editingPetugas}
                              onChange={(e) => setEditingPetugas(e.target.value)}
                              placeholder="Nama Petugas Verifikator"
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <input
                              type="text"
                              value={editingCatatan}
                              onChange={(e) => setEditingCatatan(e.target.value)}
                              placeholder="Catatan / No. Tanda Terima"
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <div className="sm:col-span-2 flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveEditingPos(null)}
                                className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(k)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded"
                              >
                                <Save size={11} /> Simpan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(k)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Ubah Nama Petugas & Catatan"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                refetchStatus();
                refetchPreview();
              }}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
            >
              <RotateCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Segarkan Pratinjau
            </button>
          </div>
        </div>

        {/* Live WYSIWYG Sheet */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center">
          {isPreviewLoading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-bold">Menyusun surat keterangan bebas administrasi...</p>
            </div>
          ) : previewData ? (
            <SuratBebasAdministrasiSheet data={previewData} tenantInfo={tenantInfo} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
              Gagal memuat pratinjau surat bebas administrasi
            </div>
          )}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
