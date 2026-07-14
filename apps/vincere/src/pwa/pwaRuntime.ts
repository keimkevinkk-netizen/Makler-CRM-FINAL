import { useCallback, useEffect, useState } from 'react';

export const VINCERE_APP_VERSION = '0.1.0-mobile-pwa.1';

export type PwaRuntimeStatus =
  | 'unsupported'
  | 'registering'
  | 'ready'
  | 'update_available'
  | 'error';

export interface PwaRuntimeState {
  status: PwaRuntimeStatus;
  version: string;
  error?: string;
}

const initialState: PwaRuntimeState = {
  status: typeof navigator === 'undefined' || !('serviceWorker' in navigator) ? 'unsupported' : 'registering',
  version: VINCERE_APP_VERSION,
};

export function usePwaRuntime() {
  const [state, setState] = useState<PwaRuntimeState>(initialState);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let active = true;
    let controllerChanged = false;

    const onControllerChange = () => {
      if (controllerChanged) return;
      controllerChanged = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((nextRegistration) => {
        if (!active) return;
        setRegistration(nextRegistration);

        if (nextRegistration.waiting) {
          setState({ status: 'update_available', version: VINCERE_APP_VERSION });
          return;
        }

        setState({ status: 'ready', version: VINCERE_APP_VERSION });

        nextRegistration.addEventListener('updatefound', () => {
          const installing = nextRegistration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (!active || installing.state !== 'installed') return;
            setState({
              status: navigator.serviceWorker.controller ? 'update_available' : 'ready',
              version: VINCERE_APP_VERSION,
            });
          });
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          version: VINCERE_APP_VERSION,
          error: reason instanceof Error ? reason.message : 'Service Worker konnte nicht registriert werden.',
        });
      });

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  const checkForUpdate = useCallback(() => {
    void registration?.update();
  }, [registration]);

  return { ...state, applyUpdate, checkForUpdate };
}
