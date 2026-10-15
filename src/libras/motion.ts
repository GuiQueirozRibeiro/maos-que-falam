import type { Pt } from './geom';

/* ─── Letras com movimento ───────────────────────────────────────────────
 * J, Ç, H, K, X e Z compartilham a forma estática com outra configuração
 * (I, C, "HK", "XZ"). O classificador só vê a forma; aqui olhamos a
 * TRAJETÓRIA dos últimos ~1 s (coordenadas de imagem, corrigidas pelo
 * aspecto do vídeo e normalizadas pelo tamanho da palma na tela, para não
 * depender da distância da câmera).
 */

export interface MotionFrame {
  t: number;
  base: string | null;
  wrist: Pt;
  indexTip: Pt;
  pinkyTip: Pt;
  /** Largura da palma na imagem (MCP indicador ↔ MCP mínimo): encolhe quando o pulso gira. */
  palmWidth: number;
  /** Comprimento punho → MCP do médio na imagem: régua para os deslocamentos. */
  palmLen: number;
  /** Curvaturas medidas (indicador, médio, anelar, mínimo). */
  curl: number[];
}

const WINDOW_MS = 1100;

export class MotionTracker {
  private frames: MotionFrame[] = [];

  push(f: MotionFrame) {
    this.frames.push(f);
    const cutoff = f.t - WINDOW_MS;
    while (this.frames.length && this.frames[0].t < cutoff) this.frames.shift();
  }

  reset() {
    this.frames = [];
  }

  /**
   * Deslize lateral curto mantendo a forma `base` — é assim que se faz
   * letra dobrada em Libras ("CARRO": o R desliza para o lado). Olha só os
   * últimos ~450 ms: deslocamento horizontal ≥ 0,4 palma, quase sem
   * deslocamento vertical, e a forma não mudou no caminho.
   */
  deslizeLateral(base: string): boolean {
    const fim = this.frames[this.frames.length - 1];
    if (!fim) return false;
    const recentes = this.frames.filter((f) => f.t >= fim.t - 450);
    if (recentes.length < 5 || recentes.some((f) => f.base !== base)) return false;
    const ruler = median(recentes.map((f) => f.palmLen)) || 1;
    const dx = Math.abs(fim.wrist.x - recentes[0].wrist.x) / ruler;
    const dy = Math.abs(fim.wrist.y - recentes[0].wrist.y) / ruler;
    return dx >= 0.4 && dy < dx * 0.5;
  }

  /** Devolve a letra de movimento reconhecida (ou null). */
  detect(): string | null {
    const fr = this.frames;
    if (fr.length < 8) return null;
    const ruler = median(fr.map((f) => f.palmLen)) || 1;
    const first = fr[0];
    const last = fr[fr.length - 1];
    const share = (id: string) => fr.filter((f) => f.base === id).length / fr.length;

    // X: começa no "indicador esticado" e o indicador dobra (os outros seguem fechados).
    const comecoXZ = fr.slice(0, Math.ceil(fr.length / 3)).filter((f) => f.base === 'XZ').length >= 3;
    if (comecoXZ && first.curl[0] < 0.3 && last.curl[0] > 0.5 && last.curl.slice(1).every((c) => c > 0.6)) {
      return 'X';
    }

    // Z: indicador esticado percorrendo um zigue-zague (≥ 2 inversões horizontais).
    if (share('XZ') > 0.6) {
      const { length, reversalsX } = pathStats(fr.map((f) => f.indexTip));
      if (length / ruler > 2.4 && reversalsX >= 2) return 'Z';
    }

    // J: forma do I com o mínimo descrevendo uma curva.
    if (share('I') > 0.5) {
      const { length } = pathStats(fr.map((f) => f.pinkyTip));
      if (length / ruler > 1.1) return 'J';
    }

    // Ç: forma do C descendo/tremulando.
    if (share('C') > 0.6) {
      const dy = (last.wrist.y - first.wrist.y) / ruler;
      const { length } = pathStats(fr.map((f) => f.wrist));
      if (dy > 0.35 || length / ruler > 1.2) return 'Ç';
    }

    if (share('HK') > 0.6) {
      // K: a mão sobe.
      if ((first.wrist.y - last.wrist.y) / ruler > 0.45) return 'K';
      // H: o pulso gira, então a largura aparente da palma encolhe bastante.
      const widths = fr.map((f) => f.palmWidth);
      if (Math.min(...widths) / Math.max(...widths) < 0.55) return 'H';
    }
    return null;
  }
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function pathStats(pts: Pt[]) {
  let length = 0;
  let reversalsX = 0;
  let lastSign = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    length += Math.hypot(dx, pts[i].y - pts[i - 1].y);
    if (Math.abs(dx) > 0.004) {
      const s = Math.sign(dx);
      if (lastSign && s !== lastSign) reversalsX++;
      lastSign = s;
    }
  }
  return { length, reversalsX };
}
