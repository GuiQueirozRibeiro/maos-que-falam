/* ─── Soletrador: fluxo contínuo de detecções → texto ───────────────────
 * A câmera produz ~30 palpites por segundo; a pessoa produz ~1 letra por
 * segundo. O soletrador transforma um no outro:
 *   - uma letra só é CONFIRMADA depois de segurada por HOLD_MS;
 *   - tirar a mão do quadro por GAP_MS = fim da palavra (espaço);
 *   - letras com movimento chegam prontas do MotionTracker e são
 *     confirmadas na hora.
 */

export const HOLD_MS = 700;
export const MIN_CONFIDENCE = 0.72;
export const GAP_MS = 1300;

export interface ConfirmContext {
  candidato: string;
  /** Há quanto tempo o mesmo candidato está sendo visto. */
  heldMs: number;
  confianca: number;
  /** Última letra confirmada (null no começo de uma palavra). */
  ultimaConfirmada: string | null;
  /** Desde a última confirmação, a mão mudou de forma ou saiu do quadro? */
  soltouDesdeUltima: boolean;
  /** A mão acabou de deslizar para o lado mantendo a forma. */
  deslizouLateral: boolean;
}

/**
 * Decide se o candidato atual vira letra.
 *
 * LETRAS DOBRADAS ("CARRO", "OSSO", "ANNA"): em Libras a letra repetida é
 * feita com um pequeno deslize lateral da mão, sem desfazer a forma. Então:
 *  - letra nova (ou mão que soltou e voltou) → confirma após HOLD_MS;
 *  - mesma letra com a mão parada → nunca repete (segurar não duplica);
 *  - mesma letra + deslize lateral → repete na hora (o deslize já é a
 *    intenção explícita, não precisa esperar HOLD_MS de novo).
 */
export function deveConfirmar(ctx: ConfirmContext): boolean {
  if (ctx.confianca < MIN_CONFIDENCE) return false;
  const repetida = ctx.candidato === ctx.ultimaConfirmada && !ctx.soltouDesdeUltima;
  if (repetida) return ctx.deslizouLateral;
  return ctx.heldMs >= HOLD_MS;
}

export type SpellerEvent = { tipo: 'letra'; letra: string } | { tipo: 'palavra'; palavra: string };

export class Speller {
  texto = '';
  /** 0..1 — progresso do "segurar" para a UI desenhar o anel. */
  progresso = 0;
  candidato: string | null = null;

  private desde = 0;
  private ultimaConfirmada: string | null = null;
  private soltou = true;
  private ausenteDesde: number | null = null;
  private confirmadoNesteHold = false;

  /** Uma chamada por quadro. `id` = forma estática (ou null se ausente/baixa confiança). */
  update(
    det: { id: string; score: number } | null,
    letraMovimento: string | null,
    now: number,
    deslize = false,
  ): SpellerEvent[] {
    const ev: SpellerEvent[] = [];

    if (letraMovimento) {
      ev.push(...this.confirmar(letraMovimento));
      this.candidato = null;
      this.progresso = 0;
      return ev;
    }

    if (!det) {
      this.ausenteDesde ??= now;
      this.candidato = null;
      this.progresso = 0;
      this.soltou = true;
      if (now - this.ausenteDesde > GAP_MS) ev.push(...this.fecharPalavra());
      return ev;
    }
    this.ausenteDesde = null;

    if (det.id !== this.candidato) {
      if (this.candidato !== null) this.soltou = true;
      this.candidato = det.id;
      this.desde = now;
      this.confirmadoNesteHold = false;
    }

    // Formas-base (HK, XZ) não viram letra sozinhas: esperam o movimento.
    const soletravel = det.id.length === 1;
    const heldMs = now - this.desde;
    this.progresso = soletravel && !this.confirmadoNesteHold ? Math.min(1, heldMs / HOLD_MS) : 0;

    // Depois de confirmada, a letra só volta a ser avaliada se houver
    // deslize (pedido de letra dobrada).
    if (
      soletravel &&
      (!this.confirmadoNesteHold || deslize) &&
      deveConfirmar({
        candidato: det.id,
        heldMs,
        confianca: det.score,
        ultimaConfirmada: this.ultimaConfirmada,
        soltouDesdeUltima: this.soltou,
        deslizouLateral: deslize,
      })
    ) {
      ev.push(...this.confirmar(det.id));
      this.confirmadoNesteHold = true;
    }
    return ev;
  }

  private confirmar(letra: string): SpellerEvent[] {
    this.texto += letra;
    this.ultimaConfirmada = letra;
    this.soltou = false;
    return [{ tipo: 'letra', letra }];
  }

  private fecharPalavra(): SpellerEvent[] {
    const palavra = this.texto.split(' ').pop() ?? '';
    this.ultimaConfirmada = null;
    if (!palavra) return [];
    this.texto += ' ';
    return [{ tipo: 'palavra', palavra }];
  }

  espaco() {
    return this.fecharPalavra();
  }

  apagar() {
    this.texto = this.texto.replace(/.$/u, '');
    this.ultimaConfirmada = null;
  }

  limpar() {
    this.texto = '';
    this.ultimaConfirmada = null;
  }
}
