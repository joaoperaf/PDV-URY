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
    - **Cardápio Digital Público (WhatsApp):** `http://localhost:8000/menu`
    - **Cozinha KDS Standalone (Mosaic):** `http://localhost:8000/mosaic`
  - **Backup Automático do Banco de Dados:**
    - Script [`scripts/backup-db.sh`](./scripts/backup-db.sh) testado e agendado no `crontab` (a cada 4 horas), salvando em `/mnt/hd/Backups/pdv-ury/` e pronto para sincronizar com Google Drive (`rclone config` -> remote `gdrive`).

---

## 6. Histórico de Sessões / Últimos Passos

### [2026-11-03] — iFood: base de polling implementada
- Criados os DocTypes singleton `iFood Settings` e `iFood Event Log`.
- Implementado o cliente backend OAuth Client Credentials, com `Client Secret` protegido por campo `Password` e token armazenado somente no cache do Frappe.
- Implementado polling em `GET /order/v1.0/events:polling` e ACK em `POST /order/v1.0/events/acknowledgment`, usando o header opcional `x-polling-merchants`, com execução agendada a cada minuto.
- Eventos são persistidos de forma idempotente antes do ACK em `POST /order/v1.0/events/acknowledgment`, permitindo reprocessar ACKs sem duplicar registros.
- Ainda não há criação de POS Invoice, confirmação do pedido ou envio ao KDS; esta etapa é somente o inbox confiável de eventos.
- Corrigida a normalização dos timestamps ISO do iFood para o formato aceito pelo MariaDB. O teste local recebeu e confirmou 2 eventos de teste; o scheduler continua executando sem erros.
- Criado o DocType `iFood Order` para armazenar cada pedido uma única vez, com payload completo, identificadores, tipo, status e timestamps.
- O polling agora consulta `GET /order/v1.0/orders/{orderId}` para eventos pendentes, salva os detalhes e marca o evento como `Processed`; falhas ficam registradas no próprio evento.
- Validada a busca dos detalhes dos pedidos de teste: 4 pedidos iFood foram armazenados e os 6 eventos correspondentes ficaram `Processed`.
- Analisado o payload real: itens usam `externalCode`, adicionais aparecem aninhados em `options`/`customizations`, e pedidos de teste podem estar pré-pagos online. Criado o DocType `iFood Item Mapping` para vincular códigos do catálogo iFood aos itens ERP antes da criação da POS Invoice.
- O `iFood Order` agora calcula `mapping_status`: pedidos com códigos desconhecidos ficam `Pending Mapping`; quando todos os códigos estiverem vinculados, passam a `Ready to Import`. Os códigos pendentes ficam visíveis no campo `unmapped_codes`.
- A classificação foi aplicada aos 4 pedidos de teste atuais, sem criar faturas incorretas. O próximo passo é preencher os mapeamentos do catálogo de teste ou implementar a importação automática do catálogo real.
- Para o teste ponta a ponta, foram criados mapeamentos temporários `1334 -> Burguinho` e `8849 -> Burger`; os adicionais permanecem nas observações da comanda, não viram estoque fictício.
- Implementada a importação automática dos pedidos `Ready to Import`: cria uma `POS Invoice` Draft do tipo `Aggregators`, registra o pagamento iFood online sem cobrança local e gera o KOT. O pedido de teste `1877` criou `AGG-00003` e `KOT-URY-00007`, em `Ready For Prepare`.
- O polling agora executa também a importação automática após buscar os detalhes; pedidos sem mapeamento continuam bloqueados.
- Validados `py_compile`, JSON dos DocTypes, `git diff --check`, migração/reload dos DocTypes no site `ury.localhost` e execução do polling autenticado.
- Implementado o primeiro retorno de status ao iFood: ao marcar um KOT de uma POS Invoice com `custom_aggregator_id` como `Served`, o backend chama `POST /order/v1.0/orders/{orderId}/readyToPickup`.
- O resultado da sincronização é gravado em `iFood Order` (`external_status`, `last_sync_status`, `last_sync_error` e `last_synced_at`), com proteção contra reenvio de `READY_TO_PICKUP` e registro explícito de falhas.
- Validado no pedido de teste `2128`: KOT `KOT-URY-00008` foi servido e o iFood respondeu com sucesso; o pedido ficou `READY_TO_PICKUP`.
- Implementada confirmação automática após a importação da POS Invoice (`POST /order/v1.0/orders/{orderId}/confirm`), com proteção contra reenvio e registro de falhas.
- Eventos recebidos pelo polling agora atualizam o `external_status` do `iFood Order`, incluindo cancelamentos (`CAN -> CANCELLED`), sem cancelar automaticamente a venda local antes de definir a política financeira.
- Política de cancelamento definida: pedidos iFood em rascunho são cancelados automaticamente; pedidos já enviados ao KDS cancelam a venda e os KOTs; faturas submetidas são canceladas pelo fluxo padrão do ERPNext; todos os casos geram registro e alerta para usuários com papel `URY Admin` ou `System Manager`.
- Implementado `cancel_local_ifood_order`, acionado por eventos `CAN` e por pedidos já recebidos como `CANCELLED`; o status local passa a `Cancelled` e o pedido não é importado quando o cancelamento chega antes da criação da fatura.
- Validados `py_compile`, JSON do DocType, `git diff --check`, reload do DocType e polling autenticado após a alteração.

