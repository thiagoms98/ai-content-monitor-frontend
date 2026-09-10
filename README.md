# NEON — AI Content Monitor

Frontend em React 19, Next.js, TypeScript e Tailwind CSS 4. Este repositório contém apenas a interface, sem API, banco de dados ou serviço de análise. O build gera arquivos estáticos para hospedagem.

## Executar localmente

Requisitos: Node.js 22.13+ e pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra http://localhost:3000. No PowerShell, caso a política de execução bloqueie os scripts do gerenciador, use `pnpm.cmd`.

## Build e hospedagem

```sh
pnpm build
```

Publique o conteúdo de `out/` em uma hospedagem de arquivos estáticos. Não é necessário executar um servidor Next.js em produção.

## Integração futura com o backend

A interface abre sem backend. Para analisar e publicar posts, será necessário conectar uma API externa compatível. Até lá, tentativas de publicação apresentarão uma mensagem de conexão; não há aprovação simulada.

Copie `.env.example` para `.env.local` e defina `NEXT_PUBLIC_API_URL` (por padrão, `http://localhost:8000`). Reinicie o desenvolvimento ou refaça o build após mudar essa variável. Também é possível informar a URL no painel “Conexão com a API”; essa alteração vale apenas para a sessão.

O cliente HTTP está em `lib/blog/moderation.ts`. Adapte esse arquivo caso o backend futuro use outro contrato. Atualmente, ele envia `POST /analyze` com JSON:

```json
{
  "text": "Olá!",
  "image": "base64 opcional, sem o prefixo data:"
}
```

Texto, imagem ou ambos podem ser enviados. Exemplo de resposta esperada:

```json
{
  "status": "approved",
  "severity": 0,
  "duration_ms": 20,
  "categories": [],
  "analyzed": ["text", "image"]
}
```

`status` deve ser `approved` ou `blocked`. `severity` deve ser um inteiro não negativo, `duration_ms` um número não negativo e `categories` uma lista de strings. A aprovação exige severidade zero. Quando houver imagem, `analyzed` deve incluir `image`; caso contrário, o post não será publicado. Para texto sem imagem, `analyzed` é opcional.

O navegador acessa a API diretamente, sem proxy neste projeto. Configure CORS no backend para permitir a origem da interface, o método POST e o cabeçalho Content-Type. Em uma interface hospedada com HTTPS, use uma API HTTPS. Credenciais de serviços de IA devem ficar no backend separado; variáveis `NEXT_PUBLIC_*` são públicas.

O formulário aceita texto de até 10.000 caracteres e imagens JPG/PNG de até 4 MB, entre 50 e 7200 pixels por dimensão.

## Organização

- `app/`: página, layout e estilos.
- `components/blog/`: formulário de publicação e cartões de posts.
- `components/ui/` e `hooks/`: componentes e utilitários de interface.
- `lib/blog/moderation.ts`: tipos, cliente da API e validação de imagens.
- `public/` e `vendor/`: recursos estáticos e estilos de terceiros.
- `tests/moderation.mjs`: verificações do cliente HTTP com respostas simuladas.

Posts e imagens ficam apenas no estado React e desaparecem ao recarregar a página. Ao solicitar análise, o conteúdo é enviado à API configurada; seu tratamento dependerá do backend integrado.

## Verificação

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Os testes do cliente usam respostas simuladas e não exigem backend ou credenciais de IA.
