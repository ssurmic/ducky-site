import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';

const master='/duck-head-cutout-v1.png';
const documentAt=path=>new JSDOM(readFileSync(`dist/${path}`,'utf8')).window.document;
const source=readFileSync('public'+master);
function pngSize(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.subarray(12,16).toString(),'IHDR');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),colorType:bytes[25]};
}
function files(root){
  return readdirSync(root,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(root,entry.name)):[join(root,entry.name)]);
}

test('the current fluffy master is a square HD PNG and all browser/install identities agree',()=>{
  const size=pngSize(source);
  assert.ok(size.width>=1024,'the original supplies at least 1024 pixels per side');
  assert.equal(size.height,size.width);
  assert.equal(size.colorType,6,'the transparent master retains an alpha channel');
  assert.deepEqual(readFileSync('dist'+master),source,'build copies the original without recompressing it');
  for(const prefix of ['', 'en/', 'zh/']){
    for(const route of ['index.html','app/index.html','404.html','research-map-preview/index.html','creator-analysis-preview/index.html','screener-preview/index.html','market-context-preview/index.html']){
      const doc=documentAt(prefix+route),icons=doc.querySelectorAll('link[rel=icon]');
      assert.equal(icons.length,1,prefix+route);
      assert.equal(icons[0].getAttribute('href'),master,'versioned icon URL stays stable across releases');
      if(icons[0].hasAttribute('sizes'))assert.equal(icons[0].getAttribute('sizes'),`${size.width}x${size.height}`);
      for(const icon of doc.querySelectorAll('link[rel=apple-touch-icon]'))assert.equal(icon.getAttribute('href'),master);
      for(const image of doc.querySelectorAll('img[src*="duck-head-"]'))assert.equal(image.getAttribute('src'),master);
    }
    const manifest=JSON.parse(readFileSync(`dist/${prefix}manifest.webmanifest`,'utf8'));
    assert.ok(manifest.icons.length>0);
    for(const icon of manifest.icons){
      assert.equal(icon.src,master);assert.equal(icon.sizes,`${size.width}x${size.height}`);assert.equal(icon.type,'image/png');
    }
  }
  const redirects=readFileSync('dist/_redirects','utf8');
  for(const legacy of ['/favicon.ico','/favicon.svg','/favicon.png'])assert.ok(redirects.split('\n').some(line=>{
    const [from,to,status]=line.trim().split(/\s+/);return from===legacy&&to===master&&status==='301';
  }),legacy);
  assert.equal(existsSync('dist/favicon.svg'),false,'build must not recreate the retired vector icon');
});

test('current pages and runtime consumers cannot fall back to retired duck artwork',()=>{
  const retired=/\/(?:avatar-(?:160|group)\.(?:jpg|png)|mascot\.svg)/;
  const consumers=[...files('templates').filter(p=>p.endsWith('.html')),...files('public/js').filter(p=>p.endsWith('.js')),
    ...files('public/css').filter(p=>p.endsWith('.css')),'public/sw.js'];
  for(const path of consumers)assert.doesNotMatch(readFileSync(path,'utf8'),retired,path);
  for(const path of ['public/sw.js','public/js/app/card-share.js','public/js/app/onboarding.js','public/css/app.css']){
    assert.ok(readFileSync(path,'utf8').includes(master),`${path} uses the shared current mark`);
  }
});

test('social previews use the same original duck and publish a renderable share image',()=>{
  const preview=documentAt('en/index.html').querySelector('meta[property="og:image"]').content;
  const path=new URL(preview).pathname;
  assert.match(path,/^\/og-fluffy-.*\.png$/,'social preview has its own stable versioned URL');
  const size=pngSize(readFileSync('dist'+path));
  assert.equal(size.width,1200);assert.equal(size.height,630);
  const svg=readFileSync('public'+path.replace(/\.png$/,'.svg'),'utf8');
  const embedded=svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(embedded,'editable social image embeds the canonical raster original');
  assert.deepEqual(Buffer.from(embedded[1],'base64'),source);
  for(const prefix of ['', 'en/', 'zh/']){
    const home=documentAt(prefix+'index.html');
    assert.equal(home.querySelector('meta[property="og:image"]').content,preview);
    const twitter=home.querySelector('meta[name="twitter:image"]');
    if(twitter)assert.equal(twitter.content,preview);
  }
});
