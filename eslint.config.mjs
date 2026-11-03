// Error-catching rules only (eslint:recommended); formatting is left alone on purpose.
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

// Globals the pages share: what the <script> tags in control.html/player.html define.
const pageGlobals = {
  LightningAudio: 'readonly',
  LobbyOptions: 'readonly',
  SessionRecords: 'readonly',
  BallDuelLobby: 'readonly',
  BallDuelEngine: 'readonly',
};

export default defineConfig([
  { ignores: ['dist/', 'node_modules/', 'arduino/'] },
  js.configs.recommended,
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
  {
    // Electron main process, Node scripts and tests.
    files: ['main.js', 'preload.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    // lobby-view.test.js sets the global that public/lobby.js reads.
    files: ['tests/**/*.js'],
    languageOptions: { globals: { LobbyOptions: 'writable' } },
  },
  {
    // Shared modules: required by Node and loaded as plain <script> tags in the pages.
    files: ['lib/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Page scripts: plain <script> tags; their top-level names are globals for the next script,
    // so only unused locals count. `module` is checked with typeof for the Node test export.
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...pageGlobals, module: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { vars: 'local' }] },
  },
  // The file that declares a page global must not also see it as predefined.
  { files: ['public/audio-manager.js'], languageOptions: { globals: { LightningAudio: 'off' } } },
]);
