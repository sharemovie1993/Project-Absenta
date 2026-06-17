// Invoice Layout Configuration

import React from 'react';
import { 
  FileText, 
  Send, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  Mail,
  CreditCard,
  FileDown,
  Users,
  TrendingUp
} from 'lucide-react';

import type { InvoiceTabItem } from '../../types/invoice';
import { InvoiceStatus } from '../../types/invoice';

// Tab Navigation Configuration
export const invoiceTabItems: InvoiceTabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/invoice',
    icon: React.createElement(BarChart3, { size: 16 })
  },
  {
    key: 'invoices',
    label: 'Invoices',
    path: '/invoice/list',
    icon: React.createElement(FileText, { size: 16 })
  },
  {
    key: 'create',
    label: 'Create Invoice',
    path: '/invoice/create',
    icon: React.createElement(Plus, { size: 16 })
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/invoice/reports',
    icon: React.createElement(TrendingUp, { size: 16 })
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/invoice/settings',
    icon: React.createElement(Settings, { size: 16 })
  }
];

// Status Configuration
export const invoiceStatusConfig = {
  DRAFT: {
    label: 'Draft',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    icon: React.createElement(Edit, { size: 14 }),
    description: 'Invoice belum dikirim'
  },
  SENT: {
    label: 'Terkirim',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    icon: React.createElement(Send, { size: 14 }),
    description: 'Invoice telah dikirim'
  },
  PAID: {
    label: 'Lunas',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    icon: React.createElement(CheckCircle, { size: 14 }),
    description: 'Invoice telah dibayar'
  },
  OVERDUE: {
    label: 'Terlambat',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    icon: React.createElement(AlertCircle, { size: 14 }),
    description: 'Invoice terlambat'
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    icon: React.createElement(XCircle, { size: 14 }),
    description: 'Invoice dibatalkan'
  }
};

// Action Configuration
export const invoiceActionConfig = {
  view: {
    label: 'View',
    icon: React.createElement(Eye, { size: 16 }),
    color: 'text-blue-600',
    hoverColor: 'hover:text-blue-800'
  },
  edit: {
    label: 'Edit',
    icon: React.createElement(Edit, { size: 16 }),
    color: 'text-green-600',
    hoverColor: 'hover:text-green-800'
  },
  send: {
    label: 'Send',
    icon: React.createElement(Send, { size: 16 }),
    color: 'text-blue-600',
    hoverColor: 'hover:text-blue-800'
  },
  markPaid: {
    label: 'Mark as Paid',
    icon: React.createElement(CreditCard, { size: 16 }),
    color: 'text-green-600',
    hoverColor: 'hover:text-green-800'
  },
  cancel: {
    label: 'Cancel',
    icon: React.createElement(XCircle, { size: 16 }),
    color: 'text-orange-600',
    hoverColor: 'hover:text-orange-800'
  },
  delete: {
    label: 'Delete',
    icon: React.createElement(Trash2, { size: 16 }),
    color: 'text-red-600',
    hoverColor: 'hover:text-red-800'
  },
  download: {
    label: 'Download PDF',
    icon: React.createElement(Download, { size: 16 }),
    color: 'text-purple-600',
    hoverColor: 'hover:text-purple-800'
  },
  email: {
    label: 'Send Email',
    icon: React.createElement(Mail, { size: 16 }),
    color: 'text-indigo-600',
    hoverColor: 'hover:text-indigo-800'
  }
};

// Filter Options
export const invoiceFilterOptions = {
  status: [
    { value: 'ALL', label: 'All Status' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ],
  dateRange: [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ],
  sortBy: [
    { value: 'created_at', label: 'Created Date' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'invoice_number', label: 'Invoice Number' }
  ],
  sortOrder: [
    { value: 'desc', label: 'Newest First' },
    { value: 'asc', label: 'Oldest First' }
  ]
};

// Table Column Configuration
export const invoiceTableColumns = [
  {
    key: 'invoice_number',
    label: 'Invoice Number',
    sortable: true,
    width: '150px'
  },
  {
    key: 'tenant',
    label: 'Tenant',
    sortable: true,
    width: '200px'
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    width: '120px',
    align: 'right'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '100px'
  },
  {
    key: 'issue_date',
    label: 'Issue Date',
    sortable: true,
    width: '120px'
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    width: '120px'
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    width: '120px'
  }
];

// Dashboard Metrics Configuration
export const dashboardMetricsConfig = [
  {
    key: 'total_invoices',
    label: 'Total Invoices',
    icon: React.createElement(FileText, { size: 20 }),
    color: 'blue',
    format: 'number'
  },
  {
    key: 'total_amount',
    label: 'Total Amount',
    icon: React.createElement(DollarSign, { size: 20 }),
    color: 'green',
    format: 'currency'
  },
  {
    key: 'paid_amount',
    label: 'Paid Amount',
    icon: React.createElement(CheckCircle, { size: 20 }),
    color: 'emerald',
    format: 'currency'
  },
  {
    key: 'pending_amount',
    label: 'Pending Amount',
    icon: React.createElement(Clock, { size: 20 }),
    color: 'yellow',
    format: 'currency'
  },
  {
    key: 'overdue_amount',
    label: 'Overdue Amount',
    icon: React.createElement(AlertCircle, { size: 20 }),
    color: 'red',
    format: 'currency'
  },
  {
    key: 'payment_success_rate',
    label: 'Payment Success Rate',
    icon: React.createElement(TrendingUp, { size: 20 }),
    color: 'purple',
    format: 'percentage'
  }
];

// Form Field Configuration
export const invoiceFormFields = {
  billing_id: {
    label: 'Billing',
    type: 'select',
    required: true,
    placeholder: 'Select billing to create invoice'
  },
  due_date: {
    label: 'Due Date',
    type: 'date',
    required: true,
    placeholder: 'Select due date'
  },
  tax_rate: {
    label: 'Tax Rate (%)',
    type: 'number',
    required: false,
    placeholder: '0',
    min: 0,
    max: 100,
    step: 0.01
  },
  notes: {
    label: 'Notes',
    type: 'textarea',
    required: false,
    placeholder: 'Additional notes for this invoice',
    rows: 3
  }
};

// Send Invoice Form Configuration
export const sendInvoiceFormFields = {
  email: {
    label: 'Recipient Email',
    type: 'email',
    required: true,
    placeholder: 'Enter recipient email'
  },
  subject: {
    label: 'Email Subject',
    type: 'text',
    required: true,
    placeholder: 'Invoice from [Company Name]'
  },
  message: {
    label: 'Email Message',
    type: 'textarea',
    required: false,
    placeholder: 'Dear [Customer Name], Please find attached your invoice...',
    rows: 4
  },
  send_copy: {
    label: 'Send copy to me',
    type: 'checkbox',
    required: false
  },
  schedule_date: {
    label: 'Schedule Send (Optional)',
    type: 'datetime-local',
    required: false,
    placeholder: 'Leave empty to send immediately'
  }
};

// Mark as Paid Form Configuration
export const markPaidFormFields = {
  payment_method: {
    label: 'Payment Method',
    type: 'select',
    required: false,
    options: [
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'cash', label: 'Cash' },
      { value: 'check', label: 'Check' },
      { value: 'other', label: 'Other' }
    ]
  },
  payment_reference: {
    label: 'Payment Reference',
    type: 'text',
    required: false,
    placeholder: 'Transaction ID, Check number, etc.'
  },
  paid_at: {
    label: 'Payment Date',
    type: 'datetime-local',
    required: false,
    placeholder: 'Leave empty for current time'
  },
  notes: {
    label: 'Payment Notes',
    type: 'textarea',
    required: false,
    placeholder: 'Additional notes about the payment',
    rows: 2
  }
};

