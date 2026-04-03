const state = {
  account: null,
  profile: null,
  provider: "local-fallback",
  messages: [],
  sources: [],
  openai: {
    configured: false,
    model: null
  }
};

const profileForm = document.getElementById("profileForm");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const messagesNode = document.getElementById("messages");
const intakePanel = document.getElementById("intakePanel");
const chatPanel = document.getElementById("chatPanel");
const profileSummaryNode = document.getElementById("profileSummary");
const sourcesListNode = document.getElementById("sourcesList");
const providerBadge = document.getElementById("providerBadge");
const statusText = document.getElementById("statusText");
const esiaDemoButton = document.getElementById("esiaDemoButton");
const esiaName = document.getElementById("esiaName");
const esiaPhone = document.getElementById("esiaPhone");
const resetButton = document.getElementById("resetButton");
const messageTemplate = document.getElementById("messageTemplate");
const openAuthButton = document.getElementById("openAuthButton");
const authModal = document.getElementById("authModal");
const authBackdrop = document.getElementById("authBackdrop");
const closeAuthButton = document.getElementById("closeAuthButton");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const esiaForm = document.getElementById("esiaForm");
const authNote = document.getElementById("authNote");
const topbarActions = document.getElementById("topbarActions");
const accountBanner = document.getElementById("accountBanner");

init();

async function init() {
  bindEvents();
  await hydrateSession();
  await hydrateProfile();
  render();
}

function bindEvents() {
  profileForm.addEventListener("submit", handleProfileSubmit);
  chatForm.addEventListener("submit", handleChatSubmit);
  resetButton.addEventListener("click", resetProfile);

  esiaDemoButton.addEventListener("click", async () => {
    if (!state.account) {
      switchAuthTab("esia");
      openAuthModal();
      return;
    }
    await createEsiaDemoProfile();
  });

  openAuthButton.addEventListener("click", openAuthModal);
  closeAuthButton.addEventListener("click", closeAuthModal);
  authBackdrop.addEventListener("click", closeAuthModal);

  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  esiaForm.addEventListener("submit", handleEsiaAuth);

  document.querySelectorAll(".auth-tab").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      chatInput.value = button.dataset.prompt || "";
      chatInput.focus();
    });
  });
}

async function hydrateSession() {
  try {
    const health = await api("/api/health");
    state.provider = health.provider;
    state.openai = health.openai || state.openai;
    state.account = health.account || null;
  } catch {
    providerBadge.textContent = "AI: offline";
  }

  try {
    const session = await api("/api/auth/me");
    state.account = session.account || state.account;
  } catch {
    state.account = null;
  }
}

async function hydrateProfile() {
  const profileId = localStorage.getItem("bootcode-profile-id");
  if (!profileId || !state.account) return;

  try {
    const payload = await api(`/api/profiles/${profileId}`);
    state.profile = payload.profile;
    state.messages = payload.messages || [];
    state.provider = payload.provider || state.provider;
    hydrateSources();
  } catch {
    localStorage.removeItem("bootcode-profile-id");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(registerForm);

  try {
    const response = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name") || "",
        email: formData.get("email") || "",
        password: formData.get("password") || ""
      })
    });

    state.account = response.account;
    authNote.textContent = "Аккаунт создан. Теперь можно заполнять анкету.";
    closeAuthModal();
    render();
  } catch (error) {
    authNote.textContent = error.message || "Не удалось создать аккаунт.";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const response = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email") || "",
        password: formData.get("password") || ""
      })
    });

    state.account = response.account;
    authNote.textContent = "Вход выполнен. Теперь можно продолжить.";
    closeAuthModal();
    render();
  } catch (error) {
    authNote.textContent = error.message || "Не удалось войти.";
  }
}

async function handleEsiaAuth(event) {
  event.preventDefault();
  const formData = new FormData(esiaForm);

  try {
    const response = await api("/api/auth/esia-demo", {
      method: "POST",
      body: JSON.stringify({
        fullName: formData.get("fullName") || "",
        phone: formData.get("phone") || ""
      })
    });

    state.account = response.account;
    esiaName.value = response.account.name;
    esiaPhone.value = response.esia?.phone || formData.get("phone") || "";
    authNote.textContent = "Демо-вход через Госуслуги выполнен.";
    closeAuthModal();
    render();
    await createEsiaDemoProfile();
  } catch (error) {
    authNote.textContent = error.message || "Не удалось выполнить вход через Госуслуги.";
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!state.account) {
    switchAuthTab("login");
    openAuthModal();
    statusText.textContent = "Сначала войдите в аккаунт.";
    return;
  }

  statusText.textContent = "Сохраняю анкету и подготавливаю чат...";

  try {
    const response = await api("/api/profiles", {
      method: "POST",
      body: JSON.stringify(collectProfilePayload())
    });

    state.profile = response.profile;
    state.provider = response.provider || state.provider;
    state.messages = [];
    state.sources = [];
    localStorage.setItem("bootcode-profile-id", state.profile.id);
    appendMessage("assistant", "Анкета сохранена. Теперь можно получить краткий и понятный разбор по вашей ситуации.");
    statusText.textContent = "Анкета сохранена. Можно задавать вопрос.";
    render();
  } catch (error) {
    statusText.textContent = error.message || "Не удалось сохранить анкету.";
    alert(error.message || "Не удалось сохранить анкету.");
  }
}

