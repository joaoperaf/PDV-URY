# HANDOFF.md — Diário de Bordo e Sincronização entre LLMs (PDV-URY)

> **ATENÇÃO (LEITURA OBRIGATÓRIA PARA QUALQUER LLM / AGENTE DE IA):**
> Este projeto é desenvolvido com o auxílio de múltiplas LLMs (Antigravity, Claude, Copilot, Cursor, etc.).
> 1. **Antes de iniciar qualquer código:** Leia este arquivo por completo para entender o contexto atual, restrições da máquina e o que a última IA fez.
> 2. **Ao finalizar qualquer tarefa:** Atualize a seção **Histórico de Sessões / Últimos Passos** e **Próximos Passos** antes de realizar o commit.

---

## 1. Sobre o Projeto
- **Repositório Fork (`origin`):** `https://github.com/joaoperaf/PDV-URY.git`
- **Repositório Oficial (`upstream`):** `https://github.com/ury-erp/ury.git` (branch base: `version-2`)
- **Tag de Segurança Original:** `v0.2.1-original` (aponta para o estado 100% intocado do projeto oficial antes das nossas modificações).
- **Objetivo:** Evoluir e customizar o sistema open-source **URY** (sistema de gestão e PDV para restaurantes baseado em Frappe/ERPNext v15) para operação local em máquina própria.

---

## 2. Regras Críticas de Hardware e Armazenamento (NÃO VIOLAR)

A máquina local possui **dois discos físicos**:
1. **SSD do Sistema (`/`, `/dev/sdb2`, 116 GB):** Reservado **exclusivamente** para o sistema operacional Ubuntu rodar liso e rápido.
2. **HD Secundário (`/mnt/hd`, `/dev/sda2`, 1 TB):** Destinado a todos os arquivos pesados, código-fonte, dependências, containers Docker, volumes de banco de dados e backups.

### Regras Obrigatórias para LLMs:
- **NUNCA** instale ou armazene imagens/volumes do Docker, pacotes pesados (`node_modules`, caches de Yarn/NPM/Pip) ou backups no SSD (`/` ou `/home/pericles-burger` direto sem symlink para `/mnt/hd`).
- **Caminho Físico do Projeto:** `/mnt/hd/projetos/PDV-URY` (com atalho simbólico em `/home/pericles-burger/PDV-URY`).
- **Caminho do Docker (`data-root`):** Deve ser configurado em `/mnt/hd/docker` (via `/etc/docker/daemon.json`) para que todas as imagens, containers e volumes do MariaDB/ERPNext fiquem no HD de 1 TB.
- **Caminho de Caches (Yarn/NPM):** Devem apontar para `/mnt/hd/.cache`.
- **Caminho de Backups do Banco de Dados:** `/mnt/hd/Backups/pdv-ury/`.

---

## 3. Regras de Versionamento (Git) e Segurança

1. **Commits Atômicos e Frequentes:**
   - Faça um commit sempre que concluir uma pequena etapa funcional e testada.
   - Nunca misture várias funcionalidades diferentes em um único commit.
   - Antes de iniciar uma alteração grande ou experimental, certifique-se de que `git status` está limpo.
2. **Branches por Funcionalidade:**
   - Mantenha a branch `version-2` estável.
   - Crie branches específicas para novas implementações (ex.: `feat/nome-da-funcionalidade`, `fix/nome-da-correcao`, `chore/setup-docker`).
3. **Tags de Checkpoint:**
   - A tag `v0.2.1-original` guarda o estado original do fork.
   - A cada marco importante concluído e validado pelo usuário, crie uma nova tag anotada (`git tag -a v0.X.Y-descricao -m "..."`) e envie ao GitHub (`git push origin --tags`).

---

## 4. Estratégia de Proteção do Banco de Dados (Contra Falha da Máquina)

Como o sistema rodará localmente neste notebook via Docker:
1. **Isolamento de Disco:** Os volumes do banco (MariaDB) e arquivos do site Frappe ficam em `/mnt/hd/docker`, separados do SSD do sistema.
2. **Rotina de Backup Automático Local + Nuvem (a ser ativada no Passo 2/3):**
   - O Frappe possui backup nativo (`bench --site <site> backup --with-files`), gerando arquivos compactados `.sql.gz` leves.
   - Esses dumps serão salvos automaticamente em `/mnt/hd/Backups/pdv-ury/` e sincronizados com a nuvem (ex.: Google Drive via integração nativa do ERPNext ou `rclone`), garantindo que, mesmo se o notebook não ligar mais, todo o banco de dados (vendas, produtos, clientes, configurações) possa ser restaurado em minutos em outra máquina.

---

## 5. Estado Atual do Projeto

