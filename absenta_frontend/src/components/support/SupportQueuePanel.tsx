import React from 'react';
import { RefreshCw } from 'lucide-react';
import { 
  type SupportTicket, 
  type SupportTicketPriority, 
  type SupportTicketCategory 
} from '../../api/support-ticket.api';
import SupportStatusBadge from './SupportStatusBadge';
import SupportPriorityBadge from './SupportPriorityBadge';

export interface SupportQueuePanelProps {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  isLoading: boolean;
  unreadTicketCounts: Record<string, number>;
  currentAgent: any;
  fetchTicketDetail: (ticketId: string) => void;
  fetchTickets: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  countAll: number;
  countOpen: number;
  countHandling: number;
  countWaiting: number;
  countResolved: number;
  countClosed: number;
  filteredTickets: SupportTicket[];
}

export default function SupportQueuePanel({
  tickets,
  selectedTicket,
  isLoading,
  unreadTicketCounts,
  currentAgent,
  fetchTicketDetail,
  fetchTickets,
  searchQuery,
  setSearchQuery,
  filterPriority,
  setFilterPriority,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  countAll,
  countOpen,
  countHandling,
  countWaiting,
  countResolved,
  countClosed,
  filteredTickets
}: SupportQueuePanelProps) {
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchTickets();
    }
  };

  return (
    <div className="lg:col-span-4 flex flex-col space-y-4">
      {/* Box Filter & Pencarian */}
      <div className="bg-white rounded-xl p-4 shadow-xl border border-slate-100 flex flex-col space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="Cari & tekan Enter..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white border border-slate-200 transition-all duration-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="BILLING">Keuangan</option>
            <option value="TECHNICAL">Sistem</option>
            <option value="DEVICE_HARDWARE">Hardware</option>
            <option value="FEATURE_REQUEST">Fitur</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>
      </div>

      {/* List Antrean Tiket */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {/* Tabular Status Tab */}
        <div className="px-2 pt-2 pb-1.5 bg-slate-50/40 border-b border-slate-100 overflow-x-auto flex space-x-1 flex-shrink-0">
          {[
            { value: 'ALL', label: 'Semua', count: countAll, badgeColor: 'bg-slate-200 text-slate-700' },
            { value: 'OPEN', label: 'Baru', count: countOpen, badgeColor: 'bg-rose-500 text-white font-black animate-pulse' },
            { value: 'IN_PROGRESS', label: 'Handling', count: countHandling, badgeColor: 'bg-indigo-100 text-indigo-700 font-bold' },
            { value: 'PENDING_CUSTOMER', label: 'Waiting', count: countWaiting, badgeColor: 'bg-amber-100 text-amber-800' },
            { value: 'RESOLVED', label: 'Resolved', count: countResolved, badgeColor: 'bg-emerald-100 text-emerald-800' },
            { value: 'CLOSED', label: 'Closed', count: countClosed, badgeColor: 'bg-slate-100 text-slate-500' }
          ].map(tab => {
            const isActive = filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterStatus(tab.value)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                  isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${isActive ? 'bg-white text-indigo-700' : tab.badgeColor}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="animate-spin text-indigo-500 mb-2" size={24} />
              <span className="text-xs">Memuat aduan...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs px-6">
              Tidak ada tiket aduan pending.
            </div>
          ) : (
            filteredTickets.map(t => {
              const isSelected = selectedTicket?.id === t.id;
              const isAssignedToMe = t.assigned_to_id === currentAgent?.id;
              const unreadCount = unreadTicketCounts[t.id] || 0;
              return (
                <button
                  key={t.id}
                  onClick={() => fetchTicketDetail(t.id)}
                  className={`w-full text-left p-3.5 flex items-start justify-between border-l-4 transition-all ${
                    isSelected ? 'bg-indigo-50/50 border-indigo-600' : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-650 truncate pr-2">
                        {t.Tenant?.name || 'Sekolah'}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t.ticket_number}
                      </span>
                    </div>
                    <h4 className="text-xs leading-snug line-clamp-1 font-semibold text-slate-700">
                      {t.title}
                    </h4>
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <SupportPriorityBadge priority={t.priority} />
                        {filterStatus === 'ALL' && <SupportStatusBadge status={t.status} />}
                        {t.assigned_to_id ? (
                          isAssignedToMe ? (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-md">
                              Milik Anda
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200/40 rounded-md">
                              Ditangani Staf
                            </span>
                          )
                        ) : (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/50 rounded-md animate-pulse">
                            Belum Diklaim
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500 text-white font-black animate-bounce">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
