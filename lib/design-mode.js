// Development-only window layout and live preview. No game rules live here.
const fs = require('fs');
const path = require('path');

function designBounds(area, control) {
  const gap = 12;
  const controlWidth = Math.min(440, Math.floor(area.width * 0.36));
  const height = Math.max(240, area.height - gap * 2);
  if (control) return { x: area.x + gap, y: area.y + gap, width: controlWidth, height };
  const width = Math.max(320, area.width - controlWidth - gap * 3);
  return {
    x: area.x + controlWidth + gap * 2, y: area.y + gap,
    width, height: Math.min(height, Math.round(width * 9 / 16) + 40),
  };
}

function watchDesign(root, getWindows) {
  let timer;
  let needsReload = false;
  let pending = false;
  let updating = false;
  let stopped = false;
  const watchers = [];
  async function refresh() {
    if (stopped || updating || !pending) return;
    updating = true;
    pending = false;
    const reload = needsReload;
    needsReload = false;
    try {
      // Player first: its state listener must be ready when control publishes.
      for (const win of getWindows().filter(w => w && !w.isDestroyed()).reverse()) {
        if (reload) {
          await new Promise(resolve => {
            const done = () => {
              win.webContents.removeListener('did-finish-load', done);
              win.webContents.removeListener('did-fail-load', done);
              win.removeListener('closed', done);
              resolve();
            };
            win.webContents.once('did-finish-load', done);
            win.webContents.once('did-fail-load', done);
            win.once('closed', done);
            win.webContents.reloadIgnoringCache();
          });
        } else {
          await win.webContents.executeJavaScript(`
            Promise.all(Array.from(document.querySelectorAll('link[rel="stylesheet"]'), link =>
              new Promise(resolve => {
                const next = link.cloneNode();
                const url = new URL(link.href);
                url.searchParams.set('designRefresh', Date.now());
                next.href = url.href;
                next.onload = () => { link.remove(); resolve(); };
                next.onerror = () => { next.remove(); resolve(); };
                link.after(next);
              })
            ))
          `);
        }
      }
      console.log(`[Design] ${reload ? 'Pages reloaded' : 'Styles refreshed'}`);
    } catch (error) {
      console.warn('[Design] Refresh failed:', error.message);
    } finally {
      updating = false;
      if (pending && !stopped) timer = setTimeout(refresh, 150);
    }
  }
  for (const folder of ['public', 'lib']) {
    const watcher = fs.watch(path.join(root, folder), { recursive: true }, (_event, filename) => {
      if (stopped) return;
      pending = true;
      if (!filename || path.extname(String(filename)).toLowerCase() !== '.css') needsReload = true;
      clearTimeout(timer);
      timer = setTimeout(refresh, 180);
    });
    watcher.on('error', error => console.warn('[Design] Watch error:', error.message));
    watchers.push(watcher);
  }
  return () => {
    stopped = true;
    clearTimeout(timer);
    watchers.forEach(watcher => watcher.close());
  };
}

module.exports = { designBounds, watchDesign };
