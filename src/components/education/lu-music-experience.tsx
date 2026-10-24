"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

const ALL = luTracks;
const fmt = (num: number) => `${Math.floor(num / 60)}:${String(Math.floor(num % 60)).padStart(2, "0")}`;

type PublicVersion = { id:string; track_id:string; url?:string };
type Feedback = { celular: boolean; ordem: boolean; visual: boolean; audio: boolean; letras: boolean };

export function LuMusicExperience({initialTrackId}:{initialTrackId?:string}) {
  const [current, setCurrent] = useState(() => Math.max(0, ALL.findIndex(song=>song.id===initialTrackId)));
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ celular: false, ordem: false, visual: false, audio: false, letras: false });
  const [notes, setNotes] = useState("");
  const [feedbackReady, setFeedbackReady] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [released,setReleased]=useState<PublicVersion[]>([]);
  const [familyReleased,setFamilyReleased]=useState(false);
  const track = ALL[current];
  const selectedAudio=released.find(v=>v.track_id===track.id);
  const demoUrl = selectedAudio?.url || `/education-demo/audio/musica-${track.id}.mp3`;
  useEffect(()=>{let active=true;fetch(`${LU_BASE_PATH}/api`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(active&&data){setReleased(data.versions||[]);setFamilyReleased(!!data.project?.family_released);}}).catch(()=>{});return()=>{active=false};},[]);

  const selectTrack = useCallback((index: number) => {
    setPlaying(false);
    setCurrent(index);
    setTime(0);
    setDuration(0);
    setShowLyrics(false);
  }, []);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.pause();
    player.load();
  }, [current]);

  async function togglePlay() {
    const player = audio.current;
    if (!player) return;
    if (player.paused) {
      try { await player.play(); } catch { setPlaying(false); }
    } else { player.pause(); }
  }

  function makeFeedbackText() {
    const items = [
      ["celular", "Navegação no celular"], ["ordem", "Ordem e títulos das músicas"],
      ["visual", "Visual da página"], ["audio", "Botões e reprodução"],
      ["letras", "Espaço para letras e desenhos"],
    ] as const;
    return [
      "📖 Nosso Livro Musical — retorno da homologação",
      ...items.map(([key, label]) => `${feedback[key] ? "✅" : "⬜"} ${label}`),
      "", "Observações:", notes.trim() || "Sem observações por enquanto.",
      "", "As gravações desta prévia são exemplos musicais, não as vozes reais das crianças.",
    ].join("\n");
  }

  async function shareFeedback() {
    const message = makeFeedbackText();
    setFeedbackReady(false);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Nosso Livro Musical — homologação", text: message });
        return;
      } catch { /* Compartilhamento cancelado ou não compatível: usar WhatsApp abaixo */ }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(message); setFeedbackReady(true); } catch { /* Fallback abaixo */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="lu-root lu-book">
      <header className="lu-brandhead">
       <div className="lu-brandtop"><span className="lu-brandicon">📖</span><div><strong>Nosso Livro Musical</strong><span>Projeto da Lu • 2026</span></div></div>
       <div className="lu-brandbottom"><span>Desenvolvido por</span><Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={165} height={50} priority /><div className="lu-headbuttons"><a href="#musicas">Voltar</a><a href="#feedback">Ajuda</a><form method="post" action={`${LU_BASE_PATH}/sair`}><button type="submit">Sair</button></form></div></div>
      </header>
      <div className="lu-container">
        <section className="lu-hero" aria-label="Apresentação do livro musical">
          <div className="lu-sprig lu-sprig-left" aria-hidden="true">☀️</div>
          <div className="lu-sprig lu-sprig-right" aria-hidden="true">🌻</div>
          <span className="lu-eyebrow">✨ Uma recordação que ganha voz</span>
          <h1>Nosso Livro <em>Musical!</em> <span aria-hidden="true">🎶</span></h1>
          <p>Uma página para guardar músicas, desenhos e momentos especiais vividos na escola. Feita para ouvir e cantar em família!</p>
          <div className="lu-hero-tags"><span>🎵 12 músicas</span><span>🎨 desenhos da turma em breve</span><span>📱 feito para o celular</span></div>
        </section>

        <aside className="lu-preview-alert" role="status">
          <span aria-hidden="true">🧪</span>
          <div><strong>Versão para validação das professoras</strong><p>Os títulos estão em ordem provisória. {familyReleased ? "Você está ouvindo as versões liberadas pela escola." : "Esta página ainda utiliza demonstrações instrumentais. As vozes das crianças só aparecerão após a autorização e liberação final da escola."} As letras e ilustrações serão incluídas após conferência.</p></div>
        </aside>

        <section className="lu-grid" id="musicas" aria-label="Biblioteca musical">
          <div>
            <div className="lu-section-heading"><div><span>✨ NOSSA COLEÇÃO</span><h2>Escolha uma música</h2></div><span className="lu-track-count">{ALL.length} canções</span></div>
            <div className="lu-tracks">
              {ALL.map((song, index) => (
                <button
                  key={song.id}
                  type="button"
                  className={`lu-track lu-tint-${song.tint} ${index === current ? "lu-track-selected" : ""}`}
                  onClick={() => selectTrack(index)}
                  aria-current={index === current ? "true" : undefined}
                  aria-label={`Selecionar música ${song.id}: ${song.title}`}
                >
                  <span className="lu-art" aria-hidden="true">{song.art}</span>
                  <span className="lu-track-main"><small>MÚSICA {song.id}</small><strong>{song.title}</strong><small>{released.some(v => v.track_id === song.id && v.url) ? "Ouvir gravação aprovada" : "Ouvir demonstração"}</small></span>
                  <span className="lu-track-arrow" aria-hidden="true">{index === current ? "♫" : "›"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="lu-right">
            <section className="lu-player" aria-label="Reprodutor musical">
              <span className="lu-player-kicker">🎧 OUVINDO AGORA</span>
              <div className={`lu-player-illustration lu-tint-${track.tint}`} aria-hidden="true"><span>{track.art}</span><i>♪</i><b>✦</b></div>
              <span className="lu-playing-number">Música {track.id} de 12</span>
              <h2>{track.title}</h2>
              <p>{selectedAudio?.url ? "Gravação aprovada pela escola" : "Trecho instrumental demonstrativo"}</p>
              <audio
                ref={audio}
                preload="metadata"
                src={demoUrl}
                onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)}
                onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                aria-label={`Áudio demonstrativo de ${track.title}`}
              />
              <label className="lu-sr-only" htmlFor="lu-seek">Posição da música</label>
              <input id="lu-seek" className="lu-seek" type="range" min="0" max={Math.max(duration, 1)} step="0.1" value={Math.min(time, Math.max(duration, 1))} onChange={event => { if (audio.current) audio.current.currentTime = Number(event.target.value); }} />
              <div className="lu-time"><span>{fmt(time)}</span><span>{duration ? fmt(duration) : "0:00"}</span></div>
              <div className="lu-controls">
                <button type="button" onClick={() => selectTrack((current + ALL.length - 1) % ALL.length)} aria-label="Música anterior">⏮</button>
                <button type="button" className="lu-play" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproduzir"}>{playing ? "Ⅱ" : "▶"}</button>
                <button type="button" onClick={() => selectTrack((current + 1) % ALL.length)} aria-label="Próxima música">⏭</button>
              </div>
              <button type="button" className="lu-lyrics-toggle" onClick={() => setShowLyrics(v => !v)} aria-expanded={showLyrics}>📖 {showLyrics ? "Esconder espaço da letra" : "Ver espaço da letra"} <span>{showLyrics ? "−" : "+"}</span></button>
              {showLyrics && <div className="lu-lyrics"><strong>Letra da música</strong><p>A letra da canção será incluída aqui depois da conferência das professoras e das permissões necessárias.</p><span>🎨 Ilustração original dos alunos: aguardando recebimento</span></div>}
            </section>
            <section className="lu-note"><span>💚</span><div><strong>Feito com carinho</strong><p>O livro físico é a estrela! Esta página complementa a experiência e convida a família a cantar junto com as crianças.</p></div></section>
          </div>
        </section>

        <section className="lu-feedback" id="feedback"><div className="lu-section-heading"><div><span>📝 PARTICIPE DO PROJETO</span><h2>Lu, conte o que achou!</h2></div></div>
          <p>Assinale o que você já conseguiu conferir e escreva os ajustes que gostaria de fazer. Ao compartilhar, você escolhe o contato no WhatsApp. Nenhuma resposta é armazenada por esta página.</p>
          <div className="lu-checks">
            {([
              ["celular", "Consegui navegar bem pelo celular"],
              ["ordem", "Conferi a sequência e os nomes das músicas"],
              ["visual", "Gostei da aparência da página"],
              ["audio", "Testei os botões de reprodução"],
              ["letras", "Entendi onde entrarão letras e ilustrações"],
            ] as const).map(([key, label]) => <label key={key} className="lu-check"><input type="checkbox" checked={feedback[key]} onChange={ev => setFeedback(old => ({ ...old, [key]: ev.target.checked }))}/><span>{label}</span></label>)}
          </div>
          <label className="lu-feedback-label" htmlFor="lu-feedback-notes">O que você gostaria de ajustar ou acrescentar?</label>
          <textarea id="lu-feedback-notes" maxLength={1500} rows={3} placeholder="Ex.: ordem das músicas, título do livro, cores, sugestões..." value={notes} onChange={e => setNotes(e.target.value)} />
          <button className="lu-button lu-button-primary lu-feedback-button" type="button" onClick={shareFeedback}>💬 Compartilhar meu feedback</button>
          {feedbackReady && <p className="lu-feedback-confirm" role="status">Seu texto também foi copiado. Se o compartilhamento não abriu, é só colar a mensagem no WhatsApp.</p>}
        </section>
        <footer className="lu-footer"><strong>Memórias que Encantam</strong><span>Uma experiência da Automação Extrema • Protótipo privado de homologação</span></footer>
      </div>
    </main>
  );
}
