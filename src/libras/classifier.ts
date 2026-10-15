import { FORMAS_ESTATICAS, type FingerState, type HandShape, type ThumbPose } from './alphabet';
import { featureVector, extractFeatures, type HandFeatures } from './features';
import { smoothstep, type Pt } from './geom';
import { buildPose } from './poses';
import type { CalibrationSamples } from './calibration';

/* ─── Classificador por regras suaves ────────────────────────────────────
 * Para cada forma estática, cada traço da especificação vira um grau de
 * pertinência ∈ [0,1] e a nota é a média ponderada. "Suave" importa: uma
 * mão real nunca bate 100% com o desenho, e queremos ranquear, não só
 * aceitar/rejeitar. A calibração pessoal (kNN) entra por cima: se você
 * gravou sua própria versão de uma letra, a nota dela é max(regra, kNN).
 */

const CURL_CENTER: Record<FingerState, number> = { estendido: 0.08, curvado: 0.42, dobrado: 0.92 };
const CURL_WIDTH: Record<FingerState, number> = { estendido: 0.15, curvado: 0.17, dobrado: 0.2 };

const gauss = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/**
 * Protótipos do polegar (lateral, altura) medidos nas próprias poses
 * sintéticas — assim gerador e classificador nunca divergem.
 */
const THUMB_PROTO: Record<Exclude<ThumbPose, 'toca'>, [number, number]> = (() => {
  const fist = { indicador: 'dobrado', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado', direcao: 'cima' } as const;
  const measure = (polegar: ThumbPose): [number, number] => {
    const f = extractFeatures(buildPose({ ...fist, polegar } as HandShape));
    return [f.thumbLateral, f.thumbAltura];
  };
  return {
    aberto: measure('aberto'),
    lado: measure('lado'),
    sobre: measure('sobre'),
    oposto: measure('oposto'),
    entre: measure('entre'),
    dentro: measure('dentro'),
  };
})();

function thumbScore(shape: HandShape, f: HandFeatures): number {
  const toqueMin = Math.min(f.toqueIndicador, f.toqueMedio);
  if (shape.polegar === 'toca') {
    const d = shape.tocaEm === 'medio' ? Math.min(f.toqueMedio, f.toqueIndicador * 1.3) : toqueMin;
    return gauss(d, 0, 0.28);
  }
  const [lat, alt] = THUMB_PROTO[shape.polegar];
  let m = Math.exp(-((f.thumbLateral - lat) ** 2 + (f.thumbAltura - alt) ** 2) / 0.04);
  // Pontas encostadas indicam círculo (O/D); penaliza poses que não tocam.
  if (shape.polegar === 'oposto') m *= smoothstep(0.18, 0.4, toqueMin);
  return m;
}

export interface ShapeScore {
  id: string;
  score: number;
}

export function scoreShape(shape: HandShape, f: HandFeatures): number {
  const fingers: FingerState[] = [shape.indicador, shape.medio, shape.anelar, shape.minimo];
  let sum = 0;
  let wsum = 0;
  const add = (m: number, w: number) => {
    sum += m * w;
    wsum += w;
  };

  fingers.forEach((st, i) => add(gauss(f.curl[i], CURL_CENTER[st], CURL_WIDTH[st]), 1));
  add(thumbScore(shape, f), 1.6);
  add(f.direcao === shape.direcao ? 1 : 0.1, 1.4);

  if (shape.indicador === 'estendido' && shape.medio === 'estendido') {
    // A abertura só tem significado se os DOIS dedos estão de fato retos;
    // com um deles dobrado o ângulo medido explode (~140°) e não diz nada.
    const ambosRetos = f.curl[0] < 0.3 && f.curl[1] < 0.3;
    const afastado = smoothstep(9, 20, f.aberturaIM);
    // Dedos cruzados divergem naturalmente — no R a abertura não conta.
    if (!shape.cruzados) add(!ambosRetos ? 0.3 : shape.afastados ? afastado : 1 - afastado, 1.2);
    const cruzado = smoothstep(-0.03, 0.08, f.cruzamento);
    add(shape.cruzados ? cruzado : 1 - cruzado, 1.2);
  }
  return sum / wsum;
}

export function classify(world: Pt[], calib?: CalibrationSamples): { ranking: ShapeScore[]; features: HandFeatures } {
  const features = extractFeatures(world);
  const vec = calib ? featureVector(features) : null;
  const ranking = FORMAS_ESTATICAS.map(({ id, forma }) => {
    let score = scoreShape(forma, features);
    const samples = calib?.[id];
    if (vec && samples?.length) {
      let best = Infinity;
      for (const s of samples) {
        let d = 0;
        for (let i = 0; i < s.length; i++) d += (s[i] - vec[i]) ** 2;
        best = Math.min(best, d);
      }
      score = Math.max(score, Math.exp(-best / 0.25));
    }
    return { id, score };
  }).sort((a, b) => b.score - a.score);
  return { ranking, features };
}
