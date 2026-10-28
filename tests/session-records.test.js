const assert=require('assert');
const R=require('../lib/session-records');

// Records key on mode + difficulty + round time; each player keeps their own best.
const key=r=>({mode_id:r.mode,level_id:R.levelId(r.difficulty,r.durationMinutes),difficulty:r.difficulty||null});
assert.strictEqual(R.levelId('easy',2),'easy:2');
assert.strictEqual(R.levelId(null,1),'-:1');
assert.deepStrictEqual(R.bestRecords(['A','B'],[
  {mode:'m1',difficulty:'easy',durationMinutes:1,scores:[10,30]},
  {mode:'m1',difficulty:'easy',durationMinutes:1,scores:[25,5]},
  {mode:'m1',difficulty:'easy',durationMinutes:3,scores:[90,80]},
  {mode:'m2',difficulty:null,durationMinutes:1,scores:[4,0]},
],'game',key),[
  {ic:'A',game_id:'game',mode_id:'m1',level_id:'easy:1',difficulty:'easy',score:25},
  {ic:'B',game_id:'game',mode_id:'m1',level_id:'easy:1',difficulty:'easy',score:30},
  {ic:'A',game_id:'game',mode_id:'m1',level_id:'easy:3',difficulty:'easy',score:90},
  {ic:'B',game_id:'game',mode_id:'m1',level_id:'easy:3',difficulty:'easy',score:80},
  {ic:'A',game_id:'game',mode_id:'m2',level_id:'-:1',difficulty:null,score:4},
  {ic:'B',game_id:'game',mode_id:'m2',level_id:'-:1',difficulty:null,score:0},
]);
assert.deepStrictEqual(R.bestRecords(['A',null],[{mode:'m',difficulty:'hard',durationMinutes:1,scores:[5,7]}],'game',key).map(r=>r.ic),['A'],'a seat without a bracelet is left out');
assert.deepStrictEqual(R.bestRecords(['A','B'],[],'game',key),[],'no rounds -> no records');
assert.deepStrictEqual(R.bestRecords(['A','B'],[{mode:'m',scores:[5,7]}],'game',()=>null),[],'rounds the key skips are left out');
console.log('session-records tests passed');
