"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";

const PAGE_SIZE = 4;
const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
type PublicVersion = { id: string; track_id: string; url?: string };
type Dialog = "closed" | "list" | "player";

export function LuMusicExperience({ initialTrackId }: { initialTrackId?: string }) {
  const firstId = luTracks.find((track) => track.id === initialTrackId)?.id || luTracks[0].id;
  const [trackId, setTrackId] = useState<string>(firstId);
  const [dialog, setDialog] = useState<Dialog>(initialTrackId ? "player" : "closed");
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [lyrics, setLyrics] = useState(false);
  const [versions, setVersions] = useState<PublicVersion[]>([]);
  const [trackOrder, setTrackOrder] = useState<string[]>(luTracks.map((track) => track.id));
  const [familyReleased, setFamilyReleased] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  const tracks = useMemo(() => trackOrder.map((id) => luTracks.find((track) => track.id === id)).filter((track): track is typeof luTracks[number] => Boolean(track)), [trackOrder]);
  const index = Math.max(0, tracks.findIndex((track) => track.id === trackId));
  const song = tracks[index] || luTracks[0];
  const active = versions.find((v) => v.track_id === song.id && v.url);
  const source = active?.url || `/education-demo/audio/musica-${song.id}.mp3`;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${LU_BASE_PATH}/api`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Conteúdo não disponível"); return response.json(); })
      .then((data) => {
        if (controller.signal.aborted) return;
        setVersions(data.versions || []);
        setFamilyReleased(Boolean(data.project?.family_released));
        const received = data.trackOrder as unknown;
        const allowed = new Set(luTracks.map((track) => track.id));
        if (Array.isArray(received) && received.length === 12 && new Set(received).size === 12 && received.every((id) => allowed.has(id))) {
          setTrackOrder(received);
        }
      })
      .catch(() => { /* Exibe a demonstracao quando a API estiver indisponivel. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (dialog === "closed") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { audio.current?.pause(); setDialog("closed"); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  useEffect(() => {
    if (dialog !== "player") audio.current?.pause();
  }, [dialog]);

  useEffect(() => {
    audio.current?.pause();
    audio.current?.load();
  }, [trackId, source]);

  const select = (id: string) => {
    setTrackId(id); setTime(0); setDuration(0); setPlaying(false); setLyrics(false); setDialog("player");
  };
  const play = async () => {
    if (!audio.current) return;
    if (audio.current.paused) { try { await audio.current.play(); } catch { setPlaying(false); } }
    else audio.current.pause();
  };
  const close = () => { audio.current?.pause(); setDialog("closed"); setPlaying(false); };
  const openList = () => { audio.current?.pause(); setPlaying(false); setPage(Math.floor(index / PAGE_SIZE)); setDialog("list"); };
  const change = (step: number) => select(tracks[(index + step + tracks.length) % tracks.length].id);
  const pages = Math.ceil(tracks.length / PAGE_SIZE);

  return (
    <main className="lu-root lu-book lu-public-home">
      <LuHeader />
      <div className="lu-container">
        <section className="lu-hero">
          <span className="lu-eyebrow">✨ Uma recordação que ganha voz</span>
          <h1>Nosso Livro <em>Musical!</em> 🎶</h1>
          <p>Uma página para guardar músicas, desenhos e momentos especiais vividos na escola. Feita para ouvir e cantar em família!</p>
          <div className="lu-hero-tags"><span>🎵 12 músicas</span><span>🎨 desenhos da turma em breve</span><span>📱 feito para o celular</span></div>
        </section>
        <section className="lu-collection-entry">
          <span className="lu-collection-caption">✨ NOSSA COLEÇÃO</span>
          <button type="button" className="lu-open-card" onClick={openList}>
            <span><strong>Escolha uma música</strong><small>CLIQUE PARA ABRIR</small></span>
            <span className="lu-track-count">12 canções</span><span aria-hidden="true">›</span>
          </button>
        </section>
        <section className="lu-note"><span>💚</span><div><strong>Feito com carinho</strong><p>O livro físico é a estrela! Ouça e cante junto com as crianças.</p></div></section>
      </div>
      {dialog !== "closed" && <div className="lu-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="lu-dialog" role="dialog" aria-modal="true" aria-label={dialog === "list" ? "Escolha uma música" : song.title}>
          <div className="lu-dialog-head"><strong>{dialog === "list" ? "🎶 Escolha uma música" : `🎧 Música ${String(index + 1).padStart(2, "0")} de 12`}</strong><button type="button" aria-label="Fechar janela" className="lu-dialog-close" onClick={close}>✕</button></div>
          {dialog === "list" ? <>
            <div className="lu-dialog-list">
              {tracks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((track, position) => <button type="button" key={track.id} className="lu-track" onClick={() => select(track.id)}>
                <span className="lu-art" aria-hidden="true">{track.art}</span>
                <span className="lu-track-main"><small>MÚSICA {String(page * PAGE_SIZE + position + 1).padStart(2, "0")}</small><strong>{track.title}</strong><small>{versions.some((v) => v.track_id === track.id && v.url) ? "Ouvir gravação escolhida" : "Ouvir demonstração"}</small></span>
                <span className="lu-track-arrow" aria-hidden="true">›</span>
              </button>)}
            </div>
            <div className="lu-pager"><button type="button" onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0}>‹ Anterior</button><span>Página {page + 1} de {pages}</span><button type="button" onClick={() => setPage((v) => Math.min(pages - 1, v + 1))} disabled={page === pages - 1}>Próxima ›</button></div>
          </> : <div className="lu-dialog-player">
            <div className={`lu-player-illustration lu-tint-${song.tint}`} aria-hidden="true"><span>{song.art}</span></div>
            <h2>{song.title}</h2>
            <p>{active?.url ? "Gravação escolhida pela escola" : familyReleased ? "Demonstração enquanto a música é preparada" : "Demonstração instrumental até a liberação da escola"}</p>
            <audio ref={audio} preload="metadata" src={source} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
            <label className="lu-sr-only" htmlFor="lu-seek-v4">Posição da música</label>
            <input id="lu-seek-v4" type="range" className="lu-seek" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(time, Math.max(duration, 1))} onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); }} />
            <div className="lu-time"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div>
            <div className="lu-controls"><button type="button" aria-label="Música anterior" onClick={() => change(-1)}>⏮</button><button type="button" aria-label={playing ? "Pausar" : "Reproduzir"} className="lu-play" onClick={play}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="Próxima música" onClick={() => change(1)}>⏭</button></div>
            <button type="button" className="lu-lyrics-toggle" onClick={() => setLyrics((v) => !v)} aria-expanded={lyrics}>📖 {lyrics ? "Ocultar espaço da letra" : "Ver espaço da letra"}<span>{lyrics ? "−" : "+"}</span></button>
            {lyrics && <div className="lu-lyrics"><p>As letras e as ilustrações originais aparecerão aqui após a conferência e autorização da escola.</p></div>}
            <button type="button" className="lu-list-back" onClick={openList}>← Voltar à lista de músicas</button>
          </div>}
        </section>
      </div>}
    </main>
  );
}
