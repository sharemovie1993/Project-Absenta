import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SettingsGroupProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({ 
    title, 
    children, 
    defaultOpen = false 
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400">{title}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {isOpen && (
                <div className="p-4 space-y-4 bg-white dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800">
                    {children}
                </div>
            )}
        </div>
    );
};
