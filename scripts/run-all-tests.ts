import { runFase1Tests } from '../tests/fenixcms-fase1.test';
import { runFase2Tests } from '../tests/fenixcms-fase2.test';
import { runMasterTestSuite } from '../tests/master-paso20.test';
import { runFase20D1Tests } from '../tests/fase20-d1-persistence.test';
import { runClassifiedsTestSuite } from '../tests/classifieds.test';
import { runProductionReadinessTests } from '../tests/production-readiness.test';
import { runFase24Tests } from '../tests/fase24-tenant-context.test';
import { runFase25Tests } from '../tests/fase25-prisma-failclosed.test';
import { runFase26Tests } from '../tests/fase26-api-contract.test';
import { runFase27Tests } from '../tests/fase27-money-precision.test';
import { runFase28And29Tests } from '../tests/fase28-29-paypal-webhook.test';

async function main() {
  await runFase1Tests();
  await runFase2Tests();
  await runMasterTestSuite();
  await runFase20D1Tests();
  await runClassifiedsTestSuite();
  await runProductionReadinessTests();
  await runFase24Tests();
  await runFase25Tests();
  await runFase26Tests();
  await runFase27Tests();
  await runFase28And29Tests();
}

main().catch((err) => {
  console.error('Error fatal ejecutando los tests:', err);
  process.exit(1);
});

