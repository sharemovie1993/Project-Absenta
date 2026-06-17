import { RoleName } from '../../../constants/enums';
import { isSystemSuperAdmin } from '../../../utils/rbac';
import { InvoiceStatus } from '@prisma/client';
import { systemConfigService } from '../../system-config/services/system-config.service';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import * as crypto from 'crypto';
import { observabilityService } from '../../observability/services/observability.service';
import { appLogger } from '../../../utils/app-logger';
import { emitDomainEvent } from '@/infra/event-bus';
import { invoiceDb as prisma } from './repositories/invoice.db';
import { getSmartApiBaseUrl } from '@/utils/url-helper';
import { createInvoiceCommand } from './commands/create-invoice.command';
import { generateInvoiceFromBillingCommand } from './commands/generate-invoice-from-billing.command';
import { sendInvoiceCommand } from './commands/send-invoice.command';
// Recompile trigger
import type {
  CreateInvoiceInput,
  GetInvoicesParams,
  InvalidInvoicePeriodItem,
  InvoiceResponse,
  InvoiceStats,
  PaginatedInvoicesResponse,
  PublicInvoiceResponse,
  UpdateInvoiceInput,
} from './invoice.types';

export type {
  CreateInvoiceInput,
  GetInvoicesParams,
  InvalidInvoicePeriodItem,
  InvoiceResponse,
  InvoiceStats,
  PaginatedInvoicesResponse,
  PublicInvoiceResponse,
  UpdateInvoiceInput,
} from './invoice.types';

export class InvoiceService {
  async getInvoiceTenantIdForAccess(invoiceId: string): Promise<string | null> {
    const inv = await prisma.invoice.findUnique({
      where: { id: String(invoiceId) },
      select: {
        tenant_id: true,
        Billing: {
          select: {
            Subscription: { select: { tenant_id: true } }
          }
        }
      }
    });

    if (!inv) return null;
    const direct = (inv as any).tenant_id;
    const fromBilling = (inv as any).Billing?.Subscription?.tenant_id;
    const tenantId = String(direct || fromBilling || '').trim();
    return tenantId ? tenantId : null;
  }

