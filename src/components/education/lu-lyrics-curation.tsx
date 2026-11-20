"use client";

import { useEffect, useState } from "react";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

type Lyric = { track_id: string; body: string; is_published: boolean };
type LyricData = { lyrics?: Lyric[] };

/** Editor docente de letras e marcadores opcionais [mm:ss]. Sem textos predefinidos. */
export function LuLyricsCuration() {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Lyric[]>([]);
  const [currentId, setCurrentId] = useState<string>(luTracks[0].id);
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch(`${LU_BASE_PATH}/api`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as LyricData & { error?: string };
        if (!response.ok) throw new Error(data.error || "Falha ao carregar letras");
        return data;
      })
      .then((data) => { if (!controller.signal.aborted) { setAll(data.lyrics || []); setError(""); } })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Falha no carregamento");
      });
    return () => controller.abort();
  }, [open]);

  const chooseTrack = (id: string) => {
    const row = all.find((item) => item.track_id === id);
    setCurrentId(id);
    setBody(row?.body || "");
    setPublished(Boolean(row?.is_published));
    setMessage("");
    setError("");
  };
  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${LU_BASE_PATH}/api`, { cache: "no-store" });
      const data = await response.json() as LyricData & { error?: string };
      if (!response.ok) throw new Error(data.error || "Falha ao carregar letras");
      const rows = data.lyrics || [];
      setAll(rows);
      const first = rows.find((item) => item.track_id === currentId);
      setBody(first?.body || "");
      setPublished(Boolean(first?.is_published));
      setError("");
      setMessage("");
      setOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar as letras");
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (published && !body.trim()) { setError("Informe a letra antes de autorizar a exibicao."); return; }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${LU_BASE_PATH}/api/lyrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: currentId, lyrics: body, isPublished: published }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Falha ao salvar letra");
      setAll((previous) => [...previous.filter((row) => row.track_id !== currentId), {
        track_id: currentId, body: body.trim(), is_published: published
      }]);
      setMessage("Letra salva. A exibicao ao publico tambem depende da liberacao do projeto.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao salvar letra");
    } finally { setBusy(false); }
  };

  return <>
    <section className="lu-collection-entry lu-lyrics-admin-entry">
      <button className="lu-open-card" type="button" disabled={busy} onClick={() => void start()}>
        <span><strong>📝 Configurar letras e legendas</strong><small>EDITAR LETRAS DAS 12 CANTIGAS</small></span>
        <span className="lu-track-count">Docentes</span><span aria-hidden="true">›</span>
      </button>
      {error && !open && <p role="alert" className="lu-alert">{error}</p>}
    </section>
    {open && <div className="lu-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="lu-dialog lu-lyrics-admin-dialog" role="dialog" aria-modal="true" aria-label="Configurar letras e legendas">
        <div className="lu-dialog-head"><strong>📝 Letras das cantigas</strong>
          <button type="button" className="lu-dialog-close" onClick={() => setOpen(false)}>FECHAR</button>
        </div>
        <div className="lu-lyrics-admin-body">
          <p>Digite a letra revisada pela escola. Para sincronizar frases, comece cada linha com o tempo em que ela inicia, por exemplo <code>[00:10] Primeira frase</code>. Sem horarios, o player mostra o texto completo.</p>
          <p><strong>Importante:</strong> publique apenas textos cuja reproducao esteja autorizada. Nao inclua nomes das criancas ou dados pessoais.</p>
          <label htmlFor="lu-lyrics-track">Cantiga</label>
          <select id="lu-lyrics-track" value={currentId} disabled={busy} onChange={(event) => chooseTrack(event.target.value)}>
            {luTracks.map((track) => <option key={track.id} value={track.id}>{track.id} - {track.title}{all.some((l) => l.track_id === track.id && l.is_published) ? " (aprovada)" : ""}</option>)}
          </select>
          <label htmlFor="lu-lyrics-body">Letra da cantiga (ate 8000 caracteres)</label>
          <textarea id="lu-lyrics-body" rows={11} maxLength={8000} value={body} disabled={busy} onChange={(event) => setBody(event.target.value)} placeholder={"[00:00] Primeira linha da cantiga\n[00:15] Segunda linha..."} />
          <small>{body.length} de 8000 caracteres</small>
          <label className="lu-lyrics-publish"><input type="checkbox" checked={published} disabled={busy} onChange={(event) => setPublished(event.target.checked)} />
            Letra revisada e autorizada para exibicao no livro digital</label>
          {error && <p className="lu-alert" role="alert">{error}</p>}
          {message && <p className="lu-pill-ok" role="status">{message}</p>}
          <button type="button" className="lu-button lu-button-primary" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : "Salvar letra desta cantiga"}</button>
        </div>
      </section>
    </div>}
  </>;
}
