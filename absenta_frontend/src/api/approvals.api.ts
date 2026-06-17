import { requestWithFallback } from "./apiUtils";
import type {
  ApprovalStatus,
  ApprovalListResponse,
  ApprovalCreateRequest,
  ApprovalCreateResponse,
  ApprovalActionResponse
} from "../types/approvals";

export async function getApprovals(params?: {
  status?: ApprovalStatus;
  tenant_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApprovalListResponse> {
  return requestWithFallback<ApprovalListResponse>('get', '/approvals', { params });
}

export async function createApprovalRequest(
  body: ApprovalCreateRequest
): Promise<ApprovalCreateResponse> {
  return requestWithFallback<ApprovalCreateResponse>('post', '/approvals', { data: body });
}

export async function approveApprovalRequest(id: string): Promise<ApprovalActionResponse> {
  return requestWithFallback<ApprovalActionResponse>('post', `/approvals/${id}/approve`);
}

export async function rejectApprovalRequest(
  id: string,
  reason?: string
): Promise<ApprovalActionResponse> {
  return requestWithFallback<ApprovalActionResponse>('post', `/approvals/${id}/reject`, { data: { reason } });
}
