# Instruções para Agentes de IA (GitHub Copilot / Cursor / Claude / Antigravity)

1. **Contexto Multi-LLM Obrigatório:**
   - Sempre leia [`HANDOFF.md`](../HANDOFF.md) e [`AGENTS.MD`](../AGENTS.MD) antes de iniciar qualquer alteração no código.
   - Sempre atualize o [`HANDOFF.md`](../HANDOFF.md) ao concluir uma tarefa (registrando o que foi alterado e os próximos passos) antes de fazer commit.

2. **Restrição Crítica de Disco (SSD vs HD):**
   - O SSD (`/`, 116 GB) é exclusivo para o sistema operacional Ubuntu.
   - **NUNCA** crie containers/volumes Docker, caches pesados ou backups no SSD (`/`).
   - Todo armazenamento pesado deve permanecer no HD de 1 TB (`/mnt/hd`), onde o projeto está alocado (`/mnt/hd/projetos/PDV-URY`).

3. **Regras de Git:**
   - Faça commits pequenos e atômicos.
   - Use branches separadas por funcionalidade antes de fazer merge na branch principal (`version-2`).
