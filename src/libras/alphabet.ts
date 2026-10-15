/* ─── Alfabeto manual de Libras (datilologia) ────────────────────────────
 * Fonte única de verdade. Cada letra é descrita por traços articulatórios
 * (estado de cada dedo, posição do polegar, direção, movimento). A MESMA
 * especificação alimenta:
 *   - o classificador da câmera (classifier.ts compara traços medidos);
 *   - o desenho da mão no tutorial (poses.ts gera os 21 pontos);
 *   - os testes (a pose sintética de cada letra precisa ser reconhecida
 *     como ela mesma).
 *
 * Descrições conferidas com materiais didáticos públicos (libras.com.br,
 * certificadocursosonline.com). Existem variações regionais — o
 * Dicionário de Libras do INES é a referência para dúvidas.
 */

export type FingerState = 'estendido' | 'curvado' | 'dobrado';

/**
 *  aberto  — polegar afastado da mão, apontando para o lado (L, Y)
 *  lado    — encostado na lateral de fora do indicador (A, G, F, Q)
 *  sobre   — atravessado na frente da palma / segurando os dedos (B, S, I…)
 *  toca    — a ponta encosta na ponta de outro dedo, formando um círculo (O, D)
 *  oposto  — curvado de frente para os dedos, sem encostar (C)
 *  entre   — ponta entre o indicador e o médio (H, K, P)
 *  dentro  — recolhido por dentro do indicador dobrado (T)
 */
export type ThumbPose = 'aberto' | 'lado' | 'sobre' | 'toca' | 'oposto' | 'entre' | 'dentro';

/** Para onde apontam os dedos principais (ou a mão, se estiver fechada). */
export type Direction = 'cima' | 'baixo' | 'frente' | 'lado';

export type Movement =
  | 'nenhum'
  | 'giro' //       gira o pulso (H)
  | 'curva-j' //    desenha um J com o mínimo (J)
  | 'subir' //      a mão sobe (K)
  | 'tremular' //   oscila para baixo (Ç)
  | 'desenhar-z' // desenha um Z no ar com o indicador (Z)
  | 'dobrar-indicador'; // o indicador dobra puxando para trás (X)

export interface HandShape {
  indicador: FingerState;
  medio: FingerState;
  anelar: FingerState;
  minimo: FingerState;
  polegar: ThumbPose;
  direcao: Direction;
  /** Indicador e médio afastados (V, W) em vez de juntos (U, N). */
  afastados?: boolean;
  /** Indicador e médio cruzados (R). */
  cruzados?: boolean;
  /** Com qual dedo o polegar faz o círculo quando polegar = 'toca'. */
  tocaEm?: 'indicador' | 'medio';
}

export interface LetterSpec {
  letra: string;
  forma: HandShape;
  movimento: Movement;
  /** Instrução em linguagem simples, mostrada no tutorial. */
  descricao: string;
  /** Erro comum / como diferenciar de letras parecidas. */
  dica?: string;
}

