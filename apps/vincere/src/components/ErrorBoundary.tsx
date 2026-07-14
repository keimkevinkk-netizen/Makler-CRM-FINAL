import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../observability/observability';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('frontend', 'react.error-boundary', error, {
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <section>
          <span className="brand-mark" aria-hidden="true">V</span>
          <h1>VINCERE konnte diese Ansicht nicht sicher laden.</h1>
          <p>Der Fehler wurde lokal und ohne personenbezogene Inhalte erfasst. Nicht gespeicherte Eingaben können betroffen sein.</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>Anwendung neu laden</button>
        </section>
      </main>
    );
  }
}
