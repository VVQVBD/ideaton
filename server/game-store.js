// Где хранится игра.
// Локально - в файле data/game.json (как остальные данные).
// На Vercel у каждого запроса может быть свой экземпляр сервера со своей папкой, поэтому там игра
// лежит в общей базе Upstash Redis (переменные KV_REST_API_URL и KV_REST_API_TOKEN добавляет Vercel).
// Каждая команда хранится отдельным ключом: если две команды ответят одновременно, ответы не затрут друг друга.
const db = require('./db');

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(URL && TOKEN);
const TTL = 7 * 24 * 3600; // игра сама удалится через неделю

// Одна команда Redis через обычный HTTP-запрос, например ['GET', 'game']
async function redis(cmd) {
  const r = await fetch(URL, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Redis: ' + (j.error || r.status));
  return j.result;
}
const teamKey = (id) => 'game:team:' + id;
const parse = (s) => (s ? JSON.parse(s) : null);

// Игра целиком: общая часть + команды
async function load() {
  if (!useRedis) {
    const g = db.read('game');
    return g && !Array.isArray(g) ? g : null;
  }
  const meta = parse(await redis(['GET', 'game']));
  if (!meta) return null;
  const teams = await redis(['MGET', ...meta.teamIds.map(teamKey)]);
  return { ...meta, teams: teams.map(parse).filter(Boolean) };
}

// Общая часть игры (этап, вопрос квиза). Меняет только преподаватель
async function saveMeta(g) {
  if (!useRedis) return db.write('game', g);
  const { teams, ...meta } = g;
  meta.teamIds = teams.map((t) => t.id);
  await redis(['SET', 'game', JSON.stringify(meta), 'EX', TTL]);
}

// Данные одной команды. Меняет только сама команда
async function saveTeam(g, t) {
  if (!useRedis) return db.write('game', g);
  await redis(['SET', teamKey(t.id), JSON.stringify(t), 'EX', TTL]);
}

// Новая игра: записываем всё сразу
async function saveAll(g) {
  if (!useRedis) return db.write('game', g);
  for (const t of g.teams) await saveTeam(g, t);
  await saveMeta(g);
}

async function clear() {
  if (!useRedis) return db.write('game', null);
  await redis(['DEL', 'game', ...[1, 2, 3, 4, 5, 6].map((i) => teamKey('k' + i))]);
}

module.exports = { load, saveMeta, saveTeam, saveAll, clear, useRedis };
