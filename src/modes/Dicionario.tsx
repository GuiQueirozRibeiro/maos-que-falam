import { useEffect, useMemo, useRef, useState } from 'react';
import { SignStage } from '../components/SignStage';
import { SinalInfo } from '../components/SinalInfo';
import { duracao, quadro, type Passo } from '../libras/cena';
import { SINAIS, type Sinal } from '../libras/sinais';
import { falar } from '../speech/tts';

/* ─── Dicionário: todos os sinais, com busca ─────────────────────────────
 * As miniaturas são quadros parados (33 SVGs animados ao mesmo tempo
 * pesariam à toa); só o sinal selecionado anima.
 */

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ORDENADOS = [...SINAIS].sort((a, b) => a.glosa.localeCompare(b.glosa, 'pt-BR'));
const passoDe = (sinal: Sinal): Passo => ({ tipo: 'sinal', item: 0, sinal });

function SinalAnimado({ sinal, canhoto }: { sinal: Sinal; canhoto: boolean }) {
  const [k, setK] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const passo = passoDe(sinal);
    const dur = duracao(passo);
    const pausa = 700;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) % (dur + pausa);
      setK(Math.min(1, t / dur));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [sinal]);
  return <SignStage quadro={quadro(passoDe(sinal), k)} canhoto={canhoto} className="sign-stage" />;
}

export function Dicionario({ canhoto }: { canhoto: boolean }) {
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Sinal>(ORDENADOS[0]);

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    if (!q) return ORDENADOS;
    return ORDENADOS.filter((s) => semAcento(s.glosa).includes(q) || s.palavras.some((p) => semAcento(p).includes(q)));
  }, [busca]);

  const miniaturas = useMemo(
    () =>
      ORDENADOS.map((s) => ({
        sinal: s,
        el: <SignStage quadro={quadro(passoDe(s), 0.35)} canhoto={canhoto} className="sign-thumb" />,
      })),
    [canhoto],
  );

  return (
    <section className="mode">
      <div className="panel">
        <div className="row between wrap">
          <h2>Dicionário de sinais</h2>
          <input
            className="busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar: casa, obrigado, família…"
            aria-label="Buscar sinal"
          />
        </div>
        <p className="small muted">
          {SINAIS.length} sinais conferidos nos vídeos do Dicionário de Libras do INES e do Signbank da UFSC. Palavras fora
          desta lista são soletradas no tradutor.
        </p>
        <div className="sinais-grid" role="list">
          {miniaturas
            .filter((m) => lista.includes(m.sinal))
            .map(({ sinal, el }) => (
              <button
                key={sinal.glosa}
                role="listitem"
                className={`sinal-card ${sinal === sel ? 'active' : ''}`}
                onClick={() => setSel(sinal)}
              >
                {el}
                <strong>{sinal.glosa}</strong>
                <span className="small muted">{sinal.palavras.slice(0, 3).join(', ')}</span>
              </button>
            ))}
          {lista.length === 0 && (
            <p className="muted">
              Nenhum sinal para "{busca}" no nosso dicionário. Consulte o{' '}
              <a href="https://dicionario.ines.gov.br/" target="_blank" rel="noreferrer">
                dicionário do INES
              </a>
              .
            </p>
          )}
        </div>
      </div>

      <div className="mode-grid">
        <div className="panel tutorial">
          <div className="tutorial-stage">
            <SinalAnimado sinal={sel} canhoto={canhoto} />
            <div className="tutorial-gloss">{sel.glosa}</div>
          </div>
          <div className="row center">
            <button className="btn btn-ghost" onClick={() => falar(sel.palavras[0])}>
              🔊 Ouvir "{sel.palavras[0]}"
            </button>
          </div>
        </div>
        <aside className="panel">
          <SinalInfo sinal={sel} />
          <p className="small muted">Em português: {sel.palavras.join(', ')}.</p>
        </aside>
      </div>
    </section>
  );
}
