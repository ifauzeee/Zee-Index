const fs = require('fs');
const path = require('path');


const ROOT = process.cwd();
const TARGET_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']);

const IGNORE_DIRS = new Set(['node_modules', '.git']);


function isBinary(buffer) {
  for (let i = 0; i < 24 && i < buffer.length; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}


function stripComments(content) {
  let out = '';
  let i = 0;
  const len = content.length;
  let state = 'default'; 

  while (i < len) {
    const char = content[i];
    const next = content[i + 1];
    const prev = i > 0 ? content[i - 1] : null;

    switch (state) {
      case 'line-comment':
        if (char === '\n') {
          out += char;
          state = 'default';
        }
        break;

      case 'block-comment':
        if (char === '*' && next === '/') {
          i++; 
          state = 'default';
        }
        break;

      case 'single':
        out += char;
        
        if (char === "'" && prev !== '\\') {
          state = 'default';
        }
        break;

      case 'double':
        out += char;
        if (char === '"' && prev !== '\\') {
          state = 'default';
        }
        break;

      case 'template':
        out += char;
        if (char === '`' && prev !== '\\') {
          state = 'default';
        }
        break;

      case 'regex':
        out += char;
        if (char === '/' && prev !== '\\') {
          state = 'default';
        }
        break;

      // State default: analisis karakter
      default:
        if (char === '/' && next === '/') {
          state = 'line-comment';
          i++; // Lewati '/' kedua
        } else if (char === '/' && next === '*') {
          state = 'block-comment';
          i++; // Lewati '*'
        } else if (char === "'") {
          out += char;
          state = 'single';
        } else if (char === '"') {
          out += char;
          state = 'double';
        } else if (char === '`') {
          out += char;
          state = 'template';
        } else if (char === '/') {
          // Heuristik untuk membedakan pembagian dari regex.
          const lastMeaningfulChar = out.trim().slice(-1);
          if ('(,=:[!&|?{};'.includes(lastMeaningfulChar) || out.trim().endsWith('return')) {
            out += char;
            state = 'regex';
          } else {
            out += char;
          }
        } else {
          out += char;
        }
        break;
    }
    i++;
  }
  return out;
}

const results = { processed: 0, modified: 0, skipped: 0, errors: [] };

/**
 * Berjalan secara rekursif melalui direktori untuk memproses file.
 * @param {string} dir Direktori untuk dipindai.
 */
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;
    if (IGNORE_DIRS.has(name)) continue;

    const full = path.join(dir, name);

    try {
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }

      const ext = path.extname(name).toLowerCase();
      if (!TARGET_EXTS.has(ext)) {
        results.skipped++;
        continue;
      }

      const buffer = fs.readFileSync(full);
      if (isBinary(buffer)) {
        results.skipped++;
        continue;
      }

      const text = buffer.toString('utf8');
      const stripped = stripComments(text);
      results.processed++;

      if (stripped !== text) {
        // Langsung menimpa file asli, tanpa backup.
        fs.writeFileSync(full, stripped, 'utf8');
        results.modified++;
      }
    } catch (err) {
      results.errors.push({ file: full, error: String(err) });
    }
  }
}

// ---- EKSEKUSI SKRIP ----
try {
  console.log('Starting comment removal in:', ROOT);
  console.log('WARNING: This operation is permanent and does not create backups.');
  
  walk(ROOT);
  
  console.log('Done. Summary:', results);

  if (results.errors.length) {
    console.error('Errors occurred during processing:');
    results.errors.slice(0, 5).forEach(e => console.error(`- File: ${e.file}\n  Error: ${e.error}`));
    process.exit(2);
  }
  process.exit(0);
} catch (err) {
  console.error('A fatal error occurred:', err);
  process.exit(1);
}