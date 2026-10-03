import fs from 'fs';
import path from 'path';

/**
 * Audit Production Fallbacks & Architecture Invariants
 * FenixCMS 7 - Eliminación de la segunda realidad, cero Firebase en runtime y PostgreSQL única verdad.
 */

const SCAN_DIRS = ['lib', 'app', 'components'];
const IGNORE_PATTERNS = [
  'tests',
  'docs',
  'node_modules',
  '.git',
  '.next',
  'scripts',
  'initialData.ts'
];

interface Violation {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (IGNORE_PATTERNS.some(ign => fullPath.includes(ign))) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function auditFallbacks() {
  console.log('🔍 [AUDIT 1/3] Iniciando auditoría de runtime, Firebase y fallbacks en producción...');
  let totalFilesChecked = 0;
  const violations: Violation[] = [];

  for (const scanDir of SCAN_DIRS) {
    const targetDir = path.join(process.cwd(), scanDir);
    const files = getAllFiles(targetDir);

    for (const filePath of files) {
      totalFilesChecked++;
      const relativePath = path.relative(process.cwd(), filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        // 1. Check for ANY firebase import in runtime
        if (trimmed.includes("from 'firebase") || trimmed.includes('from "firebase') || trimmed.includes("from './firebase'")) {
          violations.push({
            file: relativePath,
            line: lineNum,
            snippet: trimmed,
            reason: 'Prohibido importar Firebase en el runtime de producción (Fase 7)'
          });
        }

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        if (trimmed.startsWith('import ') || trimmed.startsWith('export {')) continue;

        // 2. Check for tenant_demo without production guard
        if (trimmed.includes('tenant_demo') && !content.includes('isProductionMode') && !content.includes('NODE_ENV')) {
          violations.push({
            file: relativePath,
            line: lineNum,
            snippet: trimmed,
            reason: 'Uso de tenant_demo sin guarda de producción isProductionMode()'
          });
        }

        // 3. Check for fake license generation in client components
        if (relativePath.startsWith('components/') && (trimmed.includes('lic_${Date.now()}') || trimmed.includes('lic_${Date.now()}'))) {
          violations.push({
            file: relativePath,
            line: lineNum,
            snippet: trimmed,
            reason: 'Generación de ID de licencia local en componentes cliente prohibida en producción'
          });
        }
      }
    }
  }

  console.log(`✅ Archivos auditados: ${totalFilesChecked}`);
  if (violations.length > 0) {
    console.error(`❌ Se detectaron ${violations.length} violaciones de arquitectura en producción:`);
    violations.forEach(v => {
      console.error(` - [${v.file}:${v.line}] ${v.reason}: ${v.snippet.slice(0, 80)}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 Auditoría de fallbacks y Firebase completada con éxito. Cero violaciones detectadas.\n');
  }
}

auditFallbacks().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
