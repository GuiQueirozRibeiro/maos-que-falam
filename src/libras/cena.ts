import { POR_LETRA } from './alphabet';
import { getConfig } from './configs';
import { lerp, type Pt } from './geom';
import { buildPose, poseAt } from './poses';
import type { Local, Sinal } from './sinais';
import type { Traducao } from './traducao';

/* ─── Cena do tutorial: passos → quadros ─────────────────────────────────
 * Coordenadas da cena em px (viewBox 400×440), vista de ESPELHO para
 * destros: a mão dominante aparece à direita da tela. Canhotos: o
 * componente espelha a cena inteira.
 */

export const CENA_W = 400;
export const CENA_H = 440;
/** Escala mundo → cena: a mão (~19 cm) fica proporcional à cabeça desenhada. */
export const PX_POR_M = 620;
/** "Uma largura de mão" em px — unidade dos trajetos do dicionário. */
export const MAO_PX = 0.085 * PX_POR_M;

const LOCAIS: Record<Local, [number, number]> = {
  testa: [200, 74],
  olhos: [200, 100],
  nariz: [200, 116],
  boca: [200, 136],
  queixo: [200, 158],
  bochecha: [234, 128],
  orelha: [254, 110],
  'lado-cabeca': [262, 84],
  pescoco: [200, 192],
  peito: [212, 266],
  ombro: [268, 222],
  frente: [238, 302],
  barriga: [208, 352],
  centro: [224, 292],
};
const NA_CABECA = new Set<Local>(['testa', 'olhos', 'nariz', 'boca', 'queixo', 'bochecha', 'orelha', 'lado-cabeca']);

/** Onde a datilologia acontece: ao lado do ombro, na altura do queixo/peito. */
const LOCAL_SOLETRAR: [number, number] = [282, 236];

export interface MaoCena {
  pts: Pt[];
  /** Ponto da mão (mundo) que fica exatamente em (x, y) na cena. */
  ancora: Pt;
  x: number;
  y: number;
  /** true = mão direita vista em espelho (dominante); false = mão esquerda. */
  espelhar: boolean;
  opacidade: number;
}

export interface Quadro {
  maos: MaoCena[];
  /** Onda de "toque" no corpo (0..1 = intensidade). */
  toque?: { x: number; y: number; k: number };
}

export type Passo =
  | { tipo: 'sinal'; item: number; sinal: Sinal }
  | { tipo: 'letra'; item: number; letra: string; original: string; acento: boolean; repetida: boolean }
  | { tipo: 'pausa'; item: number };

export function passosDe(t: Traducao): Passo[] {
  const passos: Passo[] = [];
  t.itens.forEach((it, item) => {
    if (it.tipo === 'sinal') passos.push({ tipo: 'sinal', item, sinal: it.sinal });
    if (it.tipo === 'soletrar') {
      it.letras.forEach((l, j) =>
        passos.push({
          tipo: 'letra',
          item,
          letra: l.letra,
          original: l.original,
          acento: l.acento,
          repetida: j > 0 && it.letras[j - 1].letra === l.letra,
        }),
      );
      passos.push({ tipo: 'pausa', item });
    }
  });
  if (passos.at(-1)?.tipo === 'pausa') passos.pop();
  return passos;
}

const CICLO_MS = 950;

/** Duração do "corpo" do passo (sem a transição de entrada), em ms a 1×. */
export function duracao(p: Passo): number {
  if (p.tipo === 'pausa') return 350;
  if (p.tipo === 'letra') return POR_LETRA[p.letra].movimento !== 'nenhum' ? 1400 : 750;
  return 300 + CICLO_MS * Math.max(1, p.sinal.repete);
}

const ease = (k: number) => k * k * (3 - 2 * k);

function pathPoint(points: [number, number][], t: number): [number, number] {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const n = points.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(x);
  const f = ease(x - i);
  return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
}

function centroPalma(pts: Pt[]): Pt {
  const ids = [0, 5, 9, 13, 17];
  const s = ids.reduce((a, i) => ({ x: a.x + pts[i].x, y: a.y + pts[i].y, z: a.z + pts[i].z }), { x: 0, y: 0, z: 0 });
  return { x: s.x / ids.length, y: s.y / ids.length, z: s.z / ids.length };
}

function ancoraDe(pts: Pt[], contato: 'palma' | 'indicador', local: Local | null): Pt {
  if (contato === 'indicador') return pts[8];
  // Na cabeça, o contato costuma ser com as pontas dos dedos.
  if (local && NA_CABECA.has(local)) return lerp(pts[8], pts[12], 0.5);
  return centroPalma(pts);
}

