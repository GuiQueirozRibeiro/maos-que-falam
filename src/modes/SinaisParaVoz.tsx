import { useCallback, useRef, useState } from 'react';
import { CameraStage } from '../components/CameraStage';
import { AnimatedLetter } from '../components/HandFigure';
import { ALFABETO } from '../libras/alphabet';
import { loadCalibration } from '../libras/calibration';
import { Recognizer } from '../libras/recognizer';
import { GAP_MS, Speller } from '../libras/speller';
import { falar, nomeDaLetra, ttsDisponivel } from '../speech/tts';
import type { DetectedHand } from '../vision/handTracker';

interface Hud {
  rotulo: string;
  progresso: number;
  top3: { id: string; score: number }[];
  texto: string;
}

export function SinaisParaVoz() {
  const recognizer = useRef(new Recognizer(loadCalibration()));
  const speller = useRef(new Speller());
  const [hud, setHud] = useState<Hud>({ rotulo: '', progresso: 0, top3: [], texto: '' });
  const [falarLetras, setFalarLetras] = useState(false);
  const [falarPalavras, setFalarPalavras] = useState(true);
  const [mostrarAlfabeto, setMostrarAlfabeto] = useState(false);
  const opts = useRef({ falarLetras, falarPalavras });
  opts.current = { falarLetras, falarPalavras };
  const lastHudAt = useRef(0);

  const onHand = useCallback((hand: DetectedHand | null, now: number, aspect: number) => {
    const r = recognizer.current;
    r.setAspect(aspect);
    let det: { id: string; score: number } | null = null;
    let movimento: string | null = null;
    let deslize = false;
    let rotulo = '';
    let top3: Hud['top3'] = [];
    if (hand) {
      const rec = r.process(hand, now);
      det = rec.top;
      movimento = rec.movimento;
      deslize = rec.deslize;
      rotulo = rec.rotulo;
      top3 = rec.ranking.slice(0, 3);
    } else {
      r.reset();
    }

    const events = speller.current.update(det, movimento, now, deslize);
    for (const e of events) {
      if (e.tipo === 'letra' && opts.current.falarLetras) falar(nomeDaLetra(e.letra));
      if (e.tipo === 'palavra' && opts.current.falarPalavras) falar(e.palavra.toLowerCase());
    }

    // Re-render da UI no máximo ~15×/s (o loop roda a ~30–60 fps).
    if (events.length || now - lastHudAt.current > 66) {
      lastHudAt.current = now;
      setHud({ rotulo, progresso: speller.current.progresso, top3, texto: speller.current.texto });
    }
  }, []);

  const sync = () => setHud((h) => ({ ...h, texto: speller.current.texto }));
  const texto = hud.texto;

  return (
    <section className="mode">
      <div className="mode-grid">
        <div>
          <CameraStage onHand={onHand} accent={hud.progresso >= 1 ? '#5ee6a8' : '#ffd166'}>
            <div className="hud">
              <div className="hud-letter" style={{ ['--p' as string]: hud.progresso }}>
                <span>{hud.rotulo.length <= 2 ? hud.rotulo || '·' : '…'}</span>
              </div>
              {hud.rotulo.length > 2 && <div className="hud-hint">{hud.rotulo}</div>}
            </div>
            {hud.top3.length > 0 && (
              <div className="hud-top3" aria-hidden>
                {hud.top3.map((c) => (
                  <span key={c.id}>
                    {c.id} <small>{Math.round(c.score * 100)}%</small>
                  </span>
                ))}
              </div>
            )}
          </CameraStage>
          <p className="muted small">
            Segure cada letra até o anel fechar. Tire a mão da câmera por {(GAP_MS / 1000).toLocaleString('pt-BR')} s para terminar a palavra.
            Para letra dobrada (como o RR de "CARRO"), mantenha a forma e deslize a mão um pouco para o lado.
          </p>
        </div>

        <aside className="panel">
          <h2>O que você soletrou</h2>
          <output className="transcript" aria-live="polite">
            {texto || <span className="placeholder">As letras aparecem aqui…</span>}
            <span className="caret" />
          </output>
          <div className="row wrap">
            <button className="btn btn-primary" disabled={!texto.trim()} onClick={() => falar(texto.toLowerCase())}>
              🔊 Falar tudo
            </button>
            <button className="btn" onClick={() => { speller.current.espaco(); sync(); }}>
              Espaço
            </button>
            <button className="btn" onClick={() => { speller.current.apagar(); sync(); }}>
              ⌫ Apagar
            </button>
            <button className="btn btn-ghost" onClick={() => { speller.current.limpar(); sync(); }}>
              Limpar
            </button>
          </div>
          {!ttsDisponivel() && <p className="error">Este navegador não tem síntese de voz.</p>}
          <fieldset className="toggles">
            <label>
              <input type="checkbox" checked={falarPalavras} onChange={(e) => setFalarPalavras(e.target.checked)} />
              Falar cada palavra ao terminar
            </label>
            <label>
              <input type="checkbox" checked={falarLetras} onChange={(e) => setFalarLetras(e.target.checked)} />
              Falar o nome de cada letra
            </label>
          </fieldset>
          <button className="btn btn-ghost" onClick={() => setMostrarAlfabeto((v) => !v)}>
            {mostrarAlfabeto ? 'Esconder' : 'Mostrar'} alfabeto de consulta
          </button>
          {mostrarAlfabeto && (
            <div className="mini-alfabeto">
              {ALFABETO.map((l) => (
                <figure key={l.letra}>
                  <AnimatedLetter letra={l.letra} className="mini-hand" />
                  <figcaption>{l.letra}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
