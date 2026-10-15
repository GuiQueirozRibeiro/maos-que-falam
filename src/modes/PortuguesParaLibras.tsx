import { useEffect, useMemo, useRef, useState } from 'react';
import { frameFor, HandFigure, type Frame } from '../components/HandFigure';
import { VLibrasButton } from '../components/VLibrasButton';
import { paraLetras, POR_LETRA } from '../libras/alphabet';
import { lerp, type Pt } from '../libras/geom';
import { poseAt } from '../libras/poses';
import { falar } from '../speech/tts';

const EXEMPLOS = ['Meu nome é Ana', 'Olá, tudo bem?', 'Obrigado', 'Brasil', 'Coração', 'Libras'];

const TRANS_MS = 380;
const HOLD_MS = 800;
const MOVE_MS = 1400;
const SPACE_MS = 700;

type Item = ReturnType<typeof paraLetras>[number];

/** Linha do tempo: início e duração de cada item, já com a velocidade aplicada. */
function buildTimeline(items: Item[], speed: number) {
  let t = 0;
  return items.map((it) => {
    const spec = POR_LETRA[it.letra];
    const body = it.letra === ' ' ? SPACE_MS : spec.movimento !== 'nenhum' ? MOVE_MS : HOLD_MS;
    const seg = { start: t, trans: it.letra === ' ' ? 0 : TRANS_MS / speed, body: body / speed };
    t += seg.trans + seg.body;
    return seg;
  });
}

const ease = (k: number) => k * k * (3 - 2 * k);
const lerpFrame = (a: Frame, b: Frame, k: number): Frame => ({
  cx: a.cx + (b.cx - a.cx) * k,
  cy: a.cy + (b.cy - a.cy) * k,
  size: b.size,
});

