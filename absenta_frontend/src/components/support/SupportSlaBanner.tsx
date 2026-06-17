import React from 'react';
import { BarChart2 } from 'lucide-react';
import { type SupportAnalytics } from '../../api/support-ticket.api';

export interface SupportSlaBannerProps {
  analytics: SupportAnalytics | null;
}

export default function SupportSlaBanner({ analytics }: SupportSlaBannerProps) {
  if (!analytics) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 shadow-xl border border-slate-800 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* SLA Header & Metrics */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <BarChart2 className="text-indigo-400 animate-pulse" size={16} />
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Live SLA Performance Analytics</h4>
          </div>
          <p className="text-[10px] text-slate-400">Parameter kecepatan respons, efisiensi penanganan, dan kualitas layanan tim bantuan superadmin.</p>
        </div>

        {/* Metrics cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-3xl">
          {/* Metric 1 */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/60 flex flex-col justify-between">
            <span className="text-[8px] uppercase font-bold text-slate-400">Resolve Rate</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-base font-black text-indigo-300">
                {typeof analytics.resolve_rate === 'number' ? analytics.resolve_rate.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="w-full bg-slate-850 h-1 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${analytics.resolve_rate || 0}%` }} 
              />
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-8-0/60 flex flex-col justify-between">
            <span className="text-[8px] uppercase font-bold text-slate-400">Avg. First Response</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-base font-black text-amber-450">
                {typeof analytics.average_response_time_minutes === 'number' ? analytics.average_response_time_minutes.toFixed(1) : '0.0'}m
              </span>
            </div>
            <span className="text-[8px] text-slate-500 block mt-2">Target SLA: &lt; 15 menit</span>
          </div>

          {/* Metric 3 */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/60 flex flex-col justify-between">
            <span className="text-[8px] uppercase font-bold text-slate-400">Total Tiket</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-base font-black text-white">{analytics.total_tickets || 0}</span>
              <span className="text-[9px] text-slate-400">aduan</span>
            </div>
            <span className="text-[8px] text-indigo-400 font-bold block mt-2">100% Tercatat</span>
          </div>

          {/* Metric 4 */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/60 flex flex-col justify-between">
            <span className="text-[8px] uppercase font-bold text-slate-400">Beban Urgent / High</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-base font-black text-rose-450">
                {((analytics.priority_distribution?.HIGH || 0) + (analytics.priority_distribution?.URGENT || 0))}
              </span>
              <span className="text-[9px] text-slate-400">aktif</span>
            </div>
            <span className="text-[8px] text-rose-500 font-bold block mt-2">Prioritas Tinggi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
