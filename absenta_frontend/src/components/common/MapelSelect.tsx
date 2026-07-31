import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useMapelOptions, UseMapelOptionsParams } from '../../hooks/useMapelOptions';

export interface MapelSelectProps extends UseMapelOptionsParams {
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

export const MapelSelect: React.FC<MapelSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Mata Pelajaran --',
  searchPlaceholder = 'Ketik Nama / Kode Mapel...',
  kelompok,
  tingkat,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useMapelOptions({ kelompok, tingkat });

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
