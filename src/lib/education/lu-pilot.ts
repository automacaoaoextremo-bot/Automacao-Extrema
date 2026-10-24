/**
 * Conteúdo provisório do piloto Lu 2026.
 * Títulos adaptados dos nomes dos arquivos fornecidos, NÃO validados pela escola.
 * Somente áudios sintetizados e ilustrativos: nenhuma voz de criança deve ir para public/.
 */
export const LU_BASE_PATH = "/solucoes/memorias-que-encantam/livro/lu-2026";

export const luTracks = [
  { id: "01", title: "Borboleta Eufrídia", art: "🦋", tint: "lilac" },
  { id: "02", title: "Borboletinha", art: "🌼", tint: "pink" },
  { id: "03", title: "Casa Engraçada", art: "🏠", tint: "sky" },
  { id: "04", title: "Cowboy João", art: "🤠", tint: "peach" },
  { id: "05", title: "Fifi", art: "🐾", tint: "mint" },
  { id: "06", title: "O Pato e a Pata", art: "🦆", tint: "yellow" },
  { id: "07", title: "Olelê", art: "🌊", tint: "sky" },
  { id: "08", title: "Para Cantar Bem", art: "🎤", tint: "pink" },
  { id: "09", title: "Pato Pateta", art: "🐥", tint: "yellow" },
  { id: "10", title: "Peixe Vivo", art: "🐠", tint: "mint" },
  { id: "11", title: "Ratinho e o Relógio", art: "🐭", tint: "lilac" },
  { id: "12", title: "Yapo", art: "👏", tint: "peach" },
] as const;

export type LuTrack = (typeof luTracks)[number];
