import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useSiswaOptions, UseSiswaOptionsParams } from '../../hooks/useSiswaOptions';

export interface SiswaSelectProps extends UseSiswaOptionsParams {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
}

export const SiswaSelect: React.FC<SiswaSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Siswa --',
  searchPlaceholder = 'Ketik Nama / NIS Siswa...',
  kelasId,
  onlyActive = true,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useSiswaOptions({ kelasId, onlyActive });

  return (
    <SearchableSelect
      id={id}
      value={value}
      onValueChange={onValueChange}
      options={options}
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
