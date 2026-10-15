import { useState } from 'react';

/* ─── VLibras (Governo Federal) ──────────────────────────────────────────
 * Tradutor oficial português → Libras com avatar 3D. Datilologia serve
 * para nomes e palavras sem sinal; FRASES em Libras têm gramática própria
 * (ordem, expressões faciais, classificadores) — para isso usamos o VLibras.
 * O script só é carregado quando a pessoa pede (privacidade + desempenho).
 */

declare global {
  interface Window {
    VLibras?: { Widget: new (rootPath: string) => unknown };
    VLibrasWidget?: { open?: () => void };
  }
}

const SRC = 'https://vlibras.gov.br/app/vlibras-plugin.js';
let loading: Promise<void> | null = null;

function loadVLibras(): Promise<void> {
  if (window.VLibras) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Não foi possível carregar o VLibras. Verifique sua conexão.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export function VLibrasButton() {
  const [estado, setEstado] = useState<'idle' | 'carregando' | 'pronto' | 'erro'>('idle');

  const abrir = async () => {
    setEstado('carregando');
    try {
      await loadVLibras();
      new window.VLibras!.Widget('https://vlibras.gov.br/app');
      // O widget monta o botão alguns ms depois; então abrimos o avatar.
      setTimeout(() => window.VLibrasWidget?.open?.(), 150);
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  };

  return (
    <div className="vlibras-cta">
      <button className="btn" onClick={abrir} disabled={estado === 'carregando'}>
        {estado === 'carregando' ? 'Abrindo avatar…' : '🧑‍🦱 Ver a frase em Libras com o avatar VLibras'}
      </button>
      {estado === 'pronto' && (
        <p className="small muted">
          Com o avatar aberto, <strong>clique na frase destacada acima</strong> e ele sinaliza em Libras.
        </p>
      )}
      {estado === 'erro' && <p className="error small">Não foi possível carregar o VLibras agora.</p>}
    </div>
  );
}
