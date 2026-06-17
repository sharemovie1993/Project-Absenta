// Payment Gateway Types
// Based on Payment Module API Documentation

export type PaymentGateway = 'MIDTRANS' | 'STRIPE' | 'XENDIT' | 'TRIPAY' | 'MANUAL';

export type PaymentMethod = 
  | 'QRIS' 
  | 'BANK_TRANSFER' 
  | 'CREDIT_CARD' 
  | 'DEBIT_CARD' 
  | 'E_WALLET' 
  | 'CASH';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'EXPIRED';

export interface PaymentRecord {
  id: string;
  tenant_id: string;
  billing_id: string;
  invoice_number: string;
  gateway: PaymentGateway;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_transaction_id?: string;
  payment_url?: string;
  qr_string?: string;
  expires_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  message?: string;
}

export interface CreatePaymentData {
  billingId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  return_url?: string;
  cancel_url?: string;
  customerInfo?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface PaymentFormData {
  billingId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  return_url?: string;
  cancel_url?: string;
  customerInfo?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface PaymentStatusData {
  id: string;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  qrString?: string;
  expiresAt?: string;
  message?: string;
}

export interface BillingInfo {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  customer_name?: string;
  description?: string;
}

export interface PaymentSummary {
  billing: BillingInfo;
  payments: PaymentRecord[];
  summary: {
    total_paid: number;
    total_pending: number;
    payment_count: number;
  };
}

export interface GatewayConfig {
  gateways: PaymentGateway[];
  methods: PaymentMethod[];
}

export interface PaymentListFilter {
  limit?: number;
  offset?: number;
  tenant_id?: string;
  status?: PaymentStatus;
  gateway?: PaymentGateway;
  date_from?: string;
  date_to?: string;
}

export interface PaymentHealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  gateways: Record<string, {
    status: 'connected' | 'disconnected';
    response_time_ms: number;
  }>;
  database: {
    status: 'connected' | 'disconnected';
    response_time_ms: number;
  };
}

// Component Props Types
export interface CreatePaymentFormProps {
  tenantId?: string;
  billingId?: string;
  onPaymentCreated?: (payment: PaymentStatusData) => void;
  onError?: (error: string) => void;
}

export interface PaymentStatusViewProps {
  paymentId: string;
  onStatusChange?: (payment: PaymentStatusData) => void;
  pollingInterval?: number;
}

export interface CancelPaymentButtonProps {
  paymentId: string;
  currentStatus: PaymentStatus;
  userRole: string;
  onCancelSuccess?: (paymentId: string) => void;
  onCancelError?: (error: string) => void;
  onCancelled?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'danger' | 'outline' | 'ghost';
}

export interface DeletePaymentButtonProps {
  paymentId: string;
  currentStatus: PaymentStatus;
  userRole: string;
  onDeleteSuccess?: (paymentId: string) => void;
  onDeleteError?: (error: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'danger' | 'outline' | 'ghost';
}

export interface PaymentListProps {
  tenantId?: string;
  userRole?: string;
  filter?: PaymentListFilter;
  showFilters?: boolean;
  showPagination?: boolean;
  onPaymentClick?: (payment: PaymentRecord) => void;
  onPaymentCancelled?: (paymentId: string) => void;
}

export interface QRCodeDisplayProps {
  qrString: string;
  expiresAt?: string;
  onExpired?: () => void;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details: string;
    field?: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    total_pages?: number;
  };
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  details?: string;
  field?: string;
}

export interface GatewayError extends PaymentError {
  gateway: PaymentGateway;
  gateway_error?: any;
}

// Utility Types
export interface CountdownTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface PaymentNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
