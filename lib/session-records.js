// XP v2 records for the Gateway's session_result: each player's best score per mode/level
// over the session's rounds, as meta.records = [{ic, game_id, mode_id, level_id, difficulty, score}].
// keyOf(round) -> {mode_id, level_id, difficulty} or null to skip the round.
// Loaded as a plain <script> (global SessionRecords) and required by tests.
(function(root){
  function bestRecords(uids,rounds,gameId,keyOf){const out=new Map();for(const r of rounds){const k=keyOf(r);if(!k)continue;uids.forEach((ic,p)=>{if(!ic)return;const score=Number(r?.scores?.[p]);if(!Number.isFinite(score)||score<0)return;const id=`${ic}|${k.mode_id}|${k.level_id}`,prev=out.get(id);if(!prev||score>prev.score)out.set(id,{ic:String(ic),game_id:gameId,mode_id:String(k.mode_id),level_id:String(k.level_id),difficulty:k.difficulty??null,score})})}return[...out.values()]}
  // level_id: "difficulty:minutes", '-' for none, so rounds of different length never share a record.
  function levelId(difficulty,minutes){return`${difficulty||'-'}:${minutes||'-'}`}
  const api={bestRecords,levelId};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SessionRecords=api;
})(typeof window!=='undefined'?window:globalThis);
