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

- **Ambiente Local:**
  - `git` instalado e configurado (`João Pedro Reis`).
  - Repositório clonado fisicamente em `/mnt/hd/projetos/PDV-URY` (com symlink em `/home/pericles-burger/PDV-URY`).
  - Remotes `origin` e `upstream` configurados.
  - Tag `v0.2.1-original` criada no commit base (`cabe174`).
  - **Node.js v20.18.3 LTS** e **Yarn 1.22.22** instalados fisicamente em `/mnt/hd/tools/node` (com symlinks em `~/.local/bin` e todos os caches em `/mnt/hd/.cache`, ocupando 0 MB no SSD).
  - **Docker v29.1.3** e **Docker Compose v2.40.3** instalados e ativos, com `Docker Root Dir: /mnt/hd/docker` confirmado.
  - **GitHub CLI (`gh` 2.45.0)** e **Rclone (`1.60.1`)** instalados para autenticação Git e sincronização de backups em nuvem.

---

## 6. Histórico de Sessões / Últimos Passos

### [2026-10-28] — Passo 2 Concluído: Docker em `/mnt/hd/docker`, Node 20/Yarn e Ferramentas (Antigravity)
- Instalado Node.js v20.18.3 e Yarn 1.22.22 em `/mnt/hd/tools/node` com caches globais apontando para `/mnt/hd/.cache/npm`, `/mnt/hd/.cache/yarn` e `/mnt/hd/.cache/corepack`.
- Criado e executado o script [`scripts/setup-docker-hd.sh`](./scripts/setup-docker-hd.sh), configurando `/etc/docker/daemon.json` com `"data-root": "/mnt/hd/docker"` e instalando `docker.io`, `docker-compose-v2`, `gh` e `rclone`.
- Verificado que `Docker Root Dir` está em `/mnt/hd/docker` e o SSD (`/`) permanece intacto (92 GB livres).

### [2026-10-28] — Passo 1: Estruturação Inicial, Proteção do SSD e Protocolo Multi-LLM (Antigravity)
- Clonado o repositório `joaoperaf/PDV-URY` e movido fisicamente para `/mnt/hd/projetos/PDV-URY` (com symlink em `~/PDV-URY`) para poupar o SSD de 116 GB.
- Configurado remote `upstream` apontando para `https://github.com/ury-erp/ury.git`.
- Criada a tag `v0.2.1-original` no commit original do fork para permitir rollback seguro a qualquer momento.
- Criado este arquivo `HANDOFF.md` e atualizado o `AGENTS.MD` (além de instruções para Cursor/Copilot) com as regras de hardware (`/mnt/hd`), Git e passagem de bastão entre LLMs.

---

## 7. Próximos Passos Planejados
- [x] **Passo 2:** Instalar e configurar o **Docker** apontando seu `data-root` para `/mnt/hd/docker` (preservando o SSD) + configurar cache do Node/Yarn em `/mnt/hd/.cache`.
- [ ] **Passo 3:** Subir o ambiente Docker do Frappe/ERPNext v15 + URY e configurar rotina automática de backup do banco de dados (local em `/mnt/hd/Backups/pdv-ury` + nuvem).
- [ ] **Passo 4:** Definir e iniciar as primeiras customizações de código no PDV-URY em branches dedicadas.
