const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "assistant.db");

loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.1";
const SESSION_COOKIE = "bootcode_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    auth_source TEXT NOT NULL DEFAULT 'email',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    intake_mode TEXT NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER,
    current_city TEXT NOT NULL,
    target_city TEXT,
    family_status TEXT,
    children_count INTEGER DEFAULT 0,
    employment_status TEXT,
    profession TEXT,
    monthly_income INTEGER DEFAULT 0,
    savings INTEGER DEFAULT 0,
    housing_status TEXT,
    life_scenarios TEXT,
    risk_notes TEXT,
    goals TEXT,
    extra_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    meta_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stats_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_key TEXT NOT NULL,
    area_label TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    metric_label TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT NOT NULL,
    period_label TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    notes TEXT,
    UNIQUE(area_key, metric_key, period_label, source_url)
  );
`);

ensureColumn("profiles", "account_id", "ALTER TABLE profiles ADD COLUMN account_id TEXT");
seedStats();
purgeExpiredSessions();

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      if (url.pathname === "/" || url.pathname === "/index.html") return serveFile(res, path.join(PUBLIC_DIR, "index.html"));
      const filePath = path.join(PUBLIC_DIR, url.pathname.replace(/^\/+/, ""));
      if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);
      return sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  });
}

function ensureColumn(tableName, columnName, sql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) db.exec(sql);
}

async function handleApi(req, res, url) {
  const account = getAuthenticatedAccount(req);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      provider: OPENAI_API_KEY ? "openai" : "local-fallback",
      openai: { configured: Boolean(OPENAI_API_KEY), model: OPENAI_MODEL },
      account: account ? sanitizeAccount(account) : null
    });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    return sendJson(res, 200, { account: account ? sanitizeAccount(account) : null });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    return handleRegister(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    return handleLogin(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/auth/esia-demo") {
    return handleEsiaDemoAuth(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    destroySession(req);
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });
  }

  if (req.method === "POST" && url.pathname === "/api/openai-test") {
    const result = await runOpenAITest();
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  if (req.method === "GET" && url.pathname === "/api/stats") {
    return sendJson(res, 200, { stats: db.prepare("SELECT * FROM stats_entries ORDER BY area_label, metric_key").all() });
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/profiles/")) {
    const id = url.pathname.split("/").pop();
    const profile = getProfile(id);
    if (!profile) return sendJson(res, 404, { error: "Профиль не найден." });
    if (!canAccessProfile(profile, account)) return sendJson(res, 403, { error: "Нет доступа к профилю." });
    return sendJson(res, 200, { profile, messages: getMessages(id), provider: OPENAI_API_KEY ? "openai" : "local-fallback" });
  }

  if (req.method === "POST" && url.pathname === "/api/profiles") {
    if (!account) return sendJson(res, 401, { error: "Сначала войдите в аккаунт." });
    const profile = createProfile(await readJson(req), account.id);
    return sendJson(res, 201, { profile, provider: OPENAI_API_KEY ? "openai" : "local-fallback" });
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    if (!account) return sendJson(res, 401, { error: "Сначала войдите в аккаунт." });
    const body = await readJson(req);
    if (!body.profileId || !body.message) return sendJson(res, 400, { error: "Нужны profileId и message." });
    const profile = getProfile(body.profileId);
    if (!profile) return sendJson(res, 404, { error: "Профиль не найден." });
    if (!canAccessProfile(profile, account)) return sendJson(res, 403, { error: "Нет доступа к профилю." });
    saveMessage(profile.id, "user", text(body.message), null);
    const history = getMessages(profile.id);
    const evidence = collectEvidence(profile);
    const answer = await generateAssistantReply(profile, text(body.message), history, evidence);
    saveMessage(profile.id, "assistant", answer.text, { sources: answer.sources, provider: answer.provider, apiStatus: answer.apiStatus });
    return sendJson(res, 200, answer);
  }

  return sendJson(res, 404, { error: "API route not found" });
}

async function handleRegister(req, res) {
  const body = await readJson(req);
  const name = text(body.name);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!name || !email || !password) return sendJson(res, 400, { error: "Имя, email и пароль обязательны." });
  if (!email.includes("@")) return sendJson(res, 400, { error: "Введите корректный email." });
  if (password.length < 6) return sendJson(res, 400, { error: "Пароль должен быть не короче 6 символов." });
  if (db.prepare("SELECT id FROM accounts WHERE email = ?").get(email)) return sendJson(res, 409, { error: "Такой email уже зарегистрирован." });
  const now = new Date().toISOString();
  const account = { id: crypto.randomUUID(), email, name, password_hash: hashPassword(password), auth_source: "email", created_at: now, updated_at: now };
  db.prepare("INSERT INTO accounts (id, email, name, password_hash, auth_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(account.id, account.email, account.name, account.password_hash, account.auth_source, account.created_at, account.updated_at);
  return sendJson(res, 201, { account: sanitizeAccount(account) }, { "Set-Cookie": createSession(account.id) });
}

async function handleLogin(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const account = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email);
  if (!account || !verifyPassword(password, account.password_hash)) return sendJson(res, 401, { error: "Неверный email или пароль." });
  return sendJson(res, 200, { account: sanitizeAccount(account) }, { "Set-Cookie": createSession(account.id) });
}

async function handleEsiaDemoAuth(req, res) {
  const body = await readJson(req);
  const fullName = text(body.fullName) || "Пользователь Госуслуг";
  const phone = digits(body.phone) || "79990001122";
  const email = `esia-demo-${phone}@bootcode.local`;
  const now = new Date().toISOString();
  let account = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email);
  if (!account) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO accounts (id, email, name, password_hash, auth_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, email, fullName, hashPassword(`esia-${phone}`), "esia-demo", now, now);
    account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
  } else {
    db.prepare("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?").run(fullName, now, account.id);
    account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(account.id);
  }
  return sendJson(res, 200, { account: sanitizeAccount(account), esia: { phone: formatPhone(phone) } }, { "Set-Cookie": createSession(account.id) });
}

function createProfile(payload, accountId) {
  const now = new Date().toISOString();
  const profile = {
    id: crypto.randomUUID(),
    account_id: accountId,
    intake_mode: text(payload.intakeMode) || "manual",
    full_name: text(payload.fullName) || "Пользователь",
    age: int(payload.age),
    current_city: text(payload.currentCity) || "Россия",
    target_city: text(payload.targetCity),
    family_status: text(payload.familyStatus),
    children_count: int(payload.childrenCount),
    employment_status: text(payload.employmentStatus),
    profession: text(payload.profession),
    monthly_income: int(payload.monthlyIncome),
    savings: int(payload.savings),
    housing_status: text(payload.housingStatus),
    life_scenarios: normalizeArray(payload.lifeScenarios),
    risk_notes: text(payload.riskNotes),
    goals: text(payload.goals),
    extra_notes: text(payload.extraNotes),
    created_at: now,
    updated_at: now
  };
  db.prepare(`
    INSERT INTO profiles (
      id, account_id, intake_mode, full_name, age, current_city, target_city, family_status,
      children_count, employment_status, profession, monthly_income, savings, housing_status,
      life_scenarios, risk_notes, goals, extra_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    profile.id, profile.account_id, profile.intake_mode, profile.full_name, profile.age, profile.current_city,
    profile.target_city, profile.family_status, profile.children_count, profile.employment_status,
    profile.profession, profile.monthly_income, profile.savings, profile.housing_status,
    JSON.stringify(profile.life_scenarios), profile.risk_notes, profile.goals, profile.extra_notes,
    profile.created_at, profile.updated_at
  );
  return profile;
}

