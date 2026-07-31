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
  autoSelectActive?: boolean;
}

export const TahunPelajaranSelect: React.FC<TahunPelajaranSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Tahun Pelajaran --',
  searchPlaceholder = 'Ketik Tahun Pelajaran...',
  autoSelectActive = false,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, activeYear, isLoading } = useTahunPelajaranOptions();

  React.useEffect(() => {
    if (autoSelectActive && !value && activeYear?.id) {
      onValueChange(activeYear.id);
    }
  }, [autoSelectActive, value, activeYear, onValueChange]);

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
