import { useEffect, useState } from 'react';
import { Aprender } from './modes/Aprender';
import { PortuguesParaLibras } from './modes/PortuguesParaLibras';
import { SinaisParaVoz } from './modes/SinaisParaVoz';

type Aba = 'sinais' | 'portugues' | 'aprender';

const ABAS: { id: Aba; titulo: string; sub: string }[] = [
  { id: 'sinais', titulo: 'Sinais → Voz', sub: 'Soletre na câmera e ouça' },
  { id: 'portugues', titulo: 'Português → Libras', sub: 'Digite e veja como sinalizar' },
  { id: 'aprender', titulo: 'Aprender', sub: 'Pratique o alfabeto' },
];

const lerAba = (): Aba => {
  const h = location.hash.replace('#', '');
  return ABAS.some((a) => a.id === h) ? (h as Aba) : 'sinais';
};

export default function App() {
  const [aba, setAba] = useState<Aba>(lerAba);
  const [canhoto, setCanhoto] = useState(() => {
    try {
      return localStorage.getItem('mqf:canhoto') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onHash = () => setAba(lerAba());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mqf:canhoto', canhoto ? '1' : '0');
    } catch {
      /* sem armazenamento: só não lembra a preferência */
    }
  }, [canhoto]);

  // Ilustrações em espelho (polegar à esquerda) = como a pessoa destra vê a
  // própria mão na câmera frontal. Canhotos veem o contrário.
  const espelhar = !canhoto;

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#sinais" aria-label="Mãos que Falam, início">
          <svg viewBox="0 0 64 64" aria-hidden className="brand-mark">
            <path d="M22 50V24a3 3 0 0 1 6 0v12V16a3 3 0 0 1 6 0v20V18a3 3 0 0 1 6 0v18-10a3 3 0 0 1 6 0v14c0 8-6 14-14 14h-2c-4 0-7-2-9-5l-7-10a3 3 0 0 1 5-3l3 4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Mãos que <em>Falam</em>
          </span>
        </a>
        <label className="hand-toggle">
          <input type="checkbox" checked={canhoto} onChange={(e) => setCanhoto(e.target.checked)} />
          Sou canhoto(a)
        </label>
      </header>

      <nav className="tabs" role="tablist" aria-label="Modos">
        {ABAS.map((a) => (
          <a
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            className={`tab ${aba === a.id ? 'active' : ''}`}
            href={`#${a.id}`}
          >
            <strong>{a.titulo}</strong>
            <span>{a.sub}</span>
          </a>
        ))}
      </nav>

      <main>
        {aba === 'sinais' && <SinaisParaVoz />}
        {aba === 'portugues' && <PortuguesParaLibras espelhar={espelhar} />}
        {aba === 'aprender' && <Aprender espelhar={espelhar} />}
      </main>

      <footer className="foot">
        <p>
          <strong>Sobre a Libras:</strong> a Língua Brasileira de Sinais é uma língua completa, reconhecida pela Lei 10.436/2002,
          com gramática própria. Ela não é "português com as mãos". Este site ensina e reconhece o <em>alfabeto manual</em> (datilologia), que é a porta de entrada. Para aprender sinais, consulte o{' '}
          <a href="https://www.ines.gov.br/dicionario-de-libras/" target="_blank" rel="noreferrer">
            Dicionário de Libras do INES
          </a>{' '}
          e, sempre que puder, aprenda com pessoas surdas.
        </p>
        <p className="small muted">
          O reconhecimento é experimental e roda inteiro no seu navegador (MediaPipe). Nenhuma imagem é enviada. Existem
          variações regionais nas letras.
        </p>
      </footer>
    </div>
  );
}
