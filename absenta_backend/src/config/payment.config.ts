import { getSmartApiBaseUrl, getSmartFrontendBaseUrl } from '../utils/url-helper';

export interface PaymentConfig {
  midtrans: {
    serverKey: string;
    clientKey: string;
    isProduction: boolean;
    webhookUrl: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    webhookUrl: string;
  };
  xendit: {
    secretKey: string;
    webhookToken: string;
    webhookUrl: string;
  };
  tripay: {
    apiKey: string;
    privateKey: string;
    merchantCode: string;
    webhookToken?: string;
    webhookUrl: string;
    isProduction: boolean;
  };
  general: {
    currency: string;
    expiryMinutes: number;
    callbackUrl: string;
    returnUrl: string;
    appUrl: string;
    frontendUrl: string;
  };
  manual?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    instructions: string[];
  };
}

export const paymentConfig: PaymentConfig = {
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    webhookUrl: process.env.MIDTRANS_WEBHOOK_URL || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    webhookUrl: process.env.STRIPE_WEBHOOK_URL || '',
  },
  xendit: {
    secretKey: process.env.XENDIT_SECRET_KEY || '',
    webhookToken: process.env.XENDIT_WEBHOOK_TOKEN || '',
    webhookUrl: process.env.XENDIT_WEBHOOK_URL || '',
  },
  tripay: {
    apiKey: process.env.TRIPAY_API_KEY || '',
    privateKey: process.env.TRIPAY_PRIVATE_KEY || '',
    merchantCode: process.env.TRIPAY_MERCHANT_CODE || '',
    webhookToken: process.env.TRIPAY_WEBHOOK_TOKEN || '',
    webhookUrl: process.env.TRIPAY_WEBHOOK_URL || '',
    isProduction: (process.env.TRIPAY_IS_PRODUCTION || 'false').toLowerCase() === 'true',
  },
  general: {
    currency: process.env.PAYMENT_CURRENCY || 'IDR',
    expiryMinutes: parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '1440'),
    callbackUrl: process.env.PAYMENT_CALLBACK_URL || '',
    returnUrl: process.env.PAYMENT_RETURN_URL || '',
    appUrl: getSmartApiBaseUrl(),
    frontendUrl: getSmartFrontendBaseUrl(),
  },
  manual: {
    bankName: process.env.MANUAL_BANK_NAME || 'BANK MANDIRI',
    accountNumber: process.env.MANUAL_BANK_ACCOUNT || '1234567890',
    accountHolder: process.env.MANUAL_BANK_HOLDER || 'PT BARAYA TEKNOLOGI INDONESIA',
    instructions: [
      'Lakukan transfer ke rekening di atas.',
      'Gunakan nominal yang sesuai (termasuk kode unik jika ada).',
      'Unggah bukti transfer pada halaman pembayaran.',
      'Tunggu tim kami melakukan verifikasi manual (maksimal 1x24 jam).'
    ]
  },
};

// Validation function
export const validatePaymentConfig = (): void => {
  const requiredEnvVars = [
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'XENDIT_SECRET_KEY',
    'XENDIT_WEBHOOK_TOKEN',
    'TRIPAY_API_KEY',
    'TRIPAY_PRIVATE_KEY',
    'TRIPAY_MERCHANT_CODE'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing payment gateway environment variables: ${missingVars.join(', ')}`);
  }
};
