// Player cabinet (public/cabinet.js): tabs, records, rewards, avatar editor and taps.
const assert=require('assert');
const path=require('path');
const fs=require('fs');
const pub=['public','Game/public'].map(p=>path.join(__dirname,'..',p)).find(p=>fs.existsSync(path.join(p,'cabinet.js')));
global.avatarSVG=a=>`<svg class="avatar" data-icon="${a.icon}" data-halo="${a.halo}"></svg>`;
const C=require(path.join(pub,'cabinet.js'));
// ru-RU number grouping uses a no-break space.
const html=(...a)=>C.html(...a).replace(/[\u00a0\u202f]/g,' ');

const data={uid:'B1',username:'Алекс',avatar:{icon:'bolt',halo:'spark'},paid_seconds:3600,level:2,total_xp:350,xp_in_level:50,needed_xp:400,xp_to_next:350,time_started:false,remaining_seconds:1800,
  records:[{mode_id:'tnt',level_id:'hard',best_score:5526,updated_at:'2026-11-03 09:00:00'}],
  all_records:[{game_id:'tnt',mode_id:'tnt',level_id:'hard',best_score:5526},{game_id:'color-duel',mode_id:'rhythm',level_id:'easy:2',best_score:40}],
  attempts:[{mode_id:'tnt',level_id:'hard',score:5526,is_record:1,created_at:'2026-11-03 09:00:00'},{mode_id:'tnt',level_id:'hard',score:4000,is_record:0,created_at:'2026-11-03 08:00:00'}],
  achievements:[{id:'first_game',name:'Первая игра',detail:'Сыграй в любую игру.',progress:1,total:1,earned:true,earned_at:'2026-11-03 09:00:00',reward:{category:'colors',id:'violet',name:'Цвет «Фиолетовый»'}},
    {id:'hard_record',name:'На высоте',detail:'Рекорд на сложном.',progress:1,total:1,earned:true,earned_at:'2026-11-03 09:00:00',reward:{category:'halos',id:'neon',name:'Ореол «Неон»'}},
    {id:'explorer',name:'Исследователь',detail:'Все четыре.',progress:1,total:4,earned:false,earned_at:null,reward:{category:'icons',id:'target',name:'Значок «Мишень»'}}],
  unlocked:['colors:violet','halos:neon'],stats:{visits:2,park_seconds:5400,games:3,attractions:1,records:1,first_visit:'2026-11-01 10:00:00'},
  catalog:{colors:[{id:'orange',name:'Оранжевый',value:'#fe7800',unlockLevel:1}],items:[{category:'halos',id:'spark',name:'Искра',unlockLevel:1},{category:'halos',id:'neon',name:'Неон',unlockLevel:10},{category:'halos',id:'fire',name:'Огонь',unlockLevel:20},{category:'icons',id:'target',name:'Мишень',unlockLevel:3}]}};
const ctx={lang:'ru',session:false,gameId:'tnt',gameName:'TNT',player:{uid:'B1',name:'Алекс'},recordLabel:r=>`TNT ${r.level_id}`};
const open={type:'profile',uid:'B1',state:'ready',data};
const tap=(o,cab)=>C.click({closest:sel=>sel==='[data-cab]'?{dataset:{cab},disabled:false}:null},o);

let h=html({type:'profile',uid:'B1',state:'loading'},ctx);
assert(h.includes('Загружаем профиль'),'loading state');
assert(h.includes('Назад к команде')&&h.includes('Выйти'));
h=html(open,ctx);
assert(h.includes('Уровень 2')&&h.includes('50 / 400 XP')&&h.includes('До уровня 3 — 350 XP'),'player card');
assert(h.includes('30:00')&&h.includes('время пойдёт с первой игры'),'paid time before the first game');
assert(h.includes('5 526'),'best result');
assert(h.includes('Мой обзор')&&h.includes('Последнее достижение')&&h.includes('Ореол «Неон»'),'latest achievement is the later one of a tie');
assert.strictEqual((h.match(/aria-pressed="(true|false)" data-cab="tab:/g)||[]).length,4,'four tabs');
assert(!html(open,{...ctx,session:true}).includes('data-cab="exit"'),'no leave button during a game');

let o=tap(open,'tab:records').overlay;h=html(o,ctx);
assert(h.includes('Личный рекорд')&&h.includes('Последние 10 попыток')&&h.includes('4 000')&&h.includes('<td class="best">5 526'),'records tab marks the best attempt');
h=html(tap(o,'seg:all').overlay,ctx);
assert(h.includes('Color Duel')&&h.includes('Ритм · Лёгкий · 2 мин'),'all attractions use built-in names');

h=html(tap(open,'tab:rewards').overlay,ctx);
assert(h.includes('Получено 2 из 3')&&h.includes('1 / 4'),'rewards tab');
h=html({...tap(open,'tab:rewards').overlay,filter:'progress'},ctx);
assert(h.includes('Исследователь')&&!h.includes('Первая игра'),'in-progress filter');

o={...open,tab:'profile',cat:'halo'};h=html(o,ctx);
assert(h.includes('data-cab="pick:halo:neon"'),'achievement reward is pickable before its level');
assert(!h.includes('pick:halo:fire')&&h.includes('Ур. 20'),'locked item shows its level');
assert(/data-cab="save" disabled/.test(h),'save disabled until something changes');
o=tap(o,'pick:halo:neon').overlay;
assert(!/data-cab="save" disabled/.test(html(o,ctx)),'save enabled after a change');
const r=tap(o,'save');
assert.strictEqual(r.save.uid,'B1');assert.strictEqual(r.save.avatar.halo,'neon');assert.strictEqual(r.save.avatar.icon,'bolt');
assert(r.overlay.saving);
o=C.saved(r.overlay,{uid:'B1',avatar:{icon:'bolt',halo:'neon'}});
assert.strictEqual(o.data.avatar.halo,'neon');assert(html(o,ctx).includes('Оформление сохранено'));
assert.strictEqual(C.saved(r.overlay,{uid:'B1',error:'locked'}).saveResult,'locked');
h=html({...open,tab:'profile',history:true},ctx);
assert(h.includes('1 ч 30 мин')&&h.includes('1 из 4')&&!h.includes('data-cab="save"'),'history replaces the editor');

assert.deepStrictEqual(tap(open,'back'),{close:true});
assert(tap(open,'exit').overlay.confirmExit);
assert.deepStrictEqual(tap(open,'exit-yes'),{remove:'B1'});
assert.strictEqual(C.click({closest:()=>null},open),null,'taps outside the cabinet are not its own');
assert(C.avatar({icon:'nope'},'x').includes('data-icon="nope"'));
global.avatarSVG=()=>{throw new Error('unknown')};
assert.strictEqual(C.avatar({icon:'nope'}),'','unknown item falls back');
console.log('cabinet tests passed');
