import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedLetter } from '../components/HandFigure';
import { SignStage } from '../components/SignStage';
import { VLibrasButton } from '../components/VLibrasButton';
import { POR_LETRA } from '../libras/alphabet';
import { cenaInicial, duracao, misturar, passosDe, quadro, type Passo, type Quadro } from '../libras/cena';
import type { Local, Sinal } from '../libras/sinais';
import { traduzir } from '../libras/traducao';
import { falar } from '../speech/tts';

const EXEMPLOS = ['Meu nome é Ana', 'Eu sou surdo', 'Como você está?', 'Eu amo minha família', 'Quero aprender Libras', 'Boa noite, obrigado!'];
const TRANS_MS = 420;

const NOME_LOCAL: Record<Local, string> = {
  testa: 'testa', olhos: 'olhos', nariz: 'nariz', boca: 'boca', queixo: 'queixo', bochecha: 'bochecha',
  orelha: 'orelha', 'lado-cabeca': 'lado da cabeça', pescoco: 'pescoço', peito: 'peito', ombro: 'ombro',
  frente: 'espaço à frente do corpo', barriga: 'barriga', centro: 'diante do peito, no meio',
};
const NOME_PALMA = { frente: 'para a frente', tras: 'para o corpo', lado: 'para o lado', baixo: 'para baixo', cima: 'para cima' };

