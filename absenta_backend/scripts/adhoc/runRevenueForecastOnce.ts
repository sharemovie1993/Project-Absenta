import { runRevenueForecastCycle } from '../src/jobs/revenueForecast.job';

async function main(): Promise<void> {
  await runRevenueForecastCycle();
}

void main().catch((err) => {
  console.error('runRevenueForecastCycle failed', err);
  process.exit(1);
});
