import type { DetectedHand } from '../vision/handTracker';
import { ROTULO_BASE } from './alphabet';
import type { CalibrationSamples } from './calibration';
import { classify, type ShapeScore } from './classifier';
import type { HandFeatures } from './features';
import { MotionTracker } from './motion';

/* ─── Pipeline por quadro: mão → forma estática → letra de movimento ──── */

export interface Recognition {
  /** Melhor forma (ou null se nada passou do mínimo). */
  top: ShapeScore | null;
  ranking: ShapeScore[];
  features: HandFeatures;
  /** Letra de movimento detectada neste quadro (J, Ç, H, K, X, Z). */
  movimento: string | null;
  /** Texto para mostrar ("A", "H ou K — faça o movimento"). */
  rotulo: string;
}

const MIN_SCORE = 0.62;

export class Recognizer {
  private motion = new MotionTracker();
  private cooldownAte = 0;

  constructor(
    public calib: CalibrationSamples,
    private aspect = 16 / 9,
  ) {}

  setAspect(a: number) {
    this.aspect = a;
  }

  reset() {
    this.motion.reset();
  }

  process(hand: DetectedHand, now: number): Recognition {
    const { ranking, features } = classify(hand.world, this.calib);
    const best = ranking[0];
    const top = best && best.score >= MIN_SCORE ? best : null;

    // Coordenadas de imagem com x corrigido pelo aspecto (pixels "quadrados").
    const img = hand.image.map((p) => ({ x: p.x * this.aspect, y: p.y, z: p.z }));
    const d = (a: number, b: number) => Math.hypot(img[a].x - img[b].x, img[a].y - img[b].y);
    this.motion.push({
      t: now,
      base: top?.id ?? null,
      wrist: img[0],
      indexTip: img[8],
      pinkyTip: img[20],
      palmWidth: d(5, 17),
      palmLen: d(0, 9),
      curl: features.curl,
    });

    let movimento: string | null = null;
    if (now > this.cooldownAte) {
      movimento = this.motion.detect();
      if (movimento) {
        // Evita detectar o mesmo gesto duas vezes enquanto ele termina.
        this.motion.reset();
        this.cooldownAte = now + 900;
      }
    }

    const rotulo = movimento ?? (top ? (ROTULO_BASE[top.id] ?? top.id) : '');
    return { top, ranking, features, movimento, rotulo };
  }
}
