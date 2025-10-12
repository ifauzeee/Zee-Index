const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups', `comments-backup-${Date.now()}`);
const TARGET_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'backups']);

function isBinary(buffer) {
  for (let i = 0; i < 24 && i < buffer.length; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function backupFile(src, rel) {
  const dest = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}


function stripComments(content) {
  let out = '';
  let i = 0;
  const len = content.length;
  let state = null; 

  while (i < len) {
    const ch = content[i];
    const next = content[i+1];

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') { state = null; i += 2; continue; }
      i++; continue;
    }
    if (state === 'line-comment') {
      if (ch === '\n') { state = null; out += ch; i++; continue; }
      i++; continue;
    }
    if (state === 'single') {
      if (ch === '\\' && i+1 < len) { out += ch + content[i+1]; i += 2; continue; }
      if (ch === "'") { out += ch; state = null; i++; continue; }
      out += ch; i++; continue;
    }
    if (state === 'double') {
      if (ch === '\\' && i+1 < len) { out += ch + content[i+1]; i += 2; continue; }
      if (ch === '"') { out += ch; state = null; i++; continue; }
      out += ch; i++; continue;
    }
    if (state === 'template') {
      if (ch === '`') { out += ch; state = null; i++; continue; }
      if (ch === '\\' && i+1 < len) { out += ch + content[i+1]; i += 2; continue; }
      out += ch; i++; continue;
    }

    
    if (ch === '/' && next === '*') { state = 'block-comment'; i += 2; continue; }
    if (ch === '/' && next === '/') { state = 'line-comment'; i += 2; continue; }
    if (ch === '<' && content.substr(i,4) === '<!--') {
      const end = content.indexOf('-->', i+4);
      if (end === -1) return out; 
      i = end + 3; continue;
    }
    if (ch === "'") { state = 'single'; out += ch; i++; continue; }
    if (ch === '"') { state = 'double'; out += ch; i++; continue; }
    if (ch === '`') { state = 'template'; out += ch; i++; continue; }

    out += ch; i++;
  }
  return out;
}

const results = { processed: 0, modified: 0, skipped: 0, errors: [] };

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;
    if (IGNORE_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full);

    try {
      if (ent.isDirectory()) { walk(full); continue; }
      const ext = path.extname(name).toLowerCase();
      if (!TARGET_EXTS.has(ext)) { results.skipped++; continue; }

      const buffer = fs.readFileSync(full);
      if (isBinary(buffer)) { results.skipped++; continue; }
      const text = buffer.toString('utf8');
      const stripped = stripComments(text);
      results.processed++;
      if (stripped !== text) {
        backupFile(full, rel);
        fs.writeFileSync(full, stripped, 'utf8');
        results.modified++;
      }
    } catch (err) {
      results.errors.push({ file: full, error: String(err) });
    }
  }
}

ensureDir(BACKUP_DIR);
console.log('Backup directory:', BACKUP_DIR);
walk(ROOT);
console.log('Done. Summary:', results);
if (results.errors.length) {
  console.error('Errors:', results.errors.slice(0,5));
  process.exit(2);
}
process.exit(0);