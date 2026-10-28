#!/usr/bin/env bash
# Script de Backup do Banco de Dados e Arquivos do PDV-URY
# Salva localmente em /mnt/hd/Backups/pdv-ury e (se configurado) sincroniza com Google Drive via rclone.

set -euo pipefail

BACKUP_ROOT="/mnt/hd/Backups/pdv-ury"
SITE_NAME="${SITE_NAME:-ury.localhost}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DEST_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "${DEST_DIR}"

echo "==> [1/3] Gerando backup completo (banco + arquivos) do site '${SITE_NAME}' no container..."
sg docker -c "docker exec pdv-ury-frappe bench --site ${SITE_NAME} backup --with-files"

echo "==> [2/3] Copiando arquivos de backup para ${DEST_DIR} (no HD de 1 TB)..."
sg docker -c "docker exec pdv-ury-frappe bash -c 'cp /home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups/* /backups/${TIMESTAMP}/ && rm -f /home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups/*'"

# Mantem apenas os ultimos 30 backups locais para organizar o espaco
ls -1dt "${BACKUP_ROOT}"/20* 2>/dev/null | tail -n +31 | xargs -r rm -rf

echo "✅ Backup local salvo com sucesso em: ${DEST_DIR}"
ls -lh "${DEST_DIR}"

# Sincronizacao opcional com Google Drive via rclone (se o remote 'gdrive' estiver configurado)
if rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
  echo "==> [3/3] Sincronizando backups com o Google Drive (gdrive:Backups-PDV-URY)..."
  rclone copy "${DEST_DIR}" "gdrive:Backups-PDV-URY/${TIMESTAMP}" --progress
  echo "✅ Backup sincronizado na nuvem (Google Drive)!"
else
  echo "ℹ️  Dica: Para ativar envio automatico para o Google Drive, configure o rclone com: rclone config (nome: gdrive)"
fi
