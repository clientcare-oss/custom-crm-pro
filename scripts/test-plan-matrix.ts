import { getMasterPlanMatrix, getPackageAllowances } from '../server/db/planMatrix';

async function main() {
  for (const k of ['anchor', 'navigator', 'family', 'monthly_advocacy', 'pay_per_use']) {
    const res = await getPackageAllowances(k);
    console.log(`Plan: ${res.planName} (${res.planKey})`);
    console.log(`  Configured: ${res.isConfigured}, Locked: ${res.isLocked}, Total Allowances: ${res.allowances.length}`);
    console.log(`  Services: ${res.allowances.map(a => `${a.serviceKey}: ${a.allowanceType} (${a.baseAllowance})`).join(', ')}`);
  }
}

main().catch(console.error);