const fechada = { indicador: 'dobrado', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado' } as const;

export const ALFABETO: LetterSpec[] = [
  {
    letra: 'A',
    forma: { ...fechada, polegar: 'lado', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Mão fechada, palma para a frente, polegar esticado encostado na lateral do indicador.',
    dica: 'No S o polegar fica na frente dos dedos; no A ele fica do lado.',
  },
  {
    letra: 'B',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'estendido', minimo: 'estendido', polegar: 'sobre', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Quatro dedos esticados e juntos para cima, polegar dobrado sobre a palma.',
  },
  {
    letra: 'C',
    forma: { indicador: 'curvado', medio: 'curvado', anelar: 'curvado', minimo: 'curvado', polegar: 'oposto', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Dedos unidos e curvados com o polegar à frente, desenhando a letra C (vista de lado).',
    dica: 'Deixe um espaço entre o polegar e os dedos. Se encostar, vira O.',
  },
  {
    letra: 'D',
    forma: { indicador: 'estendido', medio: 'curvado', anelar: 'curvado', minimo: 'curvado', polegar: 'toca', tocaEm: 'medio', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Indicador esticado para cima; os outros dedos curvados encostam no polegar formando um círculo.',
  },
  {
    letra: 'E',
    forma: { indicador: 'curvado', medio: 'curvado', anelar: 'curvado', minimo: 'curvado', polegar: 'sobre', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Todos os dedos curvados como uma garra fechada, palma para a frente, polegar dobrado por baixo.',
    dica: 'No C o polegar fica afastado dos dedos; no E fica recolhido.',
  },
  {
    letra: 'F',
    forma: { indicador: 'dobrado', medio: 'estendido', anelar: 'estendido', minimo: 'estendido', polegar: 'lado', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Médio, anelar e mínimo para cima; indicador dobrado para a frente com o polegar encostado POR FORA dele.',
    dica: 'F e T são quase iguais: no F o polegar fica por fora do indicador, no T por dentro.',
  },
  {
    letra: 'G',
    forma: { indicador: 'estendido', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado', polegar: 'lado', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Indicador para cima, palma para a frente, polegar encostado na lateral do indicador; demais dedos fechados.',
    dica: 'No L o polegar se afasta, formando um ângulo; no G ele fica colado.',
  },
  {
    letra: 'H',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'entre', direcao: 'cima' },
    movimento: 'giro',
    descricao: 'Indicador e médio esticados, polegar entre eles, anelar e mínimo fechados. Gire o pulso até a palma ficar voltada para você.',
  },
  {
    letra: 'I',
    forma: { ...fechada, minimo: 'estendido', polegar: 'sobre', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Mão fechada, palma para a frente, só o dedo mínimo esticado para cima.',
  },
  {
    letra: 'J',
    forma: { ...fechada, minimo: 'estendido', polegar: 'sobre', direcao: 'cima' },
    movimento: 'curva-j',
    descricao: 'Comece no I e desenhe um J no ar com o mínimo, girando o pulso.',
  },
  {
    letra: 'K',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'entre', direcao: 'cima' },
    movimento: 'subir',
    descricao: 'Mesma forma do H (indicador e médio esticados, polegar entre eles); suba a mão.',
  },
  {
    letra: 'L',
    forma: { indicador: 'estendido', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado', polegar: 'aberto', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Indicador para cima e polegar afastado para o lado, formando um L; demais dedos fechados.',
  },
  {
    letra: 'M',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'estendido', minimo: 'dobrado', polegar: 'sobre', direcao: 'baixo' },
    movimento: 'nenhum',
    descricao: 'Indicador, médio e anelar esticados apontando PARA BAIXO; mínimo e polegar escondidos.',
  },
  {
    letra: 'N',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'sobre', direcao: 'baixo' },
    movimento: 'nenhum',
    descricao: 'Indicador e médio esticados e juntos apontando PARA BAIXO; os demais escondidos.',
  },
  {
    letra: 'O',
    forma: { indicador: 'curvado', medio: 'curvado', anelar: 'curvado', minimo: 'curvado', polegar: 'toca', tocaEm: 'indicador', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Todos os dedos curvados encostando no polegar, formando um círculo. Palma voltada para o lado.',
  },
  {
    letra: 'P',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'entre', direcao: 'frente' },
    movimento: 'nenhum',
    descricao: 'Forma do K, mas com o indicador e o médio apontando PARA A FRENTE (na direção de quem vê).',
  },
  {
    letra: 'Q',
    forma: { indicador: 'estendido', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado', polegar: 'lado', direcao: 'baixo' },
    movimento: 'nenhum',
    descricao: 'Forma do G virada PARA BAIXO: indicador apontando para o chão, polegar encostado nele.',
  },
  {
    letra: 'R',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'sobre', direcao: 'cima', cruzados: true },
    movimento: 'nenhum',
    descricao: 'Indicador e médio esticados e CRUZADOS (o indicador por cima); anelar, mínimo e polegar dobrados.',
  },
  {
    letra: 'S',
    forma: { ...fechada, polegar: 'sobre', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Mão fechada, palma para a frente, polegar atravessado na frente dos dedos.',
    dica: 'No A o polegar fica do lado; no S, na frente.',
  },
  {
    letra: 'T',
    forma: { indicador: 'dobrado', medio: 'estendido', anelar: 'estendido', minimo: 'estendido', polegar: 'dentro', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Médio, anelar e mínimo para cima; indicador dobrado com o polegar recolhido POR DENTRO dele.',
    dica: 'Compare com o F: lá o polegar fica por fora do indicador.',
  },
  {
    letra: 'U',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'sobre', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Indicador e médio esticados e JUNTOS para cima; demais dedos dobrados na frente da palma.',
  },
  {
    letra: 'V',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'dobrado', minimo: 'dobrado', polegar: 'sobre', direcao: 'cima', afastados: true },
    movimento: 'nenhum',
    descricao: 'Indicador e médio esticados e AFASTADOS para cima, como um V; demais dedos dobrados.',
  },
  {
    letra: 'W',
    forma: { indicador: 'estendido', medio: 'estendido', anelar: 'estendido', minimo: 'dobrado', polegar: 'sobre', direcao: 'cima', afastados: true },
    movimento: 'nenhum',
    descricao: 'Indicador, médio e anelar esticados e afastados para cima; polegar segura o mínimo.',
  },
  {
    letra: 'X',
    forma: { ...fechada, indicador: 'estendido', polegar: 'sobre', direcao: 'cima' },
    movimento: 'dobrar-indicador',
    descricao: 'Indicador esticado, demais fechados. Puxe a mão para trás enquanto dobra o indicador em gancho.',
  },
  {
    letra: 'Y',
    forma: { ...fechada, minimo: 'estendido', polegar: 'aberto', direcao: 'cima' },
    movimento: 'nenhum',
    descricao: 'Polegar e mínimo esticados para os lados ("hang loose"); demais dedos fechados.',
  },
  {
    letra: 'Z',
    forma: { ...fechada, indicador: 'estendido', polegar: 'sobre', direcao: 'cima' },
    movimento: 'desenhar-z',
    descricao: 'Com o indicador esticado, desenhe a letra Z no ar.',
  },
  {
    letra: 'Ç',
    forma: { indicador: 'curvado', medio: 'curvado', anelar: 'curvado', minimo: 'curvado', polegar: 'oposto', direcao: 'cima' },
    movimento: 'tremular',
    descricao: 'Faça o C e balance a mão levemente para baixo.',
  },
];

export const POR_LETRA: Record<string, LetterSpec> = Object.fromEntries(ALFABETO.map((l) => [l.letra, l]));

/**
 * Formas estáticas que o classificador reconhece. Letras com movimento
 * compartilham forma com outra (J=I, Ç=C, H/K, X/Z = "indicador"), então só
 * a forma-base entra aqui; motion.ts decide a letra final pela trajetória.
 */
export const FORMAS_ESTATICAS: { id: string; forma: HandShape }[] = [
  ...ALFABETO.filter((l) => l.movimento === 'nenhum').map((l) => ({ id: l.letra, forma: l.forma })),
  { id: 'HK', forma: POR_LETRA.H.forma },
  { id: 'XZ', forma: POR_LETRA.Z.forma },
];

/** Letras que exigem movimento, indexadas pela forma-base de onde partem. */
export const MOVIMENTOS_POR_BASE: Record<string, string[]> = {
  I: ['J'],
  C: ['Ç'],
  HK: ['H', 'K'],
  XZ: ['X', 'Z'],
};

/** Nome amigável da forma-base mostrado quando falta o movimento. */
export const ROTULO_BASE: Record<string, string> = {
  HK: 'H ou K — faça o movimento',
  XZ: 'X ou Z — faça o movimento',
};

/**
 * Converte texto em português para a sequência de letras soletráveis.
 * Acentos: na datilologia a letra é feita sem o acento (o acento é traçado
 * no ar em alguns contextos — aqui marcamos `acento` para o tutorial avisar).
 */
export function paraLetras(texto: string): { letra: string; original: string; acento: boolean }[] {
  const out: { letra: string; original: string; acento: boolean }[] = [];
  for (const ch of texto.toUpperCase()) {
    if (ch === 'Ç') {
      out.push({ letra: 'Ç', original: ch, acento: false });
      continue;
    }
    if (/\s/.test(ch)) {
      if (out.length && out[out.length - 1].letra !== ' ') out.push({ letra: ' ', original: ' ', acento: false });
      continue;
    }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (POR_LETRA[base]) out.push({ letra: base, original: ch, acento: base !== ch });
  }
  while (out.length && out[out.length - 1].letra === ' ') out.pop();
  return out;
}
