import { useEffect, useRef, useState } from 'react';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const Icon = theme === 'light' ? Sun : Moon;
  const iconClass = theme === 'light' ? 'text-gray-700' : 'text-gray-200';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-blue-500"
        aria-label="Choose theme"
      >
        <Icon className={`w-5 h-5 ${iconClass}`} />
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 z-[1000]">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => { setTheme('light'); setOpen(false); }}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => { setTheme('dark-default'); setOpen(false); }}
          >
            <Moon className="w-4 h-4" /> Dark Default
          </button>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
