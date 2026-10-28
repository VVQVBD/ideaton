// Простые функции чтения и записи JSON-файлов в папке data/
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'data');
// На Vercel папка проекта только для чтения, поэтому данные лежат во временной /tmp.
// Они сбрасываются при перезапуске функции, для демо этого достаточно.
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : SOURCE_DIR;
if (DATA_DIR !== SOURCE_DIR && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(SOURCE_DIR)) {
    for (const f of fs.readdirSync(SOURCE_DIR)) {
      if (f.endsWith('.json')) fs.copyFileSync(path.join(SOURCE_DIR, f), path.join(DATA_DIR, f));
    }
  }
}

function read(name) {
  const file = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function write(name, data) {
  const file = path.join(DATA_DIR, name + '.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Короткий уникальный id
function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

module.exports = { read, write, newId, DATA_DIR };
