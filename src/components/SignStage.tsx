import { CENA_H, CENA_W, PX_POR_M, type Quadro } from '../libras/cena';
import { HandFigure } from './HandFigure';

/* ─── Busto + mãos ───────────────────────────────────────────────────────
 * O corpo é neutro e simétrico (fica igual espelhado); as mãos são
 * desenhadas por cima com o mesmo HandFigure do alfabeto.
 */

const TAM = 0.3; // lado do quadro de cada mão, em metros
const S = TAM * PX_POR_M;

export function SignStage({ quadro, canhoto, className }: { quadro: Quadro; canhoto: boolean; className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${CENA_W} ${CENA_H}`} role="img" aria-label="Pessoa sinalizando">
      <g transform={canhoto ? `translate(${CENA_W},0) scale(-1,1)` : undefined}>
        {/* tronco e ombros */}
        <path
          className="body"
          d="M60 440 C60 330 90 238 160 222 L178 210 L178 186 L222 186 L222 210 L240 222 C310 238 340 330 340 440 Z"
        />
        {/* cabeça */}
        <ellipse className="body" cx="200" cy="116" rx="50" ry="62" />
        <ellipse className="body-detail" cx="182" cy="104" rx="5" ry="3.5" />
        <ellipse className="body-detail" cx="218" cy="104" rx="5" ry="3.5" />
        <path className="body-line" d="M186 140 Q200 148 214 140" />
        <path className="body-line" d="M200 110 L196 126 L203 127" />

        {quadro.toque && quadro.toque.k > 0 && (
          <circle
            className="toque"
            cx={quadro.toque.x}
            cy={quadro.toque.y}
            r={10 + 16 * quadro.toque.k}
            opacity={1 - quadro.toque.k * 0.7}
          />
        )}

        {/* não-dominante primeiro: fica atrás (mão de apoio) */}
        {[...quadro.maos].sort((a, b) => Number(a.espelhar) - Number(b.espelhar)).map((m, i) => (
          <g key={i} opacity={m.opacidade}>
            <HandFigure
              pts={m.pts}
              frame={{ cx: m.ancora.x, cy: m.ancora.y, size: TAM }}
              espelhar={m.espelhar}
              x={m.x - S / 2}
              y={m.y - S / 2}
              width={S}
              height={S}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
