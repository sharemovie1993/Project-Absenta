import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useSemesterOptions, UseSemesterOptionsParams } from '../../hooks/useSemesterOptions';

export interface SemesterSelectProps extends UseSemesterOptionsParams {
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

export const SemesterSelect: React.FC<SemesterSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Semester --',
  searchPlaceholder = 'Ketik Nama Semester / Tahun Pelajaran...',
  tahunPelajaranId,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useSemesterOptions({ tahunPelajaranId });

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
