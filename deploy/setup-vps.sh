#!/usr/bin/env bash
# ==============================================================================
# FENIXCMS SaaS — VPS INITIAL PROVISIONING & SETUP SCRIPT
# Target OS: Ubuntu 22.04 / 24.04 LTS, Debian 12
# ==============================================================================
# Usage:
#   sudo bash deploy/setup-vps.sh
#
# Environment variables (Optional overrides):
#   APP_DIR="/var/www/fenixcms"
#   APP_USER="fenixcms"
#   DB_NAME="fenixcms_prod"
#   DB_USER="fenix_db_user"
#   DB_PASSWORD="<STRONG_GENERATED_PASSWORD>"
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}    FENIXCMS SaaS — VPS AUTOMATED INITIAL PROVISIONING (FASE 23)   ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Error: Este script debe ejecutarse como root o con sudo.${NC}"
  exit 1
fi

APP_DIR="${APP_DIR:-/var/www/fenixcms}"
APP_USER="${APP_USER:-fenixcms}"
DB_NAME="${DB_NAME:-fenixcms_prod}"
DB_USER="${DB_USER:-fenix_db_user}"
LOG_DIR="${LOG_DIR:-/var/log/fenixcms}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fenixcms}"

echo -e "\n${YELLOW}⚙️ [1/8] Actualizando paquetes del sistema...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 ca-certificates lsb-release git build-essential ufw ufw logrotate certbot python3-certbot-nginx jq

echo -e "\n${YELLOW}⚙️ [2/8] Creando usuario de sistema sin privilegios (${APP_USER})...${NC}"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd -m -d /home/"${APP_USER}" -s /bin/bash "${APP_USER}"
  echo -e "${GREEN}✅ Usuario '${APP_USER}' creado.${NC}"
else
  echo -e "${GREEN}ℹ️ Usuario '${APP_USER}' ya existe.${NC}"
fi

echo -e "\n${YELLOW}⚙️ [3/8] Instalando Node.js 20 LTS...${NC}"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo -e "${GREEN}✅ Node.js $(node -v) y npm $(npm -v) instalados.${NC}"
else
  echo -e "${GREEN}ℹ️ Node.js $(node -v) ya se encuentra instalado.${NC}"
fi

echo -e "\n${YELLOW}⚙️ [4/8] Instalando y configurando PostgreSQL...${NC}"
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Generate random secure DB password if not provided
if [ -z "${DB_PASSWORD:-}" ]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
  echo -e "${GREEN}🔑 Contraseña de PostgreSQL generada automáticamente.${NC}"
fi

# Create PostgreSQL Database and User securely
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"

sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

echo -e "${GREEN}✅ Base de datos '${DB_NAME}' y usuario '${DB_USER}' configurados.${NC}"

echo -e "\n${YELLOW}⚙️ [5/8] Instalando Nginx...${NC}"
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✅ Nginx instalado y en ejecución.${NC}"

echo -e "\n${YELLOW}⚙️ [6/8] Configurando estructura de directorios y permisos seguros...${NC}"
mkdir -p "${APP_DIR}" "${LOG_DIR}" "${BACKUP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${BACKUP_DIR}"
chmod 750 "${APP_DIR}"
chmod 750 "${LOG_DIR}"
chmod 700 "${BACKUP_DIR}"

echo -e "${GREEN}✅ Directorios configurados con permisos de seguridad mínimos.${NC}"

echo -e "\n${YELLOW}⚙️ [7/8] Configurando Firewall UFW...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo -e "${GREEN}✅ Firewall UFW activado (Puertos 22, 80, 443 permitidos).${NC}"

echo -e "\n${YELLOW}⚙️ [8/8] Configurando Logrotate para FenixCMS...${NC}"
cat << EOF > /etc/logrotate.d/fenixcms
${LOG_DIR}/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ${APP_USER} ${APP_USER}
    sharedscripts
}
EOF
echo -e "${GREEN}✅ Logrotate configurado en /etc/logrotate.d/fenixcms.${NC}"

echo -e "\n${BLUE}==================================================================${NC}"
echo -e "${GREEN}🎉 PROVISIÓN INICIAL DEL VPS COMPLETADA CON ÉXITO${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo -e "Datos de conexión generados para .env (almacenar en /var/www/fenixcms/.env):"
echo -e "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public\""
echo -e "\nSiguiente paso: Ejecutar 'deploy/deploy.sh' desde el usuario '${APP_USER}'."
