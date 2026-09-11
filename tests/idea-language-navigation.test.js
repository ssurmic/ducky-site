import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

for (const lang of ['zh', 'en']) test(`${lang} idea language controls retain the selected record`, () => {
  const prefix = lang === 'en' ? 'en/' : 'zh/';
  const other = lang === 'en' ? 'zh/' : 'en/';
  const dom = new JSDOM(readFileSync(`dist/${prefix}idea/index.html`, 'utf8'), {
    url: `https://ducky.test/${prefix}ideas/example-smh-kindex-2026-08/#idea-thesis`, runScripts: 'outside-only',
  });
  dom.window.eval(readFileSync('public/js/lang.js', 'utf8'));
  const links = [...dom.window.document.querySelectorAll('[data-lang-toggle], [data-lang-toggle-footer]')];
  assert.ok(links.length >= 2);
  for (const link of links) {
    assert.equal(link.getAttribute('href'), `/${other}ideas/example-smh-kindex-2026-08/#idea-thesis`);
    link.dispatchEvent(new dom.window.Event('click'));
    assert.equal(link.getAttribute('href'), `/${other}ideas/example-smh-kindex-2026-08/#idea-thesis`);
  }
  dom.window.close();
});
