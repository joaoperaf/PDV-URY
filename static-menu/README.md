# Cardápio estático

Este site não depende do Frappe, Docker, banco de dados ou notebook ligado.

## Alterar produtos

Edite `menu.json`. Para ocultar um item temporariamente, use `"available": false`.
Depois de editar, publique novamente a pasta `static-menu` no GitHub Pages, Cloudflare Pages ou Netlify.

Preencha `whatsappPhone` com o número da loja, incluindo DDD. Exemplo: `"5511999999999"`.

## Testar localmente

Acesse esta pasta com um servidor HTTP, pois o navegador pode bloquear `fetch` ao abrir o arquivo diretamente:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.
