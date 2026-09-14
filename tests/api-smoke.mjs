// Executar explicitamente: este teste envia conteúdo de exemplo à API real.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const endpoint = (process.env.SMOKE_API_URL || 'http://localhost:3000/api/backend').replace(/\/+$/, '');
const health = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(60_000) });
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'UP');
console.log('OK saúde da API');

for (const [name, text, withImage, status] of [
  ['texto', 'Bom dia! Vamos compartilhar boas ideias.', false, 'approved'],
  ['imagem', '', true, 'approved'],
  ['texto e imagem', 'Uma imagem azul.', true, 'approved'],
  ['bloqueio', 'I will kill you and hurt your family.', false, 'blocked'],
]) {
  const body = new FormData();
  if (text) body.append('text', text);
  if (withImage) body.append('image', new Blob([readFileSync(new URL('./fixtures/neutral.png', import.meta.url))], { type: 'image/png' }), 'neutral.png');
  const response = await fetch(`${endpoint}/analyze`, { method: 'POST', body, signal: AbortSignal.timeout(60_000) });
  assert.equal(response.status, 200, name);
  const result = await response.json();
  assert.equal(result.status, status, name);
  assert.equal(result.analyzed.text, Boolean(text), name);
  assert.equal(result.analyzed.image, withImage, name);
  assert.ok(Number.isInteger(result.severity) && result.severity >= 0);
  assert.ok(Number.isInteger(result.duration_ms) && result.duration_ms >= 0);
  assert.ok(Array.isArray(result.categories) && result.categories.every(value => typeof value === 'string'));
  console.log(`OK ${name}: ${result.status}`);
}

const empty = await fetch(`${endpoint}/analyze`, { method: 'POST', body: new FormData(), signal: AbortSignal.timeout(60_000) });
assert.equal(empty.status, 400);
assert.equal(typeof (await empty.json()).detail, 'string');
console.log('OK validação de conteúdo vazio');
