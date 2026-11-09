// Where a wristband scan result goes on the control screen. With a session running (any phase) the
// players' screen is never covered: a denial is a small queue note. Only a fresh lobby shows the modal.
// Loaded as a plain <script> (global ScanRoute) and required by tests.
(function(root){
  function scanRoute(e,ctx){
    const inSession=!!ctx.sessionId||ctx.phase!=='lobby';
    if(e.state==='denied'){const reason=e.reason==='busy'&&ctx.queue?'reserved':e.reason||'unregistered';return inSession?{note:reason}:{overlay:{type:'denied',reason},autoCloseMs:5000}}
    if(e.state==='checking'&&!inSession&&(!ctx.overlayType||ctx.overlayType==='checking'))return{overlay:{type:'checking'},autoCloseMs:5000};
    return null;
  }
  const api={scanRoute};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScanRoute=api;
})(typeof window!=='undefined'?window:globalThis);
