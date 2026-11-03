// Player cabinet (Lava Jump cabinet look): full-screen window opened by tapping a
// player in the lobby. Same file in TNT, Lightning, Ball-Duel and Color-Duel.
// Tabs Обзор / Рекорды / Награды / Профиль; data is the server's station profile
// (GET /players/by-bracelet/:uid/profile via the Gateway). Avatars are drawn by
// the customer's avatarSVG() (vendor/avatar-renderer.js).
// Overlay state o = {type:'profile', uid, state:'loading'|'ready'|'error', data?, error?,
//   tab, seg, mode, filter, cat, draft, saving, saveResult, history, confirmExit}.
// click() turns a tap into {overlay} (re-render), {close}, {remove:uid} or {save:{uid,avatar}}.
(function(root){
  const STR={
    en:{overview:'Overview',records:'Records',rewards:'Rewards',profile:'Profile',level:'Level',toLevel:'To level {n}',inLobby:'In the lobby',inGame:'Game in progress',left:'Time left',notStarted:'starts with the first game',best:'Best result',noBest:'Play your first game to set a record',lastAward:'Latest achievement',noAward:'No achievements yet',nextAward:'Next reward',reward:'Reward',thisGame:'This attraction',allGames:'All attractions',personal:'Personal record',lastTen:'Last 10 attempts',time:'Time',result:'Result',record:'Record',noRecords:'No records yet',got:'Earned {n} of {t}',all:'All',earned:'Earned',inProgress:'In progress',earnedOn:'Earned {d}',styling:'Avatar styling',save:'Save styling',saving:'Saving…',saved:'Styling saved',saveError_locked:'This item is not unlocked yet',saveError_offline:'No connection to the server',saveError_not_found:'No player data',history:'History and statistics',visits:'Visits',parkTime:'Time in the park',attractions:'Attractions played',games:'Games',recordsSet:'Records set',firstVisit:'First visit',back:'Back to the team',exit:'Leave',exitQ:'Leave the round?',yes:'Yes',no:'No',loading:'Loading profile…',error_not_found:'No player data',error_offline:'No connection to the server',lvl:'Lv. {n}',
      cat_icon:'Icon',cat_iconColor:'Icon colour',cat_frame:'Frame',cat_frameColor:'Frame colour',cat_background:'Background',cat_halo:'Halo',cat_material:'Material',cat_motion:'Animation',h:'h',m:'min'},
    ru:{overview:'Обзор',records:'Рекорды',rewards:'Награды',profile:'Профиль',level:'Уровень',toLevel:'До уровня {n}',inLobby:'В лобби',inGame:'Идёт игра',left:'Осталось',notStarted:'время пойдёт с первой игры',best:'Лучший результат',noBest:'Сыграйте первую игру, чтобы установить рекорд',lastAward:'Последнее достижение',noAward:'Достижений пока нет',nextAward:'Ближайшая награда',reward:'Награда',thisGame:'Этот аттракцион',allGames:'Все аттракционы',personal:'Личный рекорд',lastTen:'Последние 10 попыток',time:'Время',result:'Результат',record:'Рекорд',noRecords:'Рекордов пока нет',got:'Получено {n} из {t}',all:'Все',earned:'Полученные',inProgress:'В процессе',earnedOn:'Получено {d}',styling:'Оформление аватара',save:'Сохранить оформление',saving:'Сохраняем…',saved:'Оформление сохранено',saveError_locked:'Этот элемент ещё не открыт',saveError_offline:'Нет связи с сервером',saveError_not_found:'Нет данных об игроке',history:'История и статистика',visits:'Визиты',parkTime:'Время в парке',attractions:'Аттракционов сыграно',games:'Игр',recordsSet:'Рекордов',firstVisit:'Первый визит',back:'Назад к команде',exit:'Выйти',exitQ:'Выйти из раунда?',yes:'Да',no:'Нет',loading:'Загружаем профиль…',error_not_found:'Нет данных об игроке',error_offline:'Нет связи с сервером',lvl:'Ур. {n}',
      cat_icon:'Значок',cat_iconColor:'Цвет значка',cat_frame:'Рамка',cat_frameColor:'Цвет рамки',cat_background:'Фон',cat_halo:'Ореол',cat_material:'Материал',cat_motion:'Анимация',h:'ч',m:'мин'}
  };
  const strings=lang=>({...STR.en,...(STR[lang]||{})});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fill=(t,o)=>String(t).replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');
  const num=n=>Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('ru-RU'):'—';
  const date=t=>{const d=new Date(String(t||'').replace(' ','T')+(/Z|[+-]\d\d:?\d\d$/.test(String(t))?'':'Z'));return Number.isNaN(d.getTime())?null:d};
  const two=n=>String(n).padStart(2,'0');
  const day=t=>{const d=date(t);return d?`${two(d.getDate())}.${two(d.getMonth()+1)}`:''};
  const hm=t=>{const d=date(t);return d?`${two(d.getHours())}:${two(d.getMinutes())}`:''};
  const clock=sec=>{sec=Math.max(0,Math.floor(Number(sec)||0));return`${Math.floor(sec/60)}:${two(sec%60)}`};
  const GAMES={tnt:'TNT',lightning:'Lightning','ball-duel':'Ball Duel','color-duel':'Color Duel'};
  const ATTRACTIONS=Object.keys(GAMES).length;
  // Mode/difficulty names for records of the other attractions («Все аттракционы»).
  const MODES={tnt:'TNT',classic:'Классика',replacement:'Замена',independent:'Независимый',duel:'Дуэль',colorMatch:'Цвет в цвет',colorSequence:'Последовательность',paint:'Раскраска',catchColor:'Поймай цвет',intersection:'Пересечение',pong:'Понг',free:'Свободный',targets:'Мишени',values:'Номиналы',combination:'Комбинация',rhythm:'Ритм',pingPong:'Пинг-понг',colorRing:'Цветное кольцо'};
  const DIFFS={easy:'Лёгкий',normal:'Обычный',medium:'Средний',hard:'Сложный',veryHard:'Очень сложный',extreme:'Экстрим'};
  function genericLabel(r){const[diff,mins]=String(r.level_id||'').split(':');const parts=[MODES[String(r.mode_id).split(':')[0]]||r.mode_id];if(diff&&diff!=='-')parts.push(DIFFS[diff]||diff);if(mins&&mins!=='-')parts.push(`${mins} мин`);return parts.join(' · ')}
  const AV_DEFAULT={icon:'bolt',frame:'hex',background:'plain',halo:'spark',material:'solid',motion:'none',iconColor:'#fe7800',frameColor:'#fe7800'};
  // Editor rows: avatar key -> catalog category.
  const CATS=[['icon','icons'],['iconColor','colors'],['frame','frames'],['frameColor','colors'],['background','backgrounds'],['halo','halos'],['material','materials'],['motion','motion']];
  const TABS=['overview','records','rewards','profile'];
  const ICON={
    trophy:'<path d="M7 3h10v3h3v2a5 5 0 0 1-5 5h-.3A5 5 0 0 1 13 15v3h3v3H8v-3h3v-3a5 5 0 0 1-1.7-2H9a5 5 0 0 1-5-5V6h3zm0 5H6a3 3 0 0 0 1 2.2zm10 0v2.2A3 3 0 0 0 18 8z"/>',
    check:'<path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.6"/>',
    lock:'<path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"/>',
    chevron:'<path d="m8 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/>'
  };
  const svg=(body,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}</svg>`;

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

  function card(o,s,ctx){
    const d=o.data,player=ctx.player||{};
    const pct=d?Math.max(0,Math.min(100,Math.round(100*Number(d.xp_in_level||0)/Math.max(1,Number(d.needed_xp||1))))):0;
    const pic=avatar(d?.avatar||player.avatar)||ctx.fallbackAvatar||'';
    return`<div class="cab-card">${pic}<div class="cab-id"><h2>${esc(d?.username||player.name||'')}</h2>${d?`<div class="cab-level">${esc(s.level)} ${num(d.level)}</div><div class="cab-xp"><i style="width:${pct}%"></i></div><div class="cab-xp-text"><span>${num(d.xp_in_level)} / ${num(d.needed_xp)} XP</span><span>${esc(fill(s.toLevel,{n:Number(d.level)+1}))} — ${num(d.xp_to_next??(d.needed_xp-d.xp_in_level))} XP</span></div>`:''}</div></div>`;
  }

  function overview(o,s,ctx){
    const d=o.data,recs=d.records||[];
    const best=recs.reduce((a,r)=>!a||Number(r.best_score)>Number(a.best_score)?r:a,null);
    // Ties (earned by one game) go to the later, harder achievement.
    const earned=(d.achievements||[]).filter(a=>a.earned).reverse().sort((a,b)=>String(b.earned_at||'').localeCompare(String(a.earned_at||'')));
    const next=(d.achievements||[]).filter(a=>!a.earned).sort((a,b)=>b.progress/b.total-a.progress/a.total)[0];
    const last=earned[0];
    return`<div class="cab-tile cab-time"><span>${esc(s.left)}</span><b>${clock(d.remaining_seconds)}</b>${d.time_started?'':`<small>${esc(s.notStarted)}</small>`}</div>
      <div class="cab-tile"><h3>${esc(s.best)}</h3>${best?`<div class="cab-score">${num(best.best_score)}</div><small>${esc(ctx.recordLabel(best))} · ${esc(day(best.updated_at))}</small>`:`<p class="cab-note">${esc(s.noBest)}</p>`}</div>
      <div class="cab-tile"><h3>${esc(s.lastAward)}</h3>${last?award(last,s,true):`<p class="cab-note">${esc(s.noAward)}</p>`}</div>
      ${next?`<div class="cab-tile"><h3>${esc(s.nextAward)}</h3>${award(next,s,true)}</div>`:''}`;
  }

  function recordKeys(d){
    const keys=new Map();
    for(const r of[...(d.records||[]),...(d.attempts||[])]){const k=`${r.mode_id}|${r.level_id}`;if(!keys.has(k))keys.set(k,{mode_id:r.mode_id,level_id:r.level_id})}
    return[...keys.entries()];
  }
  function records(o,s,ctx){
    const d=o.data,seg=o.seg||'this';
    const segs=`<div class="cab-seg">${[['this',s.thisGame],['all',s.allGames]].map(([k,t])=>`<button class="${seg===k?'active':''}" data-cab="seg:${k}">${esc(t)}</button>`).join('')}</div>`;
    if(seg==='all'){
      const by={};for(const r of d.all_records||[])(by[r.game_id]=by[r.game_id]||[]).push(r);
      const games=Object.keys(by);
      return segs+(games.length?games.map(g=>`<div class="cab-tile"><h3>${esc(GAMES[g]||g)}</h3><ul class="cab-list">${by[g].map(r=>`<li><span>${esc(g===ctx.gameId?ctx.recordLabel(r):genericLabel(r))}</span><b>${num(r.best_score)}</b></li>`).join('')}</ul></div>`).join(''):`<p class="cab-note">${esc(s.noRecords)}</p>`);
    }
    const keys=recordKeys(d);if(!keys.length)return segs+`<p class="cab-note">${esc(s.noRecords)}</p>`;
    const cur=keys.find(([k])=>k===o.mode)||keys[0],[key,meta]=cur;
    const rec=(d.records||[]).find(r=>`${r.mode_id}|${r.level_id}`===key);
    const tries=(d.attempts||[]).filter(r=>`${r.mode_id}|${r.level_id}`===key).slice(0,10);
    return segs+`<div class="cab-chips">${keys.map(([k,m])=>`<button class="${k===key?'active':''}" data-cab="mode:${esc(k)}">${esc(ctx.recordLabel(m))}</button>`).join('')}</div>
      <div class="cab-tile"><h3>${esc(s.personal)}</h3>${rec?`<div class="cab-score">${num(rec.best_score)}</div><small>${esc(ctx.recordLabel(meta))} · ${esc(day(rec.updated_at))}</small>`:`<p class="cab-note">${esc(s.noRecords)}</p>`}</div>
      <div class="cab-tile"><h3>${esc(s.lastTen)}</h3><table class="cab-table"><thead><tr><th>${esc(s.time)}</th><th>${esc(s.result)}</th><th></th></tr></thead><tbody>${tries.map(t=>`<tr><td>${esc(day(t.created_at))} ${esc(hm(t.created_at))}</td><td><b>${num(t.score)}</b></td><td>${t.is_record?`<span class="cab-badge">${esc(s.record)}</span>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function award(a,s,compact){
    const pct=Math.round(100*Math.min(1,a.progress/Math.max(1,a.total)));
    return`<div class="cab-award ${a.earned?'earned':''} ${compact?'compact':''}"><div class="cab-award-icon">${svg(a.earned?ICON.check:ICON.trophy)}</div><div class="cab-award-body"><b>${esc(a.name)}</b><small>${esc(a.detail)}</small><span class="cab-award-reward">${esc(s.reward)}: ${esc(a.reward?.name||'')}</span>
      ${a.earned?`<span class="cab-award-done">${esc(fill(s.earnedOn,{d:day(a.earned_at)||''}).trim())}</span>`:`<div class="cab-xp small"><i style="width:${pct}%"></i></div><span class="cab-award-count">${num(a.progress)} / ${num(a.total)}</span>`}</div></div>`;
  }
  function rewards(o,s){
    const list=o.data.achievements||[],f=o.filter||'all';
    const shown=list.filter(a=>f==='all'||(f==='earned')===a.earned);
    return`<div class="cab-got">${esc(fill(s.got,{n:list.filter(a=>a.earned).length,t:list.length}))}</div>
      <div class="cab-seg">${[['all',s.all],['earned',s.earned],['progress',s.inProgress]].map(([k,t])=>`<button class="${f===k?'active':''}" data-cab="filter:${k}">${esc(t)}</button>`).join('')}</div>
      <div class="cab-awards">${shown.map(a=>award(a,s,false)).join('')}</div>`;
  }

  function profileTab(o,s){
    const d=o.data,draft=draftOf(o),cat=o.cat||'icon',category=(CATS.find(([k])=>k===cat)||CATS[0])[1];
    const opts=itemsOf(d,category).map(item=>{
      const value=valueOf(item,cat),lock=lockOf(d,item),active=String(draft[cat]).toLowerCase()===String(value).toLowerCase();
      const face=category==='colors'?`<i class="cab-swatch" style="background:${esc(item.value)}"></i>`:avatar({...draft,[cat]:item.id},'cab-option-avatar');
      return`<button class="cab-option ${active?'active':''} ${lock?'locked':''}" ${lock?'disabled':`data-cab="pick:${cat}:${esc(value)}"`}>${face}<span>${esc(item.name)}</span>${lock?`<small>${svg(ICON.lock,'cab-lock')}${esc(lock.by||fill(s.lvl,{n:lock.level}))}</small>`:''}</button>`}).join('');
    const changed=!sameAvatar(draft,savedAvatar(o));
    const msg=o.saving?s.saving:o.saveResult==='ok'?s.saved:o.saveResult?s['saveError_'+o.saveResult]||s.saveError_offline:'';
    const st=d.stats||{},hours=Math.floor(Number(st.park_seconds||0)/3600),mins=Math.round(Number(st.park_seconds||0)%3600/60);
    const history=o.history?`<div class="cab-metrics">${[[s.visits,num(st.visits)],[s.parkTime,hours?`${hours} ${s.h} ${mins} ${s.m}`:`${mins} ${s.m}`],[s.attractions,`${num(st.attractions)} / ${ATTRACTIONS}`],[s.games,num(st.games)],[s.recordsSet,num(st.records)],[s.firstVisit,day(st.first_visit)||'—']].map(([k,v])=>`<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>`:'';
    return`<div class="cab-tile"><h3>${esc(s.styling)}</h3><div class="cab-preview">${avatar(draft,'cab-preview-avatar')}<div class="cab-preview-side"><button class="cab-save" data-cab="save" ${changed&&!o.saving?'':'disabled'}>${esc(o.saving?s.saving:s.save)}</button>${msg?`<div class="cab-save-msg ${o.saveResult&&o.saveResult!=='ok'?'error':''}">${esc(msg)}</div>`:''}</div></div>
      <div class="cab-chips">${CATS.map(([k])=>`<button class="${k===cat?'active':''}" data-cab="cat:${k}">${esc(s['cat_'+k])}</button>`).join('')}</div>
      <div class="cab-options ${category==='colors'?'colors':''}">${opts}</div></div>
      <div class="cab-tile"><button class="cab-history ${o.history?'open':''}" data-cab="history"><span>${esc(s.history)}</span>${svg(ICON.chevron,'cab-chevron')}</button>${history}</div>`;
  }

  // ctx = {lang, session, gameId, gameName, player, fallbackAvatar, recordLabel(r)}
  function html(o,ctx){
    const s=strings(ctx.lang),tab=TABS.includes(o.tab)?o.tab:'overview';
    ctx={...ctx,recordLabel:ctx.recordLabel||genericLabel};
    let body;
    if(o.state==='loading')body=`<p class="cab-note">${esc(s.loading)}</p>`;
    else if(o.state!=='ready'||!o.data)body=`<p class="cab-note">${esc(s['error_'+(o.error||'offline')]||s.error_offline)}</p>`;
    else body=tab==='records'?records(o,s,ctx):tab==='rewards'?rewards(o,s):tab==='profile'?profileTab(o,s):overview(o,s,ctx);
    const tabs=o.state==='ready'&&o.data?`<nav class="cab-tabs">${TABS.map(t=>`<button class="${t===tab?'active':''}" data-cab="tab:${t}">${esc(s[t])}</button>`).join('')}</nav>`:'';
    const confirm=o.confirmExit?`<div class="cab-confirm"><div><h2>${esc(s.exitQ)}</h2><div class="cab-confirm-actions"><button data-cab="exit-yes">${esc(s.yes)}</button><button class="secondary" data-cab="exit-no">${esc(s.no)}</button></div></div></div>`:'';
    return`<div class="cab-screen" data-cab-screen><header class="cab-head"><span class="cab-game">${esc(ctx.gameName||GAMES[ctx.gameId]||'')}</span><span class="cab-status ${ctx.session?'busy':''}"><i></i>${esc(ctx.session?s.inGame:s.inLobby)}</span></header>
      ${card(o,s,ctx)}${tabs}<div class="cab-body">${body}</div>
      <footer class="cab-foot"><button class="secondary" data-cab="back">${esc(s.back)}</button>${ctx.session?'':`<button data-cab="exit">${esc(s.exit)}</button>`}</footer>${confirm}</div>`;
  }

  function click(target,o){
    const el=target.closest('[data-cab]');if(!el||el.disabled)return target.closest('[data-cab-screen]')?{overlay:o}:null;
    const[act,...rest]=el.dataset.cab.split(':'),arg=rest.join(':');
    if(act==='tab')return{overlay:{...o,tab:arg,confirmExit:false}};
    if(act==='seg')return{overlay:{...o,seg:arg}};
    if(act==='mode')return{overlay:{...o,mode:arg}};
    if(act==='filter')return{overlay:{...o,filter:arg}};
    if(act==='cat')return{overlay:{...o,cat:arg}};
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