### [2026-11-03] — Roteamento automático de novos produtos para o KDS
- Corrigida a geração de KOT para que itens cujo grupo ainda não esteja cadastrado em uma unidade de produção sejam encaminhados automaticamente à cozinha padrão da filial.
- O pedido continua registrando um aviso de configuração, mas não deixa mais o produto fora do KDS silenciosamente.
- Validada a sintaxe do backend e o `git diff --check`.

### [2026-11-03] — Aba de pedidos cancelados
- Adicionada a aba **Cancelados** em `/pos/orders`, logo abaixo de **Pagos Recentemente**.
- A lista consulta `POS Invoice` com status `Cancelled` e exibe o motivo do cancelamento no detalhe.
- Validado o build do POS, a sintaxe do backend e o `git diff --check`.

### [2026-11-01] — Auditoria de UI/UX do PDV com UI Taste e Uizze UI
- Realizada análise somente leitura das superfícies `/pos`, `/pos/kitchen`, `/mosaic`, `/ury` e `/order`, com foco em fluxo de venda, KDS, painel gerencial, acessibilidade, responsividade, estados e consistência visual.
- Principais prioridades identificadas: tornar a adição/edição de itens explícita no PDV (sem depender de duplo clique), substituir o painel de pedido fixo por comportamento responsivo, completar estados de erro/empty/retry do KDS e painel, e reativar visualizações analíticas úteis no dashboard.
- Nenhum código de produto foi alterado nesta auditoria; alterações locais pré-existentes foram preservadas.
- Criadas 9 issues no fork `joaoperaf/PDV-URY`, priorizadas de P1 a P3, cobrindo fluxo do PDV, responsividade, estados do KDS, analytics, acessibilidade de pagamento, touch targets, semântica do KDS, performance N+1 e consistência visual.
- Implementada a issue #9: removida a lógica de duplo clique do POS; cards agora têm ações semânticas separadas para `Adicionar` e `Opções`, com labels acessíveis e dica do carrinho atualizada. O build do POS passou; o lint dos arquivos alterados não tem erros, apenas warnings preexistentes de uso de elementos HTML nativos em `POS.tsx`.
- Criadas 7 novas issues de melhoria visual com UI Taste/Uizze UI: #13 (hierarquia do POS), #11 (estados visuais), #12 (leitura do KDS), #16 (dashboard operacional), #10 (cardápio digital), #14 (tipografia/densidade) e #15 (motion). A issue #8 existente continua sendo a base para tokens e linguagem visual compartilhada.
- Implementada a issue #13: o carrinho do POS ganhou resumo com contagem de itens, total com maior hierarquia tipográfica, botão de envio em tamanho destacado, ação de comentário com label acessível e feedback de quantidade nos cards do menu. Build e lint dos arquivos alterados passaram; inspeção visual em navegador ainda não foi realizada.
- Iniciada a issue #11 no POS: criado o componente compartilhado `StateMessage` em `packages/ui` e aplicados estados padronizados de erro, vazio e retry no carregamento do POS/cardápio, removendo o bloco de erro duplicado. Typecheck do `@ury/ui`, lint dos arquivos alterados, build do POS e `git diff --check` passaram; a issue permanece aberta para aplicar o padrão às demais superfícies.
- Retomado o `static-menu/` com foco em experiência mobile: carrinho convertido em bottom sheet, botão flutuante ocupa a largura útil com safe area, categorias e ações ganharam alvos de toque maiores, cards passaram a empilhar em telas estreitas, foco visível e estados ARIA foram reforçados. `node --check` e `git diff --check` passaram; inspeção visual em dispositivo/navegador ainda não foi realizada.
- Integrado o cardápio estático ao Frappe em `/menu`: os assets foram publicados em `ury/public/static-menu`, criada a página `ury/www/menu.html`, e os atalhos do painel/PDV passaram a abrir essa rota. A tela antiga sem QR em `/order` agora é clicável e direciona para o novo cardápio; build do `self-order`, rota local, JSON e script publicados foram validados.
- Ajustado o fallback de `/order` para redirecionar imediatamente para `/menu` quando não houver token de QR, tanto no bundle React quanto no HTML inicial, evitando que cache ou a mensagem antiga permaneçam visíveis. O fluxo com token continua carregando o autoatendimento.
- Refinado visualmente o cardápio digital: cabeçalho com eyebrow e busca destacada, introdução do menu com contagem de itens, categorias traduzidas e mais legíveis, cards com hierarquia de categoria/nome/descrição/preço, estados de foco e movimento reduzido, backdrop para fechamento do carrinho e checkout com ação mais evidente. As alterações foram publicadas em `/menu`; `node --check`, `git diff --check`, rota, assets e `menu.json` foram validados. Não houve captura visual real em navegador nesta etapa.
- Ajustado o carrinho lateral do cardápio: ao adicionar qualquer item, o painel abre automaticamente e permanece disponível para revisar quantidades e checkout; abertura, fechamento, backdrop e `aria-expanded`/`aria-hidden` agora usam o mesmo estado. Script publicado e validado com `node --check`.
- Adaptado o painel lateral do pedido seguindo a direção visual da referência Dribbble fornecida pelo usuário: drawer elevado com cantos amplos, cabeçalho de checkout, itens em blocos suaves, steppers compactos, área de dados separada e rodapé fixo com total e ação principal escura. Não foram inventadas imagens de produtos; o painel mantém os dados reais do menu. HTML/CSS/JS publicados em `/menu` e validações de script/diff/rota concluídas; inspeção visual real em navegador ainda não foi possível.
- Refeito o conteúdo do carrinho para o formato solicitado: cada item agora mostra imagem, nome, categoria, preço unitário, controle de quantidade e valor total da linha alinhado à direita. Imagens reais de referência culinária foram adicionadas ao contrato do `static-menu/menu.json`, reaproveitadas no cardápio e no drawer; os URLs responderam durante a validação. Alterações publicadas e `node --check`/`git diff --check` passaram.
- Criado o fluxo de personalização por produto no `static-menu`: o botão do card agora abre um card expandido na própria página, sem nova janela, com foto, descrição, ponto da carne para hambúrgueres, observações, adicionais de carne/bacon/cebola caramelizada/queijo, quantidade e subtotal em tempo real. O item só entra no carrinho após confirmação, preservando as especificações no resumo lateral. Fluxo publicado em `/menu`; `node --check`, rota e `git diff --check` passaram.
- Refinado o fluxo conforme feedback: qualquer clique no card do produto abre os detalhes; a personalização agora aparece como popup menor sobre o menu, com backdrop, animação curta, fechamento por `×`, clique fora e `Escape`. O popup mantém imagem, especificações e subtotal, sem abrir nova janela; alterações publicadas e validações de JavaScript/diff/rota concluídas.
- Corrigido o comportamento do popup ao alterar o ponto da carne: antes o `innerHTML` completo era recriado, reiniciando a animação e aparentando fechar/reabrir. Agora ponto da carne, adicionais e quantidade atualizam somente o estado visual e o subtotal, preservando popup, posição e foco. Script publicado e validado.
- Ajustado o fluxo de seleção rápida: os cards agora exibem `Adicionar`, que inclui o produto padrão diretamente no pedido; o clique em qualquer outra área do card continua abrindo o popup de personalização. O carrinho ganhou a ação `Editar`, que reabre as configurações do item e permite alterar ponto, adicionais, observações e quantidade. Fluxo publicado e validado com `node --check`/`git diff --check`.
- Adicionada quantidade individual aos adicionais no popup: cada opção agora possui controles `− / quantidade / +`, permitindo selecionar, por exemplo, 3 carnes ou 3 queijos. O subtotal considera a quantidade de cada adicional, e o carrinho preserva e exibe essas quantidades ao editar ou revisar o item. Script/CSS publicados e validações concluídas.
- Criadas as issues visuais #17 a #23 para o cardápio, priorizadas entre P1 e P3. Implementada e encerrada a #17: cabeçalho com hierarquia e acabamento refinados, cards com imagens maiores, preço/ação reorganizados, botão `Adicionar` com ícone e estados hover/focus mais consistentes. `node --check`, `git diff --check` e a rota `/menu` passaram.
- Corrigido overflow visual dos cards reportado pelo usuário: a grade agora respeita uma largura mínima adequada para o conteúdo, os textos podem quebrar sem invadir o card vizinho, e o conteúdo interno pode encolher corretamente. Ajuste publicado no CSS e validado com `git diff --check` e rota de assets.
- Reorganizada a navegação de categorias do cardápio: no desktop ela aparece como sidebar esquerda sticky, com estado ativo destacado e foco/hover consistentes; no mobile vira uma faixa horizontal rolável de chips com alvos de toque preservados. O filtro continua usando o mesmo estado e não houve duplicação de lógica. Estrutura/CSS publicados e validações de script, diff e rota concluídas.
- Atualizado somente o logo do cardápio digital com `Downloads/Foto/Logo Tipográfico Pericles Burger.png`, publicado em `static-menu/assets` e `ury/public/static-menu/assets`. Os dois arquivos ficaram com o mesmo SHA-256 e o asset servido em `/menu` foi validado; logos do restante do sistema não foram alterados.
- Redimensionado o novo logo do cardápio para o mesmo quadro do asset anterior (`1178×411`), ajustando o conteúdo visível com transparência e mantendo proporção. Os dois assets publicados têm o mesmo SHA-256; a imagem servida em `/menu` foi validada.
- Aumentada a apresentação do logo no cabeçalho do cardápio: largura máxima de `320px` no desktop e `280px` no mobile, com altura proporcional e sem alterar os demais logos do sistema. CSS publicado e validado na rota de assets.

