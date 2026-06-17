import { PrismaClient, PaymentGateway } from '@prisma/client';
import { PaymentService } from '../../../types/payment.types';
import { MidtransPaymentService } from './midtrans.payment.service';
import { StripePaymentService } from './stripe.payment.service';
import { XenditPaymentService } from './xendit.payment.service';
import { TripayPaymentService } from './tripay.payment.service';
import { ManualPaymentService } from './manual.payment.service';
import { paymentConfig } from '../../../config/payment.config';

export class PaymentFactoryService {
  private prisma: PrismaClient;
  private services: Map<PaymentGateway, PaymentService>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.services = new Map();
    this.initializeServices();
  }

  private initializeServices(): void {
    this.services.set(PaymentGateway.MIDTRANS, new MidtransPaymentService(this.prisma));
    this.services.set(PaymentGateway.XENDIT, new XenditPaymentService(this.prisma));
    this.services.set(PaymentGateway.TRIPAY, new TripayPaymentService(this.prisma));
    this.services.set(PaymentGateway.MANUAL, new ManualPaymentService(this.prisma));
    if (String(paymentConfig.stripe.secretKey || '').trim()) {
      this.services.set(PaymentGateway.STRIPE, new StripePaymentService(this.prisma));
    }
  }

  getPaymentService(gateway: PaymentGateway): PaymentService {
    const service = this.services.get(gateway);
    if (!service) {
      throw new Error(`Payment service for gateway ${gateway} not found`);
    }
    return service;
  }

  getAllSupportedGateways(): PaymentGateway[] {
    return Array.from(this.services.keys());
  }

  isGatewaySupported(gateway: PaymentGateway): boolean {
    return this.services.has(gateway);
  }
}
