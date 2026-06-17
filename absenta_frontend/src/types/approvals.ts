export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalTargetType = 'BILLING' | 'PAYMENT' | 'INVOICE';

export type ApprovalActionType =
  | 'BILLING_DELETE'
  | 'BILLING_EDIT'
  | 'BILLING_GENERATE_INVOICE'
  | 'BILLING_MARK_OVERDUE'
  | 'BILLING_MARK_PAID'
  | 'INVOICE_SEND'
  | 'PAYMENT_CREATE_MANUAL'
  | 'PAYMENT_MARK_PAID';

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  target_type: ApprovalTargetType;
  target_id: string;
  action_type: ApprovalActionType;
  status: ApprovalStatus;
  requested_by: string;
  requested_by_name?: string;
  approver_id?: string;
  approver_name?: string;
  reason?: string;
  created_at: string;
  decided_at?: string;
}

export interface ApprovalListResponse {
  success: boolean;
  message: string;
  data: {
    approvals: ApprovalRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApprovalCreateRequest {
  tenant_id: string;
  target_type: ApprovalTargetType;
  target_id: string;
  action_type: ApprovalActionType;
  reason?: string;
}

export interface ApprovalCreateResponse {
  success: boolean;
  message: string;
  data: ApprovalRequest;
}

export interface ApprovalActionResponse {
  success: boolean;
  message: string;
  data: ApprovalRequest;
}

