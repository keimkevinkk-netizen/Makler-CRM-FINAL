'use strict';
/*
 * Deckt bewusst nur netlify/functions/ und tests/ ab, nicht index.html.
 * index.html ist eine 17.000-Zeilen-Single-File-Shell mit 50+ Inline-Skripten
 * (siehe CLAUDE.md "Datei nicht komplett neu formatieren"); ein aussagekraeftiges
 * Lint-Setup dafuer braeuchte zuerst eine Skript-Extraktion, die laut ADR-0003
 * bewusst nicht Teil von Phase 1 ist. Diese Luecke steht im Backlog
 * (docs/prd/08-masterprompt-backlog.md), nicht stillschweigend ignoriert.
 */
var nodeGlobals = {
  require: 'readonly', module: 'readonly', exports: 'writable', process: 'readonly',
  console: 'readonly', __dirname: 'readonly', Buffer: 'readonly', setTimeout: 'readonly',
  clearTimeout: 'readonly', fetch: 'readonly', AbortController: 'readonly', URL: 'readonly',
  URLSearchParams: 'readonly'
};
// tests/e2e/*.js mischt Node-Kontext (Playwright-Steuerung) mit Code, der als
// Closure via page.evaluate()/addInitScript() im BROWSER laeuft (window,
// document, localStorage) - ESLint kann das statisch nicht trennen, deshalb
// bekommen diese Dateien beide Globals-Saetze.
var browserGlobals = {
  window: 'readonly', document: 'readonly', localStorage: 'readonly', navigator: 'readonly'
};

module.exports = [
  {
    files: ['netlify/functions/**/*.js', 'tests/functions/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: nodeGlobals },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-undef': 'error',
      'no-var': 'off',
      eqeqeq: ['warn', 'smart'],
      'no-console': 'off'
    }
  },
  {
    files: ['tests/e2e/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: Object.assign({}, nodeGlobals, browserGlobals) },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-undef': 'error',
      'no-var': 'off',
      eqeqeq: ['warn', 'smart'],
      'no-console': 'off'
    }
  }
];
