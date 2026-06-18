const form = document.querySelector("#ideaForm");
const topicInput = document.querySelector("#topic");
const welcome = document.querySelector("#welcome");
const results = document.querySelector("#results");
const ideaDetail = document.querySelector("#ideaDetail");
const button = document.querySelector("#generateButton");
const buttonText = document.querySelector("#buttonText");
const buttonSpinner = document.querySelector("#buttonSpinner");

let currentTopic = "";
let selectedIdeaButton = null;
let activeDetailRequest = 0;
let loadingMessage = null;

form.noValidate = true;
showEmptyMessage();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();
  currentTopic = topic;

  if (!topic) {
    showError("Escreve um tema antes de gerar ideias.");
    topicInput.focus();
    return;
  }

  clearIdeaDetail();
  showUserPrompt(topic);
  setLoading(true);
  showLoading();

  try {
    const ideas = await generateIdeas(topic);
    renderIdeas(ideas);
  } catch (error) {
    showError(error.message || "Nao foi possivel gerar ideias agora.");
  } finally {
    setLoading(false);
  }
});

async function generateIdeas(topic) {
  const response = await fetch("/api/ideias", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tema: topic
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message = details?.error?.message || details?.error || `Erro da API: ${response.status}`;
    throw new Error(message);
  }

  const parsed = await response.json();
  const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];

  return ideas.slice(0, 5).map((idea, index) => ({
    title: String(idea.title || `Ideia ${index + 1}`).trim(),
    description: String(idea.description || "").trim()
  }));
}

async function expandIdea(idea) {
  const response = await fetch("/api/ideias", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tema: currentTopic,
      ideia: idea
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message = details?.error?.message || details?.error || `Erro da API: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

function renderIdeas(ideas) {
  removeLoadingMessage();

  if (ideas.length === 0) {
    showEmptyMessage();
    return;
  }

  const message = createMessage("assistant", "IA");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const list = document.createElement("div");
  list.className = "ideas-list";

  ideas.forEach((idea, index) => {
    const ideaButton = document.createElement("button");
    ideaButton.className = "idea idea-button";
    ideaButton.type = "button";
    ideaButton.style.animationDelay = `${index * 45}ms`;
    ideaButton.setAttribute("aria-label", `Aprofundar ideia ${index + 1}: ${idea.title}`);

    const number = document.createElement("div");
    number.className = "idea-number";
    number.textContent = String(index + 1);

    const content = document.createElement("div");
    const title = document.createElement("h2");
    const description = document.createElement("p");

    title.textContent = idea.title;
    description.textContent = idea.description || "Explora esta direcao e adapta-a ao teu contexto.";

    content.append(title, description);
    ideaButton.append(number, content);
    ideaButton.addEventListener("click", () => handleIdeaClick(idea, ideaButton));
    list.appendChild(ideaButton);
  });

  bubble.appendChild(list);
  message.appendChild(bubble);
  results.appendChild(message);
}

async function handleIdeaClick(idea, ideaButton) {
  if (selectedIdeaButton) {
    selectedIdeaButton.classList.remove("selected");
  }

  selectedIdeaButton = ideaButton;
  selectedIdeaButton.classList.add("selected");
  setIdeaButtonsDisabled(true);
  showDetailLoading(idea);

  const requestId = ++activeDetailRequest;

  try {
    const detail = await expandIdea(idea);
    if (requestId !== activeDetailRequest) {
      return;
    }
    renderIdeaDetail(detail);
  } catch (error) {
    if (requestId !== activeDetailRequest) {
      return;
    }
    showDetailError(error.message || "Nao foi possivel aprofundar esta ideia agora.");
  } finally {
    if (requestId === activeDetailRequest) {
      setIdeaButtonsDisabled(false);
    }
  }
}

function showEmptyMessage() {
  results.innerHTML = "";
  loadingMessage = null;
}

function showUserPrompt(topic) {
  welcome?.classList.add("hidden");
  results.innerHTML = "";
  loadingMessage = null;

  const message = createMessage("user", "Tu");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = topic;

  message.appendChild(bubble);
  results.appendChild(message);
}

function showLoading() {
  removeLoadingMessage();

  const message = createMessage("assistant", "IA");
  const loading = document.createElement("div");
  loading.className = "loading-card";
  loading.setAttribute("role", "status");

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = "A gerar ideias com a OpenAI API...";

  loading.append(spinner, text);
  message.appendChild(loading);
  results.appendChild(message);
  loadingMessage = message;
}

function showError(message) {
  removeLoadingMessage();
  clearIdeaDetail();

  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;

  const errorMessage = createMessage("assistant", "IA");
  errorMessage.appendChild(error);
  results.appendChild(errorMessage);
}

function showDetailLoading(idea) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "detail-panel";
  panel.setAttribute("role", "status");

  const loading = document.createElement("div");
  loading.className = "loading-card";

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = `A aprofundar "${idea.title}"...`;

  loading.append(spinner, text);
  panel.appendChild(loading);
  ideaDetail.appendChild(panel);
  ideaDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderIdeaDetail(detail) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const panel = document.createElement("article");
  panel.className = "detail-panel";

  const card = document.createElement("div");
  card.className = "detail-card";

  const eyebrow = document.createElement("span");
  eyebrow.className = "detail-eyebrow";
  eyebrow.textContent = "Ideia aprofundada";

  const title = document.createElement("h2");
  title.textContent = detail.title || "Detalhe da ideia";

  const overview = document.createElement("p");
  overview.className = "detail-overview";
  overview.textContent = detail.overview || "Explora esta ideia com os passos, recursos e beneficios abaixo.";

  card.append(eyebrow, title, overview);
  card.append(
    createDetailSection("Passos praticos", detail.steps),
    createDetailSection("Recursos necessarios", detail.resources),
    createDetailSection("Beneficios", detail.benefits)
  );

  panel.appendChild(card);
  ideaDetail.appendChild(panel);
}

function createDetailSection(titleText, items = []) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const list = document.createElement("ul");

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.appendChild(listItem);
  });

  section.append(title, list);
  return section;
}

function showDetailError(message) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;

  const panel = document.createElement("div");
  panel.className = "detail-panel";
  panel.appendChild(error);
  ideaDetail.appendChild(panel);
}

function clearIdeaDetail() {
  activeDetailRequest += 1;
  ideaDetail.innerHTML = "";
  ideaDetail.classList.add("hidden");

  if (selectedIdeaButton) {
    selectedIdeaButton.classList.remove("selected");
    selectedIdeaButton = null;
  }
}

function setIdeaButtonsDisabled(isDisabled) {
  results.querySelectorAll(".idea-button").forEach((ideaButton) => {
    ideaButton.disabled = isDisabled;
  });
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  buttonText.textContent = isLoading ? "A gerar..." : "Gerar";
  buttonSpinner.classList.toggle("hidden", !isLoading);
}

function createMessage(type, label) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = label;
  avatar.setAttribute("aria-hidden", "true");

  message.appendChild(avatar);
  return message;
}

function removeLoadingMessage() {
  if (loadingMessage) {
    loadingMessage.remove();
    loadingMessage = null;
  }
}
