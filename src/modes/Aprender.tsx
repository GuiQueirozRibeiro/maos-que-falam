import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraStage } from '../components/CameraStage';
import { AnimatedLetter } from '../components/HandFigure';
import { ALFABETO, POR_LETRA } from '../libras/alphabet';
import { clearCalibration, loadCalibration, saveSamples } from '../libras/calibration';
import { featureVector } from '../libras/features';
import { Recognizer } from '../libras/recognizer';
import { falar, nomeDaLetra } from '../speech/tts';
import type { DetectedHand } from '../vision/handTracker';

/** Forma estática de onde cada letra parte (letras com movimento → base). */
const BASE: Record<string, string> = { J: 'I', 'Ç': 'C', H: 'HK', K: 'HK', X: 'XZ', Z: 'XZ' };
const baseDe = (l: string) => BASE[l] ?? l;

const ACERTO_SCORE = 0.72;
const ACERTO_HOLD_MS = 600;
const GRAVACAO_MS = 2000;

const sortear = (exceto?: string) => {
  const pool = ALFABETO.map((l) => l.letra).filter((l) => l !== exceto);
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Aprender({ espelhar }: { espelhar: boolean }) {
  const [alvo, setAlvo] = useState('A');
  const [desafio, setDesafio] = useState(false);
  const [pontos, setPontos] = useState(0);
  const [sequencia, setSequencia] = useState(0);
  const [match, setMatch] = useState(0);
  const [acertou, setAcertou] = useState(false);
  const [gravando, setGravando] = useState(0); // 0..1
  const [calib, setCalib] = useState(loadCalibration);

  const recognizer = useRef(new Recognizer(calib));
  recognizer.current.calib = calib;
  const alvoRef = useRef(alvo);
  alvoRef.current = alvo;
  const desafioRef = useRef(desafio);
  desafioRef.current = desafio;
  const acimaDesde = useRef<number | null>(null);
  const travado = useRef(false);
  const gravacao = useRef<{ ate: number; inicio: number; amostras: number[][] } | null>(null);
  const ultimoMatch = useRef(0);

  const proxima = useCallback(() => {
    setAcertou(false);
    travado.current = false;
    acimaDesde.current = null;
    setAlvo((a) => sortear(a));
  }, []);

  useEffect(() => {
    setAcertou(false);
    travado.current = false;
    acimaDesde.current = null;
    recognizer.current.reset();
  }, [alvo]);

  const onHand = useCallback(
    (hand: DetectedHand | null, now: number, aspect: number) => {
      const r = recognizer.current;
      r.setAspect(aspect);
      if (!hand) {
        r.reset();
        acimaDesde.current = null;
        setMatch(0);
        return;
      }
      const rec = r.process(hand, now);
      const letra = alvoRef.current;
      const base = baseDe(letra);
      const score = rec.ranking.find((s) => s.id === base)?.score ?? 0;
      // A forma certa precisa ser também a MAIS provável, não só "parecida".
      const ehTop = rec.ranking[0]?.id === base;
      // O loop roda a 30–60 fps; o medidor só precisa de ~15 atualizações/s.
      if (now - ultimoMatch.current > 66) {
        ultimoMatch.current = now;
        setMatch(ehTop ? score : score * 0.6);
      }

      // Gravação da calibração pessoal.
      const g = gravacao.current;
      if (g) {
        g.amostras.push(featureVector(rec.features));
        setGravando(Math.min(1, (now - g.inicio) / GRAVACAO_MS));
        if (now >= g.ate) {
          const amostras = g.amostras.filter((_, i) => i % 2 === 0);
          gravacao.current = null;
          setGravando(0);
          setCalib(saveSamples(base, amostras));
        }
        return;
      }

      if (travado.current) return;
      const temMovimento = POR_LETRA[letra].movimento !== 'nenhum';
      let ok = false;
      if (temMovimento) {
        ok = rec.movimento === letra;
      } else if (ehTop && score >= ACERTO_SCORE) {
        acimaDesde.current ??= now;
        ok = now - acimaDesde.current >= ACERTO_HOLD_MS;
      } else {
        acimaDesde.current = null;
      }

      if (ok) {
        travado.current = true;
        setAcertou(true);
        falar(nomeDaLetra(letra));
        if (desafioRef.current) {
          setPontos((p) => p + 1);
          setSequencia((s) => s + 1);
          setTimeout(proxima, 1100);
        }
      }
    },
    [proxima],
  );

  const grade = useMemo(
    () => (
      <div className="alfabeto-grid" role="list">
        {ALFABETO.map((l) => (
          <button
            key={l.letra}
            role="listitem"
            className={`letter-card ${l.letra === alvo ? 'active' : ''}`}
            onClick={() => {
              setDesafio(false);
              setAlvo(l.letra);
            }}
            aria-label={`Letra ${l.letra}`}
          >
            <AnimatedLetter letra={l.letra} className="card-hand" espelhar={espelhar} playing={l.letra === alvo} />
            <span>{l.letra}</span>
          </button>
        ))}
      </div>
    ),
    [alvo, espelhar],
  );

  const spec = POR_LETRA[alvo];
  const base = baseDe(alvo);
  const nCalib = calib[base]?.length ?? 0;

  return (
    <section className="mode">
      <div className="panel">
        <div className="row between wrap">
          <h2>Alfabeto manual</h2>
          <div className="row wrap">
            <button
              className={`btn ${desafio ? 'btn-primary' : ''}`}
              onClick={() => {
                setDesafio((d) => !d);
                setPontos(0);
                setSequencia(0);
                if (!desafio) proxima();
              }}
            >
              {desafio ? '■ Parar desafio' : '🎯 Modo desafio'}
            </button>
          </div>
        </div>
        {grade}
      </div>

      <div className="mode-grid">
        <div>
          <CameraStage onHand={onHand} accent={acertou ? '#5ee6a8' : '#ffd166'}>
            <div className="practice-hud">
              <div className={`practice-target ${acertou ? 'ok' : ''}`}>
                <AnimatedLetter letra={alvo} className="target-hand" espelhar={espelhar} />
                <strong>{alvo}</strong>
              </div>
              <div className="meter" aria-label={`Semelhança ${Math.round(match * 100)}%`}>
                <div style={{ width: `${Math.round(match * 100)}%` }} />
              </div>
              {acertou && <div className="practice-ok">✓ Muito bem!</div>}
              {gravando > 0 && <div className="practice-rec">Gravando sua versão… {Math.round(gravando * 100)}%</div>}
            </div>
          </CameraStage>
          {desafio && (
            <div className="row between score">
              <span>
                Pontos: <strong>{pontos}</strong> · Sequência: <strong>{sequencia}</strong>
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSequencia(0);
                  proxima();
                }}
              >
                Pular →
              </button>
            </div>
          )}
        </div>

        <aside className="panel">
          <h3>
            Como fazer o {spec.letra}
            {spec.movimento !== 'nenhum' && <span className="badge">com movimento</span>}
          </h3>
          <AnimatedLetter letra={alvo} className="detail-hand" espelhar={espelhar} />
          <p>{spec.descricao}</p>
          {spec.dica && <p className="tip">💡 {spec.dica}</p>}

          <details className="calib">
            <summary>A câmera não reconhece o seu jeito? Ensine a ela</summary>
            <p className="small">
              Faça a forma {spec.movimento !== 'nenhum' ? `inicial do ${alvo} (parada)` : `do ${alvo}`} e aperte
              gravar. Por 2 segundos, mexa a mão um pouco, para os lados e mais perto ou mais longe da câmera. Fica salvo só neste navegador.
            </p>
            <div className="row wrap">
              <button
                className="btn"
                disabled={gravando > 0}
                onClick={() => {
                  const now = performance.now();
                  gravacao.current = { inicio: now, ate: now + GRAVACAO_MS, amostras: [] };
                  setGravando(0.001);
                }}
              >
                ● Gravar minha versão
              </button>
              {nCalib > 0 && (
                <button className="btn btn-ghost" onClick={() => setCalib(clearCalibration(base))}>
                  Apagar ({nCalib} amostras)
                </button>
              )}
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}
