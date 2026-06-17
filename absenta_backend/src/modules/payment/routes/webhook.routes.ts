
import { PrismaClient } from '@prisma/client';
import { WebhookController } from '../controllers/webhook.controller';

export async function webhookRoutes(fastify: any, prisma: PrismaClient) {
  const webhookController = new WebhookController(prisma);

  // Configure raw body parsing for webhooks
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req: any, body: any, done: any) => {
    try {
      (req as any).rawBody = body;
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });
  fastify.addContentTypeParser('application/*+json', { parseAs: 'buffer' }, (req: any, body: any, done: any) => {
    try {
      (req as any).rawBody = body;
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Midtrans webhook endpoint
  fastify.post('/midtrans', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'x-signature': { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' }
          }
        }
      }
    },
    config: {
      // Skip authentication for webhooks
      skipAuth: true,
      public: true
    }
  }, webhookController.handleMidtransWebhook.bind(webhookController));

  // Stripe webhook endpoint
  fastify.post('/stripe', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'stripe-signature': { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            received: { type: 'boolean' }
          }
        }
      }
    },
    config: {
      // Skip authentication for webhooks
      skipAuth: true,
      public: true
    }
  }, webhookController.handleStripeWebhook.bind(webhookController));

  // Xendit webhook endpoint
  fastify.post('/xendit', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'x-callback-token': { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' }
          }
        }
      }
    },
    config: {
      // Skip authentication for webhooks
      skipAuth: true,
      public: true
    }
  }, webhookController.handleXenditWebhook.bind(webhookController));

  // Tripay webhook endpoint
  fastify.post('/tripay', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'x-callback-signature': { type: 'string' },
          'x-callback-token': { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      }
    },
    config: {
      skipAuth: true,
      rawBody: true,
      public: true
    }
  }, webhookController.handleTripayWebhook.bind(webhookController));

  // Generic webhook endpoint for testing or future gateways
  fastify.post('/:gateway', {
    schema: {
      params: {
        type: 'object',
        required: ['gateway'],
        properties: {
          gateway: { 
            type: 'string',
            enum: ['midtrans', 'stripe', 'xendit', 'tripay']
          }
        }
      },
      headers: {
        type: 'object',
        properties: {
          'x-signature': { type: 'string' },
          'stripe-signature': { type: 'string' },
          'x-callback-token': { type: 'string' },
          'x-callback-signature': { type: 'string' }
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
    },
    config: {
      // Skip authentication for webhooks
      skipAuth: true,
      public: true
    }
  }, webhookController.handleGenericWebhook.bind(webhookController));

  // Webhook health check endpoint
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            gateways: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    config: {
      // Skip authentication for health check
      skipAuth: true,
      public: true
    }
  }, webhookController.webhookHealthCheck.bind(webhookController));

  // Webhook test endpoint for development
  fastify.post('/test/:gateway', {
    schema: {
      params: {
        type: 'object',
        required: ['gateway'],
        properties: {
          gateway: { 
            type: 'string',
            enum: ['midtrans', 'stripe', 'xendit', 'tripay']
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          payment_id: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['success', 'failed', 'pending', 'cancelled', 'expired']
          },
          amount: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            test_data: { type: 'object' }
          }
        }
      }
    },
    config: {
      // Skip authentication for test webhooks
      skipAuth: true,
      public: true
    }
  }, async (request: any, reply: any) => {
    // Test webhook endpoint for development/testing
    const { gateway } = request.params as { gateway: string };
    const body = request.body as any;

    try {
      // Create test webhook payload based on gateway
      let testPayload;
      let testSignature = 'test-signature';

      switch (gateway.toUpperCase()) {
        case 'MIDTRANS':
          testPayload = {
            order_id: body.payment_id || 'test-order-123',
            status_code: body.status === 'success' ? '200' : '400',
            transaction_status: body.status || 'settlement',
            gross_amount: body.amount || '100000.00',
            payment_type: 'qris',
            transaction_time: new Date().toISOString(),
            signature_key: testSignature
          };
          break;

        case 'STRIPE':
          testPayload = {
            id: 'evt_test_webhook',
            object: 'event',
            type: body.status === 'success' ? 'checkout.session.completed' : 'checkout.session.expired',
            data: {
              object: {
                id: body.payment_id || 'cs_test_123',
                payment_status: body.status === 'success' ? 'paid' : 'unpaid',
                amount_total: (body.amount || 100000) * 100, // Stripe uses cents
                currency: 'idr',
                metadata: {
                  order_id: body.payment_id || 'test-order-123'
                }
              }
            }
          };
          testSignature = 'test-stripe-signature';
          break;

        case 'XENDIT':
          testPayload = {
            id: body.payment_id || 'test-invoice-123',
            external_id: body.payment_id || 'test-order-123',
            status: body.status === 'success' ? 'PAID' : 'EXPIRED',
            amount: body.amount || 100000,
            currency: 'IDR',
            payment_method: 'QRIS',
            paid_at: body.status === 'success' ? new Date().toISOString() : null
          };
          testSignature = 'test-xendit-token';
          break;

        case 'TRIPAY':
          testPayload = {
            merchant_ref: body.payment_id || 'TRI-REF-123',
            status: body.status === 'success' ? 'PAID' : (body.status || 'FAILED').toUpperCase(),
            amount: body.amount || 100000,
          };
          testSignature = 'test-tripay-signature';
          break;

        default:
          return reply.status(400).send({
            success: false,
            message: 'Unsupported gateway for testing'
          });
      }

      return reply.status(200).send({
        success: true,
        message: `Test webhook payload generated for ${gateway}`,
        test_data: {
          payload: testPayload,
          signature: testSignature,
          gateway: gateway.toUpperCase(),
          note: 'This is a test payload for development purposes'
        }
      });
    } catch (error) {
      console.error('Test webhook error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to generate test webhook'
      });
    }
  });
}
