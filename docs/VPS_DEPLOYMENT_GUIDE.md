# 🚀 GUÍA DE DESPLIEGUE EN VPS — FENIXCMS SaaS (FASE 23)

Esta guía documenta el procedimiento oficial, seguro y reproducible para desplegar **FenixCMS SaaS** en un servidor VPS dedicado (Ubuntu 22.04 / 24.04 LTS o Debian 12).

---

## 1. Arquitectura de Producción en VPS

```
                          INTERNET / CLIENTES
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    NGINX Reverse Proxy (Port 443)    │
               │  - Terminación SSL/TLS 1.2 / 1.3    │
               │  - Multi-Tenant Subdomain Routing   │
               │  - Custom Domains Support           │
               │  - HTTP/2 & Static Asset Caching    │
               │  - Rate Limiting Zones (API & Auth) │
               └──────────────────┬──────────────────┘
                                  │ (HTTP 127.0.0.1:3000)
                                  ▼
               ┌─────────────────────────────────────┐
               │  FENIXCMS Next.js Core (systemd)    │
               │  - Usuario: fenixcms                │
               │  - Sandbox / NoNewPrivileges        │
               │  - Fail-Closed Zero-Fallback DB     │
               │  - Health Probes (/api/health)      │
               └──────────────────┬──────────────────┘
                                  │ (Local Unix Socket / Port 5432)
                                  ▼
               ┌─────────────────────────────────────┐
               │     PostgreSQL Database Server      │
               │  - Database: fenixcms_prod          │
               │  - Migrations: Prisma Engine        │
               │  - Backups: pg_dump Comprimido      │
               └─────────────────────────────────────┘
```

---

## 2. Requisitos Previos del Servidor

- **Sistema Operativo:** Ubuntu 22.04 LTS, Ubuntu 24.04 LTS o Debian 12 (64-bit).
- **Recursos Mínimos Recomendados:**
  - 2 vCPUs
  - 2 GB RAM (4 GB recomendados para tráfico alto y builds)
  - 25 GB Almacenamiento SSD NVMe
- **Dominio DNS:**
  - Registro A: `tudominio.com` -> `IP_DEL_VPS`
  - Registro A: `*.tudominio.com` -> `IP_DEL_VPS` (Wildcard para subdominios multi-tenant)

---

## 3. Provisión Inicial Automatizada del VPS

Conéctate por SSH al VPS como `root` y ejecuta el script de aprovisionamiento:

```bash
# 1. Clonar el repositorio
cd /tmp
git clone https://github.com/tu-organizacion/fenixcms.git
cd fenixcms

# 2. Ejecutar aprovisionamiento automatizado
sudo bash deploy/setup-vps.sh
```

El script `setup-vps.sh` realizará automáticamente:
1. Actualización de paquetes del sistema.
2. Creación del usuario sin privilegios `fenixcms`.
3. Instalación de Node.js 20 LTS, npm y utilidades.
4. Instalación y securización de PostgreSQL.
5. Creación de la base de datos `fenixcms_prod` y rol de base de datos.
6. Instalación y configuración de Nginx y Certbot.
7. Configuración del Firewall UFW (Puertos 22, 80, 443).
8. Creación de directorios `/var/www/fenixcms`, `/var/log/fenixcms` y `/var/backups/fenixcms` con permisos mínimos (750/700).

---

## 4. Configuración del Archivo de Entorno (`.env`)

Copia la plantilla de producción en `/var/www/fenixcms/.env`:

```bash
sudo cp deploy/env.production.template /var/www/fenixcms/.env
sudo chown fenixcms:fenixcms /var/www/fenixcms/.env
sudo chmod 600 /var/www/fenixcms/.env
```

Edita `/var/www/fenixcms/.env` con tus secretos reales:

```ini
NODE_ENV=production
PORT=3000
APP_URL=https://tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
BASE_DOMAIN=tudominio.com

DATABASE_URL="postgresql://fenix_db_user:TU_CONTRASENA_SEGURA@localhost:5432/fenixcms_prod?schema=public"

INITIAL_ADMIN_EMAIL=admin@tudominio.com
INITIAL_ADMIN_PASSWORD=TU_SUPER_ADMIN_PASSWORD_SEGURA
INITIAL_ADMIN_NAME="Super Administrador"

JWT_SECRET=GENERA_CON_OPENSSL_RAND_BASE64_32
SESSION_SECRET=GENERA_CON_OPENSSL_RAND_BASE64_32

# Pasarelas de Pago
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=live

FAIL_CLOSED_ON_DB_ERROR=true
ALLOW_DEMO_SEED=false
ENABLE_DEV_FALLBACKS=false
```