async function createEsiaDemoProfile() {
  if (!state.account) return;

  const payload = {
    intakeMode: "esia-demo",
    fullName: esiaName.value.trim() || state.account.name || "Мария Демонстрационная",
    age: 31,
    currentCity: "Краснодар",
    targetCity: "Москва",
    familyStatus: "В отношениях",
    childrenCount: 0,
    employmentStatus: "Работаю по найму",
    profession: "Маркетолог",
    monthlyIncome: 115000,
    savings: 1500000,
    housingStatus: "Снимаю жилье",
    lifeScenarios: [
      "Появление жены или совместное проживание",
      "Рождение ребенка",
      "Снижение дохода"
    ],
    riskNotes: "Возможна смена работы в ближайший год.",
    goals: "Понять, стоит ли переезжать в Москву и когда разумно покупать там квартиру.",
    extraNotes: "Нужен район с хорошей транспортной логистикой."
  };

  statusText.textContent = "Создаю демо-профиль через Госуслуги...";

  try {
    const response = await api("/api/profiles", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    state.profile = response.profile;
    state.provider = response.provider || state.provider;
    state.messages = [];
    state.sources = [];
    localStorage.setItem("bootcode-profile-id", state.profile.id);
    appendMessage("assistant", "Демо-профиль создан. Теперь можно задать вопрос про переезд, жилье и будущие риски.");
    statusText.textContent = "Демо-профиль сохранен. Можно задавать вопрос.";
    render();
  } catch (error) {
    statusText.textContent = error.message || "Не удалось создать демо-профиль.";
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message || !state.profile) return;

  appendMessage("user", message);
  chatInput.value = "";
  statusText.textContent = "Готовлю ответ...";
  renderMessages();

  try {
    const response = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        profileId: state.profile.id,
        message
      })
    });

    appendMessage("assistant", response.text || response.message, {
      sources: response.sources || [],
      provider: response.provider,
      apiStatus: response.apiStatus || null
    });

    state.provider = response.provider || state.provider;
    if (response.apiStatus?.model) state.openai.model = response.apiStatus.model;
    if (typeof response.apiStatus?.configured === "boolean") state.openai.configured = response.apiStatus.configured;
    hydrateSources();

    if (response.provider === "openai") {
      statusText.textContent = "Ответ получен через OpenAI API.";
    } else if (response.apiStatus?.error) {
      statusText.textContent = `OpenAI недоступен: ${response.apiStatus.error}`;
    } else {
      statusText.textContent = "Ответ построен локально.";
    }

    render();
  } catch (error) {
    appendMessage("assistant", "Не удалось получить ответ. Проверьте сервер и попробуйте еще раз.");
    statusText.textContent = error.message || "Ошибка получения ответа.";
    render();
  }
}

function collectProfilePayload() {
  const formData = new FormData(profileForm);
  return {
    intakeMode: formData.get("intakeMode") || "manual",
    fullName: formData.get("fullName") || "",
    age: formData.get("age") || "",
    currentCity: formData.get("currentCity") || "",
    targetCity: formData.get("targetCity") || "",
    familyStatus: formData.get("familyStatus") || "",
    childrenCount: formData.get("childrenCount") || "",
    employmentStatus: formData.get("employmentStatus") || "",
    profession: formData.get("profession") || "",
    monthlyIncome: formData.get("monthlyIncome") || "",
    savings: formData.get("savings") || "",
    housingStatus: formData.get("housingStatus") || "",
    lifeScenarios: formData.getAll("lifeScenarios"),
    riskNotes: formData.get("riskNotes") || "",
    goals: formData.get("goals") || "",
    extraNotes: formData.get("extraNotes") || ""
  };
}

function appendMessage(role, content, meta = {}) {
  state.messages.push({
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    meta
  });
}

function hydrateSources() {
  const map = new Map();
  for (const message of state.messages) {
    for (const source of message.meta?.sources || []) {
      const key = `${source.title}|${source.url}`;
      if (!map.has(key)) map.set(key, source);
    }
  }
  state.sources = [...map.values()];
}

