import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('PWA contracts', () => {
  it('provides an installable manifest with VINCERE metadata', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      scope: string;
      theme_color: string;
      icons: Array<{ sizes: string; purpose: string }>;
    };

    expect(manifest.name).toContain('VINCERE');
    expect(manifest.short_name).toBe('VINCERE');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#7c1730');
    expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('links the manifest and mobile metadata from the app document', () => {
    const html = read('index.html');

    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('viewport-fit=cover');
  });

  it('never intercepts mutations, authenticated requests, APIs, or JSON responses', () => {
    const serviceWorker = read('public/sw.js');

    expect(serviceWorker).toContain("request.method !== 'GET'");
    expect(serviceWorker).toContain("request.headers.has('authorization')");
    expect(serviceWorker).toContain("request.headers.has('apikey')");
    expect(serviceWorker).toContain("'/auth/v1/'");
    expect(serviceWorker).toContain("'/rest/v1/'");
    expect(serviceWorker).toContain("'/.netlify/functions/'");
    expect(serviceWorker).toContain("!contentType.includes('application/json')");
    expect(serviceWorker).not.toContain('sync.register');
  });

  it('uses a controlled update and cache cleanup contract', () => {
    const serviceWorker = read('public/sw.js');
    const runtime = read('src/pwa/pwaRuntime.ts');

    expect(serviceWorker).toContain("event.data?.type === 'SKIP_WAITING'");
    expect(serviceWorker).toContain("event.data?.type === 'CLEAR_TEMPORARY_STATE'");
    expect(runtime).toContain("status: 'update_available'");
    expect(runtime).toContain("postMessage({ type: 'SKIP_WAITING' })");
  });

  it('reserves safe mobile space and touch targets on small viewports', () => {
    const css = read('src/styles/08-mobile-pwa.css');

    expect(css).toContain('@media (max-width: 820px)');
    expect(css).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))');
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toMatch(/min-height:\s*48px/);
    expect(css).toContain('@media (max-width: 370px)');
  });
});
