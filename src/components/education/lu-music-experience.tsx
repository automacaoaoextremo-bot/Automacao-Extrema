"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";
import Image from "next/image";

const PAGE_SIZE = 4;
const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
type PublicVersion = { id: string; track_id: string; url?: string };
type PublicLyric = { track_id: string; body: string; is_published: boolean };
type AutoCue = { start: number; end: number; text: string };
type PublicIllustration = { id: string; track_id: string; is_featured: boolean; url?: string };
type Dialog = "closed" | "list" | "player" | "playlist" | "gallery";

export function LuMusicExperience({ initialTrackId }: { initialTrackId?: string }) {
  const firstId = luTracks.find((track) => track.id === initialTrackId)?.id || luTracks[0].id;
  const [trackId, setTrackId] = useState<string>(firstId);
  const [dialog, setDialog] = useState<Dialog>(initialTrackId ? "player" : "closed");
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [lyrics, setLyrics] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [lyricTexts, setLyricTexts] = useState<PublicLyric[]>([]);
  const [versions, setVersions] = useState<PublicVersion[]>([]);
  const [illustrations, setIllustrations] = useState<PublicIllustration[]>([]);
  const [artSelected, setArtSelected] = useState<{ trackId: string; id: string } | null>(null);
  const [artBusy, setArtBusy] = useState(false);
  const [artError, setArtError] = useState("");
  const [trackOrder, setTrackOrder] = useState<string[]>(luTracks.map((track) => track.id));
  const [familyReleased, setFamilyReleased] = useState(false);
  const [teacherPreview, setTeacherPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [refreshingAudio, setRefreshingAudio] = useState(false);
  const [playlistFinished, setPlaylistFinished] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const playlistAutoPlay = useRef(false);
  // Invalida respostas atrasadas de requisicoes anteriores ao trocar/fechar telas.
  const requestNumber = useRef(0);

  const tracks = useMemo(() => trackOrder.map((id) => luTracks.find((track) => track.id === id)).filter((track): track is typeof luTracks[number] => Boolean(track)), [trackOrder]);
  const index = Math.max(0, tracks.findIndex((track) => track.id === trackId));
  const song = tracks[index] || luTracks[0];
  const rawLyrics = lyricTexts.find((entry) => entry.track_id === song.id)?.body || "";
  const timedLyrics = rawLyrics.split("\n").map((value) => {
    const match = /^\s*\[(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?\]\s*(.+)$/.exec(value);
    if (!match) return null;
    return { start: Number(match[1]) * 60 + Number(match[2]) + Number(`0.${(match[3] || "0").padEnd(3, "0")}`), text: match[4] };
  }).filter((entry): entry is { start: number; text: string } => Boolean(entry));

  const active = versions.find((v) => v.track_id === song.id && v.url);
  const activeVersionId = active?.id;
  // Somente letras publicadas pela docente chegam a esta pagina pelo endpoint publico.
  // Acompanhamento CC exige marcadores de tempo: texto simples continua na galeria de letras.
  const captionAvailable = Boolean(activeVersionId && timedLyrics.length > 0);
  const cueList: AutoCue[] = timedLyrics.map((entry, i) => ({
    ...entry, end: timedLyrics[i + 1]?.start ?? Infinity,
  }));
  const cueIndex = cueList.findIndex((cue) => time >= cue.start && time < cue.end);
  const currentCaption = cueIndex >= 0 ? cueList[cueIndex].text : "Aguardando o início da cantiga...";
  const previousCaption = cueIndex > 0 ? cueList[cueIndex - 1].text : "";
  const nextCaption = cueIndex >= 0 ? (cueList[cueIndex + 1]?.text || "") : (cueList[0]?.text || "");
  const artworkFor = (id: string) => illustrations.filter((art) => art.track_id === id && art.url)
    .sort((a,b) => Number(b.is_featured) - Number(a.is_featured));
  const currentArtworks = artworkFor(song.id);
  const mainArtwork = currentArtworks[0];
  const enlarged = illustrations.find((art) => art.id === artSelected?.id && art.track_id === artSelected?.trackId);
  // Não substituir gravações reais por demonstração após a liberação.
  const source = active?.url || (!loaded || (!familyReleased && !teacherPreview) ? `/education-demo/audio/musica-${song.id}.mp3` : undefined);

  // No player individual, FECHAR volta a lista e a pagina da cantiga atual.
  // Na playlist, galeria e lista, FECHAR continua voltando ao livro inicial.
  // O mesmo comportamento e usado pelo botao, fundo do modal e tecla Escape.
  const close = useCallback(() => {
    requestNumber.current += 1;
    playlistAutoPlay.current = false;
    audio.current?.pause();
    setArtSelected(null);
    setCaptionExpanded(false);
    setCaptionsEnabled(false);
    setPlaying(false);
    setRefreshingAudio(false);
    if (dialog === "player") {
      setPage(Math.floor(index / PAGE_SIZE));
      setDialog("list");
    } else {
      setDialog("closed");
    }
  }, [dialog, index]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${LU_BASE_PATH}/api?view=public`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Conteúdo não disponível"); return response.json(); })
      .then((data) => {
        if (controller.signal.aborted) return;
        setVersions(data.versions || []);
        setIllustrations(data.illustrations || []);
        setLyricTexts(data.lyrics || []);
        setFamilyReleased(Boolean(data.project?.family_released));
        setTeacherPreview(Boolean(data.teacherPreview));
        setLoadError("");
        setLoaded(true);
        const received = data.trackOrder as unknown;
        const allowed = new Set(luTracks.map((track) => track.id));
        if (Array.isArray(received) && received.length === 12 && new Set(received).size === 12 && received.every((id) => allowed.has(id))) {
          setTrackOrder(received);
        }
      })
      .catch(() => { if (!controller.signal.aborted) { setLoaded(true); setLoadError("Não foi possível carregar as gravações. Atualize a página e tente novamente."); } });
    return () => controller.abort();
  }, []);

  // O estado das legendas e limpo nos eventos de troca/fechamento da musica.
  // captionAvailable controla a renderizacao sem setState sincrono em useEffect.

  useEffect(() => {
    if (dialog === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (captionExpanded) { setCaptionExpanded(false); setCaptionsEnabled(false); return; }
        if (artSelected) { setArtSelected(null); return; }
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, artSelected, captionExpanded, close]);

  useEffect(() => {
    if (dialog !== "player" && dialog !== "playlist") audio.current?.pause();
  }, [dialog]);

  // Renova os URLs assinados antes de mudar a faixa: eles expiram em 300 segundos.
  // O mesmo fluxo atende a selecao individual e a transicao automatica da playlist.
  const loadTrack = async (id: string, autoStart = false) => {
    const request = ++requestNumber.current;
    playlistAutoPlay.current = autoStart;
    setRefreshingAudio(true);
    setAudioError("");
    setTime(0);
    setDuration(0);
    setCaptionsEnabled(false);
    setCaptionExpanded(false);
    try {
      const response = await fetch(`${LU_BASE_PATH}/api?view=public`, { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível renovar o acesso às gravações.");
      const payload = await response.json();
      if (request !== requestNumber.current) return;
      const nextVersions = (payload.versions || []) as PublicVersion[];
      const released = Boolean(payload.project?.family_released);
      const preview = Boolean(payload.teacherPreview);
      setVersions(nextVersions);
      setIllustrations((payload.illustrations || []) as PublicIllustration[]);
      setLyricTexts((payload.lyrics || []) as PublicLyric[]);
      setFamilyReleased(released);
      setTeacherPreview(preview);
      setLoadError("");
      if ((released || preview) && !nextVersions.some((item) => item.track_id === id && item.url)) {
        playlistAutoPlay.current = false;
        setAudioError("Esta canção ainda não possui uma gravação disponível. Use Próxima para continuar.");
      }
      setTrackId(id);
    } catch (error) {
      if (request !== requestNumber.current) return;
      playlistAutoPlay.current = false;
      setLoadError(error instanceof Error ? error.message : "Falha ao carregar a gravação.");
    } finally {
      if (request === requestNumber.current) setRefreshingAudio(false);
    }
  };

  // Alguns navegadores disparam canplay antes da mudanca de estado que conclui
  // a renovacao do URL. Repetir a tentativa quando o elemento ja esta pronto.
  useEffect(() => {
    if (dialog !== "playlist" || refreshingAudio || !source || !playlistAutoPlay.current) return;
    const player = audio.current;
    if (!player || !player.paused || player.readyState < 2) return;
    void player.play().catch(() => {
      playlistAutoPlay.current = false;
      setAudioError("Toque em Reproduzir para continuar no seu celular.");
    });
  }, [dialog, refreshingAudio, source]);

  // Renova a URL privada (5 min) antes de ampliar um desenho.
  const openArtwork = async (track: string, id: string) => {
    setArtBusy(true); setArtError("");
    try {
      const response = await fetch(`${LU_BASE_PATH}/api?view=public`, { cache: "no-store" });
      if (!response.ok) throw new Error("A imagem não está disponível no momento.");
      const payload = await response.json();
      const pictures = (payload.illustrations || []) as PublicIllustration[];
      const selected = pictures.find((v) => v.id === id && v.track_id === track && v.url);
      if (!selected) throw new Error("Esta ilustração ainda não foi liberada pela escola.");
      setIllustrations(pictures);
      setArtSelected({ trackId: track, id });
    } catch (e) { setArtError(e instanceof Error ? e.message : "Falha ao carregar o desenho."); }
    finally { setArtBusy(false); }
  };

  const select = (id: string) => {
    playlistAutoPlay.current = false;
    setPlaying(false);
    setLyrics(false);
    setCaptionExpanded(false);
    setDialog("player");
    void loadTrack(id);
  };

  const openPlaylist = () => {
    requestNumber.current += 1;
    audio.current?.pause();
    playlistAutoPlay.current = false;
    setPlaying(false);
    setPlaylistFinished(false);
    setCaptionExpanded(false);
    setCaptionsEnabled(false);
    setAudioError("");
    setLoadError("");
    setTime(0);
    setDuration(0);
    setTrackId(tracks[0].id);
    setDialog("playlist");
  };

  const openGallery = () => {
    requestNumber.current += 1;
    playlistAutoPlay.current = false;
    audio.current?.pause();
    setPlaying(false);
    setDialog("gallery");
  };

  const openList = () => {
    requestNumber.current += 1;
    playlistAutoPlay.current = false;
    audio.current?.pause();
    setPlaying(false);
    setRefreshingAudio(false);
    setPage(Math.floor(index / PAGE_SIZE));
    setDialog("list");
  };

  const change = (step: number) => {
    const next = dialog === "playlist"
      ? Math.max(0, Math.min(tracks.length - 1, index + step))
      : (index + step + tracks.length) % tracks.length;
    if (next === index) return;
    const shouldResume = dialog === "playlist" && playlistAutoPlay.current;
    audio.current?.pause();
    setPlaying(false);
    setPlaylistFinished(false);
    void loadTrack(tracks[next].id, shouldResume);
  };

  const handleEnded = () => {
    setPlaying(false);
    if (dialog !== "playlist" || !playlistAutoPlay.current) return;
    if (index >= tracks.length - 1) {
      playlistAutoPlay.current = false;
      setPlaylistFinished(true);
      return;
    }
    void loadTrack(tracks[index + 1].id, true);
  };

  const play = async () => {
    if (!audio.current || !source || refreshingAudio) return;
    if (!audio.current.paused) {
      playlistAutoPlay.current = false;
      audio.current.pause();
      return;
    }
    if (dialog === "playlist") playlistAutoPlay.current = true;
    setPlaylistFinished(false);
    try {
      await audio.current.play();
    } catch {
      playlistAutoPlay.current = false;
      setPlaying(false);
      setAudioError("O navegador não permitiu iniciar automaticamente. Toque em Reproduzir para continuar.");
    }
  };
  const pages = Math.ceil(tracks.length / PAGE_SIZE);

  return (
    <main className="lu-root lu-book lu-public-home">
      <LuHeader />
      <div className="lu-container">
        <section className="lu-hero">
          <span className="lu-eyebrow">✨ Uma recordação que ganha voz</span>
          <h1>Nosso Livro <em>Musical!</em> 🎶</h1>
          <p>Uma página para guardar músicas, desenhos e momentos especiais vividos na escola.<span className="lu-hero-family-line">Feita para ouvir e cantar em família!</span></p>
          <div className="lu-hero-tags"><span>🎵 12 músicas</span><span>🎨 {illustrations.length ? "desenhos da turma" : "desenhos da turma em breve"}</span></div>
        </section>
        <section className="lu-collection-entry">
          <span className="lu-collection-caption">✨ NOSSA COLEÇÃO</span>
          <button type="button" className="lu-open-card" onClick={openList}>
            <span><strong>Escolha uma música</strong><small>CLIQUE PARA ABRIR</small></span>
            <span className="lu-track-count">12 canções</span><span aria-hidden="true">›</span>
          </button>
        </section>
        <section className="lu-collection-entry lu-sequence-entry">
          <button type="button" className="lu-open-card" onClick={openPlaylist}>
            <span><strong>Ouça todas as músicas</strong><small>CLIQUE PARA ABRIR • EM SEQUÊNCIA</small></span>
            <span className="lu-track-count">12 canções</span><span aria-hidden="true">›</span>
          </button>
        </section>
        {illustrations.some((item) => item.url) && <section className="lu-collection-entry lu-art-public-entry">
          <button type="button" className="lu-open-card" onClick={openGallery}>
            <span><strong>🎨 Desenhos da nossa turma</strong><small>VER PÁGINAS ILUSTRADAS E LETRAS</small></span>
            <span className="lu-track-count">Galeria</span><span aria-hidden="true">›</span>
          </button>
        </section>}
        <section className="lu-note"><span>💚</span><div><strong>Feito com carinho</strong><p>O livro físico é a estrela! Ouça e cante junto com as crianças.</p></div></section>
      </div>
      {dialog !== "closed" && <div className="lu-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="lu-dialog" role="dialog" aria-modal="true" aria-label={dialog === "list" ? "Escolha uma música" : dialog === "gallery" ? "Galeria de ilustrações" : dialog === "playlist" ? "Ouvir todas as músicas em sequência" : song.title}>
          <div className="lu-dialog-head"><strong>{dialog === "list" ? "🎶 Escolha uma música" : dialog === "gallery" ? "🎨 Desenhos da nossa turma" : dialog === "playlist" ? `🎶 Ouvir todas — ${index + 1} de ${tracks.length}` : `🎧 Música ${String(index + 1).padStart(2, "0")} de 12`}</strong><button type="button" aria-label="Fechar janela" className="lu-dialog-close" onClick={close}>FECHAR</button></div>
          {dialog === "gallery" ? <div className="lu-art-public-gallery">
            <p className="lu-art-public-caption">Páginas ilustradas pelas crianças e aprovadas pela escola. Toque em cada desenho para ampliar.</p>
            {tracks.map((track) => {
              const pictures = artworkFor(track.id);
              if (!pictures.length) return null;
              return <div key={track.id} className="lu-art-gallery-song">
                <h2>{track.art} {track.title}</h2>
                <div className="lu-art-gallery-grid">{pictures.map((picture) => <button type="button" key={picture.id} className="lu-art-gallery-tile" disabled={artBusy} onClick={() => void openArtwork(track.id,picture.id)}>
                  <Image unoptimized src={picture.url!} alt={`Página ilustrada da canção ${track.title}`} width={240} height={310} />
                  <small>{picture.is_featured ? "Principal" : "Outra ilustração"}</small>
                </button>)}</div>
              </div>;
            })}
            {artError && <p role="alert" className="lu-alert">{artError}</p>}
          </div> : dialog === "list" ? <>
            <div className="lu-dialog-list">
              {tracks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((track, position) => <button type="button" key={track.id} className="lu-track" onClick={() => select(track.id)}>
                <span className="lu-art" aria-hidden="true">{artworkFor(track.id)[0]?.url
                  ? <Image unoptimized src={artworkFor(track.id)[0].url!} width={64} height={64} alt="" className="lu-art-thumb" /> : track.art}</span>
                <span className="lu-track-main"><small>MÚSICA {String(page * PAGE_SIZE + position + 1).padStart(2, "0")}</small><strong>{track.title}</strong><small>{versions.some((v) => v.track_id === track.id && v.url) ? "Ouvir gravação escolhida" : (familyReleased || teacherPreview) ? "Gravação indisponível" : "Demonstração temporária"}</small></span>
                <span className="lu-track-arrow" aria-hidden="true">›</span>
              </button>)}
            </div>
            <div className="lu-pager"><button type="button" onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0}>‹ Anterior</button><span>Página {page + 1} de {pages}</span><button type="button" onClick={() => setPage((v) => Math.min(pages - 1, v + 1))} disabled={page === pages - 1}>Próxima ›</button></div>
          </> : <div className="lu-dialog-player">
            {dialog === "playlist" && <p className="lu-sequence-hint" role="status">🎵 Reproduzindo as músicas na ordem definida pela escola. Toque em ▶ para iniciar e use ⏭ para avançar.</p>}
            <div className={`lu-player-illustration lu-tint-${song.tint}`}>
              {mainArtwork?.url ? <Image unoptimized src={mainArtwork.url} width={380} height={260} className="lu-art-player-preview" alt={`Desenho da canção ${song.title}`} /> : <span aria-hidden="true">{song.art}</span>}
            </div>
            <h2>{song.title}</h2>
            <p>{active?.url ? (teacherPreview ? "Prévia docente: gravação selecionada, ainda não liberada às famílias" : "Gravação escolhida pelos docentes") : (familyReleased || teacherPreview) ? "Áudio não disponível para esta música" : "Demonstração instrumental — aguardando liberação da escola"}</p>
            {loadError && <p role="alert" className="lu-alert">{loadError}</p>}
            {audioError && <p role="alert" className="lu-alert">{audioError}</p>}
            {playlistFinished && dialog === "playlist" && <p role="status" className="lu-sequence-finished">✅ Sequência concluída! Para ouvir novamente, toque em Recomeçar.</p>}
            {refreshingAudio && <p role="status" className="lu-sequence-loading">Carregando a gravação...</p>}
            <audio ref={audio} preload="metadata" src={source}
              onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
              onCanPlay={() => {
                if (dialog !== "playlist" || !playlistAutoPlay.current || refreshingAudio) return;
                const promise = audio.current?.play();
                if (promise) void promise.catch(() => {
                  playlistAutoPlay.current = false;
                  setAudioError("Toque em Reproduzir para continuar no seu celular.");
                });
              }}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={handleEnded}
              onError={() => {
                setPlaying(false);
                playlistAutoPlay.current = false;
                if (source) setAudioError("Não foi possível reproduzir este áudio. Toque em Próxima para continuar.");
              }} />
            {captionAvailable && <div className="lu-caption-box">
              <button type="button" className="lu-caption-toggle"
                onClick={() => { setCaptionsEnabled(true); setCaptionExpanded(true); }}
                aria-label="Abrir letra sincronizada aprovada pela docente"
                aria-haspopup="dialog">
                CC Acompanhar a música com legenda
              </button>
            </div>}
            <label className="lu-sr-only" htmlFor="lu-seek-v4">Posição da música</label>
            <input id="lu-seek-v4" type="range" className="lu-seek" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(time, Math.max(duration, 1))} onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); }} />
            <div className="lu-time"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div>
            <div className="lu-controls"><button type="button" aria-label="Música anterior" onClick={() => change(-1)} disabled={refreshingAudio || (dialog === "playlist" && index === 0)}>⏮</button><button type="button" aria-label={playing ? "Pausar" : "Reproduzir"} className="lu-play" onClick={() => void play()} disabled={!source || refreshingAudio}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="Próxima música" onClick={() => change(1)} disabled={refreshingAudio || (dialog === "playlist" && index === tracks.length - 1)}>⏭</button></div>
            {dialog === "playlist" && <button type="button" className="lu-sequence-restart" onClick={() => {
              audio.current?.pause();
              playlistAutoPlay.current = false;
              setPlaylistFinished(false);
              void loadTrack(tracks[0].id);
            }}>↺ Recomeçar desde a primeira música</button>}
            <button type="button" className="lu-lyrics-toggle" onClick={() => setLyrics((v) => !v)} aria-expanded={lyrics}>📖 {lyrics ? "Ocultar desenhos e letras" : "Ver desenhos e letras"}<span>{lyrics ? "−" : "+"}</span></button>
            {lyrics && <div className="lu-lyrics">
              {rawLyrics && <p className="lu-lyrics-text">{rawLyrics.replace(/^\s*\[\d{1,2}:\d{2}(?:[.,]\d{1,3})?\]\s*/gm, "")}</p>}
              {currentArtworks.length ? <><p>As letras estão nas páginas originais ilustradas. Toque para ampliar e ler com a família.</p>
                <div className="lu-art-gallery-grid">{currentArtworks.map((picture) => <button type="button" className="lu-art-gallery-tile" key={picture.id} disabled={artBusy} onClick={() => void openArtwork(song.id, picture.id)}>
                  <Image unoptimized src={picture.url!} width={250} height={330} alt={`Página da música ${song.title}`} /><small>{picture.is_featured ? "Página principal" : "Outra versão"}</small>
                </button>)}</div></> : <p>As ilustrações ainda estão sendo organizadas e aprovadas pela escola.</p>}
              {artError && <p role="alert" className="lu-alert">{artError}</p>}
            </div>}
            <button type="button" className="lu-list-back" onClick={dialog === "playlist" ? close : openList}>{dialog === "playlist" ? "← Voltar ao livro" : "← Voltar à lista de músicas"}</button>
          </div>}
        </section>
      </div>}
      {captionAvailable && captionExpanded && captionsEnabled && (dialog === "player" || dialog === "playlist") && <div className="lu-caption-fullscreen" role="dialog" aria-modal="true" aria-label={`Legendas da cantiga ${song.title}`}>
        <div className="lu-caption-fullscreen-top"><strong>🎵 {song.title}</strong><button type="button" onClick={() => { setCaptionExpanded(false); setCaptionsEnabled(false); }}>FECHAR LEGENDA</button></div>
        <div className="lu-caption-fullscreen-center">
          <p className="lu-auto-caption-muted">{previousCaption || "♪"}</p>
          <p className="lu-auto-caption-current" aria-live="off">{currentCaption}</p>
          <p className="lu-auto-caption-muted">{nextCaption || "♪"}</p>
        </div>
        <div className="lu-caption-fullscreen-bottom">
          <label className="lu-sr-only" htmlFor="lu-caption-seek">Posição da gravação</label>
          <input id="lu-caption-seek" type="range" className="lu-seek" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(time, Math.max(duration, 1))} onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); }} />
          <div className="lu-time"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div>
          <button type="button" className="lu-caption-fullscreen-play" disabled={!source || refreshingAudio} onClick={() => void play()}>{playing ? "Ⅱ Pausar" : "▶ Reproduzir"}</button>
        </div>
      </div>}
      {artSelected && <div className="lu-art-fullscreen" role="dialog" aria-modal="true" aria-label="Página ilustrada ampliada">
        <div className="lu-art-fullscreen-head"><strong>🎨 {luTracks.find((s) => s.id === artSelected.trackId)?.title}</strong><button type="button" onClick={() => setArtSelected(null)}>FECHAR</button></div>
        {enlarged?.url ? <Image unoptimized src={enlarged.url} width={1200} height={1700} alt="Página completa ilustrada da cantiga" className="lu-art-fullscreen-photo" /> : <p>Desenho indisponível. Retorne à lista e tente novamente.</p>}
      </div>}
    </main>
  );
}
