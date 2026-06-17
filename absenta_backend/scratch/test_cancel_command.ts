const { cancelPendingUpgradeCommand } = require('../src/modules/billing/services/commands/cancel-pending-upgrade.command');

async function test() {
  try {
    console.log('--- Testing Cancellation Command ---');
    const result = await cancelPendingUpgradeCommand(
      '9c8d32fc-0816-4f22-a127-a0e57de423bf',
      null,
      'test-correlation-id'
    );
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Command crashed:', error);
  }
}

test();
