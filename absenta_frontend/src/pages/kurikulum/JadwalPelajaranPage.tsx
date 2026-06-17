
/**
 * ⚠️ DEPRECATED / TIDAK DIGUNAKAN
 * Komponen ini telah digabungkan ke dalam /pages/attendance/jadwal-template/JadwalTemplatePage.tsx
 * Gunakan JadwalTemplatePage yang baru untuk fitur Grid dan List yang terpadu.
 */
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { Card, Button, Modal, SearchableSelect } from '../../components/ui';
import { JadwalGrid } from '../../components/kurikulum/JadwalGrid';
import { 
  getJadwalTemplate, 
  deleteJadwalTemplate, 
  importJadwalFromExcel,
  type JadwalTemplate 
} from '../../api/attendance/jadwalTemplate.api';
import { exportDataToExcel } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { ExcelImportModal } from '../../components/academic/shared/ExcelImportModal';
import { Upload, Download } from 'lucide-react';
import { kelasApi, guruApi, mapelApi } from '../../api/academic.api';
import { getTahunPelajaranList } from '../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../api/academic/semester.api';
import { JadwalTemplateForm } from '../../components/attendance/jadwal-template/JadwalTemplateForm';
import { LogService } from '../../utils/LogService';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

const JadwalPelajaranPage: React.FC = () => {
  const { can, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jadwal, setJadwal] = useState<JadwalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter State
  const [kelasOptions, setKelasOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(searchParams.get('kelas_id') || '');
  const [tahunOptions, setTahunOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [semesterOptions, setSemesterOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  
  const [guruOptions, setGuruOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(searchParams.get('guru_id') || '');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalTemplate | null>(null);
  const [defaultDay, setDefaultDay] = useState<string>('SENIN');
  const [defaultSlot, setDefaultSlot] = useState<number>(1);

  // Slot to Time mapping (matches JadwalGrid)
  const SLOT_TIME: Record<number, {start: string, end: string}> = {
    1: { start: "07:00", end: "07:45" },
    2: { start: "07:45", end: "08:30" },
    3: { start: "08:30", end: "09:15" },
    4: { start: "09:35", end: "10:20" },
    5: { start: "10:20", end: "11:05" },
    6: { start: "11:05", end: "11:50" },
    7: { start: "12:30", end: "13:15" },
    8: { start: "13:15", end: "14:00" },
    9: { start: "14:00", end: "14:45" },
    10: { start: "14:45", end: "15:30" },
  };

  // 1. Initial Load: Filter Context
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [kelasRes, tpRes, guruRes] = await Promise.all([
          kelasApi.getAll({ limit: 100 }),
          getTahunPelajaranList(1, 10, '', 'ACTIVE'),
          guruApi.getAll({ limit: 100 })
        ]);

        setKelasOptions((kelasRes.data || []).map((k: any) => ({ 
          value: k.id, 
          label: `${k.nama_kelas} (${k.tingkat})` 
        })));
        
        // Only set default kelas if no guru filter is provided
        if (!selectedGuruId && !selectedKelasId && kelasRes.data?.length > 0) {
            setSelectedKelasId(kelasRes.data[0].id);
        }

        setTahunOptions((tpRes.data || []).map((t: any) => ({ 
          value: t.id, 
          label: t.tahun 
        })));

        setGuruOptions((guruRes.data || []).map((g: any) => ({
            value: g.id,
            label: g.nama_guru || g.User?.full_name || 'Guru'
        })));

        const activeTp = tpRes.data?.find((t: any) => t.is_active) || tpRes.data?.[0];
        if (activeTp) {
          setSelectedTahunId(activeTp.id);
          const semRes = await getSemesterList(1, 10, '', activeTp.id);
          setSemesterOptions((semRes.data || []).map((s: any) => ({ value: s.id, label: s.nama_semester })));
          const activeSem = semRes.data?.find((s: any) => s.is_active) || semRes.data?.[0];
          if (activeSem) setSelectedSemesterId(activeSem.id);
        }
      } catch (err) {
        LogService.error('Failed to load filter context', err);
      }
    };
    loadFilters();
  }, []);

  // 2. Load Schedule Data
  useEffect(() => {
    // We need either Kelas or Guru to fetch meaningful data, plus the academic context
    if ((!selectedKelasId && !selectedGuruId) || !selectedTahunId || !selectedSemesterId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getJadwalTemplate({
          kelas_id: selectedKelasId || undefined,
          guru_id: selectedGuruId || undefined,
          tahun_pelajaran_id: selectedTahunId,
          semester_id: selectedSemesterId
        });
        setJadwal(res.data || []);
      } catch (err) {
        LogService.error('Failed to fetch schedules', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey]);

  // Update URL on filter change
  useEffect(() => {
      const params: any = {};
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      if (selectedGuruId) params.guru_id = selectedGuruId;
      setSearchParams(params);
  }, [selectedKelasId, selectedGuruId]);

  const handleAddSlot = (day: string, slot: number) => {
    setDefaultDay(day);
    setDefaultSlot(slot);
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleEditSlot = (item: JadwalTemplate) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      await deleteJadwalTemplate(id);
      toast.success('Jadwal berhasil dihapus');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      toast.error('Gagal menghapus jadwal');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await getJadwalTemplate({
        kelas_id: selectedKelasId || undefined,
        guru_id: selectedGuruId || undefined,
        tahun_pelajaran_id: selectedTahunId,
        semester_id: selectedSemesterId
      });
      exportDataToExcel<any>(
        res.data,
        [
          { header: 'Hari', accessor: (row: any) => row.hari, width: 15 },
          { header: 'Mulai', accessor: (row: any) => row.jam_mulai, width: 10 },
          { header: 'Selesai', accessor: (row: any) => row.jam_selesai, width: 10 },
          { header: 'Kelas', accessor: (row: any) => row.Kelas?.nama_kelas || '', width: 15 },
          { header: 'Mapel', accessor: (row: any) => row.Mapel?.nama_mapel || '', width: 25 },
          { header: 'Guru', accessor: (row: any) => row.Guru?.User?.full_name || '', width: 30 }
        ],
        'jadwal_pelajaran'
      );
      toast.success('Data berhasil diekspor');
    } catch (e) {
      toast.error('Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async () => {
    try {
      toast.loading('Menyiapkan data referensi...', { duration: 2000 });
      const [kelasRes, mapelRes, guruRes] = await Promise.all([
        kelasApi.getAll({ limit: 500 }),
        mapelApi.getAll({ limit: 1000 }),
        guruApi.getAll({ limit: 1000 })
      ]);

      const hariList = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
      const kelasNames = (kelasRes.data || []).map(k => k.nama_kelas).filter(Boolean) as string[];
      const mapelNames = (mapelRes.data || []).map(m => m.nama_mapel).filter(Boolean) as string[];
      const guruNames = (guruRes.data || []).map(g => g.nama_guru || g.User?.full_name).filter(Boolean) as string[];

      await generateAdvancedTemplate(
        [
          { header: 'Hari', key: 'hari', width: 15, required: true, dropdown: { refKey: 'hari' } },
          { header: 'Jam Mulai', key: 'jam_mulai', width: 15, required: true },
          { header: 'Jam Selesai', key: 'jam_selesai', width: 15, required: true },
          { header: 'Nama Kelas', key: 'nama_kelas', width: 25, required: true, dropdown: { refKey: 'kelas' } },
          { header: 'Nama Mapel', key: 'nama_mapel', width: 35, required: true, dropdown: { refKey: 'mapels' } },
          { header: 'Nama Guru', key: 'nama_guru', width: 35, required: true, dropdown: { refKey: 'gurus' } }
        ],
        {
          fileName: 'template_impor_jadwal_pelajaran',
          instructions: [
            'Pilih Hari, Kelas, Mapel, dan Guru dari daftar dropdown.',
            'Format jam harus HH:mm (contoh: 07:00).',
            'Satu baris mewakili satu slot jam pelajaran.',
            'Kolom Kuning Emas wajib diisi.'
          ],
          referenceData: {
            hari: hariList,
            kelas: kelasNames,
            mapels: mapelNames,
            gurus: guruNames
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh template');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Pelajaran</h1>
          <p className="text-gray-500 dark:text-gray-400">Penyusunan dan visualisasi jadwal KBM per kelas.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          {can('academic.teaching.manage') && (
            <>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setEditingItem(null); setIsAddModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Jadwal Baru
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-none shadow-sm bg-gray-50/50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pilih Kelas</label>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={(val) => {
                  setSelectedKelasId(val);
                  if (val) setSelectedGuruId(''); // Mutual exclusion for clarity in visual grid
              }}
              options={[{value: '', label: 'Semua Kelas'}, ...kelasOptions]}
              placeholder="Semua Kelas"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pilih Guru</label>
            <SearchableSelect
              value={selectedGuruId}
              onValueChange={(val) => {
                  setSelectedGuruId(val);
                  if (val) setSelectedKelasId(''); // Mutual exclusion
              }}
              options={[{value: '', label: 'Semua Guru'}, ...guruOptions]}
              placeholder="Cari Guru..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tahun Pelajaran</label>
            <SearchableSelect
              value={selectedTahunId}
              onValueChange={setSelectedTahunId}
              options={tahunOptions}
              placeholder="Pilih Tahun"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Semester</label>
            <SearchableSelect
              value={selectedSemesterId}
              onValueChange={setSelectedSemesterId}
              options={semesterOptions}
              placeholder="Pilih Semester"
            />
          </div>
        </div>
      </Card>

      {/* The Visual Grid */}
      <div className="relative">
        <JadwalGrid 
          jadwal={jadwal}
          loading={loading}
          onAddSlot={can('academic.teaching.manage') ? handleAddSlot : undefined}
          onEditSlot={can('academic.teaching.manage') ? handleEditSlot : undefined}
          onDeleteSlot={can('academic.teaching.manage') ? handleDeleteSlot : undefined}
          readOnly={!can('academic.teaching.manage')}
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingItem ? "Edit Jadwal" : "Tambah Jadwal Baru"}
        size="lg"
      >
        <div className="p-6">
          {isAddModalOpen && (
            <JadwalTemplateForm 
              initialData={(editingItem || {
                hari: defaultDay,
                jam_mulai: SLOT_TIME[defaultSlot]?.start || "07:00",
                jam_selesai: SLOT_TIME[defaultSlot]?.end || "07:45",
                jenis_kegiatan: "KBM"
              }) as any}
              kelasId={selectedKelasId}
              tahunPelajaranId={selectedTahunId}
              semesterId={selectedSemesterId}
              onSuccess={() => {
                setIsAddModalOpen(false);
                setRefreshKey(prev => prev + 1);
              }}
              onCancel={() => setIsAddModalOpen(false)}
            />
          )}
        </div>
      </Modal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => { setIsImportOpen(false); setRefreshKey(prev => prev + 1); }}
        onImport={(file, onProgress) => importJadwalFromExcel(file, selectedTahunId, selectedSemesterId, onProgress)}
        title="Import Jadwal Pelajaran"
        templateName="template_impor_jadwal.xlsx"
        onDownloadTemplate={handleTemplateDownload}
        description="Impor jadwal pelajaran masal untuk tahun dan semester terpilih."
      />
    </div>
  );
};

export default JadwalPelajaranPage;
