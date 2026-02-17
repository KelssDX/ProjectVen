const { spawnSync } = require('child_process');
const r = spawnSync('node_modules/@esbuild/win32-x64/esbuild.exe', ['--version'], { stdio: 'pipe' });
console.log('status', r.status);
console.log('error', r.error && r.error.message);
console.log(String(r.stdout || ''));
console.error(String(r.stderr || ''));
