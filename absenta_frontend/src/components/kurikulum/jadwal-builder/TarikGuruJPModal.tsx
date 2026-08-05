import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  MessageSquare, 
  Filter, 
  Clock, 
  Users, 
  Download,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button, Badge } from '../../ui';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import { toast } from 'react-hot-toast';

interface TarikGuruJPModalProps {
  isOpen: boolean;
  onClose: () => void;
  allJadwal: any[];
  classes: any[];
  gurus: any[];
}

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const TINGKAT_OPTIONS = [
  { value: 'SEMUA', label: 'Semua Tingkat' },
  { value: 'X', label: 'Kelas X (10)' },
  { value: 'XI', label: 'Kelas XI (11)' },
  { value: 'XII', label: 'Kelas XII (12)' }
];

export const TarikGuruJPModal: React.FC<TarikGuruJPModalProps> = ({
  isOpen,
  onClose,
  allJadwal,
  classes,
  gurus,
}) => {
  // Determine current day in Indonesian
  const defaultHari = useMemo(() => {
    const daysMap = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const currentDay = daysMap[new Date().getDay()];
    return HARI_OPTIONS.includes(currentDay) ? currentDay : 'SENIN';
  }, []);

  // Form State
  const [selectedHari, setSelectedHari] = useState<string>(defaultHari);
  const [selectedTingkat, setSelectedTingkat] = useState<string>('XI');
  const [startJP, setStartJP] = useState<number>(1);
  const [endJP, setEndJP] = useState<number>(5);
  const [senderName, setSenderName] = useState<string>('Wahyu Tamim Pak KEPSEK');
  const [customIntro, setCustomIntro] = useState<string>(
    'Bapak ibu mohon izin untuk menyampaikan daftar nama guru yang mengajar di kelas XI pada jam Ke 1 - 5 utk bisa hadir di apel pagi utk memberikan contoh dan motivasi terhadap siswa/i kita.'
  );
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Jurusan Master List for accurate naming
  const { data: jurusanRes } = useQuery({
    queryKey: ['jurusan-master-tarik-guru'],
    queryFn: () => getJurusanList(1, 100).catch(() => null),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  const jurusanMap = useMemo(() => {
    const map = new Map<string, any>();
    if (jurusanRes?.data && Array.isArray(jurusanRes.data)) {
      jurusanRes.data.forEach((j: any) => {
        if (j.id) map.set(j.id, j);
      });
    }
    return map;
  }, [jurusanRes]);

  const classMap = useMemo(() => {
    const map = new Map<string, any>();
    (classes || []).forEach((c: any) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [classes]);

  // Update default custom intro text whenever parameters change
  const handleParamChange = (tingkat: string, start: number, end: number) => {
    const tingkatLabel = tingkat === 'SEMUA' ? 'semua kelas' : `kelas ${tingkat}`;
    setCustomIntro(
      `Bapak ibu mohon izin untuk menyampaikan daftar nama guru yang mengajar di ${tingkatLabel} pada jam Ke ${start} - ${end} utk bisa hadir di apel pagi utk memberikan contoh dan motivasi terhadap siswa/i kita.`
    );
  };

  // Grouping Logic
  const groupedResult = useMemo(() => {
    if (!isOpen) return new Map<string, Set<string>>();

    const normHari = selectedHari.trim().toUpperCase();
    const result = new Map<string, Set<string>>();

    // Filter schedules matching Day & JP Slot Range
    const matchingSchedules = (allJadwal || []).filter((j: any) => {
      const dayMatch = String(j.hari || '').trim().toUpperCase() === normHari;
      const slotNum = Number(j.slot_index);
      const slotMatch = !isNaN(slotNum) && slotNum >= startJP && slotNum <= endJP;
      return dayMatch && slotMatch;
    });

    matchingSchedules.forEach((item: any) => {
      // Filter Class Level if selected
      const cls = classMap.get(item.kelas_id) || item.Kelas;
      if (selectedTingkat !== 'SEMUA') {
        const clsTingkat = String(cls?.tingkat || '').trim().toUpperCase();
        const clsName = String(cls?.nama_kelas || '').trim().toUpperCase();
        const targetTingkat = selectedTingkat.toUpperCase();

        const matchesTingkat = 
          clsTingkat === targetTingkat ||
          clsTingkat === (targetTingkat === 'X' ? '10' : targetTingkat === 'XI' ? '11' : '12') ||
          clsName.startsWith(targetTingkat) ||
          clsName.startsWith(targetTingkat === 'X' ? '10' : targetTingkat === 'XI' ? '11' : '12');

        if (!matchesTingkat) return;
      }

      // Teacher Name
      const teacherName = item.Guru?.nama_guru || item.Guru?.User?.full_name;
      if (!teacherName || teacherName.trim() === '' || teacherName.toLowerCase().includes('tanpa nama')) {
        return;
      }

      // Derive Jurusan Name
      let jurusanName = '';
      if (cls?.Jurusan?.nama_jurusan) {
        jurusanName = cls.Jurusan.nama_jurusan;
      } else if (cls?.Jurusan?.singkatan) {
        jurusanName = cls.Jurusan.singkatan;
      } else if (cls?.Jurusan?.kode) {
        jurusanName = cls.Jurusan.kode;
      } else if (cls?.jurusan_id && jurusanMap.has(cls.jurusan_id)) {
        const jObj = jurusanMap.get(cls.jurusan_id);
        jurusanName = jObj.nama || jObj.singkatan || jObj.kode || 'Jurusan';
      } else {
        // Fallback: parse from class name (e.g., "XI AKL 1" -> "AKL")
        const classNameParts = String(cls?.nama_kelas || '').trim().split(/\s+/);
        if (classNameParts.length >= 2) {
          const token = classNameParts[1].toUpperCase();
          if (!['KBM', 'KELAS', 'RUANG'].includes(token)) {
            jurusanName = token;
          }
        }
      }

      if (!jurusanName) jurusanName = 'Umum / Lainnya';
      const groupKey = jurusanName.toUpperCase().startsWith('JURUSAN') 
        ? jurusanName 
        : `Jurusan ${jurusanName}`;

      if (!result.has(groupKey)) {
        result.set(groupKey, new Set<string>());
      }
      result.get(groupKey)!.add(teacherName.trim());
    });

    return result;
  }, [isOpen, selectedHari, selectedTingkat, startJP, endJP, allJadwal, classMap, jurusanMap]);

  // Construct Final Message Text
  const formattedBroadcastMessage = useMemo(() => {
    let text = `${senderName}\nAssalamualaikum wr wb ...\n${customIntro}\n\n`;

    if (groupedResult.size === 0) {
      text += `(Tidak ada jadwal guru yang ditemukan pada hari ${selectedHari} jam Ke ${startJP} - ${endJP})`;
      return text;
    }

    const sortedGroups = Array.from(groupedResult.keys()).sort((a, b) => a.localeCompare(b));

    sortedGroups.forEach(groupName => {
      text += `${groupName}\n`;
      const teacherSet = groupedResult.get(groupName);
      if (teacherSet && teacherSet.size > 0) {
        const teacherList = Array.from(teacherSet).sort((a, b) => a.localeCompare(b));
        teacherList.forEach((tName, idx) => {
          text += `${idx + 1}. ${tName}\n`;
        });
      }
      text += `\n`;
    });

    return text.trim();
  }, [senderName, customIntro, groupedResult, selectedHari, startJP, endJP]);

  // Copy Handler
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedBroadcastMessage);
    setCopied(true);
    toast.success('Pesan WhatsApp berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Share via WhatsApp Web Handler
  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(formattedBroadcastMessage);
    window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Tarik Guru Pada JP</span>
                <Badge variant="emerald" className="text-[10px] px-2 py-0.5 uppercase tracking-wide font-extrabold">
                  Chatbot Broadcast Generator
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ekstrak daftar nama guru yang mengajar di rentang Jam Pelajaran (JP) tertentu secara otomatis untuk diumumkan via WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Controls Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Parameter Filter</span>
              </h3>

              {/* Hari */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hari Target:</label>
                <select
                  value={selectedHari}
                  onChange={(e) => setSelectedHari(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {HARI_OPTIONS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Tingkat Kelas */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tingkat Kelas:</label>
                <select
                  value={selectedTingkat}
                  onChange={(e) => {
                    setSelectedTingkat(e.target.value);
                    handleParamChange(e.target.value, startJP, endJP);
                  }}
                  className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {TINGKAT_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Rentang JP */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Rentang Jam Pelajaran (JP):</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Jam Ke:</span>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={startJP}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setStartJP(val);
                        handleParamChange(selectedTingkat, val, endJP);
                      }}
                      className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">s/d Jam Ke:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={endJP}
                      onChange={(e) => {
                        const val = Math.max(startJP, parseInt(e.target.value) || 1);
                        setEndJP(val);
                        handleParamChange(selectedTingkat, startJP, val);
                      }}
                      className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Nama Pengirim Header */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pengirim / Judul Atas:</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Misal: Wahyu Tamim Pak KEPSEK"
                  className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Kata Pengantar Custom */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pesan Pengantar Custom:</label>
                <textarea
                  rows={3}
                  value={customIntro}
                  onChange={(e) => setCustomIntro(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Total Jurusan Terdeteksi:</span>
                </span>
                <span className="font-black text-sm">{groupedResult.size} Jurusan</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Broadcast Preview */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pratinjau Pesan WhatsApp</span>
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim via WA</span>
                </Button>
              </div>
            </div>

            {/* WhatsApp Chat Preview Card */}
            <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[440px] font-mono text-xs shadow-inner relative">
              <div className="bg-white dark:bg-[#111b21] p-4 rounded-xl shadow-md border border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-all">
                {formattedBroadcastMessage}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Format pesan kompatibel dengan WhatsApp Web, Desktop, dan Bot Broadcast Absenta.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold">
            Tutup
          </Button>
        </div>

      </div>
    </div>
  );
};
