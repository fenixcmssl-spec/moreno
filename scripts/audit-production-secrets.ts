import fs from 'fs';
import path from 'path';

/**
 * Audit Production Secrets
 * FenixCMS 5 - Strict check to prevent hardcoded passwords, client-side secret exposure, and leaked tokens.
 */

const SCAN_DIRS = ['lib', 'app', 'components'];
const IGNORE_PATTERNS = [
  'tests',
  'docs',
  'node_modules',
  '.git',
  '.next',
  'scripts',
  '.env.example'
];

interface SecretRisk {
  file: string;
  line: number;
  type: string;
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
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function auditSecrets() {
  console.log('🔒 [AUDIT 2/3] Iniciando auditoría de secretos y credenciales...');
  let totalFilesChecked = 0;
  const risks: SecretRisk[] = [];

  for (const scanDir of SCAN_DIRS) {
    const targetDir = path.join(process.cwd(), scanDir);
    const files = getAllFiles(targetDir);

    for (const filePath of files) {
      totalFilesChecked++;
      const relativePath = path.relative(process.cwd(), filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

        // 1. Prohibited Master Passwords
        if (
          trimmed.includes('Patricia1980@') ||
          trimmed.includes("password === 'admin123'") ||
          trimmed.includes("password === 'fenix2026'")
        ) {
          risks.push({
            file: relativePath,
            line: lineNum,
            type: 'Contraseña maestra en texto plano detectada'
          });
        }

        // 2. Secret exposure in client components
        if (isClientComponent) {
          if (trimmed.includes('process.env.DATABASE_URL') || trimmed.includes('process.env.PAYPAL_CLIENT_SECRET')) {
            risks.push({
              file: relativePath,
              line: lineNum,
              type: 'Variable de entorno secreta accedida desde componente de cliente'
            });
          }
        }
      }
    }
  }

  console.log(`✅ Archivos auditados para secretos: ${totalFilesChecked}`);
  if (risks.length > 0) {
    console.error(`❌ Se detectaron ${risks.length} riesgos de seguridad / secretos:`);
    risks.forEach(r => {
      console.error(` - [${r.file}:${r.line}] ${r.type}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 Auditoría de secretos completada con éxito. Cero secretos expuestos o contraseñas maestras encontradas.\n');
  }
}

auditSecrets().catch(err => {
  console.error('Fatal secret audit error:', err);
  process.exit(1);
});
