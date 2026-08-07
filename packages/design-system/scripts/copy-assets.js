// Copies non-TS assets (icon PNGs, etc.) from src/ into dist/, since tsc
// only compiles .ts/.tsx files and ignores everything else.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');
const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp']);

function copyAssets(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(srcPath);
      continue;
    }
    if (!ASSET_EXTENSIONS.has(path.extname(entry.name))) continue;

    const relPath = path.relative(SRC, srcPath);
    const destPath = path.join(DIST, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log('copied', relPath);
  }
}

copyAssets(SRC);
