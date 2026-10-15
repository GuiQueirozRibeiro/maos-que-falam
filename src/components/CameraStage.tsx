import { useCallback, useRef, type ReactNode } from 'react';
import { HAND_CONNECTIONS, type DetectedHand } from '../vision/handTracker';
import { useHandCamera } from '../vision/useHandCamera';

/* ─── Vídeo espelhado + esqueleto da mão ─────────────────────────────────
 * O canvas tem o tamanho NATIVO do vídeo e recebe o mesmo object-fit:cover
 * e o mesmo espelhamento por CSS — assim o navegador recorta os dois
 * igualmente e o esqueleto fica alinhado sem conta de recorte.
 */

interface Props {
  onHand: (hand: DetectedHand | null, now: number, aspect: number) => void;
  children?: ReactNode;
  /** Cor do esqueleto (muda para verde quando a pessoa acerta). */
  accent?: string;
}

export function CameraStage({ onHand, children, accent = '#ffd166' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(accent);
  accentRef.current = accent;

  const handleFrame = useCallback(
    (hand: DetectedHand | null, now: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      if (hand) drawSkeleton(ctx, hand, w, h, accentRef.current);
      onHand(hand, now, w / h);
    },
    // videoRef é estável (useRef dentro do hook)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onHand],
  );

  const { videoRef, status, error, start, stop } = useHandCamera(handleFrame);

  return (
    <div className="stage">
      <video ref={videoRef} className="stage-media" playsInline muted />
      <canvas ref={canvasRef} className="stage-media" />
      {status !== 'on' && (
        <div className="stage-cover">
          {status === 'loading' ? (
            <>
              <div className="spinner" aria-hidden />
              <p>Carregando o modelo de mãos (só na primeira vez, cerca de 8 MB)…</p>
            </>
          ) : (
            <>
              <p className="stage-cover-title">Ligue a câmera para começar</p>
              <p className="muted">
                O vídeo é processado <strong>no seu aparelho</strong>. Nenhuma imagem sai do navegador.
              </p>
              <button className="btn btn-primary" onClick={start}>
                Ligar câmera
              </button>
              {error && <p className="error">{error}</p>}
            </>
          )}
        </div>
      )}
      {status === 'on' && (
        <>
          {children}
          <button className="stage-off" onClick={stop} aria-label="Desligar câmera" title="Desligar câmera">
            ⏻
          </button>
        </>
      )}
    </div>
  );
}

function drawSkeleton(ctx: CanvasRenderingContext2D, hand: DetectedHand, w: number, h: number, color: string) {
  const pts = hand.image.map((p) => [p.x * w, p.y * h] as const);
  const s = w / 1280;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(11, 31, 27, 0.55)';
  ctx.lineWidth = 9 * s;
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(...pts[a]);
    ctx.lineTo(...pts[b]);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5 * s;
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(...pts[a]);
    ctx.lineTo(...pts[b]);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  for (const i of [4, 8, 12, 16, 20]) {
    ctx.beginPath();
    ctx.arc(pts[i][0], pts[i][1], 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
