import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useStrukturKurikulumOptions, UseStrukturKurikulumOptionsParams } from '../../hooks/useStrukturKurikulumOptions';

export interface StrukturKurikulumSelectProps extends UseStrukturKurikulumOptionsParams {
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

export const StrukturKurikulumSelect: React.FC<StrukturKurikulumSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Mapel Struktur Kurikulum --',
  searchPlaceholder = 'Ketik Nama Mapel / Kode...',
  tahunPelajaranId,
  tingkat,
  jurusanId,
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useStrukturKurikulumOptions({
    tahunPelajaranId,
    tingkat,
    jurusanId
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