export function PortuguesParaLibras({ espelhar }: { espelhar: boolean }) {
  const [texto, setTexto] = useState('Meu nome é Ana');
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const items = useMemo(() => paraLetras(texto), [texto]);
  const timeline = useMemo(() => buildTimeline(items, speed), [items, speed]);
  const total = timeline.length ? timeline[timeline.length - 1].start + timeline[timeline.length - 1].trans + timeline[timeline.length - 1].body : 0;
  const raf = useRef(0);

  useEffect(() => {
    setElapsed(0);
    setPlaying(false);
  }, [texto]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsed((e) => {
        const n = e + dt;
        if (n >= total) {
          setPlaying(false);
          return total;
        }
        return n;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);

  // Índice atual na linha do tempo.
  let idx = timeline.findIndex((s) => elapsed < s.start + s.trans + s.body);
  if (idx < 0) idx = Math.max(0, timeline.length - 1);
  const atual = items[idx];

  const { pts, frame } = useMemo(() => {
    if (!items.length) return { pts: null as Pt[] | null, frame: undefined };
    // Última letra "de verdade" até o índice i (espaços mantêm a mão parada).
    const letterAt = (i: number) => {
      for (let j = i; j >= 0; j--) if (items[j].letra !== ' ') return POR_LETRA[items[j].letra];
      return null;
    };
    const cur = letterAt(idx);
    if (!cur) return { pts: null, frame: undefined };
    const seg = timeline[idx];
    const local = elapsed - seg.start;
    const curFrame = { ...frameFor(poseAt(cur, 0)), size: 0.3 };
    if (items[idx].letra === ' ') return { pts: poseAt(cur, 1), frame: curFrame };

    if (local < seg.trans) {
      const prev = letterAt(idx - 1);
      if (prev) {
        const k = ease(local / seg.trans);
        const a = poseAt(prev, 1);
        const b = poseAt(cur, 0);
        return {
          pts: a.map((p, i) => lerp(p, b[i], k)),
          frame: lerpFrame(frameFor(poseAt(prev, 0)), curFrame, k),
        };
      }
      return { pts: poseAt(cur, 0), frame: curFrame };
    }
    const k = cur.movimento === 'nenhum' ? 0 : Math.min(1, (local - seg.trans) / (seg.body * 0.85));
    return { pts: poseAt(cur, k), frame: curFrame };
  }, [items, timeline, idx, elapsed]);

  const irPara = (i: number) => {
    setPlaying(false);
    setElapsed(timeline[i]?.start + (timeline[i]?.trans ?? 0) || 0);
  };

  const tocar = () => {
    if (elapsed >= total) setElapsed(0);
    setPlaying((p) => !p);
  };

  const spec = atual && atual.letra !== ' ' ? POR_LETRA[atual.letra] : null;
  const temAcento = items.some((i) => i.acento);

  return (
    <section className="mode">
      <div className="panel input-panel">
        <label htmlFor="frase">
          <h2>Escreva em português</h2>
        </label>
        <textarea
          id="frase"
          value={texto}
          maxLength={120}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite um nome, uma palavra ou uma frase curta"
          rows={2}
        />
        <div className="row wrap">
          {EXEMPLOS.map((ex) => (
            <button key={ex} className="chip" onClick={() => setTexto(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="mode-grid">
        <div className="panel tutorial">
          <div className="tutorial-stage">
            {pts ? (
              <HandFigure pts={pts} frame={frame} espelhar={espelhar} className="big-hand" title={spec ? `Letra ${spec.letra}` : 'Pausa'} />
            ) : (
              <p className="muted">Digite algo para ver o tutorial.</p>
            )}
            {atual && <div className="tutorial-letter">{atual.letra === ' ' ? '␣' : atual.original}</div>}
          </div>
          <div className="progress" aria-hidden>
            <div style={{ width: `${total ? (elapsed / total) * 100 : 0}%` }} />
          </div>
          <div className="row center wrap">
            <button className="btn" onClick={() => irPara(Math.max(0, idx - 1))} disabled={!items.length} aria-label="Letra anterior">
              ◀
            </button>
            <button className="btn btn-primary" onClick={tocar} disabled={!items.length}>
              {playing ? '❚❚ Pausar' : elapsed >= total && total > 0 ? '↺ Repetir' : '▶ Mostrar em sinais'}
            </button>
            <button className="btn" onClick={() => irPara(Math.min(items.length - 1, idx + 1))} disabled={!items.length} aria-label="Próxima letra">
              ▶
            </button>
            <label className="speed">
              Velocidade
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.5}>0,5×</option>
                <option value={0.75}>0,75×</option>
                <option value={1}>1×</option>
                <option value={1.5}>1,5×</option>
              </select>
            </label>
          </div>
        </div>

        <aside className="panel">
          <div className="letter-strip" role="list">
            {items.map((it, i) =>
              it.letra === ' ' ? (
                <span key={i} className="strip-space" />
              ) : (
                <button
                  key={i}
                  role="listitem"
                  className={`strip-letter ${i === idx ? 'active' : ''} ${i < idx ? 'done' : ''}`}
                  onClick={() => irPara(i)}
                >
                  {it.original}
                </button>
              ),
            )}
          </div>
          {spec ? (
            <div className="howto">
              <h3>
                Letra {spec.letra}
                {spec.movimento !== 'nenhum' && <span className="badge">com movimento</span>}
              </h3>
              <p>{spec.descricao}</p>
              {spec.dica && <p className="tip">💡 {spec.dica}</p>}
              {atual?.acento && (
                <p className="tip">
                  "{atual.original}" tem acento: faça a letra {spec.letra}. Em alguns contextos, o acento é desenhado no ar
                  logo depois.
                </p>
              )}
            </div>
          ) : (
            <p className="muted">Pausa entre palavras: abaixe a mão rapidamente ou faça uma pequena parada.</p>
          )}
          <div className="row wrap">
            <button className="btn btn-ghost" onClick={() => falar(texto)} disabled={!texto.trim()}>
              🔊 Ouvir em português
            </button>
          </div>
          <div className="note">
            <p className="phrase" lang="pt-BR">
              {texto}
            </p>
            <p className="small">
              <strong>Importante:</strong> isto é <em>datilologia</em>, a soletração letra a letra. Ela é usada para nomes, siglas e
              palavras sem sinal próprio. Frases em Libras têm gramática própria, com sinais, ordem e expressão facial.
              {temAcento && ' Acentos não têm forma própria no alfabeto manual.'}
            </p>
            <VLibrasButton />
          </div>
        </aside>
      </div>
    </section>
  );
}
