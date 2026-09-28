const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let commitHash = '';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (_) {
  commitHash = 'cpanel-build';
}

const buildTime = new Date().toISOString();
const buildId = commitHash ? `${commitHash}-${buildTime}` : buildTime;

const content = `// Auto-generated build metadata\nexport const BUILD_ID = ${JSON.stringify(buildId)};\nexport const BUILD_TIME = ${JSON.stringify(buildTime)};\n`;

const targetPath = path.join(__dirname, '..', 'src', 'build_info.ts');
fs.writeFileSync(targetPath, content, 'utf-8');
console.log('[BuildInfo] Generated build metadata:', buildId);
