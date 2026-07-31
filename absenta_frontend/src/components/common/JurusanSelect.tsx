import React, { useMemo } from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useJurusanOptions } from '../../hooks/useJurusanOptions';

export interface JurusanSelectProps {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Daftar ID jurusan yang dikecualikan dari pilihan */
  excludeIds?: string[];
}

export const JurusanSelect: React.FC<JurusanSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Jurusan / Konsentrasi --',
  searchPlaceholder = 'Ketik Nama / Kode Jurusan...',
  disabled = false,
  clearable = false,
  className,
  triggerClassName,
  excludeIds
}) => {
  const { options, isLoading } = useJurusanOptions();

  const filteredOptions = useMemo(() => {
    if (!excludeIds || excludeIds.length === 0) return options;
    return options.filter(opt => !excludeIds.includes(opt.value as string));
  }, [options, excludeIds]);

  return (
    <SearchableSelect
      id={id}
      value={value}
      onValueChange={onValueChange}
      options={filteredOptions}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      isLoading={isLoading}
      disabled={disabled}
      clearable={clearable}
      className={className}
      triggerClassName={triggerClassName}
    />
  );
};
