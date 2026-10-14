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
  shuMyHistory: ['koperasi-shu-my-history'] as const,
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

