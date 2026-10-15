import { describe, expect, it } from 'vitest';
import { FORMAS_ESTATICAS, paraLetras } from '../libras/alphabet';
import { classify } from '../libras/classifier';
import { rotZ, scale, add, v } from '../libras/geom';
import { buildPose } from '../libras/poses';

describe('classificador × poses sintéticas', () => {
  for (const { id, forma } of FORMAS_ESTATICAS) {
    it(`reconhece a forma ${id}`, () => {
      const { ranking } = classify(buildPose(forma));
      expect(ranking[0].id, JSON.stringify(ranking.slice(0, 3))).toBe(id);
      expect(ranking[0].score - ranking[1].score).toBeGreaterThan(0.05);
    });
  }

  it('é invariante a escala, translação e leve inclinação', () => {
    for (const { id, forma } of FORMAS_ESTATICAS) {
      const pts = buildPose(forma).map((p) => add(scale(rotZ(p, 0.2), 1.3), v(0.1, -0.05, 0.02)));
      expect(classify(pts).ranking[0].id).toBe(id);
    }
  });
});

describe('paraLetras', () => {
  it('remove acentos, mantém Ç e colapsa espaços', () => {
    expect(paraLetras('  Olá,  coração ').map((l) => l.letra).join('')).toBe('OLA CORAÇAO');
    expect(paraLetras('é').at(0)).toMatchObject({ letra: 'E', acento: true });
  });
});
