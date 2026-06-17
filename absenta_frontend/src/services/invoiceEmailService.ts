import axiosInstance from '../lib/axiosInstance';
import type { Invoice } from '../types/invoice';
import type { Tenant } from '../api/tenants.api';
import { LogService } from '../utils/LogService';

export interface EmailInvoiceRequest {
  invoiceId: string;
  recipientEmail?: string;
  subject?: string;
  message?: string;
  attachPdf?: boolean;
  ccEmails?: string[];
  bccEmails?: string[];
}

export interface EmailInvoiceResponse {
  success: boolean;
  message: string;
  emailId?: string;
  sentAt?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface EmailHistory {
  id: string;
  invoiceId: string;
  recipientEmail: string;
  subject: string;
  status: 'SENT' | 'DELIVERED' | 'OPENED' | 'FAILED' | 'BOUNCED';
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  errorMessage?: string;
}

/**
 * Service untuk mengelola pengiriman invoice via email
 */
export class InvoiceEmailService {
  
  /**
   * Kirim invoice via email
   * @param request - Data request untuk mengirim email
   * @returns Promise<EmailInvoiceResponse>
   */
  static async sendInvoiceEmail(request: EmailInvoiceRequest): Promise<EmailInvoiceResponse> {
    try {
      const response = await axiosInstance.post<EmailInvoiceResponse>('/invoices/send-email', request);
      return response.data;
    } catch (error: unknown) {
      LogService.error('Error sending invoice email:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengirim invoice via email');
    }
  }

  /**
   * Kirim reminder invoice yang overdue
   * @param invoiceId - ID invoice
   * @param customMessage - Pesan custom (optional)
   * @returns Promise<EmailInvoiceResponse>
   */
  static async sendInvoiceReminder(
    invoiceId: string, 
    customMessage?: string
  ): Promise<EmailInvoiceResponse> {
    try {
      const response = await axiosInstance.post<EmailInvoiceResponse>(`/invoices/${invoiceId}/send-reminder`, {
        customMessage
      });
      return response.data;
    } catch (error: unknown) {
      LogService.error('Error sending invoice reminder:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengirim reminder invoice');
    }
  }

  /**
   * Kirim konfirmasi pembayaran invoice
   * @param invoiceId - ID invoice
   * @param paymentDetails - Detail pembayaran
   * @returns Promise<EmailInvoiceResponse>
   */
  static async sendPaymentConfirmation(
    invoiceId: string,
    paymentDetails?: {
      paymentMethod?: string;
      transactionId?: string;
      paidAmount?: number;
      paidAt?: string;
    }
  ): Promise<EmailInvoiceResponse> {
    try {
      const response = await axiosInstance.post<EmailInvoiceResponse>(`/invoices/${invoiceId}/send-payment-confirmation`, {
        paymentDetails
      });
      return response.data;
    } catch (error: unknown) {
      LogService.error('Error sending payment confirmation:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengirim konfirmasi pembayaran');
    }
  }

  /**
   * Get template email yang tersedia
   * @returns Promise<EmailTemplate[]>
   */
  static async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await axiosInstance.get<{ data: EmailTemplate[] }>('/invoices/email-templates');
      return response.data.data;
    } catch (error: unknown) {
      LogService.error('Error fetching email templates:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengambil template email');
    }
  }

  /**
   * Preview email sebelum dikirim
   * @param invoiceId - ID invoice
   * @param templateId - ID template (optional)
   * @returns Promise<{ subject: string; htmlContent: string; textContent: string }>
   */
  static async previewEmail(
    invoiceId: string,
    templateId?: string
  ): Promise<{ subject: string; htmlContent: string; textContent: string }> {
    try {
      const response = await axiosInstance.get<{ 
        data: { subject: string; htmlContent: string; textContent: string } 
      }>(`/invoices/${invoiceId}/email-preview`, {
        params: { templateId }
      });
      return response.data.data;
    } catch (error: unknown) {
      LogService.error('Error previewing email:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal menampilkan preview email');
    }
  }

  /**
   * Get history pengiriman email untuk invoice
   * @param invoiceId - ID invoice
   * @returns Promise<EmailHistory[]>
   */
  static async getEmailHistory(invoiceId: string): Promise<EmailHistory[]> {
    try {
      const response = await axiosInstance.get<{ data: EmailHistory[] }>(`/invoices/${invoiceId}/email-history`);
      return response.data.data;
    } catch (error: unknown) {
      LogService.error('Error fetching email history:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengambil history email');
    }
  }

  /**
   * Validasi email address
   * @param email - Email address
   * @returns boolean
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate default email subject
   * @param invoice - Data invoice
   * @param type - Tipe email ('invoice' | 'reminder' | 'payment_confirmation')
   * @returns string
   */
  static generateEmailSubject(
    invoice: Invoice, 
    type: 'invoice' | 'reminder' | 'payment_confirmation' = 'invoice'
  ): string {
    const subjects = {
      invoice: `Invoice ${invoice.invoice_number} - ${invoice.total_amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`,
      reminder: `Reminder: Invoice ${invoice.invoice_number} Overdue`,
      payment_confirmation: `Payment Confirmation - Invoice ${invoice.invoice_number}`
    };
    
    return subjects[type];
  }

  /**
   * Generate default email message
   * @param invoice - Data invoice
   * @param tenant - Data tenant
   * @param type - Tipe email
   * @returns string
   */
  static generateEmailMessage(
    invoice: Invoice,
    tenant?: Tenant,
    type: 'invoice' | 'reminder' | 'payment_confirmation' = 'invoice'
  ): string {
    const tenantName = tenant?.name || 'Valued Customer';
    const dueDate = new Date(invoice.due_date).toLocaleDateString('id-ID');
    const amount = invoice.total_amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });

    const messages = {
      invoice: `Dear ${tenantName},

Please find attached your invoice ${invoice.invoice_number} for ${amount}.

Due Date: ${dueDate}

Thank you for your business!

Best regards,
Absensi Multitenant Team`,

      reminder: `Dear ${tenantName},

This is a friendly reminder that your invoice ${invoice.invoice_number} for ${amount} was due on ${dueDate}.

Please arrange payment at your earliest convenience to avoid any service interruption.

If you have already made the payment, please disregard this message.

Best regards,
Absensi Multitenant Team`,

      payment_confirmation: `Dear ${tenantName},

Thank you for your payment! We have received your payment for invoice ${invoice.invoice_number}.

Amount Paid: ${amount}
Payment Date: ${new Date().toLocaleDateString('id-ID')}

Your account has been updated accordingly.

Best regards,
Absensi Multitenant Team`
    };

    return messages[type];
  }

  /**
   * Bulk send invoices
   * @param invoiceIds - Array ID invoice
   * @param options - Opsi pengiriman
   * @returns Promise<{ success: number; failed: number; results: EmailInvoiceResponse[] }>
   */
  static async bulkSendInvoices(
    invoiceIds: string[],
    options?: {
      templateId?: string;
      customMessage?: string;
      attachPdf?: boolean;
    }
  ): Promise<{ success: number; failed: number; results: EmailInvoiceResponse[] }> {
    try {
      const response = await axiosInstance.post<{
        data: { success: number; failed: number; results: EmailInvoiceResponse[] }
      }>('/invoices/bulk-send-email', {
        invoiceIds,
        ...options
      });
      return response.data.data;
    } catch (error: unknown) {
      LogService.error('Error bulk sending invoices:', error);
      const e = error as { response?: { data?: { message?: string } } };
      throw new Error(e.response?.data?.message || 'Gagal mengirim invoice secara bulk');
    }
  }
}

export default InvoiceEmailService;
