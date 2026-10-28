#!/usr/bin/env bash
# Script de instalacao e configuracao do Docker no HD de 1 TB (/mnt/hd/docker)
# Protege o SSD principal (/) contra consumo de espaco por imagens/volumes Docker.

set -euo pipefail

echo "==> [1/5] Criando pastas do Docker e Backups no HD (/mnt/hd)..."
mkdir -p /mnt/hd/docker /mnt/hd/Backups/pdv-ury

echo "==> [2/5] Configurando /etc/docker/daemon.json para usar /mnt/hd/docker..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/mnt/hd/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo "==> [3/5] Instalando Docker, Docker Compose v2, GitHub CLI (gh) e Rclone..."
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 gh rclone

echo "==> [4/5] Adicionando usuario '$USER' ao grupo docker e reiniciando o servico..."
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker
sudo systemctl restart docker

echo "==> [5/5] Verificando se o Docker Root Dir esta apontando para /mnt/hd/docker..."
sudo docker info | grep "Docker Root Dir"

echo ""
echo "✅ Sucesso! O Docker foi instalado e configurado 100% no HD (/mnt/hd/docker)."
