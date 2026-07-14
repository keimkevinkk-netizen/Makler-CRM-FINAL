import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppStoreProvider } from './app/AppStore';
import { AuthGate } from './auth/AuthGate';
import { AuthProvider } from './auth/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorMonitoring, reportMetric } from './observability/observability';
import './styles/index.css';

const bootstrapStartedAt = performance.now();
installGlobalErrorMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppStoreProvider>
          <AuthGate><App /></AuthGate>
        </AppStoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

window.requestAnimationFrame(() => {
  reportMetric('app.bootstrap', performance.now() - bootstrapStartedAt);
});
