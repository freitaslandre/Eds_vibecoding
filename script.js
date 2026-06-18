const form = document.querySelector("#ideaForm");
const topicInput = document.querySelector("#topic");
const results = document.querySelector("#results");
const ideaDetail = document.querySelector("#ideaDetail");
const button = document.querySelector("#generateButton");
const buttonText = document.querySelector("#buttonText");
const buttonSpinner = document.querySelector("#buttonSpinner");

let currentTopic = "";
let selectedIdeaButton = null;
let activeDetailRequest = 0;

form.noValidate = true;
showEmptyMessage();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();
  currentTopic = topic;

  if (!topic) {
    showError("Escreve um tema antes de carregar em Gerar Ideias.");
    topicInput.focus();
    return;
  }

  setLoading(true);
  showLoading();
  clearIdeaDetail();

  try {
    const ideas = await generateIdeas(topic);
    renderIdeas(ideas);
  } catch (error) {
    showError(error.message || "Não foi possível gerar ideias agora.");
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
  results.innerHTML = "";

  if (ideas.length === 0) {
    showEmptyMessage();
    return;
  }

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
    description.textContent = idea.description || "Explora esta direção e adapta-a ao teu contexto.";

    content.append(title, description);
    ideaButton.append(number, content);
    ideaButton.addEventListener("click", () => handleIdeaClick(idea, ideaButton));
    results.appendChild(ideaButton);
  });
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
    showDetailError(error.message || "Não foi possível aprofundar esta ideia agora.");
  } finally {
    if (requestId === activeDetailRequest) {
      setIdeaButtonsDisabled(false);
    }
  }
}

function showEmptyMessage() {
  results.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = "Escreve um tema para começar";
  results.appendChild(empty);
}

function showLoading() {
  results.innerHTML = "";

  const loading = document.createElement("div");
  loading.className = "empty loading-card";
  loading.setAttribute("role", "status");

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = "A gerar ideias com a OpenAI API...";

  loading.append(spinner, text);
  results.appendChild(loading);
}

function showError(message) {
  results.innerHTML = "";
  clearIdeaDetail();
  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;
  results.appendChild(error);
}

function showDetailLoading(idea) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const loading = document.createElement("div");
  loading.className = "detail-panel loading-card";
  loading.setAttribute("role", "status");

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = `A aprofundar "${idea.title}"...`;

  loading.append(spinner, text);
  ideaDetail.appendChild(loading);
  ideaDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderIdeaDetail(detail) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const panel = document.createElement("article");
  panel.className = "detail-panel";

  const eyebrow = document.createElement("span");
  eyebrow.className = "detail-eyebrow";
  eyebrow.textContent = "Ideia aprofundada";

  const title = document.createElement("h2");
  title.textContent = detail.title || "Detalhe da ideia";

  const overview = document.createElement("p");
  overview.className = "detail-overview";
  overview.textContent = detail.overview || "Explora esta ideia com os passos, recursos e benefícios abaixo.";

  panel.append(eyebrow, title, overview);
  panel.append(
    createDetailSection("Passos práticos", detail.steps),
    createDetailSection("Recursos necessários", detail.resources),
    createDetailSection("Benefícios", detail.benefits)
  );

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
  ideaDetail.appendChild(error);
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
  buttonText.textContent = isLoading ? "A gerar..." : "Gerar Ideias";
  buttonSpinner.classList.toggle("hidden", !isLoading);
}