### [2026-10-30] — Logo do dashboard atualizado
- Substituída somente a imagem do logo do cabeçalho do dashboard `/ury` em `frontend/src/components/layout/Header.tsx`.
- Atualizado `frontend/Public/logo-pericles-burger.png` com a nova arte tipográfica fornecida pelo usuário.
- Ajustado o enquadramento para compensar o espaço transparente da imagem quadrada, mantendo aproximadamente a dimensão visual padrão do cabeçalho.
- Reduzida a imagem interna de 74px para 56px para evitar o corte na parte superior do texto do logotipo.
- O build do frontend foi concluído com sucesso.
- Os logos do POS, KDS, cardápio digital e Frappe permanecem inalterados para validação gradual.

### [2026-10-30] — Ajuste de escala do logo do dashboard
- Atualizada a arte do dashboard com `Logotipo PERICLES Amarelo com Sublinhado.png`.
- Removidas as margens transparentes da imagem e ajustado o cabeçalho para 112px de largura por 40px de altura, evitando corte e mantendo o logo maior.
- O build do frontend foi concluído com sucesso; os demais logos permanecem inalterados.

### [2026-10-30] — Logo aplicado ao POS e KDS
- Aplicada a mesma logo aprovada em `pos/src/components/Header.tsx`, abrangendo o PDV e a tela de pedidos (`/pos/orders`), com asset em `pos/public/logo-pericles-burger.png`.
- Aplicada a mesma logo em `mosaic/src/components/Header.vue`, com asset em `mosaic/src/assets/logos/logo-pericles-burger.png`.
- Builds do POS e do KDS concluídos com sucesso; cardápio digital, POS legado e logos do Frappe permanecem inalterados.

