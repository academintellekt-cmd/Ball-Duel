// Keep preview flags local to the Electron child process.
const { spawn } = require('child_process');
const path = require('path');
const env = { ...process.env, BALL_DUEL_DESIGN_MODE: 'true', BALL_DUEL_INTERFACE_TEST: 'true' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.'], { cwd: path.join(__dirname, '..'), env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
