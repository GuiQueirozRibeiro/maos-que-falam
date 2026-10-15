import { useEffect, useMemo, useRef, useState } from 'react';
import { POR_LETRA, type LetterSpec } from '../libras/alphabet';
import type { Pt } from '../libras/geom';
import { poseAt } from '../libras/poses';

/* ─── Mão ilustrada (SVG) a partir dos 21 pontos 3D ─────────────────────
 * Ossos como cápsulas, desenhados do mais distante ao mais próximo
 * (algoritmo do pintor), com contorno — é o que deixa legível quem está
 * na frente de quem (polegar do S, dedos cruzados do R).
 */

const BONES: [number, number, number][] = [
  // [a, b, espessura]
  [1, 2, 0.021], [2, 3, 0.019], [3, 4, 0.017],
  [5, 6, 0.018], [6, 7, 0.016], [7, 8, 0.015],
  [9, 10, 0.019], [10, 11, 0.017], [11, 12, 0.015],
  [13, 14, 0.018], [14, 15, 0.016], [15, 16, 0.014],
  [17, 18, 0.015], [18, 19, 0.013], [19, 20, 0.012],
];
const PALM = [0, 1, 5, 9, 13, 17];

export interface Frame {
  cx: number;
  cy: number;
  size: number;
}

/** Enquadra a pose com folga; `margem` extra para letras que se deslocam. */
export function frameFor(pts: Pt[], margem = 0): Frame {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    size: Math.max(0.17, Math.max(w, h) * 1.25) + margem,
  };
}

interface Props {
  pts: Pt[];
  frame?: Frame;
  /** true = vista de espelho (polegar à esquerda), como a pessoa vê a própria mão direita na câmera. */
  espelhar?: boolean;
  className?: string;
  title?: string;
}

export function HandFigure({ pts, frame, espelhar = true, className, title }: Props) {
  const f = frame ?? frameFor(pts);
  const sx = espelhar ? -1 : 1;
  const P = (p: Pt) => {
    const persp = 0.55 / (0.55 + p.z);
    return [sx * (p.x - f.cx) * persp, (p.y - f.cy) * persp] as const;
  };

  type Shape = { z: number; el: (k: number) => JSX.Element };
  const shapes: Shape[] = [];

  // O pulso tem largura: abre o ponto 0 nos dois lados ao longo do eixo
  // indicador↔mínimo, senão a palma termina em ponta.
  const across = { x: pts[5].x - pts[17].x, y: pts[5].y - pts[17].y, z: pts[5].z - pts[17].z };
  const pulso = (k: number) => P({ x: pts[0].x + across.x * k, y: pts[0].y + across.y * k, z: pts[0].z + across.z * k });
  const palmPts = [pulso(0.42), ...PALM.slice(1).map((i) => P(pts[i])), pulso(-0.38)];
  const palmZ = PALM.reduce((s, i) => s + pts[i].z, 0) / PALM.length;
  shapes.push({
    z: palmZ + 0.004,
    el: (k) => (
      <polygon
        key={k}
        points={palmPts.map(([x, y]) => `${x},${y}`).join(' ')}
        className="hf-palm"
        strokeLinejoin="round"
      />
    ),
  });

  for (const [a, b, w] of BONES) {
    const [x1, y1] = P(pts[a]);
    const [x2, y2] = P(pts[b]);
    const z = (pts[a].z + pts[b].z) / 2;
    const near = Math.max(0, Math.min(1, (0.04 - z) / 0.12));
    shapes.push({
      z,
      el: (k) => (
        <g key={k}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} className="hf-outline" strokeWidth={w + 0.005} />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="hf-skin"
            strokeWidth={w}
            style={{ filter: `brightness(${0.9 + near * 0.18})` }}
          />
        </g>
      ),
    });
  }

  shapes.sort((s1, s2) => s2.z - s1.z);
  const h = f.size / 2;

  return (
    <svg
      className={className}
      viewBox={`${-h} ${-h} ${f.size} ${f.size}`}
      role="img"
      aria-label={title}
      strokeLinecap="round"
    >
      {title && <title>{title}</title>}
      {shapes.map((s, i) => s.el(i))}
    </svg>
  );
}

/* ─── Letra animada em loop (cartões e detalhe do "Aprender") ─────────── */

export function AnimatedLetter({
  letra,
  className,
  espelhar,
  playing = true,
}: {
  letra: string;
  className?: string;
  espelhar?: boolean;
  playing?: boolean;
}) {
  const spec = POR_LETRA[letra] as LetterSpec | undefined;
  const [t, setT] = useState(0);
  const frame = useMemo(
    () => (spec ? frameFor(poseAt(spec, 0), spec.movimento === 'nenhum' ? 0 : 0.08) : undefined),
    [spec],
  );
  const raf = useRef(0);

  useEffect(() => {
    if (!spec || spec.movimento === 'nenhum' || !playing) {
      setT(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      // 1,4 s de movimento + 0,6 s parado no fim.
      const c = ((now - start) % 2000) / 1400;
      setT(Math.min(1, c));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [spec, playing]);

  if (!spec) return null;
  return (
    <HandFigure
      pts={poseAt(spec, t)}
      frame={frame}
      espelhar={espelhar}
      className={className}
      title={`Letra ${letra} em Libras`}
    />
  );
}
