import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppStoreProvider } from './app/AppStore';
import { AuthGate } from './auth/AuthGate';
import { AuthProvider } from './auth/AuthContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppStoreProvider>
        <AuthGate><App /></AuthGate>
      </AppStoreProvider>
    </AuthProvider>
  </React.StrictMode>,
);
