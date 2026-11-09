const test=require('node:test');const assert=require('node:assert/strict');
global.LobbyOptions=require('../lib/lobby-options');
const{scanRoute}=require('../lib/scan-route');const L=require('../public/lobby');
const denied=reason=>({type:'scan',state:'denied',reason});
test('session active, lobby phase: a denied tap is a note, never a modal or an overlay change',()=>{
  for(const reason of['busy','reserved','unregistered','expired','offline','blocked',undefined]){
    const r=scanRoute(denied(reason),{phase:'lobby',sessionId:'S1',queue:null,overlayType:'profile'});
    assert.equal(r.overlay,undefined,`no overlay for ${reason}`);assert.equal(r.note,reason||'unregistered');
  }
});
test('session active, any other phase: still a note',()=>{
  for(const phase of['game','countdown','gameover','results','leaderboard','confirm'])assert.deepEqual(scanRoute(denied('busy'),{phase,sessionId:'S1',queue:null}),{note:'busy'});
});
test('session active: checking never opens the overlay',()=>{assert.equal(scanRoute({type:'scan',state:'checking'},{phase:'lobby',sessionId:'S1',queue:null,overlayType:null}),null)});
test('busy while a queue exists reads as reserved',()=>{assert.deepEqual(scanRoute(denied('busy'),{phase:'lobby',sessionId:'S1',queue:{state:'waiting'}}),{note:'reserved'})});
test('no session, fresh lobby: denial still opens the denied modal; checking only over nothing/checking',()=>{
  assert.deepEqual(scanRoute(denied('expired'),{phase:'lobby',sessionId:null,queue:null,overlayType:'rules'}),{overlay:{type:'denied',reason:'expired'},autoCloseMs:5000});
  assert.deepEqual(scanRoute(denied(),{phase:'lobby',sessionId:null,queue:null}),{overlay:{type:'denied',reason:'unregistered'},autoCloseMs:5000});
  assert.deepEqual(scanRoute({type:'scan',state:'checking'},{phase:'lobby',sessionId:null,queue:null,overlayType:null}),{overlay:{type:'checking'},autoCloseMs:5000});
  assert.equal(scanRoute({type:'scan',state:'checking'},{phase:'lobby',sessionId:null,queue:null,overlayType:'rules'}),null);
});
test('the note is drawn inside the in-session lobby queue strip, in every queue state',()=>{
  const base={lang:'en',players:[],max:2,remainingSec:null,canOpen:false};
  const view=q=>({lang:'en',players:[{uid:'A',name:'Ann'},{uid:'B',name:'Bob'}],max:2,selection:LobbyOptions.defaultSelection('free',[1,2,3]),options:LobbyOptions.modeOptions('free',[1,2,3]),names:{modes:{},difficulties:{},minute:'min'},check:{ok:true},session:true,remainingSec:300,connected:true,queue:q,overlay:null,rules:null});
  for(const state of['none','collecting','waiting','reserved']){
    const h=L.html(view({...base,state,note:'unregistered'}));
    assert(h.includes('lobby-queue-note')&&h.includes('This wristband is not in the system'),`note visible in ${state}`);
    assert(!h.includes('lobby-modal'),'no modal');
  }
  assert(L.html(view({...base,state:'none',note:'offline'})).includes('Cannot reach the server'),'offline maps to offline_scan');
  assert(!L.html(view({...base,state:'none'})).includes('lobby-queue-note'),'no note, no element');
});
