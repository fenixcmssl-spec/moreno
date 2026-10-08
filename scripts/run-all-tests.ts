import { runFase1Tests } from '../tests/fenixcms-fase1.test';
import { runFase2Tests } from '../tests/fenixcms-fase2.test';
import { runFase4Tests } from '../tests/fenixcms-fase4-order-checkout.test';
import { runFase5Tests } from '../tests/fenixcms-fase5.test';
import { runFase7Tests } from '../tests/fenixcms-fase7.test';
import { runMasterTestSuite } from '../tests/master-paso20.test';
import { runFase20D1Tests } from '../tests/fase20-d1-persistence.test';
import { runClassifiedsTestSuite } from '../tests/classifieds.test';
import { runProductionReadinessTests } from '../tests/production-readiness.test';
import { runFase24Tests } from '../tests/fase24-tenant-context.test';
import { runFase25Tests } from '../tests/fase25-prisma-failclosed.test';
import { runFase26Tests } from '../tests/fase26-api-contract.test';
import { runFase27Tests } from '../tests/fase27-money-precision.test';
import { runFase28And29Tests } from '../tests/fase28-29-paypal-webhook.test';
import { runI18nTests } from '../tests/i18n-service.test';
import { runFase21_2Tests } from '../tests/fase21-2-postgresql-production-seed.test';
import { runFase21_3Tests } from '../tests/fase21-3-money-licenses-multitenant-domains.test';
import { runFase21_4Tests } from '../tests/fase21-4-payments-webhooks-provisioning.test';
import { runFase21_5Tests } from '../tests/fase21-5-production-security-hardening.test';
import { runFase21_6Tests } from '../tests/fase21-6-backup-and-restore.test';
import { runFase23Tests } from '../tests/fase23-vps-deployment.test';
import { runFase24PostDeployTests } from '../tests/fase24-post-deployment-validation.test';

async function main() {
  await runFase1Tests();
  await runFase2Tests();
  await runFase4Tests();
  await runFase5Tests();
  await runFase7Tests();
  await runMasterTestSuite();
  await runFase20D1Tests();
  await runClassifiedsTestSuite();
  await runProductionReadinessTests();
  await runFase24Tests();
  await runFase25Tests();
  await runFase26Tests();
  await runFase27Tests();
  await runFase28And29Tests();
  await runI18nTests();
  await runFase21_2Tests();
  await runFase21_3Tests();
  await runFase21_4Tests();
  await runFase21_5Tests();
  await runFase21_6Tests();
  await runFase23Tests();
  await runFase24PostDeployTests();
}

main().catch((err) => {
  console.error('Error fatal ejecutando los tests:', err);
  process.exit(1);
});

