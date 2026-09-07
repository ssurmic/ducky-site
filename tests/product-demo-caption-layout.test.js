import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountDemoCaptionLayout} from '../public/js/product-demo.js';

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
