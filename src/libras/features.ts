import type { Direction } from './alphabet';
import { angle, dist, dot, norm, sub, v, type Pt } from './geom';

/* ─── Traços medidos de uma mão (worldLandmarks) ────────────────────────
 * Tudo é invariante a translação, escala e mão (direita/esquerda):
 *  - curvatura: soma dos ângulos de flexão nas 3 articulações do dedo;
 *  - polegar: projetado no referencial da própria mão
 *      a = MCP do mínimo → MCP do indicador  (eixo "lateral")
 *      u = punho → MCP do médio              (eixo "altura")
 *    então "lateral > 0" sempre quer dizer "por fora do indicador".
 */

export interface HandFeatures {
  /** 0 = reto … 1 = totalmente fechado. Ordem: indicador, médio, anelar, mínimo. */
  curl: [number, number, number, number];
  /** Ponta do polegar no eixo lateral (÷ palma). + fora do indicador, − atravessando a palma. */
  thumbLateral: number;
  /** Ponta do polegar no eixo punho→dedos (÷ palma). */
  thumbAltura: number;
  /** Distância normalizada da ponta do polegar às pontas do indicador e do médio. */
  toqueIndicador: number;
  toqueMedio: number;
  /** Ângulo (graus) entre indicador e médio. */
  aberturaIM: number;
  /** > 0 quando as pontas do indicador e do médio trocaram de lado (cruzados). */
  cruzamento: number;
  direcao: Direction;
  dir: Pt;
}

const MAX_FLEX = (250 * Math.PI) / 180;
const CHAINS = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

export function extractFeatures(w: Pt[]): HandFeatures {
  const wrist = w[0];
  const palm = dist(wrist, w[9]) || 1;

  const curl = CHAINS.map(([mcp, pip, dip, tip]) => {
    const flex =
      angle(sub(w[mcp], wrist), sub(w[pip], w[mcp])) +
      angle(sub(w[pip], w[mcp]), sub(w[dip], w[pip])) +
      angle(sub(w[dip], w[pip]), sub(w[tip], w[dip]));
    return Math.min(1, flex / MAX_FLEX);
  }) as HandFeatures['curl'];

  const a = norm(sub(w[5], w[17]));
  const u = norm(sub(w[9], wrist));
  const thumbTip = w[4];
  const thumbLateral = dot(sub(thumbTip, w[5]), a) / palm;
  const thumbAltura = dot(sub(thumbTip, wrist), u) / palm;
  const toqueIndicador = dist(thumbTip, w[8]) / palm;
  const toqueMedio = dist(thumbTip, w[12]) / palm;

  const aberturaIM = (angle(sub(w[8], w[5]), sub(w[12], w[9])) * 180) / Math.PI;
  // Na base, o indicador está do lado +a do médio; se nas pontas ele passou
  // para o lado −a, os dedos estão cruzados.
  const cruzamento = -dot(sub(w[8], w[12]), a) / palm;

  // Direção: média dos dedos esticados; se a mão estiver fechada, punho→médio.
  const retos = CHAINS.filter((_, i) => curl[i] < 0.3);
  let dir = retos.length
    ? norm(retos.reduce((acc, c) => {
        const d = norm(sub(w[c[3]], w[c[0]]));
        return v(acc.x + d.x, acc.y + d.y, acc.z + d.z);
      }, v(0, 0, 0)))
    : u;
  if (!Number.isFinite(dir.x)) dir = u;

  return {
    curl,
    thumbLateral,
    thumbAltura,
    toqueIndicador,
    toqueMedio,
    aberturaIM,
    cruzamento,
    direcao: classifyDirection(dir),
    dir,
  };
}

function classifyDirection(d: Pt): Direction {
  const ax = Math.abs(d.x);
  const ay = Math.abs(d.y);
  const az = Math.abs(d.z);
  if (az > ax && az > ay * 1.1) return 'frente';
  if (ax > ay) return 'lado';
  return d.y < 0 ? 'cima' : 'baixo';
}

/** Vetor numérico para o kNN da calibração pessoal. */
export function featureVector(f: HandFeatures): number[] {
  return [
    ...f.curl.map((c) => c * 2),
    f.thumbLateral * 1.5,
    f.thumbAltura,
    Math.min(f.toqueIndicador, 1.2),
    Math.min(f.toqueMedio, 1.2),
    f.aberturaIM / 30,
    f.cruzamento * 4,
    f.dir.x,
    f.dir.y,
    f.dir.z,
  ];
}