### [2026-10-30] — Cardápio digital integrado ao POS
- Criado o endpoint público `ury.ury_pos.api.create_public_order`, que valida o cardápio ativo, cria/recupera o cliente e registra uma `POS Invoice` em estado `Draft`, sem pagamento confirmado.
- O checkout público continua abrindo o WhatsApp com o resumo do pedido, agora incluindo o número da fatura/pedido; a operação fica disponível na aba `Pedidos` do POS para confirmação e pagamento.
- O pedido público não gera baixa financeira nem KOT antes da confirmação no POS.
- Build do cardápio digital concluído com sucesso; o endpoint público também foi validado com rejeição correta de carrinho vazio.

### [2026-10-30] — Tradução das categorias do menu do POS
- Ajustados os rótulos exibidos na barra lateral do POS: `Beverages` → `Bebidas`, `Starters` → `Entradas` e `Main Course(s)` → `Hamburgers`.
- Os nomes internos das categorias permanecem inalterados para não afetar filtros, cardápio ou backend.
- Build do POS concluído com sucesso. O typecheck completo ainda aponta erros preexistentes em `PaymentDialog.tsx`, `ProductDialog.tsx`, `TableMergeDialog.tsx` e `Table.tsx`.

### [2026-10-30] — Novo cardápio estático econômico
- Criada a pasta `static-menu/` com HTML, CSS, JavaScript e `menu.json`, sem dependência do Frappe, Docker, banco de dados ou notebook ligado.
- O site oferece busca, categorias, carrinho, dados básicos do cliente e envio do pedido formatado para o WhatsApp.
- Copiada a logo aprovada para `static-menu/assets/logo-pericles-burger.png`; produtos e preços iniciais foram preenchidos com os itens atualmente retornados pelo cardápio local.
- A vitrine pública antiga foi desativada em `self-order/src/App.tsx` para acessos sem token; os fluxos internos com QR Code continuam preservados.
- Validados `node --check`, `git diff --check`, carregamento via servidor HTTP local e build do `self-order`.

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
- [ ] **Auditoria UI/UX:** implementar e validar as prioridades da análise de 2026-11-01 em viewport desktop, tablet e mobile, começando pelo fluxo `/pos` → pedido → pagamento.
- [x] **Cardápio estático econômico:** Criada a pasta `static-menu/`, independente do Frappe, Docker e banco de dados, com `menu.json` editável, carrinho no navegador e envio direto ao WhatsApp. A vitrine pública antiga em `/order` foi desativada para acessos sem token; fluxos internos com QR Code continuam preservados.
- [x] **Cardápio estático integrado:** Disponibilizado também em `/menu` dentro do Frappe, mantendo `/order` para fluxos antigos com QR Code e encaminhando acessos públicos sem token para o novo cardápio.
- [x] **Passo 5 (parcial):** Substituído o logo do cabeçalho do dashboard `/ury` pela marca Péricles Burger, usando `frontend/Public/logo-pericles-burger.png`. O frontend foi recompilado com sucesso; os demais logos do sistema permanecem inalterados até validação visual.
- [x] **Passo 1:** Clonar projeto no HD (`/mnt/hd`), criar tag `v0.2.1-original` e configurar protocolo Multi-LLM (`HANDOFF.md` + `AGENTS.MD`).
- [x] **Passo 2:** Instalar e configurar o **Docker** apontando seu `data-root` para `/mnt/hd/docker` (preservando o SSD) + autenticar GitHub (`gh`).
- [x] **Passo 3:** Subir o ambiente Docker do Frappe/ERPNext v15 + URY, compilar frontends e configurar rotina automática de backup do banco de dados em `/mnt/hd/Backups/pdv-ury`.
- [x] **Passo 4:** Traduzir 100% do sistema (PDV, KDS Mosaic, Autoatendimento, Captain, Painel Gerencial, Wizard, 17 Relatórios e Backend Frappe) para Português do Brasil (`PT-BR`, tag `v0.3.0-ptbr`).
- [ ] **Passo 5:** Realizar a configuração inicial do restaurante (Péricles Burger) e iniciar novas customizações de regras de negócio / fluxo operacional.
- [ ] **iFood — próxima etapa:** preencher as credenciais no `iFood Settings`, gerar um pedido de teste no Developer Portal e validar o recebimento no `iFood Event Log` antes de implementar o mapeamento para POS Invoice/KDS.
