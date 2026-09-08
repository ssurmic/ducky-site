import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountDemoCaptionLayout,mountDemoTutorial} from '../public/js/product-demo.js';

test('native captions clear the portrait controls after delayed track load and restore in landscape',()=>{
 const dom=new JSDOM('<video preload="none"><track></video>');
 const video=dom.window.document.querySelector('video'), trackNode=video.querySelector('track');
 let box={width:350,height:262.5};video.getBoundingClientRect=()=>box;
 const track={mode:'disabled',cues:null};Object.defineProperty(video,'textTracks',{value:[track]});
 let loads=0,plays=0;video.load=()=>loads++;video.play=()=>plays++;
 const dispose=mountDemoCaptionLayout(video);
 track.cues=[{line:84,snapToLines:false}];trackNode.dispatchEvent(new dom.window.Event('load'));
 assert.equal(track.cues[0].line,78);assert.equal(track.mode,'disabled');
 box={width:1080,height:607.5};dom.window.dispatchEvent(new dom.window.Event('resize'));
 assert.equal(track.cues[0].line,84);assert.equal(track.mode,'disabled');
 assert.equal(video.preload,'none');assert.equal(loads,0);assert.equal(plays,0);
 dispose();box={width:350,height:262.5};dom.window.dispatchEvent(new dom.window.Event('resize'));
 assert.equal(track.cues[0].line,84);
});

test('tutorial phrase captions reserve width and clear controls at a 320px viewport',()=>{
 const dom=new JSDOM('<video data-demo-tutorial-video preload="none"><track></video>');
 const video=dom.window.document.querySelector('video');
 let box={width:246,height:184.5};video.getBoundingClientRect=()=>box;
 const cue={line:84,size:100,snapToLines:true};Object.defineProperty(video,'textTracks',{value:[{mode:'showing',cues:[cue]}]});
 const dispose=mountDemoCaptionLayout(video);
 assert.equal(cue.line,60);assert.equal(cue.size,90);assert.equal(cue.snapToLines,false);
 box={width:1100,height:618.75};dom.window.dispatchEvent(new dom.window.Event('resize'));
 assert.equal(cue.line,84);assert.equal(cue.size,90);dispose();
});

test('collapsing the tutorial pauses only its own video and never starts or loads media',()=>{
 const dom=new JSDOM('<video id="main"></video><details><video data-demo-tutorial-video preload="none"></video></details>');
 const details=dom.window.document.querySelector('details'), video=details.querySelector('video');
 let pauses=0;video.pause=()=>pauses++;
 video.play=()=>assert.fail('must not autoplay');video.load=()=>assert.fail('must not preload');
 dom.window.document.querySelector('#main').pause=()=>assert.fail('main video must remain independent');
 const dispose=mountDemoTutorial(details);
 assert.equal(pauses,0);details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));assert.equal(pauses,0);
 details.open=false;details.dispatchEvent(new dom.window.Event('toggle'));assert.equal(pauses,1);
 dispose();details.dispatchEvent(new dom.window.Event('toggle'));assert.equal(pauses,1);
});
