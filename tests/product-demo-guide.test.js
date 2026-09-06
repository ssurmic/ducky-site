import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountProductDemo} from '../public/js/product-demo.js';

// Simulate the browser media lifecycle, including cold metadata and failed seeks.
// These fixture times are intentionally independent of the edited movie timeline.
function fixture() {
  const dom = new JSDOM(`<section class="product-demo"><video id="film" class="product-demo-player" preload="none"></video>
    <div data-demo-guide data-loading="Loading {time} {title}" data-ready="Ready {time} {title}" data-error="Retry the player">
      ${[0, 4, 12, 25].map(time => `<button disabled data-demo-seek="${time}" data-demo-title="Scene ${time}" data-demo-clock="0:${String(time).padStart(2, '0')}" aria-controls="film"></button>`).join('')}
      <p data-demo-status role="status"></p><a href="/app/#/calendar">Open calendar</a>
    </div></section>`);
  const section = dom.window.document.querySelector('section'), video = section.querySelector('video');
  const media = {ready:0, duration:NaN, time:0, seeking:false, network:0, error:null, loads:0, plays:0, pauses:0, throwNext:false, ranges:null, seeks:0};
  Object.defineProperties(video, {
    readyState:{get:()=>media.ready}, duration:{get:()=>media.duration}, seeking:{get:()=>media.seeking},
    networkState:{get:()=>media.network}, error:{get:()=>media.error},
    seekable:{get:()=>{
      const ranges=media.ranges ?? (media.ready >= 1 && Number.isFinite(media.duration) ? [[0, media.duration]] : []);
      return {length:ranges.length,start:i=>ranges[i][0],end:i=>ranges[i][1]};
    }},
    currentTime:{get:()=>media.time, set:value=>{
      if (media.ready < 1 || media.throwNext) { media.throwNext=false; throw new dom.window.DOMException('Not ready', 'InvalidStateError'); }
      media.seeks++;
      media.time=value; media.seeking=true;
    }},
  });
  video.load=()=>{media.loads++;media.network=2;};
  video.play=()=>{media.plays++;return Promise.resolve();};
  video.pause=()=>{media.pauses++;}; video.scrollIntoView=()=>{};
  const buttons=[...section.querySelectorAll('[data-demo-seek]')], dispose=mountProductDemo(section);
  const emit=name=>video.dispatchEvent(new dom.window.Event(name));
  function metadata(duration=30) {media.ready=1;media.duration=duration;emit('loadedmetadata');}
  function settled() {media.ready=2;media.seeking=false;emit('seeked');}
  return {section,dom,video,media,buttons,dispose,emit,metadata,settled,status:section.querySelector('[data-demo-status]')};
}

