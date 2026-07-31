import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useWaliKelasOptions, UseWaliKelasOptionsParams } from '../../hooks/useWaliKelasOptions';

export interface WaliKelasSelectProps extends UseWaliKelasOptionsParams {
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

export const WaliKelasSelect: React.FC<WaliKelasSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Guru Wali Kelas --',
  searchPlaceholder = 'Ketik Nama Guru Wali Kelas / NIP / Kelas...',
  onlyActive = true,
  valueKey = 'guru_id',
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useWaliKelasOptions({ onlyActive, valueKey });

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
