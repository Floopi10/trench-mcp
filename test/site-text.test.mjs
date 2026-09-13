import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8');
test('homepage and terminal HTML are encoding-safe and have one scanner each', () => {
 for(const name of ['index.html','terminal.html']) {
  const html=read(name);
  assert.ok(!/[^\x00-\x7f]/.test(html), `${name}: use HTML entities for non-ASCII UI symbols`);
  assert.equal((html.match(/data-market-deck/g)||[]).length,1);
  assert.ok(html.includes('market-deck.js?v=terminal3'));
 }
 assert.ok(read('index.html').includes('Open terminal <span>&#8599;</span>'));
 assert.ok(read('terminal.js').includes("addEventListener('trench:select-token'"));
});
