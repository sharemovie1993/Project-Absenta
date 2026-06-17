import React from 'react';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { Button, Loader, EnhancedAlert } from '../../components/ui';
import { Badge } from '../../components/ui/Badge';
import type { SubscriptionHistoryItem } from '../../types/subscription';

type AuditItem = SubscriptionHistoryItem & {
  old_plan_name?: string | null;
  new_plan_name?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  changed_by_name?: string | null;
  changed_by_email?: string | null;
};

interface SubscriptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  historyItems: AuditItem[];
  historyLoading: boolean;
  historyError: string | null;
  onDismissError: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s));
  } catch {
    return s || '-';
  }
}

function fmtDateTime(s?: string | null) {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s || '-';
  }
}

function shortId(s?: string | null) {
  if (!s) return '-';
  const str = String(s);
  return str.length <= 12 ? str : `${str.slice(0, 8)}…${str.slice(-4)}`;
}

function displayActor(name?: string | null, email?: string | null, id?: string | null) {
  const actor = String(name || email || shortId(id)).trim();
  if (!actor || actor === '-' || actor === 'undefined') return 'System';
  return actor;
}

function labelByReason(s?: string | null) {
  const m: Record<string, string> = {
    INITIAL_ACTIVATION: 'Aktivasi Awal',
    STATUS_CHANGE: 'Perubahan Status',
    PLAN_CHANGE: 'Perubahan Paket',
    AUTO_RENEWAL: 'Perpanjangan Otomatis',
    CANCELLATION: 'Pembatalan',
    EXPIRE: 'Kedaluwarsa',
  };
  return s ? (m[s] || s) : '-';
}

function badgeVariantByReason(s?: string | null): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' {
  switch (s) {
    case 'INITIAL_ACTIVATION': return 'success';
    case 'STATUS_CHANGE': return 'info';
    case 'PLAN_CHANGE': return 'secondary';
    case 'AUTO_RENEWAL': return 'warning';
    case 'CANCELLATION':
    case 'EXPIRE': return 'destructive';
    default: return 'default';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SubscriptionHistoryModal: React.FC<SubscriptionHistoryModalProps> = ({
  isOpen,
  onClose,
  subscriptionId,
  historyItems,
  historyLoading,
  historyError,
  onDismissError,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat Subscription ${subscriptionId || ''}`}
      size="lg"
    >
      {historyLoading && <Loader text="Memuat riwayat..." />}
      {historyError && (
        <EnhancedAlert
          variant="destructive"
          title="Terjadi kesalahan"
          description={historyError}
          dismissible
          onDismiss={onDismissError}
        />
      )}
      <div className="space-y-3 max-h-[60vh] overflow-auto">
        {historyItems.length === 0 && !historyLoading ? (
          <div className="text-sm text-gray-500">Tidak ada riwayat perubahan.</div>
        ) : (
          historyItems?.map((h, idx) => (
            <div key={idx} className="p-3 border rounded-md">
              <div className="flex items-center justify-between">
                <div className="font-medium">{fmtDateTime(h.changed_at)}</div>
                <Badge variant={badgeVariantByReason(h.reason)}>{labelByReason(h.reason)}</Badge>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Paket:</span>
                  <Badge variant="secondary">
                    {(h as unknown as Record<string, unknown>)['old_plan_name'] as string || h.plan_name || '—'}
                  </Badge>
                  <span className="text-gray-500">→</span>
                  <Badge variant="secondary">
                    {(h as unknown as Record<string, unknown>)['new_plan_name'] as string || h.plan_name || '—'}
                  </Badge>
                </div>
                {(h.old_plan_id || h.new_plan_id) ? (
                  <div className="text-xs text-muted-foreground">({h.old_plan_id || '-'} → {h.new_plan_id || '-'})</div>
                ) : null}
                <div className="mt-1">
                  Diubah oleh: {(() => {
                    const x = h as unknown as Record<string, unknown>;
                    return displayActor(x['changed_by_name'] as string | undefined, x['changed_by_email'] as string | undefined, h.changed_by);
                  })()}
                </div>
                {(h.start_date || h.end_date) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="whitespace-nowrap">
                      Periode: {fmtDate(h.start_date)}{h.end_date ? ` s/d ${fmtDate(h.end_date)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Tutup</Button>
      </ModalFooter>
    </Modal>
  );
};
