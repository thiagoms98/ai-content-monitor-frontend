// Run with: node tests/moderation.mjs
import ts from 'typescript';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import assert from 'node:assert/strict';
const target = new URL('../lib/blog/.moderation-test.mjs', import.meta.url);
writeFileSync(target, ts.transpileModule(readFileSync(new URL('../lib/blog/moderation.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
try {
 const {analyze} = await import(target.href);
 const good = {status:'approved',severity:0,duration_ms:20,categories:[]};
 let body;
 globalThis.fetch = async (_, options) => {body=JSON.parse(options.body);return Response.json(good);};
 assert.equal((await analyze('Olá',undefined,'http://api.test')).status,'approved');
 assert.deepEqual(body,{text:'Olá'});
 await assert.rejects(analyze('Olá','data:image/png;base64,AAAA','http://api.test'), /não confirmou/);
 globalThis.fetch = async () => Response.json({...good,analyzed:['text','image']});
 assert.equal((await analyze('Olá','data:image/png;base64,AAAA','http://api.test')).status,'approved');
 globalThis.fetch = async () => Response.json({...good,status:'blocked',severity:2,categories:['Violence']});
 assert.equal((await analyze('texto',undefined,'http://api.test')).status,'blocked');
 globalThis.fetch = async () => Response.json({...good,severity:2});
 await assert.rejects(analyze('texto',undefined,'http://api.test'), /inconsistente/);
 globalThis.fetch = async () => Response.json({status:'approved'});
 await assert.rejects(analyze('texto',undefined,'http://api.test'), /inválida/);
 globalThis.fetch = async () => new Response('',{status:503});
 await assert.rejects(analyze('texto',undefined,'http://api.test'), /indisponível/);
 console.log('7 verificações do cliente de moderação passaram.');
} finally {unlinkSync(target);}
