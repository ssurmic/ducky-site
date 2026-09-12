import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// dist/_headers is rendered from templates/_headers.tpl by build.py (`npm test` builds first).
const headers=readFileSync('dist/_headers','utf8');
const csp=headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1]??'';
const directive=name=>csp.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+' '))??'';
test('CSP admits the Cloudflare Web Analytics beacon that Pages injects, and nothing looser',()=>{
 assert.ok(csp,'dist/_headers carries a Content-Security-Policy');
 const script=directive('script-src'),connect=directive('connect-src');
 assert.match(script,/^script-src 'self' https:\/\/telegram\.org https:\/\/static\.cloudflareinsights\.com$/);
 assert.match(connect,/ https:\/\/cloudflareinsights\.com(\s|$)/);
 assert.match(connect,/ https:\/\/api\.duckybot\.app(\s|$)/);
 assert.doesNotMatch(script,/unsafe-inline|unsafe-eval|\*/);
});
test('CSP applies to every path and keeps the Telegram Mini App frame rules',()=>{
 assert.match(headers,/^\/\*\n\s+Content-Security-Policy:/m);
 assert.match(directive('frame-src'),/https:\/\/oauth\.telegram\.org/);
 assert.match(directive('frame-ancestors'),/'self' https:\/\/web\.telegram\.org/);
 assert.doesNotMatch(headers,/X-Frame-Options/);
});
