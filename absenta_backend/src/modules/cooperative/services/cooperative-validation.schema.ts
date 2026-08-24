import { z } from 'zod';

// === 1. Pinjaman (Loans) ===
export const createLoanSchema = z.object({
  memberId: z.string({
    required_error: 'memberId wajib diisi'
  }).uuid({ message: 'memberId harus berupa UUID yang valid' }),
  amount: z.coerce.number({
    invalid_type_error: 'amount harus berupa angka'
  }).min(1, 'Jumlah pinjaman minimal Rp 1'),
  interestRate: z.coerce.number({
    invalid_type_error: 'interestRate harus berupa angka'
  }).min(0, 'Suku bunga minimal 0%'),
  duration: z.coerce.number({
    invalid_type_error: 'duration harus berupa angka'
  }).int().min(1, 'Durasi minimal 1 bulan')
});

export const payInstallmentSchema = z.object({
  installmentId: z.string({
    required_error: 'installmentId wajib diisi'
  }).uuid({ message: 'installmentId harus berupa UUID yang valid' })
});

export const updateLoanStatusSchema = z.object({
  status: z.string({
    required_error: 'status wajib diisi'
  }).min(1, 'status tidak boleh kosong')
});

// === 2. Simpanan (Savings) ===
export const createSavingSchema = z.object({
  memberId: z.string({
    required_error: 'memberId wajib diisi'
  }).uuid({ message: 'memberId harus berupa UUID yang valid' }),
  categoryId: z.string({
    required_error: 'categoryId wajib diisi'
  }).uuid({ message: 'categoryId harus berupa UUID yang valid' }),
  initialAmount: z.coerce.number().min(0, 'Saldo awal tidak boleh negatif').optional().default(0)
});

