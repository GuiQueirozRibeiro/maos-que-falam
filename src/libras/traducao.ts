import { paraLetras } from './alphabet';
import { SINAIS, type Sinal } from './sinais';

/* ─── Português → sequência em Libras (glosa) ────────────────────────────
 * Não é tradução automática de verdade (isso exige gramática da Libras:
 * topicalização, classificadores, expressões). São regras simples e
 * didáticas, cada uma explicada para quem está aprendendo:
 *   1. palavras com sinal no dicionário → sinal (maior expressão primeiro:
 *      "bom dia" ganha de "bom");
 *   2. artigos e o verbo de ligação (é, sou, está…) → omitidos;
 *   3. o resto (nomes próprios, palavras fora do dicionário) → datilologia;
 *   4. pergunta com pronome interrogativo → o pronome vai para o fim
 *      ("Qual é o seu nome?" → SEU NOME QUAL?), ordem comum em Libras.
 */

export type Item =
  | { tipo: 'sinal'; original: string; sinal: Sinal }
  | { tipo: 'soletrar'; original: string; letras: ReturnType<typeof paraLetras> }
  | { tipo: 'omitido'; original: string; motivo: string };

export interface Traducao {
  itens: Item[];
  /** Glosa legível: "MEU NOME A-N-A". */
  glosa: string;
  pergunta: boolean;
  /** Notas didáticas sobre o que mudou e por quê. */
  notas: string[];
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']);
/** A relação que elas expressam aparece na ordem e no espaço de sinalização. */
const PREPOSICOES = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'ao', 'à']);
/** Palavras cujo "sinal" em Libras é a própria soletração. */
const SOLETRACAO_LEXICAL: Record<string, string> = {
  oi: 'Em Libras, "oi" é feito soletrando O-I. A soletração virou o próprio sinal.',
};
const LIGACAO = new Set(['é', 'sou', 'es', 'és', 'somos', 'sao', 'são', 'esta', 'está', 'estou', 'estao', 'estão', 'estamos']);

/** Índice: forma normalizada (pode ter várias palavras) → sinais possíveis. */
const INDICE = new Map<string, Sinal[]>();
let MAIOR_EXPRESSAO = 1;
for (const s of SINAIS) {
  for (const p of s.palavras) {
    const k = semAcento(p);
    INDICE.set(k, [...(INDICE.get(k) ?? []), s]);
    MAIOR_EXPRESSAO = Math.max(MAIOR_EXPRESSAO, k.split(' ').length);
  }
}

/** Escolhe entre homônimos: "como" é COMO numa pergunta e COMER fora dela. */
function escolher(candidatos: Sinal[] | undefined, pergunta: boolean): Sinal | undefined {
  if (!candidatos?.length) return undefined;
  return candidatos.find((c) => !!c.soEmPergunta === pergunta) ?? candidatos.find((c) => !c.soEmPergunta);
}

export function traduzir(texto: string): Traducao {
  const pergunta = /\?\s*$/.test(texto);
  const palavras = texto.match(/[\p{L}\p{N}]+/gu) ?? [];
  const itens: Item[] = [];
  const notas: string[] = [];

  for (let i = 0; i < palavras.length; ) {
    // 1. maior expressão do dicionário que começa aqui
    let achou = false;
    for (let n = Math.min(MAIOR_EXPRESSAO, palavras.length - i); n >= 1; n--) {
      const trecho = palavras.slice(i, i + n);
      const sinal = escolher(INDICE.get(semAcento(trecho.join(' '))), pergunta);
      if (sinal) {
        itens.push({ tipo: 'sinal', original: trecho.join(' '), sinal });
        i += n;
        achou = true;
        break;
      }
    }
    if (achou) continue;

    const w = palavras[i];
    const k = w.toLowerCase();
    // Compara a palavra com acento: "e" (conjunção) ≠ "é" (verbo).
    if (ARTIGOS.has(k)) {
      itens.push({ tipo: 'omitido', original: w, motivo: 'Libras não usa artigos (o, a, os, as).' });
    } else if (k === 'e') {
      itens.push({ tipo: 'omitido', original: w, motivo: 'A conjunção "e" muitas vezes não tem sinal: a enumeração é marcada por pausa ou pelo espaço.' });
    } else if (PREPOSICOES.has(k)) {
      itens.push({ tipo: 'omitido', original: w, motivo: 'Preposições normalmente não são sinalizadas: a relação aparece na ordem e no espaço.' });
    } else if (SOLETRACAO_LEXICAL[k]) {
      itens.push({ tipo: 'soletrar', original: w, letras: paraLetras(w) });
      notas.push(SOLETRACAO_LEXICAL[k]);
    } else if (LIGACAO.has(k)) {
      itens.push({ tipo: 'omitido', original: w, motivo: 'O verbo de ligação (ser/estar) normalmente não é sinalizado.' });
    } else {
      itens.push({ tipo: 'soletrar', original: w, letras: paraLetras(w) });
    }
    i++;
  }

  // 4. pronome interrogativo para o fim
  if (pergunta) {
    const idx = itens.findIndex((it) => it.tipo === 'sinal' && it.sinal.interrogativo);
    if (idx >= 0 && idx < itens.length - 1) {
      const [q] = itens.splice(idx, 1);
      itens.push(q);
      notas.push(
        `Em perguntas, é comum o sinal interrogativo (${(q as Extract<Item, { tipo: 'sinal' }>).sinal.glosa}) ir para o fim da frase.`,
      );
    }
    notas.push('Pergunta: as sobrancelhas fazem parte da gramática. Franza para "quem/qual/onde/como" e levante para perguntas de sim/não.');
  }

  // Um motivo por nota, com as palavras afetadas (funciona no celular: sem hover).
  const porMotivo = new Map<string, string[]>();
  for (const it of itens) if (it.tipo === 'omitido') porMotivo.set(it.motivo, [...(porMotivo.get(it.motivo) ?? []), it.original]);
  for (const [motivo, ws] of porMotivo) notas.push(`Riscado (${ws.map((w) => `"${w}"`).join(', ')}): ${motivo}`);
  const soletradas = itens.filter((i) => i.tipo === 'soletrar' && !SOLETRACAO_LEXICAL[i.original.toLowerCase()]);
  if (soletradas.length) {
    notas.push(
      `Soletrado letra a letra: ${soletradas.map((s) => s.original).join(', ')}. Nomes próprios são sempre soletrados (até a pessoa ganhar um sinal-nome da comunidade surda). Outras palavras podem ter sinal que ainda não está no nosso dicionário. Consulte o INES.`,
    );
  }

  const glosa = itens
    .filter((i) => i.tipo !== 'omitido')
    .map((i) => (i.tipo === 'sinal' ? i.sinal.glosa : i.letras.map((l) => l.letra).join('-')))
    .join(' ')
    .concat(pergunta ? '?' : '');

  return { itens, glosa, pergunta, notas };
}
