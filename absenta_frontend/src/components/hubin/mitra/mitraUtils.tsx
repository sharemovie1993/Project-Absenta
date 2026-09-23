import React from 'react';
import type { JurusanItem } from './types';

export function getWhatsAppUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  const formatted = cleaned.startsWith('0') ? '62' + cleaned.substring(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
  return `https://wa.me/${formatted}`;
}

export function renderJurusanBadges(
  raw?: string | null,
  jurusanList: JurusanItem[] = []
): React.ReactNode {
  if (!raw) return null;
  let list: string[] = [];
  try {
    if (raw.startsWith('[')) {
      list = JSON.parse(raw);
    } else {
      list = raw.split(',')?.map(s => s.trim())?.filter(Boolean) || [];
    }
  } catch {
    list = raw.split(',')?.map(s => s.trim())?.filter(Boolean) || [];
  }
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.slice(0, 3)?.map((item, idx) => {
        const j = jurusanList.find(x => x.id === item || x.kode === item || x.nama_jurusan === item);
        const label = j ? (j.kode || j.nama_jurusan) : item;
        return (
          <span 
            key={idx} 
            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40"
          >
            {label}
          </span>
        );
      })}
      {list.length > 3 && (
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          +{list.length - 3}
        </span>
      )}
    </div>
  );
}
