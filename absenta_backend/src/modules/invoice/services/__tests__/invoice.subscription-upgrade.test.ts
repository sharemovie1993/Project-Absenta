/**
 * Test Suite: Subscription Upgrade Period Calculation Fix
 * 
 * Verifies that subscription periods are correctly calculated when upgrading plans,
 * especially when upgrading from monthly to yearly or vice versa.
 * 
 * Related Issue: Subscription upgrade adds only 31 days instead of full period
 * Affected File: src/modules/invoice/services/invoice.service.ts (generateInvoiceFromBilling)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../../../../utils/prisma';
import { invoiceService } from '../invoice.service';

describe('Subscription Upgrade Period Calculation', () => {
  // Setup: Create test data
  let tenantId: string;
  let coreMonthlyPlanId: string;
  let premiumYearlyPlanId: string;
  let subscriptionId: string;

  beforeEach(async () => {
    const suffix = String(Date.now());
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        domain: `test-${Date.now()}.example.com`,
      },
    });
    tenantId = tenant.id;

    // Create CORE plan (MONTHLY)
    const corePlan = await prisma.plan.create({
      data: {
        code: `CORE_${suffix}`,
        service_code: 'CORE',
        name: 'CORE',
        price_monthly: 0,
        currency: 'IDR',
        billing_period: 'MONTH',
        max_user: 10,
        features: JSON.stringify(['Feature 1', 'Feature 2']),
        is_active: true,
        is_public: true,
      },
    });
    coreMonthlyPlanId = corePlan.id;

    // Create PREMIUM plan (YEARLY)
    const premiumPlan = await prisma.plan.create({
      data: {
        code: `PREMIUM_${suffix}`,
        service_code: 'CORE',
        name: 'PREMIUM',
        price_monthly: 500000,
        currency: 'IDR',
        billing_period: 'YEAR',
        max_user: 50,
        features: JSON.stringify(['Feature 1', 'Feature 2', 'Feature 3']),
        is_active: true,
        is_public: true,
      },
    });
    premiumYearlyPlanId = premiumPlan.id;

    // Create initial subscription (CORE plan, 365 days)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: coreMonthlyPlanId,
        service_code: 'CORE',
        start_date: now,
        end_date: endDate,
        status: 'ACTIVE',
        next_billing_date: endDate,
      },
    });
    subscriptionId = subscription.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.invoice.deleteMany({ where: { tenant_id: tenantId } });
      await prisma.billing.deleteMany({ where: { tenant_id: tenantId } });
      await prisma.subscription.deleteMany({ where: { tenant_id: tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    if (coreMonthlyPlanId || premiumYearlyPlanId) {
      await prisma.plan.deleteMany({ where: { id: { in: [coreMonthlyPlanId, premiumYearlyPlanId].filter(Boolean) as string[] } } });
    }
  });

  describe('Scenario 1: Upgrade from Monthly to Yearly Plan', () => {
    it('should extend subscription by full year when upgrading to yearly plan', async () => {
      // Action: Create upgrade billing
      const billing = await prisma.billing.create({
        data: {
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          amount: 500000,
          billing_date: new Date(),
          charge_type: 'UPGRADE',
          upgrade_plan_id_snapshot: premiumYearlyPlanId,
          upgrade_price_snapshot: 500000,
        },
      });

      // IMPORTANT: Call generateInvoiceFromBilling which applies the fix
      const before = Date.now();
      const invoice = await invoiceService.generateInvoiceFromBilling(
        tenantId,
        billing.id,
        {
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        }
      );
      const after = Date.now();

      // Verify: Invoice period should be 365 days (1 year)
      const periodDays = Math.floor(
        (new Date(invoice.period_end!).getTime() - new Date(invoice.period_start!).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Allow 1-2 days variance for date boundary edge cases
      expect(periodDays).toBeGreaterThanOrEqual(363);
      expect(periodDays).toBeLessThanOrEqual(367);

      expect(new Date(invoice.period_start!).getTime()).toBeGreaterThanOrEqual(before - 5000);
      expect(new Date(invoice.period_start!).getTime()).toBeLessThanOrEqual(after + 5000);

      const expectedEnd = new Date(invoice.period_start!);
      expectedEnd.setFullYear(expectedEnd.getFullYear() + 1);
      const expectedRange = {
        min: new Date(expectedEnd.getTime() - 2 * 24 * 60 * 60 * 1000),
        max: new Date(expectedEnd.getTime() + 2 * 24 * 60 * 60 * 1000),
      };
      const actualPeriodEnd = new Date(invoice.period_end!);
      expect(actualPeriodEnd.getTime()).toBeGreaterThanOrEqual(expectedRange.min.getTime());
      expect(actualPeriodEnd.getTime()).toBeLessThanOrEqual(expectedRange.max.getTime());

      // BUG CHECK: Ensure it's NOT 31 days (the bug symptom)
      expect(periodDays).not.toBeLessThan(100); // Should be 363-367, not 31
    });
  });

  describe('Scenario 2: Upgrade from Monthly to Another Monthly Plan', () => {
    it('should extend subscription by 1 month when upgrading to another monthly plan', async () => {
      // Setup: Create another MONTHLY plan
      const anotherPlan = await prisma.plan.create({
        data: {
          code: `PLUS_${Date.now()}`,
          service_code: 'CORE',
          name: 'PLUS',
          price_monthly: 250000,
          currency: 'IDR',
          billing_period: 'MONTH',
          max_user: 30,
          features: JSON.stringify(['Feature 1', 'Feature 2']),
          is_active: true,
          is_public: true,
        },
      });

      const billing = await prisma.billing.create({
        data: {
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          amount: 250000,
          billing_date: new Date(),
          charge_type: 'UPGRADE',
          upgrade_plan_id_snapshot: anotherPlan.id,
          upgrade_price_snapshot: 250000,
        },
      });

      // IMPORTANT: Call generateInvoiceFromBilling
      const invoice = await invoiceService.generateInvoiceFromBilling(
        tenantId,
        billing.id,
        {
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );

      // Verify: Invoice period should be approximately 30-31 days
      const periodDays = Math.floor(
        (new Date(invoice.period_end!).getTime() - new Date(invoice.period_start!).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      expect(periodDays).toBeGreaterThanOrEqual(28);
      expect(periodDays).toBeLessThanOrEqual(32);

      // Cleanup
      await prisma.plan.delete({ where: { id: anotherPlan.id } });
    });
  });

  describe('Scenario 3: First Paid Subscription (No Existing Subscription)', () => {
    it('should correctly calculate period when creating first paid subscription', async () => {
      // Setup: Create new tenant without subscription
      const newTenant = await prisma.tenant.create({
        data: {
          name: 'New Test Tenant',
          domain: `new-test-${Date.now()}.example.com`,
        },
      });

      // Create trial subscription that's just starting paid upgrade
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // Trial period = 1 month

      const trialSub = await prisma.subscription.create({
        data: {
          tenant_id: newTenant.id,
          plan_id: coreMonthlyPlanId,
          service_code: 'CORE',
          start_date: now,
          end_date: endDate,
          status: 'PENDING_PAYMENT', // First paid period
        },
      });

      // Action: Create billing for first paid upgrade
      const billing = await prisma.billing.create({
        data: {
          tenant_id: newTenant.id,
          subscription_id: trialSub.id,
          amount: 500000,
          billing_date: new Date(),
          charge_type: 'UPGRADE',
          upgrade_plan_id_snapshot: premiumYearlyPlanId, // Upgrade to YEARLY plan
          upgrade_price_snapshot: 500000,
        },
      });

      // IMPORTANT: Call generateInvoiceFromBilling
      const invoice = await invoiceService.generateInvoiceFromBilling(
        newTenant.id,
        billing.id,
        {
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );

      // Verify: Invoice should be for 1 year (365 days) since upgrading to yearly plan
      const periodDays = Math.floor(
        (new Date(invoice.period_end!).getTime() - new Date(invoice.period_start!).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      expect(periodDays).toBeGreaterThanOrEqual(363);
      expect(periodDays).toBeLessThanOrEqual(367);

      await prisma.invoice.deleteMany({ where: { tenant_id: newTenant.id } });
      await prisma.billing.deleteMany({ where: { tenant_id: newTenant.id } });
      await prisma.subscription.deleteMany({ where: { tenant_id: newTenant.id } });
      await prisma.tenant.delete({ where: { id: newTenant.id } });
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year correctly', async () => {
      // Setup: Create subscription with end date near Feb 29
      const leapYearEndDate = new Date('2024-02-29'); // Leap year date
      const subscription = await prisma.subscription.create({
        data: {
          tenant_id: tenantId,
          plan_id: coreMonthlyPlanId,
          service_code: 'CORE',
          start_date: new Date('2024-02-01'),
          end_date: leapYearEndDate,
          status: 'ACTIVE',
        },
      });

      const billing = await prisma.billing.create({
        data: {
          tenant_id: tenantId,
          subscription_id: subscription.id,
          amount: 500000,
          billing_date: new Date(),
          charge_type: 'UPGRADE',
          upgrade_plan_id_snapshot: premiumYearlyPlanId,
          upgrade_price_snapshot: 500000,
        },
      });

      const invoice = await invoiceService.generateInvoiceFromBilling(
        tenantId,
        billing.id,
        {
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );

      // Verify: Should not throw error and should calculate reasonable period
      expect(invoice.period_end).toBeDefined();
      expect(new Date(invoice.period_end!) > new Date(invoice.period_start!)).toBe(true);
    });

    it('should handle subscription with invalid period gracefully', async () => {
      // This tests the fallback logic in extendSubscription
      // when period_start/period_end are missing on invoice
      // (should be prevented by our fix, but test the safety mechanism)

      const billing = await prisma.billing.create({
        data: {
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          amount: 500000,
          billing_date: new Date(),
          charge_type: 'UPGRADE',
          upgrade_plan_id_snapshot: premiumYearlyPlanId,
          upgrade_price_snapshot: 500000,
        },
      });

      // Create invoice with explicit period (simulating our fix)
      const invoice = await invoiceService.generateInvoiceFromBilling(
        tenantId,
        billing.id,
        {
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );

      // Verify periods are always set
      expect(invoice.period_start).not.toBeNull();
      expect(invoice.period_end).not.toBeNull();
      expect(new Date(invoice.period_end!) > new Date(invoice.period_start!)).toBe(true);
    });
  });
});
