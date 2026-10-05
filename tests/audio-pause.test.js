const test=require('node:test');const assert=require('assert');
class FakeAudio{constructor(src){this.src=src;this.paused=true;this.volume=0;this.currentTime=0;this.loop=false;this.preload='';this.plays=0}play(){this.paused=false;this.plays++;return Promise.resolve()}pause(){this.paused=true}addEventListener(){}load(){}cloneNode(){return new FakeAudio(this.src)}}
globalThis.Audio=FakeAudio;
const {LightningAudio}=require('../public/audio-manager.js');
const make=enabled=>new LightningAudio({enabled,menuPlaylist:['m.mp3'],gamePlaylist:['g.mp3'],musicVolume:.35,fadeMs:10});
function playing(){const a=make(true);a.current='game';a.music.game.paused=false;a.music.game.currentTime=42;return a}
test('pauseMusic pauses the current track and keeps position',()=>{const a=playing();a.pauseMusic();assert.strictEqual(a.music.game.paused,true);assert.strictEqual(a.music.game.currentTime,42);assert.strictEqual(a.pausedName,'game')});
test('resumeMusic continues from the same position at target volume',()=>{const a=playing();a.pauseMusic();a.resumeMusic();assert.strictEqual(a.music.game.paused,false);assert.strictEqual(a.music.game.volume,.35);assert.strictEqual(a.music.game.currentTime,42);assert.strictEqual(a.pausedName,null)});
test('resume is skipped when the track changed meanwhile',()=>{const a=playing();a.pauseMusic();a.current='menu';a.resumeMusic();assert.strictEqual(a.music.game.paused,true)});
test('disabled audio ignores pause/resume',()=>{const a=make(false);assert.doesNotThrow(()=>{a.pauseMusic();a.resumeMusic()})});
