"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

type Illustration = {
  id: string; track_id: string; original_filename: string;
  status: "pending" | "available" | "hidden";
  is_featured: boolean; is_published: boolean; url?: string;
};
type Data = {
  illustrations: Illustration[];
  trackOrder?: string[];
  project: { media_authorized: boolean; illustrations_released: boolean };
};

async function getCuration(): Promise<Data> {
  const response = await fetch(`${LU_BASE_PATH}/api`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar os desenhos");
  return payload as Data;
}

/** Produz imagem mais leve e elimina metadados EXIF/GPS antes do upload. */
async function prepareImage(file: File): Promise<File> {
  if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo muito grande. Escolha uma foto de até 25 MB antes da conversão.");
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma fotografia ou ilustração.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("Não foi possível abrir a foto. Salve como JPEG ou PNG no celular e tente novamente."); }
  try {
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador não consegue preparar imagens.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha ao converter imagem")), "image/jpeg", 0.88));
    if (blob.size > 10 * 1024 * 1024) throw new Error("Imagem acima de 10 MB. Reduza a resolução e tente novamente.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}

export function LuIllustrationCuration() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [moving, setMoving] = useState<Record<string,string>>({});
  const [page, setPage] = useState(0);
  const refresh = useCallback(async () => {
    const received = await getCuration();
    setData(received);
  }, []);

  useEffect(() => {
    let active = true;
    void getCuration().then((d) => { if (active) setData(d); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar desenhos"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (preview) setPreview(null);
      else if (current) setCurrent(null);
      else setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, current, preview]);

  const ordered = useMemo(() => (data?.trackOrder?.length === luTracks.length ? data.trackOrder : luTracks.map((t) => t.id))
    .map((id) => luTracks.find((track) => track.id === id)).filter((t): t is typeof luTracks[number] => Boolean(t)), [data]);
  const currentSong = luTracks.find((s) => s.id === current);
  const pictures = (data?.illustrations || []).filter((item) => item.track_id === current);
  const activePreview = (data?.illustrations || []).find((item) => item.id === preview);
  const approvedCount = (data?.illustrations || []).filter((i) => i.is_published && i.status === "available").length;

  async function action(verb: string, id?: string, trackId?: string) {
    if (verb === "delete" && !window.confirm("Excluir permanentemente esta fotografia? A operação não poderá ser desfeita.")) return;
    if (verb === "publish" && !window.confirm("Confirma que a escola autorizou esta página e que nomes, rostos e dados pessoais foram revisados?")) return;
    if (verb === "release" && !window.confirm("LIBERAR as imagens aprovadas para as famílias? Confirme as autorizações e a revisão de todas as páginas.")) return;
    if (verb === "unrelease" && !window.confirm("Ocultar todas as ilustrações da página pública?")) return;
    setBusy(id || verb); setError(""); setNotice("");
    try {
      const res = await fetch(`${LU_BASE_PATH}/api/illustrations/action`, { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: verb, id, trackId, confirmed: ["release", "unrelease"].includes(verb) }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Operação não concluída");
      if (verb === "delete") setPreview(null);
      await refresh();
      setNotice(verb === "release" ? "Ilustrações aprovadas liberadas para as famílias." : verb === "unrelease" ? "Ilustrações ocultadas das famílias." : "Alteração salva com sucesso.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar"); }
    finally { setBusy(""); }
  }

  async function upload(file: File | undefined) {
    if (!file || !current) return;
    if (!data?.project.media_authorized) { setError("A escola ainda precisa autorizar o armazenamento deste conteúdo."); return; }
    setBusy("upload"); setError(""); setNotice("");
    try {
      const prepared = await prepareImage(file);
      const response = await fetch(`${LU_BASE_PATH}/api/illustrations/upload-token`, { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: current, fileName: prepared.name, fileType: prepared.type, fileSize: prepared.size }),
      });
      const signed = await response.json();
      if (!response.ok) throw new Error(signed.error || "Falha ao preparar envio");
      const client = createClient(signed.url, signed.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: storageError } = await client.storage.from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, prepared, { contentType: prepared.type });
      if (storageError) throw storageError;
      const done = await fetch(`${LU_BASE_PATH}/api/illustrations/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: signed.id }) });
      const finish = await done.json();
      if (!done.ok) throw new Error(finish.error || "Falha ao confirmar arquivo");
      await refresh();
      setNotice("Fotografia recebida e privada. Revise a página, escolha a versão principal e aprove quando estiver pronta.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao enviar desenho"); }
    finally { setBusy(""); }
  }

  return <>
    <section className="lu-collection-entry lu-art-admin-entry">
      <span className="lu-collection-caption">🎨 CANTIGAS ILUSTRADAS</span>
      <button type="button" className="lu-open-card" onClick={() => { setPage(0); setCurrent(null); setPreview(null); setOpen(true); setError(""); }}>
        <span><strong>Definir Desenhos e Letras</strong><small>ENVIAR, REVISAR E ESCOLHER VERSÕES</small></span>
        <span className="lu-track-count">{approvedCount} aprovadas</span><span aria-hidden="true">›</span>
      </button>
    </section>
    {open && <div className="lu-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { if (preview) setPreview(null); else setOpen(false); } }}>
      <section className="lu-dialog lu-art-admin-dialog" role="dialog" aria-modal="true" aria-label="Curadoria de desenhos e letras">
        <div className="lu-dialog-head"><strong>🎨 {currentSong ? currentSong.title : "Definir Desenhos e Letras"}</strong>
          <button type="button" className="lu-dialog-close" onClick={() => { if (preview) setPreview(null); else if (current) setCurrent(null); else setOpen(false); }}>
            {preview || current ? "VOLTAR" : "FECHAR"}
          </button>
        </div>
        {error && <p className="lu-alert" role="alert">{error}</p>}
        {notice && <p className="lu-pill-ok" role="status">{notice}</p>}
        {preview && activePreview ? <div className="lu-art-large">
          {activePreview.url ? <Image unoptimized src={activePreview.url} alt={`Página ilustrada: ${currentSong?.title || "cantiga"}`} width={1100} height={1500} /> : <p>Não foi possível abrir esta versão. Feche e atualize a curadoria.</p>}
          <p>Confira a página inteira, inclusive nomes escritos, antes de liberar às famílias.</p>
          <button type="button" className="lu-list-back" onClick={() => setPreview(null)}>← Voltar às versões</button>
        </div> : currentSong ? <div className="lu-dialog-versions lu-art-curation-detail">
          <p>As fotografias continuam privadas até você aprovar cada versão e liberar a galeria. Escolha a principal para a lista de músicas.</p>
          <label className="lu-upload">📷 Fotografar ou escolher outra ilustração
            <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp" disabled={!!busy} onChange={(e) => { const file = e.target.files?.[0]; void upload(file); e.target.value = ""; }} />
          </label>
          <small>JPEG, PNG ou WEBP. A imagem será reduzida para até 2200 px e convertida para JPEG, sem metadados de localização. Se o celular não conseguir abrir HEIC, converta-o para JPEG.</small>
          {busy === "upload" && <p role="status">Preparando e enviando fotografia…</p>}
          {pictures.length === 0 && <p className="lu-curation-empty">Ainda não há ilustrações desta música. Envie a primeira acima.</p>}
          <div className="lu-art-admin-grid">
            {pictures.map((picture) => <article className="lu-art-admin-item" key={picture.id}>
              {picture.url ? <button type="button" className="lu-art-preview-button" onClick={() => setPreview(picture.id)} aria-label="Ampliar página ilustrada"><Image unoptimized src={picture.url} width={320} height={420} alt={`Desenho da cantiga ${currentSong.title}`} /></button>
                : <div className="lu-art-unavailable">{picture.status === "hidden" ? "Oculta" : "Imagem indisponível"}</div>}
              <small>{picture.original_filename}</small>
              <div className="lu-art-status"><span>{picture.is_featured ? "⭐ Principal" : "Alternativa"}</span><span>{picture.is_published ? "✅ Aprovada" : picture.status === "hidden" ? "Oculta" : "🔒 Privada"}</span></div>
              <div className="lu-art-admin-actions">
                {picture.status === "available" && <>
                  <button type="button" disabled={!!busy || picture.is_featured} onClick={() => void action("feature", picture.id)}>Principal</button>
                  {picture.is_featured && <button type="button" disabled={!!busy} onClick={() => void action("unfeature", picture.id)}>Retirar principal</button>}
                  <button type="button" disabled={!!busy} onClick={() => void action(picture.is_published ? "unpublish" : "publish", picture.id)}>{picture.is_published ? "Desaprovar" : "Aprovar"}</button>
                  <button type="button" disabled={!!busy} onClick={() => void action("hide", picture.id)}>Ocultar</button>
                </>}
                {picture.status === "hidden" && <button type="button" disabled={!!busy} onClick={() => void action("restore", picture.id)}>Restaurar</button>}
                {!picture.is_featured && !picture.is_published && <button type="button" disabled={!!busy} onClick={() => void action("delete", picture.id)}>Excluir</button>}
              </div>
              {!picture.is_featured && !picture.is_published && <div className="lu-art-assign"><label htmlFor={`move-${picture.id}`}>Pertence a outra cantiga?</label>
                <select id={`move-${picture.id}`} value={moving[picture.id] || picture.track_id} disabled={!!busy} onChange={(e) => setMoving((old) => ({ ...old, [picture.id]: e.target.value }))}>
                  {luTracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                </select>
                <button type="button" disabled={!!busy || !moving[picture.id] || moving[picture.id] === picture.track_id} onClick={() => void action("assign", picture.id, moving[picture.id])}>Mover para outra música</button>
              </div>}
            </article>)}
          </div>
          <button type="button" className="lu-list-back" onClick={() => setCurrent(null)}>← Voltar às músicas</button>
        </div> : <div className="lu-dialog-versions lu-art-song-list">
          <p><strong>{approvedCount} imagem(ns) aprovadas.</strong> A liberação geral é independente da publicação dos áudios.</p>
          <p>Não publique fotografias com nomes identificáveis ou outros dados pessoais antes da revisão e autorização da escola.</p>
          <div className="lu-art-release-controls">
            <strong>Famílias: {data?.project.illustrations_released ? "✅ Ilustrações liberadas" : "🔒 Ilustrações ainda privadas"}</strong>
            <button type="button" disabled={!!busy || !data?.project.media_authorized || (approvedCount === 0 && !data?.project.illustrations_released)} onClick={() => void action(data?.project.illustrations_released ? "unrelease" : "release")}>{data?.project.illustrations_released ? "Ocultar de todas as famílias" : "Liberar ilustrações aprovadas"}</button>
          </div>
          <div className="lu-dialog-list">{ordered.slice(page * 4, page * 4 + 4).map((track) => {
            const count = (data?.illustrations || []).filter((i) => i.track_id === track.id).length;
            return <button type="button" className="lu-track" key={track.id} onClick={() => { setCurrent(track.id); setNotice(""); setError(""); }}>
              <span className="lu-art" aria-hidden="true">{track.art}</span><span className="lu-track-main"><small>CANÇÃO {track.id}</small><strong>{track.title}</strong><small>{count} versão(ões) de desenho</small></span><span className="lu-track-arrow">›</span>
            </button>;
          })}</div>
          <div className="lu-pager"><button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button><span>{page + 1} / {Math.ceil(ordered.length / 4)}</span><button type="button" disabled={(page + 1) * 4 >= ordered.length} onClick={() => setPage((p) => p + 1)}>Próxima ›</button></div>
        </div>}
      </section>
    </div>}
  </>;
}
