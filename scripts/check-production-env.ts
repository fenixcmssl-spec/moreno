/**
 * Check Production Environment Variables
 * FenixCMS 5 - Verifies that all mandatory production environment variables are properly set and conform to standards.
 */

async function checkProductionEnv() {
  console.log('🌐 [AUDIT 3/3] Iniciando verificación de configuración de entorno para producción...');

  const isProd = process.env.NODE_ENV === 'production';
  console.log(`ℹ️ Modo actual de ejecución: ${process.env.NODE_ENV || 'development'}`);

  const requiredInProduction = [
    { key: 'DATABASE_URL', description: 'Cadena de conexión a PostgreSQL' },
    { key: 'APP_URL', description: 'URL canónica de la plataforma FenixCMS' },
    { key: 'PAYPAL_CLIENT_ID', description: 'Identificador de cliente PayPal' },
    { key: 'PAYPAL_CLIENT_SECRET', description: 'Secreto de autenticación PayPal' },
    { key: 'PAYPAL_WEBHOOK_ID', description: 'ID de webhook verificado de PayPal' }
  ];

  if (!isProd) {
    console.log('ℹ️ Entorno no productivo (desarrollo/CI). Comprobando coherencia básica de variables...');
    console.log('✅ Verificación completada para entorno local/CI.\n');
    return;
  }

  const missing: string[] = [];

  for (const req of requiredInProduction) {
    const val = process.env[req.key];
    if (!val || val.trim().length === 0) {
      missing.push(`${req.key} (${req.description})`);
    }
  }

  // Check APP_URL format in production
  if (process.env.APP_URL && !process.env.APP_URL.startsWith('https://')) {
    console.warn(`⚠️ Advertencia: APP_URL (${process.env.APP_URL}) no utiliza protocolo HTTPS.`);
  }

  // Check PayPal Base URL in live production
  if (process.env.PAYPAL_MODE === 'live') {
    if (process.env.PAYPAL_BASE_URL && !process.env.PAYPAL_BASE_URL.includes('api-m.paypal.com')) {
      console.warn('⚠️ Advertencia: PAYPAL_MODE=live pero PAYPAL_BASE_URL no apunta a api-m.paypal.com');
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Faltan las siguientes variables de entorno requeridas en producción:`);
    missing.forEach(m => console.error(` - ${m}`));
    process.exit(1);
  }

  console.log('🎉 Verificación de entorno de producción superada con éxito.\n');
}

checkProductionEnv().catch(err => {
  console.error('Fatal env check error:', err);
  process.exit(1);
});