function render() {
  providerBadge.textContent = state.openai.configured
    ? `AI: ${state.provider} (${state.openai.model || "model not set"})`
    : "AI: local fallback";

  if (state.profile) {
    intakePanel.classList.add("hidden");
    chatPanel.classList.remove("hidden");
  } else {
    intakePanel.classList.remove("hidden");
    chatPanel.classList.add("hidden");
  }

  renderAccountUi();
  renderProfileSummary();
  renderMessages();
  renderSources();
}

function renderAccountUi() {
  if (state.account) {
    accountBanner.innerHTML = `<strong>${escapeHtml(state.account.name)}</strong><p>Аккаунт активен. Email: ${escapeHtml(state.account.email)}</p>`;
    topbarActions.innerHTML = `
      <div class="account-pill">
        <span>${escapeHtml(state.account.name)}</span>
        <button class="ghost-button small" id="logoutButton" type="button">Выйти</button>
      </div>
    `;
    document.getElementById("logoutButton").addEventListener("click", logout);
  } else {
    accountBanner.innerHTML = `<strong>Вы не вошли в аккаунт.</strong><p>Нажмите “Вход” справа сверху, чтобы открыть регистрацию, логин или демо-вход через Госуслуги.</p>`;
    topbarActions.innerHTML = `<button class="login-badge" id="openAuthButton" type="button">Вход</button>`;
    document.getElementById("openAuthButton").addEventListener("click", openAuthModal);
  }
}

function renderProfileSummary() {
  if (!state.profile) {
    profileSummaryNode.innerHTML = "";
    return;
  }

  const scenarios = Array.isArray(state.profile.life_scenarios) && state.profile.life_scenarios.length
    ? state.profile.life_scenarios.join(", ")
    : "Не выбраны";

  const cards = [
    ["Профиль", `${state.profile.full_name}, ${state.profile.age || "возраст не указан"} лет`],
    ["Маршрут", `${state.profile.current_city}${state.profile.target_city ? ` -> ${state.profile.target_city}` : ""}`],
    ["Финансы", `${money(state.profile.monthly_income)} / накопления ${money(state.profile.savings)}`],
    ["Риски", scenarios],
    ["Цель", state.profile.goals || "Не указана"]
  ];

  profileSummaryNode.innerHTML = cards.map(([title, value]) => `
    <div class="summary-card">
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(value)}</div>
    </div>
  `).join("");
}

function renderMessages() {
  messagesNode.innerHTML = "";
  for (const message of state.messages) {
    const fragment = messageTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".message");
    article.classList.add(message.role);
    fragment.querySelector(".message-role").textContent = message.role === "assistant" ? "AI-советник" : "Пользователь";
    fragment.querySelector(".message-body").textContent = message.content;
    messagesNode.appendChild(fragment);
  }
  messagesNode.scrollTop = messagesNode.scrollHeight;
}

function renderSources() {
  if (!state.sources.length) {
    sourcesListNode.innerHTML = `<div class="source-card">Источники появятся после первого AI-ответа.</div>`;
    return;
  }

  sourcesListNode.innerHTML = state.sources.map((source) => `
    <article class="source-card">
      <strong>${escapeHtml(source.title)}</strong>
      <p>Период: ${escapeHtml(source.period || "не указан")}</p>
      <p>Территории: ${escapeHtml((source.areas || []).join(", "))}</p>
      <p>Метрики: ${escapeHtml((source.metrics || []).join(", "))}</p>
      <a href="${source.url}" target="_blank" rel="noreferrer">Открыть источник</a>
    </article>
  `).join("");
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // noop
  }

  localStorage.removeItem("bootcode-profile-id");
  state.account = null;
  state.profile = null;
  state.messages = [];
  state.sources = [];
  statusText.textContent = "Войдите в аккаунт, чтобы продолжить.";
  render();
}

function resetProfile() {
  localStorage.removeItem("bootcode-profile-id");
  state.profile = null;
  state.messages = [];
  state.sources = [];
  profileForm.reset();
  profileForm.elements.intakeMode.value = "manual";
  statusText.textContent = state.account ? "Сохраните новую анкету." : "Сначала войдите в аккаунт и сохраните анкету.";
  render();
}

function switchAuthTab(name) {
  document.querySelectorAll(".auth-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === name);
  });
  loginForm.classList.toggle("hidden", name !== "login");
  registerForm.classList.toggle("hidden", name !== "register");
  esiaForm.classList.toggle("hidden", name !== "esia");
}

function openAuthModal() {
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function money(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value || 0))} руб.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
