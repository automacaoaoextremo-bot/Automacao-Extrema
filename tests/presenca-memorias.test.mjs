import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path, overrides={}) {
  const src=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',js)(id=>id==='server-only'?{}:Object.hasOwn(overrides,id)?overrides[id]:require(id),module,module.exports);
  return module.exports;
}
test('links usam chaves distintas no fragmento e não na query',()=>{
  const {photoLinks}=load('src/lib/presenca-photos.ts',{'@/lib/supabase-admin':{},'next/server':{}});
  const s={upload_token:'envio',album_token:'album'};
  const links=photoLinks('evento',s);
  assert.equal(new URL(links.upload).search,''); assert.equal(new URL(links.upload).hash,'#chave=envio');
  assert.equal(new URL(links.album).hash,'#chave=album');
  assert.equal(new URL(photoLinks('evento',s,'http://localhost:3000').upload).origin,'http://localhost:3000');
});
test('ZIP contém cabeçalhos e offsets válidos',async()=>{
  const {photoZip}=load('src/lib/presenca-photo-zip.ts');
  const zip=Buffer.from(await photoZip([{name:'foto.jpg',bytes:new Uint8Array([1,2,3])}]).arrayBuffer());
  assert.equal(zip.readUInt32LE(0),0x04034b50);assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
  const offset=zip.readUInt32LE(zip.length-6);assert.equal(zip.readUInt32LE(offset),0x02014b50);
  assert.equal(zip.readUInt16LE(zip.length-12),1);
  assert.equal(zip.readUInt32LE(14),0x55bc801d);
});
test('PDF do cardápio da Daniela tem duas páginas A5, com todos os itens',()=>{
  const {buildPresencaMenuPdf}=load('src/lib/presenca-menu-pdf.ts');
  const {DANIELA50_EXTRAS}=load('src/lib/presenca-daniela50.ts');
  const pdf=buildPresencaMenuPdf({name:'Daniela 50 anos',date:'19/12/2026',sections:DANIELA50_EXTRAS.menuSections,uploadUrl:'https://example.invalid/fotos#chave=teste',preview:true,hostName:'Dani'}).toString('ascii');
  assert.ok(pdf.startsWith('%PDF-1.4'));assert.ok(pdf.includes('/Count 2'));
  assert.equal((pdf.match(/\/MediaBox \[0 0 419\.53 595\.28\]/g)||[]).length,2);
  assert.ok(pdf.includes(Buffer.from('Drinks Sky Bartenders','latin1').toString('hex')));
  assert.throws(()=>buildPresencaMenuPdf({name:'Teste',date:'',sections:[],uploadUrl:'https://example.invalid'}));
});
