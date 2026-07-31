import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useKelasOptions, UseKelasOptionsParams } from '../../hooks/useKelasOptions';

export interface KelasSelectProps extends UseKelasOptionsParams {
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

export const KelasSelect: React.FC<KelasSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Rombel / Kelas --',
  searchPlaceholder = 'Ketik Nama / Tingkat Kelas...',
  onlyActive = true,
  jurusanId,
  tingkat,
  filterByJenjang = true,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useKelasOptions({ onlyActive, jurusanId, tingkat, filterByJenjang });

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