function getProfile(id) {
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
  if (!profile) return null;
  profile.life_scenarios = safeParse(profile.life_scenarios, []);
  return profile;
}

function getMessages(profileId) {
  return db.prepare(`
    SELECT id, role, content, meta_json, created_at
    FROM chat_messages
    WHERE profile_id = ?
    ORDER BY created_at ASC
  `).all(profileId).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    meta: row.meta_json ? safeParse(row.meta_json, {}) : {}
  }));
}

function saveMessage(profileId, role, content, meta) {
  db.prepare("INSERT INTO chat_messages (id, profile_id, role, content, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(),
    profileId,
    role,
    content,
    meta ? JSON.stringify(meta) : null,
    new Date().toISOString()
  );
}

function canAccessProfile(profile, account) {
  return !profile.account_id || Boolean(account && profile.account_id === account.id);
}

function collectEvidence(profile) {
  const keys = new Set(["russia"]);
  const currentKey = mapAreaKey(profile.current_city);
  const targetKey = mapAreaKey(profile.target_city);
  if (currentKey) keys.add(currentKey);
  if (targetKey) keys.add(targetKey);
  const stats = [];
  for (const key of keys) {
    stats.push(...db.prepare(`
      SELECT area_key AS areaKey, area_label AS areaLabel, metric_key AS metricKey, metric_label AS metricLabel,
             metric_value AS metricValue, metric_unit AS metricUnit, period_label AS periodLabel,
             source_name AS sourceName, source_url AS sourceUrl, notes
      FROM stats_entries
      WHERE area_key = ?
      ORDER BY metric_key
    `).all(key));
  }
  return { currentKey, targetKey, stats };
}

