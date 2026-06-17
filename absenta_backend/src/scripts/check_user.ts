import { PrismaClient } from '@prisma/client';
import { authorizationService } from '../modules/auth/services/authorization.service';

const prisma = new PrismaClient();

async function main() {
  const userId = 'e7a3c9f1-ecf3-4bbf-94a3-0f161aa638d6';
  
  console.log(`Checking user capabilities via authorizationService for: ${userId}`);
  
  // Create a dummy fastify request user payload
  const dummyUser = {
    id: userId,
    email: 'firman@gmail.com',
    roleName: 'GURU',
  };

  const caps = await authorizationService.resolveUserCapabilities(userId, { user: dummyUser });
  console.log('--- Resolved Capabilities ---');
  console.log(`Total resolved: ${caps.length}`);
  console.log(JSON.stringify(caps, null, 2));

  console.log('\n--- checking billing.my.subscription.view ---');
  const res1 = await authorizationService.isUserAuthorized(userId, ['billing.my.subscription.view'], { user: dummyUser });
  console.log('Allowed billing.my.subscription.view:', res1);

  console.log('\n--- checking academic.teachers.view.list ---');
  const res2 = await authorizationService.isUserAuthorized(userId, ['academic.teachers.view.list'], { user: dummyUser });
  console.log('Allowed academic.teachers.view.list:', res2);

  console.log('\n--- checking hubin.partners.manage ---');
  const res3 = await authorizationService.isUserAuthorized(userId, ['hubin.partners.manage'], { user: dummyUser });
  console.log('Allowed hubin.partners.manage:', res3);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
