"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";

type Version = {
  id: string;
  track_id: string;
  source_type: string;
  original_filename: string;
  status: string;
  is_selected: boolean;
  url?: string;
};

type Data = {
  project: {
    media_authorized: boolean;
    family_released: boolean;
  };
  versions: Version[];
  trackOrder?: string[];
};

const labels: Record<string, string> = {
  celular: "Gravador do celular",
  whatsapp: "Áudio do WhatsApp",
  nova: "Nova gravação",
};

const PAGE_SIZE = 4;

// A busca retorna dados; a atualizacao do estado acontece somente depois
// que a Promise e resolvida. Isso evita setState sincronico dentro do efeito.
async function loadCurationData(signal?: AbortSignal): Promise<Data> {
  const response = await fetch(`${LU_BASE_PATH}/api`, {
    cache: "no-store",
    signal,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Falha no carregamento");
  }
  return payload as Data;
}

export function LuCuration({ teacherName }: { teacherName: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<"list" | "order" | "qr">("list");
  const [trackOrder, setTrackOrder] = useState<string[]>(luTracks.map((track) => track.id));
  const [qrTrack, setQrTrack] = useState("geral");
  const [success, setSuccess] = useState("");

  // Usado apenas depois de a professora escolher, ocultar ou enviar um audio.
  const refresh = useCallback(async () => {
    try {
      const nextData = await loadCurationData();
      setData(nextData);
      if (nextData.trackOrder?.length === 12) setTrackOrder(nextData.trackOrder);
      setErr("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Falha no carregamento");
    }
  }, []);

  // Carregamento inicial assincrono. AbortController impede atualizacoes
  // atrasadas depois da desmontagem do componente.
  useEffect(() => {
    const controller = new AbortController();

    void loadCurationData(controller.signal)
      .then((nextData) => {
        if (controller.signal.aborted) return;
        setData(nextData);
        if (nextData.trackOrder?.length === 12) setTrackOrder(nextData.trackOrder);
        setErr("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErr(error instanceof Error ? error.message : "Falha no carregamento");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setCurrent(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function action(id: string, verb: "choose" | "hide" | "restore") {
    setBusy(id);
    setErr("");
    try {
      const response = await fetch(`${LU_BASE_PATH}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: verb }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao atualizar");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erro na operação");
    } finally {
      setBusy("");
    }
  }

  async function upload(trackId: string, file: File | null) {
    if (!file) return;
    setBusy(trackId);
    setErr("");
    try {
      const response = await fetch(`${LU_BASE_PATH}/api/upload-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          sourceType: "nova",
        }),
      });
      const signed = await response.json();
      if (!response.ok) {
        throw new Error(signed.error || "Não foi possível enviar");
      }

      const client = createClient(signed.url, signed.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;

      const done = await fetch(`${LU_BASE_PATH}/api/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: signed.id }),
      });
      const result = await done.json();
      if (!done.ok) {
        throw new Error(result.error || "Erro ao confirmar gravação");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Falha ao enviar arquivo");
    } finally {
      setBusy("");
    }
  }

  const tracks = trackOrder.map((id) => luTracks.find((track) => track.id === id)).filter((track): track is typeof luTracks[number] => Boolean(track));
  const pages = Math.ceil(tracks.length / PAGE_SIZE);
  const swap = (position: number, direction: number) => {
    const next = position + direction;
    if (next < 0 || next >= trackOrder.length) return;
    setTrackOrder((old) => {
      const result = [...old];
      [result[position], result[next]] = [result[next], result[position]];
      return result;
    });
    setSuccess("");
  };
  async function saveOrder() {
    setBusy("order"); setErr(""); setSuccess("");
    try {
      const response = await fetch(`${LU_BASE_PATH}/api/order`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: trackOrder }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar a ordem");
      setSuccess("Nova sequência salva. Os QR Codes antigos continuam válidos.");
    } catch (error) { setErr(error instanceof Error ? error.message : "Falha ao salvar a ordem"); }
    finally { setBusy(""); }
  }
  const qrSrc = `${LU_BASE_PATH}/api/qr${qrTrack === "geral" ? "" : `?musica=${qrTrack}`}`;
  const qrDownload = `${qrSrc}${qrSrc.includes("?") ? "&" : "?"}download=1`;

  const close = () => {
    setOpen(false);
    setCurrent(null);
  };

  const versions =
    current === null
      ? []
      : (data?.versions || []).filter(
          (version) => version.track_id === luTracks[current].id,
        );

  return (
    <main className="lu-root lu-book">
      <LuHeader admin teacherName={teacherName} />
      <div className="lu-container">
        <section className="lu-hero">
          <h1>🎤 Escolha as vozes da turma</h1>
          <p>
            Compare as gravações, envie outras versões e escolha a melhor para
            cada música.
          </p>
        </section>

        {err && (
          <p role="alert" className="lu-alert">
            {err}
          </p>
        )}

        <section className="lu-collection-entry">
          <span className="lu-collection-caption">🎶 CURADORIA</span>
          <button
            className="lu-open-card"
            type="button"
            onClick={() => {
              setPage(0);
              setPanel("list");
              setOpen(true);
              setCurrent(null);
            }}
          >
            <span>
              <strong>Definir Vozes</strong>
              <small>CLIQUE PARA ABRIR</small>
            </span>
            <span className="lu-track-count">12 canções</span>
            <span aria-hidden="true">›</span>
          </button>
        </section>

        <div className="lu-curation-tools">
          <button type="button" onClick={() => { setPanel("order"); setCurrent(null); setOpen(true); }}>
            ↕ Definir ordem <small>CLIQUE PARA ABRIR</small>
          </button>
          <button type="button" onClick={() => { setPanel("qr"); setQrTrack("geral"); setCurrent(null); setOpen(true); }}>
            ▦ Gerar QR Codes <small>CLIQUE PARA ABRIR</small>
          </button>
        </div>
        <div className="lu-helptext">
          <strong>Como funciona:</strong> “Escolher esta” define a gravação
          preferida. “Ocultar” esconde a opção sem apagar o original. Para as
          famílias, somente uma versão selecionada e liberada pela escola
          poderá aparecer.
        </div>
      </div>

      {open && (
        <div
          className="lu-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            className="lu-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={panel === "qr" ? "Gerar QR Codes" : panel === "order" ? "Definir ordem" : current === null ? "Definir vozes" : "Escolher gravação"}
          >
            <div className="lu-dialog-head">
              <strong>
                {panel === "qr" ? "▦ QR Codes do livro" : panel === "order" ? "↕ Definir ordem" : current === null
                  ? "🎤 Definir Vozes"
                  : `🎤 ${luTracks[current].title}`}
              </strong>
              <button
                type="button"
                className="lu-dialog-close"
                onClick={close}
                aria-label="Fechar janela"
              >
                ✕
              </button>
            </div>

            {panel === "order" ? (
              <div className="lu-dialog-versions">
                <p>Use as setas para organizar a sequência. Cada música mantém seu identificador permanente.</p>
                {tracks.map((track, position) => (
                  <div className="lu-order-row" key={track.id}>
                    <span className="lu-order-label">{position + 1}. {track.art} {track.title}</span>
                    <div className="lu-order-controls">
                      <button type="button" aria-label={`Subir ${track.title}`} disabled={busy !== "" || position === 0} onClick={() => swap(position, -1)}>↑</button>
                      <button type="button" aria-label={`Descer ${track.title}`} disabled={busy !== "" || position === tracks.length - 1} onClick={() => swap(position, 1)}>↓</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="lu-button lu-button-primary lu-order-save" disabled={busy !== ""} onClick={() => void saveOrder()}>{busy === "order" ? "Salvando..." : "Salvar ordem"}</button>
                {success && <p role="status" className="lu-pill-ok">{success}</p>}
              </div>
            ) : panel === "qr" ? (
              <div className="lu-dialog-versions lu-qr-chooser">
                <label htmlFor="lu-qr-song">QR Code do livro ou de uma música</label>
                <select id="lu-qr-song" value={qrTrack} onChange={(event) => setQrTrack(event.target.value)}>
                  <option value="geral">Livro completo — 12 canções</option>
                  {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                </select>
                <Image key={qrSrc} src={qrSrc} width={245} height={245} unoptimized alt={`QR Code de ${qrTrack === "geral" ? "Livro Musical" : luTracks.find((track) => track.id === qrTrack)?.title}`} className="lu-qr-image" />
                <p>Este código aponta para o endereço permanente no domínio oficial. Teste-o no celular antes da impressão.</p>
                <a className="lu-button lu-button-primary" href={qrDownload}>Baixar QR Code PNG</a>
              </div>
            ) : current === null ? (
              <>
                <div className="lu-dialog-list">
                  {tracks
                    .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
                    .map((track, index) => (
                      <button
                        className="lu-track"
                        type="button"
                        key={track.id}
                        onClick={() => setCurrent(luTracks.findIndex((song) => song.id === track.id))}
                      >
                        <span className="lu-art">{track.art}</span>
                        <span className="lu-track-main">
                          <small>MÚSICA {String(page * PAGE_SIZE + index + 1).padStart(2, "0")}</small>
                          <strong>{track.title}</strong>
                          <small>
                            {data?.versions.some(
                              (version) =>
                                version.track_id === track.id &&
                                version.is_selected,
                            )
                              ? "Gravação escolhida"
                              : "Aguardando escolha"}
                          </small>
                        </span>
                        <span className="lu-track-arrow">›</span>
                      </button>
                    ))}
                </div>

                <div className="lu-pager">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    ‹ Anterior
                  </button>
                  <span>Página {page + 1} de {pages}</span>
                  <button
                    type="button"
                    disabled={page === pages - 1}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Próxima ›
                  </button>
                </div>
              </>
            ) : (
              <div className="lu-dialog-versions">
                <div className="lu-curation-title">
                  <span className="lu-curation-art">{luTracks[current].art}</span>
                  <div>
                    <small>MÚSICA {luTracks[current].id}</small>
                    <h2>{luTracks[current].title}</h2>
                  </div>
                </div>

                {versions.length === 0 ? (
                  <p className="lu-curation-empty">
                    Nenhuma gravação enviada até agora.
                  </p>
                ) : (
                  versions.map((version) => (
                    <div className="lu-curation-version" key={version.id}>
                      <div>
                        <strong>
                          {labels[version.source_type] || version.source_type}
                        </strong>
                        {version.is_selected && (
                          <span className="lu-pill-ok">✓ Escolhida</span>
                        )}
                        {version.status === "hidden" && (
                          <span className="lu-pill-hide">Oculta</span>
                        )}
                        <small>{version.original_filename}</small>
                      </div>

                      {version.url && version.status !== "hidden" && (
                        <audio
                          controls
                          preload="none"
                          src={version.url}
                          aria-label={`${luTracks[current!].title}: ${labels[version.source_type] || version.source_type}`}
                        />
                      )}

                      <div className="lu-curation-actions">
                        {version.status !== "hidden" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => action(version.id, "choose")}
                              disabled={busy !== "" || version.is_selected}
                            >
                              Escolher esta
                            </button>
                            <button
                              type="button"
                              onClick={() => action(version.id, "hide")}
                              disabled={busy !== ""}
                            >
                              Ocultar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy !== ""}
                            onClick={() => action(version.id, "restore")}
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}

                <label className="lu-upload">
                  ➕ Enviar outra gravação
                  <input
                    type="file"
                    accept="audio/*,.m4a,.mp3,.ogg,.wav,.aac,.webm"
                    disabled={busy !== "" || !data?.project.media_authorized}
                    onChange={(event) => {
                      void upload(
                        luTracks[current].id,
                        event.target.files?.[0] || null,
                      );
                      event.target.value = "";
                    }}
                  />
                </label>

                {busy !== "" && (
                  <p role="status">Processando gravação...</p>
                )}
                <button
                  type="button"
                  className="lu-list-back"
                  onClick={() => setCurrent(null)}
                >
                  ← Voltar à lista
                </button>
              </div>
            )}
            {err && <p role="alert" className="lu-alert">{err}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
