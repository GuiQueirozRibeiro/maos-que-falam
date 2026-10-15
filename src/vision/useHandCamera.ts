import { useCallback, useEffect, useRef, useState } from 'react';
import { detectHand, initHandTracking, type DetectedHand } from './handTracker';

/* ─── Câmera + loop de detecção ──────────────────────────────────────────
 * Mesmo padrão do CameraSource do synth: voto majoritário nos últimos N
 * quadros para que uma mão que "pisca" por um quadro não vire ausência
 * (no synth isso silenciava a música; aqui inseriria um espaço indevido).
 */

const STABLE_FRAMES = 3;

export type CameraStatus = 'off' | 'loading' | 'on' | 'error';

export function useHandCamera(onFrame: (hand: DetectedHand | null, now: number) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const history = useRef<boolean[]>([]);
  const lastHand = useRef<DetectedHand | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    history.current = [];
    setStatus('off');
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('loading');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador não dá acesso à câmera. Tente o Chrome, o Edge ou o Safari atualizado.');
      }
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        }),
        initHandTracking(),
      ]);
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('on');

      let lastVideoTime = -1;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        const now = performance.now();
        const hand = detectHand(video, now);

        history.current.push(!!hand);
        if (history.current.length > STABLE_FRAMES) history.current.shift();
        if (hand) lastHand.current = hand;
        const present = history.current.filter(Boolean).length >= Math.ceil(STABLE_FRAMES / 2);
        onFrameRef.current(present ? (hand ?? lastHand.current) : null, now);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /Permission|NotAllowed/i.test(msg)
          ? 'Permissão da câmera negada. Libere o acesso no cadeado da barra de endereço e tente de novo.'
          : msg,
      );
      setStatus('error');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, start, stop };
}