export const processSavingTransactionSchema = z.object({
  savingId: z.string({
    required_error: 'savingId wajib diisi'
  }).uuid({ message: 'savingId harus berupa UUID yang valid' }),
  amount: z.coerce.number({
    invalid_type_error: 'amount harus berupa angka'
  }).min(1, 'Jumlah transaksi minimal Rp 1'),
  type: z.enum(['DEPOSIT', 'WITHDRAW'], {
    required_error: 'type transaksi wajib diisi (DEPOSIT / WITHDRAW)'
  }),
  description: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const createSavingCategorySchema = z.object({
  code: z.string({
    required_error: 'code wajib diisi'
  }).min(1, 'code tidak boleh kosong').max(20, 'code maksimal 20 karakter'),
  name: z.string({
    required_error: 'name wajib diisi'
  }).min(1, 'name tidak boleh kosong').max(100, 'name maksimal 100 karakter'),
  description: z.string().max(255, 'description maksimal 255 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  color: z.string().max(7).optional(),
  order: z.coerce.number().int().optional(),
  isMandatory: z.boolean().optional(),
  isWithdrawable: z.boolean().optional(),
  withdrawRule: z.string().optional(),
  defaultAmount: z.coerce.number().min(0).nullable().optional().transform(v => v === null ? undefined : v),
  isIncludedInShu: z.boolean().optional(),
  accountCode: z.string().optional()
});

export const updateSavingCategorySchema = z.object({
  code: z.string().min(1, 'code tidak boleh kosong').max(20, 'code maksimal 20 karakter').optional(),
  name: z.string().min(1, 'name tidak boleh kosong').max(100, 'name maksimal 100 karakter').optional(),
  description: z.string().max(255, 'description maksimal 255 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  color: z.string().max(7).optional(),
  order: z.coerce.number().int().optional(),
  isMandatory: z.boolean().optional(),
  isWithdrawable: z.boolean().optional(),
  withdrawRule: z.string().optional(),
  defaultAmount: z.coerce.number().min(0).nullable().optional().transform(v => v === null ? undefined : v),
  isIncludedInShu: z.boolean().optional(),
  accountCode: z.string().optional()
});

// === 3. Toko & POS (Shop) ===
export const createProductSchema = z.object({
  name: z.string({
    required_error: 'Nama produk wajib diisi'
  }).min(1, 'Nama produk tidak boleh kosong'),
  code: z.string({
    required_error: 'Kode produk wajib diisi'
  }).min(1, 'Kode produk tidak boleh kosong'),
  description: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  price: z.coerce.number({
    invalid_type_error: 'Harga jual harus berupa angka'
  }).min(0, 'Harga jual tidak boleh negatif'),
  costPrice: z.coerce.number().min(0, 'Harga modal tidak boleh negatif').optional(),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif').optional(),
  minStock: z.coerce.number().int().min(0, 'Batas minimum stok tidak boleh negatif').optional(),
  category: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  imageUrl: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  productType: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  showInTransaction: z.boolean().optional(),
  useStock: z.boolean().optional(),
  weight: z.coerce.number().min(0, 'Berat tidak boleh negatif').optional(),
  unit: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  discount: z.coerce.number().min(0, 'Diskon tidak boleh negatif').optional(),
  discountType: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  rackLocation: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  barcode: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Nama produk tidak boleh kosong').optional(),
  code: z.string().min(1, 'Kode produk tidak boleh kosong').optional(),
  description: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  price: z.coerce.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  costPrice: z.coerce.number().min(0, 'Harga modal tidak boleh negatif').optional(),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif').optional(),
  minStock: z.coerce.number().int().min(0, 'Batas minimum stok tidak boleh negatif').optional(),
  category: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  imageUrl: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  productType: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  showInTransaction: z.boolean().optional(),
  useStock: z.boolean().optional(),
  weight: z.coerce.number().min(0, 'Berat tidak boleh negatif').optional(),
  unit: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  discount: z.coerce.number().min(0, 'Diskon tidak boleh negatif').optional(),
  discountType: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  rackLocation: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  barcode: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const posCheckoutSchema = z.object({
  memberId: z.string().uuid({ message: 'memberId harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  items: z.array(
    z.object({
      productId: z.string({
        required_error: 'productId wajib diisi'
      }).uuid({ message: 'productId harus berupa UUID yang valid' }),
      quantity: z.coerce.number({
        invalid_type_error: 'quantity harus berupa angka'
      }).int().min(1, 'Kuantitas minimal 1')
    })
  ).min(1, 'Minimal satu produk harus dipilih'),
  paymentMethod: z.enum(['CASH', 'SAVING'], {
    required_error: 'paymentMethod wajib diisi (CASH / SAVING)'
  }),
  cashAmount: z.coerce.number().min(0).nullable().optional().transform(v => v === null ? undefined : v),
  changeAmount: z.coerce.number().nullable().optional().transform(v => v === null ? undefined : v),
  pin: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  voucherCode: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const adjustStockSchema = z.object({
  newStock: z.coerce.number({
    required_error: 'newStock wajib diisi'
  }).int().min(0, 'Stok baru tidak boleh negatif'),
  reason: z.string().optional()
});

export const createProductCategorySchema = z.object({
  name: z.string({
    required_error: 'Nama kategori wajib diisi'
  }).min(1, 'Nama kategori tidak boleh kosong'),
  description: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const updateProductCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori tidak boleh kosong').optional(),
  description: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const createOpnameSessionSchema = z.object({
  notes: z.string().optional(),
  categoryFilter: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

export const updateOpnameSessionItemsSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string({
        required_error: 'productId wajib diisi'
      }).uuid({ message: 'productId harus berupa UUID yang valid' }),
      physicalCount: z.coerce.number({
        required_error: 'physicalCount wajib diisi'
      }).int().min(0, 'Jumlah fisik tidak boleh negatif')
    })
  ).min(1, 'Minimal satu item harus diperbarui')
});

export const rfidCheckoutSchema = z.object({
  rfid: z.string({
    required_error: 'RFID wajib diisi'
  }).min(1, 'RFID tidak boleh kosong'),
  items: z.array(
    z.object({
      productId: z.string({
        required_error: 'productId wajib diisi'
      }).uuid({ message: 'productId harus berupa UUID yang valid' }),
      quantity: z.coerce.number({
        invalid_type_error: 'quantity harus berupa angka'
      }).int().min(1, 'Kuantitas minimal 1')
    })
  ).min(1, 'Minimal satu produk harus dipilih'),
  pin: z.string().nullable().optional().transform(v => v === null ? undefined : v),
  voucherCode: z.string().nullable().optional().transform(v => v === null ? undefined : v)
});

// === 4. PPOB ===
export const createPpobProductSchema = z.object({
  code: z.string({
    required_error: 'code wajib diisi'
  }).min(1, 'code tidak boleh kosong'),
  name: z.string({
    required_error: 'name wajib diisi'
  }).min(1, 'name tidak boleh kosong'),
  provider: z.string({
    required_error: 'provider wajib diisi'
  }).min(1, 'provider tidak boleh kosong'),
  type: z.string({
    required_error: 'type wajib diisi'
  }).min(1, 'type tidak boleh kosong'),
  price: z.coerce.number({
    invalid_type_error: 'price harus berupa angka'
  }).min(0, 'Harga tidak boleh negatif'),
  fee: z.coerce.number().min(0, 'Biaya tidak boleh negatif').optional().default(0)
});

export const createPpobTransactionSchema = z.object({
  productId: z.string({
    required_error: 'productId wajib diisi'
  }).uuid({ message: 'productId harus berupa UUID yang valid' }),
  customerNo: z.string({
    required_error: 'customerNo wajib diisi'
  }).min(1, 'Nomor customer tidak boleh kosong'),
  amount: z.coerce.number({
    invalid_type_error: 'amount harus berupa angka'
  }).min(0, 'Jumlah tidak boleh negatif')
});
