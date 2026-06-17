# Base Layout System Documentation

## 📋 Overview

Sistem Base Layout menyediakan komponen layout yang konsisten dan dapat digunakan kembali untuk modul Billing dan Invoice. Sistem ini terdiri dari beberapa komponen utama:

1. **BaseLayout** - Komponen layout dasar
2. **UnifiedBillingLayout** - Wrapper untuk modul billing
3. **UnifiedInvoiceLayout** - Wrapper untuk modul invoice
4. **layoutConfig** - Konfigurasi terpusat
5. **layoutUtils** - Utility functions

## 🏗️ Struktur Komponen

```
src/
├── components/
│   ├── common/
│   │   └── BaseLayout.tsx          # Komponen layout dasar
│   ├── billing/
│   │   ├── UnifiedBillingLayout.tsx    # Wrapper billing
│   │   └── BillingDashboardExample.tsx # Contoh implementasi
│   └── invoice/
│       ├── UnifiedInvoiceLayout.tsx    # Wrapper invoice
│       └── InvoiceListExample.tsx      # Contoh implementasi
├── config/
│   └── layoutConfig.ts             # Konfigurasi layout
└── utils/
    └── layoutUtils.ts              # Utility functions
```

## 🚀 Cara Penggunaan

### 1. Menggunakan UnifiedBillingLayout

```tsx
import React from 'react';
import UnifiedBillingLayout from '../components/billing/UnifiedBillingLayout';

const BillingPage: React.FC = () => {
  return (
    <UnifiedBillingLayout
      pageKey="dashboard"
      breadcrumbItems={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Billing' }
      ]}
    >
      {/* Konten halaman billing */}
      <div>Your billing content here</div>
    </UnifiedBillingLayout>
  );
};
```

### 2. Menggunakan UnifiedInvoiceLayout

```tsx
import React from 'react';
import UnifiedInvoiceLayout from '../components/invoice/UnifiedInvoiceLayout';

const InvoicePage: React.FC = () => {
  return (
    <UnifiedInvoiceLayout
      pageKey="invoices"
      breadcrumbItems={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Invoice' }
      ]}
    >
      {/* Konten halaman invoice */}
      <div>Your invoice content here</div>
    </UnifiedInvoiceLayout>
  );
};
```

### 3. Menggunakan BaseLayout Langsung

```tsx
import React from 'react';
import BaseLayout from '../components/common/BaseLayout';
import { getTabItems } from '../config/layoutConfig';

const CustomPage: React.FC = () => {
  const customMetrics = [
    {
      key: 'custom_metric',
      label: 'Custom Metric',
      value: '1,234',
      change: '+12% dari bulan lalu',
      changeType: 'positive' as const,
      icon: <DollarSign size={20} />,
      color: 'blue' as const
    }
  ];

  return (
    <BaseLayout
      title="Custom Page"
      subtitle="Halaman kustom dengan layout standar"
      showOverview={true}
      metrics={customMetrics}
      tabs={getTabItems('billing')}
      moduleName="Custom Module"
    >
      {/* Konten kustom */}
      <div>Your custom content here</div>
    </BaseLayout>
  );
};
```

## ⚙️ Konfigurasi

### Page Configuration

Konfigurasi halaman dapat diatur di `src/config/layoutConfig.ts`:

```typescript
export const billingPageConfig = {
  dashboard: {
    title: 'Billing Dashboard',
    subtitle: 'Kelola billing dan pembayaran',
    showOverview: true,
    // ... konfigurasi lainnya
  },
  // ... halaman lainnya
};
```

### Tab Navigation

Tab navigasi dapat dikonfigurasi untuk setiap modul:

```typescript
export const billingTabItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/billing/dashboard',
    icon: BarChart3
  },
  // ... tab lainnya
];
```

## 🎨 Customization

### Custom Metrics

Anda dapat menyediakan metrics kustom:

```tsx
const customMetrics = [
  {
    key: 'revenue',
    label: 'Total Revenue',
    value: 'Rp 125.700.000',
    change: '+13.6% dari bulan lalu',
    changeType: 'positive',
    icon: <DollarSign size={20} />,
    color: 'green'
  }
];

<UnifiedBillingLayout customMetrics={customMetrics}>
  {/* content */}
</UnifiedBillingLayout>
```

### Override Props

Semua wrapper layout mendukung override props:

```tsx
<UnifiedBillingLayout
  title="Custom Title"           // Override title
  subtitle="Custom Subtitle"     // Override subtitle
  showOverview={false}          // Hide overview metrics
  pageKey="custom"              // Custom page configuration
>
  {/* content */}
</UnifiedBillingLayout>
```

## 🛠️ Utility Functions

### Formatting