function mapAreaKey(value) {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (normalized.includes("моск")) return "moscow";
  if (normalized.includes("санкт") || normalized.includes("петербург") || normalized.includes("спб")) return "saint_petersburg";
  if (normalized.includes("краснодар")) return "krasnodar";
  if (normalized.includes("росси")) return "russia";
  return null;
}

async function generateAssistantReply(profile, message, history, evidence) {
  const fallback = {
    provider: "local-fallback",
    text: buildFallbackPlan(profile, message, evidence),
    sources: uniqueSources(evidence.stats)
  };

  if (!OPENAI_API_KEY) {
    return {
      ...fallback,
      apiStatus: { configured: false, attempted: false, success: false, model: OPENAI_MODEL, error: "OPENAI_API_KEY is not configured" }
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: [{ type: "input_text", text: buildSystemPrompt(profile, history, evidence) }] },
          { role: "user", content: [{ type: "input_text", text: message }] }
        ]
      })
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const output = extractResponseText(data).trim();
    if (!output) throw new Error("Empty OpenAI response");
    return {
      provider: "openai",
      text: output,
      sources: uniqueSources(evidence.stats),
      apiStatus: { configured: true, attempted: true, success: true, model: OPENAI_MODEL, error: null }
    };
  } catch (error) {
    return {
      ...fallback,
      apiStatus: { configured: true, attempted: true, success: false, model: OPENAI_MODEL, error: error.message }
    };
  }
}

async function runOpenAITest() {
  if (!OPENAI_API_KEY) return { ok: false, provider: "local-fallback", error: "OPENAI_API_KEY is not configured", openai: { configured: false, model: OPENAI_MODEL } };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, input: "Reply with exactly: OPENAI_CONNECTION_OK" })
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return { ok: true, provider: "openai", message: extractResponseText(data).trim(), openai: { configured: true, model: OPENAI_MODEL } };
  } catch (error) {
    return { ok: false, provider: "openai", error: error.message, openai: { configured: true, model: OPENAI_MODEL } };
  }
}

