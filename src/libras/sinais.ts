import type { Direction } from './alphabet';
import type { Palma } from './poses';

/* ─── Dicionário de sinais ───────────────────────────────────────────────
 * Cada sinal segue os parâmetros da fonologia da Libras:
 *   CM (config), ponto de articulação (local), orientação da palma,
 *   movimento (trajeto/repete) e expressão não-manual.
 * Só entram sinais conferidos em fontes públicas (ver `fontes`). Na dúvida,
 * a palavra fica fora e é soletrada — melhor que ensinar um sinal errado.
 */

export type Local =
  | 'testa' | 'olhos' | 'nariz' | 'boca' | 'queixo' | 'bochecha' | 'orelha'
  | 'lado-cabeca' | 'pescoco' | 'peito' | 'ombro' | 'frente' | 'barriga'
  /** Diante do peito, no meio — onde as duas mãos se encontram (CASA, POR FAVOR). */
  | 'centro';

export interface Fonte {
  nome: string;
  url: string;
  /** Vídeo real do sinal (INES), mostrado no detalhe. */
  video?: string;
}

const INES_VIDEOS = 'https://dicionario.ines.gov.br/public/media/palavras/videos/';
const ines = (arquivo: string): Fonte => ({
  nome: 'Dicionário INES',
  url: 'https://dicionario.ines.gov.br/',
  video: INES_VIDEOS + arquivo,
});
const sb = (sinal: string): Fonte => ({ nome: `Signbank UFSC (${sinal})`, url: 'https://signbank.libras.ufsc.br/' });

export interface OutraMao {
  /** simetrica = espelha a mão dominante; apoio = fica parada servindo de base. */
  tipo: 'simetrica' | 'apoio';
  config: string;
  local: Local;
  palma: Palma;
  direcao?: Direction;
}

export interface Sinal {
  /** Formas em português que viram este sinal (podem ter várias palavras). */
  palavras: string[];
  glosa: string;
  config: string;
  local: Local;
  palma: Palma;
  direcao: Direction;
  /** Se a mão muda de forma durante o sinal (BOM: O → 5; AMOR: C → S). */
  configFinal?: string;
  /** Descrição curta do movimento. */
  movimento: string;
  /** Trajeto 2D em larguras de mão: +x = lado da mão dominante, +y = para baixo. */
  trajeto: [number, number][];
  repete: number;
  duasMaos: OutraMao | null;
  expressao: string | null;
  descricao: string;
  confianca: 'alta' | 'media';
  fontes: Fonte[];
  /** Pronome interrogativo (vai para o fim da pergunta). */
  interrogativo?: boolean;
  /** Sinal de duas mãos que se encontram no meio (palmas unidas, pontas se tocando). */
  juntas?: 'palmas' | 'pontas';
  /** Inclinação (rad) das mãos em direção ao meio do corpo — o "telhado" de CASA. */
  inclina?: number;
  /** Só vale em perguntas ("como?" = COMO; fora de pergunta, "como" = COMER). */
  soEmPergunta?: boolean;
}

/* Pesquisa (2026-10-15): vídeos do Dicionário INES e do Signbank UFSC,
 * conferidos quadro a quadro. 'alta' = INES e Signbank concordam (ou só o
 * INES); 'media' = existe variante ou a CM não cabe bem no desenho.
 * Ficaram de fora por divergência entre fontes: TUDO BEM, DIA, TARDE,
 * ONDE, QUAL, PRAZER. OI é feito soletrando O-I (ver traducao.ts). */
