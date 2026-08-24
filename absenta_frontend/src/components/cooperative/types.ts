export interface CriticalStockItem {
  id: string;
  name: string;
  code: string;
  stock: number;
  minStock?: number;
  category?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  type?: string;
}

export interface SaleItem {
  id?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoice_number?: string;
  receipt_number?: string;
  created_at: string;
  total_amount: number;
  payment_method?: string;
  cashier_name?: string;
  items?: SaleItem[];
  Member?: {
    name?: string;
    member_number?: string;
  };
}

export interface CoopUserInfo {
  name: string;
  role: string;
  avatar?: string;
}
