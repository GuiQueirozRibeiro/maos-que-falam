/* ─── Voz em português (Web Speech API) ──────────────────────────────────
 * Roda 100% no navegador. As vozes carregam de forma assíncrona no Chrome
 * (evento voiceschanged), então escolhemos a voz na hora de falar.
 */

const PREFERIDAS = ['Luciana', 'Google português do Brasil', 'Francisca', 'Felipe', 'Thalita', 'Antonio'];

export function ttsDisponivel(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function escolherVoz(): SpeechSynthesisVoice | undefined {
  const vozes = speechSynthesis.getVoices();
  const br = vozes.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('pt-br'));
  for (const nome of PREFERIDAS) {
    const v = br.find((x) => x.name.includes(nome));
    if (v) return v;
  }
  return br[0] ?? vozes.find((v) => v.lang.toLowerCase().startsWith('pt'));
}

export function falar(texto: string, { rate = 1, interromper = true } = {}) {
  if (!ttsDisponivel() || !texto.trim()) return;
  if (interromper) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR';
  u.rate = rate;
  const voz = escolherVoz();
  if (voz) u.voice = voz;
  speechSynthesis.speak(u);
}

/** Nome falado de cada letra (soletrar "B" como "bê", não "b"). */
const NOMES: Record<string, string> = {
  A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i', J: 'jota', K: 'cá',
  L: 'éle', M: 'ême', N: 'êne', O: 'ó', P: 'pê', Q: 'quê', R: 'érre', S: 'ésse', T: 'tê', U: 'u',
  V: 'vê', W: 'dáblio', X: 'xis', Y: 'ípsilon', Z: 'zê', Ç: 'cê cedilha',
};

export const nomeDaLetra = (l: string) => NOMES[l] ?? l;