- **Ambiente Local (100% Operacional):**
  - `git` instalado e autenticado no GitHub (`joaoperaf`).
  - Repositório clonado fisicamente em `/mnt/hd/projetos/PDV-URY` (com symlink em `/home/pericles-burger/PDV-URY`).
  - Remotes `origin` (`joaoperaf/PDV-URY`) e `upstream` (`ury-erp/ury`) configurados.
  - Tags criadas: `v0.2.1-original` (estado original do fork) e `v0.2.1-docker-ready` (ambiente Docker + backups prontos).
  - **Node.js v22.14.0 LTS** e **Yarn 1.22.22** instalados fisicamente em `/mnt/hd/tools/node` (com caches em `/mnt/hd/.cache` e `/mnt/hd/sites/common_site_config.json` criado para compilação local dos frontends).
  - **Todos os 5 frontends compilados** (`pos`, `frontend`, `self-order`, `mosaic`, `urypos`).
  - **Ambiente Docker rodando** ([`docker/docker-compose.yml`](./docker/docker-compose.yml) e [`docker/entrypoint-ury.sh`](./docker/entrypoint-ury.sh)) com volumes em `/mnt/hd/docker/volumes`:
    - `pdv-ury-frappe` (`frappe/erpnext:v15` + `ury` montado ao vivo de `/mnt/hd/projetos/PDV-URY`)
    - `pdv-ury-mariadb` (`mariadb:10.6`)
    - `pdv-ury-redis-cache` e `pdv-ury-redis-queue` (`redis:6.2-alpine`)
  - **Acesso Local ao Sistema:**
    - **URL Principal / Login:** `http://localhost:8000/login`
    - **Usuário:** `Administrator` | **Senha:** `admin`
    - **Painel Gestão URY:** `http://localhost:8000/ury`
    - **PDV v2 (React):** `http://localhost:8000/pos`
    - **Cozinha KDS/KOT (Mosaic):** `http://localhost:8000/mosaic`
    - **Autoatendimento:** `http://localhost:8000/order`
  - **Backup Automático do Banco de Dados:**
    - Script [`scripts/backup-db.sh`](./scripts/backup-db.sh) testado e agendado no `crontab` (a cada 4 horas), salvando em `/mnt/hd/Backups/pdv-ury/` e pronto para sincronizar com Google Drive (`rclone config` -> remote `gdrive`).

---

## 6. Histórico de Sessões / Últimos Passos

### [2026-10-28] — Passo 3 Concluído: Subida do ERPNext v15 + URY no Docker, Build dos Frontends e Backup Automático (Antigravity)
- Atualizado Node.js em `/mnt/hd/tools/node` para `v22.14.0 LTS` (compatível com todas as dependências) e compilados todos os 5 frontends (`yarn install && yarn build`).
- Criados [`docker/docker-compose.yml`](./docker/docker-compose.yml) e [`docker/entrypoint-ury.sh`](./docker/entrypoint-ury.sh), subindo os containers `pdv-ury-mariadb`, `pdv-ury-redis-cache`, `pdv-ury-redis-queue` e `pdv-ury-frappe` com o site `ury.localhost` e os apps `frappe`, `erpnext` e `ury` instalados.
- Criado e testado o script [`scripts/backup-db.sh`](./scripts/backup-db.sh) e configurado cronjob automático a cada 4 horas salvando em `/mnt/hd/Backups/pdv-ury/`.
- Criada a tag `v0.2.1-docker-ready` e enviado tudo para o GitHub (`origin`).

### [2026-10-28] — Passo 2 Concluído: Docker em `/mnt/hd/docker`, Node/Yarn e Ferramentas (Antigravity)
- Instalado Node.js e Yarn em `/mnt/hd/tools/node` com caches globais apontando para `/mnt/hd/.cache/npm`, `/mnt/hd/.cache/yarn` e `/mnt/hd/.cache/corepack`.
- Criado e executado o script [`scripts/setup-docker-hd.sh`](./scripts/setup-docker-hd.sh), configurando `/etc/docker/daemon.json` com `"data-root": "/mnt/hd/docker"` e instalando `docker.io`, `docker-compose-v2`, `gh` e `rclone`.
- Autenticado GitHub CLI (`gh auth login`) e enviado commits + tag `v0.2.1-original` para `origin`.

### [2026-10-28] — Passo 1: Estruturação Inicial, Proteção do SSD e Protocolo Multi-LLM (Antigravity)
- Clonado o repositório `joaoperaf/PDV-URY` e movido fisicamente para `/mnt/hd/projetos/PDV-URY` (com symlink em `~/PDV-URY`) para poupar o SSD de 116 GB.
- Configurado remote `upstream` apontando para `https://github.com/ury-erp/ury.git`.
- Criada a tag `v0.2.1-original` no commit original do fork para permitir rollback seguro a qualquer momento.
- Criado este arquivo `HANDOFF.md` e atualizado o `AGENTS.MD` (além de instruções para Cursor/Copilot) com as regras de hardware (`/mnt/hd`), Git e passagem de bastão entre LLMs.

---

## 7. Próximos Passos Planejados
- [x] **Passo 1:** Clonar projeto no HD (`/mnt/hd`), criar tag `v0.2.1-original` e configurar protocolo Multi-LLM (`HANDOFF.md` + `AGENTS.MD`).
- [x] **Passo 2:** Instalar e configurar o **Docker** apontando seu `data-root` para `/mnt/hd/docker` (preservando o SSD) + autenticar GitHub (`gh`).
- [x] **Passo 3:** Subir o ambiente Docker do Frappe/ERPNext v15 + URY, compilar frontends e configurar rotina automática de backup do banco de dados em `/mnt/hd/Backups/pdv-ury`.
- [ ] **Passo 4:** Definir e iniciar as primeiras customizações de código e configuração inicial do restaurante no PDV-URY em branches dedicadas.
