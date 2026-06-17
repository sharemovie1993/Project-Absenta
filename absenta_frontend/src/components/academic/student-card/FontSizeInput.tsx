import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FontSizeInputProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
}

export const FontSizeInput: React.FC<FontSizeInputProps> = ({ 
    value, 
    onChange, 
    min = 4, 
    max = 72 
}) => {
    return (
        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl h-10 w-20 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <input 
                type="number" 
                value={value}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange(val);
                }}
                className="w-full h-full px-2 text-xs font-bold border-none focus:ring-0 text-center bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 h-full w-6 shrink-0 divide-y divide-slate-200 dark:divide-slate-800">
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 transition-colors"
                    onClick={() => value < max && onChange(value + 1)}
                    type="button"
                >
                    <ChevronUp className="w-3 h-3 text-slate-500" />
                </button>
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 transition-colors"
                    onClick={() => value > min && onChange(value - 1)}
                    type="button"
                >
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
            </div>
        </div>
    );
};
