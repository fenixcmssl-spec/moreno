#!/usr/bin/env bash
# ==============================================================================
# FENIXCMS SaaS — AUTOMATED SSL CERTIFICATE ISSUANCE (CERTBOT LET'S ENCRYPT)
# Wildcard and Multi-Tenant Apex Domain Support
# ==============================================================================
# Usage:
#   sudo bash deploy/nginx-ssl-certbot.sh yourdomain.com admin@yourdomain.com
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo -e "${RED}Uso: sudo bash deploy/nginx-ssl-certbot.sh <DOMINIO_PRINCIPAL> <EMAIL_ADMIN>${NC}"
  echo -e "Ejemplo: sudo bash deploy/nginx-ssl-certbot.sh example.com admin@example.com"
  exit 1
fi

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}       CONFIGURACIÓN DE CERTIFICADO SSL/TLS LET'S ENCRYPT         ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Check for certbot
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y certbot python3-certbot-nginx
fi

echo -e "\n${YELLOW}🔒 [1/3] Obteniendo certificado SSL para ${DOMAIN} y www.${DOMAIN}...${NC}"
certbot certonly --nginx \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}"

echo -e "\n${YELLOW}⚙️ [2/3] Verificando renovación automática...${NC}"
certbot renew --dry-run

echo -e "\n${YELLOW}🔄 [3/3] Recargando Nginx...${NC}"
nginx -t && systemctl reload nginx

echo -e "\n${GREEN}✅ Certificado SSL instalado exitosamente para ${DOMAIN}.${NC}"
echo -e "Para subdominios comodín (*.${DOMAIN}), utiliza el plugin DNS de Certbot (ej. certbot-dns-cloudflare o certbot-dns-route53) con el flag --manual o --dns-cloudflare."
