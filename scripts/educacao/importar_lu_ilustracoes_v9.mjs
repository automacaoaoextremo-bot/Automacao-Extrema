/** Importa as 16 fotografias APENAS como rascunho privado.
 * Executar APOS revisar MAPEAMENTO_PARA_CONFERIR.json, migração e autorizações.
 * Não edita o projeto nem libera fotos ao público.
 * Uso: node --env-file=.env.local scripts/educacao/importar_lu_ilustracoes_v9.mjs --pasta "C:\...\fotos" --confirmar-importacao-privada
 */
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const folder = args.includes('--pasta') ? args[args.indexOf('--pasta') + 1] : '';
if (!folder || !args.includes('--confirmar-importacao-privada')) {
  console.error('Informe --pasta CAMINHO e --confirmar-importacao-privada. Nunca envie a chave Supabase ao chat.');
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const project = 'lu-2026';
const bucket = 'education-illustrations-private';
const path = resolve(folder);
const mapping = JSON.parse(await readFile(join(path, 'MAPEAMENTO_PARA_CONFERIR.json'), 'utf8'));
if (!Array.isArray(mapping) || mapping.length !== 16) throw new Error('Esperadas exatamente 16 fotografias no manifesto.');
const { data: settings, error: settingsError } = await client.from('ae_education_projects')
  .select('media_authorized,illustrations_released').eq('slug', project).single();
if (settingsError || !settings?.media_authorized) throw new Error('Projeto não autorizado; interrompendo antes de enviar imagens.');
if (settings.illustrations_released) throw new Error('Importação bloqueada: suspenda a liberação pública das ilustrações antes de importar rascunhos.');
for (const item of mapping) {
  if (!/^\d{2}$/.test(item.track_id) || Number(item.track_id) < 1 || Number(item.track_id) > 12) throw new Error('Música inválida no mapeamento');
  if (!/^foto-\d{2}-rascunho-\d{2}\.jpg$/.test(item.filename)) throw new Error('Nome de foto inesperado no mapeamento');
  if (item.approved || item.release) throw new Error('A importação não pode liberar desenhos automaticamente.');
  const file = await readFile(join(path, item.filename));
  const size = (await stat(join(path, item.filename))).size;
  if (size > 10485760) throw new Error('Imagem acima de 10 MB: ' + item.filename);
  // Sem repetir a importação se o mesmo nome já foi processado.
  const { data: existing, error: existsError } = await client.from('ae_education_illustration_versions')
    .select('id').eq('project_slug', project).eq('original_filename', item.filename).limit(1);
  if (existsError) throw existsError;
  if (existing?.length) { console.log('Ignorando já importada:', item.filename); continue; }
  const id = randomUUID();
  const storagePath = `projects/${project}/illustrations/${item.track_id}/${id}.jpg`;
  const { error: insertError } = await client.from('ae_education_illustration_versions').insert({
    id, project_slug: project, track_id: item.track_id, original_filename: item.filename,
    storage_path: storagePath, mime_type: 'image/jpeg', file_bytes: size, status: 'pending',
    is_featured: false, is_published: false,
  });
  if (insertError) throw insertError;
  const { error: uploadError } = await client.storage.from(bucket).upload(storagePath, file, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;
  const { error: updateError } = await client.from('ae_education_illustration_versions')
    .update({ status: 'available' }).eq('id', id).eq('project_slug', project).eq('status', 'pending');
  if (updateError) throw updateError;
  console.log(`Importada PRIVADAMENTE: ${item.filename}, cantiga sugerida ${item.track_id}`);
}
console.log('Importação finalizada. TODAS as fotografias permanecem não aprovadas e privadas.');
