// @ts-nocheck
import { subscriptionQueryController } from './sub/subscription-query.controller';
import { subscriptionOrdersController } from './sub/subscription-orders.controller';
import { subscriptionLifecycleController } from './sub/subscription-lifecycle.controller';

export { syncLocalSubscriptionsWithLicensingServer } from './sub/subscription-query.controller';

export const subscriptionController = {
  ...subscriptionQueryController,
  ...subscriptionOrdersController,
  ...subscriptionLifecycleController
};
