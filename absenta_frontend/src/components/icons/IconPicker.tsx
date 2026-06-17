import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Label, Modal } from '@/components/ui';
import iconForName, { isValidIconName } from '@/lib/iconForName';
import { getIconNames } from '@/api/icon.api';
import { Reorder, motion, AnimatePresence } from 'framer-motion';

interface IconPickerProps {
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  onValidChange?: (valid: boolean) => void;
  placeholder?: string;
}

export function IconPicker({ label = 'Icon', value, onChange, onValidChange, placeholder = 'Cari icon...' }: IconPickerProps) {
  const [query, setQuery] = useState<string>(value ?? '');
  const [allIcons, setAllIcons] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openGrid, setOpenGrid] = useState<boolean>(false);
  const [isFocused, setFocused] = useState<boolean>(false);
  const [invalid, setInvalid] = useState<boolean>(false);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(query);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch available icon names via API
  useEffect(() => {
    let mounted = true;
    getIconNames().then(list => { if (mounted) setAllIcons(list); }).catch(() => setAllIcons([]));
    return () => { mounted = false; };
  }, []);

  // Debounce query updates (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Update suggestions when debouncedQuery changes
  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setInvalid(false);
      onValidChange?.(true);
      return;
    }
    const filtered = allIcons.filter(n => n.toLowerCase().includes(q)).slice(0, 10);
    setSuggestions(filtered);
    const valid = isValidIconName(debouncedQuery, allIcons);
    setInvalid(!valid);
    onValidChange?.(valid);
  }, [debouncedQuery, allIcons]);

  // Keep external value in sync
  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  const PreviewIcon = useMemo(() => iconForName(query || value), [query, value]);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectIcon = (name?: string) => {
    const val = name ?? '';
    setQuery(val);
    onChange(val || undefined);
    const valid = isValidIconName(val, allIcons);
    setInvalid(!valid);
    onValidChange?.(valid);
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label ? <Label>{label}</Label> : null}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onFocus={() => setFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-invalid={invalid}
          />
          {/* Suggestions dropdown */}
          <AnimatePresence>
            {isFocused && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow"
              >
                {suggestions.map((s) => (
                  <li
                    key={s}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onMouseDown={() => selectIcon(s)}
                  >
                    {s}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Live Preview */}
        <motion.div
          key={query}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        >
          <PreviewIcon size={22} />
        </motion.div>

        {/* Browse Grid Button */}
        <Button type="button" variant="outline" onClick={() => setOpenGrid(true)}>Browse</Button>

        {/* Clear */}
        <Button type="button" variant="ghost" onClick={() => selectIcon(undefined)}>Clear</Button>
      </div>

      {/* Error message */}
      {invalid ? (
        <p className="text-xs text-red-600 mt-1">Icon tidak valid. Pilih dari daftar.</p>
      ) : null}

      {/* Grid selector modal */}
      <Modal isOpen={openGrid} onClose={() => setOpenGrid(false)} title="Pilih Icon" size="lg">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {allIcons.map((name) => {
            const Icon = iconForName(name);
            const isActive = (value && name.toLowerCase() === (value ?? '').toLowerCase()) || (query && name.toLowerCase() === query.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                onClick={() => { selectIcon(name); setOpenGrid(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors ${
                  isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="text-gray-700 dark:text-gray-200" size={24} />
                <span className="text-[11px] truncate w-full">{name}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export default IconPicker;

