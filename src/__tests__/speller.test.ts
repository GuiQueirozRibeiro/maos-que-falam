import { describe, expect, it } from 'vitest';
import { GAP_MS, HOLD_MS, Speller } from '../libras/speller';

/** Alimenta o soletrador com a mesma detecção por `ms`, a 30 fps. */
function segurar(sp: Speller, id: string | null, ms: number, t0: number, deslizeNoFim = false) {
  let t = t0;
  for (; t < t0 + ms; t += 33) sp.update(id ? { id, score: 0.9 } : null, null, t);
  if (deslizeNoFim && id) sp.update({ id, score: 0.9 }, null, t, true);
  return t;
}

describe('Speller', () => {
  it('confirma uma letra só depois de HOLD_MS e não duplica ao segurar', () => {
    const sp = new Speller();
    let t = segurar(sp, 'A', HOLD_MS - 100, 0);
    expect(sp.texto).toBe('');
    t = segurar(sp, 'A', 3000, t);
    expect(sp.texto).toBe('A');
  });

  it('letra dobrada: deslize lateral repete sem soltar a forma', () => {
    const sp = new Speller();
    let t = segurar(sp, 'R', HOLD_MS + 100, 0);
    t = segurar(sp, 'R', 200, t, true);
    expect(sp.texto).toBe('RR');
  });

  it('soltar e refazer a mesma forma também repete', () => {
    const sp = new Speller();
    let t = segurar(sp, 'S', HOLD_MS + 100, 0);
    t = segurar(sp, 'O', 100, t); // transição rápida, não confirma O
    t = segurar(sp, 'S', HOLD_MS + 100, t);
    expect(sp.texto).toBe('SS');
  });

  it('formas-base (HK, XZ) não viram letra sozinhas', () => {
    const sp = new Speller();
    segurar(sp, 'HK', 3000, 0);
    expect(sp.texto).toBe('');
  });

  it('mão fora do quadro por GAP_MS fecha a palavra uma vez só', () => {
    const sp = new Speller();
    let t = segurar(sp, 'O', HOLD_MS + 100, 0);
    const eventos: string[] = [];
    for (const end = t + GAP_MS * 3; t < end; t += 33) {
      for (const e of sp.update(null, null, t)) eventos.push(e.tipo);
    }
    expect(sp.texto).toBe('O ');
    expect(eventos).toEqual(['palavra']);
  });
});
