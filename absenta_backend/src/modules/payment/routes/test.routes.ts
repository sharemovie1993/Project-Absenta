import { PaymentTestController } from '../controllers/test.controller';
import { PaymentService } from '../services/payment.service';
import { PrismaClient } from '@prisma/client';
import { requireCapability } from '@/middlewares/requireCapability';
import { paymentConfig } from '@/config/payment.config';

const prisma = new PrismaClient();

export async function testRoutes(fastify: any) {
  const paymentService = new PaymentService();
  const testController = new PaymentTestController(prisma, paymentService);

  // Test webhook processing for specific gateway and scenario
  fastify.post('/test/webhook', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Test webhook processing for specific gateway and scenario',
      tags: ['Payment Testing'],
      body: {
        type: 'object',
        required: ['gateway', 'scenario'],
        properties: {
          gateway: {
            type: 'string',
            enum: ['STRIPE', 'MIDTRANS', 'XENDIT', 'TRIPAY', 'stripe', 'midtrans', 'xendit', 'tripay'],
            description: 'Payment gateway to test'
          },
          scenario: {
            type: 'string',
            enum: ['success', 'failed', 'expired', 'cancelled'],
            description: 'Test scenario to simulate'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    handler: testController.testWebhookProcessing.bind(testController)
  });

  // Test all gateways with all scenarios (comprehensive test)
  fastify.post('/test/comprehensive', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Run comprehensive tests for all payment gateways and scenarios',
      tags: ['Payment Testing'],
      body: {
        type: 'object',
        properties: {
          includeSignatureTests: { type: 'boolean' },
          includeIdempotencyTests: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            summary: { type: 'object' },
            results: { type: 'array' }
          }
        }
      }
    },
    handler: testController.testAllGatewaysAllScenarios.bind(testController)
  });

  // Simulate webhook for specific gateway
  fastify.post('/test/simulate/:gateway', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      params: {
        type: 'object',
        properties: {
          gateway: { type: 'string', enum: ['MIDTRANS', 'STRIPE', 'XENDIT', 'TRIPAY', 'midtrans', 'stripe', 'xendit', 'tripay'] }
        },
        required: ['gateway']
      },
      body: {
        type: 'object',
        properties: {
          scenario: { type: 'string', enum: ['success', 'failed', 'expired', 'cancelled'] },
          customData: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
   }, testController.simulateWebhook.bind(testController));

  fastify.get('/test/scenarios', {
    preHandler: [requireCapability('payments.test.simulate')],
    handler: async (_request: any, reply: any) => {
      return reply.status(200).send({
        success: true,
        message: 'Available payment simulation scenarios',
        data: {
          scenarios: ['success', 'failed', 'expired', 'cancelled'],
          gateways: ['tripay', 'midtrans', 'xendit', 'stripe'],
        },
      });
    },
  });

  fastify.get('/test/:gateway/health', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      params: {
        type: 'object',
        required: ['gateway'],
        properties: {
          gateway: { type: 'string' },
        },
      },
    },
    handler: async (request: any, reply: any) => {
      const raw = String(request.params?.gateway || '').trim().toLowerCase();
      if (raw !== 'tripay') {
        return reply.status(404).send({ success: false, message: 'Health endpoint only available for tripay' });
      }

      const configured = Boolean(
        String(paymentConfig?.tripay?.apiKey || '').trim() && String(paymentConfig?.tripay?.merchantCode || '').trim()
      );
      return reply.status(200).send({
        success: configured,
        message: configured ? 'Tripay integration configured' : 'Tripay integration not configured',
        data: {
          gateway: 'tripay',
          configured,
        },
      });
    },
  });
 
   // Enhanced comprehensive test
   fastify.post('/test/comprehensive-new', {
     preHandler: [requireCapability('payments.test.simulate')],
     schema: {
       response: {
         200: {
           type: 'object',
           properties: {
             success: { type: 'boolean' },
             message: { type: 'string' },
             summary: { type: 'object' },
             results: { type: 'array' }
           }
         }
       }
     }
  }, testController.testComprehensiveNew.bind(testController));

  // Create callback target (test payment for webhook testing)
  fastify.post('/test/callback-target', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Create a test payment as callback target for Tripay webhook testing',
      tags: ['Payment Testing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                billingId: { type: 'string' },
                paymentId: { type: 'string' },
                gatewayTransactionId: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, testController.createCallbackTarget.bind(testController));

  // Test idempotency handling
  fastify.post('/test/idempotency', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Test webhook idempotency handling',
      tags: ['Payment Testing'],
      body: {
        type: 'object',
        required: ['gateway'],
        properties: {
          gateway: {
            type: 'string',
            enum: ['STRIPE', 'MIDTRANS', 'XENDIT', 'TRIPAY'],
            description: 'Payment gateway to test'
          }
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
                firstProcessing: { type: 'boolean' },
                secondProcessing: { type: 'boolean' },
                idempotencyWorking: { type: 'boolean' },
                activityLogCount: { type: 'number' },
                expectedLogCount: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: testController.testIdempotency.bind(testController)
  });

  // Test idempotency new
  fastify.post('/test/idempotency-new', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      body: {
        type: 'object',
        properties: {
          gateway: { type: 'string', enum: ['MIDTRANS', 'STRIPE', 'XENDIT'] }
        },
        required: ['gateway']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    handler: testController.testIdempotencyNew.bind(testController)
  });

  // Test signature verification for all gateways
  fastify.post('/test/signature-verification', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Test signature verification for all payment gateways',
      tags: ['Payment Testing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  gateway: { type: 'string' },
                  validSignature: { type: 'boolean' },
                  invalidSignature: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    handler: testController.testSignatureVerificationLegacy.bind(testController)
  });

  // Test signature verification
  fastify.post('/test/signature', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      body: {
        type: 'object',
        properties: {
          gateway: { type: 'string', enum: ['MIDTRANS', 'STRIPE', 'XENDIT'] }
        },
        required: ['gateway']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    handler: testController.testSignatureVerification.bind(testController)
  });

  // Health check for payment testing endpoints
  fastify.get('/test/health', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      description: 'Health check for payment testing module',
      tags: ['Payment Testing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            availableTests: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    handler: async (_request: any, reply: any) => {
      return reply.status(200).send({
        success: true,
        message: 'Payment testing module is healthy',
        timestamp: new Date().toISOString(),
        availableTests: [
          'webhook processing',
          'comprehensive testing',
          'idempotency testing',
          'signature verification'
        ]
      });
    }
  });

  // Health check endpoint
  fastify.get('/test/health-new', {
    preHandler: [requireCapability('payments.test.simulate')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
   }, testController.healthCheck.bind(testController));
 
   // Generate test report
   fastify.get('/test/report', {
     preHandler: [requireCapability('payments.test.simulate')],
     schema: {
       querystring: {
         type: 'object',
         properties: {
           timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'] }
         }
       },
       response: {
         200: {
           type: 'object',
           properties: {
             success: { type: 'boolean' },
             message: { type: 'string' },
             data: { type: 'object' }
           }
         }
       }
     }
   }, testController.generateTestReport.bind(testController));
}
