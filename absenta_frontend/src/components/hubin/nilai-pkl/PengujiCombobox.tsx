import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';
import { UserCheck, Edit3, Check, Users, Search, Loader2 } from 'lucide-react';

export interface GuruItem {
  id: string;
  nama_guru: string;
  nip?: string | null;
}

export interface PengujiComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  guruList?: GuruItem[];
  isLoadingGuru?: boolean;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md';
  onApplyToAll?: (namaPenguji: string) => void;
  'aria-label'?: string;
}

export const PengujiCombobox: React.FC<PengujiComboboxProps> = ({
  id,
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Nama penguji...',
  guruList = [],
  isLoadingGuru = false,
  className,
  inputClassName,
  size = 'sm',
  onApplyToAll,
  'aria-label': ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Sync internal input value with external value prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter list guru berdasarkan input ketikan
  const filteredGuruList = useMemo(() => {
    if (!inputValue || inputValue.trim() === '') {
      return guruList.slice(0, 50); // Batasi 50 teratas jika belum mengetik
    }
    const q = inputValue.toLowerCase().trim();
    return guruList
      .filter((g) => {
        const matchNama = (g.nama_guru || '').toLowerCase().includes(q);
        const matchNip = (g.nip || '').toLowerCase().includes(q);
        return matchNama || matchNip;
      })
      .slice(0, 50);
  }, [guruList, inputValue]);

  // Periksa apakah ketikan manual persis sama dengan salah satu nama guru
  const exactMatchGuru = useMemo(() => {
    const q = (inputValue || '').trim().toLowerCase();
    if (!q) return null;
    return guruList.find((g) => (g.nama_guru || '').trim().toLowerCase() === q);
  }, [guruList, inputValue]);

  // Recalculate posisi portal dropdown
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = 260;
      const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
        width: Math.max(rect.width, size === 'sm' ? 260 : 320),
        zIndex: 999999,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, size]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!target) return;

      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);

      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOption = (chosenName: string) => {
    setInputValue(chosenName);
    onChange(chosenName);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Bila enter, simpan teks saat ini dan tutup
      onChange(inputValue.trim());
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  const hasManualInput = inputValue.trim().length > 0;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled}
        placeholder={disabled ? 'Terkunci' : placeholder}
        value={disabled ? '' : inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        className={cn(
          'w-full transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 border',
          size === 'sm'
            ? 'text-[10px] h-6 rounded px-1.5'
            : 'text-xs h-10 rounded-xl px-3',
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
          inputClassName
        )}
      />

      {/* Portal Dropdown List */}
      {isOpen &&
        !disabled &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-200 animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* TAWARAN KETIK MANUAL PALING ATAS (Sesuai Permintaan User) */}
            {hasManualInput ? (
              <div className="bg-indigo-50/90 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900/60 p-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(inputValue.trim());
                  }}
                  className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 flex items-start gap-2 cursor-pointer transition-all shadow-2xs group"
                >
                  <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                      <span>Gunakan Ketikan Manual</span>
                      <span className="text-[9px] font-normal px-1 rounded bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-500">
                        Paling Atas
                      </span>
                    </div>
                    <div className="font-bold text-xs truncate text-slate-900 dark:text-white mt-0.5">
                      "{inputValue.trim()}"
                    </div>
                  </div>
                </button>

                {/* Tombol Terapkan Manual ke Semua Siswa */}
                {onApplyToAll && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApplyToAll(inputValue.trim());
                      setIsOpen(false);
                    }}
                    className="w-full mt-1.5 py-1 px-2 rounded-md text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-3 h-3 text-indigo-500" />
                    <span>Terapkan nama ini ke seluruh siswa</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Ketik nama penguji atau pilih dari daftar guru di bawah:</span>
              </div>
            )}

            {/* DAFTAR GURU TERINTEGRASI */}
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="px-3 py-1 bg-slate-50/80 dark:bg-slate-850 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0 backdrop-blur-xs flex items-center justify-between z-10">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-500" />
                  Daftar Guru ({filteredGuruList.length})
                </span>
                {isLoadingGuru && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
              </div>

              {filteredGuruList.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  Tidak ada guru yang cocok.
                  {hasManualInput && (
                    <div className="text-[10px] text-indigo-500 mt-1 not-italic font-semibold">
                      Gunakan opsi manual di atas.
                    </div>
                  )}
                </div>
              ) : (
                filteredGuruList.map((g) => {
                  const isSelected =
                    (value || '').trim().toLowerCase() === (g.nama_guru || '').trim().toLowerCase();

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(g.nama_guru);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer',
                        isSelected && 'bg-indigo-50/50 dark:bg-indigo-950/30 font-bold text-indigo-600 dark:text-indigo-400'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-slate-800 dark:text-slate-100 font-semibold text-[11px]">
                          {g.nama_guru}
                        </div>
                        {g.nip && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIP. {g.nip}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
export default PengujiCombobox;
