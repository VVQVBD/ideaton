// Сервер для E2E-тестов: временная копия демо-данных, демо-режим ИИ, PIN 1234, порт 3200
const { useTempDataDir } = require('../helpers/data-dir.cjs');
useTempDataDir();
const app = require('../../server.js');
const PORT = Number(process.env.E2E_PORT || 3200);
app.listen(PORT, () => console.log('e2e server on ' + PORT + ', data: ' + process.env.DATA_DIR));
