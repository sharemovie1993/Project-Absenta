import React from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useRoleOptions } from '../../hooks/useRoleOptions';

export interface RoleSelectProps {
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

export const RoleSelect: React.FC<RoleSelectProps> = ({
  id,
  value,
  onValueChange,
  placeholder = '-- Cari & Pilih Role Hak Akses --',
  searchPlaceholder = 'Ketik Nama Role / Akses...',
  disabled = false,
  clearable = false,
  className,
  triggerClassName
}) => {
  const { options, isLoading } = useRoleOptions();

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
