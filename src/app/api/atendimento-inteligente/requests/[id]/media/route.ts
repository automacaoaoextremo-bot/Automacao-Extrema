import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope, allowed, isUuid, safeError } from '@/lib/atendimento-inteligente/security';
import { BUCKET, MAX_IMAGES, MAX_VIDEOS, MEDIA_TYPES, stringField } from '@/lib/atendimento-inteligente/intake';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

async function requestRecord(id: string) {
  return supabaseAdmin.from('ae_ai_requests')
    .select('id,organization_id,intake_secret_hash,intake_secret_expires_at')
    .eq('id', id).maybeSingle();
}
async function authorized(request: NextRequest, id: string, permitSecret: boolean) {
  const { data: record, error } = await requestRecord(id);
  if (error) throw error;
  if (!record) return null;
  const auth = request.headers.get('authorization');
  if (auth) {
    const scope = await aeScope(request);
    if (scope && allowed(scope, record.organization_id)) return record;
    return null;
  }
  if (!permitSecret) return null;
  const secret = request.headers.get('x-ae-intake-token') ?? '';
  const hash = record.intake_secret_hash;
  if (!hash || !/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(secret)) return null;
  if (!record.intake_secret_expires_at || new Date(record.intake_secret_expires_at).getTime() < Date.now()) return null;
  const computed = createHash('sha256').update(secret).digest();
  if (!timingSafeEqual(computed, Buffer.from(hash, 'hex'))) return null;
  return record;
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    const record = await authorized(request, id, true);
    if (!record) return NextResponse.json({ error: 'Acesso ao pedido expirado ou não autorizado.' }, { status: 403 });
    const body = await request.json() as { fileName?: string; mimeType?: string; size?: number };
    const mimeType = stringField(body.mimeType, 80);
    const type = MEDIA_TYPES[mimeType];
    const size = body.size;
    if (!type || typeof size !== 'number' || !Number.isInteger(size) || size < 1 || size > type.maxBytes) {
      return NextResponse.json({ error: 'Formato ou tamanho inválido. Fotos até 5MB; vídeo até 15MB.' }, { status: 400 });
    }
    const { data: existing, error: listError } = await supabaseAdmin.from('ae_ai_request_media')
      .select('id,mime_type').eq('organization_id', record.organization_id).eq('request_id', id);
    if (listError) throw listError;
    const imageCount = (existing ?? []).filter(r => r.mime_type.startsWith('image/')).length;
    const videoCount = (existing ?? []).filter(r => r.mime_type.startsWith('video/')).length;
    if ((mimeType.startsWith('image/') && imageCount >= MAX_IMAGES) ||
        (mimeType.startsWith('video/') && videoCount >= MAX_VIDEOS)) {
      return NextResponse.json({ error: 'Limite de anexos atingido (3 fotos, 1 vídeo).' }, { status: 400 });
    }
    const path = `${record.organization_id}/${id}/${randomUUID()}${type.suffix}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw error ?? new Error('Nao foi possivel assinar upload');
    const { error: saveError } = await supabaseAdmin.from('ae_ai_request_media').insert({
      organization_id: record.organization_id, request_id: id, object_path: path,
      mime_type: mimeType, file_size_bytes: size,
      original_name: stringField(body.fileName, 180) || `anexo${type.suffix}`,
    });
    if (saveError) throw saveError;
    return NextResponse.json({ path, token: data.token });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    const record = await authorized(request, id, true);
    if (!record) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    const body = await request.json() as { path?: string };
    const path = stringField(body.path, 500);
    const { data: media, error } = await supabaseAdmin.from('ae_ai_request_media')
      .select('id,object_path,file_size_bytes').eq('organization_id', record.organization_id)
      .eq('request_id', id).eq('object_path', path).maybeSingle();
    if (error) throw error;
    if (!media) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    const filename = path.split('/').at(-1) ?? '';
    const folder = `${record.organization_id}/${id}`;
    const listed = await supabaseAdmin.storage.from(BUCKET).list(folder, { search: filename, limit: 100 });
    if (listed.error) throw listed.error;
    const stored = (listed.data ?? []).find(x => x.name === filename);
    if (!stored) return NextResponse.json({ error: 'O upload ainda não foi concluído.' }, { status: 409 });
    const actualSize = Number(stored.metadata?.size ?? 0);
    if (actualSize && actualSize > media.file_size_bytes) return NextResponse.json({ error: 'Tamanho recebido difere do informado.' }, { status: 409 });
    const { error: updateError } = await supabaseAdmin.from('ae_ai_request_media').update({ uploaded: true })
      .eq('id', media.id).eq('organization_id', record.organization_id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    const record = await authorized(request, id, false);
    if (!record) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    const { data: media, error } = await supabaseAdmin.from('ae_ai_request_media')
      .select('id,object_path,mime_type,original_name,uploaded,created_at')
      .eq('organization_id', record.organization_id).eq('request_id', id)
      .eq('uploaded', true).order('created_at');
    if (error) throw error;
    const urls = await Promise.all((media ?? []).map(async file => {
      const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(file.object_path, 300);
      return { id: file.id, mimeType: file.mime_type, name: file.original_name,
        url: signed.error ? null : signed.data?.signedUrl ?? null };
    }));
    return NextResponse.json({ media: urls });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
