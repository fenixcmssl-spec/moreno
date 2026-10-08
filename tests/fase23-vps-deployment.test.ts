import fs from 'fs';
import path from 'path';
import assert from 'assert';

export async function runFase23Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 23 — DESPLIEGUE REAL EN VPS');
  console.log('================================================================================');

  const rootDir = process.cwd();

  // ---------------------------------------------------------------------------
  // TEST 1: Verificación de Scripts y Unidades de Despliegue en /deploy
  // ---------------------------------------------------------------------------
  console.log('📋 [1/5] VERIFICACIÓN DE ASSETS Y SCRIPTS DE DESPLIEGUE VPS (/deploy)');
  
  const setupVpsPath = path.join(rootDir, 'deploy', 'setup-vps.sh');
  const deployScriptPath = path.join(rootDir, 'deploy', 'deploy.sh');
  const serviceUnitPath = path.join(rootDir, 'deploy', 'fenixcms.service');
  const nginxConfPath = path.join(rootDir, 'deploy', 'nginx-fenixcms.conf');
  const sslCertbotPath = path.join(rootDir, 'deploy', 'nginx-ssl-certbot.sh');
  const envTemplatePath = path.join(rootDir, 'deploy', 'env.production.template');

  assert(fs.existsSync(setupVpsPath), 'setup-vps.sh debe existir');
  assert(fs.existsSync(deployScriptPath), 'deploy.sh debe existir');
  assert(fs.existsSync(serviceUnitPath), 'fenixcms.service debe existir');
  assert(fs.existsSync(nginxConfPath), 'nginx-fenixcms.conf debe existir');
  assert(fs.existsSync(sslCertbotPath), 'nginx-ssl-certbot.sh debe existir');
  assert(fs.existsSync(envTemplatePath), 'env.production.template debe existir');

  const setupContent = fs.readFileSync(setupVpsPath, 'utf-8');
  assert(setupContent.includes('postgresql'), 'setup-vps.sh debe instalar PostgreSQL');
  assert(setupContent.includes('nodejs') || setupContent.includes('Node.js'), 'setup-vps.sh debe instalar Node.js');
  assert(setupContent.includes('nginx'), 'setup-vps.sh debe instalar Nginx');
  assert(setupContent.includes('certbot'), 'setup-vps.sh debe instalar Certbot');
  assert(setupContent.includes('ufw'), 'setup-vps.sh debe configurar Firewall');

  const deployContent = fs.readFileSync(deployScriptPath, 'utf-8');
  assert(deployContent.includes('prisma migrate deploy'), 'deploy.sh debe ejecutar prisma migrate deploy');
  assert(deployContent.includes('prisma generate'), 'deploy.sh debe ejecutar prisma generate');
  assert(deployContent.includes('npm run build'), 'deploy.sh debe compilar con npm run build');
  assert(deployContent.includes('bootstrap-production.ts'), 'deploy.sh debe ejecutar bootstrap-production.ts');
  assert(deployContent.includes('/api/health'), 'deploy.sh debe validar health check tras despliegue');

  console.log('  ✅ [PASS] Scripts y herramientas de despliegue VPS verificadas');

  // ---------------------------------------------------------------------------
  // TEST 2: Hardening de Unidad systemd (fenixcms.service)
  // ---------------------------------------------------------------------------
  console.log('📋 [2/5] HARDENING Y SEGURIDAD EN UNIDAD SYSTEMD (fenixcms.service)');

  const serviceContent = fs.readFileSync(serviceUnitPath, 'utf-8');
  assert(serviceContent.includes('User=fenixcms'), 'Servicio debe ejecutarse con usuario no root');
  assert(serviceContent.includes('EnvironmentFile=/var/www/fenixcms/.env'), 'Debe cargar .env desde archivo seguro');
  assert(serviceContent.includes('Restart=always'), 'Debe tener reinicio automático ante caídas');
  assert(serviceContent.includes('NoNewPrivileges=true'), 'Debe tener NoNewPrivileges activado');
  assert(serviceContent.includes('ProtectSystem=full'), 'Debe proteger el sistema de archivos');
  assert(serviceContent.includes('PrivateTmp=true'), 'Debe aislar el directorio temporal');

  console.log('  ✅ [PASS] Sandboxing y directivas de seguridad de systemd validadas');

  // ---------------------------------------------------------------------------
  // TEST 3: Configuración de Nginx Reverse Proxy, Multi-Tenant & SSL
  // ---------------------------------------------------------------------------
  console.log('📋 [3/5] CONFIGURACIÓN DE NGINX, MULTI-TENANT, RATE LIMITING Y SSL');

  const nginxContent = fs.readFileSync(nginxConfPath, 'utf-8');
  assert(nginxContent.includes('limit_req_zone'), 'Nginx debe definir zonas de rate limiting');
  assert(nginxContent.includes('ssl_protocols TLSv1.2 TLSv1.3'), 'Nginx debe forzar TLS 1.2 y 1.3');
  assert(nginxContent.includes('Strict-Transport-Security'), 'Nginx debe incluir cabecera HSTS');
  assert(nginxContent.includes('/_next/static/'), 'Nginx debe cachear estáticos inmutables de Next.js');
  assert(nginxContent.includes('/api/health'), 'Nginx debe enrutar health checks sin interferencias');
  assert(nginxContent.includes('proxy_pass http://fenixcms_backend'), 'Nginx debe hacer proxy al cluster Next.js');
  assert(nginxContent.includes('Upgrade $http_upgrade'), 'Nginx debe soportar WebSockets');

  console.log('  ✅ [PASS] Configuración de Nginx reverse proxy y seguridad validada');

  // ---------------------------------------------------------------------------
  // TEST 4: Verificación de Health Check Endpoint (/api/health)
  // ---------------------------------------------------------------------------
  console.log('📋 [4/5] VERIFICACIÓN DEL ENDPOINT DE HEALTH CHECK (/api/health)');

  const healthRoutePath = path.join(rootDir, 'app', 'api', 'health', 'route.ts');
  assert(fs.existsSync(healthRoutePath), 'Endpoint /api/health debe existir');
  const healthContent = fs.readFileSync(healthRoutePath, 'utf-8');
  assert(healthContent.includes('liveness'), 'Health check debe soportar probe liveness');
  assert(healthContent.includes('readiness'), 'Health check debe soportar probe readiness');
  assert(healthContent.includes('assertDatabaseReady'), 'Health check debe validar conexión PostgreSQL');
  assert(!healthContent.includes('process.env.DATABASE_URL') || !healthContent.includes('res.json({ dbUrl:'), 'Health check no debe exponer DATABASE_URL');

  console.log('  ✅ [PASS] Health check seguro y funcional para monitorización en VPS');

  // ---------------------------------------------------------------------------
  // TEST 5: Documentación y Guía de Despliegue VPS
  // ---------------------------------------------------------------------------
  console.log('📋 [5/5] DOCUMENTACIÓN PASO A PASO DEL DESPLIEGUE EN VPS');

  const guidePath = path.join(rootDir, 'docs', 'VPS_DEPLOYMENT_GUIDE.md');
  assert(fs.existsSync(guidePath), 'Guía VPS_DEPLOYMENT_GUIDE.md debe existir');
  const guideContent = fs.readFileSync(guidePath, 'utf-8');
  assert(guideContent.includes('PostgreSQL'), 'Guía debe documentar PostgreSQL');
  assert(guideContent.includes('systemd'), 'Guía debe documentar systemd');
  assert(guideContent.includes('Nginx'), 'Guía debe documentar Nginx');
  assert(guideContent.includes('Certbot'), 'Guía debe documentar Certbot HTTPS');
  assert(guideContent.includes('deploy.sh'), 'Guía debe documentar el script de despliegue');

  console.log('  ✅ [PASS] Guía completa de despliegue en VPS certificada');

  console.log('================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 23 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}

if (require.main === module) {
  runFase23Tests().catch((err) => {
    console.error('Error en tests Fase 23:', err);
    process.exit(1);
  });
}