function buildFallbackPlan(profile, userMessage, evidence) {
  const current = areaStats(evidence.stats, evidence.currentKey);
  const target = areaStats(evidence.stats, evidence.targetKey);
  const income = profile.monthly_income || 0;
  const savings = profile.savings || 0;
  const targetPrice = target.housing_sqm?.metricValue || current.housing_sqm?.metricValue || 0;
  const targetSalary = target.salary?.metricValue || current.salary?.metricValue || 0;
  const salaryGap = targetSalary ? targetSalary - income : null;
  const scenarios = normalizeArray(profile.life_scenarios).length ? normalizeArray(profile.life_scenarios) : defaultScenarioList();

  return [
    ["Короткий вывод", `${profile.full_name || "Пользователь"}, по запросу "${userMessage}" вывод такой: ${getDecisionLine(income, savings, salaryGap, targetPrice)}`].join("\n"),
    [
      "Что важно по цифрам",
      current.salary ? `Средняя зарплата в ${current.label}: ${money(current.salary.metricValue)} (${current.salary.periodLabel}).` : null,
      target.label !== current.label && target.salary ? `Средняя зарплата в ${target.label}: ${money(target.salary.metricValue)} (${target.salary.periodLabel}).` : null,
      current.housing_sqm ? `Цена 1 кв. м в ${current.label}: ${money(current.housing_sqm.metricValue)} (${current.housing_sqm.periodLabel}).` : null,
      target.label !== current.label && target.housing_sqm ? `Цена 1 кв. м в ${target.label}: ${money(target.housing_sqm.metricValue)} (${target.housing_sqm.periodLabel}).` : null
    ].filter(Boolean).join("\n"),
    [
      "Что делать сейчас",
      "1. Посчитать реальный свободный остаток в месяц.",
      "2. Проверить подушку минимум на 4-6 месяцев расходов.",
      "3. Если переезд в новый город, сначала безопаснее аренда.",
      "4. Если покупка жилья, отдельно считать взнос, ремонт и резерв."
    ].join("\n"),
    [
      "Риски по жизненным сценариям",
      ...scenarios.map((scenario) => formatScenarioRiskLine(scenario, income, targetPrice)),
      profile.risk_notes ? `- Дополнительно: ${profile.risk_notes}.` : null
    ].filter(Boolean).join("\n"),
    ["Итог", getDecisionBadge(income, savings, salaryGap, targetPrice)].join("\n")
  ].join("\n\n");
}

function getAuthenticatedAccount(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return null;
  const row = db.prepare("SELECT accounts.* FROM sessions JOIN accounts ON accounts.id = sessions.account_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").get(sha256(token), new Date().toISOString());
  return row || null;
}

