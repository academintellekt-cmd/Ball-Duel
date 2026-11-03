// Player cabinet: full-screen window opened by tapping a player in the lobby,
// laid out like the Lava Jump station cabinet (player-cabinet.js / guest-design.css).
// Same file in TNT, Lightning, Ball-Duel and Color-Duel.
// Tabs Обзор / Рекорды / Награды / Профиль; data is the server's station profile
// (GET /players/by-bracelet/:uid/profile via the Gateway). Avatars are drawn by
// the customer's avatarSVG() (vendor/avatar-renderer.js).
// Overlay state o = {type:'profile', uid, state:'loading'|'ready'|'error', data?, error?,
//   tab, seg, mode, filter, draft, saving, saveResult, history, confirmExit}.
// click() turns a tap into {overlay} (re-render), {close}, {remove:uid} or {save:{uid,avatar}}.
(function(root){
  const STR={
    en:{overview:'Overview',records:'Records',rewards:'Rewards',profile:'Profile',myOverview:'My overview',myRecords:'My records',myRewards:'My rewards',myProfile:'My profile',level:'Level',toLevel:'To level {n}',free:'Available',inGame:'Game in progress',left:'Left',remaining:'Time left',ofMinutes:'of {n} minutes',notStarted:'starts with the first game',best:'Best result',points:'points',noResults:'No results yet',lastAward:'Latest achievement',noAward:'No achievements yet',reward:'Reward',thisGame:'This attraction',allGames:'All attractions',perAttraction:'Personal records by attraction',here:'● You are here',mode:'Mode',personal:'Personal record',lastTen:'Last 10 attempts',time:'Time',levelCol:'Level',result:'Result',got:'Earned {n} of {t}',all:'All',earned:'Earned',inProgress:'In progress',gotIt:'✓ Earned',styling:'Avatar styling',save:'Save styling',saving:'Saving…',saved:'Styling saved',saveError_locked:'This item is not unlocked yet',saveError_offline:'No connection to the server',saveError_not_found:'No player data',history:'History and statistics',visits:'Park visits',parkTime:'Total time in the park',attractions:'Attractions played',games:'Games',recordsSet:'Records set',firstVisit:'First visit',historyNote:'Your level grows with records at the attractions. New levels and rewards unlock avatar styling.',back:'Back to the team',exit:'Leave',exitQ:'Leave the round?',yes:'Yes',no:'No',loading:'Loading profile…',error_not_found:'No player data',error_offline:'No connection to the server',lvl:'Lv. {n}',
      cat_icon:'Icon',cat_iconColor:'Icon colour',cat_frame:'Frame',cat_frameColor:'Frame colour',cat_background:'Background',cat_halo:'Halo',cat_material:'Material',cat_motion:'Animation',h:'h',m:'min',of:'of'},
    ru:{overview:'Обзор',records:'Рекорды',rewards:'Награды',profile:'Профиль',myOverview:'Мой обзор',myRecords:'Мои рекорды',myRewards:'Мои награды',myProfile:'Мой профиль',level:'Уровень',toLevel:'До уровня {n}',free:'Свободен',inGame:'Идёт игра',left:'Осталось',remaining:'Оставшееся время',ofMinutes:'из {n} минут',notStarted:'время пойдёт с первой игры',best:'Лучший результат',points:'очков',noResults:'Пока нет результатов',lastAward:'Последнее достижение',noAward:'Пока нет достижений',reward:'Награда',thisGame:'Этот аттракцион',allGames:'Все аттракционы',perAttraction:'Личные рекорды по аттракционам',here:'● Вы здесь',mode:'Режим',personal:'Личный рекорд',lastTen:'Последние 10 попыток',time:'Время',levelCol:'Уровень',result:'Результат',got:'Получено {n} из {t}',all:'Все',earned:'Полученные',inProgress:'В процессе',gotIt:'✓ Получено',styling:'Оформление аватара',save:'Сохранить оформление',saving:'Сохраняем…',saved:'Оформление сохранено',saveError_locked:'Этот элемент ещё не открыт',saveError_offline:'Нет связи с сервером',saveError_not_found:'Нет данных об игроке',history:'История и статистика',visits:'Посещений парка',parkTime:'Всего времени в парке',attractions:'Аттракционов пройдено',games:'Игр сыграно',recordsSet:'Рекордов',firstVisit:'Первое посещение',historyNote:'Уровень растёт за рекорды на аттракционах. Новые уровни и награды открывают оформление аватара.',back:'Назад к команде',exit:'Выйти',exitQ:'Выйти из раунда?',yes:'Да',no:'Нет',loading:'Загружаем профиль…',error_not_found:'Нет данных об игроке',error_offline:'Нет связи с сервером',lvl:'Ур. {n}',
      cat_icon:'Значок',cat_iconColor:'Цвет значка',cat_frame:'Рамка',cat_frameColor:'Цвет рамки',cat_background:'Фон',cat_halo:'Ореол',cat_material:'Материал',cat_motion:'Анимация',h:'ч',m:'мин',of:'из'}
  };
  const strings=lang=>({...STR.en,...(STR[lang]||{})});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fill=(t,o)=>String(t).replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');
  const num=n=>Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('ru-RU'):'—';
  const date=t=>{const d=new Date(String(t||'').replace(' ','T')+(/Z|[+-]\d\d:?\d\d$/.test(String(t))?'':'Z'));return Number.isNaN(d.getTime())?null:d};
  const two=n=>String(n).padStart(2,'0');
  const day=t=>{const d=date(t);return d?`${two(d.getDate())}.${two(d.getMonth()+1)}`:''};
  const fullDay=t=>{const d=date(t);return d?`${two(d.getDate())}.${two(d.getMonth()+1)}.${d.getFullYear()}`:'—'};
  const hm=t=>{const d=date(t);return d?`${two(d.getHours())}:${two(d.getMinutes())}`:''};
  const clock=sec=>{sec=Math.max(0,Math.floor(Number(sec)||0));return`${Math.floor(sec/60)}:${two(sec%60)}`};
  const GAMES={tnt:'TNT',lightning:'Lightning','ball-duel':'Ball Duel','color-duel':'Color Duel'};
  const ATTRACTIONS=Object.keys(GAMES).length;
  // Mode/difficulty names for records of the other attractions («Все аттракционы»).
  const MODES={tnt:'TNT',classic:'Классика',replacement:'Замена',independent:'Независимый',duel:'Дуэль',colorMatch:'Цвет в цвет',colorSequence:'Последовательность',paint:'Раскраска',catchColor:'Поймай цвет',intersection:'Пересечение',pong:'Понг',free:'Свободный',targets:'Мишени',values:'Номиналы',combination:'Комбинация',rhythm:'Ритм',pingPong:'Пинг-понг',colorRing:'Цветное кольцо'};
  const DIFFS={easy:'Лёгкий',normal:'Обычный',medium:'Средний',hard:'Сложный',veryHard:'Очень сложный',extreme:'Экстрим'};
  function genericLabel(r){const[diff,mins]=String(r.level_id||'').split(':');const parts=[MODES[String(r.mode_id).split(':')[0]]||r.mode_id];if(diff&&diff!=='-')parts.push(DIFFS[diff]||diff);if(mins&&mins!=='-')parts.push(`${mins} мин`);return parts.join(' · ')}
  const diffOf=r=>{const d=String(r.level_id||'').split(':')[0];return d&&d!=='-'?DIFFS[d]||d:'—'};
  const AV_DEFAULT={icon:'bolt',frame:'hex',background:'plain',halo:'spark',material:'solid',motion:'none',iconColor:'#fe7800',frameColor:'#fe7800'};
  // Editor rows: avatar key -> catalog category.
  const CATS=[['icon','icons'],['iconColor','colors'],['frame','frames'],['frameColor','colors'],['background','backgrounds'],['halo','halos'],['material','materials'],['motion','motion']];
  const TABS=[['overview','home'],['records','bars'],['rewards','medal'],['profile','sliders']];
  // Line icons from the Lava Jump cabinet (24x24, stroked; a few are filled).
  const PATHS={home:'m2 11 10-9 10 9v11h-7v-8H9v8H2z',bars:'M3 14h4v8H3zm7-6h4v14h-4zm7-6h4v20h-4z',medal:'m6 2 4 6h4l4-6M19 15a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-7-4 1 3 3 0-2 2 1 3-3-2-3 2 1-3-2-2h3z',sliders:'M2 5h20M2 12h20M2 19h20M7 2v6m10 1v6M9 16v6',clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v7l4 2',trophy:'M6 3h12v7a6 6 0 0 1-12 0zm0 2H2v4a5 5 0 0 0 5 5M18 5h4v4a5 5 0 0 1-5 5M12 16v5m-5 1h10',back:'m10 5-7 7 7 7M3 12h19',exit:'M10 3H3v18h7m5-15 6 6-6 6m-6-6h12',lock:'M5 10h14v12H5zm3 0V6a4 4 0 0 1 8 0v4',down:'m4 8 8 8 8-8',up:'m4 16 8-8 8 8'};
  const FILLED=new Set(['home','bars']);
  const icon=name=>`<svg class="cab-i" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[name]}" fill="${FILLED.has(name)?'currentColor':'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // Customer renderer; '' when it is missing or the config has an unknown item.
  function avatar(cfg,cls='cab-avatar'){
    if(!cfg||typeof cfg!=='object'||typeof root.avatarSVG!=='function')return'';
    try{return`<span class="${cls}">${root.avatarSVG({...AV_DEFAULT,...cfg})}</span>`}catch{return''}
  }
  const savedAvatar=o=>({...AV_DEFAULT,...(o.data?.avatar||o.player?.avatar||{})});
  const draftOf=o=>({...savedAvatar(o),...(o.draft||{})});
  const sameAvatar=(a,b)=>CATS.every(([k])=>String(a[k]).toLowerCase()===String(b[k]).toLowerCase());

  function itemsOf(d,cat){const c=d.catalog||{};return cat==='colors'?(c.colors||[]).map(x=>({...x,category:'colors'})):(c.items||[]).filter(x=>x.category===cat)}
  const valueOf=(item,key)=>key.endsWith('Color')?item.value:item.id;
  function lockOf(d,item){
    if(Number(item.unlockLevel)<=Number(d.level)||(d.unlocked||[]).includes(`${item.category}:${item.id}`))return null;
    const by=(d.achievements||[]).find(a=>a.reward?.category===item.category&&a.reward?.id===item.id);
    return{level:item.unlockLevel,by:by?.name||null};
  }

  // Paid time counts down on screen: the end moment is fixed when the profile arrives.
  function remaining(d){
    if(!d.time_started)return Math.max(0,Number(d.remaining_seconds)||0);
    if(!d._endsAt)d._endsAt=Date.now()+Math.max(0,Number(d.remaining_seconds)||0)*1000;
    return Math.max(0,Math.round((d._endsAt-Date.now())/1000));
  }
  const timeTag=d=>{const left=remaining(d);return`<b data-cab-time="${d.time_started?d._endsAt:''}">${clock(left)}</b>`};
  let ticker=null;
  function tick(){
    if(typeof document==='undefined')return;
    const els=document.querySelectorAll('[data-cab-time]');
    for(const el of els){const end=Number(el.dataset.cabTime);if(end)el.textContent=clock(Math.max(0,Math.round((end-Date.now())/1000)))}
    if(!els.length){clearInterval(ticker);ticker=null}
  }

  function identity(o,s,ctx){
    const d=o.data,player=ctx.player||{},tab=o.tab||'overview';
    const pct=d?Math.max(0,Math.min(100,Math.round(100*Number(d.xp_in_level||0)/Math.max(1,Number(d.needed_xp||1))))):0;
    const pic=avatar(tab==='profile'&&d?draftOf(o):d?.avatar||player.avatar)||ctx.fallbackAvatar||'';
    return`<section class="cab-identity">${pic}<div class="cab-identity-copy"><h2>${esc(d?.username||player.name||'')}</h2>${d?`<strong>${esc(s.level)} ${num(d.level)}</strong><div class="cab-progress"><i style="width:${pct}%"></i></div><div class="cab-xp-caption"><span>${num(d.xp_in_level)} / ${num(d.needed_xp)} XP</span><span>${esc(fill(s.toLevel,{n:Number(d.level)+1}))} — ${num(d.xp_to_next??(d.needed_xp-d.xp_in_level))} XP</span></div>`:''}</div></section>`;
  }
  const heading=(title,s,d)=>`<header class="cab-panel-heading"><h2>${esc(title)}</h2>${d?`<span class="cab-timer">${icon('clock')}<span>${esc(s.left)} ${timeTag(d)}</span></span>`:''}</header>`;

  function overview(o,s,ctx){
    const d=o.data,recs=d.records||[];
    const best=recs.reduce((a,r)=>!a||Number(r.best_score)>Number(a.best_score)?r:a,null);
    // Ties (earned by one game) go to the later, harder achievement.
    const last=(d.achievements||[]).filter(a=>a.earned).reverse().sort((a,b)=>String(b.earned_at||'').localeCompare(String(a.earned_at||'')))[0];
    const paid=Number(d.paid_seconds)||0,left=remaining(d);
    return`${heading(s.myOverview,s,d)}<div class="cab-highlights"><button data-cab="tab:records">${icon('trophy')}<span>${esc(s.best)}</span>${best?`<strong>${num(best.best_score)}</strong><small>${esc(s.points)} · ${esc(ctx.recordLabel(best))}</small>`:`<strong>—</strong><small>${esc(s.noResults)}</small>`}</button>
      <button data-cab="tab:rewards">${icon('medal')}<span>${esc(s.lastAward)}</span>${last?`<b>${esc(last.name)}</b><small>${esc(last.reward?.name||'')}</small>`:`<b>—</b><small>${esc(s.noAward)}</small>`}</button></div>
      <section class="cab-time">${icon('clock')}<div><span>${esc(s.remaining)}</span>${timeTag(d)}<small>${paid?esc(fill(s.ofMinutes,{n:Math.round(paid/60)})):''}${d.time_started?'':` ${esc(s.notStarted)}`}</small></div>${paid?`<div class="cab-progress big"><i style="width:${Math.round(100*Math.min(1,left/paid))}%"></i></div>`:''}</section>`;
  }

  function recordKeys(d){
    const keys=new Map();
    for(const r of[...(d.records||[]),...(d.attempts||[])]){const k=`${r.mode_id}|${r.level_id}`;if(!keys.has(k))keys.set(k,{mode_id:r.mode_id,level_id:r.level_id})}
    return[...keys.entries()];
  }
  function records(o,s,ctx){
    const d=o.data,seg=o.seg||'this';
    const segs=`<div class="cab-segments">${[['this',s.thisGame],['all',s.allGames]].map(([k,t])=>`<button aria-pressed="${seg===k}" data-cab="seg:${k}">${esc(t)}</button>`).join('')}</div>`;
    if(seg==='all'){
      const by={};for(const r of d.all_records||[])if(!by[r.game_id]||Number(r.best_score)>Number(by[r.game_id].best_score))by[r.game_id]=r;
      const games=[...new Set([ctx.gameId,...Object.keys(GAMES),...Object.keys(by)])].filter(Boolean);
      return`${heading(s.myRecords,s,d)}${segs}<p class="cab-subtitle">${esc(s.perAttraction)}</p><div class="cab-scroll cab-attraction-list">${games.map(g=>{const r=by[g];return`<div class="cab-attraction-record">${icon('trophy')}<span><b>${esc(GAMES[g]||g)}</b><small>${r?esc(g===ctx.gameId?ctx.recordLabel(r):genericLabel(r)):esc(s.noResults)}</small>${g===ctx.gameId?`<em>${esc(s.here)}</em>`:''}</span><span class="cab-attraction-score"><b>${r?num(r.best_score):'—'}</b><small>${r?esc(s.points):''}</small></span></div>`}).join('')}</div>`;
    }
    const keys=recordKeys(d);
    if(!keys.length)return`${heading(s.myRecords,s,d)}${segs}<p class="cab-empty">${esc(s.noResults)}</p>`;
    const[key,meta]=keys.find(([k])=>k===o.mode)||keys[0];
    const rec=(d.records||[]).find(r=>`${r.mode_id}|${r.level_id}`===key);
    const tries=(d.attempts||[]).filter(r=>`${r.mode_id}|${r.level_id}`===key).slice(0,10);
    const top=Math.max(...tries.map(t=>Number(t.score)));
    const modes=keys.length>1?`<div class="cab-mode-chips">${keys.map(([k,m])=>`<button aria-pressed="${k===key}" data-cab="mode:${esc(k)}">${esc(ctx.recordLabel(m))}</button>`).join('')}</div>`:`<strong>${esc(ctx.recordLabel(meta))}</strong>`;
    return`${heading(s.myRecords,s,d)}${segs}<div class="cab-mode">${esc(s.mode)}${modes}</div>
      <div class="cab-record-best">${icon('trophy')}<div><span>${esc(s.personal)}</span><strong>${rec?num(rec.best_score):'—'}</strong><small>${rec?esc(s.points):esc(s.noResults)}</small></div>${rec?`<aside>${esc(diffOf(meta))}<br><small>${esc(day(rec.updated_at))}, ${esc(hm(rec.updated_at))}</small></aside>`:''}</div>
      <h3 class="cab-attempts-heading">${esc(s.lastTen)}</h3><div class="cab-scroll cab-attempts"><table><thead><tr><th>${esc(s.time)}</th><th>${esc(s.levelCol)}</th><th>${esc(s.result)}</th></tr></thead><tbody>${tries.map(t=>`<tr><td>${esc(day(t.created_at))} ${esc(hm(t.created_at))}</td><td>${esc(diffOf(t))}</td><td class="${Number(t.score)===top?'best':''}">${num(t.score)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function rewards(o,s){
    const d=o.data,list=d.achievements||[],f=o.filter||'all';
    const shown=list.filter(a=>f==='all'||(f==='earned')===a.earned);
    return`${heading(s.myRewards,s,d)}<p class="cab-subtitle">${esc(fill(s.got,{n:list.filter(a=>a.earned).length,t:list.length}))}</p>
      <div class="cab-segments">${[['all',s.all],['earned',s.earned],['progress',s.inProgress]].map(([k,t])=>`<button aria-pressed="${f===k}" data-cab="filter:${k}">${esc(t)}</button>`).join('')}</div>
      <div class="cab-scroll cab-reward-grid">${shown.map(a=>`<div class="cab-reward-card ${a.earned?'earned':'locked'}"><div class="cab-reward-art">${icon('medal')}${a.earned?'':icon('lock')}</div><h3>${esc(a.name)}</h3>${a.earned?`<span class="cab-reward-earned">${esc(s.gotIt)}</span>`:`<small>${esc(a.detail)}</small><div class="cab-progress"><i style="width:${Math.round(100*Math.min(1,a.progress/Math.max(1,a.total)))}%"></i></div><small>${num(a.progress)} / ${num(a.total)}</small>`}<small>${esc(a.reward?.name||'')}</small></div>`).join('')}</div>`;
  }

  function choiceRow(d,draft,key,category,s){
    return`<section class="cab-choice"><h3>${esc(s['cat_'+key])}</h3><div class="cab-strip">${itemsOf(d,category).map(item=>{
      const value=valueOf(item,key),lock=lockOf(d,item),on=String(draft[key]).toLowerCase()===String(value).toLowerCase();
      const face=category==='colors'?`<span class="cab-swatch" style="background:${esc(item.value)}"></span>`:avatar({...draft,[key]:item.id},'cab-mini');
      return`<button aria-pressed="${on}" ${lock?'disabled':`data-cab="pick:${key}:${esc(value)}"`} aria-label="${esc(item.name)}">${face}${category==='colors'?'':`<small>${esc(item.name)}</small>`}${lock?`<span class="cab-lock">${icon('lock')}${esc(lock.by||fill(s.lvl,{n:lock.level}))}</span>`:''}<span class="cab-check">✓</span></button>`}).join('')}</div></section>`;
  }
  function profileTab(o,s){
    const d=o.data,draft=draftOf(o),changed=!sameAvatar(draft,savedAvatar(o));
    const msg=o.saving?s.saving:o.saveResult==='ok'?s.saved:o.saveResult?s['saveError_'+o.saveResult]||s.saveError_offline:'';
    const st=d.stats||{},hours=Math.floor(Number(st.park_seconds||0)/3600),mins=Math.round(Number(st.park_seconds||0)%3600/60);
    const editor=o.history?'':`<div class="cab-editor"><h3>${esc(s.styling)}</h3><div class="cab-scroll cab-choices">${CATS.map(([k,c])=>choiceRow(d,draft,k,c,s)).join('')}</div>
      <button class="cab-save" data-cab="save" ${changed&&!o.saving?'':'disabled'}>${esc(o.saving?s.saving:s.save)}</button>${msg?`<p class="cab-save-notice ${o.saveResult&&o.saveResult!=='ok'?'error':''}">${esc(msg)}</p>`:''}</div>`;
    const history=o.history?`<div class="cab-scroll cab-history">${[[num(st.visits),s.visits],[hours?`${hours} ${s.h} ${mins} ${s.m}`:`${mins} ${s.m}`,s.parkTime],[`${num(st.attractions)} ${s.of} ${ATTRACTIONS}`,s.attractions],[fullDay(st.first_visit),s.firstVisit],[num(st.games),s.games],[num(st.records),s.recordsSet]].map(([v,k])=>`<div><strong>${esc(v)}</strong><span>${esc(k)}</span></div>`).join('')}<p>${esc(s.historyNote)}</p></div>`:'';
    return`${heading(s.myProfile,s,d)}${editor}<button class="cab-history-toggle" data-cab="history" aria-expanded="${!!o.history}">${icon('clock')}<span>${esc(s.history)}</span>${icon(o.history?'up':'down')}</button>${history}`;
  }

  // ctx = {lang, session, gameId, gameName, player, fallbackAvatar, recordLabel(r)}
  function html(o,ctx){
    const s=strings(ctx.lang),tab=TABS.some(([t])=>t===o.tab)?o.tab:'overview',ready=o.state==='ready'&&!!o.data;
    ctx={...ctx,recordLabel:ctx.recordLabel||genericLabel};
    let body;
    if(o.state==='loading')body=`<p class="cab-empty">${esc(s.loading)}</p>`;
    else if(!ready)body=`<p class="cab-empty">${esc(s['error_'+(o.error||'offline')]||s.error_offline)}</p>`;
    else body=tab==='records'?records(o,s,ctx):tab==='rewards'?rewards(o,s):tab==='profile'?profileTab(o,s):overview(o,s,ctx);
    const tabs=ready?`<nav class="cab-tabs">${TABS.map(([t,i])=>`<button aria-pressed="${t===tab}" data-cab="tab:${t}">${icon(i)}<span>${esc(s[t])}</span></button>`).join('')}</nav>`:'';
    const confirm=o.confirmExit?`<div class="cab-dialog-backdrop"><div class="cab-dialog"><h2>${esc(s.exitQ)}</h2><div class="cab-dialog-actions"><button data-cab="exit-yes">${esc(s.yes)}</button><button class="secondary" data-cab="exit-no">${esc(s.no)}</button></div></div></div>`:'';
    if(ready&&o.data.time_started&&!ticker&&typeof setInterval==='function'&&typeof document!=='undefined')ticker=setInterval(tick,1000);
    return`<div class="cab-screen" data-cab-screen><div class="cab-attraction"><p class="${ctx.session?'busy':''}">● ${esc(ctx.session?s.inGame:s.free)}</p><h1>${esc(ctx.gameName||GAMES[ctx.gameId]||'')}</h1></div>
      ${identity(o,s,ctx)}<main class="cab-main cab-tab-${tab}">${body}</main>${tabs}
      <footer class="cab-footer"><button class="cab-back" data-cab="back">${icon('back')}${esc(s.back)}</button>${ctx.session?'':`<button data-cab="exit">${icon('exit')}${esc(s.exit)}</button>`}</footer>${confirm}</div>`;
  }

  function click(target,o){
    const el=target.closest('[data-cab]');if(!el||el.disabled)return target.closest('[data-cab-screen]')?{overlay:o}:null;
    const[act,...rest]=el.dataset.cab.split(':'),arg=rest.join(':');
    if(act==='tab')return{overlay:{...o,tab:arg,confirmExit:false}};
    if(act==='seg')return{overlay:{...o,seg:arg}};
    if(act==='mode')return{overlay:{...o,mode:arg}};
    if(act==='filter')return{overlay:{...o,filter:arg}};
    if(act==='pick'){const i=arg.indexOf(':');return{overlay:{...o,draft:{...(o.draft||{}),[arg.slice(0,i)]:arg.slice(i+1)},saveResult:null}}}
    if(act==='history')return{overlay:{...o,history:!o.history}};
    if(act==='save'){if(o.saving)return{overlay:o};return{overlay:{...o,saving:true,saveResult:null},save:{uid:o.uid,avatar:draftOf(o)}}}
    if(act==='back')return{close:true};
    if(act==='exit')return{overlay:{...o,confirmExit:true}};
    if(act==='exit-no')return{overlay:{...o,confirmExit:false}};
    if(act==='exit-yes')return{remove:o.uid};
    return{overlay:o};
  }

  // Gateway answer to avatar_save: {avatar} on success, {error} otherwise.
  function saved(o,e){
    if(e.avatar)return{...o,saving:false,saveResult:'ok',draft:null,data:o.data?{...o.data,avatar:e.avatar}:o.data};
    return{...o,saving:false,saveResult:e.error||'offline'};
  }

  const api={html,click,saved,avatar,strings};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StrivexCabinet=api;
})(typeof window!=='undefined'?window:globalThis);
