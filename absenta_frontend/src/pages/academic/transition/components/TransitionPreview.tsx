import React, { useState, useEffect } from 'react';
import { SectionCard, Button, Alert, AlertDescription, Badge } from '../../../../components/ui';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { Users, GraduationCap, ArrowUpRight, School, UserMinus, AlertTriangle, CheckCircle2, History } from 'lucide-react';

interface PreviewData {
  total: number;
  byStatus: { NAIK: number; TINGGAL: number; PINDAH: number; LULUS: number };
  warnings: string[];
  items: Array<{ siswaId: string; namaSiswa: string; fromKelas: string; toKelas: string | null; status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' }>;
}

interface OverrideItem { siswaId: string; status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' }

interface Props {
  data: PreviewData;
  onNext: (overrides: OverrideItem[]) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'NAIK': return 'success';
    case 'LULUS': return 'success';
    case 'TINGGAL': return 'destructive';
    case 'PINDAH': return 'warning';
    default: return 'default';
  }
};

const TransitionPreview: React.FC<Props> = React.memo(({ data, onNext }) => {
  const [items, setItems] = useState(data.items);

  useEffect(() => {
    setItems(data.items);
  }, [data]);

  const handleStatusChange = (siswaId: string, newStatus: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS') => {
    setItems(prev => prev?.map(item => 
      item.siswaId === siswaId ? { ...item, status: newStatus } : item
    ));
  };

  const handleKonfirmasi = () => {
    // Generate overrides only for items that changed from original
    const overrides: OverrideItem[] = items
      .filter(item => {
        const original = data.items.find(d => d.siswaId === item.siswaId);
        return original && original.status !== item.status;
      })
      ?.map(item => ({ siswaId: item.siswaId, status: item.status }));
    
    onNext(overrides);
  };

  const isModified = (siswaId: string, currentStatus: string) => {
    const original = data.items.find(d => d.siswaId === siswaId);
    return original && original.status !== currentStatus;
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {data.warnings.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <Alert variant="warning" className="bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-xl p-5 border-dashed">
            <div className="flex gap-4">
               <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle size={20} />
               </div>
               <AlertDescription className="text-[12px] font-bold text-amber-900 dark:text-amber-400 leading-relaxed uppercase tracking-tight">
                 {data.warnings.length} peringatan terdeteksi dalam sistem. Harap periksa kembali pemetaan kelas dan status siswa sebelum melakukan eksekusi transisi.
               </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {/* Statistical Summary - Premium Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Siswa', val: data.total, icon: Users, color: 'blue' },
          { label: 'Naik Kelas', val: data.byStatus.NAIK, icon: ArrowUpRight, color: 'emerald' },
          { label: 'Tinggal Kelas', val: data.byStatus.TINGGAL, icon: History, color: 'rose' },
          { label: 'Pindah', val: data.byStatus.PINDAH, icon: UserMinus, color: 'amber' },
          { label: 'Lulus', val: data.byStatus.LULUS, icon: GraduationCap, color: 'indigo' },
        ]?.map((stat, i) => (
          <SectionCard 
            key={i} 
            fullWidth
            className="relative overflow-hidden transition-all duration-300 group"
          >
            <div className={`absolute top-0 left-0 w-full h-1 bg-${stat.color}-500`} />
            <div className="flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</h4>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none">{stat.val}</div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard 
        fullWidth
        className="animate-in fade-in slide-in-from-bottom-4 duration-700"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Rincian Peninjauan Siswa</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Verifikasi status individu sebelum konfirmasi</p>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="text-left bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Identitas Siswa</th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Periode Asal</th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Target Baru</th>
                <th className="py-4 px-6 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Status Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items?.map((item) => (
                <tr key={item.siswaId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{item.namaSiswa}</div>
                    {isModified(item.siswaId, item.status) && (
                      <Badge variant="warning" className="text-[9px] h-4 px-1.5 font-black mt-1 uppercase tracking-widest rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30">Modified</Badge>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 font-bold text-[11px] px-2.5">{item.fromKelas}</Badge>
                  </td>
                  <td className="py-4 px-6">
                    {item.toKelas ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-tight">
                         <ArrowUpRight className="w-4 h-4" />
                         {item.toKelas}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] font-medium uppercase tracking-tight">No Class Change</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <SearchableSelect aria-label="Pilih opsi transisi" value={item.status}
                      onValueChange={(val: any) => handleStatusChange(item.siswaId, val)}
                      options={[
                        { label: 'Naik Kelas', value: 'NAIK' },
                        { label: 'Tinggal Kelas', value: 'TINGGAL' },
                        { label: 'Lulus', value: 'LULUS' },
                        { label: 'Pindah', value: 'PINDAH' }
                      ]}
                      placeholder="Pilih Status"
                      triggerClassName={`h-10 w-[160px] font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                        isModified(item.siswaId, item.status) 
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/50' 
                          : 'border-slate-200 dark:border-slate-800 dark:bg-slate-950 shadow-inner'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex justify-center pt-8 animate-in fade-in zoom-in duration-700">
        <Button 
          onClick={handleKonfirmasi} 
          className="h-14 gap-3 font-black px-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95"
        >
           Konfirmasi & Lanjutkan Transisi
           <CheckCircle2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
});

export default TransitionPreview;