  async resolveExistingPdfStorageKey(input: { invoiceId: string }): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      select: {
        pdf_path: true,
        pdf_storage_key: true,
        status: true,
        paid_at: true,
        pdf_generated_at: true,
      },
    });

    const status = String(invoice?.status || '');
    if (status === 'PAID' && invoice?.paid_at) {
      const paidAt = new Date(invoice.paid_at).getTime();
      const generatedAt = invoice.pdf_generated_at ? new Date(invoice.pdf_generated_at).getTime() : 0;
      if (generatedAt < paidAt - 5000) {
        return '';
      }
    }

    const key = String(invoice?.pdf_storage_key || '').trim();
    if (key) return key;

    const storedUrl = String(invoice?.pdf_path || '').trim();
    const marker = '/uploads/';
    const idx = storedUrl.indexOf(marker);
    if (idx >= 0) {
      const rel = storedUrl.slice(idx + marker.length).replace(/^\/+/, '');
      if (rel) return `uploads/${rel}`;
    }

    return '';
  }

  private async requestInvoicePdfGeneration(input: {
    invoiceId: string;
    tenantId: string;
    publicBaseUrl: string;
    correlationId?: string;
  }): Promise<void> {
    const tenantId = String(input.tenantId || '').trim();
    if (!tenantId) return;

    const invoiceId = String(input.invoiceId || '').trim();
    if (!invoiceId) return;

    const publicBaseUrl = String(input.publicBaseUrl || '').trim() || getSmartApiBaseUrl();

    await emitDomainEvent({
      event_type: 'invoice.pdf.requested',
      tenant_id: tenantId,
      source_service: 'invoice',
      metadata: {
        ...(input.correlationId ? { correlation_id: String(input.correlationId) } : {}),
        idempotency_key: `invoice_pdf_${invoiceId}`,
      },
      payload: {
        invoice_id: invoiceId,
        tenant_id: tenantId,
        public_base_url: publicBaseUrl,
      },
    });
  }

  /**
   * Helper function untuk generate invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Format: INV-YYYY-MM-XXXX
    const prefix = `INV-${year}-${month}`;
    
    // Cari invoice terakhir dengan prefix yang sama
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoice_number: {
          startsWith: prefix
        }
      },
      orderBy: {
        invoice_number: 'desc'
      }
    });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-')[3]);
      sequence = lastSequence + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Helper function untuk validasi akses berdasarkan role
   */
  private async validateAccess(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        Billing: {
          include: {
            Subscription: {
              include: {
                Tenant: {
                  include: {
                    sekolah: true
                  }
                },
                Plan: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // SUPERADMIN sistem memiliki akses global
    if (isSystemSuperAdmin(userRole, userTenantId)) {
      return this.formatInvoiceResponse(invoice);
    }
    // SUPERADMIN non-sistem dan ADMIN harus dalam cakupan tenant
    if (userRole === RoleName.SUPERADMIN || userRole === RoleName.ADMIN) {
      if (invoice.Billing?.Subscription?.tenant_id !== userTenantId) {
        throw new Error('Insufficient permissions');
      }
      return this.formatInvoiceResponse(invoice);
    }

    // Role lain tidak memiliki akses
    throw new Error('Insufficient permissions');
  }

  /**
   * Helper function untuk format response invoice
   */
  private formatInvoiceResponse(invoice: any): InvoiceResponse {
    const paymentsArr = Array.isArray(invoice.payments) ? invoice.payments : [];
    const hasTripayPayment = paymentsArr.some((p: any) => String(p.confirmed_by) === 'TRIPAY_WEBHOOK');
    const selected = paymentsArr.find((p: any) => String(p.confirmed_by) === 'TRIPAY_WEBHOOK' && String(p.status) === 'SUCCESS');
    if (hasTripayPayment && selected && String(selected.gateway) !== 'TRIPAY') {
      throw new Error('Invalid payment source');
    }
    let transaction_history: { gateway: string; reference: string }[];
    const orderedByDate = [...paymentsArr].sort((a: any, b: any) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
    const primary = selected || orderedByDate[0] || null;
    if (primary) {
      const ordered = [primary, ...orderedByDate.filter((p: any) => p?.id && p.id !== primary.id)];
      transaction_history = ordered.map((p: any) => ({
        gateway: `${String(p.gateway || 'UNKNOWN')}-${String(p.payment_method || 'UNKNOWN')}`,
        reference: String(p.gateway_transaction_id || '-')
      }));
    } else {
      transaction_history = [{ gateway: 'UNKNOWN', reference: '-' }];
    }

    const effectiveStatus = (() => {
      const s = invoice.status as InvoiceStatus;
      if (s === InvoiceStatus.DRAFT) {
        const hasAnyPayment = paymentsArr.some((p: any) => ['PENDING', 'PROCESSING', 'SUCCESS'].includes(String(p.status)));
        if (hasAnyPayment) return InvoiceStatus.SENT;
      }
      return s;
    })();
    return {
      id: invoice.id,
      billing_id: invoice.billing_id,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      transaction_history,
      subtotal_amount: invoice.subtotal_amount ?? invoice.amount,
      tax_rate: invoice.tax_rate ?? null,
      tax_amount: invoice.tax_amount ?? 0,
      total_amount: invoice.total_amount ?? invoice.amount,
      tax_type: invoice.tax_type ?? 'NONE',
      tax_included: invoice.tax_included ?? false,
      tax_label: invoice.tax_label ?? null,
      due_date: invoice.due_date,
      period_start: invoice.period_start ?? null,
      period_end: invoice.period_end ?? null,
      status: effectiveStatus,
      notes: invoice.notes,
      sent_at: invoice.sent_at,
      paid_at: invoice.paid_at,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      tenant: invoice.Tenant ? {
        id: invoice.Tenant.id,
        name: invoice.Tenant.name,
        domain: invoice.Tenant.domain ?? null,
        logo_url: invoice.Tenant.logo_url ?? null,
        address: invoice.Tenant.sekolah?.[0] 
          ? [invoice.Tenant.sekolah[0].alamat, invoice.Tenant.sekolah[0].kota, invoice.Tenant.sekolah[0].provinsi].filter(Boolean).join(', ')
          : null,
        email: Array.isArray(invoice.Tenant.users)
          ? (invoice.Tenant.users[0]?.email ?? null)
          : null,
      } : undefined,
      Billing: invoice.Billing ? {
        id: invoice.Billing.id,
        amount: invoice.Billing.amount,
        billing_date: invoice.Billing.billing_date,
        status: invoice.Billing.status,
        Subscription: {
          id: invoice.Billing.Subscription.id,
          tenant_id: invoice.Billing.Subscription.tenant_id,
          Tenant: {
            id: invoice.Billing.Subscription.Tenant.id,
            name: invoice.Billing.Subscription.Tenant.name,
            domain: invoice.Billing.Subscription.Tenant.domain,
            logo_url: invoice.Billing.Subscription.Tenant.logo_url ?? null,
            email: Array.isArray(invoice.Billing.Subscription.Tenant.users)
              ? (invoice.Billing.Subscription.Tenant.users[0]?.email ?? null)
              : null,
          },
          Plan: {
            id: invoice.Billing.Subscription.Plan.id,
            name: invoice.Billing.Subscription.Plan.name,
            price_monthly: invoice.Billing.Subscription.Plan.price_monthly,
            currency: invoice.Billing.Subscription.Plan.currency,
          }
        }
      } : undefined
    };
  }

  /**
   * GET /invoice - Mendapatkan semua invoice dengan pagination dan filter
   */
  async getAllInvoices(
    userRole: RoleName,
    userTenantId: string,
    params?: GetInvoicesParams
  ): Promise<PaginatedInvoicesResponse> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const status = params?.status;
    const tenant_id = params?.tenant_id;
    const billing_id = params?.billing_id;

    // Debug logging
    console.log('ðŸ” getAllInvoices Debug Info:');
    console.log('- userRole:', userRole);
    console.log('- userTenantId:', userTenantId);
    console.log('- params:', params);
    console.log('- tenant_id from params:', tenant_id);

    // Build where clause berdasarkan role
    const whereClause: any = {};

    // Filter berdasarkan role
    if (isSystemSuperAdmin(userRole, userTenantId)) {
      console.log('🔑 System SUPERADMIN detected - global access');
      // Optional global filter by tenant_id when provided
      if (tenant_id) {
        console.log('📓 Filtering by tenant_id:', tenant_id);
        whereClause.Billing = {
          is: {
            Subscription: {
              is: {
                tenant_id: tenant_id
              }
            }
          }
        };
      } else {
        console.log('🌐 No tenant_id filter - showing ALL invoices');
      }
    } else if (userRole === RoleName.ADMIN || userRole === RoleName.SUPERADMIN) {
      console.log('👤 Tenant-scoped role detected - filtering by userTenantId:', userTenantId);
      whereClause.Billing = {
        is: {
          Subscription: {
            is: {
              tenant_id: userTenantId
            }
          }
        }
      };
    } else {
      throw new Error('Insufficient permissions');
    }

    // Filter berdasarkan status jika disediakan
    if (status) {
      console.log('ðŸ“Š Adding status filter:', status);
      whereClause.status = status;
    }

    // Filter berdasarkan billing_id jika disediakan
    if (billing_id) {
      console.log('ðŸ”— Adding billing_id filter:', billing_id);
      whereClause.billing_id = billing_id;
    }

    console.log('ðŸ” Final whereClause:', JSON.stringify(whereClause, null, 2));

    // Calculate offset untuk pagination
    const skip = (page - 1) * limit;

    // Get total count dan invoices dengan pagination
      const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where: whereClause }),
        prisma.invoice.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: {
            payments: true,
            Tenant: {
              include: {
                sekolah: true,
                users: {
                  select: { email: true }
                }
              }
            },
            Billing: {
              include: {
                Subscription: {
                  include: {
                    Tenant: {
                      include: {
                        sekolah: true,
                        users: {
                          select: { email: true }
                        }
                      }
                    },
                    Plan: true
                  }
                }
              }
            }
          }
        })
      ]);

    if (process.env.DEBUG_INVOICE_QUERY === 'true') {
      appLogger.debug(
        {
          total,
          invoices_found: invoices.length,
          invoice_ids: invoices.map((inv) => inv.id),
          tenant_names: invoices.map((inv) => inv.Billing?.Subscription?.Tenant?.name),
        },
        'invoice.getInvoices.query_results'
      );
    }

    const formattedInvoices = invoices.map(invoice => this.formatInvoiceResponse(invoice));

    return {
      data: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getInvoicesWithInvalidPeriod(
    userRole: RoleName,
    userTenantId: string,
    input?: { tenant_id?: string; limit?: number }
  ): Promise<InvalidInvoicePeriodItem[]> {
    const limit = (() => {
      const v = Number(input?.limit ?? 200);
      if (!Number.isFinite(v)) return 200;
      return Math.max(1, Math.min(1000, Math.trunc(v)));
    })();

    let tenantFilter: string | null = null;
    if (isSystemSuperAdmin(userRole, userTenantId)) {
      tenantFilter = input?.tenant_id ? String(input.tenant_id) : null;
    } else if (userRole === RoleName.ADMIN || userRole === RoleName.SUPERADMIN) {
      tenantFilter = String(userTenantId);
    } else {
      throw new Error('Insufficient permissions');
    }

    const baseSelect = prisma.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        billing_id: string;
        subscription_id: string;
        invoice_number: string;
        status: InvoiceStatus;
        due_date: Date;
        period_start: Date | null;
        period_end: Date | null;
        invoice_tenant_name: string | null;
        invoice_tenant_identifier: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >;

    const rows = tenantFilter
      ? await baseSelect`
          SELECT
            id,
            tenant_id,
            billing_id,
            subscription_id,
            invoice_number,
            status,
            due_date,
            period_start,
            period_end,
            invoice_tenant_name,
            invoice_tenant_identifier,
            created_at,
            updated_at
          FROM "Invoice"
          WHERE tenant_id = ${tenantFilter}
            AND (
              period_start IS NULL
              OR period_end IS NULL
              OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end <= period_start)
            )
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await baseSelect`
          SELECT
            id,
            tenant_id,
            billing_id,
            subscription_id,
            invoice_number,
            status,
            due_date,
            period_start,
            period_end,
            invoice_tenant_name,
            invoice_tenant_identifier,
            created_at,
            updated_at
          FROM "Invoice"
          WHERE
            period_start IS NULL
            OR period_end IS NULL
            OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end <= period_start)
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    return rows.map((r) => ({
      ...r,
      issue: !r.period_start
        ? 'MISSING_PERIOD_START'
        : !r.period_end
          ? 'MISSING_PERIOD_END'
          : 'INVALID_PERIOD_ORDER'
    }));
  }

  /**
   * GET /invoice/:id - Mendapatkan invoice berdasarkan ID
   */
  async getInvoiceById(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceResponse> {
    return await this.validateAccess(invoiceId, userRole, userTenantId);
  }

  /**
   * Public getter tanpa RBAC untuk akses via token
   * RETURNS SANITIZED DATA ONLY
   */
  async getInvoicePublicById(
    invoiceId: string,
    token?: string
  ): Promise<{ data: PublicInvoiceResponse; internal: { billing_id: string | null; tenant_id: string | null } }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        Tenant: {
          include: {
            sekolah: true
          }
        },
        Billing: {
          include: {
            Subscription: {
              include: {
                Tenant: {
                  include: {
                    sekolah: true
                  }
                },
                Plan: true
              }
            }
          }
        }
      }
    });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const tenantId = String(invoice.Billing?.Subscription?.tenant_id || '').trim() || null;
    const tenantLogoUrl = invoice.Billing?.Subscription?.Tenant?.logo_url ?? null;
    const tenantConfig = await systemConfigService.getActive(tenantId);
    const data = this.formatPublicInvoiceResponse(invoice, token);
    data.branding = {
      logo_url: tenantLogoUrl,
      primary_color: (tenantConfig as any)?.primary_color ?? null,
      footer_text: (tenantConfig as any)?.footer_text ?? null,
    };

    return {
      data,
      internal: {
        billing_id: invoice.billing_id,
        tenant_id: tenantId
      }
    };
  }

  public formatPublicInvoiceResponse(invoice: any, token?: string): PublicInvoiceResponse {
    const planName = invoice.Billing?.Subscription?.Plan?.name || 'Subscription Service';
    const period = invoice.Billing?.billing_date ? new Date(invoice.Billing.billing_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';
    const description = period ? `${planName} - ${period}` : planName;
    const paymentsArr = Array.isArray(invoice.payments) ? invoice.payments : [];
    const hasTripayPayment = paymentsArr.some((p: any) => String(p.confirmed_by) === 'TRIPAY_WEBHOOK');
    const selected = paymentsArr.find((p: any) => String(p.confirmed_by) === 'TRIPAY_WEBHOOK' && String(p.status) === 'SUCCESS');
    if (hasTripayPayment && selected && String(selected.gateway) !== 'TRIPAY') {
      throw new Error('Invalid payment source');
    }
    let transaction_history: { gateway: string; reference: string }[];
    if (selected) {
      const ordered = [selected, ...paymentsArr.filter((p: any) => p.id !== selected.id)];
      transaction_history = ordered.map((p: any) => ({
        gateway: `${String(p.gateway || 'UNKNOWN')}-${String(p.payment_method || 'UNKNOWN')}`,
        reference: String(p.gateway_transaction_id || '-')
      }));
    } else {
      transaction_history = [{ gateway: 'UNKNOWN', reference: '-' }];
    }
    return {
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      paid_at: invoice.paid_at,
      created_at: invoice.created_at,
      pdf_generated_at: invoice.pdf_generated_at,
      pdf_sha256: invoice.pdf_sha256,
      currency: 'IDR',
      transaction_history,
      payments: paymentsArr.map((p: any) => ({
        id: p.id,
        status: p.status,
        gateway: p.gateway,
        payment_method: p.payment_method,
        amount: p.amount,
        created_at: p.created_at,
        paid_at: p.paid_at
      })),
      subscription_id: invoice.subscription_id,

      issuer: {
        name: invoice.invoice_company_legal_name || invoice.invoice_company_trade_name,
        address: invoice.invoice_company_address,
        email: invoice.invoice_company_email_billing,
        phone: invoice.invoice_company_phone_billing,
        logo_url: invoice.invoice_company_logo_url,
        signature_name: invoice.invoice_company_signature_name,
        signature_title: invoice.invoice_company_signature_title,
      },

      tenant: {
        name: invoice.invoice_tenant_name || invoice.Tenant?.name || null,
        identifier: invoice.invoice_tenant_identifier || invoice.Tenant?.domain || null,
        address: invoice.invoice_tenant_address || (invoice.Tenant?.sekolah?.[0] ? [invoice.Tenant.sekolah[0].alamat, invoice.Tenant.sekolah[0].kota, invoice.Tenant.sekolah[0].provinsi].filter(Boolean).join(', ') : null),
      },

      subtotal_amount: Number(invoice.subtotal_amount || invoice.amount || 0),
      tax_rate: Number(invoice.tax_rate || 0),
      tax_amount: Number(invoice.tax_amount || 0),
      tax_label: invoice.tax_label,
      tax_type: invoice.tax_type || 'NONE',
      total_amount: Number(invoice.total_amount || invoice.amount || 0),

      items: [
        {
          description: description,
          quantity: 1,
          unit_price: Number(invoice.subtotal_amount || invoice.amount || 0),
          total: Number(invoice.subtotal_amount || invoice.amount || 0)
        }
      ],

      notes: invoice.notes,
      generated_at: invoice.created_at || new Date(),
      active_transaction: (() => {
        const activeTx = paymentsArr
          .filter((p: any) => p.gateway === 'TRIPAY' && ['UNPAID', 'PENDING'].includes(String(p.status).toUpperCase()))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        return activeTx ? {
          reference: activeTx.gateway_transaction_id,
          method: activeTx.payment_method
        } : null;
      })(),
      public_url: (() => {
        if (!token) return undefined;
        const mainDomain = String(process.env.MAIN_DOMAIN || 'localhost').trim();
        const tenantDomain = String(invoice.invoice_tenant_identifier || invoice.Tenant?.domain || '').trim();
        
        // Simple check if mainDomain is an IP address
        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(mainDomain);
        
        let host = mainDomain;
        if (!isIP && tenantDomain) {
          host = tenantDomain.includes('.') ? tenantDomain : `${tenantDomain}.${mainDomain}`;
        }
        
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const port = process.env.NODE_ENV === 'production' ? '' : ':5173';
        
        return `${protocol}://${host}${port}/invoice/public/${token}?verify=1`;
      })()
    } as unknown as PublicInvoiceResponse;
  }

  /**
   * Internal getter with RBAC for previewing invoice in Public Format
   * Returns token for public access launcher
   */
  async getInvoicePreview(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string
  ): Promise<PublicInvoiceResponse> {
    const invoice = await this.validateAccess(invoiceId, userRole, userTenantId);
    const formatted = this.formatPublicInvoiceResponse(invoice);

    // Get or generate public token for launcher button
    let token = await cacheService.get<string>(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId));
    
    if (!token) {
      // Generate new token if not exists (lazy generation for launcher)
      token = crypto.randomBytes(32).toString('hex');
      const ttl = (() => {
        const envTtl = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
        return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (7 * 24 * 60 * 60);
      })();
      const expiry = Date.now() + ttl * 1000;
      
      await Promise.all([
        cacheService.set(
          CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token),
          { invoice_id: invoiceId, tenant_id: (invoice as any).tenant_id, created_at: Date.now(), expiry },
          ttl
        ),
        cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId), token, ttl)
      ]);
    }

    formatted.public_token = token;
    return formatted;
  }

  /**
   * POST /invoice - Membuat invoice baru
   */
  async createInvoice(
    input: CreateInvoiceInput,
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceResponse> {
    return await createInvoiceCommand({
      input,
      userRole,
      userTenantId,
      helpers: {
        generateInvoiceNumber: () => this.generateInvoiceNumber(),
        requestInvoicePdfGeneration: (p) => this.requestInvoicePdfGeneration(p),
        formatInvoiceResponse: (inv) => this.formatInvoiceResponse(inv),
      },
    });
  }

  /**
   * PUT /invoice/:id - Update invoice (hanya status DRAFT)
   */
  async updateInvoice(
    invoiceId: string,
    input: UpdateInvoiceInput,
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceResponse> {
    // Validasi akses dan dapatkan invoice
    const invoice = await this.validateAccess(invoiceId, userRole, userTenantId);

    // Hanya invoice dengan status DRAFT yang dapat diupdate
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only DRAFT invoices can be updated');
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(input.due_date && { due_date: input.due_date }),
        ...(input.notes !== undefined && { notes: input.notes }),
        pdf_path: null,
        pdf_storage_provider: null,
        pdf_storage_key: null,
        pdf_sha256: null,
        pdf_generated_at: null,
        pdf_size_bytes: null,
        updated_at: new Date(),
      },
      include: {
        payments: true,
        Billing: {
          include: {
            Subscription: {
              include: {
                Tenant: true,
                Plan: true
              }
            }
          }
        }
      }
    });

    void this.requestInvoicePdfGeneration({
      invoiceId,
      tenantId: String(updatedInvoice.tenant_id || userTenantId || ''),
      publicBaseUrl: getSmartApiBaseUrl(),
    }).catch(() => {});

    return this.formatInvoiceResponse(updatedInvoice);
  }

  /**
   * PUT /invoice/:id/send - Mengirim invoice (update status ke SENT)
   */
  async sendInvoice(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string,
    sendOptions?: { recipient_email?: string; subject?: string; message?: string; attach_pdf?: boolean }
  ): Promise<InvoiceResponse> {
    return sendInvoiceCommand({
      invoiceId,
      userRole,
      userTenantId,
      sendOptions,
      validateAccess: this.validateAccess.bind(this),
      formatInvoiceResponse: this.formatInvoiceResponse.bind(this),
    });
  }

  /**
   * PUT /invoice/:id/pay - Menandai invoice sebagai lunas
   */
  async markAsPaid(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceResponse> {
    // Validasi akses dan dapatkan invoice
    const invoice = await this.validateAccess(invoiceId, userRole, userTenantId);

    // Hanya invoice dengan status SENT yang dapat ditandai sebagai lunas
    if (invoice.status !== InvoiceStatus.SENT) {
      throw new Error('Only SENT invoices can be marked as paid');
    }

    // Update status ke PAID
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paid_at: new Date(),
        updated_at: new Date(),
        // Clear cached PDF to force regeneration with PAID status
        pdf_path: null,
        pdf_storage_provider: null,
        pdf_storage_key: null,
        pdf_sha256: null,
        pdf_generated_at: null,
        pdf_size_bytes: null,
      },
      include: {
        payments: true,
        Billing: {
          include: {
            Subscription: {
              include: {
                Tenant: true,
                Plan: true
              }
            }
          }
        }
      }
    });

    observabilityService.logEvent({
      event_type: 'INVOICE_PAID',
      domain: 'INVOICE',
      severity: 'INFO',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      tenant_id: (updatedInvoice as any).Billing.Subscription.tenant_id,
      correlation_id: null,
      metadata: { billing_id: (updatedInvoice as any).billing_id },
    });

    return this.formatInvoiceResponse(updatedInvoice);
  }

  /**
   * DELETE /invoice/:id - Menghapus invoice (hanya status DRAFT)
   */
  async deleteInvoice(
    invoiceId: string,
    userRole: RoleName,
    userTenantId: string
  ): Promise<void> {
    // Validasi akses dan dapatkan invoice
    const invoice = await this.validateAccess(invoiceId, userRole, userTenantId);

    // Hanya invoice dengan status DRAFT yang dapat dihapus
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only DRAFT invoices can be deleted');
    }

    // Hapus invoice
    await prisma.invoice.delete({
      where: { id: invoiceId }
    });
  }

  /**
   * GET /invoice/stats - Mendapatkan statistik invoice
   */
  async getInvoiceStats(
    userRole: RoleName,
    userTenantId: string
  ): Promise<InvoiceStats> {
    // Build where clause berdasarkan role
    const whereClause: any = {};

    if (isSystemSuperAdmin(userRole, userTenantId)) {
      // System SUPERADMIN: global stats, no tenant filter
    } else if (userRole === RoleName.ADMIN || userRole === RoleName.SUPERADMIN) {
      // Tenant-scoped roles: restrict to own tenant
      whereClause.Billing = {
        Subscription: {
          tenant_id: userTenantId
        }
      };
    } else {
      throw new Error('Insufficient permissions');
    }

    // Get statistik invoice
    const [
      totalInvoices,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount
    ] = await Promise.all([
      prisma.invoice.count({ where: whereClause }),
      prisma.invoice.count({ where: { ...whereClause, status: InvoiceStatus.DRAFT } }),
      prisma.invoice.count({ where: { ...whereClause, status: InvoiceStatus.SENT } }),
      prisma.invoice.count({ where: { ...whereClause, status: InvoiceStatus.PAID } }),
      prisma.invoice.count({
        where: {
          ...whereClause,
          status: InvoiceStatus.SENT,
          due_date: { lt: new Date() }
        }
      }),
      prisma.invoice.aggregate({
        where: whereClause,
        _sum: { amount: true }
      }),
      prisma.invoice.aggregate({
        where: { ...whereClause, status: InvoiceStatus.PAID },
        _sum: { amount: true }
      })
    ]);

    const totalAmountValue = totalAmount._sum.amount || 0;
    const paidAmountValue = paidAmount._sum.amount || 0;
    const unpaidAmountValue = totalAmountValue - paidAmountValue;

    // Get overdue amount
    const overdueAmount = await prisma.invoice.aggregate({
      where: {
        ...whereClause,
        status: InvoiceStatus.SENT,
        due_date: { lt: new Date() }
      },
      _sum: { amount: true }
    });

    return {
      total_invoices: totalInvoices,
      draft_invoices: draftInvoices,
      sent_invoices: sentInvoices,
      paid_invoices: paidInvoices,
      overdue_invoices: overdueInvoices,
      total_amount: totalAmountValue,
      paid_amount: paidAmountValue,
      unpaid_amount: unpaidAmountValue,
      overdue_amount: overdueAmount._sum.amount || 0,
    };
  }

  /**
   * Generate invoice from billing - Method untuk billing controller
   */
  async generateInvoiceFromBilling(
    tenantId: string,
    billingId: string,
    invoiceData: { due_date: Date; notes?: string }
  ): Promise<InvoiceResponse> {
    return await generateInvoiceFromBillingCommand({
      tenantId,
      billingId,
      invoiceData,
      helpers: {
        generateInvoiceNumber: () => this.generateInvoiceNumber(),
        requestInvoicePdfGeneration: (p) => this.requestInvoicePdfGeneration(p),
        formatInvoiceResponse: (inv) => this.formatInvoiceResponse(inv),
      },
    });
  }
}

export const invoiceService = new InvoiceService();
