import { Component, type ReactNode } from 'react';

/* ─── Um erro num modo não derruba o site inteiro ────────────────────────
 * Sem isto, uma exceção de render (como a que vimos no painel de detalhe)
 * deixa a página em branco. `chave` muda ao trocar de aba e zera o erro.
 */

interface Props {
  chave: string;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { erro: Error | null }> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  componentDidUpdate(prev: Props) {
    if (prev.chave !== this.props.chave && this.state.erro) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="panel" role="alert">
        <h2>Algo deu errado nesta parte</h2>
        <p className="muted">O resto do site continua funcionando. Tente de novo ou troque de aba.</p>
        <pre className="small error">{this.state.erro.message}</pre>
        <div className="row">
          <button className="btn btn-primary" onClick={() => this.setState({ erro: null })}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }
}
