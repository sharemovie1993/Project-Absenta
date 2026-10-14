import React from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import { Clock, Plus, ExternalLink } from 'lucide-react';
import type { CoopAgendaItem, CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatAgendaSectionProps {
  agendas: CoopAgendaItem[];
  resolutions: CoopResolutionItem[];
  canManage: boolean;
  onOpenAddResolution: () => void;
}

export const RatAgendaSection: React.FC<RatAgendaSectionProps> = React.memo(({
  agendas,
  resolutions,
  canManage,
  onOpenAddResolution
}) => {
  return (
    <div className="space-y-6">
      <SectionCard title="Jadwal Acara & Tata Tertib Sidang">
        {(agendas || []).length > 0 ? (
          <div className="space-y-3">
            {(agendas || []).map((agenda, idx) => (
              <div
                key={agenda.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {agenda.title}
                    </h4>
                    <Badge variant={agenda.status === 'COMPLETED' ? 'success' : agenda.status === 'IN_PROGRESS' ? 'primary' : 'default'}>
                      {agenda.status}
                    </Badge>
                  </div>
                  {agenda.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {agenda.description}
                    </p>
                  )}
                  {agenda.durationMinutes && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                      <Clock className="w-3 h-3" />
                      Alokasi waktu: {agenda.durationMinutes} menit
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            Belum ada butir acara yang diagendakan.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Daftar Surat Ketetapan Resmi Sidang (TAP RAT)"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Seluruh ketetapan yang telah disepakati oleh anggota berstatus mengikat kepengurusan koperasi.
          </p>
          {canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarOutline"
              onClick={onOpenAddResolution}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Ketetapan
            </Button>
          )}
        </div>

        {(resolutions || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(resolutions || []).map((res) => (
              <div
                key={res.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                    {res.resolutionNo}
                  </span>
                  <Badge variant={res.status === 'PASSED' ? 'success' : res.status === 'AMENDED' ? 'warning' : 'danger'}>
                    {res.status === 'PASSED' ? 'Disahkan' : res.status === 'AMENDED' ? 'Dengan Catatan' : 'Ditolak'}
                  </Badge>
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {res.subject}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {res.summary}
                </p>
                {res.documentUrl && (
                  <a
                    href={res.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Unduh Salinan SK Risalah
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            Belum ada ketetapan resmi yang dicatatkan pada sidang ini.
          </div>
        )}
      </SectionCard>
    </div>
  );
});

RatAgendaSection.displayName = 'RatAgendaSection';
