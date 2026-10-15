import type { FingerState, HandShape, LetterSpec, Movement, ThumbPose } from './alphabet';
import { add, lerp, rotX, rotY, rotZ, sub, v, type Pt } from './geom';

/* ─── Pose sintética: HandShape → 21 pontos 3D ──────────────────────────
 * Convenção = worldLandmarks do MediaPipe: metros, y para BAIXO, z menor =
 * mais perto da câmera. Mão direita com a palma voltada para a câmera, dedos
 * para cima, polegar no lado +x. Dobrar um dedo o leva em direção à câmera
 * (−z), que é exatamente o que acontece com a palma virada para quem vê.
 *
 * É cinemática direta simplificada: cada dedo é uma cadeia de 3 segmentos e
 * o estado (estendido/curvado/dobrado) vira 3 ângulos de flexão.
 */

const FINGERS = [
  // [índice do MCP, base do MCP, abertura lateral (rad), comprimentos das falanges]
  { mcp: 5, base: v(0.032, -0.088, 0), spread: 0.06, seg: [0.04, 0.025, 0.02] },
  { mcp: 9, base: v(0.01, -0.092, 0), spread: 0, seg: [0.045, 0.028, 0.022] },
  { mcp: 13, base: v(-0.011, -0.087, 0), spread: -0.05, seg: [0.042, 0.026, 0.02] },
  { mcp: 17, base: v(-0.03, -0.078, 0), spread: -0.12, seg: [0.032, 0.02, 0.018] },
] as const;

const FLEX: Record<FingerState, [number, number, number]> = {
  estendido: [0.05, 0.05, 0.03],
  curvado: [0.55, 0.75, 0.5],
  dobrado: [1.5, 1.75, 1.1],
};

const THUMB_CMC = v(0.024, -0.025, -0.005);

/** Posições fixas (articulações 2, 3, 4) para cada pose de polegar. */
const THUMB: Record<Exclude<ThumbPose, 'toca'>, [Pt, Pt, Pt]> = {
  aberto: [v(0.045, -0.038, -0.008), v(0.068, -0.052, -0.01), v(0.088, -0.064, -0.01)],
  lado: [v(0.042, -0.045, -0.012), v(0.048, -0.068, -0.016), v(0.049, -0.09, -0.018)],
  sobre: [v(0.034, -0.045, -0.022), v(0.02, -0.06, -0.038), v(0, -0.068, -0.045)],
  oposto: [v(0.036, -0.04, -0.025), v(0.038, -0.056, -0.048), v(0.034, -0.072, -0.062)],
  entre: [v(0.034, -0.045, -0.02), v(0.03, -0.075, -0.03), v(0.021, -0.105, -0.022)],
  dentro: [v(0.034, -0.045, -0.02), v(0.03, -0.07, -0.03), v(0.024, -0.085, -0.028)],
};

export interface PoseOptions {
  /** Sobrescreve a flexão do indicador (usado na animação do X). */
  indexFlex?: [number, number, number];
}

export function buildPose(shape: HandShape, opts: PoseOptions = {}): Pt[] {
  const pts: Pt[] = new Array(21);
  pts[0] = v(0, 0, 0);
  pts[1] = THUMB_CMC;

  const states: FingerState[] = [shape.indicador, shape.medio, shape.anelar, shape.minimo];
  const spreads: number[] = FINGERS.map((f) => f.spread);
  const depth = [0, 0, 0, 0];
  if (shape.afastados) {
    spreads[0] = 0.24;
    spreads[1] = shape.anelar === 'estendido' ? 0 : -0.1;
    spreads[2] = -0.24;
  }
  if (shape.cruzados) {
    // Indicador passa por cima (na frente) do médio.
    spreads[0] = -0.2;
    spreads[1] = 0.14;
    depth[0] = -0.012;
  }

  FINGERS.forEach((f, i) => {
    const flex = i === 0 && opts.indexFlex ? opts.indexFlex : FLEX[states[i]];
    let p = add(f.base, v(0, 0, depth[i] * 0.3));
    pts[f.mcp] = p;
    let theta = 0;
    for (let s = 0; s < 3; s++) {
      theta += flex[s];
      const a = spreads[i];
      const dir = v(Math.sin(a) * Math.cos(theta), -Math.cos(a) * Math.cos(theta), -Math.sin(theta));
      p = add(p, add(v(dir.x * f.seg[s], dir.y * f.seg[s], dir.z * f.seg[s]), v(0, 0, depth[i] * 0.25)));
      pts[f.mcp + s + 1] = p;
    }
  });

  if (shape.polegar === 'toca') {
    const alvo = shape.tocaEm === 'medio' ? pts[12] : pts[8];
    const tip = add(alvo, v(0.004, 0.006, 0.002));
    pts[4] = tip;
    pts[2] = add(lerp(THUMB_CMC, tip, 0.35), v(0.014, 0, -0.012));
    pts[3] = add(lerp(THUMB_CMC, tip, 0.7), v(0.01, 0, -0.01));
  } else {
    [pts[2], pts[3], pts[4]] = THUMB[shape.polegar];
  }

  return orient(pts, shape.direcao);
}

function orient(pts: Pt[], direcao: HandShape['direcao']): Pt[] {
  switch (direcao) {
    case 'baixo':
      return pts.map((p) => rotZ(p, Math.PI));
    case 'lado':
      return pts.map((p) => rotZ(p, -Math.PI / 2));
    case 'frente':
      return pts.map((p) => rotX(p, Math.PI / 2.2));
    default:
      return pts;
  }
}

/* ─── Animação do movimento (tutorial) ─────────────────────────────────── */

const ease = (t: number) => t * t * (3 - 2 * t);

function pathPoint(points: [number, number][], t: number): [number, number] {
  const n = points.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(x);
  const f = ease(x - i);
  return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
}

/** Pose da letra no instante t ∈ [0,1] do seu movimento. */
export function poseAt(spec: LetterSpec, t: number): Pt[] {
  const m: Movement = spec.movimento;
  if (m === 'dobrar-indicador') {
    const k = ease(t);
    const flex: [number, number, number] = [0.05 + 0.25 * k, 0.05 + 1.45 * k, 0.03 + 1.0 * k];
    return buildPose(spec.forma, { indexFlex: flex }).map((p) => add(p, v(0, 0, 0.03 * k)));
  }
  const base = buildPose(spec.forma);
  const pivot = base[0];
  const around = (fn: (p: Pt) => Pt) => base.map((p) => add(fn(sub(p, pivot)), pivot));
  switch (m) {
    case 'giro':
      return around((p) => rotY(p, -1.3 * ease(t)));
    case 'curva-j': {
      const [dx, dy] = pathPoint([[0, 0], [0, 0.045], [-0.02, 0.06], [-0.04, 0.045]], t);
      return around((p) => rotY(p, -1.1 * ease(t))).map((p) => add(p, v(dx, dy, 0)));
    }
    case 'subir':
      return base.map((p) => add(p, v(0, -0.045 * ease(t), 0)));
    case 'tremular':
      return base.map((p) => add(p, v(0.008 * Math.sin(t * Math.PI * 6), 0.035 * ease(t), 0)));
    case 'desenhar-z': {
      const [dx, dy] = pathPoint([[-0.04, -0.03], [0.04, -0.03], [-0.04, 0.035], [0.04, 0.035]], t);
      return base.map((p) => add(p, v(dx, dy, 0)));
    }
    default:
      return base;
  }
}
