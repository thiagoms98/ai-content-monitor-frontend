import ts from 'typescript';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import assert from 'node:assert/strict';

const target = new URL('../lib/blog/.moderation-test.mjs', import.meta.url);
writeFileSync(target, ts.transpileModule(readFileSync(new URL('../lib/blog/moderation.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
try {
  const { analyze, MAX_IMAGE_BYTES } = await import(target.href);
  const good = { status: 'approved', severity: 0, duration_ms: 20, categories: [], analyzed: { text: true, image: false } };
  const image = new File([readFileSync(new URL('./fixtures/neutral.png', import.meta.url))], 'neutral.png', { type: 'image/png' });
  let checks = 0;
  async function check(name, run) { await run(); checks++; console.log('OK ' + name); }

  await check('Entradas inválidas não enviam requisições', async () => {
    globalThis.fetch = async () => { assert.fail('Não deveria enviar uma requisição'); };
    for (const endpoint of ['', '   ']) await assert.rejects(analyze('Olá', undefined, endpoint), /não configurado/);
    for (const endpoint of ['javascript:alert(1)', '//api.test', 'endereço inválido']) await assert.rejects(analyze('Olá', undefined, endpoint), /URL/);
    await assert.rejects(analyze('  '), /Informe um texto/);
    await assert.rejects(analyze('a'.repeat(10001)), /10.000/);
    await assert.rejects(analyze('', new File(['x'], 'x.gif', { type: 'image/gif' })), /JPG ou PNG/);
    await assert.rejects(analyze('', new File([], 'x.png', { type: 'image/png' })), /vazia/);
    await assert.rejects(analyze('', new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'x.png', { type: 'image/png' })), /4 MB/);
  });

  await check('Texto usa multipart e a rota do proxy por padrão', async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/backend/analyze');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers, undefined, 'Content-Type/boundary deve ser definido pelo navegador');
      assert.equal(options.credentials, 'omit');
      assert.ok(options.signal instanceof AbortSignal);
      assert.ok(options.body instanceof FormData);
      assert.deepEqual([...options.body], [['text', 'Olá']]);
      return Response.json(good);
    };
    assert.deepEqual(await analyze('  Olá  '), good);
  });

  await check('Imagem e texto são enviados como campos e arquivo binário', async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.test/analyze');
      assert.equal(options.body.get('text'), 'Olá');
      const uploaded = options.body.get('image');
      assert.equal(uploaded.name, image.name);
      assert.equal(uploaded.type, 'image/png');
      assert.deepEqual(await uploaded.arrayBuffer(), await image.arrayBuffer());
      return Response.json({ ...good, analyzed: { text: true, image: true } });
    };
    assert.equal((await analyze('Olá', image, ' https://api.test/// ')).status, 'approved');
  });

  await check('Imagem sem texto omite o campo text', async () => {
    globalThis.fetch = async (_, options) => {
      assert.equal(options.body.has('text'), false);
      assert.equal(options.body.get('image').name, image.name);
      return Response.json({ ...good, analyzed: { text: false, image: true } });
    };
    assert.equal((await analyze('  ', image)).status, 'approved');
  });

  await check('A decisão e a severidade vêm do backend', async () => {
    const blocked = { ...good, status: 'blocked', severity: 4, categories: ['Violence'] };
    globalThis.fetch = async () => Response.json(blocked);
    assert.deepEqual(await analyze('texto'), blocked);
    globalThis.fetch = async () => Response.json({ ...good, severity: 2 });
    assert.equal((await analyze('texto')).status, 'approved');
  });

  await check('Não publica conteúdo sem confirmação de análise', async () => {
    globalThis.fetch = async () => Response.json(good);
    await assert.rejects(analyze('texto', image), /análise da imagem/);
    globalThis.fetch = async () => Response.json({ ...good, analyzed: { text: false, image: true } });
    await assert.rejects(analyze('texto', image), /análise do texto/);
    globalThis.fetch = async () => Response.json({ ...good, analyzed: {} });
    await assert.rejects(analyze('texto'), /análise do texto/);
  });

  await check('Respostas fora do contrato são recusadas', async () => {
    for (const invalid of [
      { status: 'approved' }, { ...good, status: 'unknown' },
      { ...good, analyzed: ['text'] }, { ...good, analyzed: { text: 'true' } },
      { ...good, severity: -1 }, { ...good, severity: 1.5 },
      { ...good, duration_ms: -1 }, { ...good, categories: [4] },
    ]) {
      globalThis.fetch = async () => Response.json(invalid);
      await assert.rejects(analyze('texto'), /resposta inválida/);
    }
    globalThis.fetch = async () => new Response('<html>erro</html>');
    await assert.rejects(analyze('texto'), /resposta inválida/);
  });

  await check('Erros HTTP usam mensagens apropriadas', async () => {
    globalThis.fetch = async () => Response.json({ detail: 'Texto inválido.' }, { status: 400 });
    await assert.rejects(analyze('texto'), /Texto inválido/);
    globalThis.fetch = async () => Response.json({ detail: [{ loc: ['body', 'image'], msg: 'Invalid' }] }, { status: 422 });
    await assert.rejects(analyze('texto'), /não pôde ser validado/);
    for (const [status, message] of [[400, /não pôde ser validado/], [413, /tamanho permitido/], [429, /Aguarde/], [503, /indisponível/], [504, /indisponível/]]) {
      globalThis.fetch = async () => new Response('', { status });
      await assert.rejects(analyze('texto'), message);
    }
  });

  await check('Falhas de rede e timeout permitem tentar novamente', async () => {
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(analyze('texto'), /Não foi possível conectar/);
    globalThis.setTimeout = (callback) => originalSetTimeout(callback, 0);
    globalThis.fetch = async (_, options) => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    await assert.rejects(analyze('texto'), /demorou demais/);
  });
  console.log(`${checks} grupos de verificações passaram.`);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  unlinkSync(target);
}
