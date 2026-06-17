import React from 'react';
import { 
  Laptop, 
  AlertTriangle, 
  CreditCard, 
  AlertCircle, 
  Search, 
  BookOpen, 
  Activity, 
  ExternalLink,
  Star
} from 'lucide-react';
import { 
  type SupportTicket, 
  type SupportKnowledgeBase 
} from '../../api/support-ticket.api';

export interface SupportSidebarDiagnosticProps {
  selectedTicket: SupportTicket | null;
  rightPanelTab: 'DIAGNOSTIC' | 'KNOWLEDGE_BASE';
  setRightPanelTab: (tab: 'DIAGNOSTIC' | 'KNOWLEDGE_BASE') => void;
  kbSearchQuery: string;
  setKbSearchQuery: (query: string) => void;
  fetchKnowledgeBase: (query: string) => void;
  knowledgeBase: SupportKnowledgeBase[];
  handleAssistLogin: (id: string, name: string) => void;
}

export default function SupportSidebarDiagnostic({
  selectedTicket,
  rightPanelTab,
  setRightPanelTab,
  kbSearchQuery,
  setKbSearchQuery,
  fetchKnowledgeBase,
  knowledgeBase,
  handleAssistLogin
}: SupportSidebarDiagnosticProps) {
  return (
    <div className="lg:col-span-3 flex flex-col space-y-4">
      <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 shadow-2xl border border-slate-800 text-white min-h-[450px] flex flex-col justify-between">
        
        {/* Upper part */}
        <div className="space-y-5">
          
          {/* Header diagnostic / Tab Switcher */}
          <div className="flex items-center space-x-1 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setRightPanelTab('DIAGNOSTIC')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition-all duration-200 ${
                rightPanelTab === 'DIAGNOSTIC' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️ Diagnostik
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('KNOWLEDGE_BASE')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition-all duration-200 ${
                rightPanelTab === 'KNOWLEDGE_BASE' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📚 FAQ Staf
            </button>
          </div>

          {!selectedTicket ? (
            <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500 space-y-2">
              <Laptop size={28} className="text-slate-700" />
              <span className="text-[10px] font-bold">Pilih tiket aduan untuk memuat data diagnosa sekolah secara live.</span>
            </div>
          ) : rightPanelTab === 'DIAGNOSTIC' ? (
            !selectedTicket.Tenant ? (
              <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500 space-y-2">
                <AlertTriangle size={28} className="text-slate-700" />
                <span className="text-[10px] font-bold">Data Tenant (Sekolah) tidak dikaitkan ke tiket ini.</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs animate-fade-in">
                
                {/* Name & ID */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Nama Sekolah / Tenant</span>
                  <h4 className="font-extrabold text-slate-100 text-sm line-clamp-1">{selectedTicket.Tenant.name}</h4>
                  <span className="text-[9px] text-indigo-300 font-mono block bg-indigo-950/40 p-1.5 rounded border border-indigo-900/30 overflow-x-auto truncate">
                    ID: {selectedTicket.Tenant.id}
                  </span>
                </div>

                {/* Status & Health */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Status Operasional</span>
                  <div className="flex items-center space-x-2 pt-0.5">
                    {selectedTicket.Tenant.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ACTIVE / NORMAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        SUSPENDED
                      </span>
                    )}
                  </div>
                </div>

                {/* CSAT Rating */}
                {selectedTicket.rating && (
                  <div className="space-y-1 bg-amber-950/20 p-3 rounded-xl border border-amber-900/30">
                    <div className="flex items-center space-x-1.5 pb-1.5 border-b border-amber-900/20 text-[10px] font-bold text-amber-400">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span>EVALUASI LAYANAN (CSAT)</span>
                    </div>
                    <div className="pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-450">Nilai Kepuasan</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= (selectedTicket.rating || 0)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {selectedTicket.rating_comment && (
                        <div className="pt-1">
                          <span className="text-[8px] uppercase font-bold text-slate-500 block">Ulasan Sekolah:</span>
                          <p className="text-[9px] text-amber-300 italic font-medium leading-relaxed mt-0.5 whitespace-pre-wrap">
                            "{selectedTicket.rating_comment}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subscription Info */}
                <div className="space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                    <CreditCard size={12} className="text-indigo-400" />
                    <span>PAKET LANGGANAN</span>
                  </div>
                  <div className="pt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black text-indigo-300">
                        {selectedTicket.Tenant.subscription_package || 'PREMIUM PRO'}
                      </span>
                      <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 rounded">Active</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Tagihan Bulanan</span>
                      <span className="font-black text-slate-300">
                        {selectedTicket.Tenant.monthly_fee 
                          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedTicket.Tenant.monthly_fee)
                          : 'Rp 450,000'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Audit Check */}
                <div className="space-y-1 bg-rose-950/15 p-3 rounded-xl border border-rose-900/20">
                  <div className="flex items-center space-x-1.5 pb-1.5 border-b border-rose-900/20 text-[10px] font-bold text-rose-400">
                    <AlertCircle size={12} className="text-rose-400" />
                    <span>STATUS KEUANGAN</span>
                  </div>
                  <div className="pt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Tunggakan Invoice</span>
                    <span className={`font-black uppercase ${
                      selectedTicket.Tenant.invoice_status && selectedTicket.Tenant.invoice_status !== 'NIHIL / LUNAS'
                        ? 'text-rose-400'
                        : 'text-emerald-450'
                    }`}>
                      {selectedTicket.Tenant.invoice_status || 'NIHIL / LUNAS'}
                    </span>
                  </div>
                </div>

              </div>
            )
          ) : (
            /* 📚 KNOWLEDGE BASE MENU (FAQ) */
            <div className="space-y-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={11} />
                <input
                  type="text"
                  value={kbSearchQuery}
                  onChange={(e) => {
                    setKbSearchQuery(e.target.value);
                    fetchKnowledgeBase(e.target.value);
                  }}
                  placeholder="Cari panduan troubleshoot..."
                  className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-slate-800 text-[10px] font-semibold text-slate-200 focus:outline-none border border-slate-700 focus:border-indigo-500 transition-all duration-200"
                />
              </div>

              <div className="flex flex-col space-y-2.5 max-h-[230px] overflow-y-auto pr-1 scrollbar-thin">
                {knowledgeBase.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center font-bold py-6">
                    Panduan tidak ditemukan.
                  </div>
                ) : (
                  knowledgeBase.map((k) => (
                    <div key={k.id} className="bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-all">
                      <div className="font-extrabold text-[10px] text-indigo-300 mb-1 flex items-center space-x-1">
                        <BookOpen size={10} />
                        <span>{k.title}</span>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-relaxed whitespace-pre-wrap">{k.content}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {k.tags.map((tag, idx) => (
                          <span key={idx} className="text-[7px] bg-indigo-950 text-indigo-400 px-1 rounded font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Lower part - Live diagnostic metrics */}
        {selectedTicket && selectedTicket.Tenant && rightPanelTab === 'DIAGNOSTIC' && (
          <div className="border-t border-slate-850 pt-3.5 mt-4 space-y-2.5">
            <div className="flex items-center space-x-1">
              <Activity size={12} className="text-indigo-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Live System Metrics</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
              <div className="bg-slate-850/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-400 block mb-1">Ping Latency</span>
                <span className="text-slate-200 font-extrabold text-xs">
                  {selectedTicket.Tenant.ping_latency || '14 ms'}
                </span>
              </div>
              <div className="bg-slate-850/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-400 block mb-1">RFID Gateway</span>
                <span className={`font-black ${
                  selectedTicket.Tenant.rfid_status === 'OFFLINE' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {selectedTicket.Tenant.rfid_status || 'ONLINE'}
                </span>
              </div>
              <div className="bg-slate-850/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-400 block mb-1">Dapodik Sync</span>
                <span className="text-emerald-400 font-black">
                  {selectedTicket.Tenant.dapodik_status || '100% OK'}
                </span>
              </div>
              <div className="bg-slate-850/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between">
                <span className="text-slate-400 block mb-1">IP Blocklist</span>
                <span className="text-emerald-400 font-black">CLEAN</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Impersonate Trigger */}
        {selectedTicket && selectedTicket.Tenant && (
          <div className="pt-4 border-t border-slate-850">
            <button
              onClick={() => handleAssistLogin(selectedTicket.Tenant!.id, selectedTicket.Tenant!.name)}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 font-black text-xs text-white border border-indigo-500/30 transition-all duration-200"
            >
              <ExternalLink size={14} />
              <span>Impersonate Tenant</span>
            </button>
            <span className="text-[8px] text-slate-500 block text-center mt-2 leading-relaxed">
              Catatan: Masuk ke dasbor sekolah target untuk diagnosis internal. Anda dapat keluar dari mode bantuan kapan saja lewat banner atas.
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