test('cold chapter clicks wait for metadata; latest choice wins without loading twice or autoplay',()=>{
  const f=fixture(); assert.equal(f.media.loads,0); assert.equal(f.video.preload,'none');
  f.buttons[1].click(); f.buttons[2].click();
  assert.equal(f.media.loads,1); assert.equal(f.media.time,0); assert.equal(f.media.plays,0);
  assert.equal(f.video.preload,'auto');
  f.metadata(); assert.equal(f.media.time,12); f.settled();
  assert.equal(f.buttons[2].getAttribute('aria-current'),'true');
  assert.equal(f.buttons[1].hasAttribute('aria-current'),false);
  assert.match(f.status.textContent,/Ready 0:12/); f.dispose();
});
test('chapter choice pauses existing playback and waits for the seek before reporting ready',()=>{
  const f=fixture(); f.metadata(); f.buttons[3].click();
  assert.equal(f.media.loads,0); assert.equal(f.media.pauses,1); assert.equal(f.media.plays,0);
  assert.match(f.status.textContent,/Loading/); f.settled(); assert.match(f.status.textContent,/Ready 0:25/); f.dispose();
});
test('stale chapter offsets fail instead of silently landing in another scene',()=>{
  const f=fixture(); f.metadata(22); f.buttons[3].click();
  assert.equal(f.media.time,0); assert.equal(f.buttons[3].hasAttribute('aria-current'),false);
  assert.match(f.status.textContent,/Retry/); assert.ok(f.section.querySelector('a')); f.dispose();
});
test('unseekable decoders retry on loadeddata; unknown duration waits for a finite value',()=>{
  const f=fixture(); f.buttons[2].click(); f.metadata(NaN); assert.equal(f.media.time,0);
  f.media.throwNext=true; f.media.duration=30; f.emit('durationchange'); assert.equal(f.media.time,0);
  f.media.ready=2; f.emit('loadeddata'); assert.equal(f.media.time,12); f.settled(); f.dispose();
});
test('media failure leaves navigation usable and the next chapter choice retries loading',()=>{
  const f=fixture(); f.buttons[1].click(); f.media.error={code:2}; f.emit('error');
  assert.match(f.status.textContent,/Retry/); assert.equal(f.buttons[1].disabled,false);
  f.buttons[1].click(); assert.equal(f.media.loads,2); f.media.error=null; f.metadata(); f.settled();
  assert.equal(f.media.time,4); f.dispose();
});
test('malformed chapter values and controls targeting a different player stay disabled',()=>{
  const f=fixture(); f.dispose(); const guide=f.section.querySelector('[data-demo-guide]');
  for (const [time,target] of [['NaN','film'],['-1','film'],['','film'],['4','other-video']]) {
    const button=f.dom.window.document.createElement('button'); button.dataset.demoSeek=time;
    button.setAttribute('aria-controls',target); button.disabled=true; guide.append(button);
  }
  const stop=mountProductDemo(f.section);
  for (const button of [...guide.querySelectorAll('[data-demo-seek]')].slice(4)) {assert.equal(button.disabled,true);button.click();}
  assert.equal(f.media.loads,0); stop();
});
test('cleanup prevents late metadata from moving the player',()=>{
  const f=fixture(); f.buttons[2].click(); f.dispose(); f.metadata();
  assert.equal(f.media.time,0); assert.ok(f.buttons.every(button=>button.disabled));
});
test('ordinary playback marks a chapter without forcing playback or changing time',()=>{
  const f=fixture(); f.metadata(); f.media.time=16; f.emit('timeupdate');
  assert.equal(f.buttons[2].getAttribute('aria-current'),'true'); assert.equal(f.media.time,16);
  assert.equal(f.media.loads,0); assert.equal(f.media.plays,0); f.dispose();
});
test('cold metadata with no seekable range waits for progress and only seeks the latest chapter',()=>{
  const f=fixture(); f.media.ranges=[]; f.buttons[2].click(); f.metadata();
  assert.equal(f.media.seeks,0); assert.match(f.status.textContent,/Loading/);
  f.media.ready=2; f.media.ranges=[[0,6]]; f.emit('loadeddata');
  assert.equal(f.media.seeks,0); f.buttons[3].click();
  f.media.ranges=[[0,30]]; f.emit('progress');
  assert.equal(f.media.time,25); assert.equal(f.media.seeks,1); f.emit('progress');
  assert.equal(f.media.seeks,1); f.settled();
  assert.match(f.status.textContent,/Ready 0:25/); assert.equal(f.media.plays,0); f.dispose();
});
test('a clamped seek is not ready and retries only after a later media progress event',()=>{
  const f=fixture(); f.metadata(); f.buttons[2].click();
  f.media.time=0; f.media.seeking=false; f.media.ready=2; f.emit('seeked');
  assert.match(f.status.textContent,/Loading/); assert.equal(f.media.seeks,1);
  f.emit('progress'); assert.equal(f.media.time,12); assert.equal(f.media.seeks,2);
  f.settled(); assert.match(f.status.textContent,/Ready 0:12/); f.dispose();
});
test('seeked without a decoded frame cannot report ready; an existing metadata error can reload',()=>{
  const f=fixture(); f.metadata(); f.buttons[1].click(); f.media.seeking=false; f.emit('seeked');
  assert.match(f.status.textContent,/Loading/); f.media.ready=2; f.emit('loadeddata');
  assert.match(f.status.textContent,/Ready/);
  f.media.error={code:2}; f.emit('error'); f.buttons[2].click();
  assert.equal(f.media.loads,1); assert.match(f.status.textContent,/Loading/); f.dispose();
});
