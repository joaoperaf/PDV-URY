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
  - Tags criadas: `v0.2.1-original` (estado original do fork), `v0.2.1-docker-ready` (ambiente Docker + backups prontos) e `v0.3.0-ptbr` (sistema 100% traduzido para Português do Brasil — PT-BR).
  - **Node.js v22.14.0 LTS** e **Yarn 1.22.22** instalados fisicamente em `/mnt/hd/tools/node` (com caches em `/mnt/hd/.cache` e `/mnt/hd/sites/common_site_config.json` criado para compilação local dos frontends).
  - **Todos os 5 frontends compilados e traduzidos para PT-BR** (`pos`, `frontend`, `self-order`, `mosaic`, `urypos`), com moeda padrão `R$` (`pt-BR`) e dicionário de backend Frappe (`ury/translations/pt-BR.csv` e `ury/translations/pt.csv`).
  - **Ambiente Docker rodando** ([`docker/docker-compose.yml`](./docker/docker-compose.yml) e [`docker/entrypoint-ury.sh`](./docker/entrypoint-ury.sh)) com volumes em `/mnt/hd/docker/volumes`:
    - `pdv-ury-frappe` (`frappe/erpnext:v15` + `ury` montado ao vivo de `/mnt/hd/projetos/PDV-URY`)
    - `pdv-ury-mariadb` (`mariadb:10.6`)
    - `pdv-ury-redis-cache` e `pdv-ury-redis-queue` (`redis:6.2-alpine`)
  - **Acesso Local ao Sistema:**
    - **URL Principal / Login:** `http://localhost:8000/login`
    - **Usuário:** `Administrator` | **Senha:** `admin`
    - **Painel Gestão URY:** `http://localhost:8000/ury`
    - **PDV v2 (React):** `http://localhost:8000/pos` (inclui aba nativa **Cozinha KDS** em `/pos/kitchen`)
    - **Cardápio Digital Público (WhatsApp):** `http://localhost:8000/order`
    - **Cozinha KDS Standalone (Mosaic):** `http://localhost:8000/mosaic`
  - **Backup Automático do Banco de Dados:**
    - Script [`scripts/backup-db.sh`](./scripts/backup-db.sh) testado e agendado no `crontab` (a cada 4 horas), salvando em `/mnt/hd/Backups/pdv-ury/` e pronto para sincronizar com Google Drive (`rclone config` -> remote `gdrive`).

---

## 6. Histórico de Sessões / Últimos Passos

### [2026-10-29] — Passo 5 (Etapa 1): Enxugamento para Operação 100% Delivery, KDS Integrado ao PDV e Cardápio Digital via WhatsApp (Antigravity)
- **Remoção de Mesas, Salões, Garçom e Dashboard Duplicado (`frontend/` e `pos/`):** Ocultados/removidos os módulos de Mesas (`Table`), Salões (`Room`), App de Garçom (`Captain`), contador de pessoas (`Pax`) na sacola, widgets de ocupação de mesas/garçons e o Dashboard duplicado dentro do `/pos` (mantendo apenas o Painel Principal em `/ury/dashboard`).
- **Menu Inferior Unificado (`/ury` e `/pos`):** Ativada e padronizada a barra inferior (`Footer.tsx`) tanto no Painel Principal (`/ury`) quanto no PDV (`/pos`), com o ícone de **Casinha (`Início` -> `/ury/dashboard`)** na 1ª posição, seguido de **PDV (`/pos/pos`)**, **Pedidos (`/pos/orders`)**, **Cozinha KDS (`/pos/kitchen`)** e **Cardápio Digital (`/order`)**.
- **Enxugamento de Relatórios (`/ury/reports`):** Removidos os 5 relatórios voltados a atendimento de salão/indústria (`employee-sales`, `employee-item-wise-sales`, `completed-work-orders`, `item-wise-purchase-history` e `daily-pnl` manual), mantendo os 12 relatórios essenciais de vendas, canais de delivery, ticket médio, horários de pico, produtos e clientes.
- **KDS Integrado na Barra do PDV (`/pos/kitchen`):** Criada a página [`pos/src/pages/Kitchen.tsx`](./pos/src/pages/Kitchen.tsx) acessível diretamente pelo menu inferior do PDV (`/pos`), permitindo acompanhar comandas em preparo e despachadas em tempo real sem sair do PDV.
- **Agregadores / Apps de Entrega (`AggregatorPage.tsx` e `ury/ury_pos/api.py`):** Corrigida a moeda de criação de Lista de Preços de `INR` para `BRL`, adicionados atalhos rápidos (`iFood`, `99Food`, `Rappi`, `WhatsApp`, `Aiqfome`), corrigido `getAggregatorItem` para herdar o cardápio ativo da loja com categorias/imagens e vincular automaticamente conta bancária padrão no `getAggregatorMOP`.
- **Cardápio Digital Compartilhável (`/order`):** Criado o endpoint público `ury.ury_pos.api.get_public_menu` e a vitrine digital [`self-order/src/layouts/PublicDigitalMenu.tsx`](./self-order/src/layouts/PublicDigitalMenu.tsx), permitindo compartilhar o link `/order` com clientes para montar a sacola (Delivery ou Retirada) e enviar o pedido formatado via WhatsApp.

### [2026-10-28] — Passo 4 Concluído: Tradução Completa para Português do Brasil (PT-BR) em 4 Etapas (Antigravity)
- **Etapa 1 (ERPNext Desk + PDV Principal `/pos`):** Configurado idioma padrão `pt-BR` no banco Frappe (`System Settings` e usuário `Administrator`), criado `pos/src/i18n/locales/pt-BR.json` com mais de 410 chaves traduzidas, registrado `pt-BR` como idioma padrão no i18next do PDV e formatador de moeda global em `packages/core/src/format.ts` (`pt-BR`, `R$`).
- **Etapa 2 (KDS Cozinha `/mosaic`, Autoatendimento `/order` e App Garçom Captain):** Traduzidos todos os componentes de KDS (`mosaic/src/`), Totem/QR Code/Tablet (`self-order/src/`) e interface mobile do garçom (`pos/src/captain/`).
- **Etapa 3 (Painel Gerencial, Wizard de Setup, Cadastros e 17 Relatórios `/ury`):** Traduzidos todos os schemas JSON, formulários dinâmicos, guardas de rota, páginas de cadastros do Dashboard e as 17 telas de relatórios gerenciais/DRE em `frontend/src/` e `packages/ui/src/components/data-table.tsx`.
- **Etapa 4 (Backend Frappe — DocTypes, Campos, Roles e Mensagens de API):** Criados `ury/translations/pt-BR.csv` e `ury/translations/pt.csv` com 646 traduções de DocTypes, campos, opções, permissões, scripts do Desk e mensagens de erro/validação do backend Python, além de internacionalizar os rótulos do DRE em `ury/ury/report_api/financial.py`.
- Todos os frontends recompilados, cache do Frappe limpo (`bench --site ury.localhost clear-cache`), branch `feat/traducao-ptbr` mesclada na `version-2` e tag `v0.3.0-ptbr` criada e enviada ao GitHub (`origin`).

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
- [x] **Passo 4:** Traduzir 100% do sistema (PDV, KDS Mosaic, Autoatendimento, Captain, Painel Gerencial, Wizard, 17 Relatórios e Backend Frappe) para Português do Brasil (`PT-BR`, tag `v0.3.0-ptbr`).
- [ ] **Passo 5:** Realizar a configuração inicial do restaurante (Péricles Burger) e iniciar novas customizações de regras de negócio / fluxo operacional.
