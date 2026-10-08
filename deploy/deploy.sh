#!/usr/bin/env bash
# ==============================================================================
# FENIXCMS SaaS — PRODUCTION DEPLOYMENT SCRIPT (FASE 23)
# Zero-Downtime Safe Execution & Health Validation
# ==============================================================================
# Usage:
#   bash deploy/deploy.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}        FENIXCMS SaaS — PRODUCTION DEPLOYMENT & MIGRATION         ${NC}"
echo -e "${BLUE}==================================================================${NC}"

APP_DIR="${APP_DIR:-/var/www/fenixcms}"

if [ -d "${APP_DIR}" ] && [ "$(pwd)" != "${APP_DIR}" ]; then
  cd "${APP_DIR}"
fi

# 1. Check for Production Environment File
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ Error Crítico: No se encontró el archivo .env en $(pwd).${NC}"
  echo -e "${RED}   Crea el archivo .env a partir de 'deploy/env.production.template'.${NC}"
  exit 1
fi

echo -e "\n${YELLOW}📦 [1/7] Instalando dependencias con npm ci...${NC}"
npm ci --prefer-offline --no-audit

echo -e "\n${YELLOW}🗄️ [2/7] Ejecutando migraciones de base de datos en PostgreSQL...${NC}"
npx prisma migrate deploy

echo -e "\n${YELLOW}⚡ [3/7] Generando cliente de Prisma...${NC}"
npx prisma generate

echo -e "\n${YELLOW}🏗️ [4/7] Compilando Next.js para producción (npm run build)...${NC}"
npm run build

echo -e "\n${YELLOW}👑 [5/7] Ejecutando bootstrap de datos maestros y Super Admin...${NC}"
npx tsx prisma/bootstrap-production.ts

echo -e "\n${YELLOW}🔄 [6/7] Reiniciando servicio systemd fenixcms...${NC}"
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet fenixcms.service; then
  sudo systemctl restart fenixcms.service
  echo -e "${GREEN}✅ Servicio fenixcms reiniciado.${NC}"
else
  echo -e "${YELLOW}ℹ️ Servicio systemd no activo o en modo local. Si estás en VPS ejecuta: sudo systemctl restart fenixcms.service${NC}"
fi

echo -e "\n${YELLOW}🩺 [7/7] Validando estado de salud de la aplicación (Health Check)...${NC}"
HEALTH_URL="http://127.0.0.1:3000/api/health?type=readiness"
MAX_ATTEMPTS=15
ATTEMPT=1
SUCCESS=0

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo -n "   Intento $ATTEMPT/$MAX_ATTEMPTS: Comprobando $HEALTH_URL... "
  if RESPONSE=$(curl -s -f -m 5 "$HEALTH_URL" 2>/dev/null); then
    STATUS=$(echo "$RESPONSE" | jq -r '.status // empty' 2>/dev/null || true)
    if [ "$STATUS" = "healthy" ]; then
      echo -e "${GREEN}HEALTHY (DB: OK)${NC}"
      SUCCESS=1
      break
    fi
  fi
  echo -e "${YELLOW}Esperando inicialización...${NC}"
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $SUCCESS -eq 1 ]; then
  echo -e "\n${BLUE}==================================================================${NC}"
  echo -e "${GREEN}🎉 DESPLIEGUE DE FENIXCMS EN VPS COMPLETADO EXITOSAMENTE${NC}"
  echo -e "${BLUE}==================================================================${NC}"
  exit 0
else
  echo -e "\n${RED}==================================================================${NC}"
  echo -e "${RED}❌ ALERTA: Health check falló después de $MAX_ATTEMPTS intentos.${NC}"
  echo -e "${RED}   Revisa los logs con: journalctl -u fenixcms -n 50 --no-pager${NC}"
  echo -e "${RED}==================================================================${NC}"
  exit 1
fi
