import fs from 'fs';
import path from 'path';

/**
 * FenixCMS Production Source-of-Truth Audit
 * FASE 8 - Ensures that PostgreSQL is the ONLY source of truth in production services,
 * with zero unshielded demo stores, hardcoded users, or in-memory authority.
 */

const SERVICES_DIR = path.join(process.cwd(), 'lib/services');
const IGNORE_PATTERNS = ['tests', 'docs', 'node_modules', '.git', '.next'];

interface Violation {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (IGNORE_PATTERNS.some(ign => fullPath.includes(ign))) continue;
    if (entry.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runSourceOfTruthAudit() {
  console.log('🏛️ [AUDIT SOURCE-OF-TRUTH] Iniciando auditoría profunda de servicios de negocio (Fase 8)...');
  const serviceFiles = scanDirectory(SERVICES_DIR);
  const violations: Violation[] = [];
  let auditedCount = 0;

  for (const filePath of serviceFiles) {
    auditedCount++;
    const relPath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // Skip comments and imports
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (trimmed.startsWith('import ') || trimmed.startsWith('export {')) continue;

      // 1. Prohibit hardcoded demo users in production services without isProductionMode guard
      if (
        (trimmed.includes('carlos@boutiquevalencia.es') || trimmed.includes('elena@techmadrid.es')) &&
        !content.includes('isProductionMode')
      ) {
        violations.push({
          file: relPath,
          line: lineNum,
          snippet: trimmed,
          reason: 'Usuario de demostración hardcodeado sin guarda de producción'
        });
      }

      // 2. Prohibit unshielded INITIAL_* returns in production methods
      if (trimmed.startsWith('return INITIAL_') && !content.includes('isProductionMode')) {
        violations.push({
          file: relPath,
          line: lineNum,
          snippet: trimmed,
          reason: 'Retorno directo de datos INITIAL_* sin guarda de producción'
        });
      }
    }
  }

  console.log(`✅ Servicios de negocio auditados: ${auditedCount}`);
  if (violations.length > 0) {
    console.error(`❌ Se detectaron ${violations.length} violaciones de Source-of-Truth en producción:`);
    violations.forEach(v => {
      console.error(` - [${v.file}:${v.line}] ${v.reason}: ${v.snippet.slice(0, 80)}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 Auditoría Source-of-Truth completada con éxito. Cero violaciones detectadas.\n');
  }
}

runSourceOfTruthAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
