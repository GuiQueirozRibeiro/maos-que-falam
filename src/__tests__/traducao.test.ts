import { describe, expect, it } from 'vitest';
import { getConfig } from '../libras/configs';
import { passosDe, quadro } from '../libras/cena';
import { SINAIS } from '../libras/sinais';
import { traduzir } from '../libras/traducao';

const glosa = (t: string) => traduzir(t).glosa;

describe('traduzir (português → glosa)', () => {
  it('sinaliza MEU e NOME, omite "é" e soletra o nome próprio', () => {
    expect(glosa('Meu nome é Ana')).toBe('MEU NOME A-N-A');
  });

  it('omite artigos, verbo de ligação e preposições', () => {
    expect(glosa('Eu sou surdo')).toBe('EU SURDO');
    expect(glosa('Eu amo a minha família')).toBe('EU AMOR MEU FAMÍLIA');
    expect(glosa('Eu moro em Recife')).toBe('EU CASA R-E-C-I-F-E');
  });

  it('desfaz a ambiguidade de "como": pergunta → COMO (no fim), afirmação → COMER', () => {
    expect(glosa('Como você está?')).toBe('VOCÊ COMO?');
    expect(glosa('Eu como pão')).toBe('EU COMER P-A-O');
  });

  it('prefere a maior expressão do dicionário ("por favor", "língua de sinais")', () => {
    expect(glosa('Por favor')).toBe('POR-FAVOR');
    expect(glosa('Aprender língua de sinais')).toBe('APRENDER LIBRAS');
  });

  it('OI é soletrado (a soletração é o próprio sinal)', () => {
    const t = traduzir('Oi');
    expect(t.glosa).toBe('O-I');
    expect(t.notas.join(' ')).toMatch(/O-I/);
  });

  it('compõe "boa noite" com BOM + NOITE', () => {
    expect(glosa('Boa noite, obrigado!')).toBe('BOM NOITE OBRIGADO');
  });
});

describe('dicionário de sinais', () => {
  it('toda configuração de mão referenciada existe e gera quadros', () => {
    for (const s of SINAIS) {
      expect(() => getConfig(s.config), s.glosa).not.toThrow();
      if (s.configFinal) expect(() => getConfig(s.configFinal!), s.glosa).not.toThrow();
      if (s.duasMaos) expect(() => getConfig(s.duasMaos!.config), s.glosa).not.toThrow();
      for (const k of [0, 0.5, 1]) {
        const q = quadro({ tipo: 'sinal', item: 0, sinal: s }, k);
        for (const m of q.maos) {
          expect(m.pts).toHaveLength(21);
          expect(Number.isFinite(m.x) && Number.isFinite(m.y), s.glosa).toBe(true);
        }
      }
    }
  });

  it('toda palavra aponta para um único sinal fora de pergunta', () => {
    const vistos = new Map<string, string>();
    for (const s of SINAIS.filter((x) => !x.soEmPergunta)) {
      for (const p of s.palavras) {
        expect(vistos.get(p), `"${p}" em ${vistos.get(p)} e ${s.glosa}`).toBeUndefined();
        vistos.set(p, s.glosa);
      }
    }
  });

  it('letra dobrada vira passo "repetida" no tutorial', () => {
    const passos = passosDe(traduzir('Anna'));
    expect(passos.filter((p) => p.tipo === 'letra' && p.repetida)).toHaveLength(1);
  });
});
