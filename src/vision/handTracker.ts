import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

/* ─── MediaPipe HandLandmarker (adaptado do gesture-synth-weld) ──────────
 * Diferenças em relação ao synth:
 *  - numHands: 1 → a datilologia é feita com a mão dominante; uma segunda
 *    mão no quadro só atrapalharia o classificador.
 *  - Devolvemos também os worldLandmarks (metros, 3D, isotrópicos), que é o
 *    que o reconhecimento de letras usa. Os landmarks normalizados ficam só
 *    para desenhar o esqueleto sobre o vídeo.
 *  - Fonte única: mesmo domínio (/v1.0.1/). Ao trocar de versão, crie um
 *    diretório novo — os arquivos têm cache immutable de 1 ano (vercel.json).
 */

const MODEL = { wasm: '/v1.0.1/wasm', task: '/v1.0.1/hand_landmarker.task' } as const;

export interface Pt {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHand {
  /** Coordenadas normalizadas na imagem (0..1) — para desenhar. */
  image: Pt[];
  /** Coordenadas 3D em metros, centradas na mão — para classificar. */
  world: Pt[];
  label: 'Left' | 'Right';
}

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;

/** Idempotente: chamadas concorrentes compartilham o mesmo download (~8 MB). */
export function initHandTracking(): Promise<HandLandmarker> {
  if (landmarker) return Promise.resolve(landmarker);
  if (!initPromise) {
    initPromise = doInit().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

async function doInit(): Promise<HandLandmarker> {
  // Carregamento preguiçoso: o runtime só entra quando a câmera é ligada.
  const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(MODEL.wasm);
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL.task, delegate },
    runningMode: 'VIDEO' as const,
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  try {
    landmarker = await HandLandmarker.createFromOptions(vision, options('GPU'));
  } catch {
    landmarker = await HandLandmarker.createFromOptions(vision, options('CPU'));
  }
  return landmarker;
}

export function detectHand(video: HTMLVideoElement, timestampMs: number): DetectedHand | null {
  if (!landmarker) return null;
  return parse(landmarker.detectForVideo(video, timestampMs));
}

function parse(result: HandLandmarkerResult): DetectedHand | null {
  const image = result.landmarks?.[0];
  const world = result.worldLandmarks?.[0];
  const label = result.handedness?.[0]?.[0]?.categoryName as 'Left' | 'Right' | undefined;
  if (!image?.length || !world?.length || !label) return null;
  const toPt = (p: { x: number; y: number; z?: number }): Pt => ({ x: p.x, y: p.y, z: p.z ?? 0 });
  return { image: image.map(toPt), world: world.map(toPt), label };
}

/** Ligações entre os 21 pontos para desenhar o esqueleto. */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];
