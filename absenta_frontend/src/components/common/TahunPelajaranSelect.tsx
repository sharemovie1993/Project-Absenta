import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';

export interface TahunPelajaranSelectProps {
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

export const TahunPelajaranSelect: React.FC<TahunPelajaranSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Tahun Pelajaran --',
  searchPlaceholder = 'Ketik Tahun Pelajaran...',
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useTahunPelajaranOptions();

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
