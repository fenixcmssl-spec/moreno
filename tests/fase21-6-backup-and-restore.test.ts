import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { verifyBackupIntegrity } from '../scripts/verify-backup-integrity';

export async function runFase21_6Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 21.6 — BACKUP Y RESTAURACIÓN DE POSTGRESQL');
  console.log('================================================================================\n');

  // 1. Verificación de Existencia de Documentación Formal
  console.log('📋 [1/4] DOCUMENTACIÓN DE PROCEDIMIENTOS DE BACKUP Y DISASTER RECOVERY');
  const docPath = path.join(process.cwd(), 'docs', 'DATABASE_BACKUP_AND_RESTORE.md');
  assert.ok(fs.existsSync(docPath), 'El documento DATABASE_BACKUP_AND_RESTORE.md debe existir en docs/');
  const docContent = fs.readFileSync(docPath, 'utf-8');
  assert.ok(docContent.includes('pg_dump'), 'Debe documentar pg_dump');
  assert.ok(docContent.includes('pg_restore'), 'Debe documentar pg_restore');
  assert.ok(docContent.includes('AES-256') || docContent.includes('Cifrando'), 'Debe incluir estrategia de cifrado');
  assert.ok(docContent.includes('DISASTER RECOVERY'), 'Debe incluir procedimiento DRP ante desastre');
  console.log('  ✅ [PASS] Documentación de backup, restore y DRP verificada');

  // 2. Verificación de Scripts de Backup y Restore
  console.log('\n📋 [2/4] SCRIPTS AUTOMATIZADOS DE BACKUP Y RESTORE');
  const backupScript = path.join(process.cwd(), 'scripts', 'backup-db.sh');
  const restoreScript = path.join(process.cwd(), 'scripts', 'restore-db.sh');
  assert.ok(fs.existsSync(backupScript), 'El script backup-db.sh debe existir');
  assert.ok(fs.existsSync(restoreScript), 'El script restore-db.sh debe existir');

  const backupContent = fs.readFileSync(backupScript, 'utf-8');
  const restoreContent = fs.readFileSync(restoreScript, 'utf-8');

  // Seguridad: Sin contraseñas hardcoded en los scripts
  assert.ok(!backupContent.includes('password123'), 'El script de backup no debe contener contraseñas hardcoded');
  assert.ok(!restoreContent.includes('password123'), 'El script de restore no debe contener contraseñas hardcoded');
  assert.ok(backupContent.includes('DATABASE_URL'), 'El script de backup debe estar parametrizado con DATABASE_URL');
  assert.ok(restoreContent.includes('DATABASE_URL'), 'El script de restore debe estar parametrizado con DATABASE_URL');
  console.log('  ✅ [PASS] Scripts automatizados validados y seguros');

  // 3. Ejecución del Validador de Integridad Post-Restore
  console.log('\n📋 [3/4] MOTOR DE VERIFICACIÓN DE INTEGRIDAD POST-RESTAURACIÓN');
  await verifyBackupIntegrity();
  console.log('  ✅ [PASS] Motor de verificación de integridad post-restore ejecutado');

  // 4. Estrategia de Retención y Formato
  console.log('\n📋 [4/4] ESTRATEGIA DE COMPRESIÓN Y ROTACIÓN DE BACKUPS');
  assert.ok(backupContent.includes('--compress') || backupContent.includes('-Fc') || backupContent.includes('custom'), 'Debe usar formato comprimido nativo');
  assert.ok(backupContent.includes('-mtime') || backupContent.includes('Limpiando'), 'Debe incluir política de rotación/retención');
  console.log('  ✅ [PASS] Estrategia de compresión y retención comprobada');

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 21.6 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}
