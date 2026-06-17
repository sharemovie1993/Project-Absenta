import React from 'react';
import { Card, SearchableSelect } from '@/components/ui';
import { Search, ChevronRight, HelpCircle, RefreshCw } from 'lucide-react';
import SupportStatusBadge from './SupportStatusBadge';
import SupportPriorityBadge from './SupportPriorityBadge';
import { type SupportTicket, getCategoryLabel } from '../../api/support-ticket.api';

interface SupportTicketSidebarProps {
  filteredTickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  unreadTicketIds: Set<string>;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  onSelectTicket: (id: string) => void;
}

export const SupportTicketSidebar: React.FC<SupportTicketSidebarProps> = ({
  filteredTickets,
  selectedTicket,
  unreadTicketIds,
  isLoading,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  onSelectTicket
}) => {
  return (
    <div className="lg:col-span-5 flex flex-col space-y-4">
      <Card className="flex flex-col space-y-3 p-4">
        {/* Search Input */}
        <div className="relative">
          <label htmlFor="sidebar_search_ticket" className="sr-only">Cari Tiket</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="sidebar_search_ticket"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nomor tiket atau judul..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all duration-200"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="flex flex-col space-y-1">
            <label htmlFor="sidebar_filter_status" className="text-[10px] text-slate-400 uppercase">Status</label>
            <SearchableSelect
              options={[
                { label: 'Semua Status', value: 'ALL' },
                { label: 'OPEN', value: 'OPEN' },
                { label: 'IN PROGRESS', value: 'IN_PROGRESS' },
                { label: 'PENDING CUSTOMER', value: 'PENDING_CUSTOMER' },
                { label: 'TERATASI', value: 'RESOLVED' },
                { label: 'DITUTUP', value: 'CLOSED' }
              ]}
              value={filterStatus}
              onValueChange={(val: string) => setFilterStatus(val)}
              placeholder="Semua Status"
            />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label htmlFor="sidebar_filter_category" className="text-[10px] text-slate-400 uppercase">Kategori</label>
            <SearchableSelect
              options={[
                { label: 'Semua Kategori', value: 'ALL' },
                { label: 'Tagihan & Billing', value: 'BILLING' },
                { label: 'Kendala Bug/Sistem', value: 'TECHNICAL' },
                { label: 'Mesin Sensor Gerbang', value: 'DEVICE_HARDWARE' },
                { label: 'Request Fitur Baru', value: 'FEATURE_REQUEST' },
                { label: 'Lainnya', value: 'OTHER' }
              ]}
              value={filterCategory}
              onValueChange={(val: string) => setFilterCategory(val)}
              placeholder="Semua Kategori"
            />
          </div>
        </div>
      </Card>

      {/* Scrollable list card */}
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Tiket Terdaftar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-605 dark:text-slate-350 font-extrabold">{filteredTickets.length}</span>
        </div>

        <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-50 dark:divide-slate-800 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-semibold">Memuat aduan...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3 px-6 text-center">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                <HelpCircle size={24} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak Ada Tiket</h3>
                <p className="text-xs text-slate-400 mt-1">Belum ada tiket bantuan yang terdaftar berdasarkan penyaringan filter Anda.</p>
              </div>
            </div>
          ) : (
            filteredTickets.map(t => {
              const isSelected = selectedTicket?.id === t.id;
              const isUnread = unreadTicketIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTicket(t.id)}
                  className={`w-full text-left p-4 flex items-start space-x-3 transition-all duration-200 relative ${
                    isSelected 
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-l-4 border-indigo-600 pl-3' 
                      : isUnread
                        ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 border-l-4 border-amber-500 pl-3'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded uppercase tracking-wider">{t.ticket_number}</span>
                        {isUnread && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-duration-1000" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    
                    <h4 className={`text-xs font-bold line-clamp-1 ${isUnread ? 'text-amber-950 dark:text-amber-300 font-black' : 'text-slate-800 dark:text-slate-200'}`}>{t.title}</h4>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <SupportStatusBadge status={t.status} />
                      <SupportPriorityBadge priority={t.priority} />
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 mt-2 self-start" />
                </button>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
