import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useGuruOptions, UseGuruOptionsParams } from '../../hooks/useGuruOptions';

export interface GuruSelectProps extends UseGuruOptionsParams {
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

export const GuruSelect: React.FC<GuruSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Guru Pendidik --',
  searchPlaceholder = 'Ketik Nama atau NIP Guru...',
  jenisPtk = 'PENDIDIK',
  onlyActive = true,
  teachingLoadMap,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useGuruOptions({
    jenisPtk,
    onlyActive,
    teachingLoadMap
  });

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
