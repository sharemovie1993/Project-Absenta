import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Edit2, X, Loader } from 'lucide-react';

export interface QuickEditCellProps {
  value: string | null | undefined;
  placeholder?: string;
  onSave: (newValue: string) => Promise<void>;
  canEdit?: boolean;
  className?: string;
  type?: 'text' | 'tel';
  isMonospace?: boolean;
  tempBadgePrefix?: string;
}

export const QuickEditCell: React.FC<QuickEditCellProps> = React.memo(({
  value,
  placeholder = 'Kosong',
  onSave,
  canEdit = true,
  className = '',
  type = 'text',
  isMonospace = true,
  tempBadgePrefix = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = val.trim();
    if (trimmed === (value || '').trim()) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      // Error is handled in onSave caller via toast
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVal(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave(e);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className={cn(
            "h-7 px-2 text-xs border border-indigo-500 dark:border-indigo-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 shadow-xs",
            isMonospace && "font-mono font-bold"
          )}
        />
        {saving ? (
          <Loader className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
        ) : (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors"
              title="Simpan (Enter)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Batal (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  const rawValue = value ? String(value).trim() : '';
  const isTemp = tempBadgePrefix && rawValue.startsWith(tempBadgePrefix);

  return (
    <div 
      className={cn(
        "group inline-flex items-center gap-1.5 py-0.5 px-1.5 rounded-lg transition-all duration-150",
        canEdit && "cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:border-indigo-200/50",
        className
      )}
      onClick={(e) => {
        if (!canEdit) return;
        e.stopPropagation();
        setIsEditing(true);
      }}
      title={canEdit ? "Klik untuk edit cepat" : undefined}
    >
      <span className={cn(
        "text-xs",
        isMonospace && "font-mono font-medium",
        !rawValue && "text-slate-400 italic text-[11px]",
        isTemp && "text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60 text-[11px]"
      )}>
        {isTemp ? `${rawValue} (Sementara)` : (rawValue || placeholder)}
      </span>
      {canEdit && (
        <Edit2 className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-opacity opacity-0 group-hover:opacity-100 shrink-0" />
      )}
    </div>
  );
});
