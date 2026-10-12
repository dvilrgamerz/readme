import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
test('keyboard skip link targets focusable main landmark', () => {
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main[^>]*id="main-content"[^>]*tabindex="-1"/);
  assert.match(css, /\.skip-link:focus/);
});
test('keyboard focus and reduced motion are supported', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
