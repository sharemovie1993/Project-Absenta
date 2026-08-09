import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useRuanganOptions } from '../../hooks/useRuanganOptions';

export interface RuanganSelectProps {
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

export const RuanganSelect: React.FC<RuanganSelectProps> = React.memo(({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Ruangan / Lokasi --',
  searchPlaceholder = 'Ketik Nama Ruangan...',
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useRuanganOptions();

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
});

export default RuanganSelect;
