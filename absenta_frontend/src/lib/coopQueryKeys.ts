import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized Query Keys for Cooperative (Toko, Kasir/POS, Anggota, Laporan, Supplier)
 * Unifies fragmented query keys across the entire application.
 */
export const COOP_QUERY_KEYS = {
  // ─── Products & Catalog ───────────────────────────────────────────────────
  products: ['koperasi-products'] as const,
  productsCatalog: ['koperasi-products-catalog'] as const,
  productOptions: (search = '') => ['koperasi-products-options-list', search] as const,
  categories: ['koperasi-products-categories'] as const,
  productLogs: (id?: string) => ['koperasi-product-logs', id || ''] as const,

  // ─── Suppliers ────────────────────────────────────────────────────────────
  suppliers: ['coop-suppliers'] as const,
  supplierDetail: (id: string) => ['coop-suppliers', id] as const,

  // ─── Stock In & Opname ────────────────────────────────────────────────────
  stockInHistory: (supplier = '', startDate = '', endDate = '') =>
    ['koperasi-stock-in-history', supplier, startDate, endDate] as const,
  opnameHistory: ['koperasi-opname-history'] as const,

  // ─── POS & Transactions ───────────────────────────────────────────────────
  // Note: posProducts & posCategories are unified with catalog queries
  posProducts: ['koperasi-products-catalog'] as const,
  posCategories: ['koperasi-products-categories'] as const,
  posHistory: ['koperasi-pos-history'] as const,

  // ─── Members & Settings ───────────────────────────────────────────────────
  membersList: ['koperasi-members-list'] as const,
  memberMe: ['koperasi-member-me'] as const,
  memberStatusMe: ['koperasi-member-status-me'] as const,
  settings: ['koperasi-settings'] as const,
  settingsDetail: ['koperasi-settings-detail'] as const,

  // ─── Reports & Accounting ─────────────────────────────────────────────────
  inventoryStock: ['koperasi-reports-inventory-stock'] as const,
  inventoryValuation: ['koperasi-reports-inventory-valuation'] as const,
  inventoryPurchases: (startDate = '', endDate = '', supplier = '') =>
    ['koperasi-reports-inventory-purchases', startDate, endDate, supplier] as const,
  accountingJournals: ['koperasi-accounting-journals'] as const,
  accountingBalanceSheet: ['koperasi-accounting-balance-sheet'] as const,
  accountingPayroll: (month = '', year = '') =>
    ['koperasi-accounting-payroll', month, year] as const,
  accountingIncomeStatement: ['koperasi-income-statement'] as const,
  accountingBalanceSheetReport: ['koperasi-balance-sheet-report'] as const,
  accountingCashFlow: ['koperasi-cash-flow'] as const,
  accountingGeneralLedger: ['cooperative-general-ledger'] as const,

  // ─── Assets & Depreciation ────────────────────────────────────────────────
  assets: ['cooperative-assets'] as const,
  assetDepreciationStatus: (year?: number, month?: number) =>
    ['cooperative-asset-depreciation-status', year ?? '', month ?? ''] as const,

  // ─── SHU & Savings & Loans ────────────────────────────────────────────────
  savingsList: ['koperasi-savings-list'] as const,
  savingCategories: ['koperasi-saving-categories'] as const,
  loansList: ['koperasi-loans-list'] as const,
  shuPeriods: ['koperasi-shu-periods'] as const,
  shuConfig: ['koperasi-shu-config'] as const,
  shuPeriodDetail: (id: string) => ['koperasi-shu-period-detail', id] as const,
  shuMyHistory: ['koperasi-shu-my-history'] as const,

  // ─── Vouchers & Points ────────────────────────────────────────────────────
  vouchers: ['koperasi-vouchers-list'] as const,
  pointsHistory: ['koperasi-points-history'] as const,
  mySavingsSummary: ['koperasi-my-savings-summary'] as const,

  // ─── Sales Report (Laporan Penjualan Toko) ────────────────────────────────
  salesSummary: (startDate = '', endDate = '', paymentMethod = '') =>
    ['coop-sales-report-summary', startDate, endDate, paymentMethod] as const,
  salesTransactions: (page = 1, limit = 15, startDate = '', endDate = '', paymentMethod = '', search = '') =>
    ['coop-sales-report-transactions', page, limit, startDate, endDate, paymentMethod, search] as const,
  salesTopProducts: (startDate = '', endDate = '') =>
    ['coop-sales-report-top-products', startDate, endDate] as const,
  salesDaily: (startDate = '', endDate = '') =>
    ['coop-sales-report-daily', startDate, endDate] as const,

  // ─── Pusat Aduan (Tickets & Support) ──────────────────────────────────────
  ticketsList: (scope = 'all') => ['koperasi-tickets-list', scope] as const,
  ticketDetail: (id: string) => ['koperasi-ticket-detail', id] as const,

  // ─── Pengumuman (Announcements) ───────────────────────────────────────────
  announcements: ['koperasi-announcements-list'] as const,
} as const;

/**
 * Invalidate all product inventory and catalog caches at once across all tabs & POS.
 */
