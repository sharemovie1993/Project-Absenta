import React, { useCallback, useState } from 'react';
import { Check, PenTool } from 'lucide-react';

export type CoopSignatureSlot = 'left' | 'center' | 'right' | 'bottom';

export interface CoopSignatureToggleItem {
  slot: CoopSignatureSlot;
  label: string;
  isKepsek?: boolean;
  defaultEnabled?: boolean;
}

export type CoopSignatureVisibility = Record<CoopSignatureSlot, boolean>;

export function useCoopSignatureToggles(items: CoopSignatureToggleItem[]) {
  const getInitial = (): CoopSignatureVisibility => {
    const state: CoopSignatureVisibility = {
      left: true,
      center: true,
      right: true,
      bottom: true,
    };
    items.forEach((item) => {
      if (item.defaultEnabled !== undefined) {
        state[item.slot] = item.defaultEnabled;
      }
    });
    return state;
  };

  const [visibility, setVisibility] = useState<CoopSignatureVisibility>(getInitial);

  const toggle = useCallback((slot: CoopSignatureSlot) => {
    setVisibility((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }, []);

  return { visibility, toggle, setVisibility };
}

export interface CoopSignatureToggleBarProps {
  items: CoopSignatureToggleItem[];
  visibility: CoopSignatureVisibility;
  onToggle: (slot: CoopSignatureSlot) => void;
  className?: string;
}

export const CoopSignatureToggleBar: React.FC<CoopSignatureToggleBarProps> = ({
  items,
  visibility,
  onToggle,
  className = '',
}) => {
  return (
    <div
      className={`print:hidden flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 mr-1">
        <PenTool size={13} className="text-slate-500" />
        Tampilkan TTD:
      </span>
      {items.map((item) => {
        const active = visibility[item.slot];
        return (
          <button
            key={item.slot}
            type="button"
            onClick={() => onToggle(item.slot)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer select-none ${
              active
                ? item.isKepsek
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                active
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-slate-100 border-slate-300 text-transparent'
              }`}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