/** Quadro no instante k ∈ [0,1] do corpo do passo. `anterior` = último quadro (para pausas). */
export function quadro(p: Passo, k: number, anterior?: Quadro): Quadro {
  if (p.tipo === 'pausa') return anterior ?? { maos: [] };

  if (p.tipo === 'letra') {
    const spec = POR_LETRA[p.letra];
    const km = spec.movimento === 'nenhum' ? 0 : Math.min(1, k / 0.85);
    const pts = poseAt(spec, km);
    // Letra dobrada: a mão desliza para o lado mantendo a forma.
    const dx = p.repetida ? MAO_PX * 0.7 * ease(Math.min(1, k * 2.5)) : 0;
    const base = poseAt(spec, 0);
    return {
      maos: [
        {
          pts,
          ancora: centroPalma(base),
          x: LOCAL_SOLETRAR[0] + dx,
          y: LOCAL_SOLETRAR[1],
          espelhar: true,
          opacidade: 1,
        },
      ],
    };
  }

  const s = p.sinal;
  const reps = Math.max(1, s.repete);
  const kc = Math.min(reps - 1e-6, Math.max(0, (k * (300 + CICLO_MS * reps) - 150) / CICLO_MS));
  const c = kc - Math.floor(kc);

  const poseDe = (config: string, direcao = s.direcao, palma = s.palma) => {
    const cfg = getConfig(config);
    return { cfg, pts: buildPose({ ...cfg.forma, direcao }, { ...cfg.opts, palma }) };
  };
  const { cfg, pts: ptsIni } = poseDe(s.config);
  let pts = ptsIni;
  if (s.configFinal) {
    // Troca de forma: num sinal repetido abre-e-fecha a cada ciclo
    // (APRENDER: 5↔S); num sinal único vai do início ao fim (BOM: O→5).
    const fim = poseDe(s.configFinal).pts;
    const b = reps > 1 ? Math.sin(Math.PI * c) : ease(Math.min(1, k * 1.2));
    pts = ptsIni.map((q, i) => lerp(q, fim[i], b));
  }
  const ancora = ancoraDe(ptsIni, cfg.contato, s.local);
  let [lx, ly] = LOCAIS[s.local];
  const apoio = s.duasMaos?.tipo === 'apoio';
  // Com mão de apoio, a dominante trabalha logo acima dela, no meio.
  if (apoio) [lx, ly] = [212, LOCAIS[s.duasMaos!.local][1] - MAO_PX * 0.5];

  let [dx, dy] = s.trajeto.length >= 2 ? pathPoint(s.trajeto, c) : [0, 0];
  let toque: Quadro['toque'];
  if (s.trajeto.length < 2) {
    // Toque: a mão se aproxima, encosta (onda) e se afasta, a cada ciclo.
    const b = Math.sin(Math.PI * c);
    dy = -0.25 * (1 - b);
    toque = { x: lx, y: ly, k: b > 0.85 ? (b - 0.85) / 0.15 : 0 };
  }
  dx *= MAO_PX;
  dy *= MAO_PX;

  const maos: MaoCena[] = [{ pts, ancora, x: lx + dx, y: ly + dy, espelhar: true, opacidade: 1 }];

  if (s.duasMaos) {
    const o = s.duasMaos;
    const { cfg: ocfg, pts: opts } = poseDe(o.config, o.direcao ?? s.direcao, o.palma);
    const [ox, oy] = LOCAIS[o.local];
    if (apoio) {
      maos.push({ pts: opts, ancora: centroPalma(opts), x: 190, y: oy + MAO_PX * 0.15, espelhar: false, opacidade: 1 });
    } else {
      // Simétrica: lado oposto do corpo, movimento espelhado.
      const optsAnim = s.configFinal ? pts : opts;
      maos.push({
        pts: optsAnim,
        ancora: ancoraDe(opts, ocfg.contato, o.local),
        x: CENA_W - ox - dx,
        y: oy + dy,
        espelhar: false,
        opacidade: 1,
      });
    }
  }
  return { maos, toque };
}

/** Interpola dois quadros (transição entre passos). Mãos a mais aparecem/somem com opacidade. */
export function misturar(a: Quadro, b: Quadro, k: number): Quadro {
  const t = ease(k);
  const n = Math.max(a.maos.length, b.maos.length);
  const maos: MaoCena[] = [];
  for (let i = 0; i < n; i++) {
    const ma = a.maos[i];
    const mb = b.maos[i];
    if (ma && mb && ma.espelhar === mb.espelhar) {
      maos.push({
        pts: ma.pts.map((p, j) => lerp(p, mb.pts[j], t)),
        ancora: lerp(ma.ancora, mb.ancora, t),
        x: ma.x + (mb.x - ma.x) * t,
        y: ma.y + (mb.y - ma.y) * t,
        espelhar: mb.espelhar,
        opacidade: 1,
      });
    } else {
      if (ma) maos.push({ ...ma, opacidade: 1 - t });
      if (mb) maos.push({ ...mb, opacidade: t });
    }
  }
  return { maos };
}

export const cenaInicial = (): Quadro => ({
  maos: [
    (() => {
      const pts = buildPose({ ...getConfig('B').forma, direcao: 'cima' });
      return { pts, ancora: centroPalma(pts), x: 270, y: 330, espelhar: true, opacidade: 1 };
    })(),
  ],
});
