import { POR_LETRA, type HandShape } from './alphabet';
import type { PoseOptions } from './poses';

/* ─── Configurações de mão (CM) usadas nos sinais ────────────────────────
 * Grande parte das CMs da Libras coincide com letras do alfabeto manual;
 * as que não coincidem ficam aqui com nome próprio.
 */

export interface Config {
  forma: HandShape;
  opts?: PoseOptions;
  /** Onde a mão "encosta" no corpo: na palma ou na ponta do indicador. */
  contato: 'palma' | 'indicador';
}

const ABERTA = { indicador: 'estendido', medio: 'estendido', anelar: 'estendido', minimo: 'estendido' } as const;
const SO_INDICADOR = { indicador: 'estendido', medio: 'dobrado', anelar: 'dobrado', minimo: 'dobrado' } as const;

const EXTRAS: Record<string, Config> = {
  '5': { forma: { ...ABERTA, polegar: 'aberto', direcao: 'cima', afastados: true }, contato: 'palma' },
  B: { forma: { ...ABERTA, polegar: 'lado', direcao: 'cima' }, contato: 'palma' },
  '1': { forma: { ...SO_INDICADOR, polegar: 'sobre', direcao: 'cima' }, contato: 'indicador' },
  'X-gancho': {
    forma: { ...SO_INDICADOR, polegar: 'sobre', direcao: 'cima' },
    opts: { indexFlex: [0.3, 1.5, 1.0] },
    contato: 'indicador',
  },
};

const PONTA_INDICADOR = new Set(['D', 'G', 'L']);

export function getConfig(nome: string): Config {
  if (EXTRAS[nome]) return EXTRAS[nome];
  const letra = POR_LETRA[nome];
  if (!letra) throw new Error(`Configuração de mão desconhecida: ${nome}`);
  return { forma: letra.forma, contato: PONTA_INDICADOR.has(nome) ? 'indicador' : 'palma' };
}
