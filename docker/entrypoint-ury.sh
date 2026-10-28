#!/usr/bin/env bash
set -euo pipefail

BENCH_DIR="/home/frappe/frappe-bench"
SITE_NAME="${SITE_NAME:-ury.localhost}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-admin123}"
DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
REDIS_CACHE="${REDIS_CACHE:-redis-cache:6379}"
REDIS_QUEUE="${REDIS_QUEUE:-redis-queue:6379}"

cd "$BENCH_DIR"

echo "==> [PDV-URY] Configurando common_site_config.json..."
mkdir -p sites/assets
cat > sites/common_site_config.json <<EOF
{
  "db_host": "${DB_HOST}",
  "db_port": ${DB_PORT},
  "redis_cache": "redis://${REDIS_CACHE}",
  "redis_queue": "redis://${REDIS_QUEUE}",
  "redis_socketio": "redis://${REDIS_QUEUE}",
  "socketio_port": 9000,
  "webserver_port": 8000,
  "serve_default_site": true,
  "default_site": "${SITE_NAME}",
  "developer_mode": 1
}
EOF

echo "==> [PDV-URY] Registrando apps em sites/apps.txt..."
cat > sites/apps.txt <<EOF
frappe
erpnext
ury
EOF

echo "==> [PDV-URY] Instalando pacote Python do URY em modo editavel (pip install -e)..."
/home/frappe/frappe-bench/env/bin/pip install --quiet --no-deps -e /home/frappe/frappe-bench/apps/ury

echo "==> [PDV-URY] Vinculando assets estaticos..."
cp -rn /home/frappe/frappe-bench/assets/* /home/frappe/frappe-bench/sites/assets/ 2>/dev/null || true
ln -sfn /home/frappe/frappe-bench/apps/frappe/frappe/public /home/frappe/frappe-bench/sites/assets/frappe
ln -sfn /home/frappe/frappe-bench/apps/erpnext/erpnext/public /home/frappe/frappe-bench/sites/assets/erpnext
ln -sfn /home/frappe/frappe-bench/apps/ury/ury/public /home/frappe/frappe-bench/sites/assets/ury

if [ ! -f "sites/${SITE_NAME}/site_config.json" ]; then
  echo "==> [PDV-URY] Criando novo site '${SITE_NAME}' e instalando ERPNext + URY (isso leva de 2 a 5 minutos na primeira vez)..."
  bench new-site "${SITE_NAME}" \
    --mariadb-root-password "${DB_ROOT_PASSWORD}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --no-mariadb-socket \
    --install-app erpnext \
    --install-app ury \
    --set-default
  echo "==> [PDV-URY] Site '${SITE_NAME}' criado e URY instalado com sucesso!"
else
  echo "==> [PDV-URY] Site '${SITE_NAME}' ja existe. Verificando se o app 'ury' esta instalado..."
  if ! bench --site "${SITE_NAME}" list-apps | grep -q "^ury"; then
    bench --site "${SITE_NAME}" install-app ury
  fi
fi

echo "${SITE_NAME}" > sites/currentsite.txt

echo "==> [PDV-URY] Iniciando servicos em background (socketio, schedule, worker)..."
node /home/frappe/frappe-bench/apps/frappe/socketio.js &
bench schedule &
bench worker --queue short,default,long &

echo "==> [PDV-URY] Servidor pronto! Acesse http://localhost:8000 (Login: Administrator / Senha: ${ADMIN_PASSWORD})"
exec bench serve --port 8000
