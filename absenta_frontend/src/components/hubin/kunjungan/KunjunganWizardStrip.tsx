import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface WizardStepDef {
  id: number;
  label: string;
  icon: React.ElementType;
}

export interface KunjunganWizardStripProps {
  steps: WizardStepDef[];
  currentStep: number;
}

export const KunjunganWizardStrip: React.FC<KunjunganWizardStripProps> = ({ steps, currentStep }) => (
  <div className="flex items-center gap-0 w-full mb-3">
    {steps.map((s, idx) => {
      const Icon = s.icon;
      const done = currentStep > s.id;
      const active = currentStep === s.id;
      return (
        <React.Fragment key={s.id}>
          <div className={`flex flex-col items-center gap-0.5 ${active ? 'flex-1' : 'shrink-0'}`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active
                  ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
              }`}
            >
              {done ? <CheckCircle2 size={13} /> : <Icon size={12} />}
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                done
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${
                currentStep > s.id ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export default KunjunganWizardStrip;