function createSession(accountId) {
  const raw = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, account_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), accountId, sha256(raw), expiresAt, now.toISOString());
  return `${SESSION_COOKIE}=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

function destroySession(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

function sanitizeAccount(account) {
  return { id: account.id, email: account.email, name: account.name, authSource: account.auth_source, createdAt: account.created_at };
}

function buildSystemPrompt(profile, history, evidence) {
  const recentHistory = history.slice(-6).map((item) => `${item.role}: ${item.content}`).join("\n") || "История пока пустая.";
  const scenarios = normalizeArray(profile.life_scenarios).join(", ") || "не выбраны";
  const stats = evidence.stats.map((item) => `${item.areaLabel} | ${item.metricLabel}: ${fmt(item.metricValue)} ${item.metricUnit} | период ${item.periodLabel} | источник ${item.sourceName} | ${item.sourceUrl}`).join("\n") || "Статистика не найдена.";
  return [
    "Ты отвечаешь как опытный сотрудник банка, который объясняет клиенту решение простым и спокойным языком.",
    "Пиши коротко, ясно и по делу.",
    "Учитывай профиль клиента, будущие жизненные риски и только данные из блока STATISTICS.",
    "Структура ответа: 1. Короткий вывод 2. Что важно по цифрам 3. Что делать сейчас 4. Риски по жизненным сценариям 5. Итог: можно / рано / рискованно",
    "",
    "PROFILE:",
    JSON.stringify(profile, null, 2),
    "",
    "SELECTED_SCENARIOS:",
    scenarios,
    "",
    "RECENT_CHAT:",
    recentHistory,
    "",
    "STATISTICS:",
    stats
  ].join("\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const chunk of item.content || []) {
      if (chunk.type === "output_text" && chunk.text) parts.push(chunk.text);
    }
  }
  return parts.join("\n");
}

function defaultScenarioList() {
  return [
    "Появление жены или совместное проживание",
    "Рождение ребенка",
    "Потеря работы",
    "Снижение дохода",
    "Ипотека или новый кредит",
    "Помощь родителям",
    "Проблемы со здоровьем",
    "Развод или расставание"
  ];
}

function getDecisionLine(income, savings, salaryGap, price) {
  if (!income && !savings) return "пока рано принимать решение, сначала нужен расчет дохода и накоплений.";
  if (price && savings < price * 8) return "решение выглядит рискованно, потому что запас денег пока слабый.";
  if (salaryGap !== null && salaryGap > income * 0.2) return "лучше двигаться осторожно: сначала усилить доход или подушку.";
  return "сценарий можно рассматривать, но только с учетом семейных и доходных рисков.";
}

function getDecisionBadge(income, savings, salaryGap, price) {
  if (!income) return "Рано. Сначала нужно понять стабильный доход.";
  if (price && savings < price * 8) return "Рискованно. Подушка и стартовый капитал пока слабые.";
  if (salaryGap !== null && salaryGap > income * 0.2) return "Скорее рано. Доход пока ниже нужного ориентира.";
  return "Можно рассматривать, но только с запасом по рискам.";
}

function formatScenarioRiskLine(scenario, income, price) {
  const value = text(scenario);
  const drop = income ? Math.round(income * 0.3) : 0;
  if (/жены|девуш|совмест/i.test(value)) return `- ${value}: расходы на быт и жилье часто растут, поэтому нужен общий бюджет.`;
  if (/ребен/i.test(value)) return `- ${value}: это крупная нагрузка на бюджет, подушку лучше держать выше обычной.`;
  if (/потеря работы/i.test(value)) return `- ${value}: критичный риск. Без запаса на несколько месяцев решение становится слабым.`;
  if (/снижение дохода/i.test(value)) return `- ${value}: если доход снизится хотя бы на ${money(drop)}, нагрузка станет тяжелее.`;
  if (/ипотек|кредит/i.test(value)) return `- ${value}: долг допустим только если после платежа остаются деньги на жизнь и резерв.`;
  if (/родител/i.test(value)) return `- ${value}: помощь семье часто появляется неожиданно, поэтому весь запас тратить нельзя.`;
  if (/здоров/i.test(value)) return `- ${value}: часть накоплений лучше оставить как медицинский резерв.`;
  if (/развод|расстав/i.test(value)) return `- ${value}: если решение держится на двух доходах, заранее нужен запасной план.`;
  if (price) return `- ${value}: этот риск нужно отдельно заложить в расчет, потому что цена жилья около ${money(price)} усиливает стоимость ошибки.`;
  return `- ${value}: этот риск лучше заранее заложить в резерв.`;
}

function areaStats(stats, key) {
  const rows = stats.filter((item) => item.areaKey === key);
  const map = Object.fromEntries(rows.map((item) => [item.metricKey, item]));
  return { label: rows[0]?.areaLabel || "Россия", salary: map.salary || null, housing_sqm: map.housing_sqm || null };
}

function uniqueSources(stats) {
  const map = new Map();
  for (const item of stats) {
    const key = `${item.sourceName}|${item.sourceUrl}`;
    if (!map.has(key)) map.set(key, { title: item.sourceName, url: item.sourceUrl, period: item.periodLabel, areas: [], metrics: [] });
    const source = map.get(key);
    if (!source.areas.includes(item.areaLabel)) source.areas.push(item.areaLabel);
    if (!source.metrics.includes(item.metricLabel)) source.metrics.push(item.metricLabel);
  }
  return [...map.values()];
}

function seedStats() {
  if (db.prepare("SELECT COUNT(*) AS total FROM stats_entries").get().total > 0) return;
  const rows = [
    ["russia", "Россия", "housing_norm", "Норматив стоимости 1 кв. м жилья", 116427, "руб/м2", "I полугодие 2026", "КонсультантПлюс / приказ Минстроя России от 08.12.2025 N 777/пр", "https://www.consultant.ru/law/hotdocs/92380.html", "Федеральный ориентир."],
    ["moscow", "Москва", "salary", "Среднемесячная начисленная зарплата", 156872.6, "руб/мес", "январь-февраль 2025", "Мосстат", "https://77.rosstat.gov.ru/", "По полному кругу организаций."],
    ["moscow", "Москва", "housing_sqm", "Средняя рыночная стоимость 1 кв. м жилья", 198907, "руб/м2", "IV квартал 2025", "КонсультантПлюс / приказ Минстроя России от 22.09.2025 N 563/пр", "https://www.consultant.ru/law/hotdocs/90911.html", "Показатель по субъекту РФ."],
    ["saint_petersburg", "Санкт-Петербург", "salary", "Среднемесячная начисленная зарплата", 115253, "руб/мес", "февраль 2025", "Петростат", "https://78.rosstat.gov.ru/", "По полному кругу организаций."],
    ["saint_petersburg", "Санкт-Петербург", "housing_sqm", "Средняя рыночная стоимость 1 кв. м жилья", 165315, "руб/м2", "IV квартал 2025", "КонсультантПлюс / приказ Минстроя России от 22.09.2025 N 563/пр", "https://www.consultant.ru/law/hotdocs/90911.html", "Показатель по субъекту РФ."],
    ["krasnodar", "Краснодар", "salary", "Среднемесячная начисленная зарплата в Краснодарском крае", 75178, "руб/мес", "ноябрь 2025", "Краснодарстат", "https://23.rosstat.gov.ru/", "Показатель по краю."],
    ["krasnodar", "Краснодар", "housing_sqm", "Средняя рыночная стоимость 1 кв. м жилья", 133250, "руб/м2", "IV квартал 2024", "КонсультантПлюс / обзор законодательства Краснодарского края", "https://www.consultant.ru/law/review/reg/rlaw/rlaw1772024-10-25.html", "Показатель по городу Краснодар."]
  ];
  const insert = db.prepare("INSERT INTO stats_entries (area_key, area_label, metric_key, metric_label, metric_value, metric_unit, period_label, source_name, source_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  for (const row of rows) insert.run(...row);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.replace(/^\uFEFF/, "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function hashPassword(password) { const salt = crypto.randomBytes(16).toString("hex"); return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`; }
