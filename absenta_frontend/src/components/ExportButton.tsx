import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';

export interface ExportButtonProps {
  onExport: (format: 'CSV' | 'EXCEL') => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  isLoading = false,
  disabled = false,
  size = 'md',
  variant = 'outline',
  className = '',
  label = 'Export'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  };

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;

  const handleExport = (format: 'CSV' | 'EXCEL') => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center gap-2 border rounded-md font-medium
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full border-2 border-current border-t-transparent" 
               style={{ width: iconSize, height: iconSize }} />
        ) : (
          <Download size={iconSize} />
        )}
        <span>{isLoading ? 'Mengekspor...' : label}</span>
        <ChevronDown 
          size={iconSize} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && !disabled && !isLoading && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              <button
                onClick={() => handleExport('CSV')}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileText size={16} className="text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Export ke CSV</div>
                  <div className="text-xs text-gray-500">Format tabel sederhana</div>
                </div>
              </button>
              
              <button
                onClick={() => handleExport('EXCEL')}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileSpreadsheet size={16} className="text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Export ke Excel</div>
                  <div className="text-xs text-gray-500">Format spreadsheet</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
