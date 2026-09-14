import { runMasterTestSuite } from '../tests/master-paso20.test';

async function main() {
  await runMasterTestSuite();
  // Run Fase 20-D.1 Persistence Tests
  const { execSync } = await import('child_process');
  execSync('npx tsx tests/fase20-d1-persistence.test.ts', { stdio: 'inherit' });
  execSync('npx tsx tests/classifieds.test.ts', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('Error fatal ejecutando los tests:', err);
  process.exit(1);
});