function verifyPassword(password, stored) { const [salt, hash] = String(stored || "").split(":"); if (!salt || !hash) return false; const candidate = crypto.scryptSync(password, salt, 64).toString("hex"); return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex")); }
function sha256(value) { return crypto.createHash("sha256").update(String(value)).digest("hex"); }
function parseCookies(header) { return header.split(";").map((part) => part.trim()).filter(Boolean).reduce((acc, part) => { const index = part.indexOf("="); if (index !== -1) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); return acc; }, {}); }
function normalizeEmail(value) { return text(value).toLowerCase(); }
function digits(value) { return String(value || "").replace(/\D+/g, ""); }
function formatPhone(value) { const raw = digits(value).padStart(11, "7").slice(-11); return `+${raw[0]} (${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7, 9)}-${raw.slice(9, 11)}`; }
function text(value) { return String(value ?? "").trim().replace(/\s+/g, " "); }
function normalize(value) { return text(value).toLowerCase().replace(/ё/g, "е"); }
function normalizeArray(value) { if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean); const single = text(value); return single ? [single] : []; }
function int(value) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0; }
function fmt(value) { const number = Number(value || 0); return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: Number.isInteger(number) ? 0 : 1 }).format(number); }
function money(value) { return `${fmt(value)} руб.`; }
function safeParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function mime(filePath) { return ({ ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" })[path.extname(filePath).toLowerCase()] || "application/octet-stream"; }
async function serveFile(res, filePath) { const body = await fs.promises.readFile(filePath); res.writeHead(200, { "Content-Type": mime(filePath), "Content-Length": body.length }); res.end(body); }
async function readJson(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); const raw = Buffer.concat(chunks).toString("utf-8"); return raw ? JSON.parse(raw) : {}; }
function sendJson(res, status, payload, extraHeaders = {}) { const body = JSON.stringify(payload); res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", ...extraHeaders }); res.end(body); }

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`AI provider: ${OPENAI_API_KEY ? `OpenAI (${OPENAI_MODEL})` : "local fallback"}`);
  });
}

module.exports = { createServer, buildFallbackPlan, collectEvidence, mapAreaKey };
