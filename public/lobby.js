// Ball-Duel duel lobby screen markup (Lava Jump prototype, portrait 1080x1920).
// Pure: html(view) -> string. State, timers and clicks live in app.js.
(function(root){
  const STR={
    en:{free:'Available',inGame:'Game in progress',offline:'No connection to Gateway',subtitle:'Duel · one on one',mode:'Mode',settings:'Settings',difficulty:'Difficulty',time:'Time',yourDuel:'Your duel',player:'Player',tapWristband:'Tap your wristband',needPlayers:'A duel needs two players',start:'START',tapHere:'Tap your wristband',checking:'Checking wristband…',unregistered:'Wristband not found',expired:'Your time is over',blocked:'Station is blocked',lobby_full:'The duel is already full',offline_scan:'Cannot reach the server',ok:'OK',rules:'How to play',understood:'Got it',stillHere:'Are you still here?',yes:'Yes',no:'No',removeQ:'Remove this player?',finish:'Finish',records:'Records',remaining:'Left',not_enough_players:'Waiting for the second player',no_lobby:'Tap your wristbands first',game_in_progress:'A game is already running',starting:'Starting…'},
    ru:{free:'Свободен',inGame:'Идёт игра',offline:'Нет связи с Gateway',subtitle:'Дуэль · один на один',mode:'Режим',settings:'Настройки',difficulty:'Сложность',time:'Время',yourDuel:'Ваша дуэль',player:'Игрок',tapWristband:'Прислоните браслет',needPlayers:'Для дуэли нужны два игрока',start:'СТАРТ',tapHere:'Прислони браслет',checking:'Проверяем браслет…',unregistered:'Браслета нет в системе',expired:'Время закончилось',blocked:'Станция заблокирована',lobby_full:'Дуэль уже собрана',offline_scan:'Нет связи с сервером',ok:'OK',rules:'Как играть',understood:'Понятно',stillHere:'Вы ещё здесь?',yes:'Да',no:'Нет',removeQ:'Убрать игрока?',finish:'Завершить',records:'Рекорды',remaining:'Осталось',not_enough_players:'Ждём второго игрока',no_lobby:'Сначала приложите браслеты',game_in_progress:'Игра уже идёт',starting:'Запускаем…'},
    de:{free:'Frei',inGame:'Spiel läuft',offline:'Keine Verbindung zum Gateway',subtitle:'Duell · eins gegen eins',mode:'Modus',settings:'Einstellungen',difficulty:'Schwierigkeit',time:'Zeit',yourDuel:'Euer Duell',player:'Spieler',tapWristband:'Armband scannen',needPlayers:'Ein Duell braucht zwei Spieler',start:'START',tapHere:'Armband scannen',checking:'Armband wird geprüft…',unregistered:'Armband nicht registriert',expired:'Deine Zeit ist abgelaufen',blocked:'Station ist gesperrt',lobby_full:'Das Duell ist schon voll',offline_scan:'Server nicht erreichbar',ok:'OK',rules:'Spielanleitung',understood:'Verstanden',stillHere:'Seid ihr noch da?',yes:'Ja',no:'Nein',removeQ:'Spieler entfernen?',finish:'Beenden',records:'Bestenliste',remaining:'Rest',not_enough_players:'Warten auf den zweiten Spieler',no_lobby:'Erst Armbänder scannen',game_in_progress:'Ein Spiel läuft bereits',starting:'Start…'},
    fr:{free:'Disponible',inGame:'Partie en cours',offline:'Pas de connexion au Gateway',subtitle:'Duel · un contre un',mode:'Mode',settings:'Réglages',difficulty:'Difficulté',time:'Durée',yourDuel:'Votre duel',player:'Joueur',tapWristband:'Présentez votre bracelet',needPlayers:'Un duel nécessite deux joueurs',start:'DÉPART',tapHere:'Présentez votre bracelet',checking:'Vérification du bracelet…',unregistered:'Bracelet non enregistré',expired:'Votre temps est écoulé',blocked:'Station bloquée',lobby_full:'Le duel est déjà complet',offline_scan:'Serveur inaccessible',ok:'OK',rules:'Comment jouer',understood:'Compris',stillHere:'Êtes-vous toujours là ?',yes:'Oui',no:'Non',removeQ:'Retirer ce joueur ?',finish:'Terminer',records:'Classement',remaining:'Reste',not_enough_players:'En attente du deuxième joueur',no_lobby:'Présentez d’abord vos bracelets',game_in_progress:'Une partie est déjà en cours',starting:'Lancement…'},
    zh:{free:'空闲',inGame:'游戏进行中',offline:'未连接 Gateway',subtitle:'决斗 · 一对一',mode:'模式',settings:'设置',difficulty:'难度',time:'时长',yourDuel:'你们的决斗',player:'玩家',tapWristband:'请扫描手环',needPlayers:'决斗需要两名玩家',start:'开始',tapHere:'请扫描手环',checking:'正在验证手环…',unregistered:'手环未登记',expired:'时间已用完',blocked:'站点已锁定',lobby_full:'决斗人数已满',offline_scan:'无法连接服务器',ok:'确定',rules:'玩法说明',understood:'明白了',stillHere:'你们还在吗？',yes:'是',no:'否',removeQ:'移除该玩家？',finish:'结束',records:'排行榜',remaining:'剩余',not_enough_players:'等待第二位玩家',no_lobby:'请先扫描手环',game_in_progress:'游戏已在进行',starting:'正在开始…'},
    ja:{free:'空いています',inGame:'プレイ中',offline:'Gateway に接続されていません',subtitle:'デュエル · 1対1',mode:'モード',settings:'設定',difficulty:'難易度',time:'時間',yourDuel:'あなたたちのデュエル',player:'プレイヤー',tapWristband:'リストバンドをタッチ',needPlayers:'デュエルには2人必要です',start:'スタート',tapHere:'リストバンドをタッチ',checking:'リストバンドを確認中…',unregistered:'未登録のリストバンドです',expired:'時間が終了しました',blocked:'ステーションはロック中です',lobby_full:'デュエルは満員です',offline_scan:'サーバーに接続できません',ok:'OK',rules:'遊び方',understood:'わかった',stillHere:'まだいますか？',yes:'はい',no:'いいえ',removeQ:'このプレイヤーを外しますか？',finish:'終了',records:'ランキング',remaining:'残り',not_enough_players:'2人目を待っています',no_lobby:'先にリストバンドをタッチ',game_in_progress:'すでにプレイ中です',starting:'開始中…'}
  };
  const strings=lang=>({...STR.en,...(STR[lang]||{})});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=(body,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${body}</svg>`;
  const ICON={
    bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    star:'<path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/>',
    diamond:'<path d="m12 2 9 10-9 10-9-10z"/>',
    flame:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z"/>',
    crown:'<path d="m3 7 5 4 4-7 4 7 5-4-2 12H5z"/>',
    target:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4"/>',
    info:'<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 10h2v8h-2zM11 6h2v2h-2z"/>',
    check:'<path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  };
  const MODE_ICON={
    free:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/>',
    targets:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6"/>',
    values:'<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>'
  };
  const AVATAR={X1:['bolt','orange'],X2:['star','purple'],X3:['diamond','cyan'],X4:['flame','red'],X5:['crown','gold'],X6:['target','green']};
  function avatar(player,slot){
    const known=AVATAR[player.avatar],icon=known?known[0]:'bolt',color=known?known[1]:(slot===0?'blue':'orange');
    return`<svg class="lobby-hex hex-${color}" viewBox="0 0 100 110" aria-hidden="true"><polygon points="50,4 95,29 95,81 50,106 5,81 5,29" fill="none" stroke="currentColor" stroke-width="6"/><g transform="translate(26 31) scale(2)" fill="currentColor">${ICON[icon]}</g></svg>`;
  }
  const clock=sec=>`${Math.floor(Math.max(0,sec)/60)}:${String(Math.max(0,sec)%60).padStart(2,'0')}`;
  function header(v,s){
    const status=v.session?['busy',s.inGame]:v.connected?['free',s.free]:['offline',s.offline];
    return`<header class="lobby-head"><div class="lobby-brand">BALL DUEL</div>
      <div class="lobby-status ${status[0]}"><i></i>${esc(status[1])}${v.session?`<span class="lobby-clock">${esc(s.remaining)} ${clock(v.remainingSec)}</span>`:''}</div>
      <h1 class="lobby-title">BALL DUEL</h1><div class="lobby-subtitle">${esc(s.subtitle)}</div></header>`;
  }
  function modeColumn(v,s){
    return`<div class="lobby-col"><h2>${svg('<path d="M6 9h12a4 4 0 0 1 0 8l-2-2H8l-2 2a4 4 0 0 1 0-8z"/>','lobby-col-icon')}${esc(s.mode)}</h2><div class="lobby-list">${root.LobbyOptions.LOBBY_MODES.map(mode=>{
      const active=v.selection.mode===mode;
      return`<div class="lobby-row ${active?'active':''}"><button class="lobby-pick" data-lobby-mode="${mode}">${svg(MODE_ICON[mode],'lobby-mode-icon')}<span>${esc(v.names.modes[mode])}</span></button><button class="lobby-info" data-lobby-rules="${mode}" aria-label="${esc(s.rules)}">${svg(ICON.info)}</button></div>`}).join('')}</div></div>`;
  }
  function settingsColumn(v,s){
    const o=v.options,sel=v.selection,groups=[];
    if(o.difficulties.length)groups.push(`<h3>${esc(s.difficulty)}</h3><div class="lobby-list">${o.difficulties.map((d,i)=>{const active=sel.difficulty===d;return`<button class="lobby-row lobby-pick ${active?'active':''}" data-lobby-difficulty="${d}"><b class="lobby-num">${i+1}</b><span>${esc(v.names.difficulties[d])}</span>${active?svg(ICON.check,'lobby-check'):''}</button>`}).join('')}</div>`);
    if(o.durations.length)groups.push(`<h3>${esc(s.time)}</h3><div class="lobby-seg">${o.durations.map(n=>`<button class="${sel.durationMinutes===n?'active':''}" data-lobby-duration="${n}">${n} ${esc(v.names.minute)}</button>`).join('')}</div>`);
    return`<div class="lobby-col"><h2>${svg('<path d="M4 18h3v-6H4zm6 0h3V8h-3zm6 0h3V4h-3z"/>','lobby-col-icon')}${esc(s.settings)}</h2><div class="lobby-settings">${groups.join('')}</div></div>`;
  }
  function slots(v,s){
    const cells=[0,1].map(i=>{const p=v.players[i];
      if(!p)return`<div class="lobby-slot empty"><div class="lobby-plus">+</div><b>${esc(s.player)} ${i+1}</b><small>${esc(s.tapWristband)}</small></div>`;
      return`<div class="lobby-slot">${v.session?'':`<button class="lobby-remove" data-lobby-remove="${esc(p.uid)}" aria-label="✕">✕</button>`}${avatar(p,i)}<b>${esc(p.name)}</b></div>`});
    return`<section class="lobby-duel"><div class="lobby-duel-head"><h2>${esc(s.yourDuel)}</h2><span>${v.players.length} / ${v.max}</span></div><div class="lobby-slots">${cells[0]}<div class="lobby-vs">VS</div>${cells[1]}</div></section>`;
  }
  function footer(v,s){
    const label=root.LobbyOptions.selectionLabel(v.selection,v.names);
    const hint=v.startDenied?s[v.startDenied]||v.startDenied:v.check.ok?'':s[v.check.reason];
    const disabled=!v.check.ok||v.starting;
    return`<section class="lobby-launch"><div class="lobby-choice">${esc(label)}</div><div class="lobby-hint">${esc(hint||'')}</div>
      <button class="lobby-start ${disabled?'':'ready'}" data-lobby-start ${disabled?'disabled':''}>${esc(v.starting?s.starting:s.start)} <span>›</span></button>
      ${v.session?`<div class="lobby-launch-actions"><button class="lobby-finish" data-action="leaders">${esc(s.records)}</button><button class="lobby-finish" data-action="session-exit">${esc(s.finish)}</button></div>`:`<div class="lobby-tap">${esc(s.tapHere)}<span>↓</span></div>`}</section>`;
  }
  function overlay(v,s){
    const o=v.overlay;if(!o)return'';
    if(o.type==='checking')return`<div class="lobby-toast">${esc(s.checking)}</div>`;
    const box=(body,closeable)=>`<div class="lobby-modal" ${closeable?'data-lobby-dismiss':''}><div class="lobby-modal-box">${body}</div></div>`;
    if(o.type==='denied')return box(`<h2>${esc(s[o.reason==='offline'?'offline_scan':o.reason]||o.reason)}</h2><div class="lobby-modal-actions"><button data-lobby-dismiss>${esc(s.ok)}</button></div>`,true);
    if(o.type==='rules'){const r=v.rules||{title:'',lead:'',steps:[],demoHtml:''};return box(`<h2>${esc(s.rules)} · ${esc(r.title)}</h2><p>${esc(r.lead)}</p>${r.demoHtml||''}<ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="lobby-modal-actions"><button data-lobby-dismiss>${esc(s.understood)}</button></div>`,true)}
    if(o.type==='idle')return box(`<h2>${esc(s.stillHere)}</h2><div class="lobby-modal-actions"><button data-lobby-idle="yes">${esc(s.yes)}</button><button class="secondary" data-lobby-idle="no">${esc(s.no)}</button></div>`,false);
    if(o.type==='confirmRemove'){const p=v.players.find(x=>x.uid===o.uid);return box(`<h2>${esc(s.removeQ)}</h2>${p?`<p>${esc(p.name)}</p>`:''}<div class="lobby-modal-actions"><button data-lobby-confirm="yes">${esc(s.yes)}</button><button class="secondary" data-lobby-confirm="no">${esc(s.no)}</button></div>`,false)}
    return'';
  }
  function html(v){
    const s=strings(v.lang);
    return`<section class="lobby-screen ${v.session?'in-session':''}">${header(v,s)}<div class="lobby-cols">${modeColumn(v,s)}${settingsColumn(v,s)}</div>${slots(v,s)}${footer(v,s)}${overlay(v,s)}</section>`;
  }
  const api={strings,html};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BallDuelLobby=api;
})(typeof window!=='undefined'?window:globalThis);
