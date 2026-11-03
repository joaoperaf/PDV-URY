#!/usr/bin/env bash
set -e

COMPOSE_FILE="/mnt/hd/projetos/PDV-URY/docker/docker-compose.yml"
ROTA="${1:-/ury}"
URL="http://localhost:8000${ROTA}"

# Verifica se o container principal está rodando
if ! docker ps --format '{{.Names}}' | grep -q '^pdv-ury-frappe$'; then
    if command -v notify-send >/dev/null 2>&1; then
        notify-send "PDV Péricles Burger" "Iniciando os servidores do sistema, aguarde alguns segundos..." -i /mnt/hd/projetos/PDV-URY/pos/public/ury_pos.png
    fi
    docker compose -f "$COMPOSE_FILE" up -d
fi

# Aguarda o servidor responder na porta 8000 (máximo 30 segundos)
for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:8000/login; then
        break
    fi
    sleep 1
done

xdg-open "$URL" >/dev/null 2>&1 &
