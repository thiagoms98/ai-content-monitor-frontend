# NEON — AI Content Monitor

Frontend em React 19, Next.js, TypeScript e Tailwind CSS 4, integrado ao backend AI Content Monitor no Azure.

## Executar

Requisitos: Node.js 22.13+ e pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra http://localhost:3000. A API do Azure já está configurada por padrão. No PowerShell, se necessário, use `pnpm.cmd`.

Para apontar para outro backend, copie `.env.example` para `.env.local` e altere `API_URL`. Reinicie o desenvolvimento ou refaça o build após alterar essa variável. `NEXT_PUBLIC_API_URL` não é mais utilizada.

## Integração com a API

- Base: https://ai-content-api-a0hxhngeb6ewbeha.eastus-01.azurewebsites.net
- Swagger: https://ai-content-api-a0hxhngeb6ewbeha.eastus-01.azurewebsites.net/docs
- Contrato: https://ai-content-api-a0hxhngeb6ewbeha.eastus-01.azurewebsites.net/openapi.json

O navegador chama `/api/backend/analyze`, e o Next.js encaminha para `POST /analyze` no Azure. `/api/backend/health` encaminha para `GET /health`. Isso resolve o bloqueio de CORS observado para `http://localhost:3000`. O destino é configurado no servidor em `next.config.ts`.

O cliente em `lib/blog/moderation.ts` envia `FormData` (`multipart/form-data`):

- `text`: texto, omitido quando vazio.
- `image`: arquivo JPG/PNG binário, com nome e tipo MIME, omitido quando ausente.

É obrigatório informar pelo menos um dos campos. O navegador define Content-Type e boundary. A imagem usa data URL apenas para a prévia na interface.

Exemplo real de resposta:

```json
{
  "status": "approved",
  "severity": 0,
  "duration_ms": 171,
  "categories": [],
  "analyzed": { "text": true, "image": true }
}
```

O frontend respeita a decisão `approved` ou `blocked` da API. Só publica após validar a resposta e confirmar `analyzed.text` e/ou `analyzed.image` para cada conteúdo enviado. Bloqueios exibem as categorias. Erros e bloqueios preservam o rascunho para correção e nova tentativa.

O formulário aceita texto de até 10.000 caracteres e imagens JPG/PNG de até 4 MB, entre 50 e 7200 pixels por dimensão. A requisição tem timeout de 60 segundos.

O painel “Conexão com a API” permite alterar o endereço apenas durante a sessão. O padrão é `/api/backend`; uma URL externa direta depende de CORS no backend.

A API fornece análise e saúde, sem rotas para salvar ou listar posts. Posts e imagens ficam no estado React e desaparecem ao recarregar a página. Ao solicitar análise, o conteúdo é enviado ao backend Azure.

## Build e hospedagem

```sh
pnpm build
pnpm start
```

A aplicação precisa de um ambiente que execute Next.js, como Vercel ou um servidor Node.js. A exportação estática para `out/` foi removida porque o encaminhamento à API depende do servidor. Não publique arquivos antigos de `out/`.

Na Vercel, utilize o preset Next.js e a configuração padrão de saída. Remova qualquer override anterior que publique `out/`. `API_URL` é opcional e aponta para o Azure por padrão. Refazer o deploy aplica mudanças nessa variável. Credenciais dos serviços de IA continuam exclusivamente no backend.

## Organização

- `app/`: página, layout e estilos.
- `components/blog/`: formulário de publicação e cartões de posts.
- `lib/blog/moderation.ts`: contrato da API, cliente HTTP e validação de imagens.
- `next.config.ts`: encaminhamento para o backend.
- `tests/moderation.mjs`: testes isolados do cliente HTTP.
- `tests/api-smoke.mjs`: testes explícitos contra a API real, pelo Next.js.
- `tests/fixtures/neutral.png`: imagem neutra para os testes.

## Verificação

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Os testes padrão usam respostas simuladas e não enviam conteúdo à API.

Com o frontend em execução, valide a integração real:

```sh
pnpm test:api
```

Esse comando envia exemplos de texto, imagem, texto com imagem e conteúdo que deve ser bloqueado; também verifica saúde e validação de entrada vazia. O resultado depende da disponibilidade e da política de moderação do backend. Para outra porta ou para testar a API diretamente, defina `SMOKE_API_URL` com a URL base desejada.
