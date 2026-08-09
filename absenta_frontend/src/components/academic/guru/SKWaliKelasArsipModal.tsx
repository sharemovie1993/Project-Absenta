import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { skWaliKelasArsipApi, SKWaliKelasArsip } from '../../../api/academic/sk-wali-kelas-arsip.api';
import WordEditorModal, { WordEditorPage } from '../../common/WordEditorModal';
import { FileText, Trash2, Eye, Search, Calendar, User, BookOpen } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SKWaliKelasArsipModal = React.memo(({ isOpen, onClose }: Props) => {
  const [arsipList, setArsipList] = useState<SKWaliKelasArsip[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected item for preview
  const [previewItem, setPreviewItem] = useState<SKWaliKelasArsip | null>(null);
  const [previewPages, setPreviewPages] = useState<WordEditorPage[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchArsip = async () => {
    setLoading(true);
    try {
      const res: any = await skWaliKelasArsipApi.getArsipList({ search });
      if (res?.data) {
        setArsipList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArsip();
    }
  }, [isOpen, search]);

  const handleOpenPreview = async (item: SKWaliKelasArsip) => {
    try {
      const res: any = await skWaliKelasArsipApi.getArsipById(item.id);
      const detail = res?.data || item;
      setPreviewItem(detail);
      if (detail.halaman_html && Array.isArray(detail.halaman_html)) {
        setPreviewPages(detail.halaman_html);
      } else {
        setPreviewPages([{ label: 'SK Wali Kelas', html: '<p>Tidak ada konten halaman</p>' }]);
      }
      setIsPreviewOpen(true);
    } catch (err: any) {
      alert('Gagal memuat arsip: ' + (err.message || 'Error'));
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus arsip SK untuk ${nama}?`)) return;
    try {
      await skWaliKelasArsipApi.deleteArsip(id);
      fetchArsip();
    } catch (err: any) {
      alert('Gagal menghapus arsip: ' + (err.message || 'Error'));
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="📁 Arsip SK Wali Kelas yang Pernah Dicetak" size="xl">
        <div className="p-4 space-y-4">

          {/* Search & Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama guru, kelas, atau nomor SK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Badge variant="outline" className="bg-white text-indigo-600 font-bold border-indigo-200">
              Total {arsipList.length} Arsip
            </Badge>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Guru &amp; Kelas</th>
                  <th className="p-3">Nomor SK</th>
                  <th className="p-3">Tahun Pelajaran</th>
                  <th className="p-3">Tanggal Cetak</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Memuat arsip SK...</td>
                  </tr>
                ) : arsipList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Belum ada arsip SK Wali Kelas yang dicetak.
                    </td>
                  </tr>
                ) : (
                  arsipList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          {item.nama_guru}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Kelas: <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.nama_kelas}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.nomor_sk || '-'}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.tahun_pelajaran}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPreview(item)}
                            className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview / Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id, item.nama_guru)}
                            className="text-rose-500 hover:bg-rose-50 p-1.5"
                            title="Hapus Arsip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </Modal>

      {/* Word Editor Preview Modal for Archived SK */}
      {isPreviewOpen && previewItem && (
        <WordEditorModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={`Arsip SK Wali Kelas - ${previewItem.nama_guru} (${previewItem.nama_kelas})`}
          printTitle={`SK Wali Kelas - ${previewItem.nama_guru}`}
          printButtonLabel="Cetak Ulang (PDF)"
          initialPages={previewPages}
          allowExtraPages={false}
          orientation="portrait"
        />
      )}
    </>
  );
});

export default SKWaliKelasArsipModal;
