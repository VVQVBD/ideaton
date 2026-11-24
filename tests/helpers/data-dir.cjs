// Временная папка с данными для тестов: настоящие файлы в data/ тесты не трогают.
// Вызывать ДО подключения модулей сервера: db.js читает DATA_DIR при загрузке.
const fs = require('fs');
const os = require('os');
const path = require('path');

function useTempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideaton-test-'));
  process.env.DATA_DIR = dir;
  process.env.MOCK_AI = 'true';
  process.env.TEACHER_PIN = '1234';
  return dir;
}

module.exports = { useTempDataDir };
