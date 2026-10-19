import { useEffect, useState } from 'react';
import { POR_LETRA } from '../libras/alphabet';
import type { Local, Sinal } from '../libras/sinais';
import { AnimatedLetter } from './HandFigure';

/* ─── Ficha de um sinal: parâmetros + vídeo real + fontes ───────────────
 * Usada no tutorial (Português → Libras) e no dicionário (Aprender).
 */

const NOME_LOCAL: Record<Local, string> = {
  testa: 'testa', olhos: 'olhos', nariz: 'nariz', boca: 'boca', queixo: 'queixo', bochecha: 'bochecha',
  orelha: 'orelha', 'lado-cabeca': 'lado da cabeça', pescoco: 'pescoço', peito: 'peito', ombro: 'ombro',
  frente: 'espaço à frente do corpo', barriga: 'barriga', centro: 'diante do peito, no meio',
};
const NOME_PALMA = { frente: 'para a frente', tras: 'para o corpo', lado: 'para o lado', baixo: 'para baixo', cima: 'para cima' };

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

export function SinalInfo({ sinal: s }: { sinal: Sinal }) {
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
        <p className="tip">Este sinal tem variantes entre as fontes ou as regiões. Compare com o vídeo do INES e, se puder, com quem sinaliza aí na sua região.</p>
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