```typescript
import { 
  formatCurrency, 
  formatNumber, 
  formatPercentage,
  formatDate 
} from '../utils/layoutUtils';

const amount = formatCurrency(1500000);        // "Rp 1.500.000"
const number = formatNumber(1234);             // "1,234"
const percentage = formatPercentage(15.5);     // "15.5%"
const date = formatDate(new Date());           // "25 Jan 2024"
```

### Status Handling

```typescript
import { getStatusBadgeClass, getStatusLabel } from '../utils/layoutUtils';

const badgeClass = getStatusBadgeClass('paid');    // "bg-green-100 text-green-800"
const label = getStatusLabel('paid');              // "Paid"
```

### Calculations

```typescript
import { 
  calculatePercentageChange, 
  calculateTotal, 
  calculateAverage 
} from '../utils/layoutUtils';

const change = calculatePercentageChange(100, 120);  // 20
const total = calculateTotal([100, 200, 300]);       // 600
const average = calculateAverage([100, 200, 300]);   // 200
```

## 📊 Metrics Configuration

### Metric Card Structure

```typescript
interface BaseMetricCard {
  key: string;                    // Unique identifier
  label: string;                  // Display label
  value: string;                  // Formatted value
  change?: string;                // Change description
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;         // Icon component
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}
```

### Auto-generated Metrics

Layout wrapper akan otomatis generate metrics dari API data:

```typescript
// Billing metrics akan di-generate dari BillingStats
// Invoice metrics akan di-generate dari InvoiceStats
```

## 🔧 API Integration

### Connecting to API

Untuk mengintegrasikan dengan API yang sebenarnya:

1. **Uncomment API calls** di wrapper components
2. **Import API functions** yang sesuai
3. **Update mock data** dengan real API responses

```typescript
// Di UnifiedBillingLayout.tsx
import { getBillingStats } from '../../api/billing.api';

const loadBillingStats = async () => {
  try {
    // Uncomment this line:
    const response = await getBillingStats();
    setStats(response.data);
    
    // Remove mock data
  } catch (error) {
    // Handle error
  }
};
```

## 🎯 Best Practices

### 1. Konsistensi
- Gunakan wrapper layout yang sesuai untuk setiap modul
- Ikuti konvensi penamaan yang sudah ditetapkan
- Gunakan utility functions untuk formatting

### 2. Performance
- Lazy load metrics data jika tidak diperlukan
- Implement proper error handling
- Use React.memo untuk komponen yang tidak sering berubah

### 3. Accessibility
- Pastikan semua interactive elements dapat diakses keyboard
- Gunakan semantic HTML
- Provide proper ARIA labels

### 4. Responsive Design
- Layout sudah responsive by default
- Test di berbagai ukuran layar
- Gunakan breakpoint yang konsisten

## 🐛 Troubleshooting

### Common Issues

1. **Metrics tidak muncul**
   - Pastikan `showOverview` tidak di-set ke `false`
   - Check API connection dan data format

2. **Tab navigation tidak berfungsi**
   - Pastikan routing sudah dikonfigurasi dengan benar
   - Check tab configuration di `layoutConfig.ts`

3. **Styling tidak konsisten**
   - Pastikan menggunakan utility classes yang sama
   - Check CSS conflicts dengan komponen lain

### Debug Mode

Enable debug mode untuk melihat informasi tambahan:

```typescript
// Set environment variable
REACT_APP_DEBUG_LAYOUT=true
```

## 📝 Migration Guide

### Dari Layout Lama ke Layout Baru

1. **Replace import statements**:
   ```typescript
   // Lama
   import BillingLayout from './BillingLayout';
   
   // Baru
   import UnifiedBillingLayout from './UnifiedBillingLayout';
   ```

2. **Update component usage**:
   ```typescript
   // Lama
   <BillingLayout>
     <div>Content</div>
   </BillingLayout>
   
   // Baru
   <UnifiedBillingLayout pageKey="dashboard">
     <div>Content</div>
   </UnifiedBillingLayout>
   ```

3. **Migrate configurations**:
   - Move tab configurations to `layoutConfig.ts`
   - Update metric calculations to use `layoutUtils.ts`

## 🤝 Contributing

Untuk berkontribusi pada sistem layout:

1. Follow existing code patterns
2. Add proper TypeScript types
3. Include documentation untuk fitur baru
4. Test di berbagai skenario
5. Update README jika diperlukan

## 📚 Examples

Lihat file example untuk implementasi lengkap:
- `BillingDashboardExample.tsx` - Contoh billing dashboard
- `InvoiceListExample.tsx` - Contoh invoice list

---

**Catatan**: Sistem ini dirancang untuk memberikan konsistensi dan kemudahan maintenance. Jika ada kebutuhan khusus yang tidak tercakup, silakan diskusikan dengan tim development.