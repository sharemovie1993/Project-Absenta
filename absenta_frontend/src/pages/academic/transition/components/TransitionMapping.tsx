import React, { useEffect, useState, useMemo } from 'react';
import { 
  Button, 
  Badge, 
  Label,
  Alert,
  AlertDescription,
  SectionCard
} from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getKelasList } from '../../../../api/academic/kelas.api';
import type { Kelas } from '../../../../types/academic';
import type { ClassMapping } from '../../../../api/academic/transition.api';
import { 
  ArrowRight, 
  RefreshCw, 
  LayoutGrid, 
  Check, 
  Filter,
  Info,
  Loader2
} from 'lucide-react';

interface Props {
  onNext: (mapping: ClassMapping[]) => void;
  onBack: () => void;
  initialMapping?: ClassMapping[];
  managedClassId?: string;
}

const TransitionMapping: React.FC<Props> = ({ onNext, onBack, initialMapping, managedClassId }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [filterTingkat, setFilterTingkat] = useState<string>('all');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (initialMapping) {
      const map: Record<string, string> = {};
      initialMapping.forEach(m => {
        map[m.fromKelasId] = m.toKelasId;
      });
      setMapping(map);
    }
  }, [initialMapping]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await getKelasList(1, 1000);
      setClasses(res.data);
      if (!initialMapping) {
        autoMapClasses(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const autoMapClasses = (data: Kelas[]) => {
    const newMapping: Record<string, string> = {};
    const byJurusanTingkat: Record<string, Kelas[]> = {};

    data.forEach(k => {
      const key = `${k.jurusan_id || 'general'}:${k.tingkat}`;
      if (!byJurusanTingkat[key]) byJurusanTingkat[key] = [];
      byJurusanTingkat[key].push(k);
    });

    data.forEach(source => {
      const targetTingkat = source.tingkat + 1;
      const targetKey = `${source.jurusan_id || 'general'}:${targetTingkat}`;
      const candidates = byJurusanTingkat[targetKey];

      if (candidates && candidates.length > 0) {
        const sourceSuffix = source.nama_kelas.replace(/^(X|XI|XII|10|11|12)\s*/i, '');
        const exactMatch = candidates.find(c => {
            const targetSuffix = c.nama_kelas.replace(/^(X|XI|XII|10|11|12)\s*/i, '');
            return targetSuffix === sourceSuffix;
        });
        if (exactMatch) {
            newMapping[source.id] = exactMatch.id;
        } else {
            newMapping[source.id] = candidates[0].id;
        }
      }
    });

    setMapping(prev => ({ ...prev, ...newMapping }));
  };

  const handleMappingChange = (sourceId: string, targetId: string) => {
    setMapping(prev => ({ ...prev, [sourceId]: targetId }));
  };

  const handleSubmit = () => {
    const result: ClassMapping[] = Object.entries(mapping).map(([from, to]) => ({
      fromKelasId: from,
      toKelasId: to
    }));
    onNext(result);
  };

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
      return a.nama_kelas.localeCompare(b.nama_kelas);
    });
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (managedClassId) {
      return sortedClasses.filter(c => c.id === managedClassId);
    }
    if (filterTingkat === 'all') return sortedClasses;
    return sortedClasses.filter(c => String(c.tingkat) === String(filterTingkat));
  }, [sortedClasses, filterTingkat, managedClassId]);

  const getTargetOptions = (source: Kelas) => {
    const targetTingkat = source.tingkat + 1;
    const sameJurusan = sortedClasses.filter(
      c => c.tingkat === targetTingkat && c.jurusan_id === source.jurusan_id
    );
    const candidates = sameJurusan.length > 0
      ? sameJurusan
      : sortedClasses.filter(c => c.tingkat === targetTingkat);
    return candidates.map(c => ({
      value: c.id,
      label: `${c.nama_kelas} (Tingkat ${c.tingkat})`
    }));
  };

  const tingkatOptions = useMemo(() => {
    const uniq = Array.from(new Set(sortedClasses.map(c => c.tingkat))).sort((a, b) => a - b);
    return [
      { value: 'all', label: 'SEMUA TINGKAT' },
      ...uniq.map(t => ({
        value: String(t),
        label: `TINGKAT ${t}`
      }))
    ];
  }, [sortedClasses]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Data Kelas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Filter size={24} />
           </div>
           <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Filter Pemetaan</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saring daftar kelas berdasarkan tingkat</p>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <SearchableSelect
              value={filterTingkat}
              onValueChange={setFilterTingkat}
              options={tingkatOptions}
              placeholder="Pilih Tingkat..."
              disabled={!!managedClassId}
              triggerClassName="h-11 font-black text-[10px] rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>
          <Button 
            variant="toolbarOutline" 
            size="toolbar" 
            onClick={() => autoMapClasses(classes)}
            className="rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Auto-Map
          </Button>
        </div>
      </div>

      {managedClassId && (
        <Alert className="bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-xl border-dashed">
          <div className="flex gap-3">
             <Info className="w-4 h-4 text-amber-600 mt-0.5" />
             <AlertDescription className="text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">
               Mode Terbatas: Anda hanya dapat melakukan pemetaan untuk kelas yang Anda ampu sebagai Wali Kelas.
             </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak ada kelas yang ditemukan</p>
          </div>
        ) : (
          filteredClasses.map((kelas) => (
            <SectionCard 
              key={kelas.id} 
              fullWidth
              className={`relative overflow-hidden transition-all duration-300 group ${
                mapping[kelas.id] 
                  ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50' 
                  : 'border-orange-100 dark:border-orange-900/20 bg-orange-50/10 dark:bg-orange-900/5'
              }`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${mapping[kelas.id] ? 'bg-blue-500' : 'bg-orange-500'}`} />

              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform duration-500">
                         <LayoutGrid size={20} />
                      </div>
                      <div>
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kelas Asal</h4>
                         <p className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">{kelas.nama_kelas}</p>
                      </div>
                   </div>
                   {!mapping[kelas.id] ? (
                     <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-black text-[9px] uppercase tracking-widest border-orange-200/50">BELUM DIATUR</Badge>
                   ) : (
                     <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center animate-in zoom-in duration-500">
                        <Check size={14} />
                     </div>
                   )}
                </div>

                <div className="flex flex-col items-center py-2 relative">
                   <div className="absolute w-full h-[1px] bg-slate-100 dark:bg-slate-800 -z-10" />
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-colors duration-300 ${mapping[kelas.id] ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                      <ArrowRight size={16} />
                   </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-blue-400 tracking-widest flex items-center gap-2">
                     Kelas Tujuan Baru <span className="text-rose-500">*</span>
                  </Label>
                  <SearchableSelect
                    value={mapping[kelas.id] || ''}
                    onValueChange={(val) => handleMappingChange(kelas.id, val)}
                    options={getTargetOptions(kelas)}
                    placeholder="Pilih Kelas Tujuan..."
                    triggerClassName={`h-11 font-black text-xs rounded-xl transition-all ${
                      mapping[kelas.id] 
                        ? 'border-slate-200 dark:border-slate-800 dark:bg-slate-950 shadow-inner' 
                        : 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-slate-950 focus:ring-orange-500/20'
                    }`}
                  />
                </div>
              </div>
            </SectionCard>
          ))
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="toolbarOutline"
          onClick={onBack}
          className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 dark:border-slate-800 w-full sm:w-auto"
        >
           <ArrowRight className="w-4 h-4 rotate-180" />
           Kembali
        </Button>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
           <div className="hidden sm:flex flex-col items-end mr-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Pemetaan</p>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{Object.keys(mapping).length} / {filteredClasses.length} Kelas</p>
           </div>
           <Button
            onClick={handleSubmit}
            className="h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
          >
            Peninjauan Preview
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransitionMapping;
