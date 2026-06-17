import React from 'react';
import { invoiceStatusConfig } from './invoiceLayoutConfig';
import { InvoiceStatus } from '../../types/invoice';
import { FileText } from 'lucide-react';

interface Props {
  status: InvoiceStatus;
  className?: string;
  showIcon?: boolean;
}

const InvoiceStatusBadge: React.FC<Props> = ({ status, className = '', showIcon = true }) => {
  const config = (invoiceStatusConfig as any)[status] || {
    label: status,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    icon: React.createElement(FileText, { size: 14 })
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor} ${className}`}>
      {showIcon && config.icon}
      <span className="ml-1">{config.label}</span>
    </span>
  );
};

export default InvoiceStatusBadge;

