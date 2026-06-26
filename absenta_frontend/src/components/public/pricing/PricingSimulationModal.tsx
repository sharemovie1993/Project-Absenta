import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, X, Server } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/api/plans.api';

interface PricingSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  simStudents: number;
  setSimStudents: (val: number) => void;
  simModel: 'TIERED' | 'ACTIVE' | 'DEDICATED';
  setSimModel: (val: 'TIERED' | 'ACTIVE' | 'DEDICATED') => void;
  onSelectPlan: () => void;
  onContactSales: () => void;
  calculateSimulation: () => number;
}

export const PricingSimulationModal: React.FC<PricingSimulationModalProps> = ({
  isOpen,
  onClose,
  simStudents,
  setSimStudents,
  simModel,
  setSimModel,
  onSelectPlan,
  onContactSales,
  calculateSimulation
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Simulasi Enterprise</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sesuaikan kapasitas sekolah Anda.</p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-400"
                  aria-label="Tutup simulasi"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'TIERED', label: 'Tiered', sub: 'Per Blok Siswa' },
                    { id: 'ACTIVE', label: 'Active', sub: 'Per User Aktif' },
                    { id: 'DEDICATED', label: 'Dedicated', sub: 'Private Server' }
                  ].map(model => (
                    <button
                      key={model.id}
                      onClick={() => setSimModel(model.id as any)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all group ${
                        simModel === model.id 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                      }`}
                    >
                      <div className={`text-xs font-black uppercase tracking-widest mb-1 ${simModel === model.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{model.label}</div>
                      <div className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">{model.sub}</div>
                    </button>
                  ))}
                </div>

                {simModel !== 'DEDICATED' ? (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <label htmlFor="sim-students-range" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Kapasitas Siswa</label>
                        <div className="text-3xl font-black text-blue-600 tracking-tighter">{simStudents.toLocaleString()} <span className="text-sm uppercase ml-1">Siswa</span></div>
                      </div>
                      <input 
                        id="sim-students-range"
                        type="range" min="1000" max="10000" step="100"
                        value={simStudents} onChange={(e) => setSimStudents(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6"
                      />
                    </div>

                    <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimasi Harga</div>
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                          {formatCurrency(calculateSimulation())}
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-3">/ BLN</span>
                        </div>
                      </div>
                      <Button size="lg" onClick={onSelectPlan} className="w-full md:w-auto px-10 py-6 h-auto rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">
                        Lanjutkan Registrasi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-purple-50 dark:bg-purple-900/10 rounded-[2.5rem] border border-purple-100 dark:border-purple-900/30">
                    <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 mx-auto mb-8 shadow-inner">
                      <Server size={44} />
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight mb-3">Private & Dedicated Cluster</h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-10 max-w-xs mx-auto uppercase tracking-tight leading-relaxed">Model ini memerlukan asistensi teknis langsung untuk menentukan spesifikasi hardware dan isolasi data.</p>
                    <Button size="lg" onClick={onContactSales} variant="primary" className="rounded-xl bg-purple-600 hover:bg-purple-700 w-full md:w-auto px-12 py-5 h-auto text-xs font-black uppercase tracking-widest">
                      Konsultasi via WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
