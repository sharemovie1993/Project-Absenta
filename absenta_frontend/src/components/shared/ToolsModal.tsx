import React from 'react';
import { Modal } from '../ui';
import { 
  Wrench, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  Camera, 
  PhoneCall, 
  ChevronRight,
  ShieldCheck,
  KeyRound
} from 'lucide-react';

export type ToolKey = 'analysis' | 'generateCode' | 'rfidPairing' | 'photoStudio' | 'waNormalize' | 'bulkPassword';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'siswa' | 'guru';
  onSelectTool: (toolKey: ToolKey) => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  targetType,
  onSelectTool,
}) => {
  const isSiswa = targetType === 'siswa';

  const tools = [
    {
      key: 'bulkPassword' as ToolKey,
      title: isSiswa ? 'Reset Password Massal (NISN)' : 'Reset Password Massal (NIP)',
      description: isSiswa 
        ? 'Generate / reset password akun siswa massal dari NISN/NIS & buat akun User otomatis.'
        : 'Generate / reset password akun guru massal dari NIP & buat akun User otomatis.',
      icon: KeyRound,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/20',
      badge: 'Keamanan',
    },
    {
      key: 'analysis' as ToolKey,
      title: isSiswa ? 'Analisis Data Siswa' : 'Analisis Data NIP Guru',
      description: 'Pemeriksaan integritas data, kelengkapan profil, & deteksi nomor duplikat.',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/20',
      badge: 'Analisis',
    },
    {
      key: 'generateCode' as ToolKey,
      title: isSiswa ? 'Generate NIS' : 'Generate NIP Guru',
      description: isSiswa 
        ? 'Wizard penjanaan Nomor Induk Siswa (NIS) otomatis berbasis tahun & format sekolah.'
        : 'Penjanaan dan pemutakhiran NIP Guru secara otomatis.',
      icon: Sparkles,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20 dark:bg-violet-500/20',
      badge: 'Otomatis',
    },
    {
      key: 'rfidPairing' as ToolKey,
      title: 'Pairing RFID Express',
      description: 'Hubungkan dan daftarkan nomor kartu RFID secara cepat menggunakan tap reader.',
      icon: Zap,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/20',
      badge: 'Express',
    },
    {
      key: 'photoStudio' as ToolKey,
      title: 'Foto Massal (Studio)',
      description: 'Manajemen, pratinjau, dan unggah foto pas/studio anggota sekaligus.',
      icon: Camera,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/20',
      badge: 'Media',
    },
    {
      key: 'waNormalize' as ToolKey,
      title: 'Normalisasi No WA',
      description: isSiswa
        ? 'Format ulang & rapikan nomor WhatsApp siswa serta orang tua secara massal (+62 / 62 -> 08xxx).'
        : 'Format ulang & rapikan nomor WhatsApp guru secara massal (+62 / 62 -> 08xxx).',
      icon: PhoneCall,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20 dark:bg-teal-500/20',
      badge: 'Baru',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSiswa ? 'Tools & Utilitas Siswa' : 'Tools & Utilitas Guru'}
      size="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Pusat Utilitas & Pemrosesan Massal
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Pilih fitur utilitas yang ingin dijalankan pada direktori {isSiswa ? 'siswa' : 'guru'}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                onClick={() => {
                  onClose();
                  onSelectTool(tool.key);
                }}
                className="group relative flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-2xl text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tool.title}
                      </h4>
                      <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center shrink-0 transition-all ml-3">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Integrasi Cache Invalidation Aktif
          </span>
          <span className="italic">Absenta Academic Engine</span>
        </div>
      </div>
    </Modal>
  );
};
