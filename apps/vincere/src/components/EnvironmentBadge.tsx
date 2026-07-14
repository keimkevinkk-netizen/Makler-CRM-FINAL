import { runtimeConfig } from '../config/runtime';

const labels = {
  local: 'LOCAL',
  preview: 'PREVIEW',
  beta: 'PRIVATE BETA',
  production: 'PRODUCTION',
} as const;

export function EnvironmentBadge() {
  const title = [
    `Umgebung: ${runtimeConfig.environment}`,
    `Datenmodus: ${runtimeConfig.dataMode}`,
    `Release: ${runtimeConfig.release}`,
  ].join(' · ');

  return (
    <span
      className={`environment-badge environment-${runtimeConfig.environment}`}
      title={title}
      aria-label={title}
    >
      {labels[runtimeConfig.environment]}
      {runtimeConfig.mockDataEnabled && <small>TESTDATEN</small>}
    </span>
  );
}
