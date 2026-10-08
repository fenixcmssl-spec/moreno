# FENIXCMS SaaS — PROCEDIMIENTO DE BACKUP Y RESTAURACIÓN DE POSTGRESQL

## 1. INTRODUCCIÓN Y POLÍTICA DE RESILIENCIA

Este documento define la estrategia formal, automatizada y reproducible de **Copia de Seguridad (Backup)** y **Recuperación ante Desastres (Restore / Disaster Recovery)** para la base de datos PostgreSQL de **FenixCMS SaaS**.

### Principios Fundamentales:
- **Fuente única de verdad:** PostgreSQL es la única base de datos de producción.
- **Sin contraseñas en Git:** Todas las operaciones están parametrizadas mediante variables de entorno (`DATABASE_URL`, `PGPASSWORD`, `BACKUP_DIR`, `GPG_PASSPHRASE`).
- **Formato Estándar Comprimido:** Se utiliza el formato binario nativo de PostgreSQL (`pg_dump -Fc`) con compresión integrada de alto rendimiento.
- **Regla 3-2-1:** 3 copias de los datos, 2 soportes diferentes, 1 copia fuera del sitio (*offsite / object storage* cifrado).

---

## 2. ESTRATEGIA DE COPIAS DE SEGURIDAD

### 2.1. Frecuencia y Retención
| Tipo | Frecuencia | Retención | Destino |
| :--- | :--- | :--- | :--- |
| **Snapshot Diario** | Cada 24h (03:00 UTC) | 7 días | Disco local cifrado + Object Storage S3 |
| **Snapshot Semanal** | Domingos (04:00 UTC) | 4 semanas | Object Storage S3 (Cold Storage) |
| **Snapshot Mensual** | Día 1 de cada mes | 12 meses | Archivo inmutable (Glacier / WORM) |

---

## 3. SCRIPTS DE AUTOMATIZACIÓN

### 3.1. Script de Copia de Seguridad: `scripts/backup-db.sh`

```bash
#!/usr/bin/env bash
# ==============================================================================
# FenixCMS SaaS — PostgreSQL Automated Backup Engine
# ==============================================================================
set -euo pipefail

# 1. Configuración y Variables de Entorno
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fenixcms}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/fenixcms_backup_${TIMESTAMP}.dump"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL no está configurada." >&2
  exit 1
fi

echo "📦 [1/4] Iniciando volcado consistente de PostgreSQL..."
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"

echo "🔒 [2/4] Cifrando archivo de backup con AES-256..."
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "${BACKUP_FILE}" \
    -out "${ENCRYPTED_FILE}" \
    -pass pass:"${BACKUP_ENCRYPTION_KEY}"
  rm -f "${BACKUP_FILE}"
  FINAL_FILE="${ENCRYPTED_FILE}"
else
  FINAL_FILE="${BACKUP_FILE}"
fi

echo "📊 [3/4] Tamaño del backup generado:"
ls -lh "${FINAL_FILE}"

echo "🧹 [4/4] Limpiando backups con más de 7 días de antigüedad..."
find "${BACKUP_DIR}" -name "fenixcms_backup_*.dump*" -type f -mtime +7 -delete

echo "✅ Backup finalizado con éxito: ${FINAL_FILE}"
```

---

### 3.2. Script de Restauración: `scripts/restore-db.sh`

```bash
#!/usr/bin/env bash
# ==============================================================================
# FenixCMS SaaS — PostgreSQL Restore Engine
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <archivo_backup.dump[.enc]>" >&2
  exit 1
fi

INPUT_FILE="$1"
TEMP_FILE="/tmp/restore_temp_$$.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL no está configurada." >&2
  exit 1
fi

if [[ "${INPUT_FILE}" == *.enc ]]; then
  echo "🔓 [1/4] Descifrando archivo de backup..."
  if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "❌ Error: BACKUP_ENCRYPTION_KEY requerida para descifrar." >&2
    exit 1
  fi
  openssl enc -d -aes-256-cbc -pbkdf2 \
    -in "${INPUT_FILE}" \
    -out "${TEMP_FILE}" \
    -pass pass:"${BACKUP_ENCRYPTION_KEY}"
  RESTORE_SOURCE="${TEMP_FILE}"
else
  RESTORE_SOURCE="${INPUT_FILE}"
fi

echo "⚠️ [2/4] Restaurando base de datos en PostgreSQL..."
# --clean: Elimina objetos antes de crearlos
# --if-exists: Previene errores si la base está vacía
pg_restore \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${RESTORE_SOURCE}"

rm -f "${TEMP_FILE}"

echo "🔍 [3/4] Ejecutando migraciones de sincronización..."
npx prisma migrate deploy

echo "🧪 [4/4] Ejecutando verificación de integridad..."
npm run test

echo "🎉 Restauración completada exitosamente."
```

---

## 4. VERIFICACIÓN DE INTEGRIDAD POST-RESTAURACIÓN

Tras ejecutar una restauración, el script `scripts/verify-backup-integrity.ts` verifica las siguientes invariantes relacionales:

1. **Tabla `User`:**
   - Existencia de al menos 1 `SUPER_ADMIN` con password hash no vacío.
2. **Tabla `Tenant`:**
   - Todos los tenants activos poseen `slug` único y `licenseKey` vinculada.
3. **Tabla `License`:**
   - Toda licencia activa apunta a un `tenantId` y `planId` existentes.
4. **Tabla `Subscription`:**
   - Toda suscripción posee `tenantId` e importes decimales válidos.
5. **Tabla `Product` & `Order`:**
   - Los pedidos y productos mantienen la integridad referencial con sus respectivos comercios.
6. **Tabla `Domain`:**
   - Los dominios primarios y subdominios resuelven hacia un tenant activo.

---

## 5. PROCEDIMIENTO ANTE DESASTRE (DISASTER RECOVERY PLAN - DRP)

En caso de fallo catastrófico del servidor, corrupción de almacenamiento o pérdida de datos:

1. **Aislamiento Inmediato (Triage):**
   Poner la capa de proxy Nginx en modo mantenimiento para evitar escrituras parciales.
2. **Aprovisionamiento de Instancia Limpia:**
   Levantar una nueva instancia de PostgreSQL y validar conectividad.
3. **Descarga y Descifrado del Último Snapshot:**
   Obtener el snapshot más reciente desde el almacenamiento remoto offsite.
4. **Ejecución del Restore:**
   ```bash
   ./scripts/restore-db.sh /var/backups/fenixcms/latest.dump.enc
   ```
5. **Verificación de Integridad:**
   ```bash
   tsx scripts/verify-backup-integrity.ts
   ```
6. **Reactivación del Tráfico:**
   Retirar la página de mantenimiento en Nginx y verificar el dashboard de administración.