---

## 5. Despliegue de la Aplicación y Migraciones

Ejecuta el script de despliegue oficial como usuario `fenixcms`:

```bash
sudo -u fenixcms bash deploy/deploy.sh
```

Este proceso ejecuta en secuencia segura:
1. `npm ci` (instalación estricta de dependencias).
2. `npx prisma migrate deploy` (migraciones atómicas en PostgreSQL).
3. `npx prisma generate` (cliente de base de datos tipado).
4. `npm run build` (compilación optimizada de Next.js).
5. `npx tsx prisma/bootstrap-production.ts` (bootstrap idempotente de Super Admin y datos maestros).
6. Validación de salud mediante `GET /api/health?type=readiness`.

---

## 6. Configuración de systemd

Instala y activa la unidad de servicio:

```bash
sudo cp deploy/fenixcms.service /etc/systemd/system/fenixcms.service
sudo systemctl daemon-reload
sudo systemctl enable fenixcms.service
sudo systemctl start fenixcms.service

# Comprobar estado
sudo systemctl status fenixcms.service
```

Para consultar los logs en tiempo real:
```bash
journalctl -u fenixcms -f
# O ver archivos de log dedicados:
tail -f /var/log/fenixcms/app.log
tail -f /var/log/fenixcms/error.log
```

---

## 7. Configuración de Nginx y Certificados SSL/HTTPS

### A. Configurar Nginx
1. Copia el archivo de configuración:
```bash
sudo cp deploy/nginx-fenixcms.conf /etc/nginx/sites-available/fenixcms.conf
sudo sed -i 's/yourdomain.com/tudominio.com/g' /etc/nginx/sites-available/fenixcms.conf
sudo ln -sf /etc/nginx/sites-available/fenixcms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### B. Obtener Certificados SSL Let's Encrypt
```bash
sudo bash deploy/nginx-ssl-certbot.sh tudominio.com admin@tudominio.com
```

### C. Validar y Recargar Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Verificación y Checklist de Pruebas en Producción

Realiza las siguientes comprobaciones para certificar el estado operativo:

| Componente | Prueba a Realizar | Resultado Esperado |
| :--- | :--- | :--- |
| **Health Check** | `curl -i https://tudominio.com/api/health?type=readiness` | HTTP 200 `{"status":"healthy","database":"OK"}` |
| **Login Super Admin** | Iniciar sesión en `/login` con `INITIAL_ADMIN_EMAIL` | Acceso concedido al panel `/admin` |
| **Aislamiento Multi-Tenant** | Crear Tenant A (`tienda1.tudominio.com`) y Tenant B (`tienda2.tudominio.com`) | Cada tienda carga su propio catálogo de forma aislada |
| **Dominios Personalizados** | Vincular `mitienda.es` a Tenant A | Resolución y enrutamiento hacia Tenant A |
| **Licencias y Entitlements** | Asignar Plan Pro / Enterprise | Desbloqueo de módulos y límites de catálogo correspondientes |
| **Pasarelas de Pago** | Realizar webhook test de Stripe (`invoice.paid`) | Creación y activación automática de suscripción sin duplicados |
| **Tienda Online** | Añadir producto al carrito y completar checkout | Generación de pedido y actualización de stock en PostgreSQL |
| **Themes y Plugins** | Activar plugin y cambiar tema en tenant | Inyección dinámica de hooks y estilos sin afectar otros tenants |
| **Multi-idioma** | Alternar entre ES / EN / IT | Traducciones instantáneas con persistencia |

---

## 9. Automatización de Copias de Seguridad (Backups)

Configura un cron job diario para respaldar la base de datos PostgreSQL:

```bash
# Añadir al crontab de root
sudo crontab -e
```

Añade la siguiente línea (ejecución diaria a las 02:30 AM):
```cron
30 2 * * * DATABASE_URL="postgresql://fenix_db_user:PASSWORD@localhost:5432/fenixcms_prod?schema=public" BACKUP_DIR="/var/backups/fenixcms" bash /var/www/fenixcms/scripts/backup-db.sh >> /var/log/fenixcms/backup.log 2>&1
```

Para verificar la integridad de una copia de seguridad:
```bash
npx tsx scripts/verify-backup-integrity.ts
```

---

## 10. Procedimiento de Actualización sin Caídas (Zero-Downtime Updates)

Para desplegar nuevas versiones en el VPS:

```bash
cd /var/www/fenixcms
git pull origin main
sudo -u fenixcms bash deploy/deploy.sh
```