export const SINAIS: Sinal[] = [
  {
    palavras: ['meu', 'minha', 'meus', 'minhas'], glosa: 'MEU', config: 'B', local: 'peito', palma: 'tras', direcao: 'lado',
    movimento: 'a palma bate levemente no peito', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão aberta com os dedos juntos, palma tocando o próprio peito (pode dar dois toques leves).',
    confianca: 'alta', fontes: [ines('meu1Sm_Prog001.mp4'), sb('MEU')],
  },
  {
    palavras: ['eu', 'mim', 'me'], glosa: 'EU', config: '1', local: 'peito', palma: 'lado', direcao: 'tras',
    movimento: 'o indicador aponta e toca o centro do peito', trajeto: [], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Indicador estendido apontando para o próprio peito, tocando-o.',
    confianca: 'alta', fontes: [ines('euSm_Prog001.mp4'), ines('mimSm_Prog001.mp4')],
  },
  {
    palavras: ['você', 'vc', 'tu'], glosa: 'VOCÊ', config: '1', local: 'frente', palma: 'baixo', direcao: 'frente',
    movimento: 'o indicador aponta para a pessoa com quem se fala', trajeto: [[0, 0], [0, -0.3]], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Indicador estendido à frente do corpo, apontando para o interlocutor.',
    confianca: 'alta', fontes: [ines('voceSm_Prog001.mp4')],
  },
  {
    palavras: ['nome', 'nomes', 'chamar', 'chamo', 'chama'], glosa: 'NOME', config: 'U', local: 'ombro', palma: 'frente', direcao: 'cima',
    movimento: 'pequeno deslocamento lateral ao lado do ombro', trajeto: [[-0.5, 0], [0, 0]], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Indicador e médio estendidos e unidos (letra U), dedos para cima, na altura do ombro do lado da mão dominante, com um pequeno movimento para o lado.',
    confianca: 'alta', fontes: [ines('nomeSm_Prog001.mp4'), sb('NOME')],
  },
  {
    palavras: ['olá'], glosa: 'OLÁ', config: '5', local: 'lado-cabeca', palma: 'frente', direcao: 'cima',
    movimento: 'aceno de um lado para o outro', trajeto: [[-0.3, 0], [0.3, 0], [-0.3, 0], [0.3, 0]], repete: 2, duasMaos: null, expressao: 'sorriso',
    descricao: 'Mão aberta com os dedos separados, palma para a frente, erguida ao lado da cabeça, num aceno.',
    confianca: 'alta', fontes: [ines('olaSm_Prog001.mp4')],
  },
  {
    palavras: ['tchau', 'adeus'], glosa: 'TCHAU', config: '5', local: 'ombro', palma: 'frente', direcao: 'cima',
    movimento: 'aceno de um lado para o outro', trajeto: [[-0.3, 0], [0.3, 0], [-0.3, 0], [0.3, 0]], repete: 2, duasMaos: null, expressao: 'sorriso',
    descricao: 'Mão aberta com os dedos separados, palma para a frente, na altura do ombro, acenando.',
    confianca: 'alta', fontes: [ines('tchauSm_Prog001.mp4'), sb('TCHAU')],
  },
  {
    palavras: ['bom', 'boa', 'bem', 'bons', 'boas'], glosa: 'BOM', config: 'O', configFinal: '5', local: 'boca', palma: 'tras', direcao: 'cima',
    movimento: 'as pontas dos dedos unidas saem da boca e a mão se abre para a frente', trajeto: [[0, 0], [0.3, 1]], repete: 1, duasMaos: null, expressao: 'sorriso',
    descricao: 'Pontas dos dedos unidas (letra O) diante da boca; a mão se afasta para a frente e se abre em 5. O mesmo sinal serve para BEM.',
    confianca: 'alta', fontes: [ines('bom1Sm_Prog001.mp4'), ines('bem2Sm_Prog001.mp4'), sb('BOM')],
  },
  {
    palavras: ['obrigado', 'obrigada', 'agradecer', 'agradeço'], glosa: 'OBRIGADO', config: 'B', local: 'testa', palma: 'lado', direcao: 'cima',
    movimento: 'as pontas dos dedos tocam a testa e a mão se afasta para a frente em arco', trajeto: [[0, 0], [0.5, 0.8]], repete: 1, duasMaos: null, expressao: 'sorriso',
    descricao: 'Mão aberta com os dedos juntos; as pontas dos dedos tocam a testa e a mão se afasta para a frente. Variante (Signbank): a outra mão faz o mesmo saindo do peito.',
    confianca: 'alta', fontes: [ines('obrigado1Sm_Prog001.mp4'), sb('AGRADECER')],
  },
  {
    palavras: ['por favor'], glosa: 'POR-FAVOR', config: 'B', local: 'centro', palma: 'lado', direcao: 'cima', juntas: 'palmas',
    movimento: 'palmas unidas, como quem reza, com leve balanço', trajeto: [], repete: 2,
    duasMaos: { tipo: 'simetrica', config: 'B', local: 'centro', palma: 'lado' }, expressao: 'súplica',
    descricao: 'As duas mãos abertas, palmas unidas como quem reza, diante do peito. O INES mostra uma variante com as mãos abertas apoiadas no peito.',
    confianca: 'media', fontes: [sb('POR-FAVOR'), ines('por_favorSm_Prog001.mp4')],
  },
  {
    palavras: ['desculpa', 'desculpe', 'desculpar', 'perdão', 'foi mal'], glosa: 'DESCULPAR', config: 'Y', local: 'queixo', palma: 'lado', direcao: 'cima',
    movimento: 'a ponta do polegar encosta no queixo', trajeto: [], repete: 1, duasMaos: null, expressao: 'expressão de lamento',
    descricao: 'Mão em Y (polegar e mínimo estendidos), ponta do polegar tocando o queixo.',
    confianca: 'alta', fontes: [ines('desculparSm_Prog001.mp4'), sb('DESCULPAR')],
  },
  {
    palavras: ['sim'], glosa: 'SIM', config: 'S', local: 'ombro', palma: 'frente', direcao: 'cima',
    movimento: 'o punho balança para cima e para baixo, como uma cabeça dizendo sim', trajeto: [[0, 0], [0, 0.3], [0, 0], [0, 0.3]], repete: 2, duasMaos: null, expressao: 'acenar com a cabeça',
    descricao: 'Mão fechada (S) na altura do ombro, dobrando o punho para baixo e para cima, como uma cabeça que diz sim.',
    confianca: 'alta', fontes: [ines('simSm_Prog001.mp4'), sb('SIM')],
  },
  {
    palavras: ['não'], glosa: 'NÃO', config: '1', local: 'ombro', palma: 'frente', direcao: 'cima',
    movimento: 'o indicador balança de um lado para o outro', trajeto: [[-0.3, 0], [0.3, 0], [-0.3, 0], [0.3, 0]], repete: 2, duasMaos: null,
    expressao: 'balançar a cabeça negando, testa franzida',
    descricao: 'Indicador estendido para cima, palma para a frente, balançando de um lado para o outro. Variante: mão aberta em 5 balançando.',
    confianca: 'alta', fontes: [ines('nao1Sm_Prog001.mp4'), sb('NÃO')],
  },
  {
    palavras: ['amigo', 'amiga', 'amigos', 'amigas'], glosa: 'AMIGO', config: 'B', local: 'peito', palma: 'cima', direcao: 'lado',
    movimento: 'a lateral da mão (lado do mínimo) bate duas vezes no peito', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão aberta com os dedos juntos, quase na horizontal; a borda do lado do mínimo toca duas vezes o peito, do lado oposto ao da mão.',
    confianca: 'alta', fontes: [ines('amigoSm_Prog001.mp4'), sb('AMIGO')],
  },
  {
    palavras: ['família', 'famílias'], glosa: 'FAMÍLIA', config: 'F', local: 'centro', palma: 'frente', direcao: 'cima',
    movimento: 'as duas mãos em F se afastam e fazem um arco para a frente até se encontrarem', trajeto: [[0, 0], [0.8, -0.3], [0, 0]], repete: 1,
    duasMaos: { tipo: 'simetrica', config: 'F', local: 'centro', palma: 'frente' }, expressao: null,
    descricao: 'As duas mãos na letra F do alfabeto de Libras, lado a lado; afastam-se e fazem um arco para a frente até se juntarem.',
    confianca: 'media', fontes: [ines('familiaSm_Prog001.mp4'), sb('FAMÍLIA')],
  },
  {
    palavras: ['casa', 'casas', 'lar', 'morar', 'moro', 'mora'], glosa: 'CASA', config: 'B', local: 'centro', palma: 'lado', direcao: 'cima',
    juntas: 'pontas', inclina: 0.5,
    movimento: 'as pontas dos dedos das duas mãos se tocam formando um telhado', trajeto: [], repete: 2,
    duasMaos: { tipo: 'simetrica', config: 'B', local: 'centro', palma: 'lado' }, expressao: null,
    descricao: 'As duas mãos abertas, dedos juntos e inclinados, pontas dos dedos se tocando diante do peito como um telhado. O mesmo sinal significa MORAR.',
    confianca: 'alta', fontes: [ines('casaSm_Prog001.mp4'), ines('morarSm_Prog001.mp4'), sb('CASA')],
  },
  {
    palavras: ['amor', 'amar', 'amo', 'ama'], glosa: 'AMOR', config: 'C', configFinal: 'S', local: 'peito', palma: 'tras', direcao: 'cima',
    movimento: 'a mão em C sobre o coração se fecha em S', trajeto: [], repete: 1, duasMaos: null, expressao: 'expressão terna, cabeça levemente inclinada',
    descricao: 'Mão em C sobre o lado esquerdo do peito (coração) que se fecha em punho (S), como quem segura o coração.',
    confianca: 'alta', fontes: [ines('amor1Sm_Prog001.mp4'), sb('AMOR')],
  },
  {
    palavras: ['gostar', 'gosto', 'gosta'], glosa: 'GOSTAR', config: '5', local: 'peito', palma: 'tras', direcao: 'lado',
    movimento: 'a palma apoiada no peito', trajeto: [], repete: 1, duasMaos: null, expressao: 'sorriso',
    descricao: 'Mão aberta com a palma apoiada no peito, dedos apontando para o lado oposto.',
    confianca: 'alta', fontes: [ines('gostarSm_Prog001.mp4'), sb('GOSTAR')],
  },
  {
    palavras: ['querer', 'quero', 'quer'], glosa: 'QUERER', config: '5', configFinal: 'E', local: 'frente', palma: 'cima', direcao: 'frente',
    movimento: 'os dedos curvados se fecham puxando para o corpo, repetidamente', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão aberta com os dedos curvados (em garra), palma para cima, à frente do corpo; os dedos se fecham repetidamente, como quem puxa algo para si.',
    confianca: 'alta', fontes: [ines('quererSm_Prog001.mp4'), sb('QUERER')],
  },
  {
    palavras: ['comer', 'como', 'come', 'comida'], glosa: 'COMER', config: 'B', local: 'boca', palma: 'tras', direcao: 'cima',
    movimento: 'os dedos se dobram em direção à boca repetidamente', trajeto: [], repete: 3, duasMaos: null, expressao: null,
    descricao: 'Mão aberta com os dedos juntos diante da boca; os dedos se dobram repetidamente em direção à boca.',
    confianca: 'alta', fontes: [ines('comerSm_Prog001.mp4'), sb('COMER')],
  },
  {
    palavras: ['água'], glosa: 'ÁGUA', config: 'L', local: 'queixo', palma: 'lado', direcao: 'cima',
    movimento: 'polegar apoiado no queixo enquanto o indicador se dobra para baixo e volta', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão em L com a ponta do polegar encostada no queixo; o indicador se dobra para baixo e volta, repetidamente.',
    confianca: 'alta', fontes: [ines('aguaSm_Prog001.mp4'), sb('ÁGUA')],
  },
  {
    palavras: ['aprender', 'aprendo', 'aprende'], glosa: 'APRENDER', config: '5', configFinal: 'S', local: 'testa', palma: 'frente', direcao: 'cima',
    movimento: 'diante da testa, a mão abre (5) e fecha (S) repetidamente', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão junto à testa, abrindo e fechando repetidamente: de aberta (5) para punho (S).',
    confianca: 'alta', fontes: [ines('aprenderSm_Prog001.mp4'), sb('APRENDER')],
  },
  {
    palavras: ['entender', 'entendo', 'entende', 'compreender'], glosa: 'ENTENDER', config: 'B', local: 'lado-cabeca', palma: 'baixo', direcao: 'lado',
    movimento: 'as pontas dos dedos tocam a lateral da testa (têmpora)', trajeto: [], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Mão aberta com os dedos juntos; as pontas dos dedos tocam a lateral da testa, perto da têmpora.',
    confianca: 'alta', fontes: [ines('entenderSm_Prog001.mp4'), sb('ENTENDER')],
  },
  {
    palavras: ['ajudar', 'ajuda', 'ajudo'], glosa: 'AJUDAR', config: 'B', local: 'frente', palma: 'lado', direcao: 'cima',
    movimento: 'a mão em pé se apoia na mão de baixo e as duas avançam juntas', trajeto: [[0, 0], [0, -0.5]], repete: 1,
    duasMaos: { tipo: 'apoio', config: 'B', local: 'frente', palma: 'baixo', direcao: 'lado' }, expressao: null,
    descricao: 'A mão dominante aberta fica em pé (palma para o lado), com a base apoiada sobre a outra mão, aberta na horizontal. As duas avançam juntas para a frente.',
    confianca: 'alta', fontes: [ines('ajudar2Sm_Prog001.mp4'), sb('AJUDAR')],
  },
  {
    palavras: ['surdo', 'surda', 'surdos', 'surdas'], glosa: 'SURDO', config: '1', local: 'orelha', palma: 'frente', direcao: 'cima',
    movimento: 'o indicador toca a orelha e depois a boca/queixo', trajeto: [[0, 0], [-0.7, 1]], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Indicador estendido toca a orelha e em seguida desce para tocar a boca/queixo.',
    confianca: 'alta', fontes: [ines('surdoSm_Prog001.mp4'), sb('SURDO')],
  },
  {
    palavras: ['ouvinte', 'ouvintes'], glosa: 'OUVINTE', config: 'C', configFinal: 'S', local: 'orelha', palma: 'frente', direcao: 'cima',
    movimento: 'a mão em garra junto à orelha se fecha em S', trajeto: [], repete: 2, duasMaos: null, expressao: null,
    descricao: 'Mão com os dedos curvados (em garra) junto à orelha, que se fecha em punho (S).',
    confianca: 'media', fontes: [ines('ouvinteSm_Prog001.mp4'), sb('OUVINTE')],
  },
  {
    palavras: ['libras', 'língua de sinais'], glosa: 'LIBRAS', config: '5', local: 'frente', palma: 'frente', direcao: 'cima',
    movimento: 'as duas mãos abertas giram alternadamente diante do peito', trajeto: [[0, 0], [0.3, -0.3], [0, -0.6], [-0.3, -0.3], [0, 0]], repete: 2,
    duasMaos: { tipo: 'simetrica', config: '5', local: 'frente', palma: 'frente' }, expressao: null,
    descricao: 'As duas mãos abertas fazem movimentos circulares alternados diante do peito.',
    confianca: 'alta', fontes: [ines('lingua-de-sinaisSm_Prog001.mp4'), sb('LIBRAS')],
  },
  {
    palavras: ['trabalhar', 'trabalho', 'trabalha'], glosa: 'TRABALHAR', config: 'L', local: 'frente', palma: 'baixo', direcao: 'frente',
    movimento: 'as duas mãos em L vão para a frente e para trás, alternadas', trajeto: [[0, 0], [0, -0.4], [0, 0]], repete: 2,
    duasMaos: { tipo: 'simetrica', config: 'L', local: 'frente', palma: 'baixo' }, expressao: null,
    descricao: 'As duas mãos em L, palmas para baixo e indicadores apontando para a frente; movem-se alternadamente para a frente e para trás.',
    confianca: 'alta', fontes: [ines('trabalharSm_Prog001.mp4'), sb('TRABALHAR')],
  },
  {
    palavras: ['estudar', 'estudo', 'estuda', 'aula'], glosa: 'ESTUDAR', config: 'B', local: 'frente', palma: 'cima', direcao: 'frente',
    movimento: 'a mão dominante bate repetidamente sobre a palma da outra', trajeto: [[0, 0], [0, 0.3], [0, 0]], repete: 3,
    duasMaos: { tipo: 'apoio', config: 'B', local: 'frente', palma: 'cima', direcao: 'frente' }, expressao: null,
    descricao: 'As duas mãos abertas com as palmas para cima; a mão dominante bate repetidamente sobre a palma da outra.',
    confianca: 'alta', fontes: [ines('estudarSm_Prog001.mp4'), sb('ESTUDAR')],
  },
  {
    palavras: ['escola', 'escolas'], glosa: 'ESCOLA', config: 'B', local: 'frente', palma: 'cima', direcao: 'frente',
    movimento: 'sinal composto: CASA (telhado) seguido de ESTUDAR', trajeto: [[0, 0], [0, 0.3], [0, 0]], repete: 2,
    duasMaos: { tipo: 'apoio', config: 'B', local: 'frente', palma: 'cima', direcao: 'frente' }, expressao: null,
    descricao: 'Sinal composto: CASA (mãos formando um telhado) seguido de ESTUDAR (mão batendo na palma da outra). O INES registra como CASA^ESTUDO. A animação mostra só a parte ESTUDAR.',
    confianca: 'media', fontes: [ines('escolaSm_Prog001.mp4'), sb('ESCOLA')],
  },
  {
    palavras: ['mãe', 'mamãe'], glosa: 'MÃE', config: 'A', configFinal: 'S', local: 'bochecha', palma: 'lado', direcao: 'cima',
    movimento: 'o polegar desliza na bochecha; depois a mão fechada vai à boca (pedir a bênção)', trajeto: [[0, 0], [-0.5, 0.6]], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Sinal composto: o polegar da mão em A desliza na bochecha (MULHER) e depois o dorso da mão fechada é levado à boca, como quem pede a bênção.',
    confianca: 'alta', fontes: [ines('mamae1Sm_Prog001.mp4'), sb('MÃE')],
  },
  {
    palavras: ['pai', 'papai'], glosa: 'PAI', config: 'B', configFinal: 'S', local: 'queixo', palma: 'tras', direcao: 'cima',
    movimento: 'a mão segura o queixo; depois a mão fechada vai à boca (pedir a bênção)', trajeto: [[0, 0], [0, 0.4]], repete: 1, duasMaos: null, expressao: null,
    descricao: 'Sinal composto: a mão segura o queixo (HOMEM) e depois o dorso da mão fechada é levado à boca, como quem pede a bênção. Também existe a forma soletrada P-A-I.',
    confianca: 'alta', fontes: [ines('pai2Sm_Prog001.mp4'), sb('PAI')],
  },
  {
    palavras: ['idade', 'anos de idade', 'quantos anos'], glosa: 'IDADE', config: 'Y', local: 'ombro', palma: 'tras', direcao: 'cima',
    movimento: 'mão em Y junto ao ombro, com pequeno balanço repetido', trajeto: [], repete: 2, duasMaos: null, expressao: 'sobrancelhas franzidas, se for pergunta',
    descricao: 'Mão em Y (polegar e mínimo estendidos) junto ao ombro do mesmo lado, balançando levemente.',
    confianca: 'alta', fontes: [ines('idade1Sm_Prog001.mp4'), sb('IDADE')],
  },
  {
    palavras: ['noite', 'noites'], glosa: 'NOITE', config: 'B', local: 'frente', palma: 'baixo', direcao: 'lado',
    movimento: 'a mão dominante passa por cima do dorso da outra e desce', trajeto: [[0, -0.3], [0, 0.3]], repete: 1,
    duasMaos: { tipo: 'apoio', config: 'S', local: 'frente', palma: 'baixo', direcao: 'lado' }, expressao: null,
    descricao: 'A mão de apoio fica na horizontal, palma para baixo. A mão dominante aberta passa por cima do dorso dela e desce, como o sol se pondo no horizonte.',
    confianca: 'alta', fontes: [ines('noite1Sm_Prog001.mp4'), sb('NOITE')],
  },
  {
    palavras: ['como'], glosa: 'COMO', config: 'O', local: 'centro', palma: 'tras', direcao: 'cima', interrogativo: true, soEmPergunta: true,
    movimento: 'as duas mãos com as pontas unidas giram alternadamente', trajeto: [[0, 0], [0.2, -0.2], [0, -0.4], [-0.2, -0.2], [0, 0]], repete: 2,
    duasMaos: { tipo: 'simetrica', config: 'O', local: 'centro', palma: 'tras' }, expressao: 'pergunta: sobrancelhas franzidas',
    descricao: 'As duas mãos com as pontas dos dedos unidas, voltadas para cima, fazem pequenos círculos alternados diante do peito. O INES também registra uma variante com uma mão só.',
    confianca: 'media', fontes: [sb('COMO'), ines('como2Sm_Prog001.mp4')],
  },
];
