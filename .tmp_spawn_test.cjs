const { spawnSync } = require('child_process');
const r = spawnSync('cmd.exe', ['/c','echo','hi'], { stdio: 'pipe' });
console.log('status', r.status);
console.log('error', r.error && r.error.message);
console.log(String(r.stdout || ''));
console.error(String(r.stderr || ''));
