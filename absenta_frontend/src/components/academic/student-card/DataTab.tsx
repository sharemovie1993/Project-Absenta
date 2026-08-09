import React from 'react';
import { 
    SectionCard, 
    Button, 
    Input, 
    Badge, 
    Checkbox
} from '@/components/ui';
import { 
    Search, 
    Users, 
    Loader2,
    GraduationCap,
    User,
    CreditCard
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface DataTabProps {
    isGuru: boolean;
    cardTargetMode: 'SISWA' | 'GURU';
    setCardTargetMode: (val: 'SISWA' | 'GURU') => void;
    selectedKelas: string;
    setSelectedKelas: (val: string) => void;
    kelasOptions: any[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedStudents: string[];
    siswaData: any;
    isLoadingSiswa: boolean;
    previewStudentId: string;
    setPreviewStudentId: (val: string) => void;
    toggleStudent: (id: string) => void;
    selectAll: () => void;
}

export const DataTab: React.FC<DataTabProps> = React.memo(({
    isGuru,
    cardTargetMode,
    setCardTargetMode,
    selectedKelas,
    setSelectedKelas,
    kelasOptions,
    searchQuery,
    setSearchQuery,
    selectedStudents,
    siswaData,
    isLoadingSiswa,
    previewStudentId,
    setPreviewStudentId,
    toggleStudent,
    selectAll
}) => {
    const isGuruMode = cardTargetMode === 'GURU';

    return (
        <div className="animate-in fade-in duration-500 space-y-4">

            {isGuru && !isGuruMode && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100/50 dark:border-blue-800/50 flex items-center shadow-sm">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-tight">Mode Penugasan</h4>
                        <p className="text-[11px] font-medium opacity-80">Silakan pilih kelas untuk memfilter daftar siswa yang akan dicetak kartunya.</p>
                    </div>
                </div>
            )}

            <SectionCard
                title={isGuruMode ? "Daftar Guru & Staf Pegawai" : "Daftar Siswa"}
                icon={isGuruMode ? User : Users}
                fullWidth
                className="shadow-sm border-slate-100 dark:border-slate-800"
                noPadding
            >
                <div className="border-b border-slate-50 dark:border-slate-800/50 p-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <Search size={18} className="text-slate-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider">Cari & Filter</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                    Database {isGuruMode ? 'Guru & Staf Pegawai' : 'Siswa Aktif'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {!isGuruMode && (
                                <SearchableSelect
                                    value={selectedKelas}
                                    onValueChange={setSelectedKelas}
                                    options={kelasOptions}
                                    placeholder="Pilih Kelas"
                                    searchPlaceholder="Cari Kelas..."
                                    triggerClassName="h-10 w-full md:w-[180px] rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            )}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={isGuruMode ? "Cari guru/NIP..." : "Cari siswa..."}
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                    className="h-10 pl-10 rounded-xl text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="px-6 py-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg px-2.5 py-1 text-[11px] font-black">
                                {selectedStudents.length}
                            </Badge>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                {isGuruMode ? 'PEGAWAI TERPILIH' : 'SISWA TERPILIH'}
                            </span>
                        </div>
                        <Button
                            variant="toolbarOutline"
                            size="xs"
                            onClick={selectAll}
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800"
                        >
                            {selectedStudents.length === (siswaData?.data?.length || 0) && (siswaData?.data?.length || 0) > 0 ? 'BATALKAN SEMUA' : 'PILIH SEMUA'}
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Premium Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-y border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <div className="col-span-1 flex justify-center">
                                    <Checkbox
                                        checked={selectedStudents.length > 0 && selectedStudents.length === (siswaData?.data?.length || 0)}
                                        onCheckedChange={selectAll}
                                    />
                                </div>
                                <div className="col-span-3">{isGuruMode ? 'NIP / NUPTK' : 'NIS / NISN'}</div>
                                <div className="col-span-5">{isGuruMode ? 'NAMA LENGKAP GURU & STAF' : 'NAMA LENGKAP SISWA'}</div>
                                <div className="col-span-3">{isGuruMode ? 'FUNGSI PTK / STATUS' : 'ROMBEL / KELAS'}</div>
                            </div>

                            {/* Table Body */}
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                {isLoadingSiswa ? (
                                    <div className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3 opacity-50" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</span>
                                    </div>
                                ) : siswaData?.data?.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Search className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                                        <p className="text-sm font-bold text-slate-400">
                                            Tidak ada {isGuruMode ? 'guru' : 'siswa'} ditemukan
                                        </p>
                                    </div>
                                ) : siswaData?.data?.map((s: any) => (
                                    <div
                                        key={s.id}
                                        className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 text-[13px] items-center transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 group cursor-pointer ${s.id === previewStudentId ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' :
                                                selectedStudents.includes(s.id) ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''
                                            }`}
                                        onClick={() => setPreviewStudentId(s.id)}
                                    >
                                        <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedStudents.includes(s.id)}
                                                onCheckedChange={() => toggleStudent(s.id)}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                                    {isGuruMode ? (s.nip || 'Tanpa NIP') : s.nis}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {isGuruMode ? (s.User?.email || '-') : s.nisn}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-5">
                                            <span className={`font-bold transition-colors ${s.id === previewStudentId ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {isGuruMode ? s.nama_guru : s.nama_siswa}
                                            </span>
                                        </div>
                                        <div className="col-span-3">
                                            <Badge variant="outline" className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                {isGuruMode ? (s.jenis_ptk === 'PENDIDIK' ? 'Guru' : 'Staf TU') : (s.kelas?.nama_kelas || s.Kelas?.nama_kelas || '-')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
});