// Export Options Configuration
export const exportOptionsConfig = {
  formats: [
    { value: 'pdf', label: 'PDF', icon: React.createElement(FileDown, { size: 16 }) },
    { value: 'excel', label: 'Excel', icon: React.createElement(FileDown, { size: 16 }) },
    { value: 'csv', label: 'CSV', icon: React.createElement(FileDown, { size: 16 }) }
  ],
  includeOptions: [
    { value: 'details', label: 'Include Details' },
    { value: 'billing_info', label: 'Include Billing Info' },
    { value: 'tenant_info', label: 'Include Tenant Info' },
    { value: 'payment_info', label: 'Include Payment Info' }
  ]
};

// Notification Configuration
export const notificationConfig = {
  types: {
    INVOICE_CREATED: {
      title: 'Invoice Created',
      icon: React.createElement(FileText, { size: 16 }),
      color: 'blue'
    },
    INVOICE_SENT: {
      title: 'Invoice Sent',
      icon: React.createElement(Send, { size: 16 }),
      color: 'green'
    },
    INVOICE_PAID: {
      title: 'Invoice Paid',
      icon: React.createElement(CheckCircle, { size: 16 }),
      color: 'emerald'
    },
    INVOICE_OVERDUE: {
      title: 'Invoice Overdue',
      icon: React.createElement(AlertCircle, { size: 16 }),
      color: 'red'
    },
    INVOICE_CANCELLED: {
      title: 'Invoice Cancelled',
      icon: React.createElement(XCircle, { size: 16 }),
      color: 'orange'
    }
  }
};

// Permission Configuration
export const invoicePermissions = {
  view: ['admin', 'manager', 'staff'],
  create: ['admin', 'manager'],
  edit: ['admin', 'manager'],
  send: ['admin', 'manager'],
  mark_paid: ['admin', 'manager'],
  cancel: ['admin', 'manager'],
  delete: ['admin'],
  export: ['admin', 'manager'],
  view_all_tenants: ['admin'],
  manage_settings: ['admin']
};

// Animation Configuration
export const animationConfig = {
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  },
  modalTransition: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  },
  listItemTransition: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2 }
  }
};

// CSS Classes Configuration
export const cssClasses = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  card: 'bg-white rounded-lg shadow-sm border border-gray-200',
  cardHeader: 'px-6 py-4 border-b border-gray-200',
  cardBody: 'px-6 py-4',
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
    success: 'bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors'
  },
  input: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
  select: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
  textarea: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'
};

// Default Values
export const defaultValues = {
  pagination: {
    itemsPerPage: 10,
    maxPages: 10
  },
  filters: {
    status: 'ALL',
    dateRange: 'this_month',
    sortBy: 'created_at',
    sortOrder: 'desc'
  },
  taxRate: 11, // Default PPN Indonesia
  currency: 'IDR',
  dueDateDays: 30 // Default 30 hari dari issue date
};

// Main Configuration Object
export const invoiceLayoutConfig = {
  tabItems: invoiceTabItems,
  statusConfig: Object.values(invoiceStatusConfig),
  actionConfig: invoiceActionConfig,
  filterOptions: invoiceFilterOptions,
  tableColumns: invoiceTableColumns,
  dashboardMetrics: dashboardMetricsConfig,
  formFields: invoiceFormFields,
  sendInvoiceFormFields,
  markPaidFormFields,
  exportOptions: exportOptionsConfig,
  notifications: notificationConfig,
  permissions: invoicePermissions,
  animations: animationConfig,
  cssClasses,
  defaultValues
};
