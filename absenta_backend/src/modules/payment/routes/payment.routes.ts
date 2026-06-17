
import { PrismaClient } from '@prisma/client';
import { PaymentController } from '../controllers/payment.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function paymentRoutes(fastify: any, prisma: PrismaClient) {
  const paymentController = new PaymentController();

  // Apply authentication and data scope middleware to all payment routes
  fastify.addHook('preHandler', determineDataScope());

  fastify.post('/create', {
    preHandler: [requireCapability('billing.payments.create')],
    schema: {
      body: {
        type: 'object',
        required: ['billing_id', 'gateway', 'method'],
        properties: {
          billing_id: { type: 'string' },
          gateway: { 
            type: 'string',
            enum: ['MIDTRANS', 'STRIPE', 'XENDIT', 'TRIPAY', 'MANUAL']
          },
          method: { 
            type: 'string',
            enum: ['QRIS', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'E_WALLET', 'CASH']
          },
          channel_code: { 
            type: 'string',
            description: 'Optional: specific Tripay channel code (e.g., BRIVA, DANA)'
          },
          customer_info: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' }
            }
          },
          return_url: { type: 'string' },
          cancel_url: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              // Allow all fields from PaymentResponse (camelCase) plus legacy snake_case aliases
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                payment_id: { type: 'string' },
                status: { type: 'string' },
                payment_url: { type: 'string' },
                paymentUrl: { type: 'string' },
                qr_code: { type: 'string' },
                qrString: { type: 'string' },
                virtual_account: { type: 'string' },
                gatewayTransactionId: { type: 'string' },
                expires_at: { type: 'string' },
                expiresAt: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, paymentController.createPayment.bind(paymentController));

  fastify.get('/:payment_id/status', {
    preHandler: [requireCapability('billing.payments.view.status')],
    schema: {
      params: {
        type: 'object',
        required: ['payment_id'],
        properties: {
          payment_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                payment_id: { type: 'string' },
                status: { type: 'string' },
                gateway: { type: 'string' },
                method: { type: 'string' },
                amount: { type: 'number' },
                paid_at: { type: 'string' },
                expires_at: { type: 'string' },
                proof_url: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }, paymentController.getPaymentStatus.bind(paymentController));

  // Cancel payment
  fastify.post('/:payment_id/cancel', {
    preHandler: [requireCapability('billing.payments.cancel')],
    schema: {
      params: {
        type: 'object',
        required: ['payment_id'],
        properties: {
          payment_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                payment_id: { type: 'string' },
                status: { type: 'string' },
                cancelled_at: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, paymentController.cancelPayment.bind(paymentController));

  // Confirm manual payment
  fastify.post('/:payment_id/confirm', {
    preHandler: [requireCapability('billing.payments.confirm')],
    schema: {
      params: {
        type: 'object',
        required: ['payment_id'],
        properties: {
          payment_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, (paymentController as any).confirmManualPayment.bind(paymentController));

  fastify.get('/list', {
    preHandler: [requireCapability('billing.payments.view.history')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          billing_id: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED']
          },
          gateway: { 
            type: 'string',
            enum: ['MIDTRANS', 'STRIPE', 'XENDIT', 'TRIPAY', 'MANUAL']
          },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                payments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      billing_id: { type: 'string' },
                      gateway: { type: 'string' },
                      method: { type: 'string' },
                      status: { type: 'string' },
                      amount: { type: 'number' },
                      created_at: { type: 'string' },
                      paid_at: { type: 'string' },
                      expires_at: { type: 'string' },
                      proof_url: { type: 'string', nullable: true }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    total_pages: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, paymentController.getPayments.bind(paymentController));

  // Payment retry endpoint
  fastify.post('/:payment_id/retry', {
    preHandler: [requireCapability('billing.payments.retry')],
    schema: {
      params: {
        type: 'object',
        required: ['payment_id'],
        properties: {
          payment_id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          gateway: { 
            type: 'string',
            enum: ['MIDTRANS', 'STRIPE', 'XENDIT', 'MANUAL']
          },
          method: { 
            type: 'string',
            enum: ['QRIS', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'E_WALLET', 'CASH']
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                payment_id: { type: 'string' },
                payment_url: { type: 'string' },
                qr_code: { type: 'string' },
                virtual_account: { type: 'string' },
                expires_at: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    // Retry payment by creating a new payment for the same billing
    const { payment_id } = request.params as { payment_id: string };
    const { gateway, method } = request.body as { gateway?: string; method?: string };
    
    try {
      // Get original payment to extract billing_id
      const originalPayment = await prisma.payment.findUnique({
        where: { id: payment_id },
        include: { Billing: true }
      });

      if (!originalPayment) {
        return reply.status(404).send({
          success: false,
          message: 'Payment not found'
        });
      }

      // Create new payment request
      const newRequest = {
        ...request,
        body: {
          billing_id: originalPayment.billing_id,
          gateway: gateway || originalPayment.gateway,
          method: method || originalPayment.payment_method
        }
      };

      return paymentController.createPayment(newRequest as any, reply);
    } catch (error) {
      console.error('Payment retry error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retry payment'
      });
    }
  });

  // Delete payment (soft delete)
  fastify.delete('/:payment_id', {
    preHandler: [requireCapability('billing.payments.delete')],
    schema: {
      params: {
        type: 'object',
        required: ['payment_id'],
        properties: {
          payment_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                deleted: { type: 'boolean' },
                payment_id: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, paymentController.deletePayment.bind(paymentController));

  // Get billing with payment summary
  fastify.get('/billing/:billingId/summary', {
    preHandler: [requireCapability('billing.payments.view.history')],
    schema: {
      params: {
        type: 'object',
        properties: {
          billingId: { type: 'string' },
        },
        required: ['billingId'],
      },
    },
  }, paymentController.getBillingWithPaymentSummary.bind(paymentController));

  // Get supported payment gateways
  fastify.get('/gateways', {
    preHandler: [requireCapability('billing.payments.view.history')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                gateways: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, paymentController.getSupportedGateways.bind(paymentController));

  // Get Tripay merchant channels
  fastify.get('/tripay/channels', {
    preHandler: [requireCapability('billing.payments.view.history')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true }
            }
          }
        }
      }
    }
  }, paymentController.getTripayMerchantChannels.bind(paymentController));

  // Get payment statistics
  fastify.get('/stats', {
    preHandler: [requireCapability("billing.view.monitoring")],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                overview: {
                  type: 'object',
                  properties: {
                    totalPayments: { type: 'number' },
                    successfulPayments: { type: 'number' },
                    pendingPayments: { type: 'number' },
                    failedPayments: { type: 'number' },
                    cancelledPayments: { type: 'number' },
                    totalAmount: { type: 'number' },
                    successfulAmount: { type: 'number' },
                    successRate: { type: 'number' }
                  }
                },
                gateways: { type: 'object' },
                methods: { type: 'object' },
                recent: {
                  type: 'object',
                  properties: {
                    totalPayments: { type: 'number' },
                    successfulPayments: { type: 'number' },
                    totalAmount: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, paymentController.getPaymentStats.bind(paymentController));

  // Payment module health check
  fastify.get('/health', {
    preHandler: [requireCapability("billing.view.monitoring")],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            module: { type: 'string' }
          }
        }
      }
    }
  }, async (_request: any, reply: any) => {
    try {
      return reply.send({
        success: true,
        message: 'Payment module is healthy',
        timestamp: new Date().toISOString(),
        module: 'payment'
      });
    } catch (error) {
      console.error('Payment health check error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Payment module is unhealthy',
        timestamp: new Date().toISOString(),
        module: 'payment'
      });
    }
  });

  // Mark invoice as paid (Moved from Invoice Routes for SA-IS Compliance)
  fastify.post('/invoice/:invoice_id/pay', {
    preHandler: [requireCapability('billing.invoices.pay')],
    schema: {
      params: {
        type: 'object',
        required: ['invoice_id'],
        properties: {
          invoice_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, paymentController.markInvoiceAsPaid.bind(paymentController));
}
