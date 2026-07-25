import React, { useMemo } from 'react';
import { CalendarDays, Clock, Trash2, Pencil } from 'lucide-react';
import { Button, Badge, SectionCard } from '../../ui';
import { cn } from '../../../lib/utils';
import { CalendarEvent } from './EventFormModal';
import { getJenisOption, JENIS_OPTIONS } from './constants';

interface EventListCardProps {
  events: CalendarEvent[];
  isLoading: boolean;
  canManage: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
  onClearAll: () => void;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (ev: CalendarEvent) => void;
  onEventClick: (ev: CalendarEvent) => void;
}

export const EventListCard: React.FC<EventListCardProps> = ({
  events,
  isLoading,
  canManage,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkDelete,
  onClearAll,
  onEdit,
  onDelete,
  onEventClick
}) => {
  const isAllSelected = useMemo(() => {
    return events.length > 0 && selectedIds.length === events.length;
  }, [events, selectedIds]);

  const eventListActions = useMemo(() => {
    if (!canManage || events.length === 0) return null;
    return (
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none">
          <input 
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            aria-label="Pilih semua event"
          />
          Pilih Semua
        </label>

        {selectedIds.length > 0 && (
          <Button 
            variant="danger" 
            size="sm" 
            onClick={onBulkDelete}
            className="flex items-center gap-1 text-[10px] font-bold h-7 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all"
          >
            <Trash2 size={11} />
            Hapus Terpilih ({selectedIds.length})
          </Button>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearAll}
          className="flex items-center gap-1 text-[10px] font-bold h-7 px-2.5 rounded-lg border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 shadow-sm transition-all"
        >
          <Trash2 size={11} />
          Hapus Semua
        </Button>
      </div>
    );
  }, [canManage, events, isAllSelected, selectedIds, onToggleSelectAll, onBulkDelete, onClearAll]);

  return (
    <SectionCard 
      title={`Daftar Event (${events.length})`}
      actions={eventListActions}
    >
      {isLoading ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 opacity-60">
          Memuat data kalender...
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400 opacity-60 flex flex-col items-center">
          <CalendarDays size={32} className="mb-2 opacity-40 text-slate-400" />
          <div className="font-medium text-sm">Belum ada event kalender.</div>
          {canManage && <div className="text-xs mt-0.5">Klik "Tambah Event" untuk mulai.</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events?.map(ev => {
            const j = getJenisOption(ev.jenis);
            const isSelected = selectedIds.includes(ev.id);
            return (
              <div 
                key={ev.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-100/30 dark:hover:bg-slate-900/80"
              >
                {canManage && (
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(ev.id)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    aria-label={`Pilih event ${ev.judul}`}
                  />
                )}
                <div 
                  className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", j.dotColorClass)} 
                />
                <div 
                  onClick={() => onEventClick(ev)}
                  className="flex-1 cursor-pointer group/item hover:translate-x-1 transition-all duration-200"
                  title="Klik untuk melihat tanggal di kalender"
                >
                  <div className="font-semibold text-[13px] text-slate-800 dark:text-slate-200 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                    {ev.judul}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock size={10} />
                    {new Date(ev.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} — {new Date(ev.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <Badge 
                  className={cn(
                    "border-none text-[10px] font-extrabold uppercase tracking-wider",
                    j.bgColorClass,
                    j.textColorClass
                  )}
                >
                  {j.label}
                </Badge>
                {canManage && (
                  <div className="flex gap-1.5 ml-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(ev)} 
                      aria-label={`Edit ${ev.judul}`}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(ev)} 
                      aria-label={`Hapus ${ev.judul}`}
                    >
                      <Trash2 size={13} className="text-red-500 hover:text-red-650" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

export default EventListCard;
