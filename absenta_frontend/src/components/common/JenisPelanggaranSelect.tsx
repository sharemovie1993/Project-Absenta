import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useJenisPelanggaranOptions, UseJenisPelanggaranOptionsParams } from '../../hooks/useJenisPelanggaranOptions';

export interface JenisPelanggaranSelectProps extends UseJenisPelanggaranOptionsParams {
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

export const JenisPelanggaranSelect: React.FC<JenisPelanggaranSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Jenis Pelanggaran --',
  searchPlaceholder = 'Ketik Nama Pelanggaran...',
  kategori,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useJenisPelanggaranOptions({ kategori });

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