export function invalidateAllProductCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.productsCatalog });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.products });
  queryClient.invalidateQueries({ queryKey: ['koperasi-products-options-list'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.inventoryStock });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.inventoryValuation });
}

/**
 * Invalidate all stock-in & purchase related caches.
 */
export function invalidateStockInCaches(queryClient: QueryClient) {
  invalidateAllProductCaches(queryClient);
  queryClient.invalidateQueries({ queryKey: ['koperasi-stock-in-history'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-reports-inventory-purchases'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.suppliers });
}

/**
 * Invalidate all supplier caches and related downstream stock-in / purchase queries.
 */
export function invalidateSupplierCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.suppliers });
  queryClient.invalidateQueries({ queryKey: ['koperasi-stock-in-history'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-reports-inventory-purchases'] });
}

/**
 * Invalidate all voucher and points related queries.
 */
export function invalidateVoucherCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.vouchers });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.pointsHistory });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.mySavingsSummary });
  queryClient.invalidateQueries({ queryKey: ['coop-vouchers'] });
}

/**
 * Invalidate all accounting, financial reports, and general ledger caches.
 */
export function invalidateAccountingCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingJournals });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingBalanceSheet });
  queryClient.invalidateQueries({ queryKey: ['koperasi-accounting-payroll'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingIncomeStatement });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingBalanceSheetReport });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingCashFlow });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.accountingGeneralLedger });
  queryClient.invalidateQueries({ queryKey: ['cooperative-journals'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-deposits'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-transfers'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.assets });
  queryClient.invalidateQueries({ queryKey: ['cooperative-asset-depreciation-status'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-shu-periods'] });
}

/**
 * Invalidate all sales report queries (summary, transactions, top products, daily).
 */
export function invalidateSalesReportCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['coop-sales-report-summary'] });
  queryClient.invalidateQueries({ queryKey: ['coop-sales-report-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['coop-sales-report-top-products'] });
  queryClient.invalidateQueries({ queryKey: ['coop-sales-report-daily'] });
}

/**
 * Invalidate all POS, sales reports, catalog and inventory caches on sale or stock update.
 */
export function invalidatePosCaches(queryClient: QueryClient) {
  invalidateAllProductCaches(queryClient);
  invalidateSalesReportCaches(queryClient);
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.posProducts });
  queryClient.invalidateQueries({ queryKey: ['koperasi-pos-products'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.posHistory });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.memberMe });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingsList });
}

/**
 * Invalidate all cooperative ticket and complaint center queries.
 */
export function invalidateTicketCaches(queryClient: QueryClient, ticketId?: string) {
  queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
  if (ticketId) {
    queryClient.invalidateQueries({ queryKey: ['koperasi-ticket-detail', ticketId] });
  }
}

/**
 * Invalidate all cooperative announcement queries.
 */
export function invalidateAnnouncementCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.announcements });
}

/**
 * Invalidate all cooperative SHU queries (periods, config, personal history, and optional period detail).
 */
export function invalidateShuCaches(queryClient: QueryClient, periodId?: string) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.shuPeriods });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.shuConfig });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.shuMyHistory });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.memberStatusMe });
  if (periodId) {
    queryClient.invalidateQueries({ queryKey: ['koperasi-shu-period-detail', periodId] });
  }
}

/**
 * Invalidate all cooperative savings queries (accounts, categories, member transactions, insights).
 */
export function invalidateSavingsCaches(queryClient: QueryClient, savingId?: string) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingsList });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingCategories });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.mySavingsSummary });
  queryClient.invalidateQueries({ queryKey: ['koperasi-saving-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-member-status-me'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-my-savings-detail'] });
  queryClient.invalidateQueries({ queryKey: ['my-shu-live-estimate'] });
  if (savingId) {
    queryClient.invalidateQueries({ queryKey: ['koperasi-saving-detail', savingId] });
  }
}

/**
 * Invalidate all cooperative loan queries (loan list, loan installments, member metrics).
 */
export function invalidateLoansCaches(queryClient: QueryClient, loanId?: string) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.loansList });
  queryClient.invalidateQueries({ queryKey: ['cooperative-loans'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-student-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-operator-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-loan-installments'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-loan-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-member-status-me'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingsList });
  if (loanId) {
    queryClient.invalidateQueries({ queryKey: ['koperasi-loan-detail', loanId] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-loan-detail', loanId] });
  }
}

/**
 * Invalidate all cooperative member queries (member list, status, non-members, savings, stats).
 */
export function invalidateMembersCaches(queryClient: QueryClient, memberId?: string) {
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.membersList });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.memberMe });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.memberStatusMe });
  queryClient.invalidateQueries({ queryKey: ['cooperative-members'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-member-stats'] });
  queryClient.invalidateQueries({ queryKey: ['koperasi-non-members'] });
  queryClient.invalidateQueries({ queryKey: ['cooperative-members-active-list'] });
  queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingsList });
  if (memberId) {
    queryClient.invalidateQueries({ queryKey: ['koperasi-member-detail', memberId] });
  }
}

