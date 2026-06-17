import { invoiceController } from '../controllers/invoice.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function invoiceRoutes(fastify: any) {
  fastify.get('/admin/invalid-period', {
    preHandler: [requireCapability('billing.invoices.view.list')],
    schema: {
      description: 'List invoices with missing/invalid period_start/period_end',
      tags: ['Invoice'],
      querystring: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string', description: 'Filter by tenant ID (SUPERADMIN only)' },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 200 },
        }
      },
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
                  id: { type: 'string' },
                  tenant_id: { type: 'string' },
                  billing_id: { type: 'string' },
                  subscription_id: { type: 'string' },
                  invoice_number: { type: 'string' },
                  status: { type: 'string' },
                  due_date: { type: 'string', format: 'date-time' },
                  period_start: { type: ['string', 'null'], format: 'date-time' },
                  period_end: { type: ['string', 'null'], format: 'date-time' },
                  invoice_tenant_name: { type: ['string', 'null'] },
                  invoice_tenant_identifier: { type: ['string', 'null'] },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  issue: { type: 'string' },
                }
              }
            }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, invoiceController.getInvalidPeriodInvoices.bind(invoiceController));

  /**
   * GET /invoice - Mendapatkan semua invoice dengan pagination dan filter
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   * Query params: page, limit, status, tenant_id
   */
  fastify.get('/', {
    preHandler: [requireCapability('billing.invoices.view.list')],
    schema: {
      description: 'Get all invoices with pagination and filtering',
      tags: ['Invoice'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          status: { 
            type: 'string', 
            enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'],
            description: 'Filter by invoice status'
          },
          tenant_id: { 
            type: 'string',
            description: 'Filter by tenant ID (SUPERADMIN only)'
          },
          billing_id: {
            type: 'string',
            description: 'Filter by billing ID'
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
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      billing_id: { type: 'string' },
                      invoice_number: { type: 'string' },
                      amount: { type: 'number' },
                      due_date: { type: 'string', format: 'date-time' },
                      status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'] },
                      notes: { type: ['string', 'null'] },
                      sent_at: { type: ['string', 'null'], format: 'date-time' },
                      paid_at: { type: ['string', 'null'], format: 'date-time' },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' },
                      tenant: {
                        type: ['object', 'null'],
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          domain: { type: ['string', 'null'] },
                          email: { type: ['string', 'null'] }
                        }
                      },
                      Billing: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          amount: { type: 'number' },
                          billing_date: { type: 'string', format: 'date-time' },
                          status: { type: 'string' },
                          Subscription: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              tenant_id: { type: 'string' },
                              Tenant: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  name: { type: 'string' },
                                  domain: { type: ['string', 'null'] },
                                  email: { type: ['string', 'null'] }
                                }
                              },
                              Plan: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  name: { type: 'string' },
                                  price_monthly: { type: 'number' },
                                  currency: { type: 'string' }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' }
                  }
                }
              }
            }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, invoiceController.getAllInvoices.bind(invoiceController));

  /**
   * GET /invoice/stats - Mendapatkan statistik invoice
   * RBAC: SUPERADMIN (semua statistik), ADMIN (statistik tenant sendiri)
   */
  fastify.get('/stats', {
    preHandler: [requireCapability('billing.invoices.view.list')],
    schema: {
      description: 'Get invoice statistics',
      tags: ['Invoice'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                total_invoices: { type: 'integer' },
                draft_invoices: { type: 'integer' },
                sent_invoices: { type: 'integer' },
                paid_invoices: { type: 'integer' },
                overdue_invoices: { type: 'integer' },
                total_amount: { type: 'number' },
                paid_amount: { type: 'number' },
                unpaid_amount: { type: 'number' },
                overdue_amount: { type: 'number' }
              }
            }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, invoiceController.getInvoiceStats.bind(invoiceController));

  // DELETE /invoice/public-link/:id - Revoke public token (requires auth)
  fastify.delete('/public-link/:id', {
    preHandler: [requireCapability("billing.invoices.public.link.delete")],
    schema: {
      description: 'Revoke public access token for an invoice',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Invoice ID' } },
        required: ['id']
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } },
        403: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } },
        404: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } }
      }
    }
  }, invoiceController.revokePublicLink.bind(invoiceController));

  /**
   * GET /invoice/:id/preview - Preview invoice in public format
   * RBAC: SUPERADMIN, ADMIN
   */
  fastify.get('/:id/preview', {
    preHandler: [requireCapability('billing.invoices.view.detail')],
    schema: {
      description: 'Preview invoice in public format',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
  }, invoiceController.getInvoicePreview.bind(invoiceController));

  /**
   * GET /invoice/:id/download - Download cached official PDF (server-side)
   * RBAC: SUPERADMIN, ADMIN
   */
  fastify.get('/:id/download', {
    preHandler: [requireCapability('billing.invoices.view.detail')],
    schema: {
      description: 'Download official invoice PDF (cached; generated if missing)',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
                pdf_url: { type: 'string' }
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
        403: {
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
  }, invoiceController.downloadInvoicePdf.bind(invoiceController));

  /**
   * GET /invoice/:id - Mendapatkan invoice berdasarkan ID
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  fastify.get('/:id', {
    preHandler: [requireCapability('billing.invoices.view.detail')],
    schema: {
      description: 'Get invoice by ID',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Invoice ID' }
        },
        required: ['id']
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
                id: { type: 'string' },
                billing_id: { type: 'string' },
                invoice_number: { type: 'string' },
                amount: { type: 'number' },
                due_date: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'] },
                notes: { type: ['string', 'null'] },
                sent_at: { type: ['string', 'null'], format: 'date-time' },
                paid_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        403: {
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
  }, invoiceController.getInvoiceById.bind(invoiceController));

  /**
   * GET /invoice/:id/public-link - Mendapatkan link publik untuk invoice
   * RBAC: SUPERADMIN, ADMIN
   */
  fastify.get('/:id/public-link', {
    preHandler: [requireCapability('billing.invoices.view.detail')],
    schema: {
      description: 'Get public link for invoice',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
                url: { type: 'string' },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, invoiceController.getPublicInvoiceLink.bind(invoiceController));
  
  /**
   * POST /invoice - Membuat invoice baru
   * RBAC: SUPERADMIN (semua billing), ADMIN (billing tenant sendiri)
   */
  fastify.post('/', {
    preHandler: [requireCapability('billing.invoices.generate')],
    schema: {
      description: 'Create new invoice',
      tags: ['Invoice'],
      body: {
        type: 'object',
        properties: {
          billing_id: { type: 'string', description: 'Billing ID' },
          invoice_number: { type: 'string', description: 'Custom invoice number (optional)' },
          due_date: { type: 'string', format: 'date-time', description: 'Invoice due date' },
          notes: { type: 'string', description: 'Additional notes (optional)' }
        },
        required: ['billing_id', 'due_date']
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
                id: { type: 'string' },
                billing_id: { type: 'string' },
                invoice_number: { type: 'string' },
                amount: { type: 'number' },
                due_date: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'] },
                notes: { type: ['string', 'null'] },
                sent_at: { type: ['string', 'null'], format: 'date-time' },
                paid_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
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
        403: {
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
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, invoiceController.createInvoice.bind(invoiceController));

  /**
   * PUT /invoice/:id - Update invoice (hanya status DRAFT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  fastify.put('/:id', {
    preHandler: [requireCapability('billing.invoices.update')],
    schema: {
      description: 'Update invoice (DRAFT status only)',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Invoice ID' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          due_date: { type: 'string', format: 'date-time', description: 'New due date' },
          notes: { type: ['string', 'null'], description: 'Updated notes' }
        },
        minProperties: 1
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
                id: { type: 'string' },
                billing_id: { type: 'string' },
                invoice_number: { type: 'string' },
                amount: { type: 'number' },
                due_date: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'] },
                notes: { type: ['string', 'null'] },
                sent_at: { type: ['string', 'null'], format: 'date-time' },
                paid_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
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
        403: {
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
  }, invoiceController.updateInvoice.bind(invoiceController));

  /**
   * PUT /invoice/:id/send - Mengirim invoice (update status ke SENT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  fastify.put('/:id/send', {
    preHandler: [requireCapability('billing.invoices.send')],
    schema: {
      description: 'Send invoice (update status to SENT)',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Invoice ID' }
        },
        required: ['id']
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
                id: { type: 'string' },
                billing_id: { type: 'string' },
                invoice_number: { type: 'string' },
                amount: { type: 'number' },
                due_date: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID'] },
                notes: { type: ['string', 'null'] },
                sent_at: { type: ['string', 'null'], format: 'date-time' },
                paid_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
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
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: false,
            message: { type: 'string' }
          }
        }
      }
    }
  }, invoiceController.sendInvoice.bind(invoiceController));

  /**
   * PUT /invoice/:id/pay - REMOVED
   * Moved to Payment Routes: POST /payment/invoice/:invoice_id/pay
   */

  /**
   * DELETE /invoice/:id - Menghapus invoice (hanya status DRAFT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  fastify.delete('/:id', {
    preHandler: [requireCapability('billing.invoices.delete')],
    schema: {
      description: 'Delete invoice (DRAFT status only)',
      tags: ['Invoice'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Invoice ID' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        403: {
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
  }, invoiceController.deleteInvoice.bind(invoiceController));
}