export function PortuguesParaLibras({ canhoto }: { canhoto: boolean }) {
  const [texto, setTexto] = useState('Meu nome é Ana');
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const trad = useMemo(() => traduzir(texto), [texto]);
  const passos = useMemo(() => passosDe(trad), [trad]);

  const timeline = useMemo(() => {
    let t = 0;
    return passos.map((p, i) => {
      const trans = i === 0 || p.tipo === 'pausa' ? 0 : TRANS_MS / speed;
      const seg = { start: t, trans, body: duracao(p) / speed };
      t += trans + seg.body;
      return seg;
    });
  }, [passos, speed]);
  const total = timeline.length ? timeline.at(-1)!.start + timeline.at(-1)!.trans + timeline.at(-1)!.body : 0;
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
      setElapsed((e) => Math.min(total, e + dt));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);

  useEffect(() => {
    if (playing && elapsed >= total) setPlaying(false);
  }, [playing, elapsed, total]);

  let idx = timeline.findIndex((s) => elapsed < s.start + s.trans + s.body);
  if (idx < 0) idx = Math.max(0, timeline.length - 1);
  const atual: Passo | undefined = passos[idx];

  const cena: Quadro = useMemo(() => {
    if (!passos.length) return cenaInicial();
    const fimDe = (i: number): Quadro => {
      for (let j = i; j >= 0; j--) if (passos[j].tipo !== 'pausa') return quadro(passos[j], 1);
      return cenaInicial();
    };
    const seg = timeline[idx];
    const local = elapsed - seg.start;
    if (local < seg.trans) {
      return misturar(fimDe(idx - 1), quadro(passos[idx], 0, fimDe(idx - 1)), local / seg.trans);
    }
    if (idx === 0 && !playing && elapsed === 0) return quadro(passos[0], 0);
    return quadro(passos[idx], Math.min(1, (local - seg.trans) / seg.body), fimDe(idx - 1));
  }, [passos, timeline, idx, elapsed, playing]);

  const irParaItem = (item: number) => {
    const i = passos.findIndex((p) => p.item === item);
    if (i < 0) return;
    setPlaying(false);
    setElapsed(timeline[i].start + timeline[i].trans);
  };
  const passo = (d: number) => {
    const i = Math.min(passos.length - 1, Math.max(0, idx + d));
    setPlaying(false);
    setElapsed(timeline[i] ? timeline[i].start + timeline[i].trans : 0);
  };
  const tocar = () => {
    if (elapsed >= total) setElapsed(0);
    setPlaying((p) => !p);
  };

  const itemAtual = atual?.item ?? -1;

  return (
    <section className="mode">
      <div className="panel input-panel">
        <label htmlFor="frase">
          <h2>Escreva em português</h2>
        </label>
        <textarea
          id="frase"
          value={texto}
          maxLength={140}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite uma frase curta, um nome ou uma palavra"
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
          <div className="glosa" aria-label={`Em Libras: ${trad.glosa}`}>
            <span className="glosa-label">Em Libras</span>
            {trad.itens.map((it, i) => (
              <button
                key={i}
                className={`gloss-item ${it.tipo} ${i === itemAtual ? 'active' : ''}`}
                onClick={() => irParaItem(i)}
                disabled={it.tipo === 'omitido'}
                title={it.tipo === 'omitido' ? it.motivo : it.original}
              >
                {it.tipo === 'sinal' ? it.sinal.glosa : it.tipo === 'soletrar' ? it.letras.map((l) => l.letra).join('-') : it.original}
              </button>
            ))}
            {trad.pergunta && <span className="gloss-q">?</span>}
          </div>

          <div className="tutorial-stage">
            <SignStage quadro={cena} canhoto={canhoto} className="sign-stage" />
            {atual?.tipo === 'letra' && <div className="tutorial-letter">{atual.original}</div>}
            {atual?.tipo === 'sinal' && <div className="tutorial-gloss">{atual.sinal.glosa}</div>}
          </div>
          <div className="progress" aria-hidden>
            <div style={{ width: `${total ? (elapsed / total) * 100 : 0}%` }} />
          </div>
          <div className="row center wrap">
            <button className="btn" onClick={() => passo(-1)} disabled={!passos.length} aria-label="Passo anterior">
              ◀
            </button>
            <button className="btn btn-primary" onClick={tocar} disabled={!passos.length}>
              {playing ? '❚❚ Pausar' : elapsed >= total && total > 0 ? '↺ Repetir' : '▶ Mostrar em Libras'}
            </button>
            <button className="btn" onClick={() => passo(1)} disabled={!passos.length} aria-label="Próximo passo">
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
          <Detalhe passo={atual} />
          {trad.notas.length > 0 && (
            <ul className="notas">
              {trad.notas.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
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
              Esta é uma tradução <strong>didática</strong>: sinal a sinal, com regras simples de gramática. Para ver a
              frase sinalizada com a gramática completa da Libras, use o avatar oficial:
            </p>
            <VLibrasButton />
          </div>
        </aside>
      </div>
    </section>
  );
}

/** Vídeo real do INES: a referência de verdade, ao lado da animação didática. */
function VideoReal({ sinal }: { sinal: Sinal }) {
  const [aberto, setAberto] = useState(false);
  const video = sinal.fontes.find((f) => f.video)?.video;
  useEffect(() => setAberto(false), [sinal]);
  if (!video) return null;
  return aberto ? (
    <figure className="video-real">
      <video src={video} autoPlay loop muted playsInline controls />
      <figcaption className="small muted">
        Dicionário de Libras do INES. Vista de frente: a mão direita de quem sinaliza aparece à sua esquerda.
      </figcaption>
    </figure>
  ) : (
    <button className="btn" onClick={() => setAberto(true)}>
      ▶ Ver uma pessoa fazendo este sinal (vídeo do INES)
    </button>
  );
}

function Detalhe({ passo }: { passo: Passo | undefined }) {
  if (!passo) return <p className="muted">Digite algo para ver o tutorial.</p>;
  if (passo.tipo === 'pausa') return <p className="muted">Pausa curta entre a palavra soletrada e o próximo sinal.</p>;
  if (passo.tipo === 'letra') {
    const spec = POR_LETRA[passo.letra];
    return (
      <div className="howto">
        <h3>
          Letra {spec.letra} <span className="badge">datilologia</span>
          {passo.repetida && <span className="badge">letra dobrada</span>}
        </h3>
        <p>{spec.descricao}</p>
        {passo.repetida && <p className="tip">Letra repetida: mantenha a forma e deslize a mão um pouco para o lado.</p>}
        {spec.dica && <p className="tip">💡 {spec.dica}</p>}
        {passo.acento && <p className="tip">"{passo.original}" tem acento: faça a letra {spec.letra}.</p>}
      </div>
    );
  }
  const s = passo.sinal;
  const letraCM = POR_LETRA[s.config] ? s.config : null;
  return (
    <div className="howto">
      <h3>
        {s.glosa}
        <span className={`badge ${s.confianca === 'alta' ? '' : 'badge-warn'}`}>
          {s.confianca === 'alta' ? 'conferido' : 'verifique'}
        </span>
      </h3>
      <p>{s.descricao}</p>
      <dl className="params">
        <dt>Configuração de mão</dt>
        <dd className="row">
          {letraCM && <AnimatedLetter letra={letraCM} className="param-hand" playing={false} />}
          {letraCM ? `mão em ${letraCM}` : s.config === '5' ? 'mão aberta, dedos afastados' : s.config === '1' ? 'só o indicador esticado' : s.config}
        </dd>
        <dt>Onde</dt>
        <dd>{NOME_LOCAL[s.local]}</dd>
        <dt>Palma</dt>
        <dd>{NOME_PALMA[s.palma]}</dd>
        <dt>Movimento</dt>
        <dd>{s.movimento}</dd>
        {s.duasMaos && (
          <>
            <dt>Outra mão</dt>
            <dd>{s.duasMaos.tipo === 'simetrica' ? 'faz o mesmo, espelhado' : `parada, mão em ${s.duasMaos.config}, como apoio`}</dd>
          </>
        )}
        {s.expressao && (
          <>
            <dt>Expressão</dt>
            <dd>{s.expressao}</dd>
          </>
        )}
      </dl>
      {s.confianca !== 'alta' && (
        <p className="tip">Encontramos uma só fonte para este sinal. Confira no dicionário do INES, porque pode haver variação regional.</p>
      )}
      <VideoReal sinal={s} />
      <p className="small muted">
        Fontes:{' '}
        {s.fontes.map((f, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            <a href={f.video ?? f.url} target="_blank" rel="noreferrer">
              {f.nome}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
